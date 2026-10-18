package dev.appu.laluzgarage.ui.dashboard

import kotlinx.coroutines.withTimeoutOrNull
import kotlinx.coroutines.flow.first
import androidx.compose.runtime.snapshotFlow
import androidx.compose.runtime.setValue
import androidx.compose.runtime.rememberUpdatedState
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.animation.togetherWith
import androidx.compose.animation.scaleIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.fadeIn
import androidx.compose.animation.core.tween
import androidx.compose.animation.core.animateIntAsState
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.LinearEasing
import androidx.compose.animation.core.CubicBezierEasing
import androidx.compose.animation.core.Animatable
import androidx.compose.animation.AnimatedContent
import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.expandVertically
import androidx.compose.animation.shrinkVertically
import androidx.compose.ui.semantics.LiveRegionMode
import androidx.compose.ui.semantics.liveRegion
import dev.appu.laluzgarage.ui.theme.Radius
import dev.appu.laluzgarage.ui.components.rememberContainerSource
import dev.appu.laluzgarage.ui.components.containerSource
import dev.appu.laluzgarage.ui.components.LocalContainerTransform
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.ScrollState
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.ExperimentalMaterial3ExpressiveApi
import androidx.compose.material3.Icon
import androidx.compose.material3.LocalContentColor
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.material3.pulltorefresh.PullToRefreshBox
import androidx.compose.material3.pulltorefresh.PullToRefreshDefaults
import androidx.compose.material3.pulltorefresh.rememberPullToRefreshState
import androidx.compose.runtime.Composable
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.runtime.Immutable
import androidx.compose.runtime.derivedStateOf
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.ui.Alignment
import androidx.compose.foundation.layout.BoxWithConstraints
import dev.appu.laluzgarage.ui.layout.LocalAdaptive
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.clipToBounds
import androidx.compose.ui.draw.rotate
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.StrokeJoin
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.semantics.clearAndSetSemantics
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.heading
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.SpanStyle
import androidx.compose.ui.text.buildAnnotatedString
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.text.withStyle
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import dev.appu.laluzgarage.data.model.Customer
import dev.appu.laluzgarage.data.model.Part
import dev.appu.laluzgarage.data.model.ServiceRecord
import dev.appu.laluzgarage.data.model.Vehicle
import dev.appu.laluzgarage.data.sync.SyncUiState
import dev.appu.laluzgarage.data.update.LaunchUpdate
import dev.appu.laluzgarage.data.update.ReleaseChannel
import dev.appu.laluzgarage.ui.components.SpinningCookieBadge
import androidx.compose.animation.animateContentSize
import androidx.compose.material3.IconButton
import androidx.compose.material3.Surface
import androidx.compose.runtime.key
import androidx.compose.ui.graphics.lerp
import androidx.compose.ui.graphics.luminance
import dev.appu.laluzgarage.ui.components.AccountActions
import dev.appu.laluzgarage.ui.components.BarIconButton
import dev.appu.laluzgarage.ui.components.ChipTone
import dev.appu.laluzgarage.ui.components.ConnectedSegments
import dev.appu.laluzgarage.ui.components.CookieShape
import dev.appu.laluzgarage.ui.components.IconTile
import dev.appu.laluzgarage.ui.components.LaluzIcons
import dev.appu.laluzgarage.ui.components.LaluzTextButton
import dev.appu.laluzgarage.ui.components.LaluzSyncTopBar
import dev.appu.laluzgarage.ui.layout.sheetInsetPadding
import dev.appu.laluzgarage.ui.components.MaxContentWidth
import dev.appu.laluzgarage.ui.components.OperatorAvatarButton
import dev.appu.laluzgarage.ui.components.SegmentColors
import dev.appu.laluzgarage.ui.components.StatusChip
import dev.appu.laluzgarage.ui.components.bleedEnd
import dev.appu.laluzgarage.ui.components.syncTitleAlpha
import dev.appu.laluzgarage.ui.components.formatInrWhole
import dev.appu.laluzgarage.ui.services.ServiceUiState
import dev.appu.laluzgarage.ui.services.compactPlate
import dev.appu.laluzgarage.ui.services.displayName
import dev.appu.laluzgarage.ui.services.dueFlag
import dev.appu.laluzgarage.ui.services.formatPlate
import dev.appu.laluzgarage.ui.services.isOpen
import dev.appu.laluzgarage.ui.services.jobStatus
import dev.appu.laluzgarage.ui.services.JobStatus
import dev.appu.laluzgarage.ui.services.longLabel
import dev.appu.laluzgarage.ui.services.modelLabel
import dev.appu.laluzgarage.ui.services.parseRecordDate
import dev.appu.laluzgarage.ui.services.shortLabel
import dev.appu.laluzgarage.ui.theme.JetBrainsMono
import dev.appu.laluzgarage.ui.theme.LaluzShape
import dev.appu.laluzgarage.ui.theme.LaluzTheme
import dev.appu.laluzgarage.ui.theme.Spacing
import java.time.LocalDate
import java.time.LocalTime
import java.time.temporal.ChronoUnit
import java.util.Locale
import kotlin.math.abs
import kotlin.math.roundToInt

/** Range options on the Total services card; [days] is null for all time. */
enum class ServiceRange(val days: Int?, val label: String) {
    D7(7, "7D"), D45(45, "45D"), ALL(null, "ALL")
}

/** All time: the graph switches from per-day to per-month points once the history is longer than this. */
private const val AllTimeDailyMaxDays = 90

/** All time has no previous period, so the pill counts what came in over this many days instead. */
private const val AllTimeRecentDays = 30L

private val monthYear = java.time.format.DateTimeFormatter.ofPattern("MMM yyyy", Locale.ENGLISH)

@Immutable
data class AttentionItem(val record: ServiceRecord, val plate: String, val vehicle: String, val customer: String, val total: String, val flag: String, val overdue: Boolean)

@Immutable
data class RecentItem(val record: ServiceRecord, val vehicle: String, val plate: String, val customer: String, val status: JobStatus, val date: String)

@Immutable
data class DashboardStats(
    val total: Int,
    val deltaText: String,
    val deltaUp: Boolean,
    val caption: String,
    val daily: List<Int>,
    val pending: Int,
    val inProgress: Int,
    val completedInRange: Int,
    val completedShare: Int,
    val attention: List<AttentionItem>,
    val overdueCount: Int,
    val vehicles: Int,
    val customers: Int,
    val partsFitted: Int,
    val lowStock: Int,
    val recent: List<RecentItem>
)

/** What the dashboard draws; [DashboardUi.stats] always matches [DashboardUi.range]. */
@Immutable
data class DashboardUi(
    val stats: DashboardStats = computeDashboard(emptyList(), emptyMap(), emptyMap(), emptyList(), ServiceRange.D45),
    val range: ServiceRange = ServiceRange.D45,
    val isLoading: Boolean = true
)

/** Pure aggregation over the streamed Firestore collections. */
fun computeDashboard(
    records: List<ServiceRecord>,
    vehicles: Map<String, Vehicle>,
    customers: Map<String, Customer>,
    parts: List<Part>,
    range: ServiceRange,
    today: LocalDate = LocalDate.now()
): DashboardStats {
    val dated = records.mapNotNull { r -> parseRecordDate(r.date)?.let { r to it } }
    val trend = range.days?.let { periodTrend(dated, it, today) } ?: allTimeTrend(records, dated, today)
    val inRange = trend.records
    val total = inRange.size

    // Status tiles follow the hero card's range, so both cards count the same jobs.
    val pending = inRange.count { it.jobStatus == JobStatus.PENDING }
    val inProgress = inRange.count { it.jobStatus == JobStatus.IN_PROGRESS }
    val completedInRange = inRange.count { it.jobStatus == JobStatus.COMPLETED }

    val attention = records.filter { it.isOpen }
        .mapNotNull { r -> r.dueFlag(today)?.let { r to it } }
        .sortedByDescending { it.second.overdueDays }
        .map { (r, flag) ->
            val v = vehicles[r.vehicleId]
            AttentionItem(
                record = r,
                plate = formatPlate(v?.plateNumber),
                vehicle = v.modelLabel(),
                customer = customers[r.customerId].displayName(),
                total = formatInrWhole(r.totalCost),
                flag = flag.label,
                overdue = flag.isOverdue
            )
        }

    val recent = records.take(5).map { r ->
        val v = vehicles[r.vehicleId]
        RecentItem(
            record = r,
            vehicle = v.modelLabel(),
            plate = compactPlate(v?.plateNumber),
            customer = customers[r.customerId].displayName(),
            status = r.jobStatus,
            date = parseRecordDate(r.date)?.shortLabel() ?: ""
        )
    }

    return DashboardStats(
        total = total,
        deltaText = trend.deltaText,
        deltaUp = trend.deltaUp,
        caption = trend.caption,
        daily = trend.points,
        pending = pending,
        inProgress = inProgress,
        completedInRange = completedInRange,
        completedShare = if (total == 0) 0 else (completedInRange * 100.0 / total).roundToInt(),
        attention = attention,
        overdueCount = attention.count { it.overdue },
        vehicles = vehicles.size,
        customers = customers.size,
        partsFitted = inRange.sumOf { r -> r.partsUsed.sumOf { it.quantity } },
        lowStock = parts.count { it.isLowStock },
        recent = recent
    )
}

/** The hero card's numbers for one range: the records it counts and how the graph, pill and caption read. */
private class RangeTrend(
    val records: List<ServiceRecord>,
    val points: List<Int>,
    val deltaText: String,
    val deltaUp: Boolean,
    val caption: String
)

/** Last [n] days, compared with the [n] days before. */
private fun periodTrend(dated: List<Pair<ServiceRecord, LocalDate>>, n: Int, today: LocalDate): RangeTrend {
    val start = today.minusDays((n - 1).toLong())
    val prevStart = start.minusDays(n.toLong())
    val inRange = dated.filter { (_, d) -> !d.isBefore(start) && !d.isAfter(today) }
    val prevCount = dated.count { (_, d) -> !d.isBefore(prevStart) && d.isBefore(start) }
    val daily = IntArray(n)
    inRange.forEach { (_, d) -> daily[ChronoUnit.DAYS.between(start, d).toInt()]++ }
    val total = inRange.size

    val pct = when {
        prevCount == 0 && total == 0 -> 0
        prevCount == 0 -> 100
        else -> ((total - prevCount) * 100.0 / prevCount).roundToInt()
    }
    val perDay = String.format(Locale.ENGLISH, "%.1f", total.toDouble() / n)
    return RangeTrend(
        records = inRange.map { it.first },
        points = daily.toList(),
        deltaText = (if (pct >= 0) "+" else "−") + abs(pct) + "%",
        deltaUp = pct >= 0,
        caption = "vs previous $n days · $perDay per day"
    )
}

/**
 * Every record, undated ones included. The graph runs from the first dated job to today, per day
 * for a short history and per month after that; the pill shows the last 30 days' intake.
 */
private fun allTimeTrend(
    records: List<ServiceRecord>,
    dated: List<Pair<ServiceRecord, LocalDate>>,
    today: LocalDate
): RangeTrend {
    val past = dated.map { it.second }.filter { !it.isAfter(today) }
    val first = past.minOrNull() ?: today
    val spanDays = ChronoUnit.DAYS.between(first, today).toInt() + 1
    val points = if (spanDays <= AllTimeDailyMaxDays) {
        IntArray(spanDays).also { daily -> past.forEach { daily[ChronoUnit.DAYS.between(first, it).toInt()]++ } }
    } else {
        val firstMonth = first.withDayOfMonth(1)
        val months = ChronoUnit.MONTHS.between(firstMonth, today.withDayOfMonth(1)).toInt() + 1
        IntArray(months).also { monthly -> past.forEach { monthly[ChronoUnit.MONTHS.between(firstMonth, it.withDayOfMonth(1)).toInt()]++ } }
    }
    val recentStart = today.minusDays(AllTimeRecentDays - 1)
    val recent = past.count { !it.isBefore(recentStart) }
    val since = if (past.isEmpty()) "All time" else "Since ${first.format(monthYear)}"
    return RangeTrend(
        records = records,
        points = points.toList(),
        deltaText = "+$recent",
        deltaUp = true,
        caption = "$since · +$recent in the last $AllTimeRecentDays days"
    )
}

private const val EntranceWaitMs = 1_200L
private const val SectionEnterMs = 350
private const val StaggerMs = 50
private const val EntranceSections = 6
private const val EntranceMs = SectionEnterMs + (EntranceSections - 1) * StaggerMs
private val EmphasizedDecelerate = CubicBezierEasing(0.05f, 0.7f, 0.1f, 1f)

/** Section [index]'s share of the first-load [entrance]: rises 24dp and fades in, [StaggerMs] after the previous. */
private fun Modifier.enterStaggered(entrance: Animatable<Float, *>, index: Int): Modifier = graphicsLayer {
    val local = ((entrance.value * EntranceMs - index * StaggerMs) / SectionEnterMs).coerceIn(0f, 1f)
    val t = EmphasizedDecelerate.transform(local)
    alpha = t
    translationY = (1f - t) * 24.dp.toPx()
}

/** [value], counting up (or down) to each new value instead of jumping. */
@Composable
private fun countUp(value: Int): Int =
    animateIntAsState(value, tween(600, easing = EmphasizedDecelerate), label = "CountUp").value

private fun greeting(now: LocalTime = LocalTime.now()): String = when (now.hour) {
    in 0..11 -> "Good morning"
    in 12..16 -> "Good afternoon"
    else -> "Good evening"
}

@OptIn(ExperimentalMaterial3Api::class, ExperimentalMaterial3ExpressiveApi::class)
@Composable
fun DashboardScreen(
    dashboard: DashboardUi,
    sync: SyncUiState,
    isOnline: Boolean,
    onRefresh: () -> Unit,
    onRangeChange: (ServiceRange) -> Unit,
    operatorName: String,
    account: AccountActions,
    onSearch: () -> Unit,
    onOpenRecord: (ServiceRecord) -> Unit,
    onViewAllServices: () -> Unit,
    onOpenPendingJobs: () -> Unit,
    onOpenCompletedJobs: () -> Unit,
    onOpenVehicles: () -> Unit,
    onOpenInventory: () -> Unit,
    launchUpdates: List<LaunchUpdate> = emptyList(),
    onOpenUpdate: (LaunchUpdate) -> Unit = {},
    onDismissUpdate: (LaunchUpdate) -> Unit = {},
    scrollState: ScrollState = rememberScrollState()
) {
    val stats = dashboard.stats
    val today = remember { LocalDate.now() }
    val greeting = remember { greeting() }
    val cs = MaterialTheme.colorScheme
    val scrolled by remember(scrollState) { derivedStateOf { scrollState.value > 0 } }

    val titleAlpha = syncTitleAlpha(sync)

    // First-load entrance: the sections rise and fade in one after another, once per session. Waits
    // for the first data (briefly) so the numbers arrive with them instead of flashing zeros.
    var entered by rememberSaveable { mutableStateOf(false) }
    val entrance = remember { Animatable(if (entered) 1f else 0f) }
    val loading by rememberUpdatedState(dashboard.isLoading)
    LaunchedEffect(Unit) {
        if (entered) return@LaunchedEffect
        withTimeoutOrNull(EntranceWaitMs) { snapshotFlow { loading }.first { !it } }
        entrance.animateTo(1f, tween(EntranceMs, easing = LinearEasing))
        entered = true
    }

    Column(Modifier.fillMaxSize().background(cs.surface)) {
        LaluzSyncTopBar(sync = sync, scrolled = scrolled) {
            Text(
                "LaluZ Garage",
                style = MaterialTheme.typography.titleLarge,
                color = cs.onSurface,
                modifier = Modifier
                    .weight(1f)
                    .graphicsLayer { alpha = titleAlpha }
            )
            BarIconButton(LaluzIcons.Search, "Search", onSearch)
            OperatorAvatarButton(account)
        }
        OfflineBanner(visible = !isOnline)
        val pullState = rememberPullToRefreshState()
        // Same trick as the sync bar: the raw value (finger position, then the release animation)
        // is only a target, and a non-bouncy spring glides the visuals toward it so the loader and
        // content never jump with touch jitter.
        val pull by animateFloatAsState(
            targetValue = pullState.distanceFraction,
            animationSpec = MaterialTheme.motionScheme.slowEffectsSpec(),
            label = "pullFraction"
        )
        PullToRefreshBox(
            // The pull only gestures: once released, the content returns to the top and the pull
            // loader goes away; the top bar's sync pill is the single progress indicator.
            isRefreshing = false,
            onRefresh = onRefresh,
            // Clip so the loader slides in from the bar's lower edge instead of drawing over it.
            modifier = Modifier.fillMaxSize().clipToBounds(),
            state = pullState,
            indicator = {
                if (pull > 0.001f) {
                    androidx.compose.material3.LoadingIndicator(
                        // Half-rate so the morph/spin follows the finger gently.
                        progress = { pull * 0.5f },
                        modifier = Modifier
                            .align(Alignment.TopCenter)
                            .graphicsLayer {
                                // Ride the same offset as the content, sitting in the gap above it.
                                val travel = pull.coerceAtMost(1f) *
                                    PullToRefreshDefaults.PositionalThreshold.toPx()
                                translationY = travel - size.height
                            }
                    )
                }
            }
        ) {
            Column(
                modifier = Modifier
                    .fillMaxSize()
                    // Content follows the pull and springs back on release.
                    .graphicsLayer {
                        translationY = pull.coerceAtMost(1f) *
                            PullToRefreshDefaults.PositionalThreshold.toPx()
                    }
                    .verticalScroll(scrollState),
                horizontalAlignment = Alignment.CenterHorizontally
            ) {
                // Sections, shared by the phone column and the tablet columns.
                val greetingSection: @Composable () -> Unit = {
                    Column(Modifier.enterStaggered(entrance, 0)) {
                        Column(
                            Modifier.padding(horizontal = Spacing.xs),
                            verticalArrangement = Arrangement.spacedBy(Spacing.xxs)
                        ) {
                            Text(today.longLabel(), style = MaterialTheme.typography.bodyMedium, color = cs.onSurfaceVariant)
                            Text(
                                "$greeting, ${operatorName.substringBefore(' ')}",
                                style = MaterialTheme.typography.headlineMedium.copy(letterSpacing = (-0.25).sp),
                                color = cs.onSurface,
                                modifier = Modifier.semantics { heading() }
                            )
                        }
                        // Launch update cards sit between the greeting and the graph; the gap above
                        // them travels with the expand so nothing jumps when they arrive or go.
                        LaunchUpdateCards(launchUpdates, onOpenUpdate, onDismissUpdate)
                    }
                }
                val heroSection: @Composable () -> Unit = {
                    Box(Modifier.enterStaggered(entrance, 1)) {
                        HeroCard(stats = stats, range = dashboard.range, onRange = onRangeChange)
                    }
                }
                val statusSection: @Composable () -> Unit = {
                    Box(Modifier.enterStaggered(entrance, 2)) { StatusTiles(stats, onOpenPendingJobs, onOpenCompletedJobs) }
                }
                val attentionSection: @Composable () -> Unit = {
                    if (stats.attention.isNotEmpty()) {
                        Box(Modifier.enterStaggered(entrance, 3)) { NeedsAttention(stats, onOpenRecord) }
                    }
                }
                val totalsSection: @Composable () -> Unit = {
                    Box(Modifier.enterStaggered(entrance, 4)) { WorkshopTotals(stats, onOpenVehicles, onOpenInventory) }
                }
                val recentSection: @Composable () -> Unit = {
                    Box(Modifier.enterStaggered(entrance, 5)) {
                        RecentActivity(stats, onOpenRecord, onViewAllServices, isLoading = dashboard.isLoading)
                    }
                }
                val tablet = LocalAdaptive.current.isTablet
                if (!tablet) {
                    Column(
                        modifier = Modifier
                            .widthIn(max = MaxContentWidth)
                            .fillMaxWidth()
                            .padding(start = Spacing.md, end = Spacing.md, top = Spacing.xs, bottom = 168.dp),
                        verticalArrangement = Arrangement.spacedBy(Spacing.xl)
                    ) {
                        greetingSection()
                        heroSection()
                        statusSection()
                        attentionSection()
                        totalsSection()
                        recentSection()
                    }
                } else {
                    // Tablets: two columns once the content is wide enough (it narrows when a side sheet is open);
                    // otherwise one column that uses the full width.
                    BoxWithConstraints(Modifier.fillMaxWidth().sheetInsetPadding()) {
                        val gutter = Modifier.padding(start = Spacing.xl, end = Spacing.xl, top = Spacing.xs, bottom = Spacing.xl)
                        if (maxWidth >= 760.dp) {
                            Row(gutter.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(Spacing.xl)) {
                                Column(Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(Spacing.xl)) {
                                    greetingSection()
                                    heroSection()
                                    statusSection()
                                    totalsSection()
                                }
                                Column(Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(Spacing.xl)) {
                                    attentionSection()
                                    recentSection()
                                }
                            }
                        } else {
                            Column(gutter.fillMaxWidth(), verticalArrangement = Arrangement.spacedBy(Spacing.xl)) {
                                greetingSection()
                                heroSection()
                                statusSection()
                                attentionSection()
                                totalsSection()
                                recentSection()
                            }
                        }
                    }
                }
            }
        }
    }
}

// ---------------------------------------------------------------------------

private val UpdateEnterEasing = CubicBezierEasing(0.05f, 0.7f, 0.1f, 1f)

@Composable
private fun LaunchUpdateCards(
    updates: List<LaunchUpdate>,
    onOpen: (LaunchUpdate) -> Unit,
    onDismiss: (LaunchUpdate) -> Unit
) {
    Column(Modifier.animateContentSize(tween(350, easing = UpdateEnterEasing))) {
        // Each card stays composed through its exit; key keeps the right one animating out.
        listOf(ReleaseChannel.STABLE, ReleaseChannel.DEV).forEach { channel ->
            val current = updates.firstOrNull { it.channel == channel }
            val held = dev.appu.laluzgarage.ui.rememberLastNonNull(current)
            key(channel) {
                AnimatedVisibility(
                    visible = current != null,
                    enter = expandVertically(tween(450, easing = UpdateEnterEasing)) +
                        fadeIn(tween(300, delayMillis = 100)) +
                        androidx.compose.animation.slideInVertically(tween(450, easing = UpdateEnterEasing)) { -it / 3 },
                    exit = fadeOut(tween(150)) + shrinkVertically(tween(300, delayMillis = 60))
                ) {
                    if (held != null) {
                        LaunchUpdateCard(
                            update = held,
                            onOpen = { onOpen(held) },
                            onDismiss = { onDismiss(held) },
                            modifier = Modifier.padding(top = if (channel == ReleaseChannel.DEV && updates.any { it.channel == ReleaseChannel.STABLE }) Spacing.sm else Spacing.xl)
                        )
                    }
                }
            }
        }
    }
}

/**
 * New release found by the launch check: stable reads green, development yellow. The cookie turns
 * slowly behind a download arrow. Tap opens App Updates on that channel; x dismisses it.
 */
@Composable
private fun LaunchUpdateCard(update: LaunchUpdate, onOpen: () -> Unit, onDismiss: () -> Unit, modifier: Modifier = Modifier) {
    val cs = MaterialTheme.colorScheme
    val ext = LaluzTheme.extendedColors
    val dev = update.channel == ReleaseChannel.DEV
    val dark = cs.surface.luminance() < 0.5f
    val cookie = if (dev) ext.warningContainer else cs.primary
    val onCookie = if (dev) ext.onWarningContainer else cs.onPrimary
    val eyebrow = if (dev) ext.warning else cs.primary
    val tint = lerp(cs.surfaceContainerLow, if (dev) ext.warningContainer else cs.primary, if (dark) 0.12f else if (dev) 0.3f else 0.1f)
    val label = if (dev) "Development build" else "Stable update"
    Surface(
        onClick = onOpen,
        shape = RoundedCornerShape(24.dp),
        color = tint,
        contentColor = cs.onSurface,
        modifier = modifier
            .fillMaxWidth()
            .semantics { contentDescription = "$label: version ${update.release.version} is out. Opens App Updates." }
    ) {
        Row(verticalAlignment = Alignment.Top) {
            Row(
                Modifier
                    .weight(1f)
                    .padding(start = Spacing.md, top = Spacing.md, bottom = Spacing.md),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(Spacing.md)
            ) {
                SpinningCookieBadge(LaluzIcons.ArrowDownToLine, container = cookie, content = onCookie, size = 56.dp)
                Column(Modifier.weight(1f).clearAndSetSemantics { }, verticalArrangement = Arrangement.spacedBy(2.dp)) {
                    Text(label.uppercase(), style = MaterialTheme.typography.labelMedium.copy(fontWeight = FontWeight.Bold, letterSpacing = 0.4.sp), color = eyebrow)
                    Text("Version ${update.release.version} is out", style = MaterialTheme.typography.titleMedium.copy(fontWeight = FontWeight.Bold), color = cs.onSurface)
                    Text("Tap to see what's new and install.", style = MaterialTheme.typography.bodyMedium, color = cs.onSurfaceVariant)
                }
            }
            IconButton(onClick = onDismiss, modifier = Modifier.padding(top = Spacing.xxs, end = Spacing.xxs)) {
                Icon(LaluzIcons.Close, contentDescription = "Dismiss ${label.lowercase()}", tint = cs.onSurfaceVariant, modifier = Modifier.size(20.dp))
            }
        }
    }
}

// ---------------------------------------------------------------------------

/** Pinned under the top bar while there's no internet; the dashboard keeps showing cached data. */
@Composable
private fun OfflineBanner(visible: Boolean) {
    val cs = MaterialTheme.colorScheme
    val motion = MaterialTheme.motionScheme
    AnimatedVisibility(
        visible = visible,
        enter = expandVertically(motion.defaultSpatialSpec()) + fadeIn(motion.defaultEffectsSpec()),
        exit = shrinkVertically(motion.defaultSpatialSpec()) + fadeOut(motion.fastEffectsSpec())
    ) {
        Box(Modifier.fillMaxWidth(), contentAlignment = Alignment.Center) {
            Row(
                modifier = Modifier
                    .widthIn(max = MaxContentWidth)
                    .fillMaxWidth()
                    .padding(start = Spacing.md, end = Spacing.md, bottom = Spacing.xs)
                    .clip(LaluzShape.card)
                    .background(cs.errorContainer)
                    .padding(horizontal = Spacing.md, vertical = Spacing.sm)
                    .semantics { liveRegion = LiveRegionMode.Polite },
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(Spacing.sm)
            ) {
                Icon(LaluzIcons.Warning, contentDescription = null, tint = cs.onErrorContainer, modifier = Modifier.size(20.dp))
                Column(verticalArrangement = Arrangement.spacedBy(Spacing.xxs)) {
                    Text("You're offline", style = MaterialTheme.typography.titleSmall, color = cs.onErrorContainer)
                    Text(
                        "Showing saved data. Changes will sync when you reconnect.",
                        style = MaterialTheme.typography.bodySmall,
                        color = cs.onErrorContainer
                    )
                }
            }
        }
    }
}

@Composable
private fun HeroCard(stats: DashboardStats, range: ServiceRange, onRange: (ServiceRange) -> Unit) {
    val ext = LaluzTheme.extendedColors
    CompositionLocalProvider(LocalContentColor provides ext.onHero) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .clip(LaluzShape.hero)
                .background(Brush.verticalGradient(listOf(ext.heroTop, ext.heroBottom)))
                .padding(start = Spacing.xl, end = Spacing.xl, top = Spacing.xl, bottom = Spacing.md)
                .semantics(mergeDescendants = false) { contentDescription = "Total services" },
            verticalArrangement = Arrangement.spacedBy(Spacing.md)
        ) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Text("Total services", style = MaterialTheme.typography.labelLarge, color = ext.onHero, modifier = Modifier.weight(1f))
                ConnectedSegments(
                    options = ServiceRange.entries,
                    selected = range,
                    onSelect = onRange,
                    label = { it.label },
                    colors = {
                        SegmentColors(
                            selectedContainer = ext.onHero,
                            selectedContent = ext.heroBottom,
                            container = ext.onHero.copy(alpha = 0.14f),
                            content = ext.onHero
                        )
                    },
                    height = 40.dp
                )
            }
            // Fade through on a range switch (M3: the content is different, not a sibling screen).
            // Keyed by range, so a data refresh updates in place instead of cross-fading.
            AnimatedContent(
                targetState = range to stats,
                contentKey = { it.first },
                transitionSpec = {
                    (fadeIn(tween(210, delayMillis = 90)) + scaleIn(tween(210, delayMillis = 90), initialScale = 0.96f)) togetherWith
                        fadeOut(tween(90))
                },
                label = "HeroRange"
            ) { (_, shown) ->
                Column(verticalArrangement = Arrangement.spacedBy(Spacing.md)) {
                    Row(verticalAlignment = Alignment.Bottom, horizontalArrangement = Arrangement.spacedBy(Spacing.sm)) {
                        Text(countUp(shown.total).toString(), style = MaterialTheme.typography.displayLarge, color = ext.onHero)
                        Row(
                            modifier = Modifier
                                .padding(bottom = Spacing.sm)
                                .height(32.dp)
                                .clip(CircleShape)
                                .background(ext.onHero)
                                .padding(horizontal = Spacing.sm),
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(Spacing.xxs)
                        ) {
                            Icon(
                                LaluzIcons.ArrowUpRight,
                                contentDescription = null,
                                tint = ext.heroBottom,
                                modifier = Modifier
                                    .size(16.dp)
                                    .rotate(if (shown.deltaUp) 0f else 90f)
                            )
                            Text(
                                shown.deltaText,
                                style = MaterialTheme.typography.labelLarge.copy(fontWeight = FontWeight.Bold),
                                color = ext.heroBottom
                            )
                        }
                    }
                    Sparkline(
                        values = shown.daily,
                        color = ext.heroLine,
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(88.dp)
                            .clearAndSetSemantics { contentDescription = "Services per day, ${shown.caption}" }
                    )
                    Text(
                        shown.caption,
                        style = MaterialTheme.typography.bodySmall,
                        color = ext.onHero.copy(alpha = 0.8f)
                    )
                }
            }
        }
    }
}

/**
 * Smooth area sparkline on the artboard's 300×72 grid (6dp inset, 60 tall), stretched to the box;
 * 3.5dp stroke that doesn't scale, gradient fill from 32% to 0%.
 */
@Composable
private fun Sparkline(values: List<Int>, color: Color, modifier: Modifier = Modifier) {
    Canvas(modifier) {
        if (values.size < 2) return@Canvas
        val sx = size.width / 300f
        val sy = size.height / 72f
        val max = values.max().toFloat()
        val min = values.min().toFloat()
        val span = (max - min).coerceAtLeast(1f)
        val pts = values.mapIndexed { i, v ->
            val x = i * 300f / (values.size - 1)
            val y = 6f + 60f - ((v - min) / span) * 60f
            x * sx to y * sy
        }
        val line = Path().apply {
            moveTo(pts[0].first, pts[0].second)
            for (i in 1 until pts.size) {
                val (x0, y0) = pts[i - 1]
                val (x1, y1) = pts[i]
                val mx = (x0 + x1) / 2f
                cubicTo(mx, y0, mx, y1, x1, y1)
            }
        }
        val area = Path().apply {
            addPath(line)
            lineTo(size.width, size.height)
            lineTo(0f, size.height)
            close()
        }
        drawPath(area, Brush.verticalGradient(listOf(color.copy(alpha = 0.32f), color.copy(alpha = 0f))))
        drawPath(line, color, style = Stroke(width = 3.5.dp.toPx(), cap = StrokeCap.Round, join = StrokeJoin.Round))
    }
}

@Composable
private fun StatusTiles(stats: DashboardStats, onPending: () -> Unit, onCompleted: () -> Unit) {
    val cs = MaterialTheme.colorScheme
    val ext = LaluzTheme.extendedColors
    val open = stats.pending + stats.inProgress
    Row(horizontalArrangement = Arrangement.spacedBy(Spacing.xs)) {
        StatTile(
            value = countUp(open).toString(),
            label = "Open jobs",
            onClick = onPending,
            modifier = Modifier.weight(1f),
            badge = {
                Box(Modifier.size(48.dp), contentAlignment = Alignment.Center) {
                    Box(Modifier.size(48.dp).clip(CookieShape).background(ext.warningContainer))
                    Icon(LaluzIcons.Clock, contentDescription = null, tint = ext.onWarningContainer, modifier = Modifier.size(24.dp))
                }
            }
        ) {
            Column(
                verticalArrangement = Arrangement.spacedBy(Spacing.xs),
                modifier = Modifier.clearAndSetSemantics {
                    contentDescription = "${stats.pending} pending, ${stats.inProgress} in progress"
                }
            ) {
                Row(Modifier.fillMaxWidth().height(8.dp), horizontalArrangement = Arrangement.spacedBy(2.dp)) {
                    val p by animateFloatAsState(stats.pending.coerceAtLeast(0).toFloat(), tween(600, easing = CubicBezierEasing(0.2f, 0f, 0f, 1f)), label = "pendingWeight")
                    val ip by animateFloatAsState(stats.inProgress.coerceAtLeast(0).toFloat(), tween(600, easing = CubicBezierEasing(0.2f, 0f, 0f, 1f)), label = "inBayWeight")
                    val hasP = p > 0.001f
                    val hasIp = ip > 0.001f
                    if (!hasP && !hasIp) {
                        Box(Modifier.fillMaxSize().clip(RoundedCornerShape(4.dp)).background(cs.surfaceContainerHighest))
                    } else {
                        if (hasP) Box(
                            Modifier.weight(p).fillMaxHeight()
                                .clip(RoundedCornerShape(topStart = 4.dp, bottomStart = 4.dp, topEnd = if (hasIp) 2.dp else 4.dp, bottomEnd = if (hasIp) 2.dp else 4.dp))
                                .background(ext.warning)
                        )
                        if (hasIp) Box(
                            Modifier.weight(ip).fillMaxHeight()
                                .clip(RoundedCornerShape(topEnd = 4.dp, bottomEnd = 4.dp, topStart = if (hasP) 2.dp else 4.dp, bottomStart = if (hasP) 2.dp else 4.dp))
                                .background(cs.tertiary)
                        )
                    }
                }
                Row {
                    Text("${stats.pending} pending", style = MaterialTheme.typography.bodySmall, color = cs.onSurfaceVariant, modifier = Modifier.weight(1f))
                    Text("${stats.inProgress} in bay", style = MaterialTheme.typography.bodySmall, color = cs.onSurfaceVariant)
                }
            }
        }
        StatTile(
            value = countUp(stats.completedInRange).toString(),
            label = "Delivered",
            onClick = onCompleted,
            modifier = Modifier.weight(1f),
            badge = {
                Box(Modifier.size(48.dp), contentAlignment = Alignment.Center) {
                    Box(Modifier.size(44.dp).clip(CircleShape).background(cs.primaryContainer))
                    Icon(LaluzIcons.Check, contentDescription = null, tint = cs.onPrimaryContainer, modifier = Modifier.size(24.dp))
                }
            }
        ) {
            Column(verticalArrangement = Arrangement.spacedBy(Spacing.xs)) {
                val share by animateFloatAsState(
                    (stats.completedShare / 100f).coerceIn(0f, 1f),
                    tween(600, easing = CubicBezierEasing(0.2f, 0f, 0f, 1f)),
                    label = "completedShare"
                )
                Box(
                    Modifier.fillMaxWidth().height(8.dp).clip(RoundedCornerShape(4.dp)).background(cs.surfaceContainerHighest)
                ) {
                    Box(
                        Modifier.fillMaxHeight()
                            .fillMaxWidth(share)
                            .clip(RoundedCornerShape(4.dp))
                            .background(cs.primary)
                    )
                }
                Text("${stats.completedShare}% of jobs this period", style = MaterialTheme.typography.bodySmall, color = cs.onSurfaceVariant)
            }
        }
    }
}

@Composable
private fun StatTile(
    value: String,
    label: String,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
    badge: @Composable () -> Unit,
    footer: @Composable () -> Unit
) {
    val cs = MaterialTheme.colorScheme
    Column(
        modifier = modifier
            .clip(LaluzShape.card)
            .background(cs.surfaceContainerLow)
            .clickable(role = Role.Button, onClick = onClick)
            .padding(Spacing.md),
        verticalArrangement = Arrangement.spacedBy(Spacing.md)
    ) {
        badge()
        Column {
            Text(value, style = MaterialTheme.typography.displaySmall, color = cs.onSurface)
            Text(label, style = MaterialTheme.typography.labelLarge, color = cs.onSurfaceVariant)
        }
        footer()
    }
}

@Composable
private fun SectionHeader(title: String, trailing: @Composable () -> Unit) {
    Row(
        modifier = Modifier.fillMaxWidth().padding(horizontal = Spacing.xs),
        verticalAlignment = Alignment.CenterVertically
    ) {
        Text(
            title,
            style = MaterialTheme.typography.titleLarge,
            color = MaterialTheme.colorScheme.onSurface,
            modifier = Modifier.weight(1f).semantics { heading() }
        )
        trailing()
    }
}

@Composable
private fun NeedsAttention(stats: DashboardStats, onOpenRecord: (ServiceRecord) -> Unit) {
    val cs = MaterialTheme.colorScheme
    val container = LocalContainerTransform.current
    Column(verticalArrangement = Arrangement.spacedBy(Spacing.xs)) {
        SectionHeader("Needs attention") {
            if (stats.overdueCount > 0) StatusChip("${stats.overdueCount} overdue", ChipTone.OVERDUE)
        }
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .horizontalScroll(rememberScrollState())
                .padding(bottom = Spacing.xxs),
            horizontalArrangement = Arrangement.spacedBy(Spacing.xs)
        ) {
            stats.attention.forEach { a ->
                val source = rememberContainerSource()
                Column(
                    modifier = Modifier
                        .width(240.dp)
                        .containerSource(source, Radius.xl)
                        .clip(LaluzShape.card)
                        .background(cs.surfaceContainerLow)
                        .clickable(role = Role.Button) { container.from("job:${a.record.id}", source); onOpenRecord(a.record) }
                        .padding(Spacing.md),
                    verticalArrangement = Arrangement.spacedBy(Spacing.sm)
                ) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Text(
                            a.plate,
                            style = dev.appu.laluzgarage.ui.theme.LaluzType.plateSmall,
                            color = cs.onSurface,
                            modifier = Modifier.weight(1f),
                            maxLines = 1,
                            overflow = TextOverflow.Ellipsis
                        )
                        Spacer(Modifier.width(Spacing.xs))
                        StatusChip(a.flag, if (a.overdue) ChipTone.OVERDUE else ChipTone.PENDING)
                    }
                    Column {
                        Text(a.vehicle, style = MaterialTheme.typography.titleMedium, color = cs.onSurface, maxLines = 1, overflow = TextOverflow.Ellipsis)
                        Text(
                            "${a.customer} · ${a.total}",
                            style = MaterialTheme.typography.bodyMedium,
                            color = cs.onSurfaceVariant,
                            maxLines = 1,
                            overflow = TextOverflow.Ellipsis
                        )
                    }
                }
            }
        }
    }
}

@Composable
private fun WorkshopTotals(stats: DashboardStats, onOpenVehicles: () -> Unit, onOpenInventory: () -> Unit) {
    val cs = MaterialTheme.colorScheme
    val ext = LaluzTheme.extendedColors
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .clip(LaluzShape.card)
            .semantics { contentDescription = "Workshop totals" },
        verticalArrangement = Arrangement.spacedBy(2.dp)
    ) {
        Row(horizontalArrangement = Arrangement.spacedBy(2.dp)) {
            TotalCell(LaluzIcons.CarSimple, countUp(stats.vehicles).toString(), "Vehicles", cs.surfaceContainerHigh, cs.onSurfaceVariant, null, onOpenVehicles, Modifier.weight(1f))
            TotalCell(LaluzIcons.Users, countUp(stats.customers).toString(), "Customers", cs.surfaceContainerHigh, cs.onSurfaceVariant, null, null, Modifier.weight(1f))
        }
        Row(horizontalArrangement = Arrangement.spacedBy(2.dp)) {
            TotalCell(LaluzIcons.Wrench, countUp(stats.partsFitted).toString(), "Parts fitted", cs.surfaceContainerHigh, cs.onSurfaceVariant, null, null, Modifier.weight(1f))
            TotalCell(
                LaluzIcons.Warning,
                "${countUp(stats.lowStock)} ${if (stats.lowStock == 1) "part" else "parts"}",
                "Low stock",
                ext.warningContainer,
                ext.onWarningContainer,
                if (stats.lowStock > 0) ext.warning else null,
                onOpenInventory,
                Modifier.weight(1f)
            )
        }
    }
}

@Composable
private fun TotalCell(
    icon: androidx.compose.ui.graphics.vector.ImageVector,
    value: String,
    label: String,
    tile: Color,
    tileContent: Color,
    valueColor: Color?,
    onClick: (() -> Unit)?,
    modifier: Modifier = Modifier
) {
    val cs = MaterialTheme.colorScheme
    Row(
        modifier = modifier
            .heightIn(min = 72.dp)
            .background(cs.surfaceContainerLow)
            .then(if (onClick != null) Modifier.clickable(role = Role.Button, onClick = onClick) else Modifier)
            .padding(horizontal = Spacing.md, vertical = Spacing.sm),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(Spacing.sm)
    ) {
        IconTile(icon, tile, tileContent)
        Column {
            Text(value, style = MaterialTheme.typography.titleLarge, color = valueColor ?: cs.onSurface, maxLines = 1)
            Text(label, style = MaterialTheme.typography.bodySmall, color = cs.onSurfaceVariant)
        }
    }
}

@Composable
private fun RecentActivity(
    stats: DashboardStats,
    onOpenRecord: (ServiceRecord) -> Unit,
    onViewAll: () -> Unit,
    isLoading: Boolean
) {
    val cs = MaterialTheme.colorScheme
    val container = LocalContainerTransform.current
    Column(verticalArrangement = Arrangement.spacedBy(Spacing.xs)) {
        SectionHeader("Recent activity") {
            LaluzTextButton("View all", onViewAll, modifier = Modifier.bleedEnd(Spacing.sm))
        }
        if (stats.recent.isEmpty()) {
            Text(
                if (isLoading) "Loading jobs…" else "No jobs yet. Tap + to add a new intake.",
                style = MaterialTheme.typography.bodyMedium,
                color = cs.onSurfaceVariant,
                modifier = Modifier.padding(horizontal = Spacing.xs, vertical = Spacing.md)
            )
        }
        Column(verticalArrangement = Arrangement.spacedBy(2.dp)) {
            stats.recent.forEachIndexed { i, r ->
                val first = i == 0
                val last = i == stats.recent.lastIndex
                val big = 20.dp
                val small = 4.dp
                val shape = RoundedCornerShape(
                    topStart = if (first) big else small, topEnd = if (first) big else small,
                    bottomStart = if (last) big else small, bottomEnd = if (last) big else small
                )
                val source = rememberContainerSource()
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .heightIn(min = 72.dp)
                        .containerSource(source, small)
                        .clip(shape)
                        .background(cs.surfaceContainerLow)
                        .clickable(role = Role.Button) { container.from("job:${r.record.id}", source); onOpenRecord(r.record) }
                        .padding(horizontal = Spacing.md, vertical = Spacing.xs),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(Spacing.md)
                ) {
                    IconTile(LaluzIcons.Car, cs.surfaceContainerHigh, cs.onSurfaceVariant, iconSize = 24.dp)
                    Column(Modifier.weight(1f)) {
                        Text(r.vehicle, style = MaterialTheme.typography.titleMedium, color = cs.onSurface, maxLines = 1, overflow = TextOverflow.Ellipsis)
                        Text(
                            buildAnnotatedString {
                                withStyle(SpanStyle(fontFamily = JetBrainsMono, fontWeight = FontWeight.Bold)) { append(r.plate) }
                                append(" · ")
                                append(r.customer)
                            },
                            style = MaterialTheme.typography.bodyMedium,
                            color = cs.onSurfaceVariant,
                            maxLines = 1,
                            overflow = TextOverflow.Ellipsis
                        )
                    }
                    Column(horizontalAlignment = Alignment.End, verticalArrangement = Arrangement.spacedBy(Spacing.xxs)) {
                        StatusChip(r.status.label, r.status.tone)
                        Text(r.date, style = MaterialTheme.typography.bodySmall, color = cs.onSurfaceVariant)
                    }
                }
            }
        }
    }
}
