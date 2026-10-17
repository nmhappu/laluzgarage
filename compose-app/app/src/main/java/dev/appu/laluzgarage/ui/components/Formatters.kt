package dev.appu.laluzgarage.ui.components

import java.text.NumberFormat
import java.util.Locale

// Built once: creating a NumberFormat per row/recomposition is expensive.
// UI-thread only (NumberFormat is not thread-safe).
private val inrFormat: NumberFormat by lazy(LazyThreadSafetyMode.NONE) {
    NumberFormat.getCurrencyInstance(Locale("en", "IN"))
}

private val inrWholeFormat: NumberFormat by lazy(LazyThreadSafetyMode.NONE) {
    NumberFormat.getIntegerInstance(Locale("en", "IN"))
}

fun formatInr(amount: Double): String = inrFormat.format(amount).replace("INR", "₹")

/** Whole rupees with Indian grouping, as the artboards show them: ₹12,780. */
fun formatInrWhole(amount: Double): String = "₹" + inrWholeFormat.format(Math.round(amount))

/** Grouped integer (odometer readings, counts): 48,210. */
fun formatGrouped(value: Long): String = inrWholeFormat.format(value)
