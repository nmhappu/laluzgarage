import 'package:flutter/foundation.dart'
    show kIsWeb, defaultTargetPlatform, TargetPlatform, debugPrint;
import 'package:flutter/services.dart';
import 'package:url_launcher/url_launcher.dart';
import 'formatters.dart';

class NativeActions {
  static const MethodChannel _platformChannel =
      MethodChannel('dev.appu.laluzgarage/native');

  /// Opens WhatsApp with pre-filled message
  static Future<bool> openWhatsApp({
    required String phone,
    required String message,
  }) async {
    final cleaned = Formatters.cleanPhoneNumber(phone).replaceAll('+', '');
    final encodedMessage = Uri.encodeComponent(message);
    final url = Uri.parse('https://wa.me/$cleaned?text=$encodedMessage');

    if (await canLaunchUrl(url)) {
      return await launchUrl(url, mode: LaunchMode.externalApplication);
    }
    return false;
  }

  /// Triggers Android's native "Create Contact" activity with fields pre-filled via MethodChannel
  static Future<void> createContact({
    required String name,
    required String phone,
    String? vehicleInfo,
  }) async {
    if (!kIsWeb && defaultTargetPlatform == TargetPlatform.android) {
      final formattedName = Formatters.capitalize(name);
      final cleanPhone = Formatters.cleanPhoneNumber(phone);
      final note = vehicleInfo != null
          ? 'Vehicle: $vehicleInfo | LaluZ Garage'
          : 'LaluZ Garage Client';

      try {
        await _platformChannel.invokeMethod('createContact', {
          'name': formattedName,
          'phone': cleanPhone,
          'notes': note,
        });
      } catch (e) {
        debugPrint('Failed to open native contact screen: $e');
      }
    }
  }

  /// Initiates a phone call
  static Future<bool> callPhone(String phone) async {
    final clean = Formatters.cleanPhoneNumber(phone);
    final url = Uri.parse('tel:$clean');
    if (await canLaunchUrl(url)) {
      return await launchUrl(url);
    }
    return false;
  }
}
