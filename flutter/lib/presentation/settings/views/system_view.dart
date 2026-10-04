import 'package:flutter/material.dart';
import '../../../core/theme/workshop_theme.dart';
import '../../../firebase_options.dart';

class SystemView extends StatelessWidget {
  const SystemView({super.key});

  @override
  Widget build(BuildContext context) {
    return ListView(
      padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
      children: [
        _buildDiagnosticRow(
          title: 'Firestore Database',
          subtitle: DefaultFirebaseOptions.firestoreDatabaseId,
          isMono: true,
          statusBadge: _buildBadge(
            text: 'Active',
            color: WorkshopTheme.statusSuccess,
          ),
        ),
        const Divider(height: 1, color: WorkshopTheme.darkBorder),
        _buildDiagnosticRow(
          title: 'Authentication Provider',
          subtitle: 'Google OAuth SSO / Secure Local PINs',
          statusBadge: _buildBadge(
            text: 'Connected',
            color: WorkshopTheme.statusSuccess,
          ),
        ),
        const Divider(height: 1, color: WorkshopTheme.darkBorder),
        _buildDiagnosticRow(
          title: 'Client Environment',
          subtitle: 'Flutter Mobile & Multi-Platform Core',
          statusBadge: Container(
            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
            decoration: BoxDecoration(
              color: WorkshopTheme.darkSurface,
              borderRadius: BorderRadius.circular(6),
              border: Border.all(color: WorkshopTheme.darkBorder),
            ),
            child: Text(
              'Production',
              style: WorkshopTheme.mono(
                fontSize: 12,
                fontWeight: FontWeight.w700,
                color: WorkshopTheme.darkTextMuted,
              ),
            ),
          ),
        ),
        const Divider(height: 1, color: WorkshopTheme.darkBorder),
      ],
    );
  }

  Widget _buildBadge({required String text, required Color color}) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.12),
        borderRadius: BorderRadius.circular(6),
        border: Border.all(color: color.withValues(alpha: 0.3)),
      ),
      child: Text(
        text,
        style: TextStyle(
          fontSize: 11,
          fontWeight: FontWeight.w800,
          color: color,
        ),
      ),
    );
  }

  Widget _buildDiagnosticRow({
    required String title,
    required String subtitle,
    required Widget statusBadge,
    bool isMono = false,
  }) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 20),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.center,
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  title,
                  style: const TextStyle(
                    fontSize: 14,
                    fontWeight: FontWeight.w700,
                    color: WorkshopTheme.darkTextPrimary,
                  ),
                ),
                const SizedBox(height: 2),
                Text(
                  subtitle,
                  style: isMono
                      ? WorkshopTheme.mono(
                          fontSize: 11,
                          color: WorkshopTheme.darkTextMuted,
                        )
                      : const TextStyle(
                          fontSize: 12,
                          color: WorkshopTheme.darkTextMuted,
                        ),
                ),
              ],
            ),
          ),
          const SizedBox(width: 16),
          statusBadge,
        ],
      ),
    );
  }
}
