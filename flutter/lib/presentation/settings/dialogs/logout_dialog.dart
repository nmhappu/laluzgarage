import 'package:flutter/material.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import '../../../core/theme/workshop_theme.dart';

class LogoutDialog extends StatefulWidget {
  final Future<void> Function() onConfirm;

  const LogoutDialog({
    super.key,
    required this.onConfirm,
  });

  @override
  State<LogoutDialog> createState() => _LogoutDialogState();
}

class _LogoutDialogState extends State<LogoutDialog> {
  bool _isLoggingOut = false;

  @override
  Widget build(BuildContext context) {
    return Dialog(
      backgroundColor: WorkshopTheme.darkCard,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(16),
        side: const BorderSide(color: WorkshopTheme.darkBorder),
      ),
      insetPadding: const EdgeInsets.symmetric(horizontal: 24, vertical: 24),
      child: Container(
        constraints: const BoxConstraints(maxWidth: 380),
        padding: const EdgeInsets.all(28),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              width: 64,
              height: 64,
              decoration: BoxDecoration(
                color: WorkshopTheme.statusUrgent.withValues(alpha: 0.1),
                shape: BoxShape.circle,
                border: Border.all(
                  color: WorkshopTheme.statusUrgent.withValues(alpha: 0.2),
                ),
              ),
              child: const Icon(
                LucideIcons.alertTriangle,
                color: WorkshopTheme.statusUrgent,
                size: 30,
              ),
            ),
            const SizedBox(height: 20),
            const Text(
              'END SESSION?',
              style: TextStyle(
                fontSize: 18,
                fontWeight: FontWeight.w900,
                color: WorkshopTheme.darkTextPrimary,
                letterSpacing: 0.5,
              ),
            ),
            const SizedBox(height: 10),
            const Text(
              'Are you sure you want to log out? You will need to sign in again to access the workshop dashboard.',
              textAlign: TextAlign.center,
              style: TextStyle(
                fontSize: 13,
                color: WorkshopTheme.darkTextMuted,
                height: 1.45,
              ),
            ),
            const SizedBox(height: 28),
            Row(
              children: [
                Expanded(
                  child: OutlinedButton(
                    onPressed: _isLoggingOut ? null : () => Navigator.of(context).pop(),
                    style: OutlinedButton.styleFrom(
                      foregroundColor: WorkshopTheme.darkTextMuted,
                      side: const BorderSide(color: WorkshopTheme.darkBorder),
                      padding: const EdgeInsets.symmetric(vertical: 14),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(12),
                      ),
                    ),
                    child: const Text(
                      'CANCEL',
                      style: TextStyle(
                        fontSize: 12,
                        fontWeight: FontWeight.w800,
                        letterSpacing: 1.0,
                      ),
                    ),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: FilledButton(
                    onPressed: _isLoggingOut
                        ? null
                        : () async {
                            setState(() => _isLoggingOut = true);
                            final navigator = Navigator.of(context);
                            try {
                              await widget.onConfirm();
                              if (mounted) {
                                navigator.pop();
                              }
                            } finally {
                              if (mounted) setState(() => _isLoggingOut = false);
                            }
                          },
                    style: FilledButton.styleFrom(
                      backgroundColor: WorkshopTheme.statusUrgent,
                      foregroundColor: Colors.white,
                      padding: const EdgeInsets.symmetric(vertical: 14),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(12),
                      ),
                      elevation: 4,
                      shadowColor: WorkshopTheme.statusUrgent.withValues(alpha: 0.3),
                    ),
                    child: _isLoggingOut
                        ? const SizedBox(
                            width: 16,
                            height: 16,
                            child: CircularProgressIndicator(
                              strokeWidth: 2,
                              color: Colors.white,
                            ),
                          )
                        : const Text(
                            'LOG OUT',
                            style: TextStyle(
                              fontSize: 12,
                              fontWeight: FontWeight.w800,
                              letterSpacing: 1.0,
                            ),
                          ),
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}
