import 'package:flutter/material.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import '../../../core/theme/workshop_theme.dart';
import '../../../data/models/workshop_user.dart';

class CategoriesView extends StatelessWidget {
  final WorkshopUser? currentUser;
  final bool isAdmin;
  final ValueChanged<String> onSelectTab;
  final VoidCallback onLogoutClick;

  const CategoriesView({
    super.key,
    required this.currentUser,
    required this.isAdmin,
    required this.onSelectTab,
    required this.onLogoutClick,
  });

  @override
  Widget build(BuildContext context) {
    final displayName = currentUser?.name.isNotEmpty == true
        ? currentUser!.name
        : (currentUser?.email.split('@').first ?? 'Advisor');
    final displayEmail = currentUser?.email ?? 'LaluZ Garage';
    final initialLetter = displayName.isNotEmpty ? displayName[0].toUpperCase() : 'A';
    final effectiveRole = currentUser?.effectiveRole;

    String roleLabel = 'Service Advisor';
    IconData roleIcon = LucideIcons.shield;

    if (isAdmin || effectiveRole == UserRole.admin) {
      roleLabel = 'Workshop Admin';
      roleIcon = LucideIcons.shield;
    } else if (effectiveRole == UserRole.technician) {
      roleLabel = 'Technician';
      roleIcon = LucideIcons.wrench;
    } else if (effectiveRole == UserRole.assistant) {
      roleLabel = 'Assistant';
      roleIcon = LucideIcons.user;
    }

    return ListView(
      padding: EdgeInsets.zero,
      children: [
        // Edge-to-Edge Hero Waveform Banner
        Container(
          width: double.infinity,
          decoration: BoxDecoration(
            color: WorkshopTheme.darkSurface.withValues(alpha: 0.25),
            border: const Border(
              bottom: BorderSide(color: WorkshopTheme.darkBorder, width: 1),
            ),
          ),
          child: Stack(
            children: [
              // Waveform & Matrix Graphic
              Positioned(
                top: 0,
                left: 0,
                right: 0,
                height: 130,
                child: CustomPaint(
                  painter: _WaveformPainter(),
                ),
              ),

              // Sparkle Accent Badge on top-right
              Positioned(
                right: 20,
                top: 16,
                child: Container(
                  width: 32,
                  height: 32,
                  decoration: BoxDecoration(
                    color: WorkshopTheme.darkSurface.withValues(alpha: 0.8),
                    shape: BoxShape.circle,
                    border: Border.all(
                      color: WorkshopTheme.darkBorder.withValues(alpha: 0.8),
                    ),
                  ),
                  child: const Icon(
                    LucideIcons.sparkles,
                    size: 14,
                    color: Color(0xFF818CF8),
                  ),
                ),
              ),

              // Profile Avatar & Info
              Padding(
                padding: const EdgeInsets.fromLTRB(20, 36, 20, 24),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // Avatar with ring
                    Container(
                      width: 80,
                      height: 80,
                      decoration: BoxDecoration(
                        shape: BoxShape.circle,
                        border: Border.all(color: WorkshopTheme.darkCanvas, width: 3.5),
                        boxShadow: [
                          BoxShadow(
                            color: Colors.black.withValues(alpha: 0.5),
                            blurRadius: 16,
                            offset: const Offset(0, 4),
                          ),
                        ],
                      ),
                      child: ClipOval(
                        child: currentUser?.photoURL != null && currentUser!.photoURL!.isNotEmpty
                            ? Image.network(
                                currentUser!.photoURL!,
                                fit: BoxFit.cover,
                                errorBuilder: (_, _, _) => _buildAvatarFallback(initialLetter),
                              )
                            : _buildAvatarFallback(initialLetter),
                      ),
                    ),

                    const SizedBox(height: 14),

                    // Name
                    Text(
                      displayName,
                      style: const TextStyle(
                        fontSize: 24,
                        fontWeight: FontWeight.w800,
                        letterSpacing: -0.5,
                        color: WorkshopTheme.darkTextPrimary,
                      ),
                    ),
                    const SizedBox(height: 6),

                    // Email + Role Badge Row
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Flexible(
                          child: Text(
                            displayEmail,
                            style: const TextStyle(
                              fontSize: 12,
                              color: WorkshopTheme.darkTextMuted,
                            ),
                            overflow: TextOverflow.ellipsis,
                          ),
                        ),
                        const SizedBox(width: 12),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                          decoration: BoxDecoration(
                            color: WorkshopTheme.darkSurface,
                            borderRadius: BorderRadius.circular(16),
                            border: Border.all(color: WorkshopTheme.darkBorder),
                          ),
                          child: Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              Icon(roleIcon, size: 12, color: WorkshopTheme.emeraldAccent),
                              const SizedBox(width: 5),
                              Text(
                                roleLabel,
                                style: const TextStyle(
                                  fontSize: 11,
                                  fontWeight: FontWeight.w700,
                                  color: WorkshopTheme.darkTextMuted,
                                ),
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),

        // Categories List
        if (isAdmin) ...[
          _buildCategoryTile(
            tabId: 'accounts',
            icon: LucideIcons.user,
            title: 'Team Management',
            description: 'Advisors, technicians & role permissions',
            accentColor: WorkshopTheme.statusSuccess,
          ),
          const Divider(height: 1, color: WorkshopTheme.darkBorder),
          _buildCategoryTile(
            tabId: 'performance',
            icon: LucideIcons.barChart2,
            title: 'Performance',
            description: 'Service revenue, logs & advisor metrics',
            accentColor: const Color(0xFF22D3EE),
          ),
          const Divider(height: 1, color: WorkshopTheme.darkBorder),
        ],

        _buildCategoryTile(
          tabId: 'date_history',
          icon: LucideIcons.calendar,
          title: 'Date-wise Service History',
          description: 'Timeline view of service history records grouped by date',
          accentColor: WorkshopTheme.emeraldAccent,
          trailingBadge: Container(
            padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
            decoration: BoxDecoration(
              color: WorkshopTheme.emeraldAccent.withValues(alpha: 0.12),
              borderRadius: BorderRadius.circular(4),
              border: Border.all(color: WorkshopTheme.emeraldAccent.withValues(alpha: 0.3)),
            ),
            child: const Text(
              'PREVIEW',
              style: TextStyle(
                fontSize: 9,
                fontWeight: FontWeight.w900,
                letterSpacing: 0.6,
                color: WorkshopTheme.emeraldAccent,
              ),
            ),
          ),
        ),
        const Divider(height: 1, color: WorkshopTheme.darkBorder),

        _buildCategoryTile(
          tabId: 'whatsapp_presets',
          icon: LucideIcons.messageSquare,
          title: 'WhatsApp',
          description: 'Vehicle intake & delivery notification templates',
          accentColor: const Color(0xFF25D366),
        ),
        const Divider(height: 1, color: WorkshopTheme.darkBorder),

        _buildCategoryTile(
          tabId: 'tags',
          icon: LucideIcons.tag,
          title: 'Tags',
          description: 'Skills, technician departments & service labels',
          accentColor: const Color(0xFF818CF8),
        ),
        const Divider(height: 1, color: WorkshopTheme.darkBorder),

        _buildCategoryTile(
          tabId: 'general',
          icon: LucideIcons.sliders,
          title: 'General Settings',
          description: 'Workshop identifier, currency & GST configuration',
          accentColor: WorkshopTheme.blueAccent,
        ),
        const Divider(height: 1, color: WorkshopTheme.darkBorder),

        _buildCategoryTile(
          tabId: 'system',
          icon: LucideIcons.info,
          title: 'Backend Information',
          description: 'Database sync, connection latency & diagnostics',
          accentColor: WorkshopTheme.statusPending,
        ),
        const Divider(height: 1, color: WorkshopTheme.darkBorder),

        // Log Out Tile
        InkWell(
          onTap: onLogoutClick,
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 18),
            child: Row(
              children: [
                Container(
                  width: 34,
                  height: 34,
                  alignment: Alignment.center,
                  child: const Icon(
                    LucideIcons.logOut,
                    size: 18,
                    color: WorkshopTheme.statusUrgent,
                  ),
                ),
                const SizedBox(width: 14),
                const Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'Log Out',
                        style: TextStyle(
                          fontSize: 14,
                          fontWeight: FontWeight.w700,
                          color: WorkshopTheme.statusUrgent,
                        ),
                      ),
                      SizedBox(height: 2),
                      Text(
                        'End active session on this device',
                        style: TextStyle(
                          fontSize: 12,
                          color: WorkshopTheme.darkTextMuted,
                        ),
                      ),
                    ],
                  ),
                ),
                const Icon(
                  LucideIcons.chevronRight,
                  size: 16,
                  color: WorkshopTheme.statusUrgent,
                ),
              ],
            ),
          ),
        ),
        const Divider(height: 1, color: WorkshopTheme.darkBorder),
      ],
    );
  }

  Widget _buildAvatarFallback(String initial) {
    return Container(
      decoration: BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [
            WorkshopTheme.emeraldAccent.withValues(alpha: 0.3),
            WorkshopTheme.darkSurface,
          ],
        ),
      ),
      alignment: Alignment.center,
      child: Text(
        initial,
        style: const TextStyle(
          fontSize: 28,
          fontWeight: FontWeight.w900,
          color: WorkshopTheme.darkTextPrimary,
        ),
      ),
    );
  }

  Widget _buildCategoryTile({
    required String tabId,
    required IconData icon,
    required String title,
    required String description,
    required Color accentColor,
    Widget? trailingBadge,
  }) {
    return InkWell(
      onTap: () => onSelectTab(tabId),
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 18),
        child: Row(
          children: [
            Container(
              width: 34,
              height: 34,
              alignment: Alignment.center,
              child: Icon(icon, size: 20, color: WorkshopTheme.darkTextMuted),
            ),
            const SizedBox(width: 14),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Text(
                        title,
                        style: const TextStyle(
                          fontSize: 14,
                          fontWeight: FontWeight.w700,
                          color: WorkshopTheme.darkTextPrimary,
                        ),
                      ),
                      if (trailingBadge != null) ...[
                        const SizedBox(width: 8),
                        trailingBadge,
                      ],
                    ],
                  ),
                  const SizedBox(height: 2),
                  Text(
                    description,
                    style: const TextStyle(
                      fontSize: 12,
                      color: WorkshopTheme.darkTextMuted,
                    ),
                    overflow: TextOverflow.ellipsis,
                  ),
                ],
              ),
            ),
            const SizedBox(width: 8),
            const Icon(
              LucideIcons.chevronRight,
              size: 16,
              color: WorkshopTheme.darkTextMuted,
            ),
          ],
        ),
      ),
    );
  }
}

/// Custom painter to reproduce the exact sinusoidal cubic Bézier waveform
/// and clipped dotted matrix grid from React's CategoriesView.tsx.
class _WaveformPainter extends CustomPainter {
  @override
  void paint(Canvas canvas, Size size) {
    const double refWidth = 500.0;
    const double refHeight = 130.0;

    final double scaleX = size.width / refWidth;
    final double scaleY = size.height / refHeight;

    // Wave path matching React:
    // M0,75 C70,75 85,20 135,20 C185,20 200,60 250,60 C290,60 310,30 350,30 C390,30 410,75 450,75 C475,75 490,55 500,55
    final Path wavePath = Path();
    wavePath.moveTo(0 * scaleX, 75 * scaleY);
    wavePath.cubicTo(70 * scaleX, 75 * scaleY, 85 * scaleX, 20 * scaleY, 135 * scaleX, 20 * scaleY);
    wavePath.cubicTo(185 * scaleX, 20 * scaleY, 200 * scaleX, 60 * scaleY, 250 * scaleX, 60 * scaleY);
    wavePath.cubicTo(290 * scaleX, 60 * scaleY, 310 * scaleX, 30 * scaleY, 350 * scaleX, 30 * scaleY);
    wavePath.cubicTo(390 * scaleX, 30 * scaleY, 410 * scaleX, 75 * scaleY, 450 * scaleX, 75 * scaleY);
    wavePath.cubicTo(475 * scaleX, 75 * scaleY, 490 * scaleX, 55 * scaleY, 500 * scaleX, 55 * scaleY);

    // Closed clip path for dotted matrix fill below the wave
    final Path clipPath = Path.from(wavePath);
    clipPath.lineTo(size.width, size.height);
    clipPath.lineTo(0, size.height);
    clipPath.close();

    canvas.save();
    canvas.clipPath(clipPath);

    // Draw dotted matrix grid
    final dotPaint = Paint()
      ..color = const Color(0xFF818CF8).withValues(alpha: 0.18)
      ..style = PaintingStyle.fill;

    const double dotSpacing = 8.0;
    for (double x = 2; x < size.width; x += dotSpacing) {
      for (double y = 2; y < size.height; y += dotSpacing) {
        canvas.drawCircle(Offset(x, y), 1.1, dotPaint);
      }
    }
    canvas.restore();

    // Draw waveform stroke
    final strokePaint = Paint()
      ..color = const Color(0xFF818CF8).withValues(alpha: 0.75)
      ..style = PaintingStyle.stroke
      ..strokeWidth = 2.4
      ..strokeCap = StrokeCap.round;

    canvas.drawPath(wavePath, strokePaint);
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}
