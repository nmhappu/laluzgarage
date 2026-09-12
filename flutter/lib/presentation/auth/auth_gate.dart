import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:google_fonts/google_fonts.dart';
import '../../core/theme/workshop_theme.dart';
import '../../data/repositories/firebase_providers.dart';
import '../common/canvas_dot_grid.dart';
import '../common/laluz_logo.dart';
import '../shell/app_shell.dart';
import 'login_screen.dart';
import 'pending_approval_screen.dart';

class AuthGate extends ConsumerStatefulWidget {
  const AuthGate({super.key});

  @override
  ConsumerState<AuthGate> createState() => _AuthGateState();
}

class _AuthGateState extends ConsumerState<AuthGate> {
  final _navKey = GlobalKey<NavigatorState>();
  bool _splashComplete = false;
  String _currentRouteName = 'splash';

  void _navigateTo(String routeName, Widget Function() pageBuilder, {bool isHeroTransition = false}) {
    if (_currentRouteName == routeName) return;
    _currentRouteName = routeName;

    _navKey.currentState?.pushAndRemoveUntil(
      PageRouteBuilder(
        settings: RouteSettings(name: routeName),
        transitionDuration: Duration(milliseconds: isHeroTransition ? 450 : 300),
        reverseTransitionDuration: const Duration(milliseconds: 300),
        pageBuilder: (context, anim, secAnim) => pageBuilder(),
        transitionsBuilder: (context, anim, secAnim, child) {
          final curved = CurvedAnimation(
            parent: anim,
            curve: const Cubic(0.2, 0.0, 0.0, 1.0),
          );
          return FadeTransition(
            opacity: curved,
            child: SlideTransition(
              position: Tween<Offset>(
                begin: isHeroTransition ? const Offset(0.0, 0.03) : Offset.zero,
                end: Offset.zero,
              ).animate(curved),
              child: child,
            ),
          );
        },
      ),
      (route) => false,
    );
  }

  void _handleAuthStateChange({bool isInitial = false}) {
    if (!_splashComplete) return;

    final authState = ref.read(currentUserProvider);
    final user = authState.value;

    if (user == null) {
      _navigateTo('login', () => const LoginScreen(), isHeroTransition: isInitial);
    } else {
      final profile = ref.read(currentUserProfileProvider).value;
      if (profile == null) {
        // Profile is still loading; listener will trigger once profile arrives
        return;
      }
      final role = profile.effectiveRole;
      if (role == null) {
        _navigateTo('pending', () => const PendingApprovalScreen());
      } else {
        _navigateTo('app', () => const AppShell());
      }
    }
  }

  void _onSplashReady() {
    _splashComplete = true;
    _handleAuthStateChange(isInitial: true);
  }

  @override
  Widget build(BuildContext context) {
    ref.listen(currentUserProvider, (prev, next) {
      if (_splashComplete) {
        _handleAuthStateChange();
      }
    });

    ref.listen(currentUserProfileProvider, (prev, next) {
      if (_splashComplete) {
        _handleAuthStateChange();
      }
    });

    return Navigator(
      key: _navKey,
      onGenerateRoute: (settings) {
        return MaterialPageRoute(
          settings: const RouteSettings(name: 'splash'),
          builder: (_) => SplashScreen(onSplashReady: _onSplashReady),
        );
      },
    );
  }
}

class SplashScreen extends ConsumerStatefulWidget {
  final VoidCallback onSplashReady;

  const SplashScreen({super.key, required this.onSplashReady});

  @override
  ConsumerState<SplashScreen> createState() => _SplashScreenState();
}

class _SplashScreenState extends ConsumerState<SplashScreen>
    with SingleTickerProviderStateMixin {
  late AnimationController _animController;
  late Animation<double> _fadeAnim;
  late Animation<double> _scaleAnim;
  Timer? _minTimer;
  bool _timerDone = false;

  @override
  void initState() {
    super.initState();
    _animController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 700),
    );
    _fadeAnim = CurvedAnimation(
      parent: _animController,
      curve: Curves.easeOut,
    );
    _scaleAnim = Tween<double>(begin: 0.94, end: 1.0).animate(
      CurvedAnimation(
        parent: _animController,
        curve: const Cubic(0.2, 0.0, 0.0, 1.0),
      ),
    );

    _animController.forward();

    // Minimum display time of 1200ms ensures smooth visual transition
    _minTimer = Timer(const Duration(milliseconds: 1200), () {
      if (mounted) {
        setState(() => _timerDone = true);
        _checkIfReady();
      }
    });
  }

  @override
  void dispose() {
    _animController.dispose();
    _minTimer?.cancel();
    super.dispose();
  }

  void _checkIfReady() {
    if (!_timerDone) return;
    final authState = ref.read(currentUserProvider);
    if (authState.hasValue || authState.hasError) {
      widget.onSplashReady();
    }
  }

  @override
  Widget build(BuildContext context) {
    ref.listen(currentUserProvider, (_, next) {
      if (next.hasValue || next.hasError) {
        _checkIfReady();
      }
    });

    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;
    final textMuted =
        isDark ? WorkshopTheme.darkTextMuted : WorkshopTheme.lightTextMuted;
    final textPrimary =
        isDark ? WorkshopTheme.darkTextPrimary : WorkshopTheme.lightTextPrimary;

    return Scaffold(
      backgroundColor: theme.scaffoldBackgroundColor,
      body: Stack(
        alignment: Alignment.center,
        children: [
          // Precision Canvas Dot Grid Background
          const Positioned.fill(
            child: CanvasDotGrid(),
          ),

          // Ambient Pulsing Aura
          Container(
            width: 280,
            height: 280,
            decoration: BoxDecoration(
              shape: BoxShape.circle,
              gradient: RadialGradient(
                colors: [
                  WorkshopTheme.emeraldAccent.withValues(alpha: 0.15),
                  Colors.transparent,
                ],
              ),
            ),
          ),

          // Centered Brand Unit
          Center(
            child: FadeTransition(
              opacity: _fadeAnim,
              child: ScaleTransition(
                scale: _scaleAnim,
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    const LaluzLogo(size: 96),
                    const SizedBox(height: 24),
                    Text(
                      'LaluZ Garage',
                      style: GoogleFonts.googleSans(
                        fontSize: 18,
                        fontWeight: FontWeight.w700,
                        letterSpacing: -0.3,
                        color: textPrimary,
                      ),
                    ),
                    const SizedBox(height: 12),
                    const SizedBox(
                      width: 24,
                      height: 24,
                      child: CircularProgressIndicator(
                        strokeWidth: 2.5,
                        color: WorkshopTheme.emeraldAccent,
                      ),
                    ),
                    const SizedBox(height: 12),
                    Text(
                      'WAKING UP WORKSHOP SYSTEMS...',
                      style: GoogleFonts.googleSans(
                        fontSize: 11,
                        fontWeight: FontWeight.w700,
                        letterSpacing: 1.2,
                        color: textMuted.withValues(alpha: 0.7),
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
}
