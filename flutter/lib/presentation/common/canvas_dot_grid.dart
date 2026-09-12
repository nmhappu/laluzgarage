import 'dart:math';
import 'package:flutter/material.dart';

/// Replicates the precision Canvas Dot Grid from the React build:
/// 24px grid spacing, 1px radius dots, masked with an elliptical radial gradient
/// fading smoothly from center (40%) to edges (95%).
class CanvasDotGrid extends StatelessWidget {
  final double? opacity;

  const CanvasDotGrid({super.key, this.opacity});

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final effectiveOpacity = opacity ?? (isDark ? 0.40 : 0.60);

    return IgnorePointer(
      child: Opacity(
        opacity: effectiveOpacity,
        child: CustomPaint(
          size: Size.infinite,
          painter: _CanvasDotGridPainter(isDark: isDark),
        ),
      ),
    );
  }
}

class _CanvasDotGridPainter extends CustomPainter {
  final bool isDark;

  const _CanvasDotGridPainter({required this.isDark});

  @override
  void paint(Canvas canvas, Size size) {
    const double spacing = 24.0;
    const double dotRadius = 1.0;

    final baseDotColor = isDark
        ? Colors.white.withValues(alpha: 0.20)
        : const Color(0xFF64748B).withValues(alpha: 0.45);

    final center = Offset(size.width / 2, size.height / 2);
    final gradientRadius = max(size.width, size.height) * 0.65;

    final paint = Paint()
      ..shader = RadialGradient(
        center: Alignment.center,
        radius: 0.85,
        colors: [
          baseDotColor,
          baseDotColor.withValues(alpha: baseDotColor.a * 0.8),
          Colors.transparent,
        ],
        stops: const [0.0, 0.40, 0.95],
      ).createShader(
        Rect.fromCircle(center: center, radius: gradientRadius),
      );

    for (double x = spacing / 2; x < size.width; x += spacing) {
      for (double y = spacing / 2; y < size.height; y += spacing) {
        canvas.drawCircle(Offset(x, y), dotRadius, paint);
      }
    }
  }

  @override
  bool shouldRepaint(covariant _CanvasDotGridPainter oldDelegate) {
    return oldDelegate.isDark != isDark;
  }
}
