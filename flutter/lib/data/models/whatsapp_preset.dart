import '../models/customer.dart';
import '../models/vehicle.dart';
import '../models/service_record.dart';
import '../../core/utils/formatters.dart';

class WhatsAppPresets {
  final String intakeTemplate;
  final String deliveryTemplate;

  WhatsAppPresets({
    required this.intakeTemplate,
    required this.deliveryTemplate,
  });

  static const String defaultIntakeTemplate = '''Hello {customer_name},

We have successfully registered your vehicle *{vehicle_make} {vehicle_model}* [{vehicle_plate}] at our service center.

*Job Details:* {job_description}
*Status:* Pending

We will keep you updated on the progress. Thank you!''';

  static const String defaultDeliveryTemplate = '''*Service Completed - LaluZ Garage*

Hello *{customer_name}*,
Your vehicle *{vehicle_title}* [{vehicle_plate}] service has been successfully completed and is ready for pickup!

*Job Details:* {job_description}

*Fixed / Replaced Parts:*
{parts_list}

*Labor Charges:* {labor_cost}
*Final Bill Amount:* {total_cost}

Thank you for choosing LaluZ Garage!''';

  static WhatsAppPresets get defaults => WhatsAppPresets(
        intakeTemplate: defaultIntakeTemplate,
        deliveryTemplate: defaultDeliveryTemplate,
      );

  static String generateIntakeMessage({
    required String template,
    required String customerName,
    Vehicle? vehicle,
    required ServiceRecord record,
  }) {
    final cleanDesc = record.description
        .replaceAll(RegExp(r'\[[x ]\]\s*'), '')
        .trim();

    return template
        .replaceAll('{customer_name}', Formatters.capitalize(customerName))
        .replaceAll('{vehicle_make}', vehicle?.make ?? '')
        .replaceAll('{vehicle_model}', vehicle?.model ?? '')
        .replaceAll('{vehicle_plate}', vehicle?.plateNumber ?? '')
        .replaceAll('{vehicle_title}', vehicle != null ? '${vehicle.make} ${vehicle.model}' : '')
        .replaceAll('{job_description}', cleanDesc.isNotEmpty ? cleanDesc : 'General Inspection');
  }

  static String generateDeliveryMessage({
    required String template,
    required String customerName,
    Vehicle? vehicle,
    required ServiceRecord record,
  }) {
    final cleanDesc = record.description
        .replaceAll(RegExp(r'\[[x ]\]\s*'), '')
        .trim();

    final partsList = record.partsUsed.isEmpty
        ? 'None'
        : record.partsUsed
            .map((p) => '• ${p.name} (x${p.quantity}) - ${Formatters.currency(p.totalPrice)}')
            .join('\n');

    return template
        .replaceAll('{customer_name}', Formatters.capitalize(customerName))
        .replaceAll('{vehicle_make}', vehicle?.make ?? '')
        .replaceAll('{vehicle_model}', vehicle?.model ?? '')
        .replaceAll('{vehicle_plate}', vehicle?.plateNumber ?? '')
        .replaceAll('{vehicle_title}', vehicle != null ? '${vehicle.make} ${vehicle.model}' : '')
        .replaceAll('{job_description}', cleanDesc.isNotEmpty ? cleanDesc : 'Service & Maintenance')
        .replaceAll('{parts_list}', partsList)
        .replaceAll('{labor_cost}', Formatters.currency(record.laborCost))
        .replaceAll('{total_cost}', Formatters.currency(record.totalCost));
  }

  String formatIntakeMessage({
    required Customer customer,
    required Vehicle vehicle,
    required ServiceRecord record,
  }) => generateIntakeMessage(
    template: intakeTemplate,
    customerName: customer.name,
    vehicle: vehicle,
    record: record,
  );

  String formatDeliveryMessage({
    required Customer customer,
    required Vehicle vehicle,
    required ServiceRecord record,
  }) => generateDeliveryMessage(
    template: deliveryTemplate,
    customerName: customer.name,
    vehicle: vehicle,
    record: record,
  );
}
