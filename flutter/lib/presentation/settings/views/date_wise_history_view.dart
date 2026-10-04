import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import '../../../core/theme/workshop_theme.dart';
import '../../../data/models/service_record.dart';
import '../../../data/models/customer.dart';
import '../../../data/models/vehicle.dart';
import '../../services/edit_record_sheet.dart';

class DateWiseHistoryView extends StatefulWidget {
  final List<ServiceRecord> records;
  final List<Customer> customers;
  final List<Vehicle> vehicles;
  final bool loading;
  final VoidCallback onRefresh;
  final String searchQuery;
  final VoidCallback onClearSearch;
  final DateTime? dateFilter;
  final VoidCallback onClearDateFilter;

  const DateWiseHistoryView({
    super.key,
    required this.records,
    required this.customers,
    required this.vehicles,
    required this.loading,
    required this.onRefresh,
    required this.searchQuery,
    required this.onClearSearch,
    required this.dateFilter,
    required this.onClearDateFilter,
  });

  @override
  State<DateWiseHistoryView> createState() => _DateWiseHistoryViewState();
}

class _DateWiseHistoryViewState extends State<DateWiseHistoryView> {
  ServiceStatus? _selectedStatus; // null = 'all'

  List<String> _extractFirstIssues(String? description, {int limit = 2}) {
    if (description == null || description.isEmpty) return [];
    return description
        .split('\n')
        .map((line) => line.replaceAll(RegExp(r'^[-*•\s]*(\[[xXvV\s✓✔]*\]|\d+[\.)])?\s*'), '').trim())
        .where((line) => line.isNotEmpty)
        .take(limit)
        .toList();
  }

  Color _getStatusColor(ServiceStatus status) {
    switch (status) {
      case ServiceStatus.completed:
        return WorkshopTheme.statusSuccess;
      case ServiceStatus.inProgress:
        return WorkshopTheme.statusPending;
      case ServiceStatus.pending:
        return WorkshopTheme.statusUrgent;
      case ServiceStatus.cancelled:
        return const Color(0xFF94A3B8);
    }
  }

  String _formatDateHeader(DateTime date) {
    final now = DateTime.now();
    if (date.year == now.year) {
      return DateFormat('EEE, d MMM').format(date);
    }
    return DateFormat('EEE, d MMM yyyy').format(date);
  }

  @override
  Widget build(BuildContext context) {
    final customerMap = {for (var c in widget.customers) c.id: c};
    final vehicleMap = {for (var v in widget.vehicles) v.id: v};

    // 1. Filter records
    final filtered = widget.records.filter((r) {
      if (_selectedStatus != null && r.status != _selectedStatus) {
        return false;
      }

      if (widget.dateFilter != null) {
        final d = DateTime.tryParse(r.date);
        if (d == null) return false;
        if (d.year != widget.dateFilter!.year ||
            d.month != widget.dateFilter!.month ||
            d.day != widget.dateFilter!.day) {
          return false;
        }
      }

      if (widget.searchQuery.trim().isNotEmpty) {
        final q = widget.searchQuery.trim().toLowerCase();
        final vehicle = vehicleMap[r.vehicleId];
        final customer = customerMap[r.customerId];

        final plate = vehicle?.plateNumber.toLowerCase() ?? '';
        final make = vehicle?.make.toLowerCase() ?? '';
        final model = vehicle?.model.toLowerCase() ?? '';
        final custName = customer?.name.toLowerCase() ?? '';
        final desc = r.description.toLowerCase();
        final rawDate = r.date.toLowerCase();

        final matches = plate.contains(q) ||
            make.contains(q) ||
            model.contains(q) ||
            '$make $model'.contains(q) ||
            custName.contains(q) ||
            desc.contains(q) ||
            rawDate.contains(q);

        if (!matches) return false;
      }

      return true;
    }).toList();

    // 2. Group by date
    final grouped = <String, List<ServiceRecord>>{};
    for (final r in filtered) {
      final dateKey = r.date.split('T').first;
      grouped.putIfAbsent(dateKey, () => []).add(r);
    }

    final sortedDates = grouped.keys.toList()
      ..sort((a, b) => b.compareTo(a));

    return ListView(
      padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
      children: [
        // Status Filter Tabs + Refresh
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Expanded(
              child: SingleChildScrollView(
                scrollDirection: Axis.horizontal,
                child: Row(
                  children: [
                    _buildStatusTab('All', null),
                    _buildStatusTab('Pending', ServiceStatus.pending),
                    _buildStatusTab('In Progress', ServiceStatus.inProgress),
                    _buildStatusTab('Completed', ServiceStatus.completed),
                    _buildStatusTab('Cancelled', ServiceStatus.cancelled),
                  ],
                ),
              ),
            ),
            IconButton(
              onPressed: widget.onRefresh,
              icon: widget.loading
                  ? const SizedBox(
                      width: 14,
                      height: 14,
                      child: CircularProgressIndicator(strokeWidth: 2, color: WorkshopTheme.emeraldAccent),
                    )
                  : const Icon(LucideIcons.refreshCw, size: 16, color: WorkshopTheme.darkTextMuted),
              tooltip: 'Refresh Records',
            ),
          ],
        ),

        const Divider(height: 1, color: WorkshopTheme.darkBorder),
        const SizedBox(height: 12),

        // Active Filter Chips
        if (widget.dateFilter != null || widget.searchQuery.isNotEmpty) ...[
          Wrap(
            spacing: 8,
            runSpacing: 8,
            crossAxisAlignment: WrapCrossAlignment.center,
            children: [
              if (widget.dateFilter != null)
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                  decoration: BoxDecoration(
                    color: WorkshopTheme.emeraldAccent.withValues(alpha: 0.15),
                    borderRadius: BorderRadius.circular(8),
                    border: Border.all(color: WorkshopTheme.emeraldAccent.withValues(alpha: 0.3)),
                  ),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      const Icon(LucideIcons.calendar, size: 12, color: WorkshopTheme.emeraldAccent),
                      const SizedBox(width: 6),
                      Text(
                        DateFormat('EEE, d MMM yyyy').format(widget.dateFilter!),
                        style: const TextStyle(
                          fontSize: 11,
                          fontWeight: FontWeight.w700,
                          color: WorkshopTheme.emeraldAccent,
                        ),
                      ),
                      const SizedBox(width: 4),
                      InkWell(
                        onTap: widget.onClearDateFilter,
                        child: const Icon(LucideIcons.x, size: 13, color: WorkshopTheme.emeraldAccent),
                      ),
                    ],
                  ),
                ),
              if (widget.searchQuery.isNotEmpty)
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
                      const Icon(LucideIcons.search, size: 12, color: WorkshopTheme.darkTextMuted),
                      const SizedBox(width: 6),
                      Text(
                        '"${widget.searchQuery}"',
                        style: const TextStyle(
                          fontSize: 11,
                          fontWeight: FontWeight.w600,
                          color: WorkshopTheme.darkTextPrimary,
                        ),
                      ),
                      const SizedBox(width: 4),
                      InkWell(
                        onTap: widget.onClearSearch,
                        child: const Icon(LucideIcons.x, size: 13, color: WorkshopTheme.darkTextMuted),
                      ),
                    ],
                  ),
                ),
              TextButton(
                onPressed: () {
                  widget.onClearSearch();
                  widget.onClearDateFilter();
                },
                child: const Text(
                  'Clear all',
                  style: TextStyle(
                    fontSize: 11,
                    color: WorkshopTheme.darkTextMuted,
                    decoration: TextDecoration.underline,
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 14),
        ],

        // Empty state
        if (sortedDates.isEmpty && !widget.loading)
          Container(
            padding: const EdgeInsets.symmetric(vertical: 64),
            alignment: Alignment.center,
            child: Column(
              children: [
                Container(
                  width: 48,
                  height: 48,
                  decoration: BoxDecoration(
                    color: WorkshopTheme.darkSurface,
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(color: WorkshopTheme.darkBorder),
                  ),
                  child: const Icon(LucideIcons.calendar, size: 24, color: WorkshopTheme.darkTextMuted),
                ),
                const SizedBox(height: 12),
                const Text(
                  'No service records found',
                  style: TextStyle(
                    fontSize: 14,
                    fontWeight: FontWeight.w700,
                    color: WorkshopTheme.darkTextPrimary,
                  ),
                ),
                const SizedBox(height: 4),
                const Text(
                  'Try adjusting your search query, date, or status filter.',
                  style: TextStyle(
                    fontSize: 12,
                    color: WorkshopTheme.darkTextMuted,
                  ),
                ),
              ],
            ),
          )
        else
          // Grouped Timeline
          ...sortedDates.map((dateKey) {
            final recordsUnderDate = grouped[dateKey]!;
            final parsedDate = DateTime.tryParse(dateKey) ?? DateTime.now();

            return Padding(
              padding: const EdgeInsets.only(bottom: 24),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Date Header
                  Text(
                    _formatDateHeader(parsedDate),
                    style: const TextStyle(
                      fontSize: 15,
                      fontWeight: FontWeight.w700,
                      color: WorkshopTheme.darkTextPrimary,
                    ),
                  ),
                  const SizedBox(height: 10),

                  // Cards List
                  ...recordsUnderDate.map((record) {
                    final vehicle = vehicleMap[record.vehicleId];
                    final customer = customerMap[record.customerId];
                    final plate = vehicle?.plateNumber ?? 'NO PLATE';
                    final model = vehicle != null
                        ? '${vehicle.make} ${vehicle.model}'.trim()
                        : 'Vehicle';
                    final statusColor = _getStatusColor(record.status);
                    final issues = _extractFirstIssues(record.description, limit: 2);

                    return Container(
                      margin: const EdgeInsets.only(bottom: 10),
                      child: InkWell(
                        onTap: () {
                          showModalBottomSheet(
                            context: context,
                            isScrollControlled: true,
                            backgroundColor: Colors.transparent,
                            builder: (_) => EditRecordSheet(
                              record: record,
                              customer: customer,
                              vehicle: vehicle,
                            ),
                          );
                        },
                        borderRadius: BorderRadius.circular(16),
                        child: Container(
                          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
                          decoration: BoxDecoration(
                            color: const Color(0xFF0A0D14),
                            borderRadius: BorderRadius.circular(16),
                            border: Border.all(color: WorkshopTheme.darkBorder.withValues(alpha: 0.6)),
                          ),
                          child: Row(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              // Glowing Status Blip
                              Container(
                                margin: const EdgeInsets.only(top: 4, right: 12),
                                width: 9,
                                height: 9,
                                decoration: BoxDecoration(
                                  color: statusColor,
                                  shape: BoxShape.circle,
                                  boxShadow: [
                                    BoxShadow(
                                      color: statusColor.withValues(alpha: 0.5),
                                      blurRadius: 6,
                                      spreadRadius: 1,
                                    ),
                                  ],
                                ),
                              ),

                              // Main Info
                              Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Text(
                                      plate,
                                      style: WorkshopTheme.plateNumber(
                                        fontSize: 14,
                                        fontWeight: FontWeight.w800,
                                        color: WorkshopTheme.darkTextPrimary,
                                      ),
                                    ),
                                    const SizedBox(height: 2),
                                    Text(
                                      model,
                                      style: const TextStyle(
                                        fontSize: 12.5,
                                        color: WorkshopTheme.darkTextMuted,
                                      ),
                                    ),
                                    if (issues.isNotEmpty) ...[
                                      const SizedBox(height: 8),
                                      ...issues.map((issue) {
                                        return Padding(
                                          padding: const EdgeInsets.only(bottom: 2),
                                          child: Row(
                                            children: [
                                              Container(
                                                width: 3.5,
                                                height: 3.5,
                                                decoration: const BoxDecoration(
                                                  color: WorkshopTheme.darkTextMuted,
                                                  shape: BoxShape.circle,
                                                ),
                                              ),
                                              const SizedBox(width: 6),
                                              Expanded(
                                                child: Text(
                                                  issue,
                                                  style: const TextStyle(
                                                    fontSize: 12,
                                                    color: Color(0xFFD1D5DB),
                                                  ),
                                                  overflow: TextOverflow.ellipsis,
                                                ),
                                              ),
                                            ],
                                          ),
                                        );
                                      }),
                                    ],
                                  ],
                                ),
                              ),

                              const SizedBox(width: 8),
                              const Align(
                                alignment: Alignment.centerRight,
                                child: Icon(
                                  LucideIcons.chevronRight,
                                  size: 16,
                                  color: WorkshopTheme.darkTextMuted,
                                ),
                              ),
                            ],
                          ),
                        ),
                      ),
                    );
                  }),
                ],
              ),
            );
          }),
      ],
    );
  }

  Widget _buildStatusTab(String label, ServiceStatus? status) {
    final isSelected = _selectedStatus == status;
    return InkWell(
      onTap: () => setState(() => _selectedStatus = status),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
        decoration: BoxDecoration(
          border: Border(
            bottom: BorderSide(
              color: isSelected ? WorkshopTheme.darkTextPrimary : Colors.transparent,
              width: 2.5,
            ),
          ),
        ),
        child: Text(
          label,
          style: TextStyle(
            fontSize: 12.5,
            fontWeight: isSelected ? FontWeight.w800 : FontWeight.w600,
            color: isSelected ? WorkshopTheme.darkTextPrimary : WorkshopTheme.darkTextMuted,
          ),
        ),
      ),
    );
  }
}

extension<T> on List<T> {
  Iterable<T> filter(bool Function(T) test) sync* {
    for (var element in this) {
      if (test(element)) yield element;
    }
  }
}
