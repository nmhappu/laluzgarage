import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:firebase_auth/firebase_auth.dart' as fb_auth;
import '../../core/theme/workshop_theme.dart';
import '../../data/models/workshop_user.dart';
import '../../data/models/whatsapp_preset.dart';
import '../../data/models/service_record.dart';
import '../../data/models/customer.dart';
import '../../data/models/vehicle.dart';
import '../../data/repositories/firebase_providers.dart';
import '../../data/repositories/service_repository.dart';
import '../../data/repositories/customer_repository.dart';
import '../../data/repositories/vehicle_repository.dart';

import 'views/categories_view.dart';
import 'views/accounts_view.dart';
import 'views/edit_account_view.dart';
import 'views/performance_view.dart';
import 'views/date_wise_history_view.dart';
import 'views/whatsapp_presets_view.dart';
import 'views/tags_view.dart';
import 'views/general_view.dart';
import 'views/system_view.dart';
import 'dialogs/delete_user_dialog.dart';
import 'dialogs/logout_dialog.dart';

enum SettingsViewType {
  categories,
  accounts,
  editAccount,
  performance,
  dateHistory,
  whatsappPresets,
  tags,
  general,
  system,
}

final allUsersStreamProvider = StreamProvider<List<WorkshopUser>>((ref) {
  final firestore = ref.watch(firestoreProvider);
  return firestore.collection('users').snapshots().map((snapshot) =>
      snapshot.docs.map((doc) => WorkshopUser.fromFirestore(doc)).toList()
        ..sort((a, b) => (a.name).compareTo(b.name)));
});

class SettingsScreen extends ConsumerStatefulWidget {
  const SettingsScreen({super.key});

  @override
  ConsumerState<SettingsScreen> createState() => _SettingsScreenState();
}

class _SettingsScreenState extends ConsumerState<SettingsScreen> {
  SettingsViewType _currentView = SettingsViewType.categories;
  WorkshopUser? _selectedUserForEdit;
  bool _isCreatingUser = false;

  // Alerts
  String? _error;
  String? _successMessage;

  // WhatsApp Presets
  String _intakeTemplate = WhatsAppPresets.defaultIntakeTemplate;
  String _deliveryTemplate = WhatsAppPresets.defaultDeliveryTemplate;
  bool _isLoadingPresets = true;

  // Date-wise History Search and Filters
  bool _showStickySearch = false;
  final TextEditingController _dateSearchController = TextEditingController();
  DateTime? _dateFilter;

  // Custom Tags
  final List<String> _customCreatedTags = [];

  @override
  void initState() {
    super.initState();
    _loadWhatsAppPresets();
  }

  @override
  void dispose() {
    _dateSearchController.dispose();
    super.dispose();
  }

  void _showSuccess(String message) {
    setState(() {
      _successMessage = message;
      _error = null;
    });
    Future.delayed(const Duration(seconds: 3), () {
      if (mounted) setState(() => _successMessage = null);
    });
  }

  void _showError(String message) {
    setState(() {
      _error = message;
      _successMessage = null;
    });
  }

  Future<void> _loadWhatsAppPresets() async {
    try {
      final db = ref.read(firestoreProvider);
      final doc = await db.collection('settings').doc('whatsapp').get();
      if (doc.exists && doc.data() != null) {
        final data = doc.data()!;
        setState(() {
          _intakeTemplate = data['intakeTemplate'] ?? WhatsAppPresets.defaultIntakeTemplate;
          _deliveryTemplate = data['deliveryTemplate'] ?? WhatsAppPresets.defaultDeliveryTemplate;
        });
      }
    } catch (_) {
      // Fallback to defaults
    } finally {
      if (mounted) setState(() => _isLoadingPresets = false);
    }
  }

  Future<void> _saveWhatsAppPresets(String intake, String delivery) async {
    try {
      final db = ref.read(firestoreProvider);
      await db.collection('settings').doc('whatsapp').set({
        'intakeTemplate': intake,
        'deliveryTemplate': delivery,
        'updatedAt': FieldValue.serverTimestamp(),
      }, SetOptions(merge: true));

      setState(() {
        _intakeTemplate = intake;
        _deliveryTemplate = delivery;
      });
      _showSuccess('WhatsApp templates saved successfully!');
    } catch (e) {
      _showError('Failed to save templates: $e');
    }
  }

  void _navigateBack() {
    setState(() => _error = null);
    if (_currentView == SettingsViewType.categories) {
      Navigator.of(context).pop();
    } else if (_currentView == SettingsViewType.editAccount) {
      setState(() => _currentView = SettingsViewType.accounts);
    } else {
      setState(() {
        _currentView = SettingsViewType.categories;
        _showStickySearch = false;
        _dateSearchController.clear();
        _dateFilter = null;
      });
    }
  }

  void _navigateToTab(String tabId) {
    setState(() => _error = null);
    switch (tabId) {
      case 'accounts':
        setState(() => _currentView = SettingsViewType.accounts);
        break;
      case 'performance':
        setState(() => _currentView = SettingsViewType.performance);
        break;
      case 'date_history':
        setState(() => _currentView = SettingsViewType.dateHistory);
        break;
      case 'whatsapp_presets':
        setState(() => _currentView = SettingsViewType.whatsappPresets);
        break;
      case 'tags':
        setState(() => _currentView = SettingsViewType.tags);
        break;
      case 'general':
        setState(() => _currentView = SettingsViewType.general);
        break;
      case 'system':
        setState(() => _currentView = SettingsViewType.system);
        break;
      default:
        setState(() => _currentView = SettingsViewType.categories);
    }
  }

  List<String> _getAllAvailableTags(List<WorkshopUser> users) {
    final tagsSet = <String>{..._customCreatedTags};
    for (final u in users) {
      for (final t in u.tags) {
        if (t.trim().isNotEmpty) {
          tagsSet.add(t.trim().toLowerCase());
        }
      }
    }
    return tagsSet.toList()..sort();
  }

  Future<void> _handleDeleteTag(String tag, List<WorkshopUser> users) async {
    try {
      setState(() {
        _customCreatedTags.remove(tag);
      });

      final db = ref.read(firestoreProvider);
      final affected = users.where((u) => u.tags.contains(tag));
      for (final u in affected) {
        final newTags = u.tags.where((t) => t != tag).toList();
        await db.collection('users').doc(u.id).update({
          'tags': newTags,
          'updatedAt': FieldValue.serverTimestamp(),
        });
      }
      _showSuccess('Tag "$tag" deleted successfully.');
    } catch (e) {
      _showError('Failed to delete tag: $e');
    }
  }

  Future<bool> _handleSaveUserProfile({
    required String name,
    required String email,
    required UserRole role,
    required String? pin,
    required List<String> tags,
  }) async {
    final db = ref.read(firestoreProvider);
    final finalName = name.isNotEmpty ? name : email.split('@').first;

    // Merge role into tags taxonomy to ensure consistency
    final mergedTags = tags
        .where((t) => !['admin', 'tech', 'technician', 'assistant'].contains(t.toLowerCase()))
        .toSet();
    if (role == UserRole.admin) {
      mergedTags.add('admin');
    } else if (role == UserRole.technician) {
      mergedTags.add('tech');
    } else if (role == UserRole.assistant) {
      mergedTags.add('assistant');
    }

    try {
      if (_isCreatingUser) {
        await db.collection('users').add({
          'name': finalName,
          'email': email.toLowerCase(),
          'role': role.value,
          'status': 'offline',
          'pin': pin,
          'tags': mergedTags.toList(),
          'createdAt': FieldValue.serverTimestamp(),
          'updatedAt': FieldValue.serverTimestamp(),
        });
        _showSuccess('New advisor "$finalName" created successfully!');
      } else if (_selectedUserForEdit != null) {
        await db.collection('users').doc(_selectedUserForEdit!.id).update({
          'name': finalName,
          'email': email.toLowerCase(),
          'role': role.value,
          'pin': pin,
          'tags': mergedTags.toList(),
          'updatedAt': FieldValue.serverTimestamp(),
        });

        // Sync auth display name if current user
        final currentAuthUser = fb_auth.FirebaseAuth.instance.currentUser;
        if (currentAuthUser != null && currentAuthUser.uid == _selectedUserForEdit!.id) {
          try {
            await currentAuthUser.updateDisplayName(finalName);
          } catch (_) {}
        }
        _showSuccess('Advisor "$finalName" updated successfully!');
      }

      setState(() => _currentView = SettingsViewType.accounts);
      return true;
    } catch (e) {
      _showError('Failed to save advisor: $e');
      return false;
    }
  }

  Future<bool> _handleDeleteUser(String id, String name) async {
    try {
      final db = ref.read(firestoreProvider);
      await db.collection('users').doc(id).delete();
      _showSuccess('Advisor "$name" deleted.');
      setState(() => _currentView = SettingsViewType.accounts);
      return true;
    } catch (e) {
      _showError('Failed to delete advisor: $e');
      return false;
    }
  }

  void _showLogoutDialog() {
    showDialog(
      context: context,
      builder: (_) => LogoutDialog(
        onConfirm: () async {
          await ref.read(authRepositoryProvider).signOut();
          if (mounted) Navigator.of(context).pop();
        },
      ),
    );
  }

  void _showDeleteUserDialog(WorkshopUser user) {
    showDialog(
      context: context,
      builder: (_) => DeleteUserDialog(
        userId: user.id,
        userName: user.name,
        onConfirm: _handleDeleteUser,
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final usersAsync = ref.watch(allUsersStreamProvider);
    final recordsAsync = ref.watch(serviceRecordsStreamProvider);
    final customersAsync = ref.watch(customersStreamProvider);
    final vehiclesAsync = ref.watch(vehiclesStreamProvider);
    final currentUser = ref.watch(currentUserProfileProvider).value;
    final isAdmin = ref.watch(isAdminProvider);

    final users = usersAsync.value ?? [];
    final records = recordsAsync.value ?? <ServiceRecord>[];
    final customers = customersAsync.value ?? <Customer>[];
    final vehicles = vehiclesAsync.value ?? <Vehicle>[];

    final availableTags = _getAllAvailableTags(users);

    return PopScope(
      canPop: _currentView == SettingsViewType.categories,
      onPopInvokedWithResult: (didPop, _) {
        if (!didPop) {
          _navigateBack();
        }
      },
      child: Scaffold(
        backgroundColor: WorkshopTheme.darkCanvas,
        appBar: PreferredSize(
          preferredSize: const Size.fromHeight(kToolbarHeight),
          child: Container(
            decoration: const BoxDecoration(
              color: WorkshopTheme.darkCanvas,
              border: Border(
                bottom: BorderSide(color: WorkshopTheme.darkBorder, width: 0.5),
              ),
            ),
            child: AppBar(
              backgroundColor: Colors.transparent,
              elevation: 0,
              leading: IconButton(
                icon: const Icon(LucideIcons.arrowLeft, size: 20),
                color: WorkshopTheme.darkTextMuted,
                tooltip: _currentView == SettingsViewType.categories ? 'Close Settings' : 'Back',
                onPressed: _navigateBack,
              ),
              title: _buildAppBarTitle(),
              actions: _buildAppBarActions(),
            ),
          ),
        ),
        body: Stack(
          children: [
            Column(
              children: [
                // Global Error Alert Banner
                if (_error != null)
                  Container(
                    width: double.infinity,
                    padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
                    color: WorkshopTheme.statusUrgent.withValues(alpha: 0.12),
                    child: Row(
                      children: [
                        const Icon(LucideIcons.alertCircle, size: 14, color: WorkshopTheme.statusUrgent),
                        const SizedBox(width: 8),
                        Expanded(
                          child: Text(
                            _error!,
                            style: const TextStyle(
                              fontSize: 12,
                              fontWeight: FontWeight.w700,
                              color: WorkshopTheme.statusUrgent,
                            ),
                          ),
                        ),
                        InkWell(
                          onTap: () => setState(() => _error = null),
                          child: const Icon(LucideIcons.x, size: 14, color: WorkshopTheme.statusUrgent),
                        ),
                      ],
                    ),
                  ),

                // Global Success Alert Banner
                if (_successMessage != null)
                  Container(
                    width: double.infinity,
                    padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
                    color: WorkshopTheme.statusSuccess.withValues(alpha: 0.12),
                    child: Row(
                      children: [
                        const Icon(LucideIcons.checkCircle2, size: 14, color: WorkshopTheme.statusSuccess),
                        const SizedBox(width: 8),
                        Expanded(
                          child: Text(
                            _successMessage!,
                            style: const TextStyle(
                              fontSize: 12,
                              fontWeight: FontWeight.w700,
                              color: WorkshopTheme.statusSuccess,
                            ),
                          ),
                        ),
                        InkWell(
                          onTap: () => setState(() => _successMessage = null),
                          child: const Icon(LucideIcons.x, size: 14, color: WorkshopTheme.statusSuccess),
                        ),
                      ],
                    ),
                  ),

                // Sub-View Content
                Expanded(
                  child: _buildActiveView(
                    users: users,
                    records: records,
                    customers: customers,
                    vehicles: vehicles,
                    currentUser: currentUser,
                    isAdmin: isAdmin,
                    availableTags: availableTags,
                    loadingUsers: usersAsync.isLoading,
                    loadingRecords: recordsAsync.isLoading,
                  ),
                ),
              ],
            ),

            // Sticky Search Overlay for Date-wise History
            if (_currentView == SettingsViewType.dateHistory && _showStickySearch)
              Positioned(
                top: 0,
                left: 0,
                right: 0,
                child: Container(
                  height: kToolbarHeight,
                  padding: const EdgeInsets.symmetric(horizontal: 16),
                  decoration: const BoxDecoration(
                    color: WorkshopTheme.darkSurface,
                    border: Border(
                      bottom: BorderSide(color: WorkshopTheme.darkBorder),
                    ),
                    boxShadow: [
                      BoxShadow(
                        color: Colors.black45,
                        blurRadius: 8,
                        offset: Offset(0, 3),
                      ),
                    ],
                  ),
                  child: Row(
                    children: [
                      const Icon(LucideIcons.search, size: 18, color: WorkshopTheme.darkTextMuted),
                      const SizedBox(width: 12),
                      Expanded(
                        child: TextField(
                          controller: _dateSearchController,
                          autofocus: true,
                          onChanged: (_) => setState(() {}),
                          style: const TextStyle(
                            fontSize: 13,
                            color: WorkshopTheme.darkTextPrimary,
                            fontWeight: FontWeight.w600,
                          ),
                          decoration: const InputDecoration(
                            hintText: 'Search plate, vehicle, customer, or date...',
                            hintStyle: TextStyle(
                              fontSize: 13,
                              color: WorkshopTheme.darkTextMuted,
                            ),
                            border: InputBorder.none,
                          ),
                        ),
                      ),
                      IconButton(
                        onPressed: () {
                          setState(() {
                            _showStickySearch = false;
                            _dateSearchController.clear();
                          });
                        },
                        icon: const Icon(LucideIcons.x, size: 18, color: WorkshopTheme.darkTextMuted),
                      ),
                    ],
                  ),
                ),
              ),
          ],
        ),
      ),
    );
  }

  Widget _buildAppBarTitle() {
    switch (_currentView) {
      case SettingsViewType.categories:
        return const Text(
          'Settings',
          style: TextStyle(
            fontSize: 16,
            fontWeight: FontWeight.w900,
            letterSpacing: -0.3,
            color: WorkshopTheme.darkTextPrimary,
          ),
        );
      case SettingsViewType.accounts:
        return const Text(
          'Accounts',
          style: TextStyle(
            fontSize: 16,
            fontWeight: FontWeight.w900,
            letterSpacing: -0.3,
            color: WorkshopTheme.statusSuccess,
          ),
        );
      case SettingsViewType.editAccount:
        return Text(
          _isCreatingUser ? 'Create Advisor' : 'Edit Advisor',
          style: const TextStyle(
            fontSize: 16,
            fontWeight: FontWeight.w900,
            letterSpacing: -0.3,
            color: WorkshopTheme.statusSuccess,
          ),
        );
      case SettingsViewType.performance:
        return const Text(
          'Technician Performance',
          style: TextStyle(
            fontSize: 16,
            fontWeight: FontWeight.w900,
            letterSpacing: -0.3,
            color: Color(0xFF22D3EE),
          ),
        );
      case SettingsViewType.dateHistory:
        return const Text(
          'Date-wise Service History',
          style: TextStyle(
            fontSize: 16,
            fontWeight: FontWeight.w900,
            letterSpacing: -0.3,
            color: WorkshopTheme.emeraldAccent,
          ),
        );
      case SettingsViewType.whatsappPresets:
        return const Text(
          'WhatsApp Presets',
          style: TextStyle(
            fontSize: 16,
            fontWeight: FontWeight.w900,
            letterSpacing: -0.3,
            color: Color(0xFF25D366),
          ),
        );
      case SettingsViewType.tags:
        return const Text(
          'Tags',
          style: TextStyle(
            fontSize: 16,
            fontWeight: FontWeight.w900,
            letterSpacing: -0.3,
            color: Color(0xFF818CF8),
          ),
        );
      case SettingsViewType.general:
        return const Text(
          'General Settings',
          style: TextStyle(
            fontSize: 16,
            fontWeight: FontWeight.w900,
            letterSpacing: -0.3,
            color: WorkshopTheme.blueAccent,
          ),
        );
      case SettingsViewType.system:
        return const Text(
          'System Diagnostics',
          style: TextStyle(
            fontSize: 16,
            fontWeight: FontWeight.w900,
            letterSpacing: -0.3,
            color: WorkshopTheme.statusPending,
          ),
        );
    }
  }

  List<Widget> _buildAppBarActions() {
    if (_currentView == SettingsViewType.accounts) {
      return [
        IconButton(
          onPressed: () => ref.refresh(allUsersStreamProvider),
          icon: const Icon(LucideIcons.refreshCw, size: 16, color: WorkshopTheme.darkTextMuted),
          tooltip: 'Refresh Accounts',
        ),
        const SizedBox(width: 4),
        Padding(
          padding: const EdgeInsets.only(right: 12),
          child: TextButton.icon(
            onPressed: () {
              setState(() {
                _isCreatingUser = true;
                _selectedUserForEdit = null;
                _currentView = SettingsViewType.editAccount;
              });
            },
            icon: const Icon(LucideIcons.plus, size: 13, color: WorkshopTheme.statusSuccess),
            label: const Text(
              'NEW ADVISOR',
              style: TextStyle(
                fontSize: 11,
                fontWeight: FontWeight.w900,
                letterSpacing: 0.8,
                color: WorkshopTheme.statusSuccess,
              ),
            ),
            style: TextButton.styleFrom(
              backgroundColor: WorkshopTheme.statusSuccess.withValues(alpha: 0.08),
              side: BorderSide(color: WorkshopTheme.statusSuccess.withValues(alpha: 0.3)),
              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
            ),
          ),
        ),
      ];
    }

    if (_currentView == SettingsViewType.dateHistory) {
      return [
        IconButton(
          onPressed: () => setState(() => _showStickySearch = true),
          icon: Icon(
            LucideIcons.search,
            size: 18,
            color: _dateSearchController.text.isNotEmpty
                ? WorkshopTheme.emeraldAccent
                : WorkshopTheme.darkTextMuted,
          ),
          tooltip: 'Search History',
        ),
        IconButton(
          onPressed: () async {
            final now = DateTime.now();
            final picked = await showDatePicker(
              context: context,
              initialDate: _dateFilter ?? now,
              firstDate: DateTime(2020),
              lastDate: DateTime(now.year + 2),
              builder: (ctx, child) {
                return Theme(
                  data: Theme.of(ctx).copyWith(
                    colorScheme: const ColorScheme.dark(
                      primary: WorkshopTheme.emeraldAccent,
                      surface: WorkshopTheme.darkCard,
                    ),
                  ),
                  child: child!,
                );
              },
            );
            if (picked != null) {
              setState(() => _dateFilter = picked);
            }
          },
          icon: Icon(
            LucideIcons.calendar,
            size: 18,
            color: _dateFilter != null
                ? WorkshopTheme.emeraldAccent
                : WorkshopTheme.darkTextMuted,
          ),
          tooltip: 'Filter Date',
        ),
      ];
    }

    return const [];
  }

  Widget _buildActiveView({
    required List<WorkshopUser> users,
    required List<ServiceRecord> records,
    required List<Customer> customers,
    required List<Vehicle> vehicles,
    required WorkshopUser? currentUser,
    required bool isAdmin,
    required List<String> availableTags,
    required bool loadingUsers,
    required bool loadingRecords,
  }) {
    switch (_currentView) {
      case SettingsViewType.categories:
        return CategoriesView(
          currentUser: currentUser,
          isAdmin: isAdmin,
          onSelectTab: _navigateToTab,
          onLogoutClick: _showLogoutDialog,
        );

      case SettingsViewType.accounts:
        return AccountsView(
          loading: loadingUsers,
          users: users,
          onSelectUser: (user) {
            setState(() {
              _selectedUserForEdit = user;
              _isCreatingUser = false;
              _currentView = SettingsViewType.editAccount;
            });
          },
        );

      case SettingsViewType.editAccount:
        return EditAccountView(
          isCreating: _isCreatingUser,
          user: _selectedUserForEdit,
          isCurrentUser: currentUser?.id == _selectedUserForEdit?.id,
          availableTags: availableTags,
          onSave: _handleSaveUserProfile,
          onDelete: () {
            if (_selectedUserForEdit != null) {
              _showDeleteUserDialog(_selectedUserForEdit!);
            }
          },
          onCancel: () => setState(() => _currentView = SettingsViewType.accounts),
        );

      case SettingsViewType.performance:
        return PerformanceView(
          users: users,
          records: records,
          loading: loadingRecords,
        );

      case SettingsViewType.dateHistory:
        return DateWiseHistoryView(
          records: records,
          customers: customers,
          vehicles: vehicles,
          loading: loadingRecords,
          onRefresh: () => ref.refresh(serviceRecordsStreamProvider),
          searchQuery: _dateSearchController.text,
          onClearSearch: () => setState(() => _dateSearchController.clear()),
          dateFilter: _dateFilter,
          onClearDateFilter: () => setState(() => _dateFilter = null),
        );

      case SettingsViewType.whatsappPresets:
        return _isLoadingPresets
            ? const Center(child: CircularProgressIndicator(color: WorkshopTheme.emeraldAccent))
            : WhatsAppPresetsView(
                initialIntakeTemplate: _intakeTemplate,
                initialDeliveryTemplate: _deliveryTemplate,
                onSavePresets: _saveWhatsAppPresets,
                onCancel: () => setState(() => _currentView = SettingsViewType.categories),
              );

      case SettingsViewType.tags:
        return TagsView(
          users: users,
          availableTags: availableTags,
          onCreateTag: (newTag) {
            if (!availableTags.contains(newTag)) {
              setState(() => _customCreatedTags.add(newTag));
              _showSuccess('Tag "$newTag" created.');
            } else {
              _showError('Tag "$newTag" already exists.');
            }
          },
          onDeleteTag: (tag) => _handleDeleteTag(tag, users),
        );

      case SettingsViewType.general:
        return const GeneralView();

      case SettingsViewType.system:
        return const SystemView();
    }
  }
}
