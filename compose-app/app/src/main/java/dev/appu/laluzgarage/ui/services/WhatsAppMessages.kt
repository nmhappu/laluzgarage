package dev.appu.laluzgarage.ui.services

import android.net.Uri
import dev.appu.laluzgarage.data.model.PartUsed
import dev.appu.laluzgarage.data.model.ServiceRecord
import dev.appu.laluzgarage.data.model.Vehicle
import dev.appu.laluzgarage.ui.components.formatInr

/** Mirrors DEFAULT_DELIVERY_TEMPLATE in the web app (src/services/whatsappPresetService.ts). */
const val DEFAULT_DELIVERY_TEMPLATE = """*Service Completed - LaluZ Garage*

Hello *{customer_name}*,
Your vehicle *{vehicle_title}* [{vehicle_plate}] service has been successfully completed and is ready for pickup!

*Job Details:* {job_description}

*Fixed / Replaced Parts:*
{parts_list}

*Labor Charges:* {labor_cost}
*Final Bill Amount:* {total_cost}

Thank you for choosing LaluZ Garage!"""

private val Whitespace = Regex("\\s+")

private fun capitalizeName(name: String): String =
    name.trim().split(Whitespace).filter { it.isNotEmpty() }
        .joinToString(" ") { w -> w.take(1).uppercase() + w.drop(1).lowercase() }

private fun partsListForWhatsApp(parts: List<PartUsed>): String =
    if (parts.isEmpty()) "• General Inspection & Maintenance"
    else parts.mapIndexed { i, p -> "${i + 1}. ${p.name} (x${p.quantity}) - ${formatInr(p.unitPrice * p.quantity)}" }
        .joinToString("\n")

/** Same rules as the web app's formatDeliveryMessage; customer remarks are appended when present. */
fun formatDeliveryMessage(
    template: String,
    record: ServiceRecord,
    vehicle: Vehicle?,
    customerName: String?
): String {
    val title = vehicle?.let { "${it.make} ${it.model}".trim() }?.ifEmpty { null } ?: "Vehicle"
    val plate = vehicle?.plateNumber?.uppercase()?.ifEmpty { null } ?: "No Plate"
    val description = parseTasks(record.description).joinToString("\n") { it.text }.ifEmpty { "Service Maintenance" }
    val message = template
        .replace("{customer_name}", customerName?.let(::capitalizeName)?.ifEmpty { null } ?: "Customer")
        .replace("{vehicle_title}", title)
        .replace("{vehicle_make}", vehicle?.make.orEmpty())
        .replace("{vehicle_model}", vehicle?.model.orEmpty())
        .replace("{vehicle_plate}", plate)
        .replace("{parts_list}", partsListForWhatsApp(record.partsUsed))
        .replace("{labor_cost}", formatInr(record.laborCost))
        .replace("{total_cost}", formatInr(record.totalCost))
        .replace("{job_description}", description)
    val remarks = record.finalRemarks?.trim().orEmpty()
    return if (remarks.isEmpty()) message else "$message\n\n*Remarks:* $remarks"
}

/** Mirrors DEFAULT_INTAKE_TEMPLATE in the web app (src/services/whatsappPresetService.ts). */
const val DEFAULT_INTAKE_TEMPLATE = """Hello {customer_name},

We have successfully registered your vehicle *{vehicle_make} {vehicle_model}* [{vehicle_plate}] at our service center.

*Job Details:* {job_description}
*Status:* Pending

We will keep you updated on the progress. Thank you!"""

/** Same rules as the web app's formatIntakeMessage. */
fun formatIntakeMessage(
    template: String,
    customerName: String?,
    make: String,
    model: String,
    plate: String?,
    description: String
): String {
    val tasks = parseTasks(description).joinToString("\n") { it.text }.ifEmpty { "Service Maintenance" }
    return template
        .replace("{customer_name}", customerName?.let(::capitalizeName)?.ifEmpty { null } ?: "Customer")
        .replace("{vehicle_make}", make)
        .replace("{vehicle_model}", model)
        .replace("{vehicle_plate}", plate?.uppercase()?.ifEmpty { null } ?: "No Plate")
        .replace("{job_description}", tasks)
}

/** Digits only; a bare 10-digit Indian mobile gets the 91 country code wa.me needs. */
fun whatsAppDigits(phone: String?): String {
    val digits = phone.orEmpty().filter { it.isDigit() }
    return if (digits.length == 10) "91$digits" else digits
}

fun buildWhatsAppUrl(phone: String?, text: String? = null): String? {
    val digits = whatsAppDigits(phone)
    if (digits.isEmpty()) return null
    return if (text.isNullOrBlank()) "https://wa.me/$digits"
    else "https://wa.me/$digits?text=" + Uri.encode(text.trim())
}
