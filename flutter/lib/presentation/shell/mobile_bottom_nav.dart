import 'dart:ui';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:google_fonts/google_fonts.dart';
import '../../core/theme/workshop_theme.dart';
import '../../data/models/service_record.dart';
import '../../data/repositories/service_repository.dart';

class _NavItem {
  final int index;
  final String label;
  final IconData icon;
  final Color accentColor;
  final double activeWidth;
  final int badgeCount;

  const _NavItem({
    required this.index,
    required this.label,
    required this.icon,
    required this.accentColor,
    required this.activeWidth,
    this.badgeCount = 0,
  });
}

/// Floating Capsule Navigation Dock (1:1 with React MobileBottomNav.tsx)
/// - Floating capsule centered above system navigation bar
/// - Frosted glass backdrop blur with #0C0E12 dark / #FFFFFF light
/// - Dynamic pill expansion with Google Sans typography
/// - Real-time badge counter for pending services
class MobileBottomNav extends ConsumerWidget {
  final int activeIndex;
  final ValueChanged<int> onTabSelected;

  const MobileBottomNav({
    super.key,
    required this.activeIndex,
    required this.onTabSelected,
  });

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;

    final records = ref.watch(serviceRecordsStreamProvider).asData?.value ?? [];
    final pendingCount = records
        .where((r) =>
            r.status == ServiceStatus.pending ||
            r.status == ServiceStatus.inProgress)
        .length;

    final items = [
      const _NavItem(
        index: 0,
        label: 'Dashboard',
        icon: Icons.grid_view_rounded,
        accentColor: WorkshopTheme.emeraldAccent,
        activeWidth: 124,
      ),
      const _NavItem(
        index: 1,
        label: 'Vehicle',
        icon: Icons.directions_car_rounded,
        accentColor: WorkshopTheme.blueAccent,
        activeWidth: 104,
      ),
      const _NavItem(
        index: 2,
        label: 'Inventory',
        icon: Icons.inventory_2_rounded,
        accentColor: WorkshopTheme.emeraldAccent,
        activeWidth: 118,
      ),
      _NavItem(
        index: 3,
        label: 'Services',
        icon: Icons.build_rounded,
        accentColor: WorkshopTheme.emeraldAccent,
        activeWidth: 114,
        badgeCount: pendingCount,
      ),
    ];

    final bottomPadding = MediaQuery.paddingOf(context).bottom;

    return Container(
      color: Colors.transparent,
      padding: EdgeInsets.only(
        left: 16,
        right: 16,
        bottom: 12 + bottomPadding,
      ),
      child: Center(
        heightFactor: 1.0,
        child: ClipRRect(
          borderRadius: BorderRadius.circular(36),
          child: BackdropFilter(
            filter: ImageFilter.blur(sigmaX: 16, sigmaY: 16),
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 6),
              decoration: BoxDecoration(
                color: isDark
                    ? const Color(0xF20C0E12)
                    : const Color(0xF2FFFFFF),
                borderRadius: BorderRadius.circular(36),
                border: Border.all(
                  color: isDark
                      ? const Color(0x22FFFFFF)
                      : const Color(0x14000000),
                  width: 1,
                ),
                boxShadow: [
                  BoxShadow(
                    color: Colors.black.withValues(alpha: isDark ? 0.45 : 0.15),
                    blurRadius: 32,
                    offset: const Offset(0, 10),
                  ),
                ],
              ),
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: items.map((item) {
                  final isActive = activeIndex == item.index;

                  return Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 3),
                    child: Material(
                      color: Colors.transparent,
                      child: InkWell(
                        onTap: () => onTabSelected(item.index),
                        borderRadius: BorderRadius.circular(24),
                        child: AnimatedContainer(
                          duration: const Duration(milliseconds: 260),
                          curve: const Cubic(0.2, 0.0, 0.0, 1.0),
                          height: 48,
                          width: isActive ? item.activeWidth : 48,
                          padding: const EdgeInsets.symmetric(horizontal: 12),
                          decoration: BoxDecoration(
                            color: isActive
                                ? item.accentColor.withValues(alpha: 0.14)
                                : Colors.transparent,
                            borderRadius: BorderRadius.circular(24),
                          ),
                          child: Row(
                            mainAxisSize: MainAxisSize.min,
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              Stack(
                                clipBehavior: Clip.none,
                                children: [
                                  Icon(
                                    item.icon,
                                    size: 22,
                                    color: isActive
                                        ? item.accentColor
                                        : (isDark
                                            ? WorkshopTheme.darkTextMuted
                                            : WorkshopTheme.lightTextMuted),
                                  ),
                                  if (item.badgeCount > 0)
                                    Positioned(
                                      top: -3,
                                      right: -6,
                                      child: Container(
                                        padding: const EdgeInsets.symmetric(
                                            horizontal: 5, vertical: 1.5),
                                        decoration: BoxDecoration(
                                          color: WorkshopTheme.statusUrgent,
                                          borderRadius:
                                              BorderRadius.circular(10),
                                          boxShadow: [
                                            BoxShadow(
                                              color: WorkshopTheme.statusUrgent
                                                  .withValues(alpha: 0.4),
                                              blurRadius: 4,
                                            ),
                                          ],
                                        ),
                                        constraints: const BoxConstraints(
                                          minWidth: 18,
                                          minHeight: 18,
                                        ),
                                        child: Center(
                                          child: Text(
                                            item.badgeCount > 99
                                                ? '99+'
                                                : '${item.badgeCount}',
                                            textAlign: TextAlign.center,
                                            style: GoogleFonts.googleSans(
                                              color: Colors.white,
                                              fontSize: 10,
                                              fontWeight: FontWeight.w900,
                                            ),
                                          ),
                                        ),
                                      ),
                                    ),
                                ],
                              ),
                              if (isActive) ...[
                                const SizedBox(width: 8),
                                Flexible(
                                  child: Text(
                                    item.label,
                                    maxLines: 1,
                                    overflow: TextOverflow.fade,
                                    softWrap: false,
                                    style: GoogleFonts.googleSans(
                                      color: item.accentColor,
                                      fontWeight: FontWeight.w700,
                                      fontSize: 13,
                                      letterSpacing: -0.2,
                                    ),
                                  ),
                                ),
                              ],
                            ],
                          ),
                        ),
                      ),
                    ),
                  );
                }).toList(),
              ),
            ),
          ),
        ),
      ),
    );
  }
}

