import 'package:cloud_firestore/cloud_firestore.dart';

class Part {
  final String id;
  final String name;
  final String? sku;
  final String category;
  final int stockQuantity;
  final double price;
  final int minStockLevel;
  final String location;
  final Timestamp createdAt;
  final Timestamp updatedAt;

  Part({
    required this.id,
    required this.name,
    this.sku,
    required this.category,
    required this.stockQuantity,
    required this.price,
    required this.minStockLevel,
    required this.location,
    required this.createdAt,
    required this.updatedAt,
  });

  bool get isLowStock => stockQuantity <= minStockLevel;
  double get totalValue => stockQuantity * price;

  factory Part.fromFirestore(DocumentSnapshot doc) {
    final data = (doc.data() as Map<String, dynamic>?) ?? {};
    return Part(
      id: doc.id,
      name: data['name'] ?? '',
      sku: data['sku'],
      category: data['category'] ?? '',
      stockQuantity: (data['stockQuantity'] as num?)?.toInt() ?? 0,
      price: (data['price'] as num?)?.toDouble() ?? 0.0,
      minStockLevel: (data['minStockLevel'] as num?)?.toInt() ?? 5,
      location: data['location'] ?? '',
      createdAt: data['createdAt'] as Timestamp? ?? Timestamp.now(),
      updatedAt: data['updatedAt'] as Timestamp? ?? Timestamp.now(),
    );
  }

  Map<String, dynamic> toMap() {
    return {
      'name': name,
      if (sku != null && sku!.isNotEmpty) 'sku': sku,
      'category': category,
      'stockQuantity': stockQuantity,
      'price': price,
      'minStockLevel': minStockLevel,
      'location': location,
      'createdAt': createdAt,
      'updatedAt': updatedAt,
    };
  }

  Part copyWith({
    String? id,
    String? name,
    String? sku,
    String? category,
    int? stockQuantity,
    double? price,
    int? minStockLevel,
    String? location,
    Timestamp? createdAt,
    Timestamp? updatedAt,
  }) {
    return Part(
      id: id ?? this.id,
      name: name ?? this.name,
      sku: sku ?? this.sku,
      category: category ?? this.category,
      stockQuantity: stockQuantity ?? this.stockQuantity,
      price: price ?? this.price,
      minStockLevel: minStockLevel ?? this.minStockLevel,
      location: location ?? this.location,
      createdAt: createdAt ?? this.createdAt,
      updatedAt: updatedAt ?? this.updatedAt,
    );
  }
}
