import 'package:cloud_firestore/cloud_firestore.dart';

enum ServiceStatus {
  pending,
  inProgress,
  completed,
  cancelled;

  String get firestoreValue {
    switch (this) {
      case ServiceStatus.inProgress:
        return 'in-progress';
      case ServiceStatus.pending:
        return 'pending';
      case ServiceStatus.completed:
        return 'completed';
      case ServiceStatus.cancelled:
        return 'cancelled';
    }
  }

  static ServiceStatus fromString(String? value) {
    switch (value) {
      case 'in-progress':
        return ServiceStatus.inProgress;
      case 'completed':
        return ServiceStatus.completed;
      case 'cancelled':
        return ServiceStatus.cancelled;
      default:
        return ServiceStatus.pending;
    }
  }
}

class PartUsed {
  final String partId;
  final String name;
  final int quantity;
  final double unitPrice;

  PartUsed({
    required this.partId,
    required this.name,
    required this.quantity,
    required this.unitPrice,
  });

  double get totalPrice => quantity * unitPrice;

  factory PartUsed.fromMap(Map<String, dynamic> map) {
    return PartUsed(
      partId: map['partId'] ?? '',
      name: map['name'] ?? '',
      quantity: (map['quantity'] as num?)?.toInt() ?? 0,
      unitPrice: (map['unitPrice'] as num?)?.toDouble() ?? 0.0,
    );
  }

  Map<String, dynamic> toMap() {
    return {
      'partId': partId,
      'name': name,
      'quantity': quantity,
      'unitPrice': unitPrice,
    };
  }
}

class ServiceRecord {
  final String id;
  final String vehicleId;
  final String customerId;
  final String technicianId;
  final String? technicianName;
  final String date;
  final String? expectedDeliveryDate;
  final int mileage;
  final int? completionMileage;
  final bool isDeadVehicle;
  final bool isUnknownMileage;
  final String? personalItems;
  final String description;
  final String? remarks;
  final String? finalRemarks;
  final ServiceStatus status;
  final double laborCost;
  final double partsCost;
  final double totalCost;
  final List<PartUsed> partsUsed;
  final Timestamp createdAt;
  final Timestamp updatedAt;

  ServiceRecord({
    required this.id,
    required this.vehicleId,
    required this.customerId,
    required this.technicianId,
    this.technicianName,
    required this.date,
    this.expectedDeliveryDate,
    required this.mileage,
    this.completionMileage,
    this.isDeadVehicle = false,
    this.isUnknownMileage = false,
    this.personalItems,
    required this.description,
    this.remarks,
    this.finalRemarks,
    required this.status,
    required this.laborCost,
    required this.partsCost,
    required this.totalCost,
    required this.partsUsed,
    required this.createdAt,
    required this.updatedAt,
  });

  factory ServiceRecord.fromFirestore(DocumentSnapshot doc) {
    final data = (doc.data() as Map<String, dynamic>?) ?? {};
    final rawParts = (data['partsUsed'] as List?) ?? [];
    return ServiceRecord(
      id: doc.id,
      vehicleId: data['vehicleId'] ?? '',
      customerId: data['customerId'] ?? '',
      technicianId: data['technicianId'] ?? '',
      technicianName: data['technicianName'],
      date: data['date'] ?? '',
      expectedDeliveryDate: data['expectedDeliveryDate'],
      mileage: (data['mileage'] as num?)?.toInt() ?? 0,
      completionMileage: (data['completionMileage'] as num?)?.toInt(),
      isDeadVehicle: data['isDeadVehicle'] ?? false,
      isUnknownMileage: data['isUnknownMileage'] ?? false,
      personalItems: data['personalItems'],
      description: data['description'] ?? '',
      remarks: data['remarks'],
      finalRemarks: data['finalRemarks'],
      status: ServiceStatus.fromString(data['status']),
      laborCost: (data['laborCost'] as num?)?.toDouble() ?? 0.0,
      partsCost: (data['partsCost'] as num?)?.toDouble() ?? 0.0,
      totalCost: (data['totalCost'] as num?)?.toDouble() ?? 0.0,
      partsUsed: rawParts
          .map((item) => PartUsed.fromMap(item as Map<String, dynamic>))
          .toList(),
      createdAt: data['createdAt'] as Timestamp? ?? Timestamp.now(),
      updatedAt: data['updatedAt'] as Timestamp? ?? Timestamp.now(),
    );
  }

  Map<String, dynamic> toMap() {
    return {
      'vehicleId': vehicleId,
      'customerId': customerId,
      'technicianId': technicianId,
      'technicianName': technicianName,
      'date': date,
      'expectedDeliveryDate': expectedDeliveryDate,
      'mileage': mileage,
      'completionMileage': completionMileage,
      'isDeadVehicle': isDeadVehicle,
      'isUnknownMileage': isUnknownMileage,
      'personalItems': personalItems,
      'description': description,
      'remarks': remarks,
      'finalRemarks': finalRemarks,
      'status': status.firestoreValue,
      'laborCost': laborCost,
      'partsCost': partsCost,
      'totalCost': totalCost,
      'partsUsed': partsUsed.map((p) => p.toMap()).toList(),
      'createdAt': createdAt,
      'updatedAt': updatedAt,
    };
  }

  ServiceRecord copyWith({
    String? statusString,
    ServiceStatus? status,
    double? laborCost,
    double? partsCost,
    double? totalCost,
    List<PartUsed>? partsUsed,
    int? completionMileage,
    String? finalRemarks,
    String? remarks,
    String? description,
  }) {
    return ServiceRecord(
      id: id,
      vehicleId: vehicleId,
      customerId: customerId,
      technicianId: technicianId,
      technicianName: technicianName,
      date: date,
      expectedDeliveryDate: expectedDeliveryDate,
      mileage: mileage,
      completionMileage: completionMileage ?? this.completionMileage,
      isDeadVehicle: isDeadVehicle,
      isUnknownMileage: isUnknownMileage,
      personalItems: personalItems,
      description: description ?? this.description,
      remarks: remarks ?? this.remarks,
      finalRemarks: finalRemarks ?? this.finalRemarks,
      status: status ?? this.status,
      laborCost: laborCost ?? this.laborCost,
      partsCost: partsCost ?? this.partsCost,
      totalCost: totalCost ?? this.totalCost,
      partsUsed: partsUsed ?? this.partsUsed,
      createdAt: createdAt,
      updatedAt: Timestamp.now(),
    );
  }
}
