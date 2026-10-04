package dev.appu.laluzgarage.data.repository

import com.google.firebase.firestore.FieldValue
import com.google.firebase.firestore.FirebaseFirestore
import dev.appu.laluzgarage.data.model.Customer
import dev.appu.laluzgarage.data.model.ServiceRecord
import dev.appu.laluzgarage.data.model.Vehicle
import kotlinx.coroutines.tasks.await
import java.time.LocalDate
import java.time.format.DateTimeFormatter
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class IntakeRepository @Inject constructor(
    private val firestore: FirebaseFirestore
) {
    suspend fun getCustomers(): List<Customer> {
        val snapshot = firestore.collection("customers").get().await()
        return snapshot.documents.mapNotNull { doc ->
            doc.toObject(Customer::class.java)?.copy(id = doc.id)
        }
    }

    suspend fun getVehicles(): List<Vehicle> {
        val snapshot = firestore.collection("vehicles").get().await()
        return snapshot.documents.mapNotNull { doc ->
            doc.toObject(Vehicle::class.java)?.copy(id = doc.id)
        }
    }

    suspend fun createCustomer(name: String, phone: String, technicianId: String): String {
        val data = hashMapOf(
            "name" to name.trim(),
            "phone" to phone.trim(),
            "technicianId" to technicianId,
            "createdAt" to FieldValue.serverTimestamp(),
            "updatedAt" to FieldValue.serverTimestamp()
        )
        val docRef = firestore.collection("customers").add(data).await()
        return docRef.id
    }

    suspend fun createVehicle(
        customerId: String,
        make: String,
        model: String,
        color: String,
        plateNumber: String,
        passwordOrPin: String,
        technicianId: String
    ): String {
        val data = hashMapOf(
            "customerId" to customerId,
            "make" to make.trim(),
            "model" to model.trim(),
            "color" to color.trim(),
            "plateNumber" to plateNumber.trim().uppercase(),
            "passwordOrPin" to passwordOrPin.trim(),
            "technicianId" to technicianId,
            "createdAt" to FieldValue.serverTimestamp(),
            "updatedAt" to FieldValue.serverTimestamp()
        )
        val docRef = firestore.collection("vehicles").add(data).await()
        return docRef.id
    }

    suspend fun createServiceRecord(
        customerId: String,
        vehicleId: String,
        technicianId: String,
        technicianName: String,
        mileage: Long,
        isDeadVehicle: Boolean,
        expectedDeliveryDate: String?,
        description: String,
        personalItems: String?,
        remarks: String?
    ): String {
        val todayStr = LocalDate.now().format(DateTimeFormatter.ISO_DATE)
        val data = hashMapOf(
            "customerId" to customerId,
            "vehicleId" to vehicleId,
            "technicianId" to technicianId,
            "technicianName" to technicianName,
            "date" to todayStr,
            "expectedDeliveryDate" to expectedDeliveryDate,
            "mileage" to mileage,
            "isDeadVehicle" to isDeadVehicle,
            "description" to description.trim(),
            "personalItems" to personalItems?.trim(),
            "remarks" to remarks?.trim(),
            "status" to "pending",
            "laborCost" to 0.0,
            "partsCost" to 0.0,
            "totalCost" to 0.0,
            "partsUsed" to emptyList<Any>(),
            "createdAt" to FieldValue.serverTimestamp(),
            "updatedAt" to FieldValue.serverTimestamp()
        )
        val docRef = firestore.collection("serviceRecords").add(data).await()
        return docRef.id
    }
}
