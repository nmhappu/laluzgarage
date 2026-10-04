import 'package:flutter/material.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import '../../../core/theme/workshop_theme.dart';
import '../../../data/models/whatsapp_preset.dart';

class WhatsAppPresetsView extends StatefulWidget {
  final String initialIntakeTemplate;
  final String initialDeliveryTemplate;
  final Future<void> Function(String intake, String delivery) onSavePresets;
  final VoidCallback onCancel;

  const WhatsAppPresetsView({
    super.key,
    required this.initialIntakeTemplate,
    required this.initialDeliveryTemplate,
    required this.onSavePresets,
    required this.onCancel,
  });

  @override
  State<WhatsAppPresetsView> createState() => _WhatsAppPresetsViewState();
}

class _WhatsAppPresetsViewState extends State<WhatsAppPresetsView> {
  int _activeTab = 0; // 0: Intake, 1: Delivery
  late TextEditingController _intakeController;
  late TextEditingController _deliveryController;
  bool _isSaving = false;

  @override
  void initState() {
    super.initState();
    _intakeController = TextEditingController(text: widget.initialIntakeTemplate);
    _deliveryController = TextEditingController(text: widget.initialDeliveryTemplate);
  }

  @override
  void didUpdateWidget(covariant WhatsAppPresetsView oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.initialIntakeTemplate != widget.initialIntakeTemplate) {
      _intakeController.text = widget.initialIntakeTemplate;
    }
    if (oldWidget.initialDeliveryTemplate != widget.initialDeliveryTemplate) {
      _deliveryController.text = widget.initialDeliveryTemplate;
    }
  }

  @override
  void dispose() {
    _intakeController.dispose();
    _deliveryController.dispose();
    super.dispose();
  }

  void _insertVariable(String variable) {
    final controller = _activeTab == 0 ? _intakeController : _deliveryController;
    final text = controller.text;
    final selection = controller.selection;

    if (selection.start >= 0) {
      final newText = text.replaceRange(selection.start, selection.end, variable);
      controller.value = TextEditingValue(
        text: newText,
        selection: TextSelection.collapsed(offset: selection.start + variable.length),
      );
    } else {
      controller.text = '$text$variable';
    }
    setState(() {});
  }

  void _resetToDefault() {
    setState(() {
      if (_activeTab == 0) {
        _intakeController.text = WhatsAppPresets.defaultIntakeTemplate;
      } else {
        _deliveryController.text = WhatsAppPresets.defaultDeliveryTemplate;
      }
    });
  }

  String _generateLivePreview() {
    final rawTemplate = _activeTab == 0 ? _intakeController.text : _deliveryController.text;

    if (_activeTab == 0) {
      return rawTemplate
          .replaceAll('{customer_name}', 'Rahul Sharma')
          .replaceAll('{vehicle_make}', 'BMW')
          .replaceAll('{vehicle_model}', 'M3 Competition')
          .replaceAll('{vehicle_plate}', 'KA-01-AB-1234')
          .replaceAll('{vehicle_title}', 'BMW M3 Competition')
          .replaceAll(
            '{job_description}',
            'Full synthetic oil change, brake pad inspection & alignment check',
          );
    } else {
      return rawTemplate
          .replaceAll('{customer_name}', 'Rahul Sharma')
          .replaceAll('{vehicle_title}', 'BMW M3 Competition')
          .replaceAll('{vehicle_make}', 'BMW')
          .replaceAll('{vehicle_model}', 'M3 Competition')
          .replaceAll('{vehicle_plate}', 'KA-01-AB-1234')
          .replaceAll(
            '{parts_list}',
            '1. Brembo Front Brake Pads (x2) - ₹8,500\n2. Engine Oil 5W40 (x4L) - ₹3,200',
          )
          .replaceAll('{labor_cost}', '₹2,500')
          .replaceAll('{total_cost}', '₹14,200')
          .replaceAll(
            '{job_description}',
            'Full synthetic oil change, brake pad inspection & alignment check',
          );
    }
  }

  @override
  Widget build(BuildContext context) {
    final intakeVariables = [
      {'tag': '{customer_name}', 'label': 'Customer Name'},
      {'tag': '{vehicle_make}', 'label': 'Vehicle Make'},
      {'tag': '{vehicle_model}', 'label': 'Vehicle Model'},
      {'tag': '{vehicle_plate}', 'label': 'Plate Number'},
      {'tag': '{job_description}', 'label': 'Job Details'},
    ];

    final deliveryVariables = [
      {'tag': '{customer_name}', 'label': 'Customer Name'},
      {'tag': '{vehicle_title}', 'label': 'Vehicle Title'},
      {'tag': '{vehicle_make}', 'label': 'Vehicle Make'},
      {'tag': '{vehicle_model}', 'label': 'Vehicle Model'},
      {'tag': '{vehicle_plate}', 'label': 'Plate Number'},
      {'tag': '{job_description}', 'label': 'Job Details'},
      {'tag': '{parts_list}', 'label': 'Parts Used List'},
      {'tag': '{labor_cost}', 'label': 'Labor Cost'},
      {'tag': '{total_cost}', 'label': 'Total Amount'},
    ];

    final activeVariables = _activeTab == 0 ? intakeVariables : deliveryVariables;

    return ListView(
      padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 16),
      children: [
        // Tab Switcher
        Container(
          padding: const EdgeInsets.all(4),
          decoration: BoxDecoration(
            color: WorkshopTheme.darkSurface,
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: WorkshopTheme.darkBorder),
          ),
          child: Row(
            children: [
              Expanded(
                child: InkWell(
                  onTap: () => setState(() => _activeTab = 0),
                  borderRadius: BorderRadius.circular(8),
                  child: Container(
                    padding: const EdgeInsets.symmetric(vertical: 10),
                    decoration: BoxDecoration(
                      color: _activeTab == 0
                          ? WorkshopTheme.emeraldAccent
                          : Colors.transparent,
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Icon(
                          LucideIcons.messageSquare,
                          size: 14,
                          color: _activeTab == 0
                              ? Colors.black
                              : WorkshopTheme.darkTextMuted,
                        ),
                        const SizedBox(width: 8),
                        Text(
                          'INTAKE MESSAGE',
                          style: TextStyle(
                            fontSize: 11,
                            fontWeight: FontWeight.w900,
                            letterSpacing: 0.8,
                            color: _activeTab == 0
                                ? Colors.black
                                : WorkshopTheme.darkTextMuted,
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              ),
              Expanded(
                child: InkWell(
                  onTap: () => setState(() => _activeTab = 1),
                  borderRadius: BorderRadius.circular(8),
                  child: Container(
                    padding: const EdgeInsets.symmetric(vertical: 10),
                    decoration: BoxDecoration(
                      color: _activeTab == 1
                          ? WorkshopTheme.emeraldAccent
                          : Colors.transparent,
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Icon(
                          LucideIcons.check,
                          size: 14,
                          color: _activeTab == 1
                              ? Colors.black
                              : WorkshopTheme.darkTextMuted,
                        ),
                        const SizedBox(width: 8),
                        Text(
                          'DELIVERY MESSAGE',
                          style: TextStyle(
                            fontSize: 11,
                            fontWeight: FontWeight.w900,
                            letterSpacing: 0.8,
                            color: _activeTab == 1
                                ? Colors.black
                                : WorkshopTheme.darkTextMuted,
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

        const SizedBox(height: 20),

        // Section Guidance & Reset
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    _activeTab == 0
                        ? 'Vehicle Intake Registration Preset'
                        : 'Service Delivery & Completion Preset',
                    style: const TextStyle(
                      fontSize: 13,
                      fontWeight: FontWeight.w800,
                      color: WorkshopTheme.darkTextPrimary,
                    ),
                  ),
                  const SizedBox(height: 2),
                  Text(
                    _activeTab == 0
                        ? 'Sent or opened when registering a vehicle for service intake.'
                        : 'Sent or opened when completing a service job and issuing final bill.',
                    style: const TextStyle(
                      fontSize: 11,
                      color: WorkshopTheme.darkTextMuted,
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(width: 12),
            OutlinedButton.icon(
              onPressed: _resetToDefault,
              icon: const Icon(LucideIcons.rotateCcw, size: 13),
              label: const Text(
                'RESET DEFAULT',
                style: TextStyle(
                  fontSize: 10,
                  fontWeight: FontWeight.w800,
                  letterSpacing: 0.6,
                ),
              ),
              style: OutlinedButton.styleFrom(
                foregroundColor: WorkshopTheme.darkTextMuted,
                side: const BorderSide(color: WorkshopTheme.darkBorder),
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(8),
                ),
              ),
            ),
          ],
        ),

        const SizedBox(height: 16),

        // Clickable variables
        Container(
          padding: const EdgeInsets.all(12),
          decoration: BoxDecoration(
            color: WorkshopTheme.darkSurface.withValues(alpha: 0.6),
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: WorkshopTheme.darkBorder.withValues(alpha: 0.5)),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text(
                'AVAILABLE VARIABLES (CLICK TO INSERT):',
                style: TextStyle(
                  fontSize: 10,
                  fontWeight: FontWeight.w800,
                  letterSpacing: 1.0,
                  color: WorkshopTheme.darkTextMuted,
                ),
              ),
              const SizedBox(height: 8),
              Wrap(
                spacing: 6,
                runSpacing: 6,
                children: activeVariables.map((v) {
                  return ActionChip(
                    onPressed: () => _insertVariable(v['tag']!),
                    backgroundColor: WorkshopTheme.darkSurface,
                    side: const BorderSide(color: WorkshopTheme.darkBorder),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(6),
                    ),
                    padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 0),
                    label: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Text(
                          v['tag']!,
                          style: WorkshopTheme.mono(
                            fontSize: 11,
                            fontWeight: FontWeight.w700,
                            color: WorkshopTheme.emeraldAccent,
                          ),
                        ),
                        const SizedBox(width: 4),
                        Text(
                          '(${v['label']})',
                          style: const TextStyle(
                            fontSize: 9,
                            color: WorkshopTheme.darkTextMuted,
                          ),
                        ),
                      ],
                    ),
                  );
                }).toList(),
              ),
            ],
          ),
        ),

        const SizedBox(height: 18),

        // Template editor
        const Text(
          'MESSAGE TEMPLATE TEXT',
          style: TextStyle(
            fontSize: 11,
            fontWeight: FontWeight.w900,
            letterSpacing: 1.2,
            color: WorkshopTheme.darkTextMuted,
          ),
        ),
        const SizedBox(height: 8),
        TextField(
          controller: _activeTab == 0 ? _intakeController : _deliveryController,
          maxLines: 7,
          onChanged: (_) => setState(() {}),
          style: WorkshopTheme.mono(
            fontSize: 12,
            color: WorkshopTheme.darkTextPrimary,
          ),
          decoration: InputDecoration(
            filled: true,
            fillColor: WorkshopTheme.darkSurface,
            contentPadding: const EdgeInsets.all(14),
            border: OutlineInputBorder(
              borderRadius: BorderRadius.circular(12),
              borderSide: const BorderSide(color: WorkshopTheme.darkBorder),
            ),
            enabledBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(12),
              borderSide: const BorderSide(color: WorkshopTheme.darkBorder),
            ),
            focusedBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(12),
              borderSide: const BorderSide(color: WorkshopTheme.emeraldAccent),
            ),
          ),
        ),

        const SizedBox(height: 20),

        // WhatsApp Chat Bubble Live Preview
        Row(
          children: [
            const Icon(LucideIcons.sparkles, size: 14, color: WorkshopTheme.emeraldAccent),
            const SizedBox(width: 6),
            const Text(
              'LIVE WHATSAPP MESSAGE PREVIEW',
              style: TextStyle(
                fontSize: 11,
                fontWeight: FontWeight.w900,
                letterSpacing: 1.2,
                color: WorkshopTheme.darkTextMuted,
              ),
            ),
          ],
        ),
        const SizedBox(height: 8),

        Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: const Color(0xFF0B141A),
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: const Color(0xFF222D34)),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text(
                'SAMPLE LIVE PREVIEW',
                style: TextStyle(
                  fontSize: 10,
                  fontWeight: FontWeight.w800,
                  letterSpacing: 1.0,
                  color: Color(0xFF8696A0),
                ),
              ),
              const SizedBox(height: 10),
              Container(
                width: double.infinity,
                padding: const EdgeInsets.all(14),
                decoration: BoxDecoration(
                  color: const Color(0xFF005C4B),
                  borderRadius: BorderRadius.circular(8),
                  border: Border.all(color: const Color(0xFF005C4B)),
                ),
                child: Text(
                  _generateLivePreview(),
                  style: const TextStyle(
                    fontSize: 12.5,
                    height: 1.45,
                    color: Color(0xFFE9EDEF),
                  ),
                ),
              ),
            ],
          ),
        ),

        const SizedBox(height: 24),

        // Action Buttons
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            TextButton(
              onPressed: widget.onCancel,
              child: const Text(
                'CANCEL',
                style: TextStyle(
                  fontSize: 11,
                  fontWeight: FontWeight.w800,
                  letterSpacing: 0.8,
                  color: WorkshopTheme.darkTextMuted,
                ),
              ),
            ),
            FilledButton.icon(
              onPressed: _isSaving
                  ? null
                  : () async {
                      setState(() => _isSaving = true);
                      try {
                        await widget.onSavePresets(
                          _intakeController.text.trim(),
                          _deliveryController.text.trim(),
                        );
                      } finally {
                        if (mounted) setState(() => _isSaving = false);
                      }
                    },
              icon: _isSaving
                  ? const SizedBox(
                      width: 14,
                      height: 14,
                      child: CircularProgressIndicator(
                        strokeWidth: 2,
                        color: Colors.black,
                      ),
                    )
                  : const Icon(LucideIcons.check, size: 16),
              label: const Text(
                'SAVE PRESETS',
                style: TextStyle(
                  fontSize: 11,
                  fontWeight: FontWeight.w900,
                  letterSpacing: 0.8,
                ),
              ),
              style: FilledButton.styleFrom(
                backgroundColor: WorkshopTheme.emeraldAccent,
                foregroundColor: Colors.black,
                padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 14),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(8),
                ),
              ),
            ),
          ],
        ),
      ],
    );
  }
}
