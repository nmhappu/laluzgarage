import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../models/service_record.dart';
import 'firebase_providers.dart';

class ServiceRepository {
  final FirebaseFirestore _firestore;

  ServiceRepository(this._firestore);

  CollectionReference get _recordsRef =>
      _firestore.collection('serviceRecords');

  Stream<List<ServiceRecord>> streamServiceRecords() {
    return _recordsRef
        .orderBy('date', descending: true)
        .snapshots()
        .map((snapshot) => snapshot.docs
            .map((doc) => ServiceRecord.fromFirestore(doc))
            .toList());
  }

  Future<ServiceRecord> createRecord(ServiceRecord record) async {
    final docRef = await _recordsRef.add({
      ...record.toMap(),
      'createdAt': FieldValue.serverTimestamp(),
      'updatedAt': FieldValue.serverTimestamp(),
    });
    final snap = await docRef.get();
    return ServiceRecord.fromFirestore(snap);
  }

  Future<void> updateRecord(ServiceRecord record) async {
    final map = record.toMap();
    map.remove('createdAt');
    map['updatedAt'] = FieldValue.serverTimestamp();

    await _recordsRef.doc(record.id).update(map);
  }

  Future<void> updateStatus(String recordId, ServiceStatus status, {int? completionMileage, String? finalRemarks}) async {
    final Map<String, dynamic> data = {
      'status': status.firestoreValue,
      'updatedAt': FieldValue.serverTimestamp(),
    };
    if (completionMileage != null) {
      data['completionMileage'] = completionMileage;
    }
    if (finalRemarks != null) {
      data['finalRemarks'] = finalRemarks;
    }
    await _recordsRef.doc(recordId).update(data);
  }

  Future<void> deleteRecord(String recordId) async {
    await _recordsRef.doc(recordId).delete();
  }
}

final serviceRepositoryProvider = Provider<ServiceRepository>((ref) {
  return ServiceRepository(ref.watch(firestoreProvider));
});

final serviceRecordsStreamProvider = StreamProvider<List<ServiceRecord>>((ref) {
  return ref.watch(serviceRepositoryProvider).streamServiceRecords();
});

class ActiveStatusFilterNotifier extends Notifier<ServiceStatus?> {
  @override
  ServiceStatus? build() => null;

  void setFilter(ServiceStatus? filter) => state = filter;
}

// Active status filter state: null = All
final activeStatusFilterProvider =
    NotifierProvider<ActiveStatusFilterNotifier, ServiceStatus?>(
        ActiveStatusFilterNotifier.new);

// Filtered service records provider
final filteredServiceRecordsProvider = Provider<AsyncValue<List<ServiceRecord>>>((ref) {
  final recordsAsync = ref.watch(serviceRecordsStreamProvider);
  final activeFilter = ref.watch(activeStatusFilterProvider);

  return recordsAsync.whenData((records) {
    if (activeFilter == null) return records;
    return records.where((r) => r.status == activeFilter).toList();
  });
});
