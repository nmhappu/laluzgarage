package dev.appu.laluzgarage.ui.services

import androidx.compose.runtime.Immutable
import dev.appu.laluzgarage.data.model.Customer
import dev.appu.laluzgarage.data.model.ServiceRecord
import dev.appu.laluzgarage.data.model.Vehicle
import dev.appu.laluzgarage.ui.components.formatInrWhole
import java.time.LocalDate
import java.time.ZoneId

@Immutable
data class JobCardModel(
    val record: ServiceRecord,
    val plate: String,
    val vehicle: String,
    /** Make and model only, for compact cards. */
    val vehicleModel: String,
    val customer: String,
    val status: JobStatus,
    val lateLabel: String?,
    /** Arrival day; the list groups cards under it. Null when the record has no usable date. */
    val arrivedDate: LocalDate?,
    val security: VehicleSecurity,
    val battery: Int?,
    val tasksDone: Int,
    val tasksTotal: Int,
    /** Problem lines, for the card's expandable task list. */
    val tasks: List<String>,
    val deliveredText: String,
    val totalLabel: String,
    val total: String
)

/** Everything the Services list draws, derived off the main thread by [ServiceViewModel]. */
@Immutable
data class ServicesListUi(
    val cards: List<JobCardModel> = emptyList(),
    /** Job count per filter key ("all" plus each [JobStatus.value]). */
    val counts: Map<String, Int> = emptyMap(),
    val summary: String = "",
    /** The search the [cards] were filtered with, for the empty-state message. */
    val query: String = "",
    val newestFirst: Boolean = true,
    val compact: Boolean = false,
    val dateFrom: LocalDate? = null,
    val dateTo: LocalDate? = null,
    /** Every arrival day across all jobs, for the date picker's dots. */
    val arrivalDays: Set<LocalDate> = emptySet(),
    val isLoading: Boolean = true
)

data class ServicesListQuery(
    val statusFilter: String,
    val search: String,
    val newestFirst: Boolean,
    val compact: Boolean,
    val dateFrom: LocalDate? = null,
    val dateTo: LocalDate? = null
)

/**
 * Card models plus pre-normalised search keys, built once per Firestore snapshot so a keystroke
 * or filter change only re-filters.
 */
class ServicesListIndex(
    records: List<ServiceRecord>,
    vehicles: Map<String, Vehicle>,
    customers: Map<String, Customer>,
    private val isLoading: Boolean,
    today: LocalDate = LocalDate.now()
) {
    private class Entry(val card: JobCardModel, val plateKey: String, val nameKey: String, val phoneKey: String, val modelKey: String)

    // Repository streams newest first.
    private val entries: List<Entry> = records.map { r ->
        val v = vehicles[r.vehicleId]
        val c = customers[r.customerId]
        Entry(
            card = buildCard(r, v, c, today),
            plateKey = v?.plateNumber.orEmpty().lowercase().replace(" ", ""),
            nameKey = c?.name.orEmpty().lowercase(),
            phoneKey = c?.phone.orEmpty().replace(" ", ""),
            modelKey = "${v?.make} ${v?.model}".lowercase()
        )
    }

    private val arrivalDays: Set<LocalDate> = entries.mapNotNull { it.card.arrivedDate }.toSet()

    private val counts: Map<String, Int> = run {
        val byStatus = records.groupingBy { it.jobStatus }.eachCount()
        mapOf(
            "all" to records.size,
            JobStatus.PENDING.value to (byStatus[JobStatus.PENDING] ?: 0),
            JobStatus.IN_PROGRESS.value to (byStatus[JobStatus.IN_PROGRESS] ?: 0),
            JobStatus.COMPLETED.value to (byStatus[JobStatus.COMPLETED] ?: 0)
        )
    }

    private val summary: String = run {
        val open = records.count { it.isOpen }
        val completed = counts[JobStatus.COMPLETED.value] ?: 0
        val arrivedToday = records.count { parseRecordDate(it.date) == today }
        "$open open · $completed delivered · $arrivedToday arrived today"
    }

    fun select(query: ServicesListQuery): ServicesListUi {
        val needle = query.search.trim().lowercase()
        val compact = needle.replace(" ", "")
        val filter = query.statusFilter
        val cards = entries
            .filter { filter == "all" || it.card.record.status.equals(filter, ignoreCase = true) }
            .filter {
                needle.isEmpty() ||
                    it.plateKey.contains(compact) ||
                    it.nameKey.contains(needle) ||
                    it.phoneKey.contains(compact) ||
                    it.modelKey.contains(needle)
            }
            .filter {
                val from = query.dateFrom ?: return@filter true
                val to = query.dateTo ?: from
                val d = it.card.arrivedDate
                d != null && !d.isBefore(from) && !d.isAfter(to)
            }
            .map { it.card }
            .let { if (query.newestFirst) it else it.asReversed() }
        return ServicesListUi(
            cards = cards,
            counts = counts,
            summary = summary,
            query = query.search,
            newestFirst = query.newestFirst,
            compact = query.compact,
            dateFrom = query.dateFrom,
            dateTo = query.dateTo,
            arrivalDays = arrivalDays,
            isLoading = isLoading
        )
    }
}

private fun buildCard(r: ServiceRecord, v: Vehicle?, c: Customer?, today: LocalDate): JobCardModel {
    val status = r.jobStatus
    val tasks = parseTasks(r.description)
    val isDone = status == JobStatus.COMPLETED
    val delivered = r.updatedAt?.toDate()?.toInstant()?.atZone(ZoneId.systemDefault())?.toLocalDate()
    val notBilled = r.totalCost <= 0.0 && !isDone
    return JobCardModel(
        record = r,
        plate = formatPlate(v?.plateNumber),
        vehicle = v.modelWithColor(),
        vehicleModel = v.modelLabel(),
        customer = c.displayName(),
        status = status,
        lateLabel = r.dueFlag(today)?.takeIf { it.isOverdue }?.label,
        arrivedDate = parseRecordDate(r.date),
        security = v.security(),
        battery = r.battery,
        tasksDone = tasks.count { it.done },
        tasksTotal = tasks.size,
        tasks = tasks.map { it.text },
        deliveredText = delivered?.let { "Delivered " + it.weekdayLabel() } ?: "Delivered",
        totalLabel = when {
            isDone -> "Billed"
            notBilled -> ""
            else -> "Est."
        },
        total = if (notBilled) "Not billed" else formatInrWhole(r.totalCost)
    )
}
