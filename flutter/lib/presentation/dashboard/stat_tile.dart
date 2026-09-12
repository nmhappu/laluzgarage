import 'package:flutter/material.dart';
import '../../core/theme/workshop_theme.dart';

class StatTrendItem {
  final String date;
  final double value;
  StatTrendItem({required this.date, required this.value});
}

class StatTile extends StatelessWidget {
  final String label;
  final String value;
  final IconData icon;
  final Color color;
  final List<double> trend;
  final VoidCallback? onTap;

  const StatTile({
    super.key,
    required this.label,
    required this.value,
    required this.icon,
    required this.color,
    this.trend = const [],
    this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      splashColor: color.withValues(alpha: 0.08),
      highlightColor: color.withValues(alpha: 0.04),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 20),
        decoration: const BoxDecoration(
          border: Border(
            bottom: BorderSide(color: WorkshopTheme.darkBorderSubtle, width: 1),
          ),
        ),
        child: Row(
          children: [
            // Icon
            Container(
              width: 40,
              height: 40,
              decoration: BoxDecoration(
                color: color.withValues(alpha: 0.12),
                borderRadius: BorderRadius.circular(10),
              ),
              child: Icon(icon, color: color, size: 22),
            ),
            const SizedBox(width: 16),

            // Label & Metric Value
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                mainAxisSize: MainAxisSize.min,
                children: [
                  Text(
                    label.toUpperCase(),
                    style: TextStyle(
                      fontSize: 11,
                      fontWeight: FontWeight.w800,
                      letterSpacing: 1.5,
                      color: WorkshopTheme.darkTextMuted,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    value,
                    style: WorkshopTheme.numeric(
                      fontSize: 22,
                      fontWeight: FontWeight.w900,
                      color: WorkshopTheme.darkTextPrimary,
                    ),
                  ),
                ],
              ),
            ),

            // Hardware-accelerated Bézier Sparkline with gradient fade mask
            if (trend.isNotEmpty)
              ShaderMask(
                shaderCallback: (bounds) => const LinearGradient(
                  colors: [Colors.transparent, Colors.black, Colors.transparent],
                  stops: [0.0, 0.2, 1.0],
                ).createShader(bounds),
                blendMode: BlendMode.dstIn,
                child: SizedBox(
                  width: 90,
                  height: 34,
                  child: CustomPaint(
                    painter: SparklinePainter(trend: trend, lineColor: color),
                  ),
                ),
              ),
          ],
        ),
      ),
    );
  }
}

class SparklinePainter extends CustomPainter {
  final List<double> trend;
  final Color lineColor;

  SparklinePainter({required this.trend, required this.lineColor});

  @override
  void paint(Canvas canvas, Size size) {
    if (trend.length < 2) return;

    final minVal = trend.reduce((a, b) => a < b ? a : b);
    final maxVal = trend.reduce((a, b) => a > b ? a : b);
    final range = (maxVal - minVal) == 0 ? 1.0 : (maxVal - minVal);
    final double stepX = size.width / (trend.length - 1);

    final points = <Offset>[];
    for (int i = 0; i < trend.length; i++) {
      final x = i * stepX;
      final y = size.height - ((trend[i] - minVal) / range) * (size.height - 8) - 4;
      points.add(Offset(x, y));
    }

    final path = Path()..moveTo(points.first.dx, points.first.dy);
    for (int i = 0; i < points.length - 1; i++) {
      final p0 = points[i];
      final p1 = points[i + 1];
      final controlX = (p0.dx + p1.dx) / 2;
      path.cubicTo(controlX, p0.dy, controlX, p1.dy, p1.dx, p1.dy);
    }

    final paint = Paint()
      ..color = lineColor
      ..strokeWidth = 2.2
      ..style = PaintingStyle.stroke
      ..strokeCap = StrokeCap.round
      ..strokeJoin = StrokeJoin.round;

    canvas.drawPath(path, paint);
  }

  @override
  bool shouldRepaint(covariant SparklinePainter oldDelegate) =>
      oldDelegate.trend != trend || oldDelegate.lineColor != lineColor;
}
