import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import '../../core/theme/workshop_theme.dart';
import '../../core/utils/formatters.dart';
import '../../core/utils/native_actions.dart';
import '../../data/models/service_record.dart';
import '../../data/models/customer.dart';
import '../../data/models/vehicle.dart';
import '../../data/models/whatsapp_preset.dart';
import '../common/brand_icons.dart';
import 'delivery_bill_dialog.dart';

class ServiceRecordCard extends StatelessWidget {
  final ServiceRecord record;
  final Customer? customer;
  final Vehicle? vehicle;
  final VoidCallback onTap;
  final VoidCallback? onEditDetails;
  final VoidCallback? onDelete;
  final bool canDelete;

  const ServiceRecordCard({
    super.key,
    required this.record,
    this.customer,
    this.vehicle,
    required this.onTap,
    this.onEditDetails,
    this.onDelete,
    this.canDelete = false,
  });

  @override
  Widget build(BuildContext context) {
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

    // Parse intake date
    DateTime parsedDate;
    try {
      parsedDate = DateTime.parse(record.date);
    } catch (_) {
      parsedDate = DateTime.now();
    }
    final monthStr = DateFormat('MMM').format(parsedDate).toUpperCase();
    final dayStr = DateFormat('dd').format(parsedDate);

    // Parse Due Date Info
    Widget? dueDateBadge;
    if (record.expectedDeliveryDate != null &&
        record.status != ServiceStatus.completed) {
      try {
        final expectedDate = DateTime.parse(record.expectedDeliveryDate!);
        final now = DateTime.now();
        final today = DateTime(now.year, now.month, now.day);
        final due = DateTime(expectedDate.year, expectedDate.month, expectedDate.day);
        final diffDays = due.difference(today).inDays;

        if (diffDays == 0) {
          dueDateBadge = Container(
            padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
            decoration: BoxDecoration(
              color: WorkshopTheme.statusPending.withValues(alpha: 0.15),
              borderRadius: BorderRadius.circular(4),
              border: Border.all(color: WorkshopTheme.statusPending.withValues(alpha: 0.4)),
            ),
            child: const Text(
              'Due Today',
              style: TextStyle(
                color: WorkshopTheme.statusPending,
                fontSize: 10,
                fontWeight: FontWeight.w800,
              ),
            ),
          );
        } else if (diffDays < 0) {
          dueDateBadge = Container(
            padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
            decoration: BoxDecoration(
              color: WorkshopTheme.statusUrgent.withValues(alpha: 0.15),
              borderRadius: BorderRadius.circular(4),
              border: Border.all(color: WorkshopTheme.statusUrgent.withValues(alpha: 0.4)),
            ),
            child: Text(
              '${diffDays.abs()} Days Overdue',
              style: const TextStyle(
                color: WorkshopTheme.statusUrgent,
                fontSize: 10,
                fontWeight: FontWeight.w800,
              ),
            ),
          );
        } else {
          dueDateBadge = Container(
            padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
            decoration: BoxDecoration(
              color: WorkshopTheme.blueAccent.withValues(alpha: 0.12),
              borderRadius: BorderRadius.circular(4),
              border: Border.all(color: WorkshopTheme.blueAccent.withValues(alpha: 0.3)),
            ),
            child: Text(
              '$diffDays Days Left',
              style: const TextStyle(
                color: WorkshopTheme.blueAccent,
                fontSize: 10,
                fontWeight: FontWeight.w800,
              ),
            ),
          );
        }
      } catch (_) {}
    }

    // Clean description lines (remove [ ] or bullet characters)
    final cleanLines = (record.description)
        .split('\n')
        .map((line) => line
            .replaceAll(RegExp(r'^\[[x ]\]\s*'), '')
            .replaceAll(RegExp(r'^(\d+[\.\)]|[-*•])\s*'), '')
            .trim())
        .where((l) => l.isNotEmpty)
        .toList();

    final isOla = (vehicle?.make ?? '').toLowerCase().contains('ola') ||
        (vehicle?.model ?? '').toLowerCase().contains('ola');

    return Container(
      margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
      decoration: BoxDecoration(
        color: const Color(0xFF0A0C10),
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: WorkshopTheme.darkBorder, width: 1),
      ),
      child: Stack(
        children: [
          // Top Accent Fading Bar (1:1 with React)
          Positioned(
            top: 0,
            left: 0,
            right: 0,
            child: Center(
              child: Container(
                width: 140,
                height: 2,
                decoration: BoxDecoration(
                  gradient: LinearGradient(
                    colors: [
                      Colors.transparent,
                      statusColor,
                      Colors.transparent,
                    ],
                  ),
                ),
              ),
            ),
          ),

          // Ola Watermark Background (1:1 with React)
          if (isOla)
            Positioned(
              bottom: 60,
              right: 12,
              child: BrandIcons.olaWatermark(width: 170),
            ),

          InkWell(
            onTap: onTap,
            borderRadius: BorderRadius.circular(14),
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Row 1: Intake Date Badge & Status Chip
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Row(
                        children: [
                          Text(
                            monthStr,
                            style: const TextStyle(
                              fontSize: 10,
                              fontWeight: FontWeight.w900,
                              letterSpacing: 1.5,
                              color: WorkshopTheme.darkTextMuted,
                            ),
                          ),
                          const SizedBox(width: 6),
                          Text(
                            dayStr,
                            style: WorkshopTheme.numeric(
                              fontSize: 18,
                              fontWeight: FontWeight.w900,
                              color: WorkshopTheme.darkTextPrimary,
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(width: 8),
                      Expanded(
                        child: Container(
                          height: 1,
                          color: WorkshopTheme.darkBorderSubtle,
                        ),
                      ),
                      const SizedBox(width: 8),

                      if (dueDateBadge != null) ...[
                        dueDateBadge,
                        const SizedBox(width: 6),
                      ],

                      // Status Badge
                      Container(
                        padding: const EdgeInsets.symmetric(
                            horizontal: 8, vertical: 3),
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
                            letterSpacing: 1,
                            color: statusColor,
                          ),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 12),

                  // Customer Name
                  Text(
                    Formatters.capitalize(customer?.name ?? 'Customer'),
                    style: const TextStyle(
                      fontSize: 16,
                      fontWeight: FontWeight.w900,
                      letterSpacing: -0.2,
                      color: WorkshopTheme.darkTextPrimary,
                    ),
                  ),
                  const SizedBox(height: 6),

                  // Vehicle Row: Plate Number + Make/Model
                  Row(
                    children: [
                      Text(
                        vehicle?.plateNumber ?? 'REG NO',
                        style: WorkshopTheme.mono(
                          fontSize: 14,
                          fontWeight: FontWeight.w900,
                          letterSpacing: 1.2,
                          color: WorkshopTheme.blueAccent,
                        ),
                      ),
                      const SizedBox(width: 8),
                      const Text(
                        '|',
                        style: TextStyle(
                          color: WorkshopTheme.darkTextMuted,
                          fontSize: 12,
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
                  const SizedBox(height: 8),

                  // Mileage Progression & Key / PIN Row
                  Row(
                    children: [
                      // Mileage Indicator
                      if (record.isDeadVehicle)
                        Container(
                          padding: const EdgeInsets.symmetric(
                              horizontal: 6, vertical: 2),
                          decoration: BoxDecoration(
                            color: WorkshopTheme.statusUrgent,
                            borderRadius: BorderRadius.circular(4),
                          ),
                          child: const Text(
                            'DEAD',
                            style: TextStyle(
                              color: Colors.white,
                              fontSize: 10,
                              fontWeight: FontWeight.w900,
                            ),
                          ),
                        )
                      else if (record.isUnknownMileage)
                        Container(
                          padding: const EdgeInsets.symmetric(
                              horizontal: 6, vertical: 2),
                          decoration: BoxDecoration(
                            color: Colors.white,
                            borderRadius: BorderRadius.circular(4),
                          ),
                          child: const Text(
                            'LOCKED',
                            style: TextStyle(
                              color: Colors.black,
                              fontSize: 10,
                              fontWeight: FontWeight.w900,
                            ),
                          ),
                        )
                      else
                        Text(
                          '${Formatters.formatOdometer(record.mileage)} KM',
                          style: const TextStyle(
                            fontSize: 12,
                            fontWeight: FontWeight.w800,
                            color: WorkshopTheme.statusPending,
                          ),
                        ),

                      if (record.completionMileage != null &&
                          record.completionMileage! > 0) ...[
                        const SizedBox(width: 6),
                        const Icon(LucideIcons.arrowRight,
                            size: 12, color: WorkshopTheme.darkTextMuted),
                        const SizedBox(width: 6),
                        Text(
                          '${Formatters.formatOdometer(record.completionMileage!)} KM',
                          style: const TextStyle(
                            fontSize: 12,
                            fontWeight: FontWeight.w800,
                            color: WorkshopTheme.statusSuccess,
                          ),
                        ),
                      ],

                      if (vehicle != null && vehicle!.passwordOrPin.isNotEmpty) ...[
                        const SizedBox(width: 8),
                        const Text(
                          '|',
                          style: TextStyle(
                            color: WorkshopTheme.darkTextMuted,
                            fontSize: 12,
                          ),
                        ),
                        const SizedBox(width: 8),
                        if (vehicle!.isKey) ...[
                          const Icon(LucideIcons.key,
                              color: WorkshopTheme.statusSuccess, size: 14),
                          const SizedBox(width: 4),
                          const Text(
                            'KEY',
                            style: TextStyle(
                              color: WorkshopTheme.statusSuccess,
                              fontSize: 12,
                              fontWeight: FontWeight.w900,
                              letterSpacing: 0.5,
                            ),
                          ),
                        ] else ...[
                          Text(
                            '# ${vehicle!.passwordOrPin}',
                            style: WorkshopTheme.numeric(
                              color: WorkshopTheme.statusSuccess,
                              fontSize: 12,
                              fontWeight: FontWeight.w800,
                            ),
                          ),
                        ],
                      ],
                    ],
                  ),

                  // Checklist Tasks (Bullet points)
                  if (cleanLines.isNotEmpty) ...[
                    const SizedBox(height: 10),
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: cleanLines.take(3).map((task) {
                        return Padding(
                          padding: const EdgeInsets.only(bottom: 3),
                          child: Row(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              const Text(
                                '• ',
                                style: TextStyle(
                                  color: WorkshopTheme.emeraldAccent,
                                  fontWeight: FontWeight.w900,
                                  fontSize: 12,
                                ),
                              ),
                              Expanded(
                                child: Text(
                                  task,
                                  style: const TextStyle(
                                    fontSize: 12,
                                    fontStyle: FontStyle.italic,
                                    color: WorkshopTheme.darkTextMuted,
                                  ),
                                  maxLines: 1,
                                  overflow: TextOverflow.ellipsis,
                                ),
                              ),
                            ],
                          ),
                        );
                      }).toList(),
                    ),
                  ],

                  const SizedBox(height: 14),
                  const Divider(height: 1, color: WorkshopTheme.darkBorderSubtle),
                  const SizedBox(height: 10),

                  // Bottom Action Bar: Grand Total & Contact Buttons
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      // Grand Total
                      Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Text(
                            'ESTIMATE / TOTAL',
                            style: TextStyle(
                              fontSize: 9,
                              fontWeight: FontWeight.w800,
                              letterSpacing: 1,
                              color: WorkshopTheme.darkTextMuted,
                            ),
                          ),
                          Text(
                            Formatters.formatCurrency(record.totalCost),
                            style: WorkshopTheme.numeric(
                              fontSize: 16,
                              fontWeight: FontWeight.w900,
                              color: WorkshopTheme.darkTextPrimary,
                            ),
                          ),
                        ],
                      ),

                      // Quick Action Buttons (Contacts, Call, WhatsApp)
                      Row(
                        children: [
                          if (customer?.phone.isNotEmpty == true) ...[
                            IconButton(
                              icon: const Icon(LucideIcons.userPlus,
                                  size: 16, color: WorkshopTheme.blueAccent),
                              tooltip: 'Save to Contacts',
                              style: IconButton.styleFrom(
                                backgroundColor: WorkshopTheme.blueAccent
                                    .withValues(alpha: 0.12),
                                padding: const EdgeInsets.all(8),
                              ),
                              onPressed: () {
                                NativeActions.createContact(
                                  name: customer!.name,
                                  phone: customer!.phone,
                                  vehicleInfo: vehicle != null
                                      ? '${vehicle!.make} ${vehicle!.model} (${vehicle!.plateNumber})'
                                      : null,
                                );
                              },
                            ),
                            const SizedBox(width: 8),
                            IconButton(
                              icon: const Icon(LucideIcons.phone,
                                  size: 16, color: WorkshopTheme.darkTextMuted),
                              tooltip: 'Call Customer',
                              style: IconButton.styleFrom(
                                backgroundColor: WorkshopTheme.darkSurface,
                                padding: const EdgeInsets.all(8),
                              ),
                              onPressed: () {
                                NativeActions.callPhone(customer!.phone);
                              },
                            ),
                            const SizedBox(width: 8),
                            IconButton(
                              icon: const Icon(LucideIcons.messageSquare,
                                  size: 16, color: WorkshopTheme.emeraldAccent),
                              tooltip: record.status == ServiceStatus.completed
                                  ? 'Delivery Message & Bill'
                                  : 'Intake Notification',
                              style: IconButton.styleFrom(
                                backgroundColor: WorkshopTheme.emeraldAccent
                                    .withValues(alpha: 0.15),
                                padding: const EdgeInsets.all(8),
                              ),
                              onPressed: () {
                                if (record.status == ServiceStatus.completed) {
                                  DeliveryBillDialog.show(
                                    context: context,
                                    record: record,
                                    customer: customer,
                                    vehicle: vehicle,
                                  );
                                } else {
                                  final text =
                                      WhatsAppPresets.generateIntakeMessage(
                                    template:
                                        WhatsAppPresets.defaultIntakeTemplate,
                                    customerName: customer?.name ?? '',
                                    vehicle: vehicle,
                                    record: record,
                                  );
                                  NativeActions.openWhatsApp(
                                    phone: customer!.phone,
                                    message: text,
                                  );
                                }
                              },
                            ),
                          ],
                        ],
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}
