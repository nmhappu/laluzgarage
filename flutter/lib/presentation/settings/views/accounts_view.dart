import 'package:flutter/material.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import '../../../core/theme/workshop_theme.dart';
import '../../../data/models/workshop_user.dart';

class AccountsView extends StatelessWidget {
  final bool loading;
  final List<WorkshopUser> users;
  final ValueChanged<WorkshopUser> onSelectUser;

  const AccountsView({
    super.key,
    required this.loading,
    required this.users,
    required this.onSelectUser,
  });

  @override
  Widget build(BuildContext context) {
    if (loading && users.isEmpty) {
      return const Center(
        child: Padding(
          padding: EdgeInsets.symmetric(vertical: 48),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              CircularProgressIndicator(
                strokeWidth: 2,
                color: WorkshopTheme.emeraldAccent,
              ),
              SizedBox(height: 12),
              Text(
                'LOADING TEAM ACCOUNTS...',
                style: TextStyle(
                  fontSize: 11,
                  fontWeight: FontWeight.w800,
                  letterSpacing: 1.0,
                  color: WorkshopTheme.darkTextMuted,
                ),
              ),
            ],
          ),
        ),
      );
    }

    if (users.isEmpty) {
      return Center(
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 64),
          child: Container(
            padding: const EdgeInsets.all(24),
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(12),
              border: Border.all(
                color: WorkshopTheme.darkBorder.withValues(alpha: 0.5),
              ),
            ),
            child: const Text(
              'No accounts registered yet. Tap "+ New Advisor" at the top right to get started.',
              textAlign: TextAlign.center,
              style: TextStyle(
                fontSize: 12,
                fontWeight: FontWeight.w700,
                color: WorkshopTheme.darkTextMuted,
                height: 1.5,
              ),
            ),
          ),
        ),
      );
    }

    return ListView.separated(
      padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
      itemCount: users.length,
      separatorBuilder: (_, _) => const Divider(
        height: 1,
        color: WorkshopTheme.darkBorder,
      ),
      itemBuilder: (context, index) {
        final u = users[index];
        final isAdmin = u.isAdmin;
        final hasPin = u.pin != null && u.pin!.isNotEmpty;

        return InkWell(
          onTap: () => onSelectUser(u),
          child: Padding(
            padding: const EdgeInsets.symmetric(vertical: 16),
            child: Row(
              children: [
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          Flexible(
                            child: Text(
                              u.name.isNotEmpty ? u.name : 'Unnamed Team Member',
                              style: const TextStyle(
                                fontSize: 14,
                                fontWeight: FontWeight.w700,
                                color: WorkshopTheme.darkTextPrimary,
                              ),
                              overflow: TextOverflow.ellipsis,
                            ),
                          ),
                          if (isAdmin) ...[
                            const SizedBox(width: 6),
                            const Icon(
                              LucideIcons.shield,
                              size: 14,
                              color: WorkshopTheme.statusUrgent,
                            ),
                          ],
                        ],
                      ),
                      const SizedBox(height: 2),
                      Text(
                        u.email,
                        style: WorkshopTheme.mono(
                          fontSize: 12,
                          color: WorkshopTheme.darkTextMuted,
                        ),
                        overflow: TextOverflow.ellipsis,
                      ),
                    ],
                  ),
                ),
                const SizedBox(width: 12),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                  decoration: BoxDecoration(
                    color: WorkshopTheme.darkSurface,
                    borderRadius: BorderRadius.circular(8),
                    border: Border.all(color: WorkshopTheme.darkBorder),
                  ),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Icon(
                        LucideIcons.key,
                        size: 13,
                        color: hasPin
                            ? WorkshopTheme.emeraldAccent
                            : WorkshopTheme.darkTextMuted.withValues(alpha: 0.5),
                      ),
                      const SizedBox(width: 6),
                      Text(
                        hasPin ? 'PIN SET' : 'NO PIN',
                        style: TextStyle(
                          fontSize: 10,
                          fontWeight: FontWeight.w800,
                          letterSpacing: 0.6,
                          color: hasPin
                              ? WorkshopTheme.emeraldAccent
                              : WorkshopTheme.darkTextMuted,
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(width: 10),
                const Icon(
                  LucideIcons.chevronRight,
                  size: 16,
                  color: WorkshopTheme.darkTextMuted,
                ),
              ],
            ),
          ),
        );
      },
    );
  }
}
