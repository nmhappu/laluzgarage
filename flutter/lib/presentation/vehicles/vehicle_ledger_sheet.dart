import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import '../../core/theme/workshop_theme.dart';
import '../../core/utils/formatters.dart';
import '../../core/utils/native_actions.dart';
import '../../data/models/vehicle.dart';
import '../../data/models/customer.dart';
import '../../data/repositories/service_repository.dart';
import '../services/edit_record_sheet.dart';

class VehicleLedgerSheet extends ConsumerWidget {
  final Vehicle vehicle;
  final Customer? customer;

  const VehicleLedgerSheet({
    super.key,
    required this.vehicle,
    this.customer,
  });

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final allRecords = ref.watch(serviceRecordsStreamProvider).asData?.value ?? [];
    final vehicleRecords = allRecords.where((r) => r.vehicleId == vehicle.id).toList();

    final totalSpend = vehicleRecords.fold(0.0, (sum, r) => sum + r.totalCost);
    final lastMileage = vehicleRecords.isNotEmpty
        ? (vehicleRecords.first.completionMileage ?? vehicleRecords.first.mileage)
        : 0;

    return Container(
      height: MediaQuery.of(context).size.height * 0.88,
      decoration: const BoxDecoration(
        color: WorkshopTheme.darkSurface,
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      child: SafeArea(
        top: false,
        child: Column(
          children: [
            // Drag handle
            const SizedBox(height: 12),
          Container(
            width: 44,
            height: 4,
            decoration: BoxDecoration(
              color: WorkshopTheme.darkBorder,
              borderRadius: BorderRadius.circular(2),
            ),
          ),
          const SizedBox(height: 16),

          // Header
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 20),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      '${vehicle.make} ${vehicle.model}'.toUpperCase(),
                      style: const TextStyle(
                        fontSize: 18,
                        fontWeight: FontWeight.w900,
                        color: WorkshopTheme.emeraldAccent,
                      ),
                    ),
                    Text(
                      '${vehicle.color} • ${vehicle.isKey ? 'Physical Key' : 'Screen PIN: ${vehicle.passwordOrPin}'}',
                      style: TextStyle(color: WorkshopTheme.darkTextMuted, fontSize: 13),
                    ),
                  ],
                ),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                  decoration: BoxDecoration(
                    color: WorkshopTheme.blueAccent.withValues(alpha: 0.15),
                    borderRadius: BorderRadius.circular(8),
                    border: Border.all(color: WorkshopTheme.blueAccent.withValues(alpha: 0.4)),
                  ),
                  child: Text(
                    vehicle.plateNumber,
                    style: const TextStyle(
                      fontWeight: FontWeight.w900,
                      fontSize: 16,
                      letterSpacing: 1.2,
                      color: WorkshopTheme.blueAccent,
                    ),
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 16),

          // Summary Metrics Strip
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 20),
            child: Row(
              children: [
                Expanded(
                  child: Container(
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: WorkshopTheme.darkCard,
                      borderRadius: BorderRadius.circular(10),
                      border: Border.all(color: WorkshopTheme.darkBorder),
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text('LIFETIME SPEND',
                            style: TextStyle(
                              fontSize: 10,
                              fontWeight: FontWeight.w800,
                              color: WorkshopTheme.darkTextMuted,
                            )),
                        const SizedBox(height: 4),
                        Text(
                          Formatters.currency(totalSpend),
                          style: WorkshopTheme.numeric(
                            fontSize: 17,
                            fontWeight: FontWeight.w900,
                            color: WorkshopTheme.emeraldAccent,
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: Container(
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: WorkshopTheme.darkCard,
                      borderRadius: BorderRadius.circular(10),
                      border: Border.all(color: WorkshopTheme.darkBorder),
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text('TOTAL SERVICES',
                            style: TextStyle(
                              fontSize: 10,
                              fontWeight: FontWeight.w800,
                              color: WorkshopTheme.darkTextMuted,
                            )),
                        const SizedBox(height: 4),
                        Text(
                          '${vehicleRecords.length} visits',
                          style: WorkshopTheme.numeric(
                            fontSize: 17,
                            fontWeight: FontWeight.w900,
                            color: WorkshopTheme.darkTextPrimary,
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: Container(
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: WorkshopTheme.darkCard,
                      borderRadius: BorderRadius.circular(10),
                      border: Border.all(color: WorkshopTheme.darkBorder),
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text('LAST ODOMETER',
                            style: TextStyle(
                              fontSize: 10,
                              fontWeight: FontWeight.w800,
                              color: WorkshopTheme.darkTextMuted,
                            )),
                        const SizedBox(height: 4),
                        Text(
                          '$lastMileage km',
                          style: WorkshopTheme.numeric(
                            fontSize: 17,
                            fontWeight: FontWeight.w900,
                            color: WorkshopTheme.darkTextPrimary,
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 16),

          // Owner Strip
          if (customer != null)
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 20),
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                decoration: BoxDecoration(
                  color: WorkshopTheme.darkCard,
                  borderRadius: BorderRadius.circular(10),
                  border: Border.all(color: WorkshopTheme.darkBorder),
                ),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Row(
                      children: [
                        const Icon(LucideIcons.user, size: 18, color: WorkshopTheme.darkTextMuted),
                        const SizedBox(width: 10),
                        Text(
                          '${customer!.name} (${customer!.phone})',
                          style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 13),
                        ),
                      ],
                    ),
                    IconButton(
                      icon: const Icon(LucideIcons.phone, size: 18, color: WorkshopTheme.blueAccent),
                      onPressed: () => NativeActions.callPhone(customer!.phone),
                    ),
                  ],
                ),
              ),
            ),
          const SizedBox(height: 16),

          // Timeline Header
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 20),
            child: Row(
              children: [
                Text(
                  'SERVICE RECORD TIMELINE',
                  style: TextStyle(
                    fontSize: 11,
                    fontWeight: FontWeight.w800,
                    letterSpacing: 1.2,
                    color: WorkshopTheme.darkTextMuted,
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 8),

          // Chronological Records List
          Expanded(
            child: vehicleRecords.isEmpty
                ? Center(
                    child: Text(
                      'No past service records for this vehicle.',
                      style: TextStyle(color: WorkshopTheme.darkTextMuted),
                    ),
                  )
                : ListView.builder(
                    padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 6),
                    itemCount: vehicleRecords.length,
                    itemBuilder: (ctx, idx) {
                      final record = vehicleRecords[idx];
                      return Container(
                        margin: const EdgeInsets.only(bottom: 8),
                        decoration: BoxDecoration(
                          color: WorkshopTheme.darkCard,
                          borderRadius: BorderRadius.circular(10),
                          border: Border.all(color: WorkshopTheme.darkBorder),
                        ),
                        child: ListTile(
                          contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 6),
                          title: Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              Text(
                                Formatters.formatDate(record.date),
                                style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 14),
                              ),
                              Text(
                                Formatters.currency(record.totalCost),
                                style: WorkshopTheme.numeric(
                                  fontSize: 15,
                                  fontWeight: FontWeight.w900,
                                  color: WorkshopTheme.emeraldAccent,
                                ),
                              ),
                            ],
                          ),
                          subtitle: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              const SizedBox(height: 4),
                              Text(
                                'Mileage: ${record.mileage} km • ${record.status.name.toUpperCase()}',
                                style: TextStyle(color: WorkshopTheme.darkTextMuted, fontSize: 12),
                              ),
                              if (record.description.isNotEmpty) ...[
                                const SizedBox(height: 2),
                                Text(
                                  record.description.replaceAll(RegExp(r'\[[x ]\]\s*'), ''),
                                  maxLines: 1,
                                  overflow: TextOverflow.ellipsis,
                                  style: TextStyle(color: WorkshopTheme.darkTextMuted.withValues(alpha: 0.8), fontSize: 11),
                                ),
                              ],
                            ],
                          ),
                          trailing: const Icon(LucideIcons.chevronRight, size: 16),
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
                        ),
                      );
                    },
                  ),
          ),
        ],
      ),
    ),
  );
}
}
