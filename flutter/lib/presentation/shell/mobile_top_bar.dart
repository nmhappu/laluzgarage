import 'dart:ui';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import '../../core/theme/workshop_theme.dart';
import '../../core/utils/avatar_utils.dart';
import '../../data/models/workshop_user.dart';
import '../../data/repositories/firebase_providers.dart';
import '../settings/settings_screen.dart';
import 'navigation_provider.dart';

class MobileTopBar extends ConsumerStatefulWidget
    implements PreferredSizeWidget {
  const MobileTopBar({super.key});

  @override
  Size get preferredSize => const Size.fromHeight(64.0);

  @override
  ConsumerState<MobileTopBar> createState() => _MobileTopBarState();
}

class _MobileTopBarState extends ConsumerState<MobileTopBar>
    with SingleTickerProviderStateMixin {
  final TextEditingController _searchController = TextEditingController();
  final FocusNode _searchFocusNode = FocusNode();

  @override
  void dispose() {
    _searchController.dispose();
    _searchFocusNode.dispose();
    super.dispose();
  }

  void _closeSearch() {
    _searchController.clear();
    ref.read(topBarSearchQueryProvider.notifier).clear();
    ref.read(isTopBarSearchOpenProvider.notifier).setOpen(false);
  }

  @override
  Widget build(BuildContext context) {
    final activeTab = ref.watch(activeNavTabProvider);
    final isScrolled = ref.watch(isScrolledProvider);
    final isSearchOpen = ref.watch(isTopBarSearchOpenProvider);
    final profile = ref.watch(currentUserProfileProvider).value;
    final role = profile?.effectiveRole;
    final topInset = MediaQuery.paddingOf(context).top;

    // Listen to query changes from outside
    final currentQuery = ref.watch(topBarSearchQueryProvider);
    if (_searchController.text != currentQuery) {
      _searchController.text = currentQuery;
    }

    if (isSearchOpen && !_searchFocusNode.hasFocus) {
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (mounted && isSearchOpen) {
          _searchFocusNode.requestFocus();
        }
      });
    }

    return PopScope(
      canPop: !isSearchOpen,
      onPopInvokedWithResult: (didPop, _) {
        if (!didPop && isSearchOpen) {
          _closeSearch();
        }
      },
      child: Container(
        height: 64.0 + topInset,
        decoration: BoxDecoration(
          color: isScrolled
              ? WorkshopTheme.darkCanvas.withValues(alpha: 0.85)
              : WorkshopTheme.darkCanvas,
          border: Border(
            bottom: BorderSide(
              color: isScrolled
                  ? WorkshopTheme.darkBorder.withValues(alpha: 0.4)
                  : WorkshopTheme.darkBorder.withValues(alpha: 0.2),
              width: 1,
            ),
          ),
          boxShadow: isScrolled
              ? [
                  BoxShadow(
                    color: Colors.black.withValues(alpha: 0.25),
                    blurRadius: 6,
                    offset: const Offset(0, 2),
                  ),
                ]
              : null,
        ),
        child: ClipRect(
          child: BackdropFilter(
            filter: ImageFilter.blur(
              sigmaX: isScrolled ? 10 : 0,
              sigmaY: isScrolled ? 10 : 0,
            ),
            child: SafeArea(
              bottom: false,
              child: Stack(
                children: [
                  // Standard Mobile Top Bar
                  Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 20),
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      crossAxisAlignment: CrossAxisAlignment.center,
                      children: [
                        // Left: Interactive Brand Title & Dynamic Animated Icon
                        InkWell(
                          onTap: () {
                            if (activeTab != 0) {
                              ref
                                  .read(activeNavTabProvider.notifier)
                                  .setTab(0);
                            }
                          },
                          borderRadius: BorderRadius.circular(8),
                          child: Padding(
                            padding: const EdgeInsets.symmetric(
                                vertical: 6, horizontal: 2),
                            child: Row(
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                // Title with smooth morph transition
                                AnimatedSwitcher(
                                  duration: const Duration(milliseconds: 200),
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
                                    style: const TextStyle(
                                      color: WorkshopTheme.darkTextPrimary,
                                      fontSize: 17,
                                      fontWeight: FontWeight.w800,
                                      letterSpacing: -0.4,
                                    ),
                                  ),
                                ),
                                const SizedBox(width: 10),

                                // Dynamic Rotating & Scaling Tab Icon
                                SizedBox(
                                  width: 24,
                                  height: 24,
                                  child: Center(
                                    child: AnimatedSwitcher(
                                      duration:
                                          const Duration(milliseconds: 220),
                                      switchInCurve: const Cubic(
                                          0.34, 1.56, 0.64, 1.0),
                                      switchOutCurve: Curves.easeIn,
                                      transitionBuilder: (child, animation) {
                                        final rotateAnim = Tween<double>(
                                          begin: -0.0833, // -30 degrees
                                          end: 0.0,
                                        ).animate(animation);

                                        return FadeTransition(
                                          opacity: animation,
                                          child: ScaleTransition(
                                            scale: Tween<double>(
                                              begin: 0.5,
                                              end: 1.0,
                                            ).animate(animation),
                                            child: RotationTransition(
                                              turns: rotateAnim,
                                              child: child,
                                            ),
                                          ),
                                        );
                                      },
                                      child: Icon(
                                        getTabM3Icon(activeTab),
                                        key: ValueKey<int>(activeTab),
                                        size: 21,
                                        color: getTabAccentColor(activeTab),
                                      ),
                                    ),
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ),

                        // Right: Actions (Contextual Search + User Profile Avatar)
                        Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            // Contextual Search Button (Tabs 1, 2, 3)
                            AnimatedSwitcher(
                              duration: const Duration(milliseconds: 180),
                              child: isTabSearchable(activeTab)
                                  ? IconButton(
                                      key: const ValueKey('search_btn'),
                                      icon: const Icon(
                                        LucideIcons.search,
                                        size: 20,
                                        color: WorkshopTheme.darkTextMuted,
                                      ),
                                      tooltip: 'Search',
                                      onPressed: () {
                                        ref
                                            .read(isTopBarSearchOpenProvider
                                                .notifier)
                                            .setOpen(true);
                                      },
                                    )
                                  : const SizedBox.shrink(
                                      key: ValueKey('empty_search_box'),
                                    ),
                            ),

                            const SizedBox(width: 4),

                            // User Profile Avatar with Role Ring
                            _buildRoleAvatar(context, profile, role),
                          ],
                        ),
                      ],
                    ),
                  ),

                  // Expandable Sticky Search Bar Overlay
                  AnimatedPositioned(
                    duration: const Duration(milliseconds: 180),
                    curve: Curves.easeOutCubic,
                    top: isSearchOpen ? 0 : -64.0,
                    left: 0,
                    right: 0,
                    height: 64.0,
                    child: AnimatedOpacity(
                      duration: const Duration(milliseconds: 180),
                      opacity: isSearchOpen ? 1.0 : 0.0,
                      child: Container(
                        decoration: const BoxDecoration(
                          color: WorkshopTheme.darkSurface,
                          border: Border(
                            bottom: BorderSide(
                              color: WorkshopTheme.darkBorder,
                              width: 1,
                            ),
                          ),
                          boxShadow: [
                            BoxShadow(
                              color: Colors.black45,
                              blurRadius: 8,
                              offset: Offset(0, 3),
                            ),
                          ],
                        ),
                        padding: const EdgeInsets.symmetric(horizontal: 20),
                        child: Row(
                          children: [
                            const Icon(
                              LucideIcons.search,
                              size: 20,
                              color: WorkshopTheme.darkTextMuted,
                            ),
                            const SizedBox(width: 12),
                            Expanded(
                              child: TextField(
                                controller: _searchController,
                                focusNode: _searchFocusNode,
                                textCapitalization: TextCapitalization.characters,
                                style: const TextStyle(
                                  color: WorkshopTheme.darkTextPrimary,
                                  fontSize: 14,
                                  fontWeight: FontWeight.w600,
                                ),
                                decoration: InputDecoration(
                                  border: InputBorder.none,
                                  enabledBorder: InputBorder.none,
                                  focusedBorder: InputBorder.none,
                                  hintText:
                                      getTabSearchPlaceholder(activeTab),
                                  hintStyle: TextStyle(
                                    color: WorkshopTheme.darkTextMuted
                                        .withValues(alpha: 0.5),
                                    fontSize: 13,
                                    fontWeight: FontWeight.w700,
                                    letterSpacing: 0.8,
                                  ),
                                  isDense: true,
                                  contentPadding:
                                      const EdgeInsets.symmetric(vertical: 10),
                                ),
                                onChanged: (val) {
                                  ref
                                      .read(topBarSearchQueryProvider.notifier)
                                      .setQuery(val.trim());
                                },
                              ),
                            ),
                            IconButton(
                              icon: const Icon(
                                LucideIcons.x,
                                size: 20,
                                color: WorkshopTheme.darkTextMuted,
                              ),
                              tooltip: 'Close search',
                              onPressed: _closeSearch,
                            ),
                          ],
                        ),
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildRoleAvatar(
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
        width: 36,
        height: 36,
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
                          fontSize: 12,
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
                        fontSize: 12,
                        fontWeight: FontWeight.w800,
                      ),
                    ),
                  ),
          ),
        ),
      ),
    );
  }
}
