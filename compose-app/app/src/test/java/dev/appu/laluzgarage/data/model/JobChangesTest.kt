package dev.appu.laluzgarage.data.model

import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test

class JobChangesTest {
    private val now = 1_760_000_000_000L
    private val base = ServiceRecord(id = "r1", vehicleId = "v1", customerId = "c1", status = "pending", remarks = "Check brakes", parts = emptyMap())
    private val filter = PartUsed(partId = "p1", name = "Oil filter", quantity = 1, unitPrice = 350.0, addedAt = 1L)
    private val oil = PartUsed(partId = "p2", name = "Engine oil", quantity = 3, unitPrice = 440.0, addedAt = 2L)

    @Test
    fun emptyWhenNothingChanged() {
        assertTrue(jobChanges(base, base.copy(), now).isEmpty)
    }

    @Test
    fun setsOnlyTheEditedFields() {
        assertEquals(JobUpdate(set = mapOf("status" to "in-progress")), jobChanges(base, base.copy(status = "in-progress"), now))
    }

    @Test
    fun addsANewPartWithIncrements() {
        val before = base.copy(laborCost = 800.0, totalCost = 800.0)
        val after = before.copy(partsUsed = listOf(filter.copy(addedAt = 0L)), partsCost = 350.0, totalCost = 1150.0)
        val update = jobChanges(before, after, now)
        assertEquals(
            mapOf("parts.p1.partId" to "p1", "parts.p1.name" to "Oil filter", "parts.p1.unitPrice" to 350.0, "parts.p1.addedAt" to now),
            update.set
        )
        assertEquals(mapOf<String, Number>("parts.p1.quantity" to 1, "partsCost" to 350.0, "totalCost" to 350.0), update.add)
    }

    @Test
    fun changesQuantitiesRemovesLinesAndLabourByDifference() {
        val before = base.copy(laborCost = 800.0, partsCost = 1670.0, totalCost = 2470.0, partsUsed = listOf(filter, oil))
        val after = before.copy(laborCost = 1000.0, partsUsed = listOf(oil.copy(quantity = 4)))
        val update = jobChanges(before, after, now)
        assertEquals(mapOf("laborCost" to 1000.0), update.set)
        assertEquals(mapOf<String, Number>("parts.p1.quantity" to -1, "parts.p2.quantity" to 1, "partsCost" to 90.0, "totalCost" to 290.0), update.add)
    }

    @Test
    fun convertsALegacyCardOnItsFirstSave() {
        val before = base.copy(parts = null, laborCost = 500.0, partsCost = 700.0, totalCost = 900.0, partsUsed = listOf(filter.copy(addedAt = 0L), filter.copy(addedAt = 0L)))
        val update = jobChanges(before, before.copy(remarks = "Checked"), now)
        assertEquals(listOf("partsUsed"), update.remove)
        assertEquals(
            mapOf(
                "remarks" to "Checked",
                "parts" to mapOf("p1" to mapOf("partId" to "p1", "name" to "Oil filter", "unitPrice" to 350.0, "quantity" to 2, "addedAt" to now)),
                "laborCost" to 500.0,
                "partsCost" to 700.0,
                "totalCost" to 1200.0
            ),
            update.set
        )
        assertTrue(update.add.isEmpty())
    }

    @Test
    fun leavesAnUntouchedLegacyCardAlone() {
        val before = base.copy(parts = null, partsUsed = listOf(filter))
        assertTrue(jobChanges(before, before.copy(), now).isEmpty)
    }

    @Test
    fun readsLinesFromThePartsMap() {
        val record = base.copy(parts = mapOf("p2" to oil, "p1" to filter, "gone" to filter.copy(partId = "", quantity = 0))).withPartsFromMap()
        assertEquals(listOf("p1", "p2"), record.partsUsed.map { it.partId })
    }
}
