import 'package:cloud_firestore/cloud_firestore.dart';

class Vehicle {
  final String id;
  final String customerId;
  final String make;
  final String model;
  final String color;
  final String plateNumber;
  final String passwordOrPin;
  final String technicianId;
  final Timestamp createdAt;
  final Timestamp updatedAt;

  Vehicle({
    required this.id,
    required this.customerId,
    required this.make,
    required this.model,
    required this.color,
    required this.plateNumber,
    required this.passwordOrPin,
    required this.technicianId,
    required this.createdAt,
    required this.updatedAt,
  });

  bool get isKey => passwordOrPin.toLowerCase() == 'key';

  factory Vehicle.fromFirestore(DocumentSnapshot doc) {
    final data = (doc.data() as Map<String, dynamic>?) ?? {};
    return Vehicle(
      id: doc.id,
      customerId: data['customerId'] ?? '',
      make: data['make'] ?? '',
      model: data['model'] ?? '',
      color: data['color'] ?? '',
      plateNumber: (data['plateNumber'] ?? '').toString().toUpperCase(),
      passwordOrPin: data['passwordOrPin'] ?? '',
      technicianId: data['technicianId'] ?? '',
      createdAt: data['createdAt'] as Timestamp? ?? Timestamp.now(),
      updatedAt: data['updatedAt'] as Timestamp? ?? Timestamp.now(),
    );
  }

  Map<String, dynamic> toMap() {
    return {
      'customerId': customerId,
      'make': make,
      'model': model,
      'color': color,
      'plateNumber': plateNumber.toUpperCase(),
      'passwordOrPin': passwordOrPin,
      'technicianId': technicianId,
      'createdAt': createdAt,
      'updatedAt': updatedAt,
    };
  }

  Vehicle copyWith({
    String? id,
    String? customerId,
    String? make,
    String? model,
    String? color,
    String? plateNumber,
    String? passwordOrPin,
    String? technicianId,
    Timestamp? createdAt,
    Timestamp? updatedAt,
  }) {
    return Vehicle(
      id: id ?? this.id,
      customerId: customerId ?? this.customerId,
      make: make ?? this.make,
      model: model ?? this.model,
      color: color ?? this.color,
      plateNumber: plateNumber ?? this.plateNumber,
      passwordOrPin: passwordOrPin ?? this.passwordOrPin,
      technicianId: technicianId ?? this.technicianId,
      createdAt: createdAt ?? this.createdAt,
      updatedAt: updatedAt ?? this.updatedAt,
    );
  }
}
