class AppConstants {
  static const String appName = 'LaluZ Garage';
  static const String appTagline = 'Workshop Management Core';
  static const String currencySymbol = '₹';
  static const String defaultCountryCode = '+91';
  static const String defaultAdvisorPin = '1234';
  static const String defaultPlatePlaceholder = 'MH12AB1234';

  // Shared preferences / local storage keys
  static const String themeKey = 'theme';
  static const String whatsappPresetsKey = 'whatsapp_message_presets_v1';

  /// When false, mutations (create, update, delete) are permitted and sync directly with Firestore.
  static const bool isReadOnlyMode = false;
}

