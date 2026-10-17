package dev.appu.laluzgarage.ui.settings

import androidx.compose.animation.AnimatedContent
import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.expandVertically
import androidx.compose.animation.shrinkVertically
import androidx.compose.animation.core.Animatable
import androidx.compose.animation.core.animateDpAsState
import androidx.compose.animation.core.Spring
import androidx.compose.animation.core.spring
import androidx.compose.animation.core.tween
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.slideInVertically
import androidx.compose.animation.slideOutVertically
import androidx.compose.animation.togetherWith
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.gestures.detectHorizontalDragGestures
import androidx.compose.foundation.gestures.detectTapGestures
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.selection.selectable
import androidx.compose.foundation.selection.selectableGroup
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.rememberUpdatedState
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.geometry.CornerRadius
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.RoundRect
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.graphics.PathEffect
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.graphics.drawscope.clipRect
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.input.pointer.util.VelocityTracker
import androidx.compose.ui.platform.LocalDensity
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.heading
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.drawText
import androidx.compose.ui.text.rememberTextMeasurer
import androidx.compose.ui.unit.dp
import androidx.compose.ui.util.lerp
import dev.appu.laluzgarage.data.model.ServiceRecord
import dev.appu.laluzgarage.ui.components.LaluzIcons
import dev.appu.laluzgarage.ui.components.connectedRowShape
import dev.appu.laluzgarage.ui.services.DateRangePopup
import dev.appu.laluzgarage.ui.services.dateRangeShortText
import dev.appu.laluzgarage.ui.theme.Motion
import dev.appu.laluzgarage.ui.theme.Spacing
import java.time.LocalDate
import java.time.YearMonth
import java.time.temporal.ChronoUnit
import kotlin.math.abs
import kotlin.math.sign
import kotlinx.coroutines.launch

// ---------------------------------------------------------------------------
// Statistics menu: Settings → Statistics
// ---------------------------------------------------------------------------

private fun StatMetric.icon() = when (this) {
    StatMetric.REVENUE -> LaluzIcons.Rupee
    StatMetric.COMPLETED -> LaluzIcons.CheckCircle
    StatMetric.ARRIVALS -> LaluzIcons.Arrival
}

/** The list of statistics. Each row's supporting line is the latest 7-day average. */
@Composable
internal fun StatisticsMenuScreen(
    records: List<ServiceRecord>,
    onOpen: (StatMetric) -> Unit,
    onBack: () -> Unit
) {
    val cs = MaterialTheme.colorScheme
    val today = remember { LocalDate.now() }
    val summaries = remember(records) {
        StatMetric.entries.map { m ->
            val avg = buildPeriod(dailyTotals(records, m), m, StatRange.WEEK, 0, null, null, today).average
            val figure = if (m.isMoney) m.format(avg) else "${m.format(avg)} ${m.unit}"
            "$figure per day · last 7 days"
        }
    }
    SettingsPage("Statistics", onBack, null, {}) {
        Text(
            "Choose what to look at",
            style = MaterialTheme.typography.bodyMedium,
            color = cs.onSurfaceVariant,
            modifier = Modifier.padding(start = Spacing.xl, end = Spacing.xl, bottom = Spacing.md)
        )
        Column(
            Modifier.padding(start = Spacing.md, end = Spacing.md, bottom = Spacing.xxl),
            verticalArrangement = Arrangement.spacedBy(2.dp)
        ) {
            StatMetric.entries.forEachIndexed { i, m ->
                SettingsNavRow(
                    icon = m.icon(),
                    title = m.title,
                    supporting = summaries[i],
                    shape = connectedRowShape(i, StatMetric.entries.size),
                    onClick = { onOpen(m) }
                )
            }
        }
    }
}

// ---------------------------------------------------------------------------
// One statistic: range tabs, headline, chart, list
// ---------------------------------------------------------------------------

@Composable
internal fun StatisticsDetailScreen(
    metric: StatMetric,
    records: List<ServiceRecord>,
    onBack: () -> Unit
) {
    val cs = MaterialTheme.colorScheme
    var rangeIdx by rememberSaveable { mutableIntStateOf(0) }
    // Each range keeps its own place, so coming back to Week returns to the week that was showing.
    var weekOffset by rememberSaveable { mutableIntStateOf(0) }
    var monthOffset by rememberSaveable { mutableIntStateOf(0) }
    var customOffset by rememberSaveable { mutableIntStateOf(0) }
    var customFromDay by rememberSaveable { mutableStateOf<Long?>(null) }
    var customToDay by rememberSaveable { mutableStateOf<Long?>(null) }
    // The chosen bar: a day (epoch day) in the day-based ranges, a month bar's index in All.
    var pickedDay by rememberSaveable { mutableStateOf<Long?>(null) }
    var pickedMonth by rememberSaveable { mutableIntStateOf(-1) }
    var showPicker by rememberSaveable { mutableStateOf(false) }

    val range = StatRange.entries[rangeIdx]
    val offset = when (range) {
        StatRange.WEEK -> weekOffset
        StatRange.MONTH -> monthOffset
        StatRange.CUSTOM -> customOffset
        StatRange.ALL -> 0
    }
    val today = remember { LocalDate.now() }
    val totals = remember(records, metric) { dailyTotals(records, metric) }
    val periodAt = { o: Int ->
        buildPeriod(
            totals, metric, range, o,
            customFromDay?.let(LocalDate::ofEpochDay), customToDay?.let(LocalDate::ofEpochDay), today
        )
    }
    val period = remember(totals, metric, range, offset, customFromDay, customToDay) { periodAt(offset) }
    // The periods either side, shown beside the chart while it is swiped.
    val older = remember(period) { if (period.canGoBack) periodAt(offset + 1) else null }
    val newer = remember(period) { if (period.canGoForward) periodAt(offset - 1) else null }

    val firstDay = period.firstDay
    val selected = (if (firstDay == null) pickedMonth else pickedDay?.let { (it - firstDay.toEpochDay()).toInt() } ?: -1)
        .takeIf { it in period.bars.indices && !period.bars[it].isFuture } ?: period.defaultSelection
    val selectedBar = period.bars.getOrNull(selected)
    val selectedDay = firstDay?.plusDays(selected.toLong())

    /** Pages [by] periods back in time (negative: forward). */
    fun page(by: Int) {
        when (range) {
            StatRange.WEEK -> weekOffset += by
            StatRange.MONTH -> monthOffset += by
            StatRange.CUSTOM -> customOffset += by
            StatRange.ALL -> {}
        }
    }

    SettingsPage(metric.title, onBack, null, {}) {
        StatTabs(
            selected = range,
            onSelect = { r ->
                // Week and Month zoom around the selected day: it stays selected, and the new range
                // shows the period holding it (the remembered week, when that week still holds it).
                if (r != range && selectedDay != null && (r == StatRange.WEEK || r == StatRange.MONTH)) {
                    pickedDay = selectedDay.toEpochDay()
                    if (r == StatRange.MONTH) {
                        monthOffset = ChronoUnit.MONTHS.between(YearMonth.from(selectedDay), YearMonth.from(today)).toInt()
                    } else {
                        val weekEnd = today.minusDays(7L * weekOffset)
                        if (selectedDay.isAfter(weekEnd) || selectedDay.isBefore(weekEnd.minusDays(6))) {
                            weekOffset = (ChronoUnit.DAYS.between(selectedDay, today) / 7).toInt()
                        }
                    }
                }
                rangeIdx = r.ordinal
            },
            modifier = Modifier.padding(start = Spacing.md, end = Spacing.md, top = Spacing.xs)
        )

        // The From / To fields slide down and fade in, pushing the content below with them.
        AnimatedVisibility(
            visible = range == StatRange.CUSTOM,
            enter = expandVertically(tween(300, easing = Motion.emphasized)) + fadeIn(tween(250)),
            exit = shrinkVertically(tween(250, easing = Motion.emphasized)) + fadeOut(tween(150))
        ) {
            Row(
                Modifier
                    .fillMaxWidth()
                    .padding(start = Spacing.md, end = Spacing.md, top = Spacing.sm),
                horizontalArrangement = Arrangement.spacedBy(Spacing.xs)
            ) {
                DateField("From", dateRangeShortText(period.start, null), Modifier.weight(1f)) { showPicker = true }
                DateField("To", dateRangeShortText(period.end, null), Modifier.weight(1f)) { showPicker = true }
            }
        }

        // Period title with previous / next
        Row(
            Modifier
                .fillMaxWidth()
                .padding(start = Spacing.xl, end = Spacing.md, top = Spacing.md),
            verticalAlignment = Alignment.CenterVertically
        ) {
            AnimatedContent(
                targetState = period.title,
                transitionSpec = { fadeIn(tween(200)) togetherWith fadeOut(tween(150)) },
                label = "StatTitle",
                modifier = Modifier
                    .weight(1f)
                    .semantics { heading() }
            ) { title ->
                Text(title, style = MaterialTheme.typography.titleLarge, color = cs.onSurface)
            }
            if (range != StatRange.ALL) {
                PeriodArrow(LaluzIcons.ChevronLeft, "Previous period", period.canGoBack) { page(1) }
                PeriodArrow(LaluzIcons.ChevronRight, "Next period", period.canGoForward) { page(-1) }
            }
        }

        // Headline
        Column(
            Modifier
                .fillMaxWidth()
                .padding(start = Spacing.xl, end = Spacing.xl, top = Spacing.xs),
            verticalArrangement = Arrangement.spacedBy(Spacing.xxs)
        ) {
            Row(horizontalArrangement = Arrangement.spacedBy(Spacing.xs)) {
                // The figure rolls up like a counter when the period changes.
                AnimatedContent(
                    targetState = metric.format(period.total),
                    transitionSpec = {
                        (slideInVertically(tween(300, easing = Motion.emphasized)) { it / 2 } + fadeIn(tween(200))) togetherWith
                            (slideOutVertically(tween(300, easing = Motion.emphasized)) { -it / 2 } + fadeOut(tween(150)))
                    },
                    label = "StatAverage",
                    modifier = Modifier.alignByBaseline()
                ) { figure ->
                    // Long totals (All, in lakhs) step down a size so they stay on one line.
                    val style = if (figure.length > 9) MaterialTheme.typography.displayMedium else MaterialTheme.typography.displayLarge
                    Text(figure, style = style, color = cs.onSurface)
                }
                Text(
                    metric.inTotal,
                    style = MaterialTheme.typography.bodyMedium,
                    color = cs.onSurfaceVariant,
                    modifier = Modifier.alignByBaseline()
                )
            }
        }

        // Chart
        Column(
            Modifier
                .fillMaxWidth()
                .padding(start = Spacing.xl, end = Spacing.md, top = Spacing.xl),
            verticalArrangement = Arrangement.spacedBy(Spacing.xs)
        ) {
            Row(
                Modifier
                    .fillMaxWidth()
                    .heightIn(min = 28.dp)
                    .padding(end = Spacing.xs),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.SpaceBetween
            ) {
                Text(selectedBar?.label.orEmpty(), style = MaterialTheme.typography.labelLarge, color = cs.onSurface)
                Text(
                    selectedBar?.let { metric.formatWithUnit(it.value) }.orEmpty(),
                    style = MaterialTheme.typography.titleMedium,
                    color = cs.onSurface
                )
            }
            StatChart(
                period, older, newer, metric, selected,
                onSelect = { i -> if (firstDay == null) pickedMonth = i else pickedDay = firstDay.toEpochDay() + i },
                onPage = ::page
            )
            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(Spacing.xxs)) {
                Canvas(Modifier.size(width = 14.dp, height = 2.dp)) {
                    drawLine(
                        cs.onSurfaceVariant, Offset(0f, 1.dp.toPx()), Offset(size.width, 1.dp.toPx()),
                        strokeWidth = 2.dp.toPx(), pathEffect = PathEffect.dashPathEffect(floatArrayOf(6f, 4f))
                    )
                }
                Text("Average", style = MaterialTheme.typography.labelMedium, color = cs.onSurfaceVariant)
            }
        }

        // List
        Column(
            Modifier
                .fillMaxWidth()
                .padding(start = Spacing.md, end = Spacing.md, top = Spacing.xl, bottom = Spacing.xxl),
            verticalArrangement = Arrangement.spacedBy(Spacing.xs)
        ) {
            Row(
                Modifier
                    .fillMaxWidth()
                    .padding(horizontal = Spacing.xs),
                horizontalArrangement = Arrangement.SpaceBetween
            ) {
                Text(period.rowsTitle, style = MaterialTheme.typography.titleMedium, color = cs.onSurface)
                Text(period.rowsColumn, style = MaterialTheme.typography.bodyMedium, color = cs.onSurfaceVariant)
            }
            Column(verticalArrangement = Arrangement.spacedBy(2.dp)) {
                period.rows.forEachIndexed { i, row ->
                    Row(
                        Modifier
                            .fillMaxWidth()
                            .heightIn(min = 64.dp)
                            .background(cs.surfaceContainerLow, connectedRowShape(i, period.rows.size))
                            .padding(horizontal = Spacing.lg, vertical = Spacing.xs),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Column(Modifier.weight(1f)) {
                            Text(row.title, style = MaterialTheme.typography.titleMedium, color = cs.onSurface)
                            row.sub?.let { Text(it, style = MaterialTheme.typography.bodySmall, color = cs.onSurfaceVariant) }
                        }
                        Text(metric.format(row.value), style = MaterialTheme.typography.titleLarge, color = cs.onSurface)
                    }
                }
            }
        }
    }

    if (showPicker) {
        DateRangePopup(
            from = period.start,
            to = period.end,
            centered = true,
            onChange = { from, to ->
                customFromDay = from?.toEpochDay()
                customToDay = to?.toEpochDay()
                customOffset = 0
            },
            onDismiss = { showPicker = false }
        )
    }
}

/** Four segments, the chosen one a full pill and the rest squarer, joined by 2dp. */
@Composable
private fun StatTabs(selected: StatRange, onSelect: (StatRange) -> Unit, modifier: Modifier = Modifier) {
    val cs = MaterialTheme.colorScheme
    val all = StatRange.entries
    Row(modifier.fillMaxWidth().selectableGroup(), horizontalArrangement = Arrangement.spacedBy(2.dp)) {
        all.forEachIndexed { i, r ->
            val isSelected = r == selected
            // The chosen segment becomes a full pill; its corners morph as the choice moves.
            val morph = tween<androidx.compose.ui.unit.Dp>(Motion.SHAPE_MORPH_MS, easing = Motion.emphasized)
            val startRadius by animateDpAsState(if (isSelected || i == 0) 24.dp else 8.dp, morph, label = "SegmentStart")
            val endRadius by animateDpAsState(if (isSelected || i == all.lastIndex) 24.dp else 8.dp, morph, label = "SegmentEnd")
            val shape = RoundedCornerShape(topStart = startRadius, bottomStart = startRadius, topEnd = endRadius, bottomEnd = endRadius)
            Box(
                Modifier
                    .weight(1f)
                    .height(48.dp)
                    // Clip first, so the press ripple stays inside the segment's shape.
                    .clip(shape)
                    .background(if (isSelected) cs.secondaryContainer else cs.surfaceContainerHigh)
                    .selectable(selected = isSelected, role = Role.RadioButton, onClick = { onSelect(r) }),
                contentAlignment = Alignment.Center
            ) {
                Text(
                    r.label,
                    style = MaterialTheme.typography.labelLarge,
                    color = if (isSelected) cs.onSecondaryContainer else cs.onSurface,
                    maxLines = 1
                )
            }
        }
    }
}

/** A From / To field of the Custom range: a label over the date, opening the range picker. */
@Composable
private fun DateField(label: String, value: String, modifier: Modifier, onClick: () -> Unit) {
    val cs = MaterialTheme.colorScheme
    Surface(
        onClick = onClick,
        shape = RoundedCornerShape(16.dp),
        color = cs.surfaceContainerHigh,
        modifier = modifier
            .height(48.dp)
            .semantics { contentDescription = "$label date: $value" }
    ) {
        Row(
            Modifier.padding(horizontal = Spacing.md),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.SpaceBetween
        ) {
            Column {
                Text(label, style = MaterialTheme.typography.bodySmall, color = cs.onSurfaceVariant)
                Text(value, style = MaterialTheme.typography.labelLarge, color = cs.onSurface)
            }
            Icon(LaluzIcons.Calendar, contentDescription = null, tint = cs.onSurfaceVariant, modifier = Modifier.size(20.dp))
        }
    }
}

@Composable
private fun PeriodArrow(icon: androidx.compose.ui.graphics.vector.ImageVector, description: String, enabled: Boolean, onClick: () -> Unit) {
    val cs = MaterialTheme.colorScheme
    IconButton(onClick = onClick, enabled = enabled, modifier = Modifier.size(48.dp)) {
        Icon(icon, contentDescription = description, tint = cs.onSurface.copy(alpha = if (enabled) 1f else 0.38f))
    }
}

// ---------------------------------------------------------------------------
// Bar chart
// ---------------------------------------------------------------------------

private val PlotHeight = 176.dp
private val AxisGutter = 48.dp
private val ChartTopInset = 8.dp
private val AxisLabelRoom = 20.dp
private const val ChartMorphMs = 450

/** How far a swipe must travel, as a share of the plot, to change period on release. */
private const val SwipeCommit = 0.25f

/** How much the chart gives when swiped towards a side with nothing there. */
private const val SwipeResistance = 0.2f

/**
 * Where the chart's camera is: the days in view from [start] (an epoch day) across [days], the
 * y-axis top, the average line and the gap between bars. Day-based periods share one timeline, so
 * moving the camera is what zooms Week into Month and slides one week into the next.
 */
private data class ChartView(val start: Float, val days: Float, val max: Float, val avg: Float, val gap: Float)

private fun lerp(a: ChartView, b: ChartView, t: Float) = ChartView(
    lerp(a.start, b.start, t), lerp(a.days, b.days, t), lerp(a.max, b.max, t), lerp(a.avg, b.avg, t), lerp(a.gap, b.gap, t)
)

/** A period drawn at [alpha]. */
private class ChartLayer(val period: StatPeriod, val alpha: Float)

/** Remembers what the chart showed before, so a new period can morph out of it. */
private class ChartHolder(var current: StatPeriod) {
    var previous: StatPeriod? = null

    /** The period whose morph has started; until then the new period still draws as the old one. */
    var startedFor: StatPeriod? = null

    /** The camera and opacities the morph starts from: whatever was on screen, mid-swipe included. */
    var fromView: ChartView? = null
    var fromOldAlpha = 1f
    var fromNewAlpha = 0f

    /** The last frame drawn. */
    var lastView: ChartView? = null
    var lastLayers: List<ChartLayer> = emptyList()
}

/** Left edge and width of bar [i] of [n] in a plot [plotW] wide. */
private fun barGeometry(i: Int, n: Int, plotW: Float, gap: Float): Pair<Float, Float> {
    val slot = plotW / n
    val w = (slot - gap).coerceAtLeast(2f)
    return (i * slot + (slot - w) / 2f) to w
}

/** The index of [day]'s bar in [p], or -1 when [p] has no bar for it (or the day is still to come). */
private fun barIndexOf(p: StatPeriod, day: Long): Int {
    val first = p.firstDay ?: return -1
    val i = (day - first.toEpochDay()).toInt()
    return if (i in p.bars.indices && !p.bars[i].isFuture) i else -1
}

/** A bar with a rounded top and a flat bottom, sitting on the baseline. */
private fun barPath(left: Float, w: Float, h: Float, bottom: Float) = Path().apply {
    val r = CornerRadius(minOf(w / 2f, h))
    addRoundRect(RoundRect(
        left = left, top = bottom - h, right = left + w, bottom = bottom,
        topLeftCornerRadius = r, topRightCornerRadius = r,
        bottomRightCornerRadius = CornerRadius.Zero, bottomLeftCornerRadius = CornerRadius.Zero
    ))
}

/**
 * One bar per day (or per month in All) on a 3-line grid, with a dashed average line and a
 * selection ring. Tap a bar to select it; swipe sideways for the [older] or [newer] period. The
 * list below the chart carries the same numbers.
 *
 * Day bars sit on a shared timeline, so changing period moves a camera along it: Week zooms out
 * into its Month with the other days fading in, paging slides the old days out and the new ones
 * in, and a swipe follows the finger with the next period alongside. The scale and average line
 * glide between periods and the axis labels cross-fade. To and from All, the old bars morph into
 * the new ones by position; a fresh chart grows up from the baseline.
 */
@Composable
private fun StatChart(
    period: StatPeriod,
    older: StatPeriod?,
    newer: StatPeriod?,
    metric: StatMetric,
    selected: Int,
    onSelect: (Int) -> Unit,
    onPage: (Int) -> Unit,
    modifier: Modifier = Modifier
) {
    val cs = MaterialTheme.colorScheme
    val measurer = rememberTextMeasurer()
    val axisStyle = MaterialTheme.typography.labelMedium.copy(color = cs.onSurfaceVariant)
    val avgStyle = MaterialTheme.typography.labelMedium.copy(color = cs.onSurface, fontWeight = FontWeight.Bold)
    val density = LocalDensity.current
    val scope = rememberCoroutineScope()
    val currentPeriod by rememberUpdatedState(period)
    val currentOlder by rememberUpdatedState(older)
    val currentNewer by rememberUpdatedState(newer)
    val currentOnSelect by rememberUpdatedState(onSelect)
    val currentOnPage by rememberUpdatedState(onPage)

    val holder = remember { ChartHolder(period) }
    if (holder.current != period) {
        val old = holder.current
        holder.fromView = holder.lastView
        holder.fromOldAlpha = holder.lastLayers.firstOrNull { it.period == old }?.alpha ?: 1f
        holder.fromNewAlpha = holder.lastLayers.firstOrNull { it.period == period }?.alpha ?: 0f
        holder.previous = old
        holder.current = period
    }
    val progress = remember { Animatable(0f) }
    LaunchedEffect(period) {
        progress.snapTo(0f)
        holder.startedFor = period
        progress.animateTo(1f, tween(ChartMorphMs, easing = Motion.emphasized))
    }
    // How far the chart is dragged, in px; positive reveals the older period on the left.
    val drag = remember { Animatable(0f) }

    val summary = remember(period, selected) {
        val bar = period.bars.getOrNull(selected)
        "Bar chart, ${period.title}. Average ${metric.formatWithUnit(period.average)} per ${period.averageUnit}." +
            (bar?.let { " Selected ${it.label}: ${metric.formatWithUnit(it.value)}." } ?: "")
    }
    Canvas(
        modifier
            .fillMaxWidth()
            .height(ChartTopInset + PlotHeight + AxisLabelRoom)
            .semantics { contentDescription = summary }
            .pointerInput(Unit) {
                detectTapGestures { pos ->
                    val bars = currentPeriod.bars
                    val plotW = size.width - with(density) { AxisGutter.toPx() }
                    if (plotW > 0f && pos.x in 0f..plotW && bars.isNotEmpty()) {
                        val i = (pos.x / plotW * bars.size).toInt().coerceIn(0, bars.lastIndex)
                        if (!bars[i].isFuture) currentOnSelect(i)
                    }
                }
            }
            .pointerInput(Unit) {
                val velocity = VelocityTracker()
                detectHorizontalDragGestures(
                    onDragStart = { velocity.resetTracking() },
                    onDragEnd = {
                        val plotW = size.width - AxisGutter.toPx()
                        val dx = drag.value
                        val vx = velocity.calculateVelocity().x
                        val target = if (dx > 0f) currentOlder else currentNewer
                        val flung = abs(vx) > 600.dp.toPx() && sign(vx) == sign(dx)
                        scope.launch {
                            if (target != null && (abs(dx) > plotW * SwipeCommit || flung)) {
                                // The new period morphs on from exactly where the finger left it.
                                currentOnPage(if (dx > 0f) 1 else -1)
                                drag.snapTo(0f)
                            } else {
                                drag.animateTo(0f, spring(stiffness = Spring.StiffnessMediumLow))
                            }
                        }
                    },
                    onDragCancel = { scope.launch { drag.animateTo(0f, spring(stiffness = Spring.StiffnessMediumLow)) } }
                ) { change, amount ->
                    if (currentPeriod.firstDay == null) return@detectHorizontalDragGestures
                    change.consume()
                    velocity.addPosition(change.uptimeMillis, change.position)
                    scope.launch { drag.snapTo(drag.value + amount) }
                }
            }
    ) {
        // Read the progress on every frame, even before the morph has started, so the draw is
        // subscribed to it and the animation redraws the chart.
        val p = progress.value
        val t = if (holder.startedFor == period) p else 0f
        val previous = holder.previous
        val top = ChartTopInset.toPx()
        val plotH = PlotHeight.toPx()
        val plotW = size.width - AxisGutter.toPx()
        val bottom = top + plotH
        val gridColor = cs.outlineVariant

        fun viewOf(p: StatPeriod) = ChartView(
            start = p.firstDay?.toEpochDay()?.toFloat() ?: 0f,
            days = p.bars.size.toFloat(),
            max = p.axisMax(metric).toFloat(),
            avg = p.average.toFloat(),
            gap = if (p.isDense) 2.dp.toPx() else 10.dp.toPx()
        )

        // Where the camera is, and which periods show at what strength.
        val morphing = previous != null && t < 1f
        val timeline = period.firstDay != null && (!morphing || previous?.firstDay != null)
        val target = viewOf(period)
        val view: ChartView
        val layers: List<ChartLayer>
        if (morphing && previous != null) {
            view = lerp(holder.fromView ?: viewOf(previous), target, t)
            layers = listOf(
                ChartLayer(previous, holder.fromOldAlpha * (1f - t)),
                ChartLayer(period, lerp(holder.fromNewAlpha, 1f, t))
            )
        } else {
            val f = if (timeline && plotW > 0f) (drag.value / plotW).coerceIn(-1f, 1f) else 0f
            val neighbour = when {
                f > 0f -> older
                f < 0f -> newer
                else -> null
            }
            if (neighbour != null) {
                val a = abs(f)
                view = lerp(target, viewOf(neighbour), a)
                layers = listOf(ChartLayer(period, 1f - a), ChartLayer(neighbour, a))
            } else {
                // Nothing that way: the chart gives a little, then springs back.
                view = target.copy(start = target.start - f * SwipeResistance * target.days)
                layers = listOf(ChartLayer(period, 1f))
            }
        }
        holder.lastView = view
        holder.lastLayers = layers
        // A fresh chart grows up from the baseline.
        val grow = if (previous == null) t else 1f

        // Grid: top, middle, baseline; each period's axis labels show at that period's strength.
        val labelLayers = layers.groupBy { it.period.axisMax(metric) }
        listOf(1f, 0.5f, 0f).forEach { level ->
            val y = bottom - plotH * level
            drawLine(gridColor, Offset(0f, y), Offset(plotW, y), strokeWidth = 1.dp.toPx())
            labelLayers.forEach { (max, ls) ->
                val alpha = ls.sumOf { it.alpha.toDouble() }.toFloat().coerceIn(0f, 1f)
                if (alpha > 0f) {
                    val label = measurer.measure(axisLabel(metric, max * level), axisStyle)
                    drawText(label, topLeft = Offset(plotW + 8.dp.toPx(), y - label.size.height / 2f), alpha = alpha)
                }
            }
        }

        // Average: the dashed line glides to its new height. Drawn before the bars, so it sits behind them.
        val avgY = bottom - (view.avg / view.max).coerceIn(0f, 1f) * plotH * grow
        drawLine(
            cs.onSurfaceVariant, Offset(0f, avgY), Offset(plotW, avgY),
            strokeWidth = 2.dp.toPx(), pathEffect = PathEffect.dashPathEffect(floatArrayOf(10f, 8f))
        )
        val avgLabel = measurer.measure("avg", avgStyle)
        drawText(avgLabel, topLeft = Offset(plotW + 8.dp.toPx(), avgY - avgLabel.size.height / 2f))

        if (timeline) {
            val slot = plotW / view.days
            val w = (slot - view.gap).coerceAtLeast(2f)
            fun leftOf(day: Long) = (day - view.start) * slot + (slot - w) / 2f
            val selectedDay = period.firstDay?.toEpochDay()?.plus(selected)

            clipRect(right = plotW) {
                // Bars: every day any showing period has, at its date. A day two periods share
                // (a week inside its month) is drawn once, at full strength, so it stays put.
                val drawn = HashSet<Long>()
                layers.forEach { layer ->
                    val first = layer.period.firstDay?.toEpochDay() ?: return@forEach
                    layer.period.bars.forEachIndexed { i, bar ->
                        val day = first + i
                        if (bar.isFuture || !drawn.add(day)) return@forEachIndexed
                        var alpha = 0f
                        var weighted = 0.0
                        layers.forEach { l ->
                            val j = barIndexOf(l.period, day)
                            if (j >= 0) {
                                alpha += l.alpha
                                weighted += l.alpha * l.period.bars[j].value
                            }
                        }
                        alpha = alpha.coerceIn(0f, 1f)
                        val value = if (alpha > 0f) weighted / alpha else bar.value
                        val left = leftOf(day)
                        if (alpha <= 0f || left + w < 0f || left > plotW) return@forEachIndexed
                        val frac = if (value <= 0.0) 0f else (value / view.max).toFloat() * grow
                        val h = if (frac <= 0f) 0f else (frac * plotH).coerceAtLeast(2.dp.toPx())
                        if (h > 0f) {
                            val path = barPath(left, w, h, bottom)
                            drawPath(path, cs.primary, alpha = alpha)
                            if (day == selectedDay) drawPath(path, cs.onSurface, alpha = alpha, style = Stroke(2.dp.toPx()))
                        }
                    }
                }

                // X labels ride with their bars, each period's at its strength.
                layers.forEach { layer ->
                    val first = layer.period.firstDay?.toEpochDay() ?: return@forEach
                    if (layer.alpha <= 0f) return@forEach
                    layer.period.bars.forEachIndexed { i, bar ->
                        if (bar.axis.isEmpty()) return@forEachIndexed
                        val left = leftOf(first + i)
                        val label = measurer.measure(bar.axis, axisStyle)
                        val x = if (layer.period.isDense) left else left + w / 2f - label.size.width / 2f
                        if (x + label.size.width < 0f || x > plotW) return@forEachIndexed
                        drawText(label, topLeft = Offset(x, bottom + 4.dp.toPx()), alpha = layer.alpha)
                    }
                }
            }
        } else {
            // To or from All: each new bar grows out of the old bar at the same place along the axis.
            val bars = period.bars
            val n = bars.size
            fun gapFor(p: StatPeriod) = if (p.isDense) 2.dp.toPx() else 10.dp.toPx()
            val gap = gapFor(period)
            val oldGap = previous?.let { gapFor(it) } ?: gap
            val oldMax = previous?.axisMax(metric)
            bars.forEachIndexed { i, bar ->
                if (bar.isFuture) return@forEachIndexed
                val (newLeft, newW) = barGeometry(i, n, plotW, gap)
                var oldLeft = newLeft
                var oldW = newW
                var oldValue = 0.0
                if (previous != null && morphing) {
                    val on = previous.bars.size
                    val j = ((i + 0.5f) / n * on).toInt().coerceIn(0, on - 1)
                    val (l, ow) = barGeometry(j, on, plotW, oldGap)
                    oldLeft = l
                    oldW = ow
                    oldValue = previous.bars[j].takeIf { !it.isFuture }?.value ?: 0.0
                }
                val tm = if (morphing) t else 1f
                val left = lerp(oldLeft, newLeft, tm)
                val w = lerp(oldW, newW, tm)
                // Old and new heights each on their own scale, so a bar lands exactly on its value.
                val oldFrac = if (oldMax == null || oldValue <= 0.0) 0f else (oldValue / oldMax).toFloat()
                val newFrac = if (bar.value <= 0.0) 0f else (bar.value / period.axisMax(metric)).toFloat()
                val frac = lerp(oldFrac, newFrac, tm) * grow
                val h = if (frac <= 0f) 0f else (frac * plotH).coerceAtLeast(2.dp.toPx())
                if (h > 0f) {
                    val path = barPath(left, w, h, bottom)
                    drawPath(path, cs.primary)
                    if (i == selected) drawPath(path, cs.onSurface, alpha = tm, style = Stroke(2.dp.toPx()))
                }
            }

            // X labels: the old ones fade out where they were, the new ones fade in.
            if (previous != null && morphing) {
                previous.bars.forEachIndexed { i, bar ->
                    if (bar.axis.isNotEmpty()) {
                        val (left, w) = barGeometry(i, previous.bars.size, plotW, oldGap)
                        val label = measurer.measure(bar.axis, axisStyle)
                        val x = if (previous.isDense) left else left + w / 2f - label.size.width / 2f
                        drawText(label, topLeft = Offset(x, bottom + 4.dp.toPx()), alpha = 1f - t)
                    }
                }
            }
            bars.forEachIndexed { i, bar ->
                if (bar.axis.isNotEmpty()) {
                    val (left, w) = barGeometry(i, n, plotW, gap)
                    val label = measurer.measure(bar.axis, axisStyle)
                    val x = if (period.isDense) left else left + w / 2f - label.size.width / 2f
                    drawText(label, topLeft = Offset(x, bottom + 4.dp.toPx()), alpha = if (morphing) t else 1f)
                }
            }
        }
    }
}
