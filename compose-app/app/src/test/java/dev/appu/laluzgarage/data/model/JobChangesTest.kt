package dev.appu.laluzgarage.data.model

import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test

class JobChangesTest {
    private val base = ServiceRecord(id = "r1", vehicleId = "v1", customerId = "c1", status = "pending", remarks = "Check brakes")

    @Test
    fun emptyWhenNothingChanged() {
        assertTrue(jobChanges(base, base.copy()).isEmpty())
    }

    @Test
    fun sendsOnlyTheEditedFields() {
        assertEquals(mapOf("status" to "in-progress"), jobChanges(base, base.copy(status = "in-progress")))
        assertEquals(mapOf("remarks" to null, "battery" to 80), jobChanges(base, base.copy(remarks = null, battery = 80)))
    }

    @Test
    fun sendsLabourPartsAndTotalsTogether() {
        val line = PartUsed(partId = "p1", name = "Oil filter", quantity = 1, unitPrice = 350.0)
        val before = base.copy(laborCost = 800.0, partsCost = 350.0, totalCost = 1150.0, partsUsed = listOf(line))
        val changes = jobChanges(before, before.copy(laborCost = 1200.0, totalCost = 1550.0))
        assertEquals(setOf("laborCost", "partsCost", "totalCost", "partsUsed"), changes.keys)
        assertEquals(1200.0, changes["laborCost"])
        assertEquals(350.0, changes["partsCost"])
    }

    @Test
    fun noticesAPartsQuantityChange() {
        val line = PartUsed(partId = "p1", name = "Oil filter", quantity = 1, unitPrice = 350.0)
        val before = base.copy(partsCost = 350.0, totalCost = 350.0, partsUsed = listOf(line))
        val after = before.copy(partsCost = 700.0, totalCost = 700.0, partsUsed = listOf(line.copy(quantity = 2)))
        assertEquals(setOf("laborCost", "partsCost", "totalCost", "partsUsed"), jobChanges(before, after).keys)
    }
}
