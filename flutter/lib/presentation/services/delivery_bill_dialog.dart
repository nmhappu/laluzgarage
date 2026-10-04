import 'package:flutter/material.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import '../../core/theme/workshop_theme.dart';
import '../../core/utils/formatters.dart';
import '../../core/utils/native_actions.dart';
import '../../data/models/customer.dart';
import '../../data/models/service_record.dart';
import '../../data/models/vehicle.dart';
import '../../data/models/whatsapp_preset.dart';

class DeliveryBillDialog extends StatelessWidget {
  final ServiceRecord record;
  final Customer? customer;
  final Vehicle? vehicle;

  const DeliveryBillDialog({
    super.key,
    required this.record,
    this.customer,
    this.vehicle,
  });

  static Future<void> show({
    required BuildContext context,
    required ServiceRecord record,
    Customer? customer,
    Vehicle? vehicle,
  }) {
    return showDialog<void>(
      context: context,
      barrierColor: Colors.black.withValues(alpha: 0.8),
      builder: (ctx) => DeliveryBillDialog(
        record: record,
        customer: customer,
        vehicle: vehicle,
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final custName = customer?.name.isNotEmpty == true
        ? Formatters.capitalize(customer!.name)
        : 'Customer';
    final custPhone = customer?.phone ?? '';
    final vehicleTitle = vehicle != null
        ? '${vehicle!.make} ${vehicle!.model}'.trim()
        : 'Vehicle';
    final plateNo = vehicle?.plateNumber ?? '';

    return Dialog(
      backgroundColor: WorkshopTheme.darkCanvas,
      insetPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 24),
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(24),
        side: const BorderSide(color: WorkshopTheme.darkBorder, width: 1),
      ),
      child: ConstrainedBox(
        constraints: const BoxConstraints(maxWidth: 540),
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(20),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              // Top Header Bar
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Row(
                    children: [
                      Container(
                        width: 40,
                        height: 40,
                        decoration: BoxDecoration(
                          color: const Color(0xFF25D366).withValues(alpha: 0.15),
                          borderRadius: BorderRadius.circular(10),
                          border: Border.all(
                            color: const Color(0xFF25D366).withValues(alpha: 0.3),
                          ),
                        ),
                        child: const Icon(
                          LucideIcons.messageSquare,
                          color: Color(0xFF25D366),
                          size: 20,
                        ),
                      ),
                      const SizedBox(width: 12),
                      Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Container(
                            padding: const EdgeInsets.symmetric(
                                horizontal: 8, vertical: 2),
                            decoration: BoxDecoration(
                              color: WorkshopTheme.statusSuccess
                                  .withValues(alpha: 0.15),
                              borderRadius: BorderRadius.circular(20),
                              border: Border.all(
                                color: WorkshopTheme.statusSuccess
                                    .withValues(alpha: 0.3),
                              ),
                            ),
                            child: const Text(
                              'JOB CARD COMPLETED',
                              style: TextStyle(
                                color: WorkshopTheme.statusSuccess,
                                fontSize: 9,
                                fontWeight: FontWeight.w900,
                                letterSpacing: 1.2,
                              ),
                            ),
                          ),
                          const SizedBox(height: 2),
                          const Text(
                            'DELIVERY MESSAGE',
                            style: TextStyle(
                              color: WorkshopTheme.darkTextPrimary,
                              fontSize: 16,
                              fontWeight: FontWeight.w900,
                              letterSpacing: -0.2,
                            ),
                          ),
                        ],
                      ),
                    ],
                  ),
                  IconButton(
                    icon: const Icon(LucideIcons.x,
                        color: WorkshopTheme.darkTextMuted, size: 20),
                    onPressed: () => Navigator.of(context).pop(),
                  ),
                ],
              ),
              const SizedBox(height: 18),

              // Client & Vehicle Summary Card
              Container(
                padding: const EdgeInsets.all(14),
                decoration: BoxDecoration(
                  color: WorkshopTheme.darkSurface,
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(color: WorkshopTheme.darkBorderSubtle),
                ),
                child: Column(
                  children: [
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        const Text(
                          'CLIENT',
                          style: TextStyle(
                            fontSize: 11,
                            fontWeight: FontWeight.w800,
                            letterSpacing: 1,
                            color: WorkshopTheme.darkTextMuted,
                          ),
                        ),
                        Text(
                          custName.toUpperCase(),
                          style: const TextStyle(
                            fontSize: 13,
                            fontWeight: FontWeight.w900,
                            color: WorkshopTheme.darkTextPrimary,
                          ),
                        ),
                      ],
                    ),
                    const Padding(
                      padding: EdgeInsets.symmetric(vertical: 8),
                      child: Divider(
                          height: 1, color: WorkshopTheme.darkBorderSubtle),
                    ),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        const Text(
                          'VEHICLE',
                          style: TextStyle(
                            fontSize: 11,
                            fontWeight: FontWeight.w800,
                            letterSpacing: 1,
                            color: WorkshopTheme.darkTextMuted,
                          ),
                        ),
                        Row(
                          children: [
                            Text(
                              vehicleTitle.toUpperCase(),
                              style: const TextStyle(
                                fontSize: 13,
                                fontWeight: FontWeight.w800,
                                color: WorkshopTheme.darkTextPrimary,
                              ),
                            ),
                            if (plateNo.isNotEmpty) ...[
                              const SizedBox(width: 6),
                              const Text(
                                '/',
                                style: TextStyle(
                                    color: WorkshopTheme.darkTextMuted),
                              ),
                              const SizedBox(width: 6),
                              Text(
                                plateNo,
                                style: WorkshopTheme.plateNumber(
                                  fontSize: 13,
                                  fontWeight: FontWeight.w900,
                                  color: WorkshopTheme.blueAccent,
                                ),
                              ),
                            ],
                          ],
                        ),
                      ],
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 14),

              // Final Bill Summary Card
              Container(
                padding: const EdgeInsets.all(14),
                decoration: BoxDecoration(
                  color: WorkshopTheme.darkSurface,
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(
                    color: WorkshopTheme.statusSuccess.withValues(alpha: 0.25),
                  ),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Row(
                      children: [
                        Icon(LucideIcons.receipt,
                            size: 16, color: WorkshopTheme.statusSuccess),
                        SizedBox(width: 8),
                        Text(
                          'FINAL BILL SUMMARY',
                          style: TextStyle(
                            fontSize: 12,
                            fontWeight: FontWeight.w900,
                            letterSpacing: 1,
                            color: WorkshopTheme.darkTextPrimary,
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 12),

                    // Fixed / Replaced Parts
                    const Text(
                      'FIXED / REPLACED PARTS',
                      style: TextStyle(
                        fontSize: 10,
                        fontWeight: FontWeight.w800,
                        letterSpacing: 1,
                        color: WorkshopTheme.darkTextMuted,
                      ),
                    ),
                    const SizedBox(height: 6),
                    if (record.partsUsed.isNotEmpty)
                      ...record.partsUsed.map((p) => Container(
                            margin: const EdgeInsets.only(bottom: 6),
                            padding: const EdgeInsets.symmetric(
                                horizontal: 12, vertical: 8),
                            decoration: BoxDecoration(
                              color: WorkshopTheme.darkCanvas,
                              borderRadius: BorderRadius.circular(10),
                              border: Border.all(
                                  color: WorkshopTheme.darkBorderSubtle),
                            ),
                            child: Row(
                              mainAxisAlignment: MainAxisAlignment.spaceBetween,
                              children: [
                                Expanded(
                                  child: Row(
                                    children: [
                                      Flexible(
                                        child: Text(
                                          p.name,
                                          style: const TextStyle(
                                            fontSize: 13,
                                            fontWeight: FontWeight.w600,
                                            color:
                                                WorkshopTheme.darkTextPrimary,
                                          ),
                                          maxLines: 1,
                                          overflow: TextOverflow.ellipsis,
                                        ),
                                      ),
                                      const SizedBox(width: 6),
                                      Text(
                                        'x${p.quantity}',
                                        style: const TextStyle(
                                          fontSize: 11,
                                          fontWeight: FontWeight.w800,
                                          color: WorkshopTheme.darkTextMuted,
                                        ),
                                      ),
                                    ],
                                  ),
                                ),
                                Text(
                                  Formatters.formatCurrency(
                                      p.unitPrice * p.quantity),
                                  style: WorkshopTheme.numeric(
                                    fontSize: 13,
                                    fontWeight: FontWeight.w800,
                                    color: WorkshopTheme.darkTextPrimary,
                                  ),
                                ),
                              ],
                            ),
                          ))
                    else
                      const Padding(
                        padding: EdgeInsets.symmetric(vertical: 4),
                        child: Text(
                          'No replacement parts billed.',
                          style: TextStyle(
                            fontSize: 12,
                            fontStyle: FontStyle.italic,
                            color: WorkshopTheme.darkTextMuted,
                          ),
                        ),
                      ),
                    const SizedBox(height: 10),

                    // Labor & Grand Total
                    const Divider(
                        height: 1, color: WorkshopTheme.darkBorderSubtle),
                    const SizedBox(height: 10),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        const Text(
                          'LABOR CHARGES',
                          style: TextStyle(
                            fontSize: 11,
                            fontWeight: FontWeight.w800,
                            letterSpacing: 1,
                            color: WorkshopTheme.darkTextMuted,
                          ),
                        ),
                        Text(
                          Formatters.formatCurrency(record.laborCost),
                          style: WorkshopTheme.numeric(
                            fontSize: 14,
                            fontWeight: FontWeight.w800,
                            color: WorkshopTheme.darkTextPrimary,
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 8),
                    const Divider(
                        height: 1, color: WorkshopTheme.darkBorderSubtle),
                    const SizedBox(height: 8),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        const Text(
                          'FINAL BILL AMOUNT',
                          style: TextStyle(
                            fontSize: 12,
                            fontWeight: FontWeight.w900,
                            letterSpacing: 1,
                            color: WorkshopTheme.darkTextPrimary,
                          ),
                        ),
                        Text(
                          Formatters.formatCurrency(record.totalCost),
                          style: WorkshopTheme.numeric(
                            fontSize: 22,
                            fontWeight: FontWeight.w900,
                            color: WorkshopTheme.emeraldAccent,
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 20),

              // Action Buttons
              if (custPhone.isNotEmpty)
                FilledButton.icon(
                  onPressed: () {
                    final message = WhatsAppPresets.generateDeliveryMessage(
                      template: WhatsAppPresets.defaultDeliveryTemplate,
                      customerName: custName,
                      vehicle: vehicle,
                      record: record,
                    );
                    NativeActions.openWhatsApp(
                      phone: custPhone,
                      message: message,
                    );
                    Navigator.of(context).pop();
                  },
                  icon: const Icon(LucideIcons.messageSquare, size: 18),
                  label: const Text(
                    'SEND WHATSAPP MESSAGE',
                    style: TextStyle(
                      fontSize: 13,
                      fontWeight: FontWeight.w900,
                      letterSpacing: 0.5,
                    ),
                  ),
                  style: FilledButton.styleFrom(
                    backgroundColor: const Color(0xFF25D366),
                    foregroundColor: Colors.white,
                    padding: const EdgeInsets.symmetric(vertical: 14),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(14),
                    ),
                  ),
                )
              else
                Container(
                  padding: const EdgeInsets.all(12),
                  alignment: Alignment.center,
                  decoration: BoxDecoration(
                    color: WorkshopTheme.statusUrgent.withValues(alpha: 0.1),
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(
                      color: WorkshopTheme.statusUrgent.withValues(alpha: 0.3),
                    ),
                  ),
                  child: const Text(
                    'No client phone number registered',
                    style: TextStyle(
                      color: WorkshopTheme.statusUrgent,
                      fontSize: 12,
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                ),
              const SizedBox(height: 10),
              OutlinedButton(
                onPressed: () => Navigator.of(context).pop(),
                style: OutlinedButton.styleFrom(
                  foregroundColor: WorkshopTheme.darkTextMuted,
                  side: const BorderSide(color: WorkshopTheme.darkBorder),
                  padding: const EdgeInsets.symmetric(vertical: 12),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(14),
                  ),
                ),
                child: const Text(
                  'DONE',
                  style: TextStyle(
                    fontSize: 13,
                    fontWeight: FontWeight.w800,
                    letterSpacing: 0.5,
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
