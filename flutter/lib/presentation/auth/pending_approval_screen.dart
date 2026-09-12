import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import '../../core/theme/workshop_theme.dart';
import '../../data/repositories/firebase_providers.dart';
import '../common/theme_toggle_button.dart';

/// Replicates the exact PendingApprovalPage from the React build:
/// - Amber ambient background glow
/// - Header with brand title & ThemeToggleButton
/// - ShieldAlert hero icon with glowing aura
/// - "Contact your Supervisor" heading and customized welcome text
/// - Divider-bounded Name and Account (monospace) rows
/// - "Check Activation Status" & "Sign Out" actions
class PendingApprovalScreen extends ConsumerStatefulWidget {
  const PendingApprovalScreen({super.key});

  @override
  ConsumerState<PendingApprovalScreen> createState() =>
      _PendingApprovalScreenState();
}

class _PendingApprovalScreenState extends ConsumerState<PendingApprovalScreen> {
  bool _isChecking = false;

  Future<void> _handleRefresh() async {
    setState(() => _isChecking = true);
    try {
      final user = ref.read(currentUserProvider).value;
      if (user != null) {
        await ref.read(authRepositoryProvider).syncUserProfile(user);
      }
      await Future.delayed(const Duration(milliseconds: 600));
    } finally {
      if (mounted) {
        setState(() => _isChecking = false);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;
    final textMuted =
        isDark ? WorkshopTheme.darkTextMuted : WorkshopTheme.lightTextMuted;
    final textPrimary =
        isDark ? WorkshopTheme.darkTextPrimary : WorkshopTheme.lightTextPrimary;
    final borderColor =
        isDark ? WorkshopTheme.darkBorder : WorkshopTheme.lightBorder;
    final surfaceColor = isDark
        ? WorkshopTheme.darkSurface.withValues(alpha: 0.6)
        : WorkshopTheme.lightSurface;

    final user = ref.watch(currentUserProvider).value;
    final profile = ref.watch(currentUserProfileProvider).value;

    final displayName = profile?.name.isNotEmpty == true
        ? profile!.name
        : user?.displayName ?? user?.email?.split('@').first ?? 'Team Member';
    final displayEmail = profile?.email.isNotEmpty == true
        ? profile!.email
        : user?.email ?? '';

    return Scaffold(
      backgroundColor: theme.scaffoldBackgroundColor,
      body: Stack(
        children: [
          // Ambient Background Glow (Status Pending Amber, 500x500)
          Positioned(
            top: MediaQuery.of(context).size.height * 0.35 - 250,
            left: MediaQuery.of(context).size.width / 2 - 250,
            child: IgnorePointer(
              child: Container(
                width: 500,
                height: 500,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  gradient: RadialGradient(
                    colors: [
                      WorkshopTheme.statusPending.withValues(alpha: 0.05),
                      Colors.transparent,
                    ],
                  ),
                ),
              ),
            ),
          ),

          // Main Foreground Content
          SafeArea(
            child: LayoutBuilder(
              builder: (context, constraints) {
                return SingleChildScrollView(
                  physics: const BouncingScrollPhysics(),
                  padding: const EdgeInsets.symmetric(
                    horizontal: 24,
                    vertical: 16,
                  ),
                  child: ConstrainedBox(
                    constraints: BoxConstraints(
                      minHeight: constraints.maxHeight - 32,
                    ),
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        // 1. Top Header: LaluZ Garage brand title & ThemeToggleButton
                        Align(
                          alignment: Alignment.topCenter,
                          child: ConstrainedBox(
                            constraints: const BoxConstraints(maxWidth: 448),
                            child: Row(
                              mainAxisAlignment:
                                  MainAxisAlignment.spaceBetween,
                              children: [
                                Text(
                                  'LaluZ Garage',
                                  style: WorkshopTheme.brandLogo(
                                    fontSize: 16,
                                    fontWeight: FontWeight.w700,
                                    color: textPrimary,
                                  ),
                                ),
                                const ThemeToggleButton(),
                              ],
                            ),
                          ),
                        ),

                        // 2. Centered Main Content
                        Padding(
                          padding: const EdgeInsets.symmetric(vertical: 32),
                          child: ConstrainedBox(
                            constraints: const BoxConstraints(maxWidth: 448),
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                // Status Icon with Ambient Amber Blur Glow
                                Stack(
                                  alignment: Alignment.center,
                                  children: [
                                    Container(
                                      width: 48,
                                      height: 48,
                                      decoration: BoxDecoration(
                                        shape: BoxShape.circle,
                                        boxShadow: [
                                          BoxShadow(
                                            color: WorkshopTheme.statusPending
                                                .withValues(alpha: 0.20),
                                            blurRadius: 32,
                                            spreadRadius: 8,
                                          ),
                                        ],
                                      ),
                                    ),
                                    const Icon(
                                      LucideIcons.shieldAlert,
                                      size: 48,
                                      color: WorkshopTheme.statusPending,
                                    ),
                                  ],
                                ),
                                const SizedBox(height: 24),

                                // Heading & Subtitle
                                Text(
                                  'Contact your Supervisor',
                                  style: WorkshopTheme.brandLogo(
                                    fontSize: 26,
                                    fontWeight: FontWeight.w700,
                                    color: textPrimary,
                                    letterSpacing: -0.5,
                                  ),
                                ),
                                const SizedBox(height: 10),
                                RichText(
                                  text: TextSpan(
                                    style: TextStyle(
                                      fontSize: 13.5,
                                      height: 1.5,
                                      color: textMuted,
                                    ),
                                    children: [
                                      const TextSpan(text: 'Welcome, '),
                                      TextSpan(
                                        text: displayName,
                                        style: TextStyle(
                                          fontWeight: FontWeight.w700,
                                          color: textPrimary,
                                        ),
                                      ),
                                      const TextSpan(
                                        text:
                                            '. Your account has been authenticated, but you do not have an active workshop role assigned yet.',
                                      ),
                                    ],
                                  ),
                                ),
                                const SizedBox(height: 24),

                                // User Details Table (Border-y with subtle dividers)
                                Container(
                                  decoration: BoxDecoration(
                                    border: Border(
                                      top: BorderSide(
                                        color: borderColor
                                            .withValues(alpha: 0.6),
                                        width: 1,
                                      ),
                                      bottom: BorderSide(
                                        color: borderColor
                                            .withValues(alpha: 0.6),
                                        width: 1,
                                      ),
                                    ),
                                  ),
                                  child: Column(
                                    children: [
                                      Padding(
                                        padding: const EdgeInsets.symmetric(
                                            vertical: 12),
                                        child: Row(
                                          mainAxisAlignment:
                                              MainAxisAlignment.spaceBetween,
                                          children: [
                                            Text(
                                              'Name',
                                              style: TextStyle(
                                                fontSize: 13,
                                                fontWeight: FontWeight.w500,
                                                color: textMuted,
                                              ),
                                            ),
                                            const SizedBox(width: 16),
                                            Flexible(
                                              child: Text(
                                                displayName,
                                                overflow:
                                                    TextOverflow.ellipsis,
                                                style: TextStyle(
                                                  fontSize: 13,
                                                  fontWeight: FontWeight.w700,
                                                  color: textPrimary,
                                                ),
                                              ),
                                            ),
                                          ],
                                        ),
                                      ),
                                      Divider(
                                        height: 1,
                                        thickness: 1,
                                        color: borderColor
                                            .withValues(alpha: 0.6),
                                      ),
                                      Padding(
                                        padding: const EdgeInsets.symmetric(
                                            vertical: 12),
                                        child: Row(
                                          mainAxisAlignment:
                                              MainAxisAlignment.spaceBetween,
                                          children: [
                                            Text(
                                              'Account',
                                              style: TextStyle(
                                                fontSize: 13,
                                                fontWeight: FontWeight.w500,
                                                color: textMuted,
                                              ),
                                            ),
                                            const SizedBox(width: 16),
                                            Flexible(
                                              child: Text(
                                                displayEmail,
                                                overflow:
                                                    TextOverflow.ellipsis,
                                                style: WorkshopTheme.mono(
                                                  fontSize: 12,
                                                  fontWeight: FontWeight.w500,
                                                  color: textPrimary,
                                                ),
                                              ),
                                            ),
                                          ],
                                        ),
                                      ),
                                    ],
                                  ),
                                ),
                                const SizedBox(height: 24),

                                // Action Buttons
                                FilledButton(
                                  onPressed:
                                      _isChecking ? null : _handleRefresh,
                                  style: FilledButton.styleFrom(
                                    backgroundColor:
                                        WorkshopTheme.emeraldAccent,
                                    foregroundColor: Colors.black,
                                    padding: const EdgeInsets.symmetric(
                                        horizontal: 20, vertical: 14),
                                    shape: RoundedRectangleBorder(
                                      borderRadius: BorderRadius.circular(12),
                                    ),
                                    elevation: 2,
                                  ),
                                  child: Row(
                                    mainAxisAlignment: MainAxisAlignment.center,
                                    children: [
                                      if (_isChecking) ...[
                                        const SizedBox(
                                          width: 16,
                                          height: 16,
                                          child: CircularProgressIndicator(
                                            strokeWidth: 2,
                                            color: Colors.black,
                                          ),
                                        ),
                                        const SizedBox(width: 8),
                                      ] else ...[
                                        const Icon(
                                          LucideIcons.refreshCw,
                                          size: 16,
                                          color: Colors.black,
                                        ),
                                        const SizedBox(width: 8),
                                      ],
                                      Text(
                                        _isChecking
                                            ? 'CHECKING STATUS...'
                                            : 'CHECK ACTIVATION STATUS',
                                        style: WorkshopTheme.brandLogo(
                                          fontSize: 12,
                                          fontWeight: FontWeight.w700,
                                          letterSpacing: 1.1,
                                          color: Colors.black,
                                        ),
                                      ),
                                    ],
                                  ),
                                ),
                                const SizedBox(height: 12),

                                Material(
                                  color: Colors.transparent,
                                  child: InkWell(
                                    onTap: () {
                                      ref
                                          .read(authRepositoryProvider)
                                          .signOut();
                                    },
                                    borderRadius: BorderRadius.circular(12),
                                    child: Container(
                                      padding: const EdgeInsets.symmetric(
                                          horizontal: 20, vertical: 14),
                                      decoration: BoxDecoration(
                                        color: surfaceColor,
                                        borderRadius:
                                            BorderRadius.circular(12),
                                        border: Border.all(
                                          color: borderColor,
                                          width: 1,
                                        ),
                                      ),
                                      child: Row(
                                        mainAxisAlignment:
                                            MainAxisAlignment.center,
                                        children: [
                                          Icon(
                                            LucideIcons.logOut,
                                            size: 16,
                                            color: textMuted,
                                          ),
                                          const SizedBox(width: 8),
                                          Text(
                                            'SIGN OUT',
                                            style: WorkshopTheme.brandLogo(
                                              fontSize: 12,
                                              fontWeight: FontWeight.w700,
                                              letterSpacing: 1.1,
                                              color: textMuted,
                                            ),
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

                        // Spacer placeholder to balance column alignment
                        const SizedBox(height: 16),
                      ],
                    ),
                  ),
                );
              },
            ),
          ),
        ],
      ),
    );
  }
}
