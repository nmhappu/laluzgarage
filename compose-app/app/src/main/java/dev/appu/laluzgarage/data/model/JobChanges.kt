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

/** A job card save: fields to set, numbers to add to (Firestore increments) and fields to delete. */
data class JobUpdate(
    val set: Map<String, Any?> = emptyMap(),
    val add: Map<String, Number> = emptyMap(),
    val remove: List<String> = emptyList()
) {
    val isEmpty: Boolean get() = set.isEmpty() && add.isEmpty() && remove.isEmpty()
}

private val UnsafeKeyChars = Regex("[^A-Za-z0-9_-]")

/** The `parts` map key for a line: its part id, made safe for a Firestore field path. */
fun partKey(p: PartUsed, index: Int): String = p.partId.replace(UnsafeKeyChars, "_").ifEmpty { "line$index" }

private fun lineValue(p: PartUsed, quantity: Int, now: Long): Map<String, Any?> = mapOf(
    "partId" to p.partId,
    "name" to p.name,
    "unitPrice" to p.unitPrice,
    "quantity" to quantity,
    "addedAt" to if (p.addedAt != 0L) p.addedAt else now
)

private fun List<PartUsed>.moneyKey() = map { Triple(it.partId, it.quantity, it.unitPrice) }

/**
 * What to save, given [before] (the card as it was when editing began) and [after]. Only edited
 * fields are set, so a field someone else changed meanwhile is kept. Parts and money go as
 * increments (quantity, partsCost, totalCost), so two people adding parts at once both count;
 * labour is set and the total moves by the difference. A card still in the legacy `partsUsed`
 * format is converted on its first save: the whole `parts` map and totals are written and
 * `partsUsed` is deleted. Same rule as the web app's jobChanges (src/core/jobs.ts).
 */
fun jobChanges(before: ServiceRecord, after: ServiceRecord, now: Long = System.currentTimeMillis()): JobUpdate {
    val set = linkedMapOf<String, Any?>()
    val add = linkedMapOf<String, Number>()
    val a = before.editableFields()
    after.editableFields().forEach { (key, value) -> if (a[key] != value) set[key] = value }

    if (before.legacyParts) {
        val moneyChanged = before.laborCost != after.laborCost || before.partsUsed.moneyKey() != after.partsUsed.moneyKey()
        if (!moneyChanged && set.isEmpty()) return JobUpdate()
        // The legacy list could hold the same part twice; the map keeps one line per part.
        val quantities = linkedMapOf<String, Int>()
        val firstLine = linkedMapOf<String, Pair<PartUsed, Int>>()
        after.partsUsed.forEachIndexed { i, p ->
            val key = partKey(p, i)
            quantities[key] = (quantities[key] ?: 0) + p.quantity
            firstLine.getOrPut(key) { p to i }
        }
        val parts = firstLine.mapValues { (key, first) -> lineValue(first.first, quantities.getValue(key), now + first.second) }
        val partsCost = after.partsUsed.sumOf { it.quantity * it.unitPrice }
        set["parts"] = parts
        set["laborCost"] = after.laborCost
        set["partsCost"] = partsCost
        set["totalCost"] = after.laborCost + partsCost
        return JobUpdate(set, add, listOf("partsUsed"))
    }

    val beforeLines = before.partsUsed.mapIndexed { i, p -> partKey(p, i) to p }.toMap()
    val afterLines = after.partsUsed.mapIndexed { i, p -> partKey(p, i) to p }.toMap()
    var partsDelta = 0.0
    for (key in beforeLines.keys + afterLines.keys) {
        val was = beforeLines[key]
        val line = afterLines[key]
        val delta = (line?.quantity ?: 0) - (was?.quantity ?: 0)
        if (delta == 0) continue
        if (was == null && line != null) {
            set["parts.$key.partId"] = line.partId
            set["parts.$key.name"] = line.name
            set["parts.$key.unitPrice"] = line.unitPrice
            set["parts.$key.addedAt"] = if (line.addedAt != 0L) line.addedAt else now
        }
        add["parts.$key.quantity"] = delta
        partsDelta += delta * (line ?: was!!).unitPrice
    }
    val labourDelta = after.laborCost - before.laborCost
    if (labourDelta != 0.0) set["laborCost"] = after.laborCost
    if (partsDelta != 0.0) add["partsCost"] = partsDelta
    if (partsDelta + labourDelta != 0.0) add["totalCost"] = partsDelta + labourDelta
    return JobUpdate(set, add, emptyList())
}
