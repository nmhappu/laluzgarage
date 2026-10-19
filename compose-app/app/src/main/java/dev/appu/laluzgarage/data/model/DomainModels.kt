package dev.appu.laluzgarage.data.model

import com.google.firebase.Timestamp
import com.google.firebase.firestore.DocumentId
import com.google.firebase.firestore.Exclude
import com.google.firebase.firestore.ServerTimestamp

data class Customer(
    @DocumentId
    val id: String = "",
    val name: String = "",
    val phone: String = "",
    val technicianId: String = "",
    @ServerTimestamp
    val createdAt: Timestamp? = null,
    @ServerTimestamp
    val updatedAt: Timestamp? = null
)

data class Vehicle(
    @DocumentId
    val id: String = "",
    val customerId: String = "",
    val make: String = "",
    val model: String = "",
    val color: String = "",
    val plateNumber: String = "",
    val passwordOrPin: String = "",
    val technicianId: String = "",
    @ServerTimestamp
    val createdAt: Timestamp? = null,
    @ServerTimestamp
    val updatedAt: Timestamp? = null
)

data class Part(
    @DocumentId
    val id: String = "",
    val name: String = "",
    val category: String = "",
    val stockQuantity: Int = 0,
    val price: Double = 0.0,
    val minStockLevel: Int = 5,
    val location: String = "",
    @ServerTimestamp
    val createdAt: Timestamp? = null,
    @ServerTimestamp
    val updatedAt: Timestamp? = null
) {
    val isLowStock: Boolean
        get() = stockQuantity <= minStockLevel
}

data class PartUsed(
    val partId: String = "",
    val name: String = "",
    val quantity: Int = 1,
    val unitPrice: Double = 0.0,
    /** When the line was added (epoch ms); orders lines stored in the `parts` map. */
    val addedAt: Long = 0L
) {
    val total: Double
        get() = quantity * unitPrice
}

data class ServiceRecord(
    @DocumentId
    val id: String = "",
    val vehicleId: String = "",
    val customerId: String = "",
    val technicianId: String = "",
    val technicianName: String? = null,
    val date: String = "",
    val expectedDeliveryDate: String? = null,
    val mileage: Int = 0,
    val completionMileage: Int? = null,
    val isDeadVehicle: Boolean = false,
    val isUnknownMileage: Boolean = false,
    /** Battery charge at intake in 5% steps (0-100); null when it wasn't recorded. */
    val battery: Int? = null,
    val personalItems: String? = null,
    val description: String = "",
    val remarks: String? = null,
    val finalRemarks: String? = null,
    val status: String = "pending", // pending, in-progress, completed, cancelled
    val laborCost: Double = 0.0,
    val partsCost: Double = 0.0,
    val totalCost: Double = 0.0,
    /** The card's parts; read from [parts] by [withPartsFromMap], or the legacy `partsUsed` array. */
    val partsUsed: List<PartUsed> = emptyList(),
    /** One line per part, quantities changed by increments; null while the card is still in the legacy format. */
    val parts: Map<String, PartUsed>? = null,
    @ServerTimestamp
    val createdAt: Timestamp? = null,
    @ServerTimestamp
    val updatedAt: Timestamp? = null
) {
    val isCompleted: Boolean
        get() = status.equals("completed", ignoreCase = true)

    val isInProgress: Boolean
        get() = status.equals("in-progress", ignoreCase = true)

    val isPending: Boolean
        get() = status.equals("pending", ignoreCase = true)

    /** True while the stored card still uses the legacy `partsUsed` array; its next save converts it. */
    @get:Exclude
    val legacyParts: Boolean
        get() = parts == null

    /** [partsUsed] taken from the [parts] map when the card has one; lines at zero or below were removed. */
    fun withPartsFromMap(): ServiceRecord {
        val map = parts ?: return this
        val lines = map.entries
            .map { (key, line) -> line.copy(partId = line.partId.ifBlank { key }) }
            .filter { it.quantity > 0 }
            .sortedWith(compareBy<PartUsed>({ it.addedAt }, { it.name }))
        return copy(partsUsed = lines)
    }
}
