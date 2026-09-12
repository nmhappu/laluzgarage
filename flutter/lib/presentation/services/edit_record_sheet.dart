import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import '../../core/theme/workshop_theme.dart';
import '../../core/utils/formatters.dart';
import '../../core/utils/native_actions.dart';
import '../../data/models/service_record.dart';
import '../../data/models/customer.dart';
import '../../data/models/vehicle.dart';
import '../../data/models/whatsapp_preset.dart';
import '../../data/repositories/service_repository.dart';
import '../../data/repositories/inventory_repository.dart';
import 'delivery_bill_dialog.dart';

class EditRecordSheet extends ConsumerStatefulWidget {
  final ServiceRecord record;
  final Customer? customer;
  final Vehicle? vehicle;

  const EditRecordSheet({
    super.key,
    required this.record,
    this.customer,
    this.vehicle,
  });

  @override
  ConsumerState<EditRecordSheet> createState() => _EditRecordSheetState();
}

class _EditRecordSheetState extends ConsumerState<EditRecordSheet> {
  late ServiceStatus _status;
  late TextEditingController _laborCostController;
  late TextEditingController _completionMileageController;
  late TextEditingController _finalRemarksController;
  late TextEditingController _newTaskController;
  late List<PartUsed> _partsUsed;
  late List<String> _checklistLines;
  bool _isSaving = false;

  @override
  void initState() {
    super.initState();
    _status = widget.record.status;
    _laborCostController = TextEditingController(
      text: widget.record.laborCost > 0
          ? widget.record.laborCost.toStringAsFixed(0)
          : '',
    );
    _completionMileageController = TextEditingController(
      text: widget.record.completionMileage != null
          ? widget.record.completionMileage.toString()
          : '',
    );
    _finalRemarksController = TextEditingController(
      text: widget.record.finalRemarks ?? '',
    );
    _newTaskController = TextEditingController();
    _partsUsed = List.from(widget.record.partsUsed);

    // Parse description checklist lines
    _checklistLines = widget.record.description.split('\n');
    if (_checklistLines.length == 1 && _checklistLines.first.trim().isEmpty) {
      _checklistLines = [];
    }
  }

  @override
  void dispose() {
    _laborCostController.dispose();
    _completionMileageController.dispose();
    _finalRemarksController.dispose();
    _newTaskController.dispose();
    super.dispose();
  }

  double get _partsCostTotal =>
      _partsUsed.fold(0.0, (sum, p) => sum + p.totalPrice);

  double get _grandTotal {
    final labor = double.tryParse(_laborCostController.text.trim()) ?? 0.0;
    return labor + _partsCostTotal;
  }

  void _toggleChecklistItem(int index) {
    setState(() {
      final line = _checklistLines[index];
      if (line.startsWith('[x] ') || line.startsWith('[X] ')) {
        _checklistLines[index] = '[ ] ${line.substring(4)}';
      } else if (line.startsWith('[ ] ')) {
        _checklistLines[index] = '[x] ${line.substring(4)}';
      } else {
        _checklistLines[index] = '[x] $line';
      }
    });
  }

  void _addNewTask() {
    final text = _newTaskController.text.trim();
    if (text.isEmpty) return;
    setState(() {
      _checklistLines.add('[ ] $text');
      _newTaskController.clear();
    });
  }

  Future<void> _saveChanges() async {
    final labor = double.tryParse(_laborCostController.text.trim()) ?? 0.0;
    final compMileage = int.tryParse(_completionMileageController.text.trim());

    if (_status == ServiceStatus.completed &&
        compMileage != null &&
        compMileage < widget.record.mileage) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(
              'Completion mileage ($compMileage km) cannot be less than intake mileage (${widget.record.mileage} km).'),
          backgroundColor: WorkshopTheme.statusUrgent,
        ),
      );
      return;
    }

    setState(() => _isSaving = true);

    try {
      final updatedDescription = _checklistLines.join('\n');

      final updated = widget.record.copyWith(
        status: _status,
        description: updatedDescription,
        laborCost: labor,
        partsCost: _partsCostTotal,
        totalCost: labor + _partsCostTotal,
        partsUsed: _partsUsed,
        completionMileage: compMileage,
        finalRemarks: _finalRemarksController.text.trim(),
      );

      await ref.read(serviceRepositoryProvider).updateRecord(updated);

      if (mounted) {
        Navigator.of(context).pop();
        if (_status == ServiceStatus.completed) {
          DeliveryBillDialog.show(
            context: context,
            record: updated,
            customer: widget.customer,
            vehicle: widget.vehicle,
          );
        } else {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('Service record updated successfully!')),
          );
        }
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Failed to update record: $e')),
        );
      }
    } finally {
      if (mounted) setState(() => _isSaving = false);
    }
  }

  void _showAddPartDialog() {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: WorkshopTheme.darkCard,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (ctx) {
        final partsAsync = ref.watch(partsStreamProvider);
        return DraggableScrollableSheet(
          initialChildSize: 0.7,
          minChildSize: 0.4,
          maxChildSize: 0.9,
          expand: false,
          builder: (context, scrollController) {
            return Padding(
              padding: const EdgeInsets.all(20),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Center(
                    child: Container(
                      width: 36,
                      height: 4,
                      decoration: BoxDecoration(
                        color: WorkshopTheme.darkBorder,
                        borderRadius: BorderRadius.circular(2),
                      ),
                    ),
                  ),
                  const SizedBox(height: 16),
                  const Text(
                    'Select Spare Part',
                    style: TextStyle(
                      fontSize: 18,
                      fontWeight: FontWeight.w900,
                      color: WorkshopTheme.darkTextPrimary,
                    ),
                  ),
                  const SizedBox(height: 12),
                  Expanded(
                    child: partsAsync.when(
                      loading: () => const Center(
                        child: CircularProgressIndicator(
                          color: WorkshopTheme.emeraldAccent,
                        ),
                      ),
                      error: (e, _) => Center(
                        child: Text('Error loading parts: $e',
                            style: const TextStyle(color: Colors.red)),
                      ),
                      data: (parts) {
                        if (parts.isEmpty) {
                          return const Center(
                            child: Text(
                              'No parts in inventory.',
                              style: TextStyle(color: WorkshopTheme.darkTextMuted),
                            ),
                          );
                        }
                        return ListView.builder(
                          controller: scrollController,
                          itemCount: parts.length,
                          itemBuilder: (c, idx) {
                            final part = parts[idx];
                            final isLow = part.isLowStock;
                            return Container(
                              margin: const EdgeInsets.only(bottom: 8),
                              decoration: BoxDecoration(
                                color: WorkshopTheme.darkSurface,
                                borderRadius: BorderRadius.circular(10),
                                border: Border.all(
                                    color: WorkshopTheme.darkBorderSubtle),
                              ),
                              child: ListTile(
                                title: Text(
                                  part.name,
                                  style: const TextStyle(
                                    fontWeight: FontWeight.w700,
                                    fontSize: 14,
                                    color: WorkshopTheme.darkTextPrimary,
                                  ),
                                ),
                                subtitle: Row(
                                  children: [
                                    Text(
                                      'Stock: ${part.stockQuantity}',
                                      style: TextStyle(
                                        fontSize: 12,
                                        color: isLow
                                            ? WorkshopTheme.statusUrgent
                                            : WorkshopTheme.darkTextMuted,
                                        fontWeight: isLow
                                            ? FontWeight.w700
                                            : FontWeight.w500,
                                      ),
                                    ),
                                    if (part.location.isNotEmpty) ...[
                                      const SizedBox(width: 8),
                                      Text(
                                        '• ${part.location}',
                                        style: const TextStyle(
                                          fontSize: 12,
                                          color: WorkshopTheme.darkTextMuted,
                                        ),
                                      ),
                                    ],
                                  ],
                                ),
                                trailing: Text(
                                  Formatters.currency(part.price),
                                  style: WorkshopTheme.numeric(
                                    fontSize: 15,
                                    fontWeight: FontWeight.w800,
                                    color: WorkshopTheme.darkTextPrimary,
                                  ),
                                ),
                                onTap: () {
                                  setState(() {
                                    final existingIdx = _partsUsed
                                        .indexWhere((p) => p.partId == part.id);
                                    if (existingIdx != -1) {
                                      final ex = _partsUsed[existingIdx];
                                      _partsUsed[existingIdx] = PartUsed(
                                        partId: ex.partId,
                                        name: ex.name,
                                        quantity: ex.quantity + 1,
                                        unitPrice: ex.unitPrice,
                                      );
                                    } else {
                                      _partsUsed.add(PartUsed(
                                        partId: part.id,
                                        name: part.name,
                                        quantity: 1,
                                        unitPrice: part.price,
                                      ));
                                    }
                                  });
                                  Navigator.of(ctx).pop();
                                },
                              ),
                            );
                          },
                        );
                      },
                    ),
                  ),
                ],
              ),
            );
          },
        );
      },
    );
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: const BoxDecoration(
        color: WorkshopTheme.darkCanvas,
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      padding: EdgeInsets.only(
        bottom: MediaQuery.of(context).viewInsets.bottom,
      ),
      child: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(20),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            mainAxisSize: MainAxisSize.min,
            children: [
              // Sheet Drag Handle
              Center(
                child: Container(
                  width: 36,
                  height: 4,
                  decoration: BoxDecoration(
                    color: WorkshopTheme.darkBorder,
                    borderRadius: BorderRadius.circular(2),
                  ),
                ),
              ),
              const SizedBox(height: 16),

              // Title Row with Plate and Customer
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          Text(
                            widget.vehicle?.plateNumber ?? 'JOB CARD',
                            style: WorkshopTheme.mono(
                              fontSize: 18,
                              fontWeight: FontWeight.w900,
                              letterSpacing: 1,
                              color: WorkshopTheme.blueAccent,
                            ),
                          ),
                          const SizedBox(width: 8),
                          Text(
                            '${widget.vehicle?.make ?? ''} ${widget.vehicle?.model ?? ''}',
                            style: const TextStyle(
                              fontSize: 15,
                              fontWeight: FontWeight.w800,
                              color: WorkshopTheme.darkTextPrimary,
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 2),
                      Text(
                        '${widget.customer?.name ?? 'Client'} (${widget.customer?.phone ?? ''})',
                        style: const TextStyle(
                          color: WorkshopTheme.darkTextMuted,
                          fontSize: 12,
                        ),
                      ),
                    ],
                  ),
                  IconButton(
                    icon: const Icon(LucideIcons.x, size: 20),
                    onPressed: () => Navigator.of(context).pop(),
                  ),
                ],
              ),
              const SizedBox(height: 14),

              // Quick Action Chips (Add Contact, WhatsApp)
              Row(
                children: [
                  if (widget.customer != null) ...[
                    OutlinedButton.icon(
                      onPressed: () {
                        NativeActions.createContact(
                          name: widget.customer!.name,
                          phone: widget.customer!.phone,
                          vehicleInfo:
                              '${widget.vehicle?.make ?? ''} ${widget.vehicle?.model ?? ''} (${widget.vehicle?.plateNumber ?? ''})',
                        );
                      },
                      icon: const Icon(LucideIcons.userPlus, size: 14),
                      label: const Text('Save Contact',
                          style: TextStyle(fontSize: 11)),
                      style: OutlinedButton.styleFrom(
                        foregroundColor: WorkshopTheme.darkTextPrimary,
                        side: const BorderSide(color: WorkshopTheme.darkBorder),
                        padding: const EdgeInsets.symmetric(
                            horizontal: 10, vertical: 6),
                      ),
                    ),
                    const SizedBox(width: 8),
                    OutlinedButton.icon(
                      onPressed: () {
                        final text = _status == ServiceStatus.completed
                            ? WhatsAppPresets.generateDeliveryMessage(
                                template: WhatsAppPresets.defaultDeliveryTemplate,
                                customerName: widget.customer!.name,
                                vehicle: widget.vehicle,
                                record: widget.record.copyWith(
                                  partsUsed: _partsUsed,
                                  laborCost: double.tryParse(
                                          _laborCostController.text.trim()) ??
                                      0.0,
                                  totalCost: _grandTotal,
                                ),
                              )
                            : WhatsAppPresets.generateIntakeMessage(
                                template: WhatsAppPresets.defaultIntakeTemplate,
                                customerName: widget.customer!.name,
                                vehicle: widget.vehicle,
                                record: widget.record,
                              );
                        NativeActions.openWhatsApp(
                          phone: widget.customer!.phone,
                          message: text,
                        );
                      },
                      icon: const Icon(LucideIcons.messageSquare,
                          size: 14, color: WorkshopTheme.emeraldAccent),
                      label: const Text('WhatsApp',
                          style: TextStyle(
                              fontSize: 11,
                              color: WorkshopTheme.emeraldAccent)),
                      style: OutlinedButton.styleFrom(
                        side: BorderSide(
                            color: WorkshopTheme.emeraldAccent
                                .withValues(alpha: 0.4)),
                        padding: const EdgeInsets.symmetric(
                            horizontal: 10, vertical: 6),
                      ),
                    ),
                  ],
                ],
              ),
              const SizedBox(height: 20),

              // Status Workflow Selector
              const Text(
                'STATUS WORKFLOW',
                style: TextStyle(
                  fontSize: 10,
                  fontWeight: FontWeight.w900,
                  letterSpacing: 1.2,
                  color: WorkshopTheme.darkTextMuted,
                ),
              ),
              const SizedBox(height: 8),
              Wrap(
                spacing: 8,
                children: ServiceStatus.values.map((st) {
                  final isSelected = _status == st;
                  Color color;
                  switch (st) {
                    case ServiceStatus.completed:
                      color = WorkshopTheme.statusSuccess;
                      break;
                    case ServiceStatus.inProgress:
                      color = WorkshopTheme.statusPending;
                      break;
                    case ServiceStatus.cancelled:
                      color = Colors.grey;
                      break;
                    case ServiceStatus.pending:
                      color = WorkshopTheme.statusUrgent;
                      break;
                  }
                  return ChoiceChip(
                    label: Text(st.name.toUpperCase()),
                    selected: isSelected,
                    selectedColor: color.withValues(alpha: 0.2),
                    side: BorderSide(
                      color: isSelected
                          ? color.withValues(alpha: 0.6)
                          : WorkshopTheme.darkBorder,
                    ),
                    labelStyle: TextStyle(
                      fontSize: 11,
                      fontWeight:
                          isSelected ? FontWeight.w900 : FontWeight.w600,
                      color: isSelected ? color : WorkshopTheme.darkTextMuted,
                    ),
                    onSelected: (val) {
                      if (val) setState(() => _status = st);
                    },
                  );
                }).toList(),
              ),
              const SizedBox(height: 20),

              // Interactive Checklist & Problems
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  const Text(
                    'JOB CHECKLIST & PROBLEMS',
                    style: TextStyle(
                      fontSize: 10,
                      fontWeight: FontWeight.w900,
                      letterSpacing: 1.2,
                      color: WorkshopTheme.darkTextMuted,
                    ),
                  ),
                  Text(
                    '${_checklistLines.where((l) => l.startsWith('[x]') || l.startsWith('[X]')).length}/${_checklistLines.length} DONE',
                    style: const TextStyle(
                      fontSize: 10,
                      fontWeight: FontWeight.w800,
                      color: WorkshopTheme.emeraldAccent,
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 8),

              if (_checklistLines.isEmpty)
                const Padding(
                  padding: EdgeInsets.symmetric(vertical: 8),
                  child: Text(
                    'No checklist items specified.',
                    style: TextStyle(
                        color: WorkshopTheme.darkTextMuted, fontSize: 12),
                  ),
                )
              else
                ...List.generate(_checklistLines.length, (idx) {
                  final line = _checklistLines[idx];
                  final isChecked =
                      line.startsWith('[x] ') || line.startsWith('[X] ');
                  final cleanText = line
                      .replaceAll(RegExp(r'^\[[x ]\]\s*'), '')
                      .replaceAll(RegExp(r'^(\d+[\.\)]|[-*•])\s*'), '')
                      .trim();

                  return InkWell(
                    onTap: () => _toggleChecklistItem(idx),
                    child: Padding(
                      padding: const EdgeInsets.symmetric(vertical: 4),
                      child: Row(
                        children: [
                          Icon(
                            isChecked
                                ? LucideIcons.checkSquare
                                : LucideIcons.square,
                            size: 18,
                            color: isChecked
                                ? WorkshopTheme.emeraldAccent
                                : WorkshopTheme.darkTextMuted,
                          ),
                          const SizedBox(width: 10),
                          Expanded(
                            child: Text(
                              cleanText,
                              style: TextStyle(
                                fontSize: 13,
                                fontWeight: FontWeight.w600,
                                decoration: isChecked
                                    ? TextDecoration.lineThrough
                                    : null,
                                color: isChecked
                                    ? WorkshopTheme.darkTextMuted
                                    : WorkshopTheme.darkTextPrimary,
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),
                  );
                }),

              // Add Task Quick Field
              const SizedBox(height: 8),
              Row(
                children: [
                  Expanded(
                    child: TextField(
                      controller: _newTaskController,
                      style: const TextStyle(
                          color: WorkshopTheme.darkTextPrimary, fontSize: 13),
                      decoration: InputDecoration(
                        hintText: 'Add new task item...',
                        filled: true,
                        fillColor: WorkshopTheme.darkCard,
                        contentPadding: const EdgeInsets.symmetric(
                            horizontal: 12, vertical: 8),
                        border: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(8),
                          borderSide:
                              const BorderSide(color: WorkshopTheme.darkBorder),
                        ),
                      ),
                      onSubmitted: (_) => _addNewTask(),
                    ),
                  ),
                  const SizedBox(width: 8),
                  IconButton(
                    icon: const Icon(LucideIcons.plus,
                        color: WorkshopTheme.emeraldAccent, size: 20),
                    style: IconButton.styleFrom(
                      backgroundColor: WorkshopTheme.darkCard,
                      padding: const EdgeInsets.all(8),
                    ),
                    onPressed: _addNewTask,
                  ),
                ],
              ),
              const SizedBox(height: 24),

              // Spare Parts Allocated
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  const Text(
                    'SPARE PARTS ALLOCATED',
                    style: TextStyle(
                      fontSize: 10,
                      fontWeight: FontWeight.w900,
                      letterSpacing: 1.2,
                      color: WorkshopTheme.darkTextMuted,
                    ),
                  ),
                  TextButton.icon(
                    onPressed: _showAddPartDialog,
                    icon: const Icon(LucideIcons.plus, size: 14),
                    label: const Text('Add Part',
                        style: TextStyle(
                            fontSize: 12, fontWeight: FontWeight.w800)),
                    style: TextButton.styleFrom(
                      foregroundColor: WorkshopTheme.emeraldAccent,
                      padding: EdgeInsets.zero,
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 6),

              if (_partsUsed.isEmpty)
                Container(
                  padding: const EdgeInsets.all(14),
                  decoration: BoxDecoration(
                    color: WorkshopTheme.darkCard,
                    borderRadius: BorderRadius.circular(10),
                    border: Border.all(color: WorkshopTheme.darkBorder),
                  ),
                  child: const Center(
                    child: Text(
                      'No parts allocated for this service card yet.',
                      style: TextStyle(
                          color: WorkshopTheme.darkTextMuted, fontSize: 12),
                    ),
                  ),
                )
              else
                ...List.generate(_partsUsed.length, (idx) {
                  final part = _partsUsed[idx];
                  return Container(
                    margin: const EdgeInsets.only(bottom: 6),
                    padding: const EdgeInsets.symmetric(
                        horizontal: 12, vertical: 10),
                    decoration: BoxDecoration(
                      color: WorkshopTheme.darkCard,
                      borderRadius: BorderRadius.circular(10),
                      border: Border.all(color: WorkshopTheme.darkBorder),
                    ),
                    child: Row(
                      children: [
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                part.name,
                                style: const TextStyle(
                                  fontWeight: FontWeight.w700,
                                  fontSize: 13,
                                  color: WorkshopTheme.darkTextPrimary,
                                ),
                              ),
                              Text(
                                '${Formatters.currency(part.unitPrice)} each',
                                style: const TextStyle(
                                  fontSize: 11,
                                  color: WorkshopTheme.darkTextMuted,
                                ),
                              ),
                            ],
                          ),
                        ),

                        // Quantity +/- Buttons
                        Row(
                          children: [
                            IconButton(
                              icon: const Icon(LucideIcons.minus, size: 14),
                              padding: EdgeInsets.zero,
                              constraints: const BoxConstraints(
                                  minWidth: 28, minHeight: 28),
                              onPressed: () {
                                setState(() {
                                  if (part.quantity > 1) {
                                    _partsUsed[idx] = PartUsed(
                                      partId: part.partId,
                                      name: part.name,
                                      quantity: part.quantity - 1,
                                      unitPrice: part.unitPrice,
                                    );
                                  } else {
                                    _partsUsed.removeAt(idx);
                                  }
                                });
                              },
                            ),
                            Text(
                              '${part.quantity}',
                              style: WorkshopTheme.numeric(
                                fontSize: 14,
                                fontWeight: FontWeight.w900,
                                color: WorkshopTheme.darkTextPrimary,
                              ),
                            ),
                            IconButton(
                              icon: const Icon(LucideIcons.plus, size: 14),
                              padding: EdgeInsets.zero,
                              constraints: const BoxConstraints(
                                  minWidth: 28, minHeight: 28),
                              onPressed: () {
                                setState(() {
                                  _partsUsed[idx] = PartUsed(
                                    partId: part.partId,
                                    name: part.name,
                                    quantity: part.quantity + 1,
                                    unitPrice: part.unitPrice,
                                  );
                                });
                              },
                            ),
                          ],
                        ),
                        const SizedBox(width: 12),

                        Text(
                          Formatters.currency(part.totalPrice),
                          style: WorkshopTheme.numeric(
                            fontSize: 14,
                            fontWeight: FontWeight.w800,
                            color: WorkshopTheme.darkTextPrimary,
                          ),
                        ),
                      ],
                    ),
                  );
                }),
              const SizedBox(height: 20),

              // Completion Mileage Field (if Completed or in progress)
              if (_status == ServiceStatus.completed ||
                  _status == ServiceStatus.inProgress) ...[
                const Text(
                  'COMPLETION ODOMETER',
                  style: TextStyle(
                    fontSize: 10,
                    fontWeight: FontWeight.w900,
                    letterSpacing: 1.2,
                    color: WorkshopTheme.darkTextMuted,
                  ),
                ),
                const SizedBox(height: 8),
                TextFormField(
                  controller: _completionMileageController,
                  keyboardType: TextInputType.number,
                  style: WorkshopTheme.numeric(
                    color: WorkshopTheme.darkTextPrimary,
                    fontSize: 15,
                  ),
                  decoration: InputDecoration(
                    labelText: 'Completion Mileage (KM)',
                    hintText: 'e.g. ${widget.record.mileage + 15}',
                    prefixIcon: const Icon(LucideIcons.gauge, size: 18),
                    filled: true,
                    fillColor: WorkshopTheme.darkCard,
                    border: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(10),
                      borderSide:
                          const BorderSide(color: WorkshopTheme.darkBorder),
                    ),
                  ),
                ),
                const SizedBox(height: 20),
              ],

              // Cost Calculation Summary (Labor + Parts = Total)
              const Text(
                'BILLING SUMMARY',
                style: TextStyle(
                  fontSize: 10,
                  fontWeight: FontWeight.w900,
                  letterSpacing: 1.2,
                  color: WorkshopTheme.darkTextMuted,
                ),
              ),
              const SizedBox(height: 8),

              TextFormField(
                controller: _laborCostController,
                keyboardType: TextInputType.number,
                onChanged: (_) => setState(() {}),
                style: WorkshopTheme.numeric(
                  color: WorkshopTheme.darkTextPrimary,
                  fontSize: 15,
                ),
                decoration: InputDecoration(
                  labelText: 'Labor & Workmanship (₹)',
                  prefixIcon: const Icon(LucideIcons.wrench, size: 18),
                  filled: true,
                  fillColor: WorkshopTheme.darkCard,
                  border: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(10),
                    borderSide:
                        const BorderSide(color: WorkshopTheme.darkBorder),
                  ),
                ),
              ),
              const SizedBox(height: 12),

              Container(
                padding: const EdgeInsets.all(14),
                decoration: BoxDecoration(
                  color: WorkshopTheme.darkCard,
                  borderRadius: BorderRadius.circular(10),
                  border: Border.all(color: WorkshopTheme.darkBorder),
                ),
                child: Column(
                  children: [
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        const Text('Parts Subtotal',
                            style: TextStyle(
                                color: WorkshopTheme.darkTextMuted,
                                fontSize: 13)),
                        Text(Formatters.currency(_partsCostTotal),
                            style: WorkshopTheme.numeric(
                                fontSize: 13,
                                color: WorkshopTheme.darkTextPrimary)),
                      ],
                    ),
                    const SizedBox(height: 6),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        const Text('Labor Subtotal',
                            style: TextStyle(
                                color: WorkshopTheme.darkTextMuted,
                                fontSize: 13)),
                        Text(
                          Formatters.currency(double.tryParse(
                                  _laborCostController.text.trim()) ??
                              0.0),
                          style: WorkshopTheme.numeric(
                              fontSize: 13,
                              color: WorkshopTheme.darkTextPrimary),
                        ),
                      ],
                    ),
                    const Divider(
                        height: 16, color: WorkshopTheme.darkBorderSubtle),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        const Text(
                          'GRAND TOTAL',
                          style: TextStyle(
                            fontWeight: FontWeight.w900,
                            fontSize: 14,
                            letterSpacing: 0.5,
                            color: WorkshopTheme.darkTextPrimary,
                          ),
                        ),
                        Text(
                          Formatters.currency(_grandTotal),
                          style: WorkshopTheme.numeric(
                            fontWeight: FontWeight.w900,
                            fontSize: 18,
                            color: WorkshopTheme.emeraldAccent,
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 24),

              // Final Remarks Field
              TextFormField(
                controller: _finalRemarksController,
                maxLines: 2,
                style: const TextStyle(
                    color: WorkshopTheme.darkTextPrimary, fontSize: 13),
                decoration: InputDecoration(
                  labelText: 'Handover & Final Remarks',
                  hintText: 'e.g. Brake pads replaced, battery checked ok.',
                  filled: true,
                  fillColor: WorkshopTheme.darkCard,
                  border: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(10),
                    borderSide:
                        const BorderSide(color: WorkshopTheme.darkBorder),
                  ),
                ),
              ),
              const SizedBox(height: 24),

              // Save Changes Action Button
              FilledButton(
                onPressed: _isSaving ? null : _saveChanges,
                style: FilledButton.styleFrom(
                  backgroundColor: WorkshopTheme.emeraldAccent,
                  foregroundColor: Colors.black,
                  minimumSize: const Size(double.infinity, 50),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(12),
                  ),
                ),
                child: _isSaving
                    ? const SizedBox(
                        width: 20,
                        height: 20,
                        child: CircularProgressIndicator(
                          strokeWidth: 2,
                          color: Colors.black,
                        ),
                      )
                    : const Text(
                        'Save Record Changes',
                        style: TextStyle(
                          fontSize: 14,
                          fontWeight: FontWeight.w900,
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
