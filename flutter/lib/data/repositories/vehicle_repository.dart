import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../models/vehicle.dart';
import 'firebase_providers.dart';

class VehicleRepository {
  final FirebaseFirestore _firestore;

  VehicleRepository(this._firestore);

  CollectionReference get _vehiclesRef => _firestore.collection('vehicles');

  Stream<List<Vehicle>> streamVehicles() {
    return _vehiclesRef
        .orderBy('updatedAt', descending: true)
        .snapshots()
        .map((snapshot) =>
            snapshot.docs.map((doc) => Vehicle.fromFirestore(doc)).toList());
  }

  Stream<List<Vehicle>> streamVehiclesForCustomer(String customerId) {
    return _vehiclesRef
        .where('customerId', isEqualTo: customerId)
        .snapshots()
        .map((snapshot) =>
            snapshot.docs.map((doc) => Vehicle.fromFirestore(doc)).toList());
  }

  Future<Vehicle> createVehicle({
    required String customerId,
    required String make,
    required String model,
    required String color,
    required String plateNumber,
    required String passwordOrPin,
    required String technicianId,
  }) async {
    final docRef = await _vehiclesRef.add({
      'customerId': customerId,
      'make': make.trim(),
      'model': model.trim(),
      'color': color.trim(),
      'plateNumber': plateNumber.trim().toUpperCase(),
      'passwordOrPin': passwordOrPin.trim(),
      'technicianId': technicianId,
      'createdAt': FieldValue.serverTimestamp(),
      'updatedAt': FieldValue.serverTimestamp(),
    });

    final snap = await docRef.get();
    return Vehicle.fromFirestore(snap);
  }

  Future<void> updateVehicle(Vehicle vehicle) async {
    await _vehiclesRef.doc(vehicle.id).update({
      'make': vehicle.make.trim(),
      'model': vehicle.model.trim(),
      'color': vehicle.color.trim(),
      'plateNumber': vehicle.plateNumber.trim().toUpperCase(),
      'passwordOrPin': vehicle.passwordOrPin.trim(),
      'updatedAt': FieldValue.serverTimestamp(),
    });
  }

  Future<void> deleteVehicle(String vehicleId) async {
    await _vehiclesRef.doc(vehicleId).delete();
  }
}

final vehicleRepositoryProvider = Provider<VehicleRepository>((ref) {
  return VehicleRepository(ref.watch(firestoreProvider));
});

final vehiclesStreamProvider = StreamProvider<List<Vehicle>>((ref) {
  return ref.watch(vehicleRepositoryProvider).streamVehicles();
});
