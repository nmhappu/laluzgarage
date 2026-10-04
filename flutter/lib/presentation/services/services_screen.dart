import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import '../../core/theme/workshop_theme.dart';
import '../../data/models/service_record.dart';
import '../../data/repositories/service_repository.dart';
import '../../data/repositories/customer_repository.dart';
import '../../data/repositories/vehicle_repository.dart';
import '../../data/repositories/firebase_providers.dart';
import 'service_record_card.dart';
import 'edit_record_sheet.dart';
import '../shell/navigation_provider.dart';

class ServicesScreen extends ConsumerStatefulWidget {
  const ServicesScreen({super.key});

  @override
  ConsumerState<ServicesScreen> createState() => _ServicesScreenState();
}

class _ServicesScreenState extends ConsumerState<ServicesScreen> {
  final _searchController = TextEditingController();
  String _searchQuery = '';
  DateTime? _filterDate;

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  void _showDeleteDialog(ServiceRecord record) {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: WorkshopTheme.darkCard,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        title: const Row(
          children: [
            Icon(LucideIcons.trash2, color: WorkshopTheme.statusUrgent, size: 20),
            SizedBox(width: 10),
            Text(
              'Delete Record',
              style: TextStyle(fontWeight: FontWeight.w800, fontSize: 18),
            ),
          ],
        ),
        content: const Text(
          'Are you sure you want to delete this service record? This action is permanent and cannot be undone.',
          style: TextStyle(color: WorkshopTheme.darkTextMuted, fontSize: 13),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(ctx).pop(),
            child: const Text('Cancel', style: TextStyle(color: Colors.grey)),
          ),
          FilledButton(
            onPressed: () async {
              Navigator.of(ctx).pop();
              await ref.read(serviceRepositoryProvider).deleteRecord(record.id);
              if (mounted) {
                ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(content: Text('Service record deleted')),
                );
              }
            },
            style: FilledButton.styleFrom(
              backgroundColor: WorkshopTheme.statusUrgent,
              foregroundColor: Colors.white,
            ),
            child: const Text('Delete'),
          ),
        ],
      ),
    );
  }

  Widget _buildFilterChip(
    String label,
    int count,
    ServiceStatus? status,
    bool isSelected,
  ) {
    Color activeColor = WorkshopTheme.emeraldAccent;
    if (status == ServiceStatus.pending) activeColor = WorkshopTheme.statusUrgent;
    if (status == ServiceStatus.inProgress) activeColor = WorkshopTheme.statusPending;
    if (status == ServiceStatus.completed) activeColor = WorkshopTheme.statusSuccess;

    return InkWell(
      onTap: () {
        ref.read(activeStatusFilterProvider.notifier).setFilter(status);
      },
      borderRadius: BorderRadius.circular(20),
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 200),
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
        decoration: BoxDecoration(
          color: isSelected
              ? activeColor.withValues(alpha: 0.15)
              : WorkshopTheme.darkSurface,
          borderRadius: BorderRadius.circular(20),
          border: Border.all(
            color: isSelected
                ? activeColor.withValues(alpha: 0.6)
                : WorkshopTheme.darkBorder,
            width: 1,
          ),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Text(
              label,
              style: TextStyle(
                fontSize: 11,
                fontWeight: isSelected ? FontWeight.w900 : FontWeight.w700,
                letterSpacing: 0.5,
                color: isSelected ? activeColor : WorkshopTheme.darkTextMuted,
              ),
            ),
            const SizedBox(width: 6),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 1.5),
              decoration: BoxDecoration(
                color: isSelected
                    ? activeColor.withValues(alpha: 0.25)
                    : WorkshopTheme.darkBorder,
                borderRadius: BorderRadius.circular(10),
              ),
              child: Text(
                '$count',
                style: TextStyle(
                  fontSize: 10,
                  fontWeight: FontWeight.w900,
                  color: isSelected ? activeColor : WorkshopTheme.darkTextMuted,
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final allRecordsAsync = ref.watch(serviceRecordsStreamProvider);
    final activeFilter = ref.watch(activeStatusFilterProvider);
    final customersAsync = ref.watch(customersStreamProvider);
    final vehiclesAsync = ref.watch(vehiclesStreamProvider);
    final isAdmin = ref.watch(isAdminProvider);

    final isWide = MediaQuery.sizeOf(context).width >= 768;

    return Scaffold(
      backgroundColor: WorkshopTheme.darkCanvas,
      appBar: isWide
          ? AppBar(
              title: const Text(
                'Service Operations & Job Cards',
                style: TextStyle(fontWeight: FontWeight.w900, fontSize: 18),
              ),
            )
          : null,
      body: Column(
        children: [
          // Search & Date Filter Bar
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 8, 16, 8),
            child: Row(
              children: [
                Expanded(
                  child: TextField(
                    controller: _searchController,
                    onChanged: (val) =>
                        setState(() => _searchQuery = val.trim().toLowerCase()),
                    decoration: InputDecoration(
                      hintText: 'Search by plate number, client or model...',
                      prefixIcon: const Icon(LucideIcons.search, size: 18),
                      filled: true,
                      fillColor: WorkshopTheme.darkCard,
                      contentPadding: const EdgeInsets.symmetric(
                          horizontal: 16, vertical: 12),
                      border: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(12),
                        borderSide:
                            const BorderSide(color: WorkshopTheme.darkBorder),
                      ),
                      suffixIcon: _searchQuery.isNotEmpty
                          ? IconButton(
                              icon: const Icon(LucideIcons.x, size: 16),
                              onPressed: () {
                                _searchController.clear();
                                setState(() => _searchQuery = '');
                              },
                            )
                          : null,
                    ),
                  ),
                ),
                const SizedBox(width: 10),

                // Date Picker Filter Button
                IconButton(
                  icon: Icon(
                    LucideIcons.calendar,
                    size: 20,
                    color: _filterDate != null
                        ? WorkshopTheme.emeraldAccent
                        : WorkshopTheme.darkTextMuted,
                  ),
                  tooltip: 'Filter by Intake Date',
                  style: IconButton.styleFrom(
                    backgroundColor: _filterDate != null
                        ? WorkshopTheme.emeraldAccent.withValues(alpha: 0.15)
                        : WorkshopTheme.darkCard,
                    side: BorderSide(
                      color: _filterDate != null
                          ? WorkshopTheme.emeraldAccent.withValues(alpha: 0.4)
                          : WorkshopTheme.darkBorder,
                    ),
                    padding: const EdgeInsets.all(12),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(12),
                    ),
                  ),
                  onPressed: () async {
                    if (_filterDate != null) {
                      setState(() => _filterDate = null);
                      return;
                    }
                    final picked = await showDatePicker(
                      context: context,
                      initialDate: DateTime.now(),
                      firstDate: DateTime(2020),
                      lastDate: DateTime(2030),
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
                      setState(() => _filterDate = picked);
                    }
                  },
                ),
              ],
            ),
          ),

          // Active Date Filter Pill (if selected)
          if (_filterDate != null)
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
              child: Row(
                children: [
                  Container(
                    padding:
                        const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                    decoration: BoxDecoration(
                      color:
                          WorkshopTheme.emeraldAccent.withValues(alpha: 0.15),
                      borderRadius: BorderRadius.circular(20),
                      border: Border.all(
                        color:
                            WorkshopTheme.emeraldAccent.withValues(alpha: 0.4),
                      ),
                    ),
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        const Icon(LucideIcons.calendar,
                            size: 12, color: WorkshopTheme.emeraldAccent),
                        const SizedBox(width: 6),
                        Text(
                          DateFormat('dd MMM yyyy').format(_filterDate!),
                          style: const TextStyle(
                            fontSize: 11,
                            fontWeight: FontWeight.w800,
                            color: WorkshopTheme.emeraldAccent,
                          ),
                        ),
                        const SizedBox(width: 6),
                        InkWell(
                          onTap: () => setState(() => _filterDate = null),
                          child: const Icon(LucideIcons.x,
                              size: 12, color: WorkshopTheme.emeraldAccent),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),

          // Status Filter Tabs with Counts (1:1 with React tabs)
          allRecordsAsync.when(
            loading: () => const SizedBox(height: 48),
            error: (_, _) => const SizedBox(height: 48),
            data: (allRecords) {
              final pendingCount = allRecords
                  .where((r) => r.status == ServiceStatus.pending)
                  .length;
              final inProgressCount = allRecords
                  .where((r) => r.status == ServiceStatus.inProgress)
                  .length;
              final completedCount = allRecords
                  .where((r) => r.status == ServiceStatus.completed)
                  .length;
              final cancelledCount = allRecords
                  .where((r) => r.status == ServiceStatus.cancelled)
                  .length;

              return SingleChildScrollView(
                scrollDirection: Axis.horizontal,
                padding:
                    const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
                child: Row(
                  children: [
                    _buildFilterChip(
                        'ALL', allRecords.length, null, activeFilter == null),
                    const SizedBox(width: 8),
                    _buildFilterChip('PENDING', pendingCount,
                        ServiceStatus.pending, activeFilter == ServiceStatus.pending),
                    const SizedBox(width: 8),
                    _buildFilterChip('IN PROGRESS', inProgressCount,
                        ServiceStatus.inProgress, activeFilter == ServiceStatus.inProgress),
                    const SizedBox(width: 8),
                    _buildFilterChip('COMPLETED', completedCount,
                        ServiceStatus.completed, activeFilter == ServiceStatus.completed),
                    const SizedBox(width: 8),
                    _buildFilterChip('CANCELLED', cancelledCount,
                        ServiceStatus.cancelled, activeFilter == ServiceStatus.cancelled),
                  ],
                ),
              );
            },
          ),
          const SizedBox(height: 6),

          // Records List
          Expanded(
            child: allRecordsAsync.when(
              loading: () => const Center(
                child: CircularProgressIndicator(
                    color: WorkshopTheme.emeraldAccent),
              ),
              error: (err, _) => Center(
                child: Text('Error loading records: $err',
                    style: const TextStyle(color: Colors.red)),
              ),
              data: (allRecords) {
                final customers = customersAsync.asData?.value ?? [];
                final vehicles = vehiclesAsync.asData?.value ?? [];
                final topBarQuery =
                    ref.watch(topBarSearchQueryProvider).trim().toLowerCase();
                final effectiveQuery =
                    topBarQuery.isNotEmpty ? topBarQuery : _searchQuery;

                final filtered = allRecords.where((r) {
                  // Status filter
                  if (activeFilter != null && r.status != activeFilter) {
                    return false;
                  }

                  // Date filter
                  if (_filterDate != null) {
                    final target = DateFormat('yyyy-MM-dd').format(_filterDate!);
                    if (!r.date.startsWith(target)) return false;
                  }

                  // Search query
                  if (effectiveQuery.isNotEmpty) {
                    final customer = customers
                        .where((c) => c.id == r.customerId)
                        .firstOrNull;
                    final vehicle = vehicles
                        .where((v) => v.id == r.vehicleId)
                        .firstOrNull;

                    final plate =
                        (vehicle?.plateNumber ?? '').toLowerCase();
                    final makeModel =
                        '${vehicle?.make ?? ''} ${vehicle?.model ?? ''}'
                            .toLowerCase();
                    final clientName =
                        (customer?.name ?? '').toLowerCase();
                    final clientPhone =
                        (customer?.phone ?? '').toLowerCase();

                    return plate.contains(effectiveQuery) ||
                        makeModel.contains(effectiveQuery) ||
                        clientName.contains(effectiveQuery) ||
                        clientPhone.contains(effectiveQuery);
                  }

                  return true;
                }).toList();

                if (filtered.isEmpty) {
                  return const Center(
                    child: Text(
                      'No matching service records found.',
                      style: TextStyle(color: WorkshopTheme.darkTextMuted),
                    ),
                  );
                }

                return ListView.builder(
                  padding: EdgeInsets.only(bottom: isWide ? 32 : 84),
                  itemCount: filtered.length,
                  itemBuilder: (ctx, idx) {
                    final record = filtered[idx];
                    final customer = customers
                        .where((c) => c.id == record.customerId)
                        .firstOrNull;
                    final vehicle = vehicles
                        .where((v) => v.id == record.vehicleId)
                        .firstOrNull;

                    return ServiceRecordCard(
                      record: record,
                      customer: customer,
                      vehicle: vehicle,
                      canDelete: isAdmin,
                      onDelete: () => _showDeleteDialog(record),
                      onTap: () {
                        showModalBottomSheet(
                          context: context,
                          isScrollControlled: true,
                          backgroundColor: Colors.transparent,
                          builder: (c) => EditRecordSheet(
                            record: record,
                            customer: customer,
                            vehicle: vehicle,
                          ),
                        );
                      },
                    );
                  },
                );
              },
            ),
          ),
        ],
      ),
    );
  }
}
