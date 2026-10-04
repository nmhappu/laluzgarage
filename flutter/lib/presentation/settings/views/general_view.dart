import 'package:flutter/material.dart';
import '../../../core/constants/app_constants.dart';
import '../../../core/theme/workshop_theme.dart';

class GeneralView extends StatelessWidget {
  const GeneralView({super.key});

  @override
  Widget build(BuildContext context) {
    return ListView(
      padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
      children: [
        _buildSettingRow(
          title: 'Workshop Identifier',
          description: 'The name used on customer correspondence and reports',
          trailing: Container(
            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
            decoration: BoxDecoration(
              color: WorkshopTheme.darkSurface,
              borderRadius: BorderRadius.circular(8),
              border: Border.all(color: WorkshopTheme.darkBorder),
            ),
            child: const Text(
              AppConstants.appName,
              style: TextStyle(
                fontSize: 12,
                fontWeight: FontWeight.w700,
                color: WorkshopTheme.darkTextPrimary,
              ),
            ),
          ),
        ),
        const Divider(height: 1, color: WorkshopTheme.darkBorder),
        _buildSettingRow(
          title: 'Base Currency',
          description: 'Default billing and pricing currency',
          trailing: Container(
            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
            decoration: BoxDecoration(
              color: WorkshopTheme.darkSurface,
              borderRadius: BorderRadius.circular(8),
              border: Border.all(color: WorkshopTheme.darkBorder),
            ),
            child: Text(
              'INR (${AppConstants.currencySymbol})',
              style: WorkshopTheme.numeric(
                fontSize: 12,
                fontWeight: FontWeight.w700,
                color: WorkshopTheme.darkTextMuted,
              ),
            ),
          ),
        ),
        const Divider(height: 1, color: WorkshopTheme.darkBorder),
        _buildSettingRow(
          title: 'GST Billing Integration',
          description: 'Standard sales tax rate for billing items and invoices',
          trailing: Container(
            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
            decoration: BoxDecoration(
              color: WorkshopTheme.darkSurface,
              borderRadius: BorderRadius.circular(8),
              border: Border.all(color: WorkshopTheme.darkBorder),
            ),
            child: Text(
              '18% (GST)',
              style: WorkshopTheme.numeric(
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

  Widget _buildSettingRow({
    required String title,
    required String description,
    required Widget trailing,
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
                  description,
                  style: const TextStyle(
                    fontSize: 12,
                    color: WorkshopTheme.darkTextMuted,
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(width: 16),
          trailing,
        ],
      ),
    );
  }
}
