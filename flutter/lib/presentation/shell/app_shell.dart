import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import '../../core/theme/workshop_theme.dart';
import '../../core/utils/avatar_utils.dart';
import '../../data/models/workshop_user.dart';
import '../dashboard/dashboard_screen.dart';
import '../vehicles/vehicle_registry_screen.dart';
import '../inventory/inventory_screen.dart';
import '../services/services_screen.dart';
import '../intake/advisor_verification_screen.dart';
import '../settings/settings_screen.dart';
import '../../data/repositories/firebase_providers.dart';
import 'navigation_provider.dart';
import 'mobile_bottom_nav.dart';
import 'mobile_top_bar.dart';

class AppShell extends ConsumerWidget {
  const AppShell({super.key});

  void _showLogoutDialog(BuildContext context, WidgetRef ref) {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: WorkshopTheme.darkCard,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        title: const Row(
          children: [
            Icon(LucideIcons.logOut, color: WorkshopTheme.statusUrgent, size: 20),
            SizedBox(width: 10),
            Text(
              'Sign Out',
              style: TextStyle(fontWeight: FontWeight.w800, fontSize: 18),
            ),
          ],
        ),
        content: const Text(
          'Are you sure you want to end your active workshop session?',
          style: TextStyle(color: WorkshopTheme.darkTextMuted, fontSize: 13),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(ctx).pop(),
            child: const Text('Cancel', style: TextStyle(color: Colors.grey)),
          ),
          FilledButton(
            onPressed: () async {
              Navigator.of(ctx).pop();
              await ref.read(authRepositoryProvider).signOut();
            },
            style: FilledButton.styleFrom(
              backgroundColor: WorkshopTheme.statusUrgent,
              foregroundColor: Colors.white,
            ),
            child: const Text('Sign Out'),
          ),
        ],
      ),
    );
  }

  Widget _buildDesktopRoleAvatar(
    BuildContext context,
    WorkshopUser? profile,
    UserRole? role,
  ) {
    Color ringColor;
    Color fallbackBg;
    Color fallbackText;
    List<BoxShadow>? ringGlow;

    switch (role) {
      case UserRole.admin:
        ringColor = WorkshopTheme.statusUrgent;
        fallbackBg = WorkshopTheme.statusUrgent.withValues(alpha: 0.15);
        fallbackText = WorkshopTheme.statusUrgent;
        ringGlow = [
          BoxShadow(
            color: WorkshopTheme.statusUrgent.withValues(alpha: 0.25),
            blurRadius: 4,
            spreadRadius: 1,
          ),
        ];
        break;
      case UserRole.technician:
        ringColor = WorkshopTheme.statusSuccess;
        fallbackBg = WorkshopTheme.statusSuccess.withValues(alpha: 0.15);
        fallbackText = WorkshopTheme.statusSuccess;
        ringGlow = [
          BoxShadow(
            color: WorkshopTheme.statusSuccess.withValues(alpha: 0.25),
            blurRadius: 4,
            spreadRadius: 1,
          ),
        ];
        break;
      case UserRole.assistant:
        ringColor = const Color(0xFF38BDF8);
        fallbackBg = const Color(0xFF38BDF8).withValues(alpha: 0.15);
        fallbackText = const Color(0xFF38BDF8);
        ringGlow = [
          BoxShadow(
            color: const Color(0xFF38BDF8).withValues(alpha: 0.25),
            blurRadius: 4,
            spreadRadius: 1,
          ),
        ];
        break;
      default:
        ringColor = WorkshopTheme.darkBorder;
        fallbackBg = WorkshopTheme.darkSurface;
        fallbackText = WorkshopTheme.emeraldAccent;
        ringGlow = null;
        break;
    }

    final initialLetter = (profile?.name.isNotEmpty == true
            ? profile!.name[0]
            : profile?.email.isNotEmpty == true
                ? profile!.email[0]
                : 'A')
        .toUpperCase();

    final avatarUrl = getHighQualityAvatarUrl(profile?.photoURL, size: 256);

    return InkWell(
      onTap: () {
        Navigator.of(context).push(
          MaterialPageRoute(builder: (_) => const SettingsScreen()),
        );
      },
      borderRadius: BorderRadius.circular(20),
      child: Container(
        width: 32,
        height: 32,
        padding: const EdgeInsets.all(2),
        decoration: BoxDecoration(
          shape: BoxShape.circle,
          border: Border.all(color: ringColor, width: 2),
          boxShadow: ringGlow,
        ),
        child: ClipOval(
          child: Container(
            color: fallbackBg,
            child: avatarUrl != null && avatarUrl.isNotEmpty
                ? Image.network(
                    avatarUrl,
                    fit: BoxFit.cover,
                    errorBuilder: (context, error, stackTrace) => Center(
                      child: Text(
                        initialLetter,
                        style: TextStyle(
                          color: fallbackText,
                          fontSize: 11,
                          fontWeight: FontWeight.w800,
                        ),
                      ),
                    ),
                  )
                : Center(
                    child: Text(
                      initialLetter,
                      style: TextStyle(
                        color: fallbackText,
                        fontSize: 11,
                        fontWeight: FontWeight.w800,
                      ),
                    ),
                  ),
          ),
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final activeTab = ref.watch(activeNavTabProvider);
    final profile = ref.watch(currentUserProfileProvider).value;
    final role = profile?.effectiveRole;

    final screens = [
      DashboardScreen(
        onStartIntake: () {
          Navigator.of(context).push(
            MaterialPageRoute(builder: (_) => const AdvisorVerificationScreen()),
          );
        },
      ),
      const VehicleRegistryScreen(),
      const InventoryScreen(),
      const ServicesScreen(),
    ];

    final isWide = MediaQuery.sizeOf(context).width >= 768;

    if (isWide) {
      final desktopSearchQuery = ref.watch(topBarSearchQueryProvider);

      return Scaffold(
        backgroundColor: WorkshopTheme.darkCanvas,
        body: Row(
          children: [
            // Desktop Left Sidebar (1:1 with React DesktopSidebar.tsx)
            Container(
              width: 256,
              decoration: const BoxDecoration(
                color: WorkshopTheme.darkSurface,
                border: Border(
                  right: BorderSide(color: WorkshopTheme.darkBorder, width: 1),
                ),
              ),
              child: SafeArea(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    // Brand Header
                    Padding(
                      padding: const EdgeInsets.fromLTRB(20, 20, 20, 16),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              // Left Title & Icon
                              Expanded(
                                child: InkWell(
                                  onTap: () {
                                    if (activeTab != 0) {
                                      ref
                                          .read(activeNavTabProvider.notifier)
                                          .setTab(0);
                                    }
                                  },
                                  borderRadius: BorderRadius.circular(8),
                                  child: Row(
                                    children: [
                                      Flexible(
                                        child: AnimatedSwitcher(
                                          duration:
                                              const Duration(milliseconds: 200),
                                          transitionBuilder: (child, animation) {
                                            return FadeTransition(
                                              opacity: animation,
                                              child: SlideTransition(
                                                position: Tween<Offset>(
                                                  begin: const Offset(0.0, 0.08),
                                                  end: Offset.zero,
                                                ).animate(animation),
                                                child: child,
                                              ),
                                            );
                                          },
                                          child: Text(
                                            getNavTitle(activeTab),
                                            key: ValueKey<int>(activeTab),
                                            maxLines: 1,
                                            overflow: TextOverflow.ellipsis,
                                            style: const TextStyle(
                                              fontSize: 17,
                                              fontWeight: FontWeight.w900,
                                              letterSpacing: -0.4,
                                              color: WorkshopTheme.darkTextPrimary,
                                            ),
                                          ),
                                        ),
                                      ),
                                      const SizedBox(width: 8),
                                      SizedBox(
                                        width: 24,
                                        height: 24,
                                        child: Center(
                                          child: AnimatedSwitcher(
                                            duration: const Duration(
                                                milliseconds: 220),
                                            switchInCurve: const Cubic(
                                                0.34, 1.56, 0.64, 1.0),
                                            switchOutCurve: Curves.easeIn,
                                            transitionBuilder:
                                                (child, animation) {
                                              return FadeTransition(
                                                opacity: animation,
                                                child: ScaleTransition(
                                                  scale: Tween<double>(
                                                    begin: 0.5,
                                                    end: 1.0,
                                                  ).animate(animation),
                                                  child: RotationTransition(
                                                    turns: Tween<double>(
                                                      begin: -0.0833,
                                                      end: 0.0,
                                                    ).animate(animation),
                                                    child: child,
                                                  ),
                                                ),
                                              );
                                            },
                                            child: Icon(
                                              getTabM3Icon(activeTab),
                                              key: ValueKey<int>(activeTab),
                                              size: 20,
                                              color:
                                                  getTabAccentColor(activeTab),
                                            ),
                                          ),
                                        ),
                                      ),
                                    ],
                                  ),
                                ),
                              ),
                              // Role Avatar on Desktop Header
                              _buildDesktopRoleAvatar(context, profile, role),
                            ],
                          ),
                          const SizedBox(height: 6),
                          const Text(
                            'WORKSHOP MANAGER',
                            style: TextStyle(
                              fontSize: 9,
                              fontWeight: FontWeight.w800,
                              letterSpacing: 2.0,
                              color: WorkshopTheme.darkTextMuted,
                            ),
                          ),
                        ],
                      ),
                    ),

                    // Contextual Search Bar on Desktop Sidebar (tabs 1, 2, 3)
                    if (isTabSearchable(activeTab)) ...[
                      Padding(
                        padding: const EdgeInsets.symmetric(
                            horizontal: 16, vertical: 4),
                        child: Container(
                          decoration: BoxDecoration(
                            color: WorkshopTheme.darkCard,
                            borderRadius: BorderRadius.circular(10),
                            border: Border.all(color: WorkshopTheme.darkBorder),
                          ),
                          padding: const EdgeInsets.symmetric(horizontal: 10),
                          child: Row(
                            children: [
                              const Icon(
                                LucideIcons.search,
                                size: 16,
                                color: WorkshopTheme.darkTextMuted,
                              ),
                              const SizedBox(width: 8),
                              Expanded(
                                child: TextField(
                                  controller: TextEditingController(
                                      text: desktopSearchQuery)
                                    ..selection = TextSelection.collapsed(
                                        offset: desktopSearchQuery.length),
                                  style: const TextStyle(
                                    fontSize: 12,
                                    fontWeight: FontWeight.w600,
                                    color: WorkshopTheme.darkTextPrimary,
                                  ),
                                  decoration: InputDecoration(
                                    border: InputBorder.none,
                                    hintText:
                                        getTabSearchPlaceholder(activeTab),
                                    hintStyle: TextStyle(
                                      color: WorkshopTheme.darkTextMuted
                                          .withValues(alpha: 0.5),
                                      fontSize: 11,
                                      fontWeight: FontWeight.w700,
                                      letterSpacing: 0.6,
                                    ),
                                    isDense: true,
                                    contentPadding: const EdgeInsets.symmetric(
                                        vertical: 8),
                                  ),
                                  onChanged: (val) {
                                    ref
                                        .read(topBarSearchQueryProvider
                                            .notifier)
                                        .setQuery(val.trim());
                                  },
                                ),
                              ),
                              if (desktopSearchQuery.isNotEmpty)
                                GestureDetector(
                                  onTap: () {
                                    ref
                                        .read(topBarSearchQueryProvider
                                            .notifier)
                                        .clear();
                                  },
                                  child: const Icon(
                                    LucideIcons.x,
                                    size: 14,
                                    color: WorkshopTheme.darkTextMuted,
                                  ),
                                ),
                            ],
                          ),
                        ),
                      ),
                      const SizedBox(height: 6),
                    ],

                    const Divider(height: 1, color: WorkshopTheme.darkBorder),
                    const SizedBox(height: 8),

                    // Navigation Links
                    Expanded(
                      child: ListView(
                        padding: const EdgeInsets.symmetric(horizontal: 12),
                        children: [
                          _buildSidebarItem(
                            index: 0,
                            activeTab: activeTab,
                            label: 'Dashboard',
                            icon: Icons.grid_view_rounded,
                            ref: ref,
                          ),
                          _buildSidebarItem(
                            index: 1,
                            activeTab: activeTab,
                            label: 'Vehicles',
                            icon: Icons.directions_car_rounded,
                            accentColor: WorkshopTheme.blueAccent,
                            ref: ref,
                          ),
                          _buildSidebarItem(
                            index: 2,
                            activeTab: activeTab,
                            label: 'Inventory',
                            icon: Icons.inventory_2_rounded,
                            ref: ref,
                          ),
                          _buildSidebarItem(
                            index: 3,
                            activeTab: activeTab,
                            label: 'Services',
                            icon: Icons.build_rounded,
                            ref: ref,
                          ),
                          const SizedBox(height: 16),
                          Padding(
                            padding: const EdgeInsets.symmetric(horizontal: 4),
                            child: FilledButton.icon(
                              onPressed: () {
                                Navigator.of(context).push(
                                  MaterialPageRoute(
                                      builder: (_) =>
                                          const AdvisorVerificationScreen()),
                                );
                              },
                              icon: const Icon(LucideIcons.plusCircle, size: 18),
                              label: const Text(
                                'NEW INTAKE',
                                style: TextStyle(
                                  fontWeight: FontWeight.w900,
                                  fontSize: 12,
                                  letterSpacing: 0.8,
                                ),
                              ),
                              style: FilledButton.styleFrom(
                                backgroundColor: WorkshopTheme.emeraldAccent,
                                foregroundColor: Colors.black,
                                padding:
                                    const EdgeInsets.symmetric(vertical: 14),
                                shape: RoundedRectangleBorder(
                                  borderRadius: BorderRadius.circular(12),
                                ),
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),

                    // Settings & Sign Out Footer
                    const Divider(height: 1, color: WorkshopTheme.darkBorder),
                    Padding(
                      padding: const EdgeInsets.all(12),
                      child: Column(
                        children: [
                          ListTile(
                            leading: const Icon(LucideIcons.settings,
                                size: 18, color: WorkshopTheme.darkTextMuted),
                            title: const Text(
                              'Settings',
                              style: TextStyle(
                                fontSize: 13,
                                fontWeight: FontWeight.w700,
                                color: WorkshopTheme.darkTextMuted,
                              ),
                            ),
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(10),
                            ),
                            onTap: () {
                              Navigator.of(context).push(
                                MaterialPageRoute(
                                    builder: (_) => const SettingsScreen()),
                              );
                            },
                          ),
                          ListTile(
                            leading: const Icon(LucideIcons.logOut,
                                size: 18, color: WorkshopTheme.statusUrgent),
                            title: const Text(
                              'Sign Out',
                              style: TextStyle(
                                fontSize: 13,
                                fontWeight: FontWeight.w700,
                                color: WorkshopTheme.statusUrgent,
                              ),
                            ),
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(10),
                            ),
                            onTap: () => _showLogoutDialog(context, ref),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
            ),

            // Content Body Area
            Expanded(
              child: AnimatedSwitcher(
                duration: const Duration(milliseconds: 250),
                switchInCurve: const Cubic(0.2, 0.0, 0.0, 1.0),
                switchOutCurve: const Cubic(0.2, 0.0, 0.0, 1.0),
                transitionBuilder: (child, animation) {
                  return FadeTransition(
                    opacity: animation,
                    child: SlideTransition(
                      position: Tween<Offset>(
                        begin: const Offset(0.0, 0.02),
                        end: Offset.zero,
                      ).animate(animation),
                      child: child,
                    ),
                  );
                },
                child: KeyedSubtree(
                  key: ValueKey<int>(activeTab),
                  child: screens[activeTab],
                ),
              ),
            ),
          ],
        ),
      );
    }

    // Mobile Phone Layout
    return Scaffold(
      backgroundColor: WorkshopTheme.darkCanvas,
      appBar: const MobileTopBar(),
      body: NotificationListener<ScrollNotification>(
        onNotification: (scrollNotification) {
          if (scrollNotification is ScrollUpdateNotification) {
            final isScrolled = scrollNotification.metrics.pixels > 10;
            ref.read(isScrolledProvider.notifier).setScrolled(isScrolled);
          }
          return false;
        },
        child: AnimatedSwitcher(
          duration: const Duration(milliseconds: 250),
          switchInCurve: const Cubic(0.2, 0.0, 0.0, 1.0),
          switchOutCurve: const Cubic(0.2, 0.0, 0.0, 1.0),
          transitionBuilder: (child, animation) {
            return FadeTransition(
              opacity: animation,
              child: SlideTransition(
                position: Tween<Offset>(
                  begin: const Offset(0.0, 0.02),
                  end: Offset.zero,
                ).animate(animation),
                child: child,
              ),
            );
          },
          child: KeyedSubtree(
            key: ValueKey<int>(activeTab),
            child: screens[activeTab],
          ),
        ),
      ),
      bottomNavigationBar: MobileBottomNav(
        activeIndex: activeTab,
        onTabSelected: (index) =>
            ref.read(activeNavTabProvider.notifier).setTab(index),
      ),
    );
  }

  Widget _buildSidebarItem({
    required int index,
    required int activeTab,
    required String label,
    required IconData icon,
    Color accentColor = WorkshopTheme.emeraldAccent,
    required WidgetRef ref,
  }) {
    final isActive = activeTab == index;

    return Container(
      margin: const EdgeInsets.only(bottom: 6),
      decoration: BoxDecoration(
        color: isActive
            ? accentColor.withValues(alpha: 0.12)
            : Colors.transparent,
        borderRadius: BorderRadius.circular(12),
        border: isActive
            ? Border.all(color: accentColor.withValues(alpha: 0.3))
            : null,
      ),
      child: ListTile(
        leading: Icon(
          icon,
          size: 20,
          color: isActive ? accentColor : WorkshopTheme.darkTextMuted,
        ),
        title: Text(
          label,
          style: TextStyle(
            fontSize: 14,
            fontWeight: isActive ? FontWeight.w800 : FontWeight.w600,
            color: isActive ? accentColor : WorkshopTheme.darkTextMuted,
          ),
        ),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
        onTap: () => ref.read(activeNavTabProvider.notifier).setTab(index),
      ),
    );
  }
}
