import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import '../../core/theme/workshop_theme.dart';
import '../../core/utils/formatters.dart';
import '../../data/models/service_record.dart';
import '../../data/repositories/service_repository.dart';
import '../../data/repositories/customer_repository.dart';
import '../../data/repositories/vehicle_repository.dart';
import '../services/edit_record_sheet.dart';
import '../shell/navigation_provider.dart';
import 'stat_tile.dart';

class DashboardScreen extends ConsumerWidget {
  final VoidCallback onStartIntake;

  const DashboardScreen({super.key, required this.onStartIntake});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final recordsAsync = ref.watch(serviceRecordsStreamProvider);
    final customersAsync = ref.watch(customersStreamProvider);
    final vehiclesAsync = ref.watch(vehiclesStreamProvider);

    return Scaffold(
      backgroundColor: WorkshopTheme.darkCanvas,
      body: CustomScrollView(
        slivers: [
          // Workshop Hero Header (1:1 with React)
          SliverToBoxAdapter(
            child: Padding(
              padding: const EdgeInsets.fromLTRB(20, 24, 20, 20),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text(
                        'Workshop Operations',
                        style: TextStyle(
                          fontSize: 22,
                          fontWeight: FontWeight.w900,
                          letterSpacing: -0.5,
                          color: WorkshopTheme.darkTextPrimary,
                        ),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        'Real-time Service Desk Overview',
                        style: TextStyle(
                          fontSize: 12,
                          fontWeight: FontWeight.w700,
                          letterSpacing: 0.5,
                          color: WorkshopTheme.darkTextMuted,
                        ),
                      ),
                    ],
                  ),

                  // Vehicle Intake Glowing Button
                  FilledButton.icon(
                    onPressed: onStartIntake,
                    icon: const Icon(LucideIcons.plus, size: 16),
                    label: const Text(
                      'Vehicle Intake',
                      style: TextStyle(
                        fontSize: 12,
                        fontWeight: FontWeight.w900,
                        letterSpacing: 0.5,
                      ),
                    ),
                    style: FilledButton.styleFrom(
                      backgroundColor: WorkshopTheme.emeraldAccent,
                      foregroundColor: Colors.black,
                      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(12),
                      ),
                      elevation: 4,
                      shadowColor: WorkshopTheme.emeraldAccent.withValues(alpha: 0.4),
                    ),
                  ),
                ],
              ),
            ),
          ),

          // 4 Watchlist Metric Tiles (with Real 14-day trends calculated from date timestamps)
          SliverToBoxAdapter(
            child: recordsAsync.when(
              loading: () => const Padding(
                padding: EdgeInsets.all(32.0),
                child: Center(
                  child: CircularProgressIndicator(color: WorkshopTheme.emeraldAccent),
                ),
              ),
              error: (err, _) => Padding(
                padding: const EdgeInsets.all(20.0),
                child: Text('Error loading stats: $err',
                    style: const TextStyle(color: Colors.red)),
              ),
              data: (records) {
                final totalCount = records.length;
                final pendingList = records
                    .where((r) =>
                        r.status == ServiceStatus.pending ||
                        r.status == ServiceStatus.inProgress)
                    .toList();
                final completedList = records
                    .where((r) => r.status == ServiceStatus.completed)
                    .toList();

                int totalIssuesAttended = 0;
                for (final r in records) {
                  totalIssuesAttended += r.partsUsed.length;
                }

                // 14-day date buckets (1:1 with React fetchDashboardData)
                final now = DateTime.now();
                final dateKeys = List.generate(14, (i) {
                  final d = now.subtract(Duration(days: 13 - i));
                  return DateFormat('yyyy-MM-dd').format(d);
                });

                final Map<String, int> servicesFreq = {for (var k in dateKeys) k: 0};
                final Map<String, int> pendingFreq = {for (var k in dateKeys) k: 0};
                final Map<String, int> completedFreq = {for (var k in dateKeys) k: 0};
                final Map<String, int> issuesFreq = {for (var k in dateKeys) k: 0};

                for (final r in records) {
                  final dateStr = r.date.split('T').first.trim();
                  if (servicesFreq.containsKey(dateStr)) {
                    servicesFreq[dateStr] = servicesFreq[dateStr]! + 1;
                    if (r.status == ServiceStatus.pending ||
                        r.status == ServiceStatus.inProgress) {
                      pendingFreq[dateStr] = pendingFreq[dateStr]! + 1;
                    } else if (r.status == ServiceStatus.completed) {
                      completedFreq[dateStr] = completedFreq[dateStr]! + 1;
                    }
                    if (r.partsUsed.isNotEmpty) {
                      issuesFreq[dateStr] =
                          issuesFreq[dateStr]! + r.partsUsed.length;
                    }
                  }
                }

                final List<double> servicesTrend =
                    dateKeys.map((k) => servicesFreq[k]!.toDouble()).toList();
                final List<double> pendingTrend =
                    dateKeys.map((k) => pendingFreq[k]!.toDouble()).toList();
                final List<double> completedTrend =
                    dateKeys.map((k) => completedFreq[k]!.toDouble()).toList();
                final List<double> issuesTrend =
                    dateKeys.map((k) => issuesFreq[k]!.toDouble()).toList();

                return Column(
                  children: [
                    StatTile(
                      label: 'Total Services',
                      value: '$totalCount',
                      icon: LucideIcons.clipboardList,
                      color: WorkshopTheme.emeraldAccent,
                      trend: servicesTrend,
                      onTap: () {
                        ref.read(activeStatusFilterProvider.notifier).setFilter(null);
                        ref.read(activeNavTabProvider.notifier).setTab(3); // Services tab
                      },
                    ),
                    StatTile(
                      label: 'Pending Works',
                      value: '${pendingList.length}',
                      icon: LucideIcons.clock,
                      color: WorkshopTheme.statusPending,
                      trend: pendingTrend,
                      onTap: () {
                        ref
                            .read(activeStatusFilterProvider.notifier)
                            .setFilter(ServiceStatus.pending);
                        ref.read(activeNavTabProvider.notifier).setTab(3);
                      },
                    ),
                    StatTile(
                      label: 'Completed Jobs',
                      value: '${completedList.length}',
                      icon: LucideIcons.car,
                      color: WorkshopTheme.emeraldAccent,
                      trend: completedTrend,
                      onTap: () {
                        ref
                            .read(activeStatusFilterProvider.notifier)
                            .setFilter(ServiceStatus.completed);
                        ref.read(activeNavTabProvider.notifier).setTab(3);
                      },
                    ),
                    StatTile(
                      label: 'Issues Attended',
                      value: '$totalIssuesAttended',
                      icon: LucideIcons.wrench,
                      color: WorkshopTheme.blueAccent,
                      trend: issuesTrend,
                      onTap: () {
                        ref.read(activeStatusFilterProvider.notifier).setFilter(null);
                        ref.read(activeNavTabProvider.notifier).setTab(3);
                      },
                    ),
                  ],
                );
              },
            ),
          ),

          // Recent Activities Section Header
          SliverToBoxAdapter(
            child: Padding(
              padding: const EdgeInsets.fromLTRB(20, 28, 20, 12),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  const Text(
                    'RECENT ACTIVITIES',
                    style: TextStyle(
                      fontSize: 11,
                      fontWeight: FontWeight.w900,
                      letterSpacing: 1.5,
                      color: WorkshopTheme.darkTextMuted,
                    ),
                  ),
                  TextButton(
                    onPressed: () {
                      ref.read(activeStatusFilterProvider.notifier).setFilter(null);
                      ref.read(activeNavTabProvider.notifier).setTab(3);
                    },
                    child: const Text(
                      'View All Logs',
                      style: TextStyle(
                        fontSize: 12,
                        fontWeight: FontWeight.w700,
                        color: WorkshopTheme.emeraldAccent,
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ),

          // Recent Activities List (5 items, tapping opens EditRecordSheet)
          recordsAsync.when(
            loading: () => const SliverToBoxAdapter(child: SizedBox.shrink()),
            error: (_, _) => const SliverToBoxAdapter(child: SizedBox.shrink()),
            data: (records) {
              final recentRecords = records.take(5).toList();
              final customers = customersAsync.asData?.value ?? [];
              final vehicles = vehiclesAsync.asData?.value ?? [];

              if (recentRecords.isEmpty) {
                return SliverToBoxAdapter(
                  child: Padding(
                    padding: const EdgeInsets.all(40),
                    child: Center(
                      child: Text(
                        'No service records logged yet.',
                        style: TextStyle(
                          color: WorkshopTheme.darkTextMuted,
                          fontSize: 13,
                        ),
                      ),
                    ),
                  ),
                );
              }

              return SliverList(
                delegate: SliverChildBuilderDelegate(
                  (context, index) {
                    final record = recentRecords[index];
                    final customer = customers
                        .where((c) => c.id == record.customerId)
                        .firstOrNull;
                    final vehicle = vehicles
                        .where((v) => v.id == record.vehicleId)
                        .firstOrNull;

                    Color statusColor;
                    String statusLabel;
                    switch (record.status) {
                      case ServiceStatus.completed:
                        statusColor = WorkshopTheme.statusSuccess;
                        statusLabel = 'COMPLETED';
                        break;
                      case ServiceStatus.inProgress:
                        statusColor = WorkshopTheme.statusPending;
                        statusLabel = 'IN PROGRESS';
                        break;
                      case ServiceStatus.cancelled:
                        statusColor = Colors.grey;
                        statusLabel = 'CANCELLED';
                        break;
                      case ServiceStatus.pending:
                        statusColor = WorkshopTheme.statusUrgent;
                        statusLabel = 'PENDING';
                        break;
                    }

                    return Container(
                      margin: const EdgeInsets.symmetric(
                          horizontal: 16, vertical: 4),
                      decoration: BoxDecoration(
                        color: const Color(0xFF0A0C10),
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(
                            color: WorkshopTheme.darkBorder, width: 1),
                      ),
                      child: ListTile(
                        contentPadding: const EdgeInsets.symmetric(
                            horizontal: 16, vertical: 8),
                        onTap: () {
                          showModalBottomSheet(
                            context: context,
                            isScrollControlled: true,
                            backgroundColor: Colors.transparent,
                            builder: (ctx) => EditRecordSheet(
                              record: record,
                              customer: customer,
                              vehicle: vehicle,
                            ),
                          );
                        },
                        leading: Container(
                          width: 42,
                          height: 42,
                          decoration: BoxDecoration(
                            color: WorkshopTheme.darkSurface,
                            borderRadius: BorderRadius.circular(10),
                            border: Border.all(color: WorkshopTheme.darkBorder),
                          ),
                          child: const Center(
                            child: Icon(
                              LucideIcons.wrench,
                              color: WorkshopTheme.emeraldAccent,
                              size: 18,
                            ),
                          ),
                        ),
                        title: Row(
                          children: [
                            Text(
                              vehicle?.plateNumber ?? 'REG NO',
                              style: WorkshopTheme.mono(
                                fontSize: 13,
                                fontWeight: FontWeight.w900,
                                color: WorkshopTheme.blueAccent,
                              ),
                            ),
                            const SizedBox(width: 8),
                            Expanded(
                              child: Text(
                                '${vehicle?.make ?? ''} ${vehicle?.model ?? ''}'.trim(),
                                style: const TextStyle(
                                  fontSize: 14,
                                  fontWeight: FontWeight.w800,
                                  color: WorkshopTheme.darkTextPrimary,
                                ),
                                overflow: TextOverflow.ellipsis,
                              ),
                            ),
                          ],
                        ),
                        subtitle: Padding(
                          padding: const EdgeInsets.only(top: 4),
                          child: Text(
                            Formatters.capitalize(customer?.name ?? 'Client'),
                            style: const TextStyle(
                              fontSize: 12,
                              color: WorkshopTheme.darkTextMuted,
                            ),
                          ),
                        ),
                        trailing: Container(
                          padding: const EdgeInsets.symmetric(
                              horizontal: 8, vertical: 4),
                          decoration: BoxDecoration(
                            color: statusColor.withValues(alpha: 0.12),
                            borderRadius: BorderRadius.circular(6),
                            border: Border.all(
                              color: statusColor.withValues(alpha: 0.4),
                              width: 0.8,
                            ),
                          ),
                          child: Text(
                            statusLabel,
                            style: TextStyle(
                              fontSize: 10,
                              fontWeight: FontWeight.w900,
                              letterSpacing: 0.8,
                              color: statusColor,
                            ),
                          ),
                        ),
                      ),
                    );
                  },
                  childCount: recentRecords.length,
                ),
              );
            },
          ),
          const SliverToBoxAdapter(child: SizedBox(height: 100)),
        ],
      ),
    );
  }
}
