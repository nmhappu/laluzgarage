import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../models/part.dart';
import 'firebase_providers.dart';

class InventoryRepository {
  final FirebaseFirestore _firestore;

  InventoryRepository(this._firestore);

  CollectionReference get _partsRef => _firestore.collection('parts');

  Stream<List<Part>> streamParts() {
    return _partsRef
        .orderBy('name')
        .snapshots()
        .map((snapshot) =>
            snapshot.docs.map((doc) => Part.fromFirestore(doc)).toList());
  }

  Future<void> addPart(Part part) async {
    await _partsRef.add({
      ...part.toMap(),
      'createdAt': FieldValue.serverTimestamp(),
      'updatedAt': FieldValue.serverTimestamp(),
    });
  }

  Future<void> updatePart(Part part) async {
    final map = part.toMap();
    map.remove('createdAt');
    map['updatedAt'] = FieldValue.serverTimestamp();
    await _partsRef.doc(part.id).update(map);
  }

  Future<void> deletePart(String partId) async {
    await _partsRef.doc(partId).delete();
  }

  Future<void> updateStock(String partId, int newQuantity) async {
    await _partsRef.doc(partId).update({
      'stockQuantity': newQuantity,
      'updatedAt': FieldValue.serverTimestamp(),
    });
  }

  Future<void> deductStock(String partId, int quantity) async {
    await _firestore.runTransaction((transaction) async {
      final docRef = _partsRef.doc(partId);
      final snapshot = await transaction.get(docRef);
      if (snapshot.exists) {
        final currentStock = (snapshot.get('stockQuantity') as num).toInt();
        final updatedStock = (currentStock - quantity).clamp(0, 999999);
        transaction.update(docRef, {
          'stockQuantity': updatedStock,
          'updatedAt': FieldValue.serverTimestamp(),
        });
      }
    });
  }
}

final inventoryRepositoryProvider = Provider<InventoryRepository>((ref) {
  return InventoryRepository(ref.watch(firestoreProvider));
});

final partsStreamProvider = StreamProvider<List<Part>>((ref) {
  return ref.watch(inventoryRepositoryProvider).streamParts();
});
