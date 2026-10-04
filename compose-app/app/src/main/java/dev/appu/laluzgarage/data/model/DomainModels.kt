package dev.appu.laluzgarage.data.model

import com.google.firebase.Timestamp

data class Customer(
    val id: String = "",
    val name: String = "",
    val phone: String = "",
    val technicianId: String = "",
    val createdAt: Timestamp? = null,
    val updatedAt: Timestamp? = null
)

data class Vehicle(
    val id: String = "",
    val customerId: String = "",
    val make: String = "",
    val model: String = "",
    val color: String = "",
    val plateNumber: String = "",
    val passwordOrPin: String = "",
    val technicianId: String = "",
    val createdAt: Timestamp? = null,
    val updatedAt: Timestamp? = null
)

data class PartUsed(
    val partId: String = "",
    val name: String = "",
    val quantity: Int = 0,
    val unitPrice: Double = 0.0
)

data class ServiceRecord(
    val id: String = "",
    val vehicleId: String = "",
    val customerId: String = "",
    val technicianId: String = "",
    val technicianName: String? = null,
    val date: String = "",
    val expectedDeliveryDate: String? = null,
    val mileage: Long = 0L,
    val completionMileage: Long? = null,
    val isDeadVehicle: Boolean = false,
    val isUnknownMileage: Boolean = false,
    val personalItems: String? = null,
    val description: String = "",
    val remarks: String? = null,
    val finalRemarks: String? = null,
    val status: String = "pending", // "pending", "in-progress", "completed", "cancelled"
    val laborCost: Double = 0.0,
    val partsCost: Double = 0.0,
    val totalCost: Double = 0.0,
    val partsUsed: List<PartUsed> = emptyList(),
    val createdAt: Timestamp? = null,
    val updatedAt: Timestamp? = null
)

data class Part(
    val id: String = "",
    val name: String = "",
    val category: String = "",
    val stockQuantity: Int = 0,
    val price: Double = 0.0,
    val minStockLevel: Int = 0,
    val location: String = "",
    val createdAt: Timestamp? = null,
    val updatedAt: Timestamp? = null
)
