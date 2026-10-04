package dev.appu.laluzgarage.data.repository

import com.google.firebase.firestore.FieldValue
import com.google.firebase.firestore.FirebaseFirestore
import com.google.firebase.firestore.Query
import dev.appu.laluzgarage.data.model.Customer
import dev.appu.laluzgarage.data.model.Part
import dev.appu.laluzgarage.data.model.ServiceRecord
import dev.appu.laluzgarage.data.model.Vehicle
import kotlinx.coroutines.channels.awaitClose
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.callbackFlow
import kotlinx.coroutines.tasks.await
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class ServiceRepository @Inject constructor(
    private val firestore: FirebaseFirestore
) {
    /**
     * Real-time stream of all service records ordered by date descending
     */
    fun serviceRecordsFlow(): Flow<List<ServiceRecord>> = callbackFlow {
        val query = firestore.collection("serviceRecords").orderBy("date", Query.Direction.DESCENDING)
        val registration = query.addSnapshotListener { snapshot, error ->
            if (error != null) {
                close(error)
                return@addSnapshotListener
            }
            if (snapshot != null) {
                val list = snapshot.documents.mapNotNull { doc ->
                    doc.toObject(ServiceRecord::class.java)?.copy(id = doc.id)
                }
                trySend(list)
            }
        }
        awaitClose { registration.remove() }
    }

    /**
     * Real-time stream of registered vehicles
     */
    fun vehiclesFlow(): Flow<List<Vehicle>> = callbackFlow {
        val registration = firestore.collection("vehicles").addSnapshotListener { snapshot, error ->
            if (error != null) {
                close(error)
                return@addSnapshotListener
            }
            if (snapshot != null) {
                val list = snapshot.documents.mapNotNull { doc ->
                    doc.toObject(Vehicle::class.java)?.copy(id = doc.id)
                }
                trySend(list)
            }
        }
        awaitClose { registration.remove() }
    }

    /**
     * Real-time stream of customer profiles
     */
    fun customersFlow(): Flow<List<Customer>> = callbackFlow {
        val registration = firestore.collection("customers").addSnapshotListener { snapshot, error ->
            if (error != null) {
                close(error)
                return@addSnapshotListener
            }
            if (snapshot != null) {
                val list = snapshot.documents.mapNotNull { doc ->
                    doc.toObject(Customer::class.java)?.copy(id = doc.id)
                }
                trySend(list)
            }
        }
        awaitClose { registration.remove() }
    }

    /**
     * Real-time stream of inventory parts
     */
    fun partsFlow(): Flow<List<Part>> = callbackFlow {
        val registration = firestore.collection("parts").addSnapshotListener { snapshot, error ->
            if (error != null) {
                close(error)
                return@addSnapshotListener
            }
            if (snapshot != null) {
                val list = snapshot.documents.mapNotNull { doc ->
                    doc.toObject(Part::class.java)?.copy(id = doc.id)
                }
                trySend(list)
            }
        }
        awaitClose { registration.remove() }
    }

    /**
     * Updates an existing service record and recalculates totals
     */
    suspend fun updateServiceRecord(record: ServiceRecord) {
        val docRef = firestore.collection("serviceRecords").document(record.id)
        val data = hashMapOf<String, Any?>(
            "status" to record.status,
            "description" to record.description,
            "remarks" to record.remarks,
            "finalRemarks" to record.finalRemarks,
            "completionMileage" to record.completionMileage,
            "laborCost" to record.laborCost,
            "partsCost" to record.partsCost,
            "totalCost" to record.totalCost,
            "partsUsed" to record.partsUsed.map {
                hashMapOf(
                    "partId" to it.partId,
                    "name" to it.name,
                    "quantity" to it.quantity,
                    "unitPrice" to it.unitPrice
                )
            },
            "updatedAt" to FieldValue.serverTimestamp()
        )
        docRef.update(data).await()
    }

    suspend fun deleteServiceRecord(recordId: String) {
        firestore.collection("serviceRecords").document(recordId).delete().await()
    }
}
