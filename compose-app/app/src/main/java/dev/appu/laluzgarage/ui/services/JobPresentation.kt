package dev.appu.laluzgarage.ui.services

import dev.appu.laluzgarage.data.model.Customer
import dev.appu.laluzgarage.data.model.ServiceRecord
import dev.appu.laluzgarage.data.model.Vehicle
import dev.appu.laluzgarage.ui.components.ChipTone
import java.time.LocalDate
import java.time.LocalDateTime
import java.time.format.DateTimeFormatter
import java.time.temporal.ChronoUnit
import java.util.Locale

/** Job status as stored in Firestore (`serviceRecords.status`). */
enum class JobStatus(val value: String, val label: String, val tone: ChipTone) {
    PENDING("pending", "Pending", ChipTone.PENDING),
    IN_PROGRESS("in-progress", "In progress", ChipTone.IN_PROGRESS),
    COMPLETED("completed", "Delivered", ChipTone.COMPLETED),
    CANCELLED("cancelled", "Cancelled", ChipTone.NEUTRAL);

    companion object {
        fun of(raw: String): JobStatus = entries.firstOrNull { it.value.equals(raw.trim(), ignoreCase = true) } ?: PENDING
    }
}

val ServiceRecord.jobStatus: JobStatus get() = JobStatus.of(status)
val ServiceRecord.isOpen: Boolean get() = jobStatus == JobStatus.PENDING || jobStatus == JobStatus.IN_PROGRESS

// ---- Checklist (shared format with the web app: "[x] text" / "[ ] text") ----

data class TaskLine(val text: String, val done: Boolean)

private val BulletPrefix = Regex("^(?:[-•*]\\s+)+")

fun parseTasks(description: String): List<TaskLine> =
    description.lines().mapNotNull { raw ->
        var line = raw.trim()
        line = line.replace(BulletPrefix, "")
        val done = line.startsWith("[x]", ignoreCase = true)
        if (done || line.startsWith("[ ]")) line = line.substring(3).trim()
        line = line.replace(BulletPrefix, "")
        if (line.isEmpty()) null else TaskLine(line, done)
    }

fun serializeTasks(tasks: List<TaskLine>): String =
    tasks.joinToString("\n") { (if (it.done) "[x] " else "[ ] ") + it.text }

// ---- Dates ----

fun parseRecordDate(raw: String?): LocalDate? =
    raw?.trim()?.take(10)?.let { runCatching { LocalDate.parse(it) }.getOrNull() }

fun parseRecordDateTime(raw: String?): LocalDateTime? {
    val s = raw?.trim() ?: return null
    return runCatching { LocalDateTime.parse(s.take(19)) }.getOrNull()
        ?: parseRecordDate(s)?.atStartOfDay()
}

private val dayMonth = DateTimeFormatter.ofPattern("d MMM", Locale.ENGLISH)
private val weekdayDayMonth = DateTimeFormatter.ofPattern("EEE, d MMM", Locale.ENGLISH)
private val weekdayLongDayMonth = DateTimeFormatter.ofPattern("EEEE, d MMMM", Locale.ENGLISH)

/** "14 Oct" */
fun LocalDate.shortLabel(): String = format(dayMonth)

/** "Mon, 12 Oct" */
fun LocalDate.weekdayLabel(): String = format(weekdayDayMonth)

/** "Wednesday, 14 October" */
fun LocalDate.longLabel(): String = format(weekdayLongDayMonth)

/** "Today, 14 Oct" / "Yesterday, 13 Oct" / "Thu, 8 Oct" */
fun LocalDate.relativeDayLabel(today: LocalDate = LocalDate.now()): String = when (this) {
    today -> "Today, " + format(dayMonth)
    today.minusDays(1) -> "Yesterday, " + format(dayMonth)
    else -> format(weekdayDayMonth)
}

/** Overdue / due-today flag for open jobs. */
data class DueFlag(val label: String, val overdueDays: Long) {
    val isOverdue: Boolean get() = overdueDays > 0
}

fun ServiceRecord.dueFlag(today: LocalDate = LocalDate.now()): DueFlag? {
    if (!isOpen) return null
    val expected = parseRecordDate(expectedDeliveryDate) ?: return null
    val diff = ChronoUnit.DAYS.between(expected, today)
    return when {
        diff > 0 -> DueFlag("${diff}d overdue", diff)
        diff == 0L -> DueFlag("Due today", 0)
        else -> null
    }
}

// ---- Vehicle / customer labels ----

private val IndianPlate = Regex("^([A-Z]{2})(\\d{1,2})([A-Z]{0,3})(\\d{1,4})$")

/** "KL07CB4521" → "KL 07 CB 4521". Unknown formats pass through unchanged. */
fun formatPlate(raw: String?): String {
    val compact = raw.orEmpty().uppercase().replace(Regex("[\\s-]"), "")
    if (compact.isEmpty()) return "NO PLATE"
    val m = IndianPlate.matchEntire(compact) ?: return raw!!.uppercase().trim()
    return m.groupValues.drop(1).filter { it.isNotEmpty() }.joinToString(" ")
}

/** "KL07CB4521" (compact, for dense rows). */
fun compactPlate(raw: String?): String =
    raw.orEmpty().uppercase().replace(Regex("[\\s-]"), "").ifEmpty { "NO PLATE" }

fun Vehicle?.modelLabel(): String =
    this?.let { "${it.make} ${it.model}".trim() }?.ifEmpty { null } ?: "Vehicle"

fun Vehicle?.modelWithColor(): String {
    val model = modelLabel()
    val color = this?.color?.trim().orEmpty()
    return if (color.isEmpty()) model else "$model · $color"
}

/** "+919072034455" / "9072034455" → "+91 90720 34455". Other formats pass through trimmed. */
fun formatPhone(raw: String?): String {
    val digits = raw.orEmpty().filter { it.isDigit() }
    val national = when {
        digits.length == 10 -> digits
        digits.length == 12 && digits.startsWith("91") -> digits.drop(2)
        else -> return raw.orEmpty().trim()
    }
    return "+91 ${national.take(5)} ${national.drop(5)}"
}

fun Customer?.displayName(): String = this?.name?.trim()?.ifEmpty { null } ?: "Walk-in customer"

/** Physical key handover vs a PIN/password the customer shared. */
sealed interface VehicleSecurity {
    data object PhysicalKey : VehicleSecurity
    data class Pin(val value: String) : VehicleSecurity
    data object Unknown : VehicleSecurity
}

fun Vehicle?.security(): VehicleSecurity {
    val raw = this?.passwordOrPin?.trim().orEmpty()
    return when {
        raw.isEmpty() -> VehicleSecurity.Unknown
        raw.equals("Physical Key", ignoreCase = true) || raw.equals("key", ignoreCase = true) -> VehicleSecurity.PhysicalKey
        else -> VehicleSecurity.Pin(raw)
    }
}
