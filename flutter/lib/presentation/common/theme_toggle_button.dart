import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import '../../core/theme/workshop_theme.dart';

/// Replicates the ThemeToggle button from the React build:
/// 40x40 rounded-xl button with border, switching between Moon and Sun
/// icons in emerald accent color.
class ThemeToggleButton extends ConsumerWidget {
  const ThemeToggleButton({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final themeMode = ref.watch(themeModeProvider);
    final isDark = themeMode == ThemeMode.dark;

    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: () {
          ref.read(themeModeProvider.notifier).toggle();
        },
        borderRadius: BorderRadius.circular(12),
        child: Container(
          width: 40,
          height: 40,
          decoration: BoxDecoration(
            color: isDark
                ? WorkshopTheme.darkSurface.withValues(alpha: 0.8)
                : WorkshopTheme.lightSurface,
            borderRadius: BorderRadius.circular(12),
            border: Border.all(
              color: isDark
                  ? WorkshopTheme.darkBorder
                  : WorkshopTheme.lightBorder,
              width: 1,
            ),
          ),
          child: Center(
            child: AnimatedSwitcher(
              duration: const Duration(milliseconds: 350),
              transitionBuilder: (child, anim) => RotationTransition(
                turns: Tween<double>(begin: 0.75, end: 1.0).animate(anim),
                child: FadeTransition(opacity: anim, child: child),
              ),
              child: isDark
                  ? const Icon(
                      LucideIcons.moon,
                      key: ValueKey('moon'),
                      size: 20,
                      color: WorkshopTheme.emeraldAccent,
                    )
                  : const Icon(
                      LucideIcons.sun,
                      key: ValueKey('sun'),
                      size: 20,
                      color: WorkshopTheme.emeraldAccent,
                    ),
            ),
          ),
        ),
      ),
    );
  }
}
