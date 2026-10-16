package dev.appu.laluzgarage.ui.services

import dev.appu.laluzgarage.ui.theme.Radius
import dev.appu.laluzgarage.ui.components.rememberContainerSource
import dev.appu.laluzgarage.ui.components.containerSource
import dev.appu.laluzgarage.ui.components.LocalContainerTransform
import dev.appu.laluzgarage.ui.components.TopBarTitleSearch
import dev.appu.laluzgarage.ui.components.rememberHeaderScrolledAway
import dev.appu.laluzgarage.ui.components.syncTitleAlpha
import dev.appu.laluzgarage.ui.components.ScreenHeader
import dev.appu.laluzgarage.ui.components.PinnedBand
import androidx.compose.foundation.BorderStroke
import androidx.compose.animation.AnimatedVisibility
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.material3.SnackbarHost
import androidx.compose.material3.SnackbarHostState
import androidx.compose.ui.semantics.stateDescription
import androidx.compose.ui.text.SpanStyle
import androidx.compose.ui.text.buildAnnotatedString
import androidx.compose.ui.text.withStyle
import dev.appu.laluzgarage.ui.components.LaluzConfirmDialog
import dev.appu.laluzgarage.ui.theme.GoogleSansFlex
import androidx.compose.ui.unit.sp
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.imePadding
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyListState
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.lazy.rememberLazyListState
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.Immutable
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.draw.clip
import androidx.compose.ui.focus.FocusRequester
import androidx.compose.ui.focus.focusRequester
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.graphics.drawscope.clipRect
import androidx.compose.ui.semantics.clearAndSetSemantics
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.heading
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import dev.appu.laluzgarage.data.sync.SyncUiState
import dev.appu.laluzgarage.data.model.ServiceRecord
import dev.appu.laluzgarage.ui.components.AccountActions
import dev.appu.laluzgarage.ui.components.ChipTone
import dev.appu.laluzgarage.ui.components.DetailField
import dev.appu.laluzgarage.ui.components.LaluzIcons
import dev.appu.laluzgarage.ui.components.LaluzSearchField
import dev.appu.laluzgarage.ui.components.LaluzTextButton
import dev.appu.laluzgarage.ui.components.LaluzSyncTopBar
import dev.appu.laluzgarage.ui.components.MaxContentWidth
import dev.appu.laluzgarage.ui.components.OperatorAvatarButton
import dev.appu.laluzgarage.ui.components.PinBadge
import dev.appu.laluzgarage.ui.components.StatusChip
import dev.appu.laluzgarage.ui.theme.LaluzShape
import dev.appu.laluzgarage.ui.theme.LaluzTheme
import dev.appu.laluzgarage.ui.theme.LaluzType
import dev.appu.laluzgarage.ui.theme.Spacing
import java.time.LocalDate

/** Filter chips, in order. Keys match ServiceUiState.selectedStatusFilter. */
private val FilterDefs = listOf(
    "all" to "All",
    JobStatus.PENDING.value to "Pending",
    JobStatus.IN_PROGRESS.value to "In progress",
    JobStatus.COMPLETED.value to "Delivered"
)

@Composable
fun ServicesScreen(
    list: ServicesListUi,
    sync: SyncUiState,
    searchQuery: String,
    selectedStatusFilter: String,
    account: AccountActions,
    onStatusFilterChange: (String) -> Unit,
    onSearchQueryChange: (String) -> Unit,
    onToggleSortOrder: () -> Unit,
    onOpenRecord: (ServiceRecord) -> Unit,
    onToggleCompact: () -> Unit = {},
    onDateRangeChange: (LocalDate?, LocalDate?) -> Unit = { _, _ -> },
    onEditRecord: (ServiceRecord) -> Unit = {},
    onDeleteRecord: (ServiceRecord) -> Unit = {},
    message: String? = null,
    onMessageShown: () -> Unit = {},
    focusSearch: Boolean = false,
    onSearchFocused: () -> Unit = {},
    listState: LazyListState = rememberLazyListState()
) {
    val cs = MaterialTheme.colorScheme
    // Search text and filter chips read the live state so they respond instantly; the list
    // itself is filtered off the main thread and arrives in [list].
    val cards = list.cards
    val newestFirst = list.newestFirst
    val groups = remember(cards) { groupByArrivalDay(cards, LocalDate.now()) }
    val compact = list.compact
    // Expanded task lists, by record id. Kept across scrolling, reset when the tab is left.
    var openIds by rememberSaveable { mutableStateOf(emptySet<String>()) }
    var toDelete by remember { mutableStateOf<JobCardModel?>(null) }
    var showDatePicker by remember { mutableStateOf(false) }
    val snackbar = remember { SnackbarHostState() }
    val container = LocalContainerTransform.current
    androidx.compose.runtime.LaunchedEffect(message) {
        if (message != null) {
            snackbar.showSnackbar(message)
            onMessageShown()
        }
    }

    val searchFocus = remember { FocusRequester() }
    androidx.compose.runtime.LaunchedEffect(focusSearch) {
        if (focusSearch) {
            listState.scrollToItem(0)
            runCatching { searchFocus.requestFocus() }
            onSearchFocused()
        }
    }

    Box(Modifier.fillMaxSize()) {
    Column(Modifier.fillMaxSize().background(cs.surface)) {
        LaluzSyncTopBar(sync = sync, scrolled = listState.canScrollBackward) {
            TopBarTitleSearch(
                title = "Services",
                summary = list.summary,
                headerGone = rememberHeaderScrolledAway(listState),
                query = searchQuery,
                onQueryChange = onSearchQueryChange,
                placeholder = "Search plate, customer or phone",
                titleAlpha = syncTitleAlpha(sync)
            )
            OperatorAvatarButton(account)
        }
        LazyColumn(
            state = listState,
            // Shrinks above the keyboard while searching, so the last rows can still be scrolled to.
            modifier = Modifier.fillMaxSize().imePadding(),
            horizontalAlignment = Alignment.CenterHorizontally,
            contentPadding = PaddingValues(bottom = 168.dp)
        ) {
            // Title and search scroll away; the filters stay pinned under the top bar, which takes over the title.
            item(key = "title", contentType = "title") {
                ScreenHeader("Services", list.summary, Modifier.widthIn(max = MaxContentWidth).fillMaxWidth())
            }
            item(key = "search", contentType = "search") {
                LaluzSearchField(
                    value = searchQuery,
                    onValueChange = onSearchQueryChange,
                    placeholder = "Search plate, customer or phone",
                    onClear = { onSearchQueryChange("") },
                    modifier = Modifier
                        .widthIn(max = MaxContentWidth)
                        .fillMaxWidth()
                        .padding(horizontal = Spacing.md)
                        .focusRequester(searchFocus)
                )
            }
            stickyHeader(key = "filters", contentType = "filters") {
                PinnedBand {
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .horizontalScroll(rememberScrollState())
                            .padding(start = Spacing.md, end = Spacing.md, top = Spacing.md)
                            .semantics { contentDescription = "Filter by status" },
                        horizontalArrangement = Arrangement.spacedBy(Spacing.xs)
                    ) {
                        FilterDefs.forEach { (key, label) ->
                            StatusFilterChip(
                                label = label,
                                tone = key,
                                count = list.counts[key] ?: 0,
                                selected = selectedStatusFilter == key,
                                onClick = { onStatusFilterChange(key) }
                            )
                        }
                    }
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(start = Spacing.xl, end = Spacing.xs, top = Spacing.xs),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        // Active date filter badge; tap to clear.
                        Box(Modifier.weight(1f)) {
                            list.dateFrom?.let { DateRangeChip(it, list.dateTo, onClear = { onDateRangeChange(null, null) }) }
                        }
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            LaluzTextButton(
                                text = if (compact) "Compact" else "Detailed",
                                onClick = onToggleCompact,
                                contentDescription = if (compact) "Showing compact cards. Switch to detailed cards"
                                else "Showing detailed cards. Switch to compact cards"
                            )
                            ToolbarIconButton(
                                icon = LaluzIcons.Calendar,
                                description = "Filter by arrival date",
                                active = showDatePicker || list.dateFrom != null,
                                onClick = { showDatePicker = !showDatePicker }
                            )
                            ToolbarIconButton(
                                icon = if (newestFirst) LaluzIcons.ArrowDown else LaluzIcons.ArrowUp,
                                description = if (newestFirst) "Sorted newest first by arrival. Switch to oldest first"
                                else "Sorted oldest first by arrival. Switch to newest first",
                                active = false,
                                onClick = onToggleSortOrder
                            )
                            if (showDatePicker) {
                                DateRangePopup(
                                    from = list.dateFrom,
                                    to = list.dateTo,
                                    onChange = onDateRangeChange,
                                    onDismiss = { showDatePicker = false }
                                )
                            }
                        }
                    }
                }
            }
            groups.forEach { group ->
                item(key = "day-${group.key}", contentType = "day") {
                    DayHeader(
                        group.label,
                        Modifier.widthIn(max = MaxContentWidth).fillMaxWidth(),
                        emphasized = compact
                    )
                }
                items(group.cards, key = { it.record.id }, contentType = { "job" }) { card ->
                    val id = card.record.id
                    val source = rememberContainerSource()
                    JobCard(
                        card = card,
                        compact = compact,
                        tasksOpen = id in openIds,
                        onToggleTasks = { openIds = if (id in openIds) openIds - id else openIds + id },
                        onClick = { container.from("job:$id", source); onOpenRecord(card.record) },
                        onEdit = { onEditRecord(card.record) },
                        onDelete = { toDelete = card },
                        modifier = Modifier
                            .widthIn(max = MaxContentWidth)
                            .fillMaxWidth()
                            .padding(start = Spacing.md, end = Spacing.md, bottom = Spacing.xs)
                            .containerSource(source, Radius.xl)
                    )
                }
            }
            if (cards.isEmpty()) {
                item(key = "empty", contentType = "empty") {
                    Text(
                        when {
                            list.isLoading -> "Loading jobs…"
                            list.query.isNotBlank() -> "No jobs match “${list.query.trim()}”."
                            list.dateFrom != null -> "No jobs arrived in this date range."
                            else -> "No jobs with this status."
                        },
                        style = MaterialTheme.typography.bodyMedium,
                        color = cs.onSurfaceVariant,
                        textAlign = TextAlign.Center,
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(horizontal = Spacing.xl, vertical = 48.dp)
                    )
                }
            }
        }
    }
        SnackbarHost(
            snackbar,
            modifier = Modifier
                .align(Alignment.BottomCenter)
                .navigationBarsPadding()
                .padding(bottom = 104.dp)
        )
    }

    toDelete?.let { card ->
        LaluzConfirmDialog(
            title = "Delete job card?",
            lead = {
                Text(
                    buildAnnotatedString {
                        withStyle(SpanStyle(fontFamily = GoogleSansFlex, fontWeight = FontWeight.Bold, letterSpacing = 1.sp, color = cs.onSurface)) { append(card.plate) }
                        append(" · " + card.customer)
                    },
                    style = MaterialTheme.typography.bodyMedium,
                    color = cs.onSurfaceVariant
                )
            },
            body = "This job card and its tasks are permanently deleted. This can’t be undone.",
            confirmText = "Delete",
            dismissText = "Cancel",
            onConfirm = { toDelete = null; onDeleteRecord(card.record) },
            onDismiss = { toDelete = null }
        )
    }
}

@Immutable
private class DayGroup(val key: String, val label: String, val cards: List<JobCardModel>)

/** Consecutive cards sharing an arrival day, keeping the list's sort order. */
private fun groupByArrivalDay(cards: List<JobCardModel>, today: LocalDate): List<DayGroup> {
    val out = ArrayList<DayGroup>()
    var key: String? = null
    var bucket = ArrayList<JobCardModel>()
    var label = ""
    fun flush() { key?.let { out += DayGroup(it, label, bucket) } }
    cards.forEach { card ->
        val d = card.arrivedDate
        val k = d?.toString() ?: "undated"
        if (k != key) {
            flush()
            key = k
            bucket = ArrayList()
            label = when (d) {
                null -> "No date"
                today -> "Today · " + d.shortLabel()
                today.minusDays(1) -> "Yesterday · " + d.shortLabel()
                else -> d.weekdayLabel()
            }
        }
        bucket += card
    }
    flush()
    return out
}

/** Day header: centred label flanked by hand-drawn wavy rules that fill the row on both sides. */
@Composable
private fun DayHeader(label: String, modifier: Modifier = Modifier, emphasized: Boolean = false) {
    val cs = MaterialTheme.colorScheme
    Row(
        modifier = modifier.padding(horizontal = Spacing.md).padding(top = Spacing.md, bottom = Spacing.xs),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(Spacing.sm)
    ) {
        DayRule(cs.onSurfaceVariant, Modifier.weight(1f))
        Text(
            label,
            style = MaterialTheme.typography.labelLarge,
            // Compact cards carry less, so the day label steps up to onSurface.
            color = if (emphasized) cs.onSurface else cs.onSurfaceVariant,
            modifier = Modifier.semantics { heading() }
        )
        DayRule(cs.onSurfaceVariant, Modifier.weight(1f))
    }
}

/** Wavy rule beside the day label: 10dp half-waves, 3dp amplitude, 1.5dp round stroke. */
@Composable
private fun DayRule(color: Color, modifier: Modifier = Modifier) {
    Canvas(modifier.height(12.dp).clearAndSetSemantics { }) {
        val wave = 10.dp.toPx()
        val amp = 3.dp.toPx()
        val mid = size.height / 2
        val path = Path().apply {
            moveTo(0f, mid)
            var x = 0f
            var up = true
            while (x < size.width) {
                quadraticTo(x + wave / 2, mid + if (up) -amp * 2 else amp * 2, x + wave, mid)
                x += wave
                up = !up
            }
        }
        clipRect { drawPath(path, color, style = Stroke(width = 1.5.dp.toPx(), cap = StrokeCap.Round)) }
    }
}

/**
 * Filter chip: 40dp, full shape. Selected = the status's own container (All: secondary, Pending:
 * warning, In progress: tertiary, Delivered: primary) with a check; unselected = 1dp outline.
 */
@Composable
private fun StatusFilterChip(label: String, tone: String, count: Int, selected: Boolean, onClick: () -> Unit) {
    val cs = MaterialTheme.colorScheme
    val ext = LaluzTheme.extendedColors
    val (container, content) = when (tone) {
        JobStatus.PENDING.value -> ext.warningContainer to ext.onWarningContainer
        JobStatus.IN_PROGRESS.value -> cs.tertiaryContainer to cs.onTertiaryContainer
        JobStatus.COMPLETED.value -> cs.primaryContainer to cs.onPrimaryContainer
        else -> cs.secondaryContainer to cs.onSecondaryContainer
    }
    Surface(
        selected = selected,
        onClick = onClick,
        shape = CircleShape,
        color = if (selected) container else Color.Transparent,
        contentColor = if (selected) content else cs.onSurfaceVariant,
        border = BorderStroke(1.dp, if (selected) container else cs.outline),
        modifier = Modifier.height(40.dp)
    ) {
        Row(
            modifier = Modifier.padding(start = if (selected) Spacing.sm else Spacing.md, end = Spacing.md),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(Spacing.xs)
        ) {
            if (selected) Icon(LaluzIcons.CheckBold, contentDescription = null, modifier = Modifier.size(18.dp))
            Text(label, style = MaterialTheme.typography.labelLarge)
            Text(
                count.toString(),
                style = LaluzType.labelTiny,
                modifier = Modifier.alpha(0.8f)
            )
        }
    }
}

/**
 * Job card. Detailed: plate, vehicle and status, customer and security, a View problems / Edit /
 * Delete row, the expandable problem list and the progress footer. Compact: plate, model and
 * status over the full problem list (no toggle).
 */
@Composable
private fun JobCard(
    card: JobCardModel,
    compact: Boolean,
    tasksOpen: Boolean,
    onToggleTasks: () -> Unit,
    onClick: () -> Unit,
    onEdit: () -> Unit,
    onDelete: () -> Unit,
    modifier: Modifier = Modifier
) {
    val cs = MaterialTheme.colorScheme
    val ext = LaluzTheme.extendedColors
    Surface(
        onClick = onClick,
        shape = LaluzShape.card,
        color = cs.surfaceContainerLow,
        contentColor = cs.onSurface,
        modifier = modifier
    ) {
        Column(
            Modifier.padding(Spacing.md),
            verticalArrangement = Arrangement.spacedBy(Spacing.sm)
        ) {
            Column(verticalArrangement = Arrangement.spacedBy(Spacing.md)) {
                Row(verticalAlignment = Alignment.Top) {
                    Column(Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(Spacing.xxs)) {
                        Text(card.plate, style = LaluzType.plateCard, color = cs.onSurface)
                        Text(if (compact) card.vehicleModel else card.vehicle, style = MaterialTheme.typography.bodyMedium, color = cs.onSurfaceVariant, maxLines = 1, overflow = TextOverflow.Ellipsis)
                    }
                    Spacer(Modifier.size(Spacing.xs))
                    Column(horizontalAlignment = Alignment.End, verticalArrangement = Arrangement.spacedBy(Spacing.xxs)) {
                        StatusChip(card.status.label, card.status.tone)
                        card.lateLabel?.let { StatusChip(it, ChipTone.OVERDUE) }
                    }
                }
                if (!compact) {
                    Column(verticalArrangement = Arrangement.spacedBy(Spacing.sm)) {
                        DetailField("Customer", value = card.customer, maxLines = 1)
                        DetailField("Security") {
                            when (val s = card.security) {
                                is VehicleSecurity.Pin -> PinBadge(s.value)
                                VehicleSecurity.PhysicalKey -> Text("Physical key", style = MaterialTheme.typography.titleMedium)
                                VehicleSecurity.Unknown -> Text("Not recorded", style = MaterialTheme.typography.titleMedium, color = cs.onSurfaceVariant)
                            }
                        }
                    }
                }
            }

            if (compact) {
                // Compact cards list every problem directly; there is no toggle.
                ProblemList(card.tasks, showTitle = false)
            } else {
                // Toggle and problem list share one slot: the gaps around the list live inside the
                // AnimatedVisibility so they collapse with it instead of snapping away when it leaves.
                Column {
                    Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(Spacing.xs)) {
                        Surface(
                            onClick = onToggleTasks,
                            shape = CircleShape,
                            color = if (tasksOpen) cs.surfaceContainerHighest else cs.surfaceContainerHigh,
                            contentColor = cs.onSurface,
                            modifier = Modifier
                                .weight(1f)
                                .height(48.dp)
                                .semantics { stateDescription = if (tasksOpen) "Expanded" else "Collapsed" }
                        ) {
                            Box(contentAlignment = Alignment.Center) {
                                Text(if (tasksOpen) "Hide problems" else "View problems", style = MaterialTheme.typography.labelLarge)
                            }
                        }
                        CardIconButton(LaluzIcons.Edit, "Edit job card ${card.plate}", cs.onSurface, onEdit)
                        CardIconButton(LaluzIcons.Trash, "Delete job card ${card.plate}", cs.error, onDelete)
                    }

                    AnimatedVisibility(tasksOpen) {
                        ProblemList(card.tasks, Modifier.padding(top = Spacing.sm))
                    }
                }
            }

            if (!compact) {
                Column {
                    HorizontalDivider(thickness = 1.dp, color = cs.outlineVariant)
                    Row(
                        modifier = Modifier.padding(top = Spacing.sm),
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(Spacing.sm)
                    ) {
                        if (card.status == JobStatus.COMPLETED || card.status == JobStatus.CANCELLED) {
                            Text(
                                if (card.status == JobStatus.COMPLETED) card.deliveredText else "Cancelled",
                                style = MaterialTheme.typography.bodySmall,
                                color = cs.onSurfaceVariant,
                                modifier = Modifier.weight(1f)
                            )
                        } else {
                            val barColor = if (card.status == JobStatus.PENDING) ext.warning else cs.tertiary
                            val fraction = if (card.tasksTotal == 0) 0f else card.tasksDone.toFloat() / card.tasksTotal
                            Row(
                                modifier = Modifier
                                    .weight(1f)
                                    .clearAndSetSemantics { contentDescription = "${card.tasksDone} of ${card.tasksTotal} tasks done" },
                                verticalAlignment = Alignment.CenterVertically,
                                horizontalArrangement = Arrangement.spacedBy(Spacing.xs)
                            ) {
                                Box(
                                    Modifier
                                        .weight(1f)
                                        .height(6.dp)
                                        .clip(RoundedCornerShape(3.dp))
                                        .background(cs.surfaceContainerHighest)
                                ) {
                                    Box(
                                        Modifier
                                            .fillMaxHeight()
                                            .fillMaxWidth(fraction)
                                            .clip(RoundedCornerShape(3.dp))
                                            .background(barColor)
                                    )
                                }
                                Text(
                                    "${card.tasksDone} of ${card.tasksTotal} tasks",
                                    style = MaterialTheme.typography.bodySmall,
                                    color = cs.onSurfaceVariant,
                                    maxLines = 1
                                )
                            }
                        }
                        Row(verticalAlignment = Alignment.Bottom, horizontalArrangement = Arrangement.spacedBy(Spacing.xxs)) {
                            if (card.totalLabel.isNotEmpty()) {
                                Text(card.totalLabel, style = MaterialTheme.typography.bodySmall, color = cs.onSurfaceVariant, modifier = Modifier.padding(bottom = 2.dp))
                            }
                            Text(card.total, style = MaterialTheme.typography.titleMedium.copy(fontWeight = FontWeight.Bold), color = cs.onSurface)
                        }
                    }
                }
            }
        }
    }
}

/** Problems & requests as a bulleted list (label, then one line per problem). */
@Composable
private fun ProblemList(tasks: List<String>, modifier: Modifier = Modifier, showTitle: Boolean = true) {
    val cs = MaterialTheme.colorScheme
    Column(modifier.semantics { contentDescription = "Problems and requests" }) {
        if (showTitle) {
            Text(
                "Problems & requests",
                style = MaterialTheme.typography.bodySmall,
                color = cs.onSurfaceVariant,
                modifier = Modifier.padding(bottom = Spacing.xxs)
            )
        }
        if (tasks.isEmpty()) {
            Text(
                "No problems recorded.",
                style = MaterialTheme.typography.bodyMedium,
                color = cs.onSurfaceVariant,
                modifier = Modifier.padding(vertical = Spacing.xxs)
            )
        }
        tasks.forEach { task ->
            Row(
                Modifier.padding(vertical = Spacing.xxs),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(Spacing.sm)
            ) {
                Box(
                    Modifier
                        .padding(horizontal = Spacing.xxs)
                        .size(5.dp)
                        .clip(CircleShape)
                        .background(cs.onSurfaceVariant)
                )
                Text(task, style = MaterialTheme.typography.bodyMedium, color = cs.onSurface)
            }
        }
    }
}

/** 48dp round icon button for the toolbar (date filter, sort); [active] tints the container. */
@Composable
private fun ToolbarIconButton(
    icon: androidx.compose.ui.graphics.vector.ImageVector,
    description: String,
    active: Boolean,
    onClick: () -> Unit
) {
    val cs = MaterialTheme.colorScheme
    Surface(
        onClick = onClick,
        shape = CircleShape,
        color = if (active) cs.surfaceContainerHigh else Color.Transparent,
        contentColor = cs.primary,
        modifier = Modifier
            .size(48.dp)
            .semantics { contentDescription = description }
    ) {
        Box(contentAlignment = Alignment.Center) {
            Icon(icon, contentDescription = null, modifier = Modifier.size(24.dp))
        }
    }
}

/** 48dp round icon button on surfaceContainerHigh (card Edit / Delete). */
@Composable
private fun CardIconButton(icon: androidx.compose.ui.graphics.vector.ImageVector, description: String, tint: Color, onClick: () -> Unit) {
    Surface(
        onClick = onClick,
        shape = CircleShape,
        color = MaterialTheme.colorScheme.surfaceContainerHigh,
        contentColor = tint,
        modifier = Modifier
            .size(48.dp)
            .semantics { contentDescription = description }
    ) {
        Box(contentAlignment = Alignment.Center) {
            Icon(icon, contentDescription = null, modifier = Modifier.size(24.dp))
        }
    }
}
