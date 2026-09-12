import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_svg/flutter_svg.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import 'package:url_launcher/url_launcher_string.dart';
import '../../core/theme/workshop_theme.dart';
import '../../data/repositories/firebase_providers.dart';
import '../common/brand_icons.dart';
import '../common/canvas_dot_grid.dart';
import '../common/laluz_logo.dart';
import '../common/theme_toggle_button.dart';

enum AuthMethod { idle, email }

/// Replicates the exact LoginPage from the React build:
/// - Canvas dot grid background with radial glow
/// - Header with brand title & ThemeToggleButton
/// - Official geometric LaluzLogo emblem
/// - Two modes: 'idle' (Google / Mail selection) and 'email' (credentials form)
/// - Intercepted back navigation returning to idle state
/// - Footer with Prince Santhosh & GitHub license links
class LoginScreen extends ConsumerStatefulWidget {
  const LoginScreen({super.key});

  @override
  ConsumerState<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends ConsumerState<LoginScreen> {
  AuthMethod _authMethod = AuthMethod.idle;
  final _emailController = TextEditingController();
  final _passwordController = TextEditingController();
  final _emailFocusNode = FocusNode();

  bool _obscurePassword = true;
  bool _isLoading = false;
  bool _googleLoading = false;
  String? _error;

  @override
  void dispose() {
    _emailController.dispose();
    _passwordController.dispose();
    _emailFocusNode.dispose();
    super.dispose();
  }

  void _switchAuthMethod(AuthMethod method) {
    setState(() {
      _authMethod = method;
      _error = null;
    });

    if (method == AuthMethod.email) {
      Future.delayed(const Duration(milliseconds: 150), () {
        if (mounted) {
          _emailFocusNode.requestFocus();
        }
      });
    }
  }

  Future<void> _handleGoogleSignIn() async {
    setState(() {
      _googleLoading = true;
      _error = null;
    });

    try {
      final authRepo = ref.read(authRepositoryProvider);
      final cred = await authRepo.signInWithGoogle();
      if (cred == null) {
        // User cancelled popup/intent
        return;
      }
    } catch (e) {
      final msg = e.toString().toLowerCase();
      if (msg.contains('popup-closed') ||
          msg.contains('cancelled') ||
          msg.contains('canceled') ||
          msg.contains('12501')) {
        return;
      }
      if (msg.contains('popup-blocked')) {
        setState(() => _error =
            'Popup was blocked by your browser. Please allow popups or try again.');
        return;
      }
      if (msg.contains('unauthorized-domain')) {
        setState(() => _error =
            'Domain is not authorized for Google Sign-In in Firebase Console.');
        return;
      }
      if (msg.contains('account-exists-with-different-credential')) {
        setState(() => _error =
            'An account already exists with this email using another sign-in method.');
        return;
      }

      setState(() {
        _error = e.toString().replaceAll(RegExp(r'\[.*?\]'), '').trim();
        if (_error!.isEmpty) {
          _error = 'Google authentication failed. Please try again.';
        }
      });
    } finally {
      if (mounted) {
        setState(() => _googleLoading = false);
      }
    }
  }

  Future<void> _handleEmailSignIn() async {
    final email = _emailController.text.trim();
    final password = _passwordController.text.trim();

    if (email.isEmpty || password.isEmpty) {
      setState(() => _error = 'Please enter both email and password.');
      return;
    }

    setState(() {
      _isLoading = true;
      _error = null;
    });

    try {
      final authRepo = ref.read(authRepositoryProvider);
      await authRepo.signInWithEmail(email, password);
    } catch (e) {
      final msg = e.toString().toLowerCase();
      if (msg.contains('user-not-found') ||
          msg.contains('wrong-password') ||
          msg.contains('invalid-credential')) {
        setState(() => _error =
            'Invalid credentials. Please verify your email and password.');
      } else if (msg.contains('too-many-requests')) {
        setState(() => _error =
            'Too many failed attempts. Please try again later.');
      } else {
        setState(() {
          final cleaned =
              e.toString().replaceAll(RegExp(r'\[.*?\]'), '').trim();
          _error = cleaned.isNotEmpty
              ? cleaned
              : 'Authentication failed. Check your data and try again.';
        });
      }
    } finally {
      if (mounted) {
        setState(() => _isLoading = false);
      }
    }
  }

  Future<void> _openUrl(String url) async {
    try {
      await launchUrlString(url, mode: LaunchMode.externalApplication);
    } catch (_) {}
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

    return PopScope(
      canPop: _authMethod == AuthMethod.idle,
      onPopInvokedWithResult: (didPop, _) {
        if (!didPop && _authMethod == AuthMethod.email) {
          _switchAuthMethod(AuthMethod.idle);
        }
      },
      child: Scaffold(
        backgroundColor: theme.scaffoldBackgroundColor,
        body: Stack(
          children: [
            // Precision Canvas Dot Grid Background
            const Positioned.fill(
              child: CanvasDotGrid(),
            ),

            // Ambient Background Glow (Emerald Accent, 500x500)
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
                        WorkshopTheme.emeraldAccent.withValues(alpha: 0.05),
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
                          // 1. Top Header
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
                                  // Brand Emblem with Subtle Glow
                                  Stack(
                                    alignment: Alignment.center,
                                    children: [
                                      Container(
                                        width: 96,
                                        height: 50,
                                        decoration: BoxDecoration(
                                          shape: BoxShape.circle,
                                          boxShadow: [
                                            BoxShadow(
                                              color: WorkshopTheme.emeraldAccent
                                                  .withValues(alpha: 0.15),
                                              blurRadius: 32,
                                              spreadRadius: 8,
                                            ),
                                          ],
                                        ),
                                      ),
                                      const LaluzLogo(size: 96),
                                    ],
                                  ),
                                  const SizedBox(height: 24),

                                  // Heading & Subtitles
                                  Text(
                                    'Welcome to LaluZ Garage',
                                    style: WorkshopTheme.brandLogo(
                                      fontSize: 26,
                                      fontWeight: FontWeight.w700,
                                      color: textPrimary,
                                      letterSpacing: -0.5,
                                    ),
                                  ),
                                  const SizedBox(height: 8),
                                  Text(
                                    'Sign in to manage vehicle records and inventory.',
                                    style: TextStyle(
                                      color: textMuted,
                                      fontSize: 13.5,
                                      height: 1.4,
                                    ),
                                  ),
                                  Text(
                                    'Internal use only.',
                                    style: TextStyle(
                                      color: textMuted,
                                      fontSize: 13.5,
                                      height: 1.4,
                                    ),
                                  ),
                                  const SizedBox(height: 24),

                                  // Interactive Actions Area (Idle vs Email Mode)
                                  AnimatedSwitcher(
                                    duration:
                                        const Duration(milliseconds: 200),
                                    transitionBuilder: (child, anim) {
                                      return FadeTransition(
                                        opacity: anim,
                                        child: SlideTransition(
                                          position: Tween<Offset>(
                                            begin: const Offset(0, 0.04),
                                            end: Offset.zero,
                                          ).animate(anim),
                                          child: child,
                                        ),
                                      );
                                    },
                                    child: _authMethod == AuthMethod.idle
                                        ? _buildIdleView(
                                            context,
                                            isDark,
                                            textPrimary,
                                            textMuted,
                                            borderColor,
                                            surfaceColor,
                                          )
                                        : _buildEmailView(
                                            context,
                                            isDark,
                                            textPrimary,
                                            textMuted,
                                            borderColor,
                                            surfaceColor,
                                          ),
                                  ),
                                ],
                              ),
                            ),
                          ),

                          // 3. Footer / Bottom Left & Right Info
                          ConstrainedBox(
                            constraints: const BoxConstraints(maxWidth: 448),
                            child: Padding(
                              padding: const EdgeInsets.only(top: 8),
                              child: Row(
                                mainAxisAlignment:
                                    MainAxisAlignment.spaceBetween,
                                children: [
                                  // Left: Created with heart by Prince Santhosh
                                  InkWell(
                                    onTap: () => _openUrl('https://appu.dev'),
                                    borderRadius: BorderRadius.circular(4),
                                    child: Padding(
                                      padding: const EdgeInsets.symmetric(
                                          vertical: 4),
                                      child: Row(
                                        mainAxisSize: MainAxisSize.min,
                                        children: [
                                          Text(
                                            'Created with ',
                                            style: TextStyle(
                                              fontSize: 11.5,
                                              color: textMuted
                                                  .withValues(alpha: 0.8),
                                            ),
                                          ),
                                          const Icon(
                                            LucideIcons.heart,
                                            size: 13,
                                            color: Color(0xFFF43F5E),
                                          ),
                                          Text(
                                            ' by ',
                                            style: TextStyle(
                                              fontSize: 11.5,
                                              color: textMuted
                                                  .withValues(alpha: 0.8),
                                            ),
                                          ),
                                          Text(
                                            'Prince Santhosh',
                                            style: TextStyle(
                                              fontSize: 11.5,
                                              fontWeight: FontWeight.w600,
                                              color: textPrimary,
                                              decoration:
                                                  TextDecoration.underline,
                                            ),
                                          ),
                                        ],
                                      ),
                                    ),
                                  ),

                                  // Right: © 2026 LaluZ Garage · License
                                  InkWell(
                                    onTap: () => _openUrl(
                                        'https://github.com/nmhappu/laluzgarage/blob/main/LICENSE.md'),
                                    borderRadius: BorderRadius.circular(4),
                                    child: Padding(
                                      padding: const EdgeInsets.symmetric(
                                          vertical: 4),
                                      child: Row(
                                        mainAxisSize: MainAxisSize.min,
                                        children: [
                                          Text(
                                            '© 2026 LaluZ Garage',
                                            style: TextStyle(
                                              fontSize: 11.5,
                                              color: textMuted
                                                  .withValues(alpha: 0.8),
                                            ),
                                          ),
                                          Text(
                                            ' · ',
                                            style: TextStyle(
                                              fontSize: 11.5,
                                              color: textMuted
                                                  .withValues(alpha: 0.4),
                                            ),
                                          ),
                                          Text(
                                            'License',
                                            style: TextStyle(
                                              fontSize: 11.5,
                                              color: textMuted,
                                              decoration:
                                                  TextDecoration.underline,
                                            ),
                                          ),
                                        ],
                                      ),
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),
                  );
                },
              ),
            ),
          ],
        ),
      ),
    );
  }

  // ---------------------------------------------------------------------------
  // IDLE VIEW: Continue with Google & Continue with mail
  // ---------------------------------------------------------------------------
  Widget _buildIdleView(
    BuildContext context,
    bool isDark,
    Color textPrimary,
    Color textMuted,
    Color borderColor,
    Color surfaceColor,
  ) {
    return KeyedSubtree(
      key: const ValueKey('idle-view'),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          // Google Sign In
          Material(
            color: Colors.transparent,
            child: InkWell(
              onTap: (_googleLoading || _isLoading) ? null : _handleGoogleSignIn,
              borderRadius: BorderRadius.circular(12),
              child: Container(
                padding: const EdgeInsets.symmetric(
                    horizontal: 20, vertical: 14),
                decoration: BoxDecoration(
                  color: surfaceColor,
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: borderColor, width: 1),
                ),
                child: Row(
                  children: [
                    if (_googleLoading)
                      const SizedBox(
                        width: 16,
                        height: 16,
                        child: CircularProgressIndicator(
                          strokeWidth: 2,
                          color: WorkshopTheme.emeraldAccent,
                        ),
                      )
                    else
                      SvgPicture.string(
                        BrandIcons.googleSvg,
                        width: 16,
                        height: 16,
                      ),
                    const SizedBox(width: 12),
                    Text(
                      _googleLoading
                          ? 'CONNECTING...'
                          : 'CONTINUE WITH GOOGLE',
                      style: WorkshopTheme.brandLogo(
                        fontSize: 12,
                        fontWeight: FontWeight.w600,
                        letterSpacing: 1.1,
                        color: textPrimary,
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),
          const SizedBox(height: 12),

          // Continue with Mail Button
          Material(
            color: Colors.transparent,
            child: InkWell(
              onTap: () => _switchAuthMethod(AuthMethod.email),
              borderRadius: BorderRadius.circular(12),
              child: Container(
                padding: const EdgeInsets.symmetric(
                    horizontal: 20, vertical: 14),
                decoration: BoxDecoration(
                  color: surfaceColor,
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: borderColor, width: 1),
                ),
                child: Row(
                  children: [
                    const Icon(
                      LucideIcons.mail,
                      size: 16,
                      color: WorkshopTheme.emeraldAccent,
                    ),
                    const SizedBox(width: 12),
                    Text(
                      'CONTINUE WITH MAIL',
                      style: WorkshopTheme.brandLogo(
                        fontSize: 12,
                        fontWeight: FontWeight.w600,
                        letterSpacing: 1.1,
                        color: textPrimary,
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),

          // Error Alert Banner
          if (_error != null) ...[
            const SizedBox(height: 14),
            _buildErrorBanner(_error!),
          ],
        ],
      ),
    );
  }

  // ---------------------------------------------------------------------------
  // EMAIL VIEW: Credentials Form & Sign In Action
  // ---------------------------------------------------------------------------
  Widget _buildEmailView(
    BuildContext context,
    bool isDark,
    Color textPrimary,
    Color textMuted,
    Color borderColor,
    Color surfaceColor,
  ) {
    return KeyedSubtree(
      key: const ValueKey('email-view'),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          // Email Address Field
          Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Padding(
                padding: const EdgeInsets.only(left: 2, bottom: 6),
                child: Text(
                  'Email address',
                  style: TextStyle(
                    fontSize: 12,
                    fontWeight: FontWeight.w600,
                    color: textMuted,
                  ),
                ),
              ),
              TextField(
                controller: _emailController,
                focusNode: _emailFocusNode,
                keyboardType: TextInputType.emailAddress,
                style: TextStyle(
                  color: textPrimary,
                  fontSize: 14,
                  fontWeight: FontWeight.w500,
                ),
                decoration: InputDecoration(
                  hintText: 'technician@laluzgarage.com',
                  hintStyle: TextStyle(
                    color: textMuted.withValues(alpha: 0.4),
                    fontSize: 14,
                  ),
                  prefixIcon: Icon(
                    LucideIcons.mail,
                    size: 16,
                    color: textMuted,
                  ),
                  filled: true,
                  fillColor: surfaceColor,
                  contentPadding: const EdgeInsets.symmetric(
                    horizontal: 16,
                    vertical: 14,
                  ),
                  border: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(12),
                    borderSide: BorderSide(color: borderColor),
                  ),
                  enabledBorder: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(12),
                    borderSide: BorderSide(color: borderColor),
                  ),
                  focusedBorder: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(12),
                    borderSide: BorderSide(
                      color: WorkshopTheme.emeraldAccent.withValues(alpha: 0.6),
                      width: 1.5,
                    ),
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 14),

          // Password Field
          Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Padding(
                padding: const EdgeInsets.only(left: 2, bottom: 6),
                child: Text(
                  'Password',
                  style: TextStyle(
                    fontSize: 12,
                    fontWeight: FontWeight.w600,
                    color: textMuted,
                  ),
                ),
              ),
              TextField(
                controller: _passwordController,
                obscureText: _obscurePassword,
                style: TextStyle(
                  color: textPrimary,
                  fontSize: 14,
                  fontWeight: FontWeight.w500,
                ),
                decoration: InputDecoration(
                  hintText: '••••••••••••',
                  hintStyle: TextStyle(
                    color: textMuted.withValues(alpha: 0.4),
                    fontSize: 14,
                  ),
                  prefixIcon: Icon(
                    LucideIcons.lock,
                    size: 16,
                    color: textMuted,
                  ),
                  suffixIcon: IconButton(
                    icon: Icon(
                      _obscurePassword
                          ? LucideIcons.eye
                          : LucideIcons.eyeOff,
                      size: 16,
                      color: textMuted,
                    ),
                    onPressed: () {
                      setState(() => _obscurePassword = !_obscurePassword);
                    },
                  ),
                  filled: true,
                  fillColor: surfaceColor,
                  contentPadding: const EdgeInsets.symmetric(
                    horizontal: 16,
                    vertical: 14,
                  ),
                  border: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(12),
                    borderSide: BorderSide(color: borderColor),
                  ),
                  enabledBorder: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(12),
                    borderSide: BorderSide(color: borderColor),
                  ),
                  focusedBorder: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(12),
                    borderSide: BorderSide(
                      color: WorkshopTheme.emeraldAccent.withValues(alpha: 0.6),
                      width: 1.5,
                    ),
                  ),
                ),
                onSubmitted: (_) => _handleEmailSignIn(),
              ),
            ],
          ),

          // Error Alert Banner
          if (_error != null) ...[
            const SizedBox(height: 14),
            _buildErrorBanner(_error!),
          ],

          const SizedBox(height: 20),

          // Sign In CTA Button
          FilledButton(
            onPressed: _isLoading ? null : _handleEmailSignIn,
            style: FilledButton.styleFrom(
              backgroundColor: WorkshopTheme.emeraldAccent,
              foregroundColor: Colors.black,
              padding: const EdgeInsets.symmetric(
                  horizontal: 20, vertical: 14),
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(12),
              ),
              elevation: 2,
            ),
            child: Row(
              children: [
                if (_isLoading) ...[
                  const SizedBox(
                    width: 16,
                    height: 16,
                    child: CircularProgressIndicator(
                      strokeWidth: 2,
                      color: Colors.black,
                    ),
                  ),
                  const SizedBox(width: 12),
                ],
                Text(
                  _isLoading ? 'AUTHENTICATING...' : 'SIGN IN',
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

          // Other Sign-In Options Button (Go Back to Idle)
          Material(
            color: Colors.transparent,
            child: InkWell(
              onTap: () => _switchAuthMethod(AuthMethod.idle),
              borderRadius: BorderRadius.circular(12),
              child: Container(
                padding: const EdgeInsets.symmetric(
                    horizontal: 20, vertical: 14),
                decoration: BoxDecoration(
                  color: surfaceColor,
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: borderColor, width: 1),
                ),
                child: Row(
                  children: [
                    Icon(
                      LucideIcons.arrowLeft,
                      size: 16,
                      color: textMuted,
                    ),
                    const SizedBox(width: 12),
                    Text(
                      'OTHER SIGN-IN OPTIONS',
                      style: WorkshopTheme.brandLogo(
                        fontSize: 12,
                        fontWeight: FontWeight.w600,
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
    );
  }

  // ---------------------------------------------------------------------------
  // ERROR BANNER
  // ---------------------------------------------------------------------------
  Widget _buildErrorBanner(String message) {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: WorkshopTheme.statusUrgent.withValues(alpha: 0.10),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(
          color: WorkshopTheme.statusUrgent.withValues(alpha: 0.25),
        ),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Icon(
            LucideIcons.alertCircle,
            size: 16,
            color: WorkshopTheme.statusUrgent,
          ),
          const SizedBox(width: 10),
          Expanded(
            child: Text(
              message,
              style: const TextStyle(
                color: WorkshopTheme.statusUrgent,
                fontSize: 12,
                fontWeight: FontWeight.w600,
                height: 1.4,
              ),
            ),
          ),
        ],
      ),
    );
  }
}
