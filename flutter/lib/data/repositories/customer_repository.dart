import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../models/customer.dart';
import 'firebase_providers.dart';

class CustomerRepository {
  final FirebaseFirestore _firestore;

  CustomerRepository(this._firestore);

  CollectionReference get _customersRef => _firestore.collection('customers');

  Stream<List<Customer>> streamCustomers() {
    return _customersRef
        .orderBy('updatedAt', descending: true)
        .snapshots()
        .map((snapshot) =>
            snapshot.docs.map((doc) => Customer.fromFirestore(doc)).toList());
  }

  Future<Customer> createCustomer({
    required String name,
    required String phone,
    required String technicianId,
  }) async {
    final docRef = await _customersRef.add({
      'name': name.trim(),
      'phone': phone.trim(),
      'technicianId': technicianId,
      'createdAt': FieldValue.serverTimestamp(),
      'updatedAt': FieldValue.serverTimestamp(),
    });

    final snap = await docRef.get();
    return Customer.fromFirestore(snap);
  }

  Future<void> updateCustomer(Customer customer) async {
    await _customersRef.doc(customer.id).update({
      'name': customer.name.trim(),
      'phone': customer.phone.trim(),
      'updatedAt': FieldValue.serverTimestamp(),
    });
  }
}

final customerRepositoryProvider = Provider<CustomerRepository>((ref) {
  return CustomerRepository(ref.watch(firestoreProvider));
});

final customersStreamProvider = StreamProvider<List<Customer>>((ref) {
  return ref.watch(customerRepositoryProvider).streamCustomers();
});
