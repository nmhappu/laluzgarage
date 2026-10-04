import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:google_fonts/google_fonts.dart';

final themeModeProvider =
    NotifierProvider<ThemeModeNotifier, ThemeMode>(ThemeModeNotifier.new);

class ThemeModeNotifier extends Notifier<ThemeMode> {
  @override
  ThemeMode build() => ThemeMode.dark;

  void toggle() {
    state = state == ThemeMode.dark ? ThemeMode.light : ThemeMode.dark;
  }

  void setMode(ThemeMode mode) {
    state = mode;
  }
}

class WorkshopTheme {
  // Brand Color Tokens
  static const Color darkCanvas = Color(0xFF07080A);
  static const Color darkCard = Color(0xFF0D1117);
  static const Color darkSurface = Color(0xFF161B22);
  static const Color darkBorder = Color(0xFF1E232E);
  static const Color darkBorderSubtle = Color(0x331E232E);

  static const Color lightCanvas = Color(0xFFFFFFFF);
  static const Color lightCard = Color(0xFFFFFFFF);
  static const Color lightSurface = Color(0xFFF8FAFC);
  static const Color lightBorder = Color(0xFFE2E8F0);
  static const Color lightBorderSubtle = Color(0x33E2E8F0);

  // Semantic Accents
  static const Color emeraldAccent = Color(0xFF10B981);
  static const Color kineticBolt = Color(0xFF78DF22);
  static const Color blueAccent = Color(0xFF3B82F6);
  static const Color statusUrgent = Color(0xFFF43F5E);
  static const Color statusPending = Color(0xFFFBBF24);
  static const Color statusSuccess = Color(0xFF10B981);

  // Dark Typography Colors
  static const Color darkTextPrimary = Color(0xFFF8FAFC);
  static const Color darkTextMuted = Color(0xFF94A3B8);

  // Light Typography Colors
  static const Color lightTextPrimary = Color(0xFF0F172A);
  static const Color lightTextMuted = Color(0xFF64748B);

  static const pageTransitionsTheme = PageTransitionsTheme(
    builders: {
      TargetPlatform.android: WorkshopPageTransitionsBuilder(),
      TargetPlatform.iOS: WorkshopPageTransitionsBuilder(),
      TargetPlatform.windows: WorkshopPageTransitionsBuilder(),
      TargetPlatform.macOS: WorkshopPageTransitionsBuilder(),
      TargetPlatform.linux: WorkshopPageTransitionsBuilder(),
    },
  );

  static ThemeData get darkTheme {
    return ThemeData(
      useMaterial3: true,
      brightness: Brightness.dark,
      scaffoldBackgroundColor: darkCanvas,
      canvasColor: darkCanvas,
      cardColor: darkCard,
      dividerColor: darkBorder,
      fontFamily: GoogleFonts.googleSans().fontFamily,
      pageTransitionsTheme: pageTransitionsTheme,
      colorScheme: const ColorScheme.dark(
        primary: emeraldAccent,
        secondary: blueAccent,
        surface: darkSurface,
        surfaceContainerHighest: darkCard,
        error: statusUrgent,
        onSurface: darkTextPrimary,
        outline: darkBorder,
      ),
      appBarTheme: const AppBarTheme(
        backgroundColor: darkCanvas,
        surfaceTintColor: Colors.transparent,
        elevation: 0,
        systemOverlayStyle: SystemUiOverlayStyle(
          statusBarColor: Colors.transparent,
          statusBarIconBrightness: Brightness.light,
          systemStatusBarContrastEnforced: false,
          systemNavigationBarColor: Colors.transparent,
          systemNavigationBarDividerColor: Colors.transparent,
          systemNavigationBarIconBrightness: Brightness.light,
          systemNavigationBarContrastEnforced: false,
        ),
      ),
      bottomNavigationBarTheme: const BottomNavigationBarThemeData(
        backgroundColor: Colors.transparent,
        elevation: 0,
      ),
      textTheme: TextTheme(
        headlineLarge: GoogleFonts.googleSans(
          color: darkTextPrimary,
          fontSize: 28,
          fontWeight: FontWeight.w800,
          letterSpacing: -0.5,
        ),
        headlineMedium: GoogleFonts.googleSans(
          color: darkTextPrimary,
          fontSize: 22,
          fontWeight: FontWeight.w700,
          letterSpacing: -0.5,
        ),
        titleLarge: GoogleFonts.googleSans(
          color: darkTextPrimary,
          fontSize: 18,
          fontWeight: FontWeight.w700,
        ),
        titleMedium: GoogleFonts.googleSans(
          color: darkTextPrimary,
          fontSize: 15,
          fontWeight: FontWeight.w600,
        ),
        bodyLarge: GoogleFonts.googleSans(
          color: darkTextPrimary,
          fontSize: 14,
        ),
        bodyMedium: GoogleFonts.googleSans(
          color: darkTextMuted,
          fontSize: 13,
        ),
        labelLarge: GoogleFonts.googleSans(
          color: darkTextPrimary,
          fontSize: 12,
          fontWeight: FontWeight.w700,
          letterSpacing: 1.2,
        ),
      ),
    );
  }

  static ThemeData get lightTheme {
    return ThemeData(
      useMaterial3: true,
      brightness: Brightness.light,
      scaffoldBackgroundColor: lightCanvas,
      canvasColor: lightCanvas,
      cardColor: lightCard,
      dividerColor: lightBorder,
      fontFamily: GoogleFonts.googleSans().fontFamily,
      pageTransitionsTheme: pageTransitionsTheme,
      colorScheme: const ColorScheme.light(
        primary: emeraldAccent,
        secondary: blueAccent,
        surface: lightSurface,
        surfaceContainerHighest: lightCard,
        error: statusUrgent,
        onSurface: lightTextPrimary,
        outline: lightBorder,
      ),
      appBarTheme: const AppBarTheme(
        backgroundColor: lightCanvas,
        surfaceTintColor: Colors.transparent,
        elevation: 0,
        systemOverlayStyle: SystemUiOverlayStyle(
          statusBarColor: Colors.transparent,
          statusBarIconBrightness: Brightness.dark,
          systemStatusBarContrastEnforced: false,
          systemNavigationBarColor: Colors.transparent,
          systemNavigationBarDividerColor: Colors.transparent,
          systemNavigationBarIconBrightness: Brightness.dark,
          systemNavigationBarContrastEnforced: false,
        ),
      ),
      bottomNavigationBarTheme: const BottomNavigationBarThemeData(
        backgroundColor: Colors.transparent,
        elevation: 0,
      ),
      textTheme: TextTheme(
        headlineLarge: GoogleFonts.googleSans(
          color: lightTextPrimary,
          fontSize: 28,
          fontWeight: FontWeight.w800,
          letterSpacing: -0.5,
        ),
        headlineMedium: GoogleFonts.googleSans(
          color: lightTextPrimary,
          fontSize: 22,
          fontWeight: FontWeight.w700,
          letterSpacing: -0.5,
        ),
        titleLarge: GoogleFonts.googleSans(
          color: lightTextPrimary,
          fontSize: 18,
          fontWeight: FontWeight.w700,
        ),
        titleMedium: GoogleFonts.googleSans(
          color: lightTextPrimary,
          fontSize: 15,
          fontWeight: FontWeight.w600,
        ),
        bodyLarge: GoogleFonts.googleSans(
          color: lightTextPrimary,
          fontSize: 14,
        ),
        bodyMedium: GoogleFonts.googleSans(
          color: lightTextMuted,
          fontSize: 13,
        ),
        labelLarge: GoogleFonts.googleSans(
          color: lightTextPrimary,
          fontSize: 12,
          fontWeight: FontWeight.w700,
          letterSpacing: 1.2,
        ),
      ),
    );
  }

  static TextStyle brandLogo({
    double fontSize = 16,
    FontWeight fontWeight = FontWeight.w700,
    Color? color,
    double? letterSpacing = -0.3,
  }) {
    return GoogleFonts.googleSans(
      fontSize: fontSize,
      fontWeight: fontWeight,
      color: color,
      letterSpacing: letterSpacing,
    );
  }

  static TextStyle numeric({
    double fontSize = 16,
    FontWeight fontWeight = FontWeight.w700,
    Color color = darkTextPrimary,
    double? letterSpacing,
  }) {
    return GoogleFonts.plusJakartaSans(
      fontSize: fontSize,
      fontWeight: fontWeight,
      color: color,
      letterSpacing: letterSpacing,
      fontFeatures: const [FontFeature.tabularFigures()],
    );
  }

  static TextStyle mono({
    double fontSize = 13,
    FontWeight fontWeight = FontWeight.w500,
    Color color = darkTextPrimary,
    double? letterSpacing,
  }) {
    return GoogleFonts.jetBrainsMono(
      fontSize: fontSize,
      fontWeight: fontWeight,
      color: color,
      letterSpacing: letterSpacing,
    );
  }

  static TextStyle plateNumber({
    double fontSize = 13,
    FontWeight fontWeight = FontWeight.w900,
    Color color = blueAccent,
    double? letterSpacing = 1.0,
  }) {
    return GoogleFonts.googleSans(
      fontSize: fontSize,
      fontWeight: fontWeight,
      color: color,
      letterSpacing: letterSpacing,
    );
  }
}

class WorkshopPageTransitionsBuilder extends PageTransitionsBuilder {
  const WorkshopPageTransitionsBuilder();

  @override
  Widget buildTransitions<T>(
    PageRoute<T> route,
    BuildContext context,
    Animation<double> animation,
    Animation<double> secondaryAnimation,
    Widget child,
  ) {
    final curvedAnimation = CurvedAnimation(
      parent: animation,
      curve: const Cubic(0.2, 0.0, 0.0, 1.0),
      reverseCurve: const Cubic(0.2, 0.0, 0.0, 1.0),
    );

    return FadeTransition(
      opacity: curvedAnimation,
      child: SlideTransition(
        position: Tween<Offset>(
          begin: const Offset(0.0, 0.035),
          end: Offset.zero,
        ).animate(curvedAnimation),
        child: child,
      ),
    );
  }
}

