import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import 'package:intl/intl.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import '../../core/theme/workshop_theme.dart';
import '../../core/utils/native_actions.dart';
import '../../data/models/customer.dart';
import '../../data/models/vehicle.dart';
import '../../data/models/service_record.dart';
import '../../data/models/whatsapp_preset.dart';
import '../../data/repositories/customer_repository.dart';
import '../../data/repositories/vehicle_repository.dart';
import '../../data/repositories/service_repository.dart';
import '../../data/repositories/firebase_providers.dart';
import 'wavy_progress.dart';

class _SearchResultItem {
  final Customer customer;
  final Vehicle? vehicle;

  const _SearchResultItem({
    required this.customer,
    this.vehicle,
  });
}

class IntakeWizardScreen extends ConsumerStatefulWidget {
  const IntakeWizardScreen({super.key});

  @override
  ConsumerState<IntakeWizardScreen> createState() => _IntakeWizardScreenState();
}

class _IntakeWizardScreenState extends ConsumerState<IntakeWizardScreen> {
  int _currentStep = 1;
  bool _isSubmitting = false;

  // Step 1: Customer Discovery & Search
  final _searchController = TextEditingController();
  String _searchQuery = '';
  bool _isRegisteringNewCustomer = false;
  Customer? _selectedCustomer;
  final _nameController = TextEditingController();
  final _phoneController = TextEditingController(text: '+91 ');

  // Step 2: Vehicle
  Vehicle? _selectedVehicle;
  final _makeController = TextEditingController();
  final _modelController = TextEditingController();
  final _colorController = TextEditingController();
  final _plateController = TextEditingController();
  final _pinController = TextEditingController();
  bool _isKey = true;

  // Step 3: Job Specification
  final _mileageController = TextEditingController();
  bool _isDeadVehicle = false;
  bool _isUnknownMileage = false;
  final _descriptionController = TextEditingController();
  final _personalItemsController = TextEditingController();
  DateTime? _expectedDeliveryDate;

  static const _popularMakes = [
    'Ola',
    'Ather',
    'Honda',
    'TVS',
    'Hero',
    'Bajaj',
    'Yamaha',
  ];

  @override
  void dispose() {
    _searchController.dispose();
    _nameController.dispose();
    _phoneController.dispose();
    _makeController.dispose();
    _modelController.dispose();
    _colorController.dispose();
    _plateController.dispose();
    _pinController.dispose();
    _mileageController.dispose();
    _descriptionController.dispose();
    _personalItemsController.dispose();
    super.dispose();
  }

  void _fastTrackToStep3(Customer customer, Vehicle vehicle) {
    setState(() {
      _selectedCustomer = customer;
      _selectedVehicle = vehicle;
      _currentStep = 3;
    });
  }

  void _selectCustomerForStep2(Customer customer) {
    setState(() {
      _selectedCustomer = customer;
      _selectedVehicle = null;
      _currentStep = 2;
    });
  }

  Future<void> _submitIntake() async {
    if (_descriptionController.text.trim().isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Please enter a brief job description')),
      );
      return;
    }

    setState(() => _isSubmitting = true);

    try {
      final user = ref.read(currentUserProvider).asData?.value;
      final techId = user?.uid ?? 'advisor';
      final techName = user?.displayName ?? 'Workshop Advisor';

      // 1. Resolve Customer
      Customer customer = _selectedCustomer ??
          await ref.read(customerRepositoryProvider).createCustomer(
                name: _nameController.text.trim(),
                phone: _phoneController.text.trim(),
                technicianId: techId,
              );

      // 2. Resolve Vehicle
      Vehicle vehicle = _selectedVehicle ??
          await ref.read(vehicleRepositoryProvider).createVehicle(
                customerId: customer.id,
                make: _makeController.text.trim(),
                model: _modelController.text.trim(),
                color: _colorController.text.trim(),
                plateNumber: _plateController.text.trim().toUpperCase(),
                passwordOrPin: _isKey ? 'Key' : _pinController.text.trim(),
                technicianId: techId,
              );

      // 3. Create Service Record
      final mileageVal = _isUnknownMileage || _isDeadVehicle
          ? 0
          : (int.tryParse(_mileageController.text.trim()) ?? 0);

      final record = ServiceRecord(
        id: '',
        vehicleId: vehicle.id,
        customerId: customer.id,
        technicianId: techId,
        technicianName: techName,
        date: DateFormat('yyyy-MM-dd').format(DateTime.now()),
        expectedDeliveryDate: _expectedDeliveryDate != null
            ? DateFormat('yyyy-MM-dd').format(_expectedDeliveryDate!)
            : null,
        mileage: mileageVal,
        isDeadVehicle: _isDeadVehicle,
        isUnknownMileage: _isUnknownMileage,
        personalItems: _personalItemsController.text.trim(),
        description: _descriptionController.text.trim(),
        status: ServiceStatus.pending,
        laborCost: 0,
        partsCost: 0,
        totalCost: 0,
        partsUsed: [],
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      );

      final createdRecord =
          await ref.read(serviceRepositoryProvider).createRecord(record);

      if (mounted) {
        setState(() => _isSubmitting = false);
        _showSuccessDialog(customer, vehicle, createdRecord);
      }
    } catch (e) {
      if (mounted) {
        setState(() => _isSubmitting = false);
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Error saving intake: $e')),
        );
      }
    }
  }

  void _showSuccessDialog(
      Customer customer, Vehicle vehicle, ServiceRecord record) {
    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (ctx) => AlertDialog(
        backgroundColor: WorkshopTheme.darkCard,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        title: Row(
          children: [
            Container(
              padding: const EdgeInsets.all(8),
              decoration: BoxDecoration(
                color: WorkshopTheme.emeraldAccent.withValues(alpha: 0.15),
                shape: BoxShape.circle,
              ),
              child: const Icon(LucideIcons.check,
                  color: WorkshopTheme.emeraldAccent, size: 24),
            ),
            const SizedBox(width: 12),
            const Text(
              'Intake Registered!',
              style: TextStyle(fontSize: 18, fontWeight: FontWeight.w800),
            ),
          ],
        ),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              '${vehicle.make} ${vehicle.model} [${vehicle.plateNumber}]',
              style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 16),
            ),
            const SizedBox(height: 4),
            Text(
              'Customer: ${customer.name} (${customer.phone})',
              style: TextStyle(color: WorkshopTheme.darkTextMuted, fontSize: 13),
            ),
            const SizedBox(height: 16),
            const Text(
              'Notify the customer via WhatsApp and save their contact details to your device.',
              style: TextStyle(fontSize: 12),
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () {
              Navigator.of(ctx).pop();
              Navigator.of(context).pop();
            },
            child: const Text('Done', style: TextStyle(color: Colors.grey)),
          ),
          OutlinedButton.icon(
            onPressed: () {
              NativeActions.createContact(
                name: customer.name,
                phone: customer.phone,
                vehicleInfo:
                    '${vehicle.make} ${vehicle.model} (${vehicle.plateNumber})',
              );
            },
            icon: const Icon(LucideIcons.userPlus, size: 16),
            label: const Text('Add Contact'),
            style: OutlinedButton.styleFrom(
              foregroundColor: WorkshopTheme.blueAccent,
              side: const BorderSide(color: WorkshopTheme.blueAccent),
            ),
          ),
          FilledButton.icon(
            onPressed: () {
              final message = WhatsAppPresets.generateIntakeMessage(
                template: WhatsAppPresets.defaultIntakeTemplate,
                customerName: customer.name,
                vehicle: vehicle,
                record: record,
              );
              NativeActions.openWhatsApp(
                phone: customer.phone,
                message: message,
              );
            },
            icon: const Icon(LucideIcons.messageSquare, size: 16),
            label: const Text('WhatsApp'),
            style: FilledButton.styleFrom(
              backgroundColor: WorkshopTheme.emeraldAccent,
              foregroundColor: Colors.black,
            ),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: WorkshopTheme.darkCanvas,
      appBar: AppBar(
        leading: IconButton(
          icon: const Icon(LucideIcons.arrowLeft),
          onPressed: () {
            if (_currentStep > 1) {
              setState(() => _currentStep--);
            } else {
              Navigator.of(context).pop();
            }
          },
        ),
        title: Text(
          'Vehicle Intake Wizard',
          style: Theme.of(context).textTheme.titleLarge,
        ),
        bottom: PreferredSize(
          preferredSize: const Size.fromHeight(20),
          child: WavyProgressIndicator(currentStep: _currentStep),
        ),
      ),
      body: SafeArea(
        child: Column(
          children: [
            // Step title banner
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
              color: WorkshopTheme.darkSurface,
              child: Row(
                children: [
                  Container(
                    width: 26,
                    height: 26,
                    decoration: const BoxDecoration(
                      color: WorkshopTheme.emeraldAccent,
                      shape: BoxShape.circle,
                    ),
                    child: Center(
                      child: Text(
                        '$_currentStep',
                        style: const TextStyle(
                          color: Colors.black,
                          fontWeight: FontWeight.w900,
                          fontSize: 13,
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Text(
                    _currentStep == 1
                        ? 'STEP 1: CUSTOMER DISCOVERY'
                        : _currentStep == 2
                            ? 'STEP 2: VEHICLE REGISTRATION'
                            : 'STEP 3: JOB SPECIFICATION',
                    style: const TextStyle(
                      fontSize: 12,
                      fontWeight: FontWeight.w800,
                      letterSpacing: 1.2,
                      color: WorkshopTheme.darkTextPrimary,
                    ),
                  ),
                ],
              ),
            ),

            // Wizard Step Content
            Expanded(
              child: AnimatedSwitcher(
                duration: const Duration(milliseconds: 250),
                switchInCurve: const Cubic(0.2, 0.0, 0.0, 1.0),
                switchOutCurve: const Cubic(0.2, 0.0, 0.0, 1.0),
                transitionBuilder: (child, animation) {
                  return FadeTransition(
                    opacity: animation,
                    child: SlideTransition(
                      position: Tween<Offset>(
                        begin: const Offset(0.02, 0.0),
                        end: Offset.zero,
                      ).animate(animation),
                      child: child,
                    ),
                  );
                },
                child: KeyedSubtree(
                  key: ValueKey<String>(
                      'step-$_currentStep-$_isRegisteringNewCustomer'),
                  child: SingleChildScrollView(
                    padding: const EdgeInsets.all(20),
                    child: _buildCurrentStepView(),
                  ),
                ),
              ),
            ),

            // Bottom Action Navigation Bar (Only for Step 2 and 3, or when registering new customer)
            if (_currentStep > 1 || _isRegisteringNewCustomer)
              Container(
                decoration: const BoxDecoration(
                  color: WorkshopTheme.darkSurface,
                  border:
                      Border(top: BorderSide(color: WorkshopTheme.darkBorder)),
                ),
                child: SafeArea(
                  top: false,
                  child: Padding(
                    padding: const EdgeInsets.all(16),
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        OutlinedButton.icon(
                          onPressed: () {
                            if (_isRegisteringNewCustomer && _currentStep == 1) {
                              setState(() => _isRegisteringNewCustomer = false);
                            } else if (_currentStep > 1) {
                              setState(() => _currentStep--);
                            }
                          },
                          icon: const Icon(LucideIcons.chevronLeft, size: 16),
                          label: Text(_isRegisteringNewCustomer && _currentStep == 1
                              ? 'Back to Search'
                              : 'Back'),
                          style: OutlinedButton.styleFrom(
                            foregroundColor: WorkshopTheme.darkTextMuted,
                            side: const BorderSide(color: WorkshopTheme.darkBorder),
                          ),
                        ),
                        FilledButton.icon(
                          onPressed: _isSubmitting
                              ? null
                              : () {
                                  if (_currentStep == 1 &&
                                      _isRegisteringNewCustomer) {
                                    if (_nameController.text.trim().isEmpty) {
                                      ScaffoldMessenger.of(context).showSnackBar(
                                        const SnackBar(
                                            content: Text(
                                                'Please enter customer name')),
                                      );
                                      return;
                                    }
                                    setState(() {
                                      _selectedCustomer = null;
                                      _currentStep = 2;
                                    });
                                  } else if (_currentStep == 2) {
                                    if (_plateController.text.trim().isEmpty ||
                                        _makeController.text.trim().isEmpty ||
                                        _modelController.text.trim().isEmpty) {
                                      ScaffoldMessenger.of(context).showSnackBar(
                                        const SnackBar(
                                            content: Text(
                                                'Please enter plate number, make and model')),
                                      );
                                      return;
                                    }
                                    setState(() => _currentStep = 3);
                                  } else {
                                    _submitIntake();
                                  }
                                },
                          icon: _isSubmitting
                              ? const SizedBox(
                                  width: 16,
                                  height: 16,
                                  child: CircularProgressIndicator(
                                      strokeWidth: 2, color: Colors.black),
                                )
                              : Icon(
                                  _currentStep == 3
                                      ? LucideIcons.check
                                      : LucideIcons.chevronRight,
                                  size: 16,
                                ),
                          label: Text(_isSubmitting
                              ? 'Saving...'
                              : _currentStep == 3
                                  ? 'Finish Intake'
                                  : _currentStep == 1
                                      ? 'Proceed to Vehicle'
                                      : 'Next Step'),
                          style: FilledButton.styleFrom(
                            backgroundColor: WorkshopTheme.emeraldAccent,
                            foregroundColor: Colors.black,
                            padding: const EdgeInsets.symmetric(
                                horizontal: 20, vertical: 12),
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              ),
          ],
        ),
      ),
    );
  }

  Widget _buildCurrentStepView() {
    switch (_currentStep) {
      case 1:
        return _buildStep1CustomerDiscovery();
      case 2:
        return _buildStep2Vehicle();
      case 3:
      default:
        return _buildStep3JobSpec();
    }
  }

  Widget _buildStep1CustomerDiscovery() {
    if (_isRegisteringNewCustomer) {
      return _buildInlineNewCustomerForm();
    }

    final customers = ref.watch(customersStreamProvider).asData?.value ?? [];
    final vehicles = ref.watch(vehiclesStreamProvider).asData?.value ?? [];

    final q = _searchQuery.trim().toLowerCase();
    final qClean = q.replaceAll(RegExp(r'\s+'), '');
    final qDigits = q.replaceAll(RegExp(r'[^0-9]'), '');

    final List<_SearchResultItem> results = [];

    if (q.isNotEmpty) {
      final customerMap = {for (final c in customers) c.id: c};
      final vehiclesByCustomer = <String, List<Vehicle>>{};
      for (final v in vehicles) {
        vehiclesByCustomer.putIfAbsent(v.customerId, () => []).add(v);
      }

      // 1. Search in vehicles
      for (final v in vehicles) {
        final plate = v.plateNumber.toLowerCase().replaceAll(RegExp(r'\s+'), '');
        final make = v.make.toLowerCase();
        final model = v.model.toLowerCase();
        final color = v.color.toLowerCase();
        final pin = v.passwordOrPin.toLowerCase();

        if (plate.contains(qClean) ||
            make.contains(q) ||
            model.contains(q) ||
            '$make $model'.contains(q) ||
            color.contains(q) ||
            pin.contains(q)) {
          final c = customerMap[v.customerId];
          if (c != null) {
            results.add(_SearchResultItem(customer: c, vehicle: v));
          }
        }
      }

      // 2. Search in customers
      for (final c in customers) {
        final name = c.name.toLowerCase();
        final phoneDigits = c.phone.replaceAll(RegExp(r'[^0-9]'), '');

        if (name.contains(q) ||
            (qDigits.isNotEmpty && phoneDigits.contains(qDigits))) {
          final cVehicles = vehiclesByCustomer[c.id] ?? [];
          if (cVehicles.isNotEmpty) {
            for (final v in cVehicles) {
              if (!results.any((r) =>
                  r.customer.id == c.id && r.vehicle?.id == v.id)) {
                results.add(_SearchResultItem(customer: c, vehicle: v));
              }
            }
          } else {
            if (!results.any((r) => r.customer.id == c.id)) {
              results.add(_SearchResultItem(customer: c));
            }
          }
        }
      }
    }

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        // Header
        Row(
          children: [
            Container(
              padding: const EdgeInsets.all(10),
              decoration: BoxDecoration(
                color: WorkshopTheme.emeraldAccent.withValues(alpha: 0.15),
                shape: BoxShape.circle,
              ),
              child: const Icon(LucideIcons.search,
                  color: WorkshopTheme.emeraldAccent, size: 22),
            ),
            const SizedBox(width: 14),
            const Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'Customer Discovery',
                    style: TextStyle(
                      fontSize: 18,
                      fontWeight: FontWeight.w900,
                      letterSpacing: -0.3,
                      color: WorkshopTheme.darkTextPrimary,
                    ),
                  ),
                  SizedBox(height: 2),
                  Text(
                    'Search by phone number, vehicle plate, or client name.',
                    style: TextStyle(
                      color: WorkshopTheme.darkTextMuted,
                      fontSize: 12,
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
        const SizedBox(height: 20),

        // Search Input Box
        TextField(
          controller: _searchController,
          style: const TextStyle(color: WorkshopTheme.darkTextPrimary),
          decoration: InputDecoration(
            hintText: 'Plate number, phone, customer name...',
            prefixIcon: const Icon(LucideIcons.search, size: 18),
            filled: true,
            fillColor: WorkshopTheme.darkCard,
            contentPadding:
                const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
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
          onChanged: (val) => setState(() => _searchQuery = val),
        ),
        const SizedBox(height: 16),

        // Search Results List
        if (q.isNotEmpty && results.isEmpty) ...[
          Container(
            width: double.infinity,
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: WorkshopTheme.darkSurface,
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: WorkshopTheme.darkBorder),
            ),
            child: Text(
              'No matching customer or vehicle found for "$q".',
              style: const TextStyle(
                  color: WorkshopTheme.darkTextMuted, fontSize: 13),
            ),
          ),
          const SizedBox(height: 16),
        ],

        if (results.isNotEmpty) ...[
          Text(
            'MATCHING RECORDS (${results.length})',
            style: const TextStyle(
              fontSize: 11,
              fontWeight: FontWeight.w800,
              letterSpacing: 1.2,
              color: WorkshopTheme.darkTextMuted,
            ),
          ),
          const SizedBox(height: 8),
          ...results.map((item) {
            final hasVehicle = item.vehicle != null;
            return Container(
              margin: const EdgeInsets.only(bottom: 8),
              decoration: BoxDecoration(
                color: const Color(0xFF0A0C10),
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: WorkshopTheme.darkBorder),
              ),
              child: ListTile(
                contentPadding:
                    const EdgeInsets.symmetric(horizontal: 14, vertical: 6),
                leading: Container(
                  width: 44,
                  height: 44,
                  decoration: BoxDecoration(
                    color: WorkshopTheme.darkSurface,
                    borderRadius: BorderRadius.circular(10),
                    border: Border.all(color: WorkshopTheme.darkBorder),
                  ),
                  child: Center(
                    child: Text(
                      hasVehicle
                          ? item.vehicle!.plateNumber.length > 4
                              ? item.vehicle!.plateNumber
                                  .substring(item.vehicle!.plateNumber.length - 4)
                              : item.vehicle!.plateNumber
                          : (item.customer.name.isNotEmpty
                              ? item.customer.name[0].toUpperCase()
                              : 'C'),
                      style: const TextStyle(
                        fontWeight: FontWeight.w900,
                        fontSize: 11,
                        color: WorkshopTheme.darkTextPrimary,
                      ),
                    ),
                  ),
                ),
                title: Row(
                  children: [
                    Flexible(
                      child: Text(
                        item.customer.name,
                        style: const TextStyle(
                          fontWeight: FontWeight.w800,
                          fontSize: 14,
                          color: WorkshopTheme.darkTextPrimary,
                        ),
                      ),
                    ),
                    if (hasVehicle) ...[
                      const SizedBox(width: 8),
                      Container(
                        padding: const EdgeInsets.symmetric(
                            horizontal: 6, vertical: 2),
                        decoration: BoxDecoration(
                          color: WorkshopTheme.emeraldAccent
                              .withValues(alpha: 0.15),
                          borderRadius: BorderRadius.circular(4),
                          border: Border.all(
                            color: WorkshopTheme.emeraldAccent
                                .withValues(alpha: 0.3),
                          ),
                        ),
                        child: Text(
                          item.vehicle!.plateNumber,
                          style: const TextStyle(
                            fontSize: 10,
                            fontWeight: FontWeight.w900,
                            letterSpacing: 0.5,
                            color: WorkshopTheme.emeraldAccent,
                          ),
                        ),
                      ),
                    ],
                  ],
                ),
                subtitle: Padding(
                  padding: const EdgeInsets.only(top: 4),
                  child: Row(
                    children: [
                      Text(
                        item.customer.phone,
                        style: const TextStyle(
                          fontSize: 12,
                          color: WorkshopTheme.darkTextMuted,
                        ),
                      ),
                      if (hasVehicle) ...[
                        const Text(' • ',
                            style: TextStyle(
                                color: WorkshopTheme.darkTextMuted)),
                        Text(
                          '${item.vehicle!.make} ${item.vehicle!.model}',
                          style: const TextStyle(
                            fontSize: 12,
                            color: WorkshopTheme.darkTextMuted,
                          ),
                        ),
                      ],
                    ],
                  ),
                ),
                trailing: const Icon(LucideIcons.chevronRight,
                    size: 18, color: WorkshopTheme.darkTextMuted),
                onTap: () {
                  if (hasVehicle) {
                    _fastTrackToStep3(item.customer, item.vehicle!);
                  } else {
                    _selectCustomerForStep2(item.customer);
                  }
                },
              ),
            );
          }),
          const SizedBox(height: 16),
        ],

        // Register New Customer Button
        OutlinedButton.icon(
          onPressed: () {
            setState(() {
              _isRegisteringNewCustomer = true;
              _nameController.clear();
              _phoneController.text = '+91 ';
            });
          },
          icon: const Icon(LucideIcons.userPlus,
              size: 16, color: WorkshopTheme.emeraldAccent),
          label: const Text('Register New Customer Record'),
          style: OutlinedButton.styleFrom(
            foregroundColor: WorkshopTheme.darkTextPrimary,
            side: const BorderSide(color: WorkshopTheme.darkBorder),
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
            minimumSize: const Size(double.infinity, 48),
            shape:
                RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
          ),
        ),

        // Recent Clients if no active search query
        if (q.isEmpty && customers.isNotEmpty) ...[
          const SizedBox(height: 24),
          const Text(
            'RECENT CLIENTS',
            style: TextStyle(
              fontSize: 11,
              fontWeight: FontWeight.w800,
              letterSpacing: 1.2,
              color: WorkshopTheme.darkTextMuted,
            ),
          ),
          const SizedBox(height: 10),
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: customers.take(8).map((c) {
              return ActionChip(
                label: Text('${c.name} (${c.phone})'),
                backgroundColor: WorkshopTheme.darkCard,
                side: const BorderSide(color: WorkshopTheme.darkBorder),
                labelStyle: const TextStyle(
                  color: WorkshopTheme.darkTextPrimary,
                  fontSize: 12,
                ),
                onPressed: () => _selectCustomerForStep2(c),
              );
            }).toList(),
          ),
        ],
      ],
    );
  }

  Widget _buildInlineNewCustomerForm() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            Container(
              padding: const EdgeInsets.all(10),
              decoration: BoxDecoration(
                color: WorkshopTheme.emeraldAccent.withValues(alpha: 0.15),
                shape: BoxShape.circle,
              ),
              child: const Icon(LucideIcons.userPlus,
                  color: WorkshopTheme.emeraldAccent, size: 22),
            ),
            const SizedBox(width: 14),
            const Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'New Customer Record',
                    style: TextStyle(
                      fontSize: 18,
                      fontWeight: FontWeight.w900,
                      letterSpacing: -0.3,
                      color: WorkshopTheme.darkTextPrimary,
                    ),
                  ),
                  SizedBox(height: 2),
                  Text(
                    'Enter client contact information.',
                    style: TextStyle(
                      color: WorkshopTheme.darkTextMuted,
                      fontSize: 12,
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
        const SizedBox(height: 20),

        TextField(
          controller: _nameController,
          autofocus: true,
          style: const TextStyle(color: WorkshopTheme.darkTextPrimary),
          decoration: InputDecoration(
            labelText: 'Customer Full Name',
            hintText: 'e.g. Rahul Sharma',
            prefixIcon: const Icon(LucideIcons.user, size: 18),
            filled: true,
            fillColor: WorkshopTheme.darkCard,
            border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
          ),
        ),
        const SizedBox(height: 14),

        TextField(
          controller: _phoneController,
          keyboardType: TextInputType.phone,
          style: const TextStyle(color: WorkshopTheme.darkTextPrimary),
          decoration: InputDecoration(
            labelText: 'Primary Phone Number',
            hintText: '+91 9876543210',
            prefixIcon: const Icon(LucideIcons.phone, size: 18),
            filled: true,
            fillColor: WorkshopTheme.darkCard,
            border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
          ),
        ),
      ],
    );
  }

  Widget _buildStep2Vehicle() {
    final customerVehicles = _selectedCustomer != null
        ? (ref
                .watch(vehiclesStreamProvider)
                .asData
                ?.value
                .where((v) => v.customerId == _selectedCustomer!.id)
                .toList() ??
            [])
        : <Vehicle>[];

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        // Customer Summary Header
        if (_selectedCustomer != null) ...[
          Container(
            padding: const EdgeInsets.all(14),
            decoration: BoxDecoration(
              color: WorkshopTheme.darkSurface,
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: WorkshopTheme.darkBorder),
            ),
            child: Row(
              children: [
                CircleAvatar(
                  radius: 18,
                  backgroundColor:
                      WorkshopTheme.emeraldAccent.withValues(alpha: 0.15),
                  child: Text(
                    _selectedCustomer!.name.isNotEmpty
                        ? _selectedCustomer!.name[0].toUpperCase()
                        : 'C',
                    style: const TextStyle(
                      color: WorkshopTheme.emeraldAccent,
                      fontWeight: FontWeight.w900,
                    ),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        _selectedCustomer!.name,
                        style: const TextStyle(
                          fontWeight: FontWeight.w800,
                          fontSize: 14,
                          color: WorkshopTheme.darkTextPrimary,
                        ),
                      ),
                      Text(
                        _selectedCustomer!.phone,
                        style: const TextStyle(
                          fontSize: 12,
                          color: WorkshopTheme.darkTextMuted,
                        ),
                      ),
                    ],
                  ),
                ),
                const Icon(LucideIcons.checkCircle2,
                    size: 18, color: WorkshopTheme.emeraldAccent),
              ],
            ),
          ),
          const SizedBox(height: 20),
        ],

        // If customer has registered vehicles, show quick selection
        if (customerVehicles.isNotEmpty) ...[
          const Text(
            'REGISTERED VEHICLES FOR THIS CLIENT',
            style: TextStyle(
              fontSize: 11,
              fontWeight: FontWeight.w800,
              letterSpacing: 1.2,
              color: WorkshopTheme.darkTextMuted,
            ),
          ),
          const SizedBox(height: 8),
          ...customerVehicles.map((v) {
            return Container(
              margin: const EdgeInsets.only(bottom: 8),
              decoration: BoxDecoration(
                color: const Color(0xFF0A0C10),
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: WorkshopTheme.darkBorder),
              ),
              child: ListTile(
                leading: const Icon(LucideIcons.car,
                    color: WorkshopTheme.blueAccent),
                title: Text(
                  '${v.make} ${v.model}',
                  style: const TextStyle(fontWeight: FontWeight.w800),
                ),
                subtitle: Text(
                  '${v.plateNumber} • ${v.color}',
                  style: const TextStyle(fontSize: 12),
                ),
                trailing: const Icon(LucideIcons.chevronRight, size: 16),
                onTap: () => _fastTrackToStep3(_selectedCustomer!, v),
              ),
            );
          }),
          const SizedBox(height: 16),
          const Row(
            children: [
              Expanded(child: Divider(color: WorkshopTheme.darkBorder)),
              Padding(
                padding: EdgeInsets.symmetric(horizontal: 10),
                child: Text('OR REGISTER NEW VEHICLE',
                    style: TextStyle(
                        fontSize: 10,
                        fontWeight: FontWeight.w800,
                        color: WorkshopTheme.darkTextMuted)),
              ),
              Expanded(child: Divider(color: WorkshopTheme.darkBorder)),
            ],
          ),
          const SizedBox(height: 16),
        ],

        // Registration Plate
        TextField(
          controller: _plateController,
          textCapitalization: TextCapitalization.characters,
          style: const TextStyle(
            fontWeight: FontWeight.w900,
            letterSpacing: 1.5,
            color: WorkshopTheme.darkTextPrimary,
          ),
          decoration: InputDecoration(
            labelText: 'Registration Plate Number',
            hintText: 'e.g. MH12AB1234',
            prefixIcon: const Icon(LucideIcons.car, size: 18),
            filled: true,
            fillColor: WorkshopTheme.darkCard,
            border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
          ),
        ),
        const SizedBox(height: 14),

        // Popular Makes Chips
        Wrap(
          spacing: 6,
          runSpacing: 6,
          children: _popularMakes.map((m) {
            final isSelected =
                _makeController.text.trim().toLowerCase() == m.toLowerCase();
            return ActionChip(
              label: Text(m),
              backgroundColor: isSelected
                  ? WorkshopTheme.emeraldAccent.withValues(alpha: 0.2)
                  : WorkshopTheme.darkSurface,
              side: BorderSide(
                color: isSelected
                    ? WorkshopTheme.emeraldAccent
                    : WorkshopTheme.darkBorder,
              ),
              labelStyle: TextStyle(
                fontSize: 12,
                fontWeight: isSelected ? FontWeight.w800 : FontWeight.w600,
                color: isSelected
                    ? WorkshopTheme.emeraldAccent
                    : WorkshopTheme.darkTextPrimary,
              ),
              onPressed: () {
                setState(() => _makeController.text = m);
              },
            );
          }).toList(),
        ),
        const SizedBox(height: 14),

        // Make & Model Row
        Row(
          children: [
            Expanded(
              child: TextField(
                controller: _makeController,
                style: const TextStyle(color: WorkshopTheme.darkTextPrimary),
                decoration: InputDecoration(
                  labelText: 'Make',
                  hintText: 'e.g. Ola',
                  filled: true,
                  fillColor: WorkshopTheme.darkCard,
                  border: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(12)),
                ),
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: TextField(
                controller: _modelController,
                style: const TextStyle(color: WorkshopTheme.darkTextPrimary),
                decoration: InputDecoration(
                  labelText: 'Model',
                  hintText: 'e.g. S1 Pro',
                  filled: true,
                  fillColor: WorkshopTheme.darkCard,
                  border: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(12)),
                ),
              ),
            ),
          ],
        ),
        const SizedBox(height: 14),

        // Color
        TextField(
          controller: _colorController,
          style: const TextStyle(color: WorkshopTheme.darkTextPrimary),
          decoration: InputDecoration(
            labelText: 'Color',
            hintText: 'e.g. Midnight Black',
            prefixIcon: const Icon(LucideIcons.palette, size: 18),
            filled: true,
            fillColor: WorkshopTheme.darkCard,
            border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
          ),
        ),
        const SizedBox(height: 16),

        // Physical Key vs Screen PIN Selector
        Row(
          children: [
            ChoiceChip(
              label: const Text('Physical Key'),
              selected: _isKey,
              selectedColor: WorkshopTheme.emeraldAccent.withValues(alpha: 0.2),
              onSelected: (val) => setState(() => _isKey = true),
            ),
            const SizedBox(width: 8),
            ChoiceChip(
              label: const Text('Screen PIN'),
              selected: !_isKey,
              selectedColor: WorkshopTheme.blueAccent.withValues(alpha: 0.2),
              onSelected: (val) => setState(() => _isKey = false),
            ),
          ],
        ),
        if (!_isKey) ...[
          const SizedBox(height: 12),
          TextField(
            controller: _pinController,
            keyboardType: TextInputType.number,
            style: const TextStyle(
              fontWeight: FontWeight.w900,
              letterSpacing: 2,
              color: WorkshopTheme.darkTextPrimary,
            ),
            decoration: InputDecoration(
              labelText: 'Screen Unlock PIN / Passcode',
              hintText: '4 or 6 digit PIN',
              prefixIcon: const Icon(LucideIcons.key, size: 18),
              filled: true,
              fillColor: WorkshopTheme.darkCard,
              border:
                  OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
            ),
          ),
        ],
      ],
    );
  }

  Widget _buildStep3JobSpec() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        // Summary Header Card
        Container(
          padding: const EdgeInsets.all(14),
          decoration: BoxDecoration(
            color: WorkshopTheme.darkSurface,
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: WorkshopTheme.darkBorder),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  const Icon(LucideIcons.car,
                      color: WorkshopTheme.emeraldAccent, size: 18),
                  const SizedBox(width: 8),
                  Text(
                    _selectedVehicle != null
                        ? '${_selectedVehicle!.make} ${_selectedVehicle!.model}'
                        : '${_makeController.text} ${_modelController.text}',
                    style: const TextStyle(
                      fontWeight: FontWeight.w800,
                      fontSize: 15,
                      color: WorkshopTheme.darkTextPrimary,
                    ),
                  ),
                  const SizedBox(width: 8),
                  Container(
                    padding:
                        const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                    decoration: BoxDecoration(
                      color:
                          WorkshopTheme.emeraldAccent.withValues(alpha: 0.15),
                      borderRadius: BorderRadius.circular(4),
                    ),
                    child: Text(
                      _selectedVehicle != null
                          ? _selectedVehicle!.plateNumber
                          : _plateController.text.toUpperCase(),
                      style: const TextStyle(
                        fontSize: 10,
                        fontWeight: FontWeight.w900,
                        letterSpacing: 0.5,
                        color: WorkshopTheme.emeraldAccent,
                      ),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 6),
              Text(
                'Customer: ${_selectedCustomer?.name ?? _nameController.text} (${_selectedCustomer?.phone ?? _phoneController.text})',
                style:
                    const TextStyle(color: WorkshopTheme.darkTextMuted, fontSize: 12),
              ),
            ],
          ),
        ),
        const SizedBox(height: 20),

        // Odometer Mileage
        TextField(
          controller: _mileageController,
          keyboardType: TextInputType.number,
          enabled: !_isDeadVehicle && !_isUnknownMileage,
          style: const TextStyle(
            fontWeight: FontWeight.w800,
            color: WorkshopTheme.darkTextPrimary,
          ),
          decoration: InputDecoration(
            labelText: 'Odometer Mileage (km)',
            hintText: 'e.g. 14250',
            prefixIcon: const Icon(LucideIcons.gauge, size: 18),
            filled: true,
            fillColor: WorkshopTheme.darkCard,
            border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
          ),
        ),
        const SizedBox(height: 10),

        // Quick Odometer Toggles
        Row(
          children: [
            FilterChip(
              label: const Text('Dead Vehicle'),
              selected: _isDeadVehicle,
              selectedColor: WorkshopTheme.statusUrgent.withValues(alpha: 0.2),
              onSelected: (val) {
                setState(() {
                  _isDeadVehicle = val;
                  if (val) _isUnknownMileage = false;
                });
              },
            ),
            const SizedBox(width: 8),
            FilterChip(
              label: const Text('Unknown Mileage'),
              selected: _isUnknownMileage,
              selectedColor: WorkshopTheme.statusPending.withValues(alpha: 0.2),
              onSelected: (val) {
                setState(() {
                  _isUnknownMileage = val;
                  if (val) _isDeadVehicle = false;
                });
              },
            ),
          ],
        ),
        const SizedBox(height: 16),

        // Job Description
        TextField(
          controller: _descriptionController,
          maxLines: 4,
          style: const TextStyle(color: WorkshopTheme.darkTextPrimary),
          decoration: InputDecoration(
            labelText: 'Job Description / Work Required',
            hintText:
                'Use markdown checklist for tasks:\n[ ] Front brake pads replacement\n[ ] General service & oil check',
            filled: true,
            fillColor: WorkshopTheme.darkCard,
            border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
          ),
        ),
        const SizedBox(height: 16),

        // Personal items left in vehicle
        TextField(
          controller: _personalItemsController,
          style: const TextStyle(color: WorkshopTheme.darkTextPrimary),
          decoration: InputDecoration(
            labelText: 'Personal Items Left in Vehicle (Optional)',
            hintText: 'e.g. Helmet, RC copy, raincoat',
            prefixIcon: const Icon(LucideIcons.package, size: 18),
            filled: true,
            fillColor: WorkshopTheme.darkCard,
            border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
          ),
        ),
        const SizedBox(height: 16),

        // Promised Delivery Date
        InkWell(
          onTap: () async {
            final picked = await showDatePicker(
              context: context,
              initialDate: DateTime.now().add(const Duration(days: 1)),
              firstDate: DateTime.now(),
              lastDate: DateTime.now().add(const Duration(days: 90)),
            );
            if (picked != null) {
              setState(() => _expectedDeliveryDate = picked);
            }
          },
          borderRadius: BorderRadius.circular(12),
          child: Container(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
            decoration: BoxDecoration(
              color: WorkshopTheme.darkCard,
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: WorkshopTheme.darkBorder),
            ),
            child: Row(
              children: [
                const Icon(LucideIcons.calendar,
                    size: 18, color: WorkshopTheme.darkTextMuted),
                const SizedBox(width: 12),
                Expanded(
                  child: Text(
                    _expectedDeliveryDate != null
                        ? 'Promised Delivery: ${DateFormat('dd MMM yyyy').format(_expectedDeliveryDate!)}'
                        : 'Select Expected Delivery Date (Optional)',
                    style: TextStyle(
                      color: _expectedDeliveryDate != null
                          ? WorkshopTheme.darkTextPrimary
                          : WorkshopTheme.darkTextMuted,
                      fontWeight: _expectedDeliveryDate != null
                          ? FontWeight.w700
                          : FontWeight.normal,
                    ),
                  ),
                ),
                if (_expectedDeliveryDate != null)
                  IconButton(
                    icon: const Icon(LucideIcons.x, size: 16),
                    onPressed: () =>
                        setState(() => _expectedDeliveryDate = null),
                  ),
              ],
            ),
          ),
        ),
      ],
    );
  }
}
