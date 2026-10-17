package dev.appu.laluzgarage.ui.settings

import dev.appu.laluzgarage.data.model.ServiceRecord
import dev.appu.laluzgarage.ui.components.formatInrWhole
import dev.appu.laluzgarage.ui.services.parseRecordDate
import java.time.DayOfWeek
import java.time.LocalDate
import java.time.YearMonth
import java.time.ZoneId
import java.time.format.TextStyle
import java.time.temporal.ChronoUnit
import java.time.temporal.TemporalAdjusters
import java.util.Locale
import kotlin.math.abs
import kotlin.math.ceil
import kotlin.math.floor
import kotlin.math.roundToInt

/** What a statistics screen measures. */
enum class StatMetric(val title: String, val noun: String, val unit: String) {
    REVENUE("Revenue", "revenue", ""),
    COMPLETED("Jobs completed", "jobs completed", "jobs"),
    ARRIVALS("Arrivals", "arrivals", "arrivals");

    val isMoney: Boolean get() = this == REVENUE

    /** The figure as shown on screen: whole rupees, or a count (one decimal for averages). */
    fun format(value: Double): String =
        if (isMoney) formatInrWhole(value) else formatCount(value)

    /** A figure with its unit: "9 jobs", "₹4,200". */
    fun formatWithUnit(value: Double): String = if (isMoney) format(value) else "${format(value)} $unit"

    /** The caption beside the headline total: "in total" or "jobs in total". */
    val inTotal: String get() = if (isMoney) "in total" else "$unit in total"

    /** Size of one y-axis step: the axis tops out at a whole multiple of it. */
    val axisStep: Double get() = if (isMoney) 5000.0 else 4.0
}

enum class StatRange(val label: String) { WEEK("Week"), MONTH("Month"), CUSTOM("Custom"), ALL("All") }

/** One bar: [value] over [date] (null for a month bar of the All view). */
data class StatBar(
    val value: Double,
    /** Spoken and shown above the chart when the bar is selected: "Wed, 14 Oct". */
    val label: String,
    /** The short label under the bar; empty when the bar has none. */
    val axis: String,
    /** A day still to come in the current month: drawn as empty space, not selectable. */
    val isFuture: Boolean = false
)

data class StatRow(val title: String, val sub: String?, val value: Double)

data class StatPeriod(
    val title: String,
    val start: LocalDate,
    val end: LocalDate,
    val bars: List<StatBar>,
    /** The day of the first bar, the bars running a day apiece from it; null when bars are months (All). */
    val firstDay: LocalDate?,
    /** The headline: everything in the period. */
    val total: Double,
    /** The dashed chart line: the average bar, [averageUnit] being what one bar stands for. */
    val average: Double,
    val averageUnit: String,
    /** "+8% vs previous 7 days"; null when there is nothing to compare to. */
    val comparison: String?,
    val comparisonUp: Boolean,
    val rowsTitle: String,
    val rowsColumn: String,
    val rows: List<StatRow>,
    val canGoBack: Boolean,
    val canGoForward: Boolean
) {
    /** The bar selected when the user has not chosen one: the latest day with data slots. */
    val defaultSelection: Int get() = bars.indexOfLast { !it.isFuture }.coerceAtLeast(0)

    val isDense: Boolean get() = bars.size > 14

    /** The y-axis top: the biggest bar rounded up to a whole step. */
    fun axisMax(metric: StatMetric): Double {
        val max = bars.filter { !it.isFuture }.maxOfOrNull { it.value } ?: 0.0
        val step = metric.axisStep
        return maxOf(step, ceil(max / step) * step)
    }
}

// ---------------------------------------------------------------------------
// Daily series
// ---------------------------------------------------------------------------

/** The day a delivered job counts on: when it was marked delivered, else its intake day. */
internal fun completionDate(record: ServiceRecord, zone: ZoneId): LocalDate? =
    record.updatedAt?.toDate()?.toInstant()?.atZone(zone)?.toLocalDate() ?: parseRecordDate(record.date)

/**
 * One number per day for [metric]: cars that arrived (any job not cancelled), jobs delivered, or
 * the billed total of jobs delivered that day.
 */
fun dailyTotals(records: List<ServiceRecord>, metric: StatMetric, zone: ZoneId = ZoneId.systemDefault()): Map<LocalDate, Double> {
    val out = HashMap<LocalDate, Double>()
    for (r in records) {
        val day: LocalDate
        val amount: Double
        when (metric) {
            StatMetric.ARRIVALS -> {
                if (r.status.equals("cancelled", ignoreCase = true)) continue
                day = parseRecordDate(r.date) ?: continue
                amount = 1.0
            }
            StatMetric.COMPLETED, StatMetric.REVENUE -> {
                if (!r.isCompleted) continue
                day = completionDate(r, zone) ?: continue
                amount = if (metric == StatMetric.REVENUE) r.totalCost else 1.0
            }
        }
        out.merge(day, amount) { a, b -> a + b }
    }
    return out
}

// ---------------------------------------------------------------------------
// Periods
// ---------------------------------------------------------------------------

private val MaxCustomDays = 366L

/** The "Custom" range shown before the user picks one: the last 12 days. */
fun defaultCustomRange(today: LocalDate): Pair<LocalDate, LocalDate> = today.minusDays(11) to today

/**
 * Builds the screen's data. [offset] pages back through time (0 = now): by a week, a month, or
 * the custom range's own length. Pass [customFrom]/[customTo] for [StatRange.CUSTOM].
 */
fun buildPeriod(
    totals: Map<LocalDate, Double>,
    metric: StatMetric,
    range: StatRange,
    offset: Int,
    customFrom: LocalDate?,
    customTo: LocalDate?,
    today: LocalDate
): StatPeriod {
    val earliest = totals.keys.minOrNull()
    return when (range) {
        StatRange.WEEK -> {
            val end = today.minusDays(7L * offset)
            val start = end.minusDays(6)
            dayPeriod(totals, metric, start, end, today, earliest, offset, weekly = false, previousLabel = "previous 7 days", title = span(start, end))
        }
        StatRange.CUSTOM -> {
            val (defFrom, defTo) = defaultCustomRange(today)
            var from = customFrom ?: defFrom
            var to = customTo ?: customFrom ?: defTo
            if (to.isAfter(today)) to = today
            if (from.isAfter(today)) from = today
            if (to.isBefore(from)) { val t = from; from = to; to = t }
            if (ChronoUnit.DAYS.between(from, to) >= MaxCustomDays) from = to.minusDays(MaxCustomDays - 1)
            val length = ChronoUnit.DAYS.between(from, to) + 1
            val end = to.minusDays(length * offset)
            val start = from.minusDays(length * offset)
            dayPeriod(totals, metric, start, end, today, earliest, offset, weekly = length > 7, previousLabel = "previous $length days", title = span(start, end))
        }
        StatRange.MONTH -> monthPeriod(totals, metric, offset, today, earliest)
        StatRange.ALL -> allPeriod(totals, metric, today, earliest)
    }
}

private fun dayPeriod(
    totals: Map<LocalDate, Double>,
    metric: StatMetric,
    start: LocalDate,
    end: LocalDate,
    today: LocalDate,
    earliest: LocalDate?,
    offset: Int,
    weekly: Boolean,
    previousLabel: String,
    title: String
): StatPeriod {
    val days = generateSequence(start) { it.plusDays(1) }.takeWhile { !it.isAfter(end) }.toList()
    val dense = days.size > 14
    val bars = days.map { d ->
        StatBar(
            value = totals[d] ?: 0.0,
            label = d.dayLabel(),
            axis = when {
                !dense -> d.dayOfWeek.getDisplayName(TextStyle.NARROW, Locale.ENGLISH)
                d.dayOfWeek == DayOfWeek.MONDAY -> d.dayOfMonth.toString()
                else -> ""
            }
        )
    }
    val sum = days.sumOf { totals[it] ?: 0.0 }
    val average = sum / days.size
    val previousStart = start.minusDays(days.size.toLong())
    val previousSum = (0 until days.size).sumOf { totals[previousStart.plusDays(it.toLong())] ?: 0.0 }
    val rows = if (!weekly) {
        days.asReversed().map { d -> StatRow(d.dayLabel(), if (d == today) "Today" else null, totals[d] ?: 0.0) }
    } else weekRows(totals, days)
    return StatPeriod(
        title = title,
        start = start,
        end = end,
        bars = bars,
        firstDay = start,
        total = sum,
        average = average,
        averageUnit = "day",
        comparison = comparisonText(average, previousSum / days.size, previousLabel),
        comparisonUp = average >= previousSum / days.size,
        rowsTitle = if (weekly) "Weekly ${metric.noun}" else "Daily ${metric.noun}",
        rowsColumn = when {
            weekly -> "Total"
            metric.isMoney -> "Revenue"
            metric == StatMetric.COMPLETED -> "Completed"
            else -> "Arrived"
        },
        rows = rows,
        canGoBack = earliest != null && start.isAfter(earliest),
        canGoForward = offset > 0
    )
}

private fun monthPeriod(
    totals: Map<LocalDate, Double>,
    metric: StatMetric,
    offset: Int,
    today: LocalDate,
    earliest: LocalDate?
): StatPeriod {
    val month = YearMonth.from(today).minusMonths(offset.toLong())
    val first = month.atDay(1)
    val last = month.atEndOfMonth()
    val lastWithData = minOf(last, today)
    val realDays = generateSequence(first) { it.plusDays(1) }.takeWhile { !it.isAfter(lastWithData) }.toList()
    val bars = (1..month.lengthOfMonth()).map { dom ->
        val d = month.atDay(dom)
        val future = d.isAfter(today)
        StatBar(
            value = if (future) 0.0 else totals[d] ?: 0.0,
            label = if (future) "" else d.dayLabel(),
            axis = if (dom in AxisDays) dom.toString() else "",
            isFuture = future
        )
    }
    val total = realDays.sumOf { totals[it] ?: 0.0 }
    val average = total / realDays.size
    val previous = month.minusMonths(1)
    val previousDays = previous.lengthOfMonth()
    val previousAverage = (1..previousDays).sumOf { totals[previous.atDay(it)] ?: 0.0 } / previousDays
    return StatPeriod(
        title = "${month.month.getDisplayName(TextStyle.FULL, Locale.ENGLISH)} ${month.year}",
        start = first,
        end = lastWithData,
        bars = bars,
        firstDay = first,
        total = total,
        average = average,
        averageUnit = "day",
        comparison = comparisonText(average, previousAverage, "vs ${previous.month.getDisplayName(TextStyle.FULL, Locale.ENGLISH)}", withPrefix = false),
        comparisonUp = average >= previousAverage,
        rowsTitle = "Weekly ${metric.noun}",
        rowsColumn = "Total",
        rows = weekRows(totals, realDays),
        canGoBack = earliest != null && first.isAfter(earliest),
        canGoForward = offset > 0
    )
}

private fun allPeriod(
    totals: Map<LocalDate, Double>,
    metric: StatMetric,
    today: LocalDate,
    earliest: LocalDate?
): StatPeriod {
    val lastMonth = YearMonth.from(today)
    val firstMonth = earliest?.let { YearMonth.from(it) } ?: lastMonth
    val months = generateSequence(firstMonth) { it.plusMonths(1) }.takeWhile { !it.isAfter(lastMonth) }.toList()
    var totalSum = 0.0
    val monthTotals = HashMap<YearMonth, Double>()
    val perMonth = months.map { m ->
        val days = if (m == lastMonth) today.dayOfMonth else m.lengthOfMonth()
        val sum = (1..days).sumOf { totals[m.atDay(it)] ?: 0.0 }
        monthTotals[m] = sum
        totalSum += sum
        m to sum
    }
    val bars = perMonth.map { (m, v) ->
        val name = "${m.month.getDisplayName(TextStyle.SHORT, Locale.ENGLISH)} ${m.year}"
        StatBar(
            value = v,
            label = "$name · total",
            axis = when {
                m.monthValue == 1 -> "Jan ${m.year % 100}"
                (m.monthValue - 1) % 3 == 0 -> m.month.getDisplayName(TextStyle.SHORT, Locale.ENGLISH)
                else -> ""
            }
        )
    }
    val rows = perMonth.asReversed().map { (m, _) ->
        StatRow(
            "${m.month.getDisplayName(TextStyle.SHORT, Locale.ENGLISH)} ${m.year}",
            if (m == lastMonth) "Month to date" else null,
            monthTotals[m] ?: 0.0
        )
    }
    val title = if (months.size == 1) "${firstMonth.month.getDisplayName(TextStyle.SHORT, Locale.ENGLISH)} ${firstMonth.year}"
    else "${firstMonth.month.getDisplayName(TextStyle.SHORT, Locale.ENGLISH)} ${firstMonth.year} – ${lastMonth.month.getDisplayName(TextStyle.SHORT, Locale.ENGLISH)} ${lastMonth.year}"
    return StatPeriod(
        title = title,
        start = firstMonth.atDay(1),
        end = today,
        bars = bars,
        firstDay = null,
        total = totalSum,
        average = totalSum / months.size,
        averageUnit = "month",
        comparison = null,
        comparisonUp = true,
        rowsTitle = "Monthly ${metric.noun}",
        rowsColumn = "Total",
        rows = rows,
        canGoBack = false,
        canGoForward = false
    )
}

private val AxisDays = setOf(1, 5, 10, 15, 20, 25, 30)

/** Mon-start weeks of [days] (ascending), newest first, each with its daily average. */
private fun weekRows(totals: Map<LocalDate, Double>, days: List<LocalDate>): List<StatRow> =
    days.groupBy { it.with(TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY)) }
        .toSortedMap(compareByDescending { it })
        .values
        .map { week ->
            StatRow(span(week.first(), week.last()), null, week.sumOf { totals[it] ?: 0.0 })
        }

// ---------------------------------------------------------------------------
// Text
// ---------------------------------------------------------------------------

private fun LocalDate.shortMonth(): String = month.getDisplayName(TextStyle.SHORT, Locale.ENGLISH)

/** "Wed, 14 Oct". */
internal fun LocalDate.dayLabel(): String =
    "${dayOfWeek.getDisplayName(TextStyle.SHORT, Locale.ENGLISH)}, $dayOfMonth ${shortMonth()}"

/** "8–14 Oct" within a month, "31 Aug – 14 Oct" across months, "9 Oct" for a single day. */
internal fun span(a: LocalDate, b: LocalDate): String = when {
    a == b -> "${a.dayOfMonth} ${a.shortMonth()}"
    a.month == b.month && a.year == b.year -> "${a.dayOfMonth}–${b.dayOfMonth} ${b.shortMonth()}"
    else -> "${a.dayOfMonth} ${a.shortMonth()} – ${b.dayOfMonth} ${b.shortMonth()}"
}

/** "+8% vs previous 7 days"; null when the previous period had nothing to compare with. */
internal fun comparisonText(current: Double, previous: Double, label: String, withPrefix: Boolean = true): String? {
    if (previous <= 0.0) return null
    val pct = ((current - previous) / previous * 100).roundToInt()
    val sign = if (pct >= 0) "+" else "-"
    val tail = if (withPrefix) "vs $label" else label
    return "$sign${abs(pct)}% $tail"
}

/** 8.0 → "8", 8.34 → "8.3". */
internal fun formatCount(value: Double): String {
    val oneDecimal = (value * 10).roundToInt() / 10.0
    return if (oneDecimal == floor(oneDecimal)) oneDecimal.toLong().toString() else oneDecimal.toString()
}

/** Axis label: 12000 → "₹12k", 12500 → "₹12.5k"; counts as whole numbers. */
internal fun axisLabel(metric: StatMetric, value: Double): String =
    if (!metric.isMoney) formatCount(value)
    else if (value == 0.0) "0"
    else {
        val k = value / 1000
        "₹" + (if (k == floor(k)) k.toLong().toString() else "%.1f".format(Locale.US, k)) + "k"
    }
