package dev.appu.laluzgarage.data.repository

import android.util.Log
import com.google.android.gms.tasks.Task
import com.google.firebase.firestore.FieldValue
import com.google.firebase.firestore.FirebaseFirestore
import com.google.firebase.firestore.SetOptions
import dev.appu.laluzgarage.data.model.Customer
import dev.appu.laluzgarage.data.model.Part
import dev.appu.laluzgarage.data.model.ServiceRecord
import dev.appu.laluzgarage.data.model.Vehicle
import dev.appu.laluzgarage.data.sync.SyncCollections
import dev.appu.laluzgarage.data.sync.SyncManager
import kotlinx.coroutines.CoroutineDispatcher
import kotlinx.coroutines.channels.awaitClose
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.callbackFlow
import kotlinx.coroutines.flow.flowOn
import kotlinx.coroutines.tasks.await
import kotlinx.coroutines.withContext
import kotlinx.coroutines.withTimeoutOrNull
import javax.inject.Inject
import javax.inject.Singleton

private const val TAG = "ServiceRepository"

/**
 * Offline, a write is applied to the disk cache at once but its task only completes when the
 * server acknowledges it. Wait this long for the ack, then treat the write as done: the SDK keeps
 * it queued and replays it on reconnect, and listeners already show it.
 */
private const val WRITE_ACK_TIMEOUT_MS = 3_000L

@Singleton
class ServiceRepository @Inject constructor(
    private val firestore: FirebaseFirestore,
    private val syncManager: SyncManager,
    private val ioDispatcher: CoroutineDispatcher
) {

    fun getServiceRecordsStream(): Flow<List<ServiceRecord>> =
        cachedStream(SyncCollections.SERVICE_RECORDS, ServiceRecord::class.java)

    fun getVehiclesStream(): Flow<List<Vehicle>> =
        cachedStream(SyncCollections.VEHICLES, Vehicle::class.java)

    fun getCustomersStream(): Flow<List<Customer>> =
        cachedStream(SyncCollections.CUSTOMERS, Customer::class.java)

    fun getPartsStream(): Flow<List<Part>> =
        cachedStream(SyncCollections.PARTS, Part::class.java)

    /**
     * Live listener over the persistent cache: the first snapshot comes from disk (instant, and
     * works offline), later ones from the server as changes arrive.
     */
    private fun <T : Any> cachedStream(collection: String, type: Class<T>): Flow<List<T>> = callbackFlow {
        val subscription = SyncCollections.query(firestore, collection)
            .addSnapshotListener { snapshot, error ->
                if (error != null) {
                    Log.e(TAG, "Error streaming $collection: ${error.message}", error)
                    return@addSnapshotListener
                }
                if (snapshot != null) {
                    trySend(snapshot.toObjects(type))
                    syncManager.onSnapshotDelivered(collection)
                }
            }
        awaitClose { subscription.remove() }
    }.flowOn(ioDispatcher)

    private suspend fun awaitWrite(task: Task<Void>) {
        withTimeoutOrNull(WRITE_ACK_TIMEOUT_MS) { task.await() }
    }

    suspend fun createCustomer(name: String, phone: String, technicianId: String): Result<Customer> = withContext(ioDispatcher) {
        runCatching {
            val docRef = firestore.collection(SyncCollections.CUSTOMERS).document()
            val data = hashMapOf<String, Any?>(
                "name" to name.trim(),
                "phone" to phone.trim(),
                "technicianId" to technicianId,
                "createdAt" to FieldValue.serverTimestamp(),
                "updatedAt" to FieldValue.serverTimestamp()
            )
            awaitWrite(docRef.set(data))
            Customer(
                id = docRef.id,
                name = name.trim(),
                phone = phone.trim(),
                technicianId = technicianId
            )
        }
    }

    suspend fun createVehicle(
        customerId: String,
        plateNumber: String,
        make: String,
        model: String,
        color: String,
        passwordOrPin: String,
        technicianId: String
    ): Result<Vehicle> = withContext(ioDispatcher) {
        runCatching {
            val docRef = firestore.collection(SyncCollections.VEHICLES).document()
            val cleanPlate = plateNumber.trim().uppercase()
            val data = hashMapOf<String, Any?>(
                "customerId" to customerId,
                "plateNumber" to cleanPlate,
                "make" to make.trim(),
                "model" to model.trim(),
                "color" to color.trim(),
                "passwordOrPin" to passwordOrPin.trim(),
                "technicianId" to technicianId,
                "createdAt" to FieldValue.serverTimestamp(),
                "updatedAt" to FieldValue.serverTimestamp()
            )
            awaitWrite(docRef.set(data))
            Vehicle(
                id = docRef.id,
                customerId = customerId,
                plateNumber = cleanPlate,
                make = make.trim(),
                model = model.trim(),
                color = color.trim(),
                passwordOrPin = passwordOrPin.trim(),
                technicianId = technicianId
            )
        }
    }

    suspend fun createServiceRecord(record: ServiceRecord): Result<String> = withContext(ioDispatcher) {
        runCatching {
            val docRef = firestore.collection(SyncCollections.SERVICE_RECORDS).document()
            val data = hashMapOf<String, Any?>(
                "vehicleId" to record.vehicleId,
                "customerId" to record.customerId,
                "technicianId" to record.technicianId,
                "technicianName" to record.technicianName,
                "date" to record.date,
                "expectedDeliveryDate" to record.expectedDeliveryDate,
                "mileage" to record.mileage,
                "isDeadVehicle" to record.isDeadVehicle,
                "isUnknownMileage" to record.isUnknownMileage,
                "personalItems" to record.personalItems,
                "description" to record.description,
                "remarks" to record.remarks,
                "status" to "pending",
                "laborCost" to 0.0,
                "partsCost" to 0.0,
                "totalCost" to 0.0,
                "partsUsed" to emptyList<Map<String, Any>>(),
                "createdAt" to FieldValue.serverTimestamp(),
                "updatedAt" to FieldValue.serverTimestamp()
            )
            awaitWrite(docRef.set(data))
            docRef.id
        }
    }

    suspend fun updateServiceRecord(record: ServiceRecord): Result<Unit> = withContext(ioDispatcher) {
        runCatching {
            val recordRef = firestore.collection(SyncCollections.SERVICE_RECORDS).document(record.id)
            val data = hashMapOf<String, Any?>(
                "status" to record.status,
                "description" to record.description,
                "remarks" to record.remarks,
                "finalRemarks" to record.finalRemarks,
                "mileage" to record.mileage,
                "completionMileage" to record.completionMileage,
                "isDeadVehicle" to record.isDeadVehicle,
                "isUnknownMileage" to record.isUnknownMileage,
                "personalItems" to record.personalItems,
                "expectedDeliveryDate" to record.expectedDeliveryDate,
                "laborCost" to record.laborCost,
                "partsCost" to record.partsCost,
                "totalCost" to record.totalCost,
                "partsUsed" to record.partsUsed.map {
                    mapOf(
                        "partId" to it.partId,
                        "name" to it.name,
                        "quantity" to it.quantity,
                        "unitPrice" to it.unitPrice
                    )
                },
                "updatedAt" to FieldValue.serverTimestamp()
            )
            awaitWrite(recordRef.set(data, SetOptions.merge()))
            Unit
        }
    }

    /** Edits the fields the vehicle detail screen exposes; owner and createdAt stay as they are. */
    suspend fun updateVehicle(vehicle: Vehicle): Result<Unit> = withContext(ioDispatcher) {
        runCatching {
            val data = hashMapOf<String, Any?>(
                "make" to vehicle.make.trim(),
                "model" to vehicle.model.trim(),
                "color" to vehicle.color.trim(),
                "plateNumber" to vehicle.plateNumber.trim().uppercase(),
                "passwordOrPin" to vehicle.passwordOrPin.trim(),
                "updatedAt" to FieldValue.serverTimestamp()
            )
            awaitWrite(firestore.collection(SyncCollections.VEHICLES).document(vehicle.id).update(data))
            Unit
        }
    }

    suspend fun deleteVehicle(vehicleId: String): Result<Unit> = withContext(ioDispatcher) {
        runCatching {
            awaitWrite(firestore.collection(SyncCollections.VEHICLES).document(vehicleId).delete())
            Unit
        }
    }

    private fun partData(part: Part) = hashMapOf<String, Any?>(
        "name" to part.name.trim(),
        "category" to part.category.trim(),
        "stockQuantity" to part.stockQuantity,
        "price" to part.price,
        "minStockLevel" to part.minStockLevel,
        "location" to part.location.trim(),
        "updatedAt" to FieldValue.serverTimestamp()
    )

    /** Creates the part when [Part.id] is blank, else updates it. */
    suspend fun savePart(part: Part): Result<Unit> = withContext(ioDispatcher) {
        runCatching {
            val collection = firestore.collection(SyncCollections.PARTS)
            if (part.id.isBlank()) {
                val data = partData(part).apply { put("createdAt", FieldValue.serverTimestamp()) }
                awaitWrite(collection.document().set(data))
            } else {
                awaitWrite(collection.document(part.id).set(partData(part), SetOptions.merge()))
            }
            Unit
        }
    }

    suspend fun deletePart(partId: String): Result<Unit> = withContext(ioDispatcher) {
        runCatching {
            awaitWrite(firestore.collection(SyncCollections.PARTS).document(partId).delete())
            Unit
        }
    }

    /** Delivery WhatsApp template saved by the web app's settings (settings/whatsapp), if any. */
    suspend fun getDeliveryTemplate(): String? = whatsAppTemplate("deliveryTemplate")

    /** Intake WhatsApp template saved by the web app's settings (settings/whatsapp), if any. */
    suspend fun getIntakeTemplate(): String? = whatsAppTemplate("intakeTemplate")

    private suspend fun whatsAppTemplate(field: String): String? = withContext(ioDispatcher) {
        runCatching {
            firestore.collection("settings").document("whatsapp").get().await()
                .getString(field)?.ifBlank { null }
        }.getOrNull()
    }

    suspend fun deleteServiceRecord(recordId: String): Result<Unit> = withContext(ioDispatcher) {
        runCatching {
            awaitWrite(firestore.collection(SyncCollections.SERVICE_RECORDS).document(recordId).delete())
            Unit
        }
    }
}
