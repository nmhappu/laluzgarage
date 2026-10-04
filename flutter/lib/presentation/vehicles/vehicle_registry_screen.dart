import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import '../../core/theme/workshop_theme.dart';
import '../../core/utils/formatters.dart';
import '../../core/utils/native_actions.dart';
import '../../data/models/vehicle.dart';
import '../../data/repositories/vehicle_repository.dart';
import '../../data/repositories/customer_repository.dart';
import '../../data/repositories/firebase_providers.dart';
import 'vehicle_ledger_sheet.dart';
import '../common/brand_icons.dart';
import '../shell/navigation_provider.dart';

class VehicleRegistryScreen extends ConsumerStatefulWidget {
  const VehicleRegistryScreen({super.key});

  @override
  ConsumerState<VehicleRegistryScreen> createState() =>
      _VehicleRegistryScreenState();
}

class _VehicleRegistryScreenState extends ConsumerState<VehicleRegistryScreen> {
  final _searchController = TextEditingController();
  String _searchQuery = '';

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  void _showEditVehicleModal(Vehicle vehicle) {
    final makeCtrl = TextEditingController(text: vehicle.make);
    final modelCtrl = TextEditingController(text: vehicle.model);
    final colorCtrl = TextEditingController(text: vehicle.color);
    final plateCtrl = TextEditingController(text: vehicle.plateNumber);
    final pinCtrl = TextEditingController(
        text: vehicle.isKey ? '' : vehicle.passwordOrPin);
    bool isKey = vehicle.isKey;

    showDialog(
      context: context,
      builder: (ctx) => StatefulBuilder(
        builder: (context, setModalState) => AlertDialog(
          backgroundColor: WorkshopTheme.darkCard,
          shape:
              RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
          title: const Text(
            'Edit Vehicle Details',
            style: TextStyle(fontWeight: FontWeight.w900, fontSize: 18),
          ),
          content: SingleChildScrollView(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                TextField(
                  controller: plateCtrl,
                  textCapitalization: TextCapitalization.characters,
                  style: WorkshopTheme.mono(
                      fontWeight: FontWeight.w800,
                      color: WorkshopTheme.darkTextPrimary),
                  decoration: const InputDecoration(
                    labelText: 'Registration Plate',
                    hintText: 'MH12AB1234',
                  ),
                ),
                const SizedBox(height: 10),
                Row(
                  children: [
                    Expanded(
                      child: TextField(
                        controller: makeCtrl,
                        style: const TextStyle(
                            color: WorkshopTheme.darkTextPrimary),
                        decoration: const InputDecoration(
                          labelText: 'Make',
                          hintText: 'e.g. Ola, Honda',
                        ),
                      ),
                    ),
                    const SizedBox(width: 10),
                    Expanded(
                      child: TextField(
                        controller: modelCtrl,
                        style: const TextStyle(
                            color: WorkshopTheme.darkTextPrimary),
                        decoration: const InputDecoration(
                          labelText: 'Model',
                          hintText: 'e.g. S1 Pro',
                        ),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 10),
                TextField(
                  controller: colorCtrl,
                  style: const TextStyle(color: WorkshopTheme.darkTextPrimary),
                  decoration: const InputDecoration(
                    labelText: 'Color',
                    hintText: 'e.g. Matte Black',
                  ),
                ),
                const SizedBox(height: 16),

                // Key vs Screen PIN Selector
                Row(
                  children: [
                    ChoiceChip(
                      label: const Text('Physical Key'),
                      selected: isKey,
                      selectedColor:
                          WorkshopTheme.emeraldAccent.withValues(alpha: 0.2),
                      onSelected: (val) {
                        setModalState(() => isKey = true);
                      },
                    ),
                    const SizedBox(width: 8),
                    ChoiceChip(
                      label: const Text('Screen PIN'),
                      selected: !isKey,
                      selectedColor:
                          WorkshopTheme.blueAccent.withValues(alpha: 0.2),
                      onSelected: (val) {
                        setModalState(() => isKey = false);
                      },
                    ),
                  ],
                ),
                if (!isKey) ...[
                  const SizedBox(height: 10),
                  TextField(
                    controller: pinCtrl,
                    keyboardType: TextInputType.number,
                    style: WorkshopTheme.numeric(
                        color: WorkshopTheme.darkTextPrimary),
                    decoration: const InputDecoration(
                      labelText: 'Screen Unlock PIN',
                      hintText: 'e.g. 1234',
                    ),
                  ),
                ],
              ],
            ),
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.of(ctx).pop(),
              child: const Text('Cancel', style: TextStyle(color: Colors.grey)),
            ),
            FilledButton(
              onPressed: () async {
                final updated = vehicle.copyWith(
                  make: makeCtrl.text.trim(),
                  model: modelCtrl.text.trim(),
                  color: colorCtrl.text.trim(),
                  plateNumber: plateCtrl.text.trim().toUpperCase(),
                  passwordOrPin: isKey ? 'Key' : pinCtrl.text.trim(),
                );
                await ref.read(vehicleRepositoryProvider).updateVehicle(updated);
                if (ctx.mounted) Navigator.of(ctx).pop();
              },
              style: FilledButton.styleFrom(
                backgroundColor: WorkshopTheme.emeraldAccent,
                foregroundColor: Colors.black,
              ),
              child: const Text('Save Details'),
            ),
          ],
        ),
      ),
    );
  }

  void _showDeleteVehicleDialog(Vehicle vehicle) {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: WorkshopTheme.darkCard,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        title: const Row(
          children: [
            Icon(LucideIcons.trash2, color: WorkshopTheme.statusUrgent, size: 20),
            SizedBox(width: 10),
            Text('Delete Vehicle',
                style: TextStyle(fontWeight: FontWeight.w800, fontSize: 18)),
          ],
        ),
        content: Text(
          'Are you sure you want to delete vehicle "${vehicle.plateNumber}"? Historical service logs will remain stored.',
          style:
              const TextStyle(color: WorkshopTheme.darkTextMuted, fontSize: 13),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(ctx).pop(),
            child: const Text('Cancel', style: TextStyle(color: Colors.grey)),
          ),
          FilledButton(
            onPressed: () async {
              Navigator.of(ctx).pop();
              await ref
                  .read(vehicleRepositoryProvider)
                  .deleteVehicle(vehicle.id);
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

  @override
  Widget build(BuildContext context) {
    final vehiclesAsync = ref.watch(vehiclesStreamProvider);
    final customersAsync = ref.watch(customersStreamProvider);
    final isAdmin = ref.watch(isAdminProvider);

    final isWide = MediaQuery.sizeOf(context).width >= 768;

    return Scaffold(
      backgroundColor: WorkshopTheme.darkCanvas,
      appBar: isWide
          ? AppBar(
              title: const Text(
                'Vehicle Registry',
                style: TextStyle(fontWeight: FontWeight.w900, fontSize: 18),
              ),
            )
          : null,
      body: Column(
        children: [
          // Search Input Bar
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 8, 16, 10),
            child: TextField(
              controller: _searchController,
              onChanged: (val) =>
                  setState(() => _searchQuery = val.trim().toLowerCase()),
              decoration: InputDecoration(
                hintText: 'Search by plate number, make, model or owner...',
                prefixIcon: const Icon(LucideIcons.search, size: 18),
                filled: true,
                fillColor: WorkshopTheme.darkCard,
                contentPadding:
                    const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(12),
                  borderSide: const BorderSide(color: WorkshopTheme.darkBorder),
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

          Expanded(
            child: vehiclesAsync.when(
              loading: () => const Center(
                child: CircularProgressIndicator(
                    color: WorkshopTheme.emeraldAccent),
              ),
              error: (err, _) => Center(
                child: Text('Error loading vehicles: $err',
                    style: const TextStyle(color: Colors.red)),
              ),
              data: (vehicles) {
                final customers = customersAsync.asData?.value ?? [];
                final topBarQuery =
                    ref.watch(topBarSearchQueryProvider).trim().toLowerCase();
                final effectiveQuery =
                    topBarQuery.isNotEmpty ? topBarQuery : _searchQuery;

                final displayVehicles = vehicles.where((v) {
                  if (effectiveQuery.isEmpty) return true;
                  final c = customers
                      .where((item) => item.id == v.customerId)
                      .firstOrNull;
                  final plate = v.plateNumber.toLowerCase();
                  final makeModel =
                      '${v.make} ${v.model}'.toLowerCase();
                  final client = c?.name.toLowerCase() ?? '';
                  final phone = c?.phone.toLowerCase() ?? '';
                  return plate.contains(effectiveQuery) ||
                      makeModel.contains(effectiveQuery) ||
                      client.contains(effectiveQuery) ||
                      phone.contains(effectiveQuery);
                }).toList();

                if (displayVehicles.isEmpty) {
                  return const Center(
                    child: Text(
                      'No vehicles found in registry.',
                      style: TextStyle(color: WorkshopTheme.darkTextMuted),
                    ),
                  );
                }

                return ListView.builder(
                  padding: EdgeInsets.fromLTRB(16, 6, 16, isWide ? 16 : 84),
                  itemCount: displayVehicles.length,
                  itemBuilder: (ctx, idx) {
                    final vehicle = displayVehicles[idx];
                    final customer = customers
                        .where((c) => c.id == vehicle.customerId)
                        .firstOrNull;

                    final isOla = vehicle.make.toLowerCase().contains('ola') ||
                        vehicle.model.toLowerCase().contains('ola');

                    return Container(
                      margin: const EdgeInsets.only(bottom: 8),
                      decoration: BoxDecoration(
                        color: const Color(0xFF0A0C10),
                        borderRadius: BorderRadius.circular(14),
                        border: Border.all(color: WorkshopTheme.darkBorder),
                      ),
                      child: Stack(
                        children: [
                          if (isOla)
                            Positioned(
                              bottom: 14,
                              right: 8,
                              child: BrandIcons.olaWatermark(
                                  width: 140, opacity: 0.04),
                            ),
                          InkWell(
                            borderRadius: BorderRadius.circular(14),
                        onTap: () {
                          showModalBottomSheet(
                            context: context,
                            isScrollControlled: true,
                            backgroundColor: Colors.transparent,
                            builder: (c) => VehicleLedgerSheet(
                              vehicle: vehicle,
                              customer: customer,
                            ),
                          );
                        },
                        child: Padding(
                          padding: const EdgeInsets.all(14),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Row(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Container(
                                    padding: const EdgeInsets.all(10),
                                    decoration: BoxDecoration(
                                      color: WorkshopTheme.blueAccent
                                          .withValues(alpha: 0.12),
                                      borderRadius: BorderRadius.circular(10),
                                    ),
                                    child: const Icon(
                                      LucideIcons.car,
                                      color: WorkshopTheme.blueAccent,
                                      size: 20,
                                    ),
                                  ),
                                  const SizedBox(width: 12),

                                  Expanded(
                                    child: Column(
                                      crossAxisAlignment:
                                          CrossAxisAlignment.start,
                                      children: [
                                        Row(
                                          children: [
                                            Text(
                                              vehicle.plateNumber,
                                              style: WorkshopTheme.mono(
                                                fontWeight: FontWeight.w900,
                                                fontSize: 15,
                                                letterSpacing: 1.2,
                                                color: WorkshopTheme.blueAccent,
                                              ),
                                            ),
                                            const SizedBox(width: 8),
                                            Container(
                                              padding:
                                                  const EdgeInsets.symmetric(
                                                      horizontal: 6,
                                                      vertical: 2),
                                              decoration: BoxDecoration(
                                                color: vehicle.isKey
                                                    ? WorkshopTheme
                                                        .emeraldAccent
                                                        .withValues(alpha: 0.12)
                                                    : WorkshopTheme
                                                        .statusPending
                                                        .withValues(
                                                            alpha: 0.12),
                                                borderRadius:
                                                    BorderRadius.circular(4),
                                              ),
                                              child: Text(
                                                vehicle.isKey ? 'KEY' : 'PIN',
                                                style: TextStyle(
                                                  fontSize: 9,
                                                  fontWeight: FontWeight.w900,
                                                  color: vehicle.isKey
                                                      ? WorkshopTheme
                                                          .emeraldAccent
                                                      : WorkshopTheme
                                                          .statusPending,
                                                ),
                                              ),
                                            ),
                                          ],
                                        ),
                                        const SizedBox(height: 3),
                                        Text(
                                          '${vehicle.make} ${vehicle.model} • ${vehicle.color}',
                                          style: const TextStyle(
                                            fontWeight: FontWeight.w800,
                                            fontSize: 14,
                                            color:
                                                WorkshopTheme.darkTextPrimary,
                                          ),
                                        ),
                                        const SizedBox(height: 3),
                                        Text(
                                          'Owner: ${Formatters.capitalize(customer?.name ?? 'Client')} (${customer?.phone ?? ''})',
                                          style: const TextStyle(
                                            color: WorkshopTheme.darkTextMuted,
                                            fontSize: 12,
                                          ),
                                        ),
                                      ],
                                    ),
                                  ),

                                  // Quick Action Call / WhatsApp
                                  if (customer != null &&
                                      customer.phone.isNotEmpty) ...[
                                    IconButton(
                                      icon: const Icon(LucideIcons.phone,
                                          size: 16,
                                          color: WorkshopTheme.darkTextMuted),
                                      onPressed: () => NativeActions.callPhone(
                                          customer.phone),
                                    ),
                                    IconButton(
                                      icon: const Icon(
                                          LucideIcons.messageSquare,
                                          size: 16,
                                          color:
                                              WorkshopTheme.emeraldAccent),
                                      onPressed: () {
                                        NativeActions.openWhatsApp(
                                          phone: customer.phone,
                                          message:
                                              'Hello ${customer.name}, regarding your ${vehicle.make} ${vehicle.model} ($vehicle.plateNumber) at LaluZ Garage:',
                                        );
                                      },
                                    ),
                                  ],
                                ],
                              ),

                              const SizedBox(height: 10),
                              const Divider(
                                  height: 1,
                                  color: WorkshopTheme.darkBorderSubtle),
                              const SizedBox(height: 6),

                              // Bottom Actions Row: Ledger trigger + Edit / Delete
                              Row(
                                mainAxisAlignment:
                                    MainAxisAlignment.spaceBetween,
                                children: [
                                  Row(
                                    children: [
                                      const Icon(LucideIcons.history,
                                          size: 13,
                                          color: WorkshopTheme.emeraldAccent),
                                      const SizedBox(width: 4),
                                      Text(
                                        'View Service Ledger',
                                        style: TextStyle(
                                          fontSize: 11,
                                          fontWeight: FontWeight.w800,
                                          letterSpacing: 0.4,
                                          color: WorkshopTheme.emeraldAccent
                                              .withValues(alpha: 0.9),
                                        ),
                                      ),
                                    ],
                                  ),

                                  Row(
                                    children: [
                                      IconButton(
                                        icon: const Icon(LucideIcons.edit2,
                                            size: 15,
                                            color: WorkshopTheme.darkTextMuted),
                                        tooltip: 'Edit Vehicle',
                                        onPressed: () =>
                                            _showEditVehicleModal(vehicle),
                                      ),
                                      if (isAdmin)
                                        IconButton(
                                          icon: const Icon(LucideIcons.trash2,
                                              size: 15,
                                              color:
                                                  WorkshopTheme.statusUrgent),
                                          tooltip: 'Delete Vehicle',
                                          onPressed: () =>
                                              _showDeleteVehicleDialog(vehicle),
                                        ),
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
