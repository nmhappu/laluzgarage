import 'package:intl/intl.dart';

class Formatters {
  static final NumberFormat _currencyFormat = NumberFormat.currency(
    locale: 'en_IN',
    symbol: '₹',
    decimalDigits: 0,
  );

  static String currency(num? amount) {
    if (amount == null) return '₹0';
    return _currencyFormat.format(amount);
  }

  static String formatCurrency(num? amount) => currency(amount);

  static String formatOdometer(num? mileage) {
    if (mileage == null) return '0';
    return NumberFormat('#,##,###', 'en_IN').format(mileage);
  }

  static String formatDate(dynamic date) {
    if (date == null) return '--';
    try {
      if (date is DateTime) {
        return DateFormat('dd MMM yyyy').format(date);
      }
      if (date is String) {
        final parsed = DateTime.tryParse(date);
        if (parsed != null) {
          return DateFormat('dd MMM yyyy').format(parsed);
        }
      }
      return date.toString();
    } catch (_) {
      return '--';
    }
  }

  static String formatShortDate(dynamic date) {
    if (date == null) return '--';
    try {
      if (date is DateTime) {
        return DateFormat('dd MMM').format(date);
      }
      if (date is String) {
        final parsed = DateTime.tryParse(date);
        if (parsed != null) {
          return DateFormat('dd MMM').format(parsed);
        }
      }
      return date.toString();
    } catch (_) {
      return '--';
    }
  }

  static String cleanPhoneNumber(String phone) {
    final digits = phone.replaceAll(RegExp(r'[^0-9+]'), '');
    if (!digits.startsWith('+') && digits.length == 10) {
      return '+91$digits';
    }
    return digits;
  }

  static String capitalize(String text) {
    if (text.isEmpty) return text;
    return text.split(' ').map((word) {
      if (word.isEmpty) return word;
      return word[0].toUpperCase() + word.substring(1).toLowerCase();
    }).join(' ');
  }
}
