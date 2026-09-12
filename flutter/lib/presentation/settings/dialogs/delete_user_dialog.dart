import 'package:flutter/material.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import '../../../core/theme/workshop_theme.dart';

class DeleteUserDialog extends StatefulWidget {
  final String userId;
  final String userName;
  final Future<bool> Function(String id, String name) onConfirm;

  const DeleteUserDialog({
    super.key,
    required this.userId,
    required this.userName,
    required this.onConfirm,
  });

  @override
  State<DeleteUserDialog> createState() => _DeleteUserDialogState();
}

class _DeleteUserDialogState extends State<DeleteUserDialog> {
  bool _isDeleting = false;
  String? _error;

  @override
  Widget build(BuildContext context) {
    return Dialog(
      backgroundColor: WorkshopTheme.darkSurface,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(16),
        side: const BorderSide(color: WorkshopTheme.darkBorder),
      ),
      insetPadding: const EdgeInsets.symmetric(horizontal: 24, vertical: 24),
      child: Container(
        constraints: const BoxConstraints(maxWidth: 380),
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              width: 48,
              height: 48,
              decoration: BoxDecoration(
                color: WorkshopTheme.statusUrgent.withValues(alpha: 0.1),
                shape: BoxShape.circle,
                border: Border.all(
                  color: WorkshopTheme.statusUrgent.withValues(alpha: 0.2),
                ),
              ),
              child: const Icon(
                LucideIcons.trash2,
                color: WorkshopTheme.statusUrgent,
                size: 24,
              ),
            ),
            const SizedBox(height: 16),
            const Text(
              'Delete Advisor?',
              style: TextStyle(
                fontSize: 16,
                fontWeight: FontWeight.w900,
                color: WorkshopTheme.darkTextPrimary,
                letterSpacing: -0.3,
              ),
            ),
            const SizedBox(height: 8),
            RichText(
              textAlign: TextAlign.center,
              text: TextSpan(
                style: const TextStyle(
                  fontSize: 12,
                  color: WorkshopTheme.darkTextMuted,
                  height: 1.5,
                ),
                children: [
                  const TextSpan(text: 'Are you sure you want to permanently delete advisor '),
                  TextSpan(
                    text: '"${widget.userName}"',
                    style: const TextStyle(
                      fontWeight: FontWeight.w700,
                      color: WorkshopTheme.darkTextPrimary,
                    ),
                  ),
                  const TextSpan(text: '? This action cannot be undone.'),
                ],
              ),
            ),
            if (_error != null) ...[
              const SizedBox(height: 12),
              Container(
                width: double.infinity,
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: WorkshopTheme.statusUrgent.withValues(alpha: 0.1),
                  borderRadius: BorderRadius.circular(8),
                  border: Border.all(
                    color: WorkshopTheme.statusUrgent.withValues(alpha: 0.2),
                  ),
                ),
                child: Text(
                  _error!,
                  style: const TextStyle(
                    fontSize: 12,
                    fontWeight: FontWeight.w600,
                    color: WorkshopTheme.statusUrgent,
                  ),
                ),
              ),
            ],
            const SizedBox(height: 24),
            Row(
              children: [
                Expanded(
                  child: OutlinedButton(
                    onPressed: _isDeleting ? null : () => Navigator.of(context).pop(false),
                    style: OutlinedButton.styleFrom(
                      foregroundColor: WorkshopTheme.darkTextMuted,
                      side: const BorderSide(color: WorkshopTheme.darkBorder),
                      padding: const EdgeInsets.symmetric(vertical: 12),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(8),
                      ),
                    ),
                    child: const Text(
                      'CANCEL',
                      style: TextStyle(
                        fontSize: 11,
                        fontWeight: FontWeight.w800,
                        letterSpacing: 0.8,
                      ),
                    ),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: FilledButton(
                    onPressed: _isDeleting
                        ? null
                        : () async {
                            setState(() {
                              _isDeleting = true;
                              _error = null;
                            });
                            final navigator = Navigator.of(context);
                            try {
                              final success = await widget.onConfirm(widget.userId, widget.userName);
                              if (mounted) {
                                if (success) {
                                  navigator.pop(true);
                                } else {
                                  setState(() {
                                    _isDeleting = false;
                                    _error = 'Failed to delete advisor.';
                                  });
                                }
                              }
                            } catch (e) {
                              if (mounted) {
                                setState(() {
                                  _isDeleting = false;
                                  _error = e.toString();
                                });
                              }
                            }
                          },
                    style: FilledButton.styleFrom(
                      backgroundColor: WorkshopTheme.statusUrgent,
                      foregroundColor: Colors.white,
                      padding: const EdgeInsets.symmetric(vertical: 12),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(8),
                      ),
                    ),
                    child: _isDeleting
                        ? const SizedBox(
                            width: 16,
                            height: 16,
                            child: CircularProgressIndicator(
                              strokeWidth: 2,
                              color: Colors.white,
                            ),
                          )
                        : const Text(
                            'DELETE',
                            style: TextStyle(
                              fontSize: 11,
                              fontWeight: FontWeight.w800,
                              letterSpacing: 0.8,
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
