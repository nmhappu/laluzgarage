package dev.appu.laluzgarage.data.model

/** The editable fields of a job card, in the shape they are stored. */
private fun ServiceRecord.editableFields(): Map<String, Any?> = linkedMapOf(
    "status" to status,
    "description" to description,
    "remarks" to remarks,
    "finalRemarks" to finalRemarks,
    "mileage" to mileage,
    "completionMileage" to completionMileage,
    "isDeadVehicle" to isDeadVehicle,
    "isUnknownMileage" to isUnknownMileage,
    "battery" to battery,
    "personalItems" to personalItems,
    "expectedDeliveryDate" to expectedDeliveryDate
)

/** Labour, parts and the totals derived from them; saved together so they always add up. */
private fun ServiceRecord.moneyFields(): Map<String, Any?> = linkedMapOf(
    "laborCost" to laborCost,
    "partsCost" to partsCost,
    "totalCost" to totalCost,
    "partsUsed" to partsUsed.map {
        mapOf("partId" to it.partId, "name" to it.name, "quantity" to it.quantity, "unitPrice" to it.unitPrice)
    }
)

/**
 * Only the fields that differ between [before] (the card as it was when editing began) and
 * [after]. Saving just these leaves fields someone else changed meanwhile alone. Money fields go
 * as one block whenever any of them changed. Empty when nothing changed. Same rule as the web
 * app's jobChanges (src/core/jobs.ts).
 */
fun jobChanges(before: ServiceRecord, after: ServiceRecord): Map<String, Any?> {
    val changes = linkedMapOf<String, Any?>()
    val a = before.editableFields()
    after.editableFields().forEach { (key, value) -> if (a[key] != value) changes[key] = value }
    val moneyAfter = after.moneyFields()
    if (before.moneyFields() != moneyAfter) changes.putAll(moneyAfter)
    return changes
}
