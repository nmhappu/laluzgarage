package dev.appu.laluzgarage.ui.components

import androidx.compose.animation.AnimatedVisibility
import androidx.activity.compose.BackHandler
import androidx.compose.animation.core.MutableTransitionState
import androidx.compose.animation.expandHorizontally
import androidx.compose.animation.scaleIn
import androidx.compose.animation.scaleOut
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.focus.FocusRequester
import androidx.compose.ui.focus.focusRequester
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.slideInVertically
import androidx.compose.animation.slideOutVertically
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ColumnScope
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.RowScope
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.lazy.LazyListState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.ButtonDefaults
import androidx.compose.runtime.Composable
import androidx.compose.runtime.SideEffect
import androidx.compose.runtime.derivedStateOf
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.platform.LocalView
import androidx.compose.ui.semantics.heading
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import androidx.compose.ui.window.Dialog
import androidx.compose.ui.window.DialogProperties
import androidx.compose.ui.window.DialogWindowProvider
import dev.appu.laluzgarage.ui.theme.LaluzShape
import dev.appu.laluzgarage.ui.theme.LaluzTheme
import dev.appu.laluzgarage.ui.theme.LaluzType
import dev.appu.laluzgarage.ui.theme.Radius
import dev.appu.laluzgarage.ui.theme.Spacing

// ---------------------------------------------------------------------------
// Screen header (headline-screen title + one line of summary)
// ---------------------------------------------------------------------------

/** "Vehicles" / "Inventory" header: 36/44 title over a 14/20 summary, 24dp gutters, 16dp below. */
@Composable
fun ScreenHeader(title: String, summary: String, modifier: Modifier = Modifier) {
    val cs = MaterialTheme.colorScheme
    Column(
        modifier.padding(start = Spacing.xl, end = Spacing.xl, bottom = Spacing.md),
        verticalArrangement = Arrangement.spacedBy(Spacing.xxs)
    ) {
        Text(title, style = MaterialTheme.typography.displaySmall, color = cs.onSurface, modifier = Modifier.semantics { heading() })
        Text(summary, style = MaterialTheme.typography.bodyMedium, color = cs.onSurfaceVariant)
    }
}

/**
 * The [ScreenHeader] title and summary at the start of the top bar, shown once the header has
 * scrolled away. Takes the bar's free width, so it also pushes the trailing actions to the end.
 * [alpha] lets it hide under the sync pill like the dashboard title ([syncTitleAlpha]).
 */
@Composable
fun RowScope.TopBarTitle(title: String, summary: String, visible: Boolean, alpha: Float = 1f) {
    Box(Modifier.weight(1f).alpha(alpha)) { TopBarTitleContent(title, summary, visible) }
}

// Outside RowScope, so AnimatedVisibility resolves to the plain overload.
@Composable
private fun TopBarTitleContent(title: String, summary: String, visible: Boolean) {
    val cs = MaterialTheme.colorScheme
    val motion = MaterialTheme.motionScheme
    AnimatedVisibility(
        visible = visible,
        enter = fadeIn(motion.defaultEffectsSpec()) + slideInVertically(motion.defaultSpatialSpec()) { it / 2 },
        exit = fadeOut(motion.fastEffectsSpec()) + slideOutVertically(motion.fastSpatialSpec()) { it / 2 }
    ) {
        // Lines up with the header's 24dp gutter (the bar already pads 16dp).
        Column(Modifier.padding(start = Spacing.xl - Spacing.md)) {
            Text(title, style = MaterialTheme.typography.titleLarge, color = cs.onSurface, maxLines = 1, overflow = TextOverflow.Ellipsis)
            Text(summary, style = MaterialTheme.typography.bodySmall, color = cs.onSurfaceVariant, maxLines = 1, overflow = TextOverflow.Ellipsis)
        }
    }
}

/**
 * Top bar start for a searchable list. Once the header (and its search field) has scrolled away it
 * shows the title plus a search button; the button expands into a search field across the bar.
 * Back, the close button or scrolling back to the header collapses it; the query is kept.
 */
@Composable
fun RowScope.TopBarTitleSearch(
    title: String,
    summary: String,
    headerGone: Boolean,
    query: String,
    onQueryChange: (String) -> Unit,
    placeholder: String,
    titleAlpha: Float = 1f
) {
    var expanded by rememberSaveable { mutableStateOf(false) }
    LaunchedEffect(headerGone) { if (!headerGone) expanded = false }
    BackHandler(enabled = expanded) { expanded = false }
    if (expanded) {
        Box(Modifier.weight(1f)) { ExpandedBarSearch(query, onQueryChange, placeholder, onClose = { expanded = false }) }
    } else {
        TopBarTitle(title, summary, visible = headerGone, alpha = titleAlpha)
        AnimatedVisibility(
            visible = headerGone,
            enter = fadeIn(MaterialTheme.motionScheme.defaultEffectsSpec()) + scaleIn(MaterialTheme.motionScheme.defaultSpatialSpec(), initialScale = 0.6f),
            exit = fadeOut(MaterialTheme.motionScheme.fastEffectsSpec()) + scaleOut(MaterialTheme.motionScheme.fastSpatialSpec(), targetScale = 0.6f)
        ) {
            BarIconButton(LaluzIcons.Search, contentDescription = "Search", onClick = { expanded = true })
        }
    }
}

@Composable
private fun ExpandedBarSearch(query: String, onQueryChange: (String) -> Unit, placeholder: String, onClose: () -> Unit) {
    val focus = remember { FocusRequester() }
    // Grows out of the search button's spot at the end of the bar.
    val shown = remember { MutableTransitionState(false) }.apply { targetState = true }
    AnimatedVisibility(
        visibleState = shown,
        enter = fadeIn(MaterialTheme.motionScheme.fastEffectsSpec()) +
            expandHorizontally(MaterialTheme.motionScheme.defaultSpatialSpec(), expandFrom = Alignment.End)
    ) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            LaluzSearchField(
                value = query,
                onValueChange = onQueryChange,
                placeholder = placeholder,
                onClear = { onQueryChange("") },
                height = 48.dp,
                modifier = Modifier.weight(1f).focusRequester(focus)
            )
            BarIconButton(LaluzIcons.Close, contentDescription = "Close search", onClick = onClose)
        }
    }
    LaunchedEffect(Unit) { runCatching { focus.requestFocus() } }
}

/** Opaque full-width band for a list's sticky filters: rows scroll under it, so it reads as part of the top bar. */
@Composable
fun PinnedBand(content: @Composable ColumnScope.() -> Unit) {
    Box(Modifier.fillMaxWidth().background(MaterialTheme.colorScheme.surface), contentAlignment = Alignment.TopCenter) {
        Column(Modifier.widthIn(max = MaxContentWidth).fillMaxWidth().padding(bottom = Spacing.xs), content = content)
    }
}

/** Whether the list's first item (the [ScreenHeader]) has scrolled out of view. */
@Composable
fun rememberHeaderScrolledAway(listState: LazyListState): Boolean {
    val gone by remember(listState) { derivedStateOf { listState.firstVisibleItemIndex > 0 } }
    return gone
}

/** Detail top bar: 48dp back arrow, 20/28 title. */
@Composable
fun DetailTopBar(
    title: String,
    backDescription: String?,
    onBack: () -> Unit,
    scrolled: Boolean = false,
    container: Color = MaterialTheme.colorScheme.surface,
    actions: @Composable RowScope.() -> Unit = {}
) {
    val cs = MaterialTheme.colorScheme
    LaluzTopBar(scrolled = scrolled, startPadding = if (backDescription != null) Spacing.xxs else Spacing.xl, container = container) {
        if (backDescription != null) {
            IconButton(onClick = onBack, modifier = Modifier.size(48.dp)) {
                Icon(LaluzIcons.ArrowBackShort, contentDescription = backDescription, tint = cs.onSurface)
            }
        }
        Text(title, style = MaterialTheme.typography.titleLarge, color = cs.onSurface, modifier = Modifier.weight(1f))
        actions()
    }
}

// ---------------------------------------------------------------------------
// Filter chip
// ---------------------------------------------------------------------------

/** Selected colour pair of a [LaluzFilterChip]. */
enum class FilterChipTone { SECONDARY, ERROR, WARNING }

/**
 * Filter chip: 40dp, full shape, 14/20 label. Selected = tone container with an 18dp check and
 * 12dp leading padding; unselected = 1dp outline on transparent. Optional count at 80% opacity.
 */
@Composable
fun LaluzFilterChip(
    label: String,
    selected: Boolean,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
    count: Int? = null,
    tone: FilterChipTone = FilterChipTone.SECONDARY
) {
    val cs = MaterialTheme.colorScheme
    val ext = LaluzTheme.extendedColors
    val (container, content, border) = when {
        !selected -> Triple(Color.Transparent, cs.onSurfaceVariant, cs.outline)
        tone == FilterChipTone.ERROR -> Triple(cs.errorContainer, cs.onErrorContainer, cs.errorContainer)
        tone == FilterChipTone.WARNING -> Triple(
            ext.warning.copy(alpha = if (ext.warning == ext.warningContainer) 0.16f else 0.14f),
            ext.warning,
            ext.warning
        )
        else -> Triple(cs.secondaryContainer, cs.onSecondaryContainer, cs.secondaryContainer)
    }
    Surface(
        selected = selected,
        onClick = onClick,
        shape = CircleShape,
        color = container,
        contentColor = content,
        border = BorderStroke(1.dp, border),
        modifier = modifier.height(40.dp)
    ) {
        Row(
            modifier = Modifier.padding(start = if (selected) Spacing.sm else Spacing.md, end = Spacing.md),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(Spacing.xs)
        ) {
            if (selected) Icon(LaluzIcons.CheckBold, contentDescription = null, modifier = Modifier.size(18.dp))
            Text(label, style = MaterialTheme.typography.labelLarge, maxLines = 1)
            if (count != null) Text(count.toString(), style = LaluzType.labelTiny, modifier = Modifier.alpha(0.8f))
        }
    }
}

// ---------------------------------------------------------------------------
// Pinned bottom action bar
// ---------------------------------------------------------------------------

/** Pinned bar on surfaceContainer: 12dp top, 16dp sides, 20dp bottom, 8dp between rows. */
@Composable
fun BottomActionBar(modifier: Modifier = Modifier, content: @Composable ColumnScope.() -> Unit) {
    Column(
        modifier
            .fillMaxWidth()
            .background(MaterialTheme.colorScheme.surfaceContainer)
            .navigationBarsPadding(),
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        Column(
            Modifier
                .widthIn(max = MaxContentWidth)
                .fillMaxWidth()
                .padding(start = Spacing.md, end = Spacing.md, top = Spacing.sm, bottom = Spacing.lg),
            verticalArrangement = Arrangement.spacedBy(Spacing.xs),
            content = content
        )
    }
}

/** Delete / Edit pair used by the vehicle and part detail screens. */
@Composable
fun DeleteEditBar(deleteLabel: String, editLabel: String, onDelete: () -> Unit, onEdit: () -> Unit) {
    val cs = MaterialTheme.colorScheme
    BottomActionBar {
        Row(horizontalArrangement = Arrangement.spacedBy(Spacing.xs)) {
            OutlinedPillButton(
                text = deleteLabel,
                onClick = onDelete,
                contentColor = cs.error,
                borderColor = cs.error,
                modifier = Modifier.weight(1f)
            )
            PillButton(
                text = editLabel,
                onClick = onEdit,
                containerColor = cs.primary,
                contentColor = cs.onPrimary,
                modifier = Modifier.weight(1f)
            )
        }
    }
}

// ---------------------------------------------------------------------------
// Connected list rows
// ---------------------------------------------------------------------------

/** Connected list group: 20dp outer corners, 4dp inner corners, 2dp gaps between rows. */
fun connectedRowShape(index: Int, count: Int): RoundedCornerShape = when {
    count <= 1 -> RoundedCornerShape(Radius.xl)
    index == 0 -> RoundedCornerShape(Radius.xl, Radius.xl, Radius.xs, Radius.xs)
    index == count - 1 -> RoundedCornerShape(Radius.xs, Radius.xs, Radius.xl, Radius.xl)
    else -> RoundedCornerShape(Radius.xs)
}

// ---------------------------------------------------------------------------
// Wavy divider
// ---------------------------------------------------------------------------

/**
 * The artboard's squiggle divider: 20 quadratic half-waves stretched across the width, 12dp tall
 * (3dp amplitude around the centre line), 1.5dp round stroke in outlineVariant.
 */
@Composable
fun WavyDivider(modifier: Modifier = Modifier, color: Color = MaterialTheme.colorScheme.outlineVariant) {
    Canvas(
        modifier
            .fillMaxWidth()
            .height(12.dp)
    ) {
        val halfWaves = 20
        val step = size.width / halfWaves
        val mid = size.height / 2f
        val path = Path().apply {
            moveTo(0f, mid)
            for (i in 0 until halfWaves) {
                val x0 = i * step
                quadraticTo(x0 + step / 2f, if (i % 2 == 0) 0f else size.height, x0 + step, mid)
            }
        }
        drawPath(path, color, style = Stroke(width = 1.5.dp.toPx(), cap = StrokeCap.Round))
    }
}

// ---------------------------------------------------------------------------
// Dialogs
// ---------------------------------------------------------------------------

/** Dims the dialog window to the artboard's 50% black scrim. */
@Composable
fun DialogScrim(amount: Float = 0.5f) {
    val window = (LocalView.current.parent as? DialogWindowProvider)?.window
    SideEffect { window?.setDimAmount(amount) }
}

/**
 * Basic dialog from the artboards: surfaceContainerHigh, 28dp radius, 24/12/12/12 padding,
 * 20/28 title, 14/20 body, text buttons in 14/20 bold. The confirm action takes [confirmColor].
 */
@Composable
fun LaluzConfirmDialog(
    title: String,
    body: String,
    confirmText: String,
    dismissText: String,
    onConfirm: () -> Unit,
    onDismiss: () -> Unit,
    confirmColor: Color = MaterialTheme.colorScheme.error,
    horizontalMargin: Dp = Spacing.xl,
    /** Optional line above [body] (e.g. the plate and customer being deleted), 4dp extra space below. */
    lead: (@Composable () -> Unit)? = null
) {
    val cs = MaterialTheme.colorScheme
    Dialog(onDismissRequest = onDismiss, properties = DialogProperties(usePlatformDefaultWidth = false)) {
        DialogScrim()
        Box(Modifier.fillMaxWidth().padding(horizontal = horizontalMargin), contentAlignment = Alignment.Center) {
            Column(
                Modifier
                    .widthIn(max = 560.dp)
                    .fillMaxWidth()
                    .background(cs.surfaceContainerHigh, LaluzShape.hero)
                    .padding(start = Spacing.sm, end = Spacing.sm, top = Spacing.xl, bottom = Spacing.sm),
                verticalArrangement = Arrangement.spacedBy(Spacing.xs)
            ) {
                Column(Modifier.padding(horizontal = Spacing.sm), verticalArrangement = Arrangement.spacedBy(Spacing.xs)) {
                    Text(title, style = MaterialTheme.typography.titleLarge, color = cs.onSurface, modifier = Modifier.semantics { heading() })
                    if (lead != null) Box(Modifier.padding(bottom = Spacing.xxs)) { lead() }
                    Text(body, style = MaterialTheme.typography.bodyMedium, color = cs.onSurfaceVariant)
                }
                Row(
                    Modifier
                        .fillMaxWidth()
                        .padding(top = Spacing.md),
                    horizontalArrangement = Arrangement.spacedBy(Spacing.xs, Alignment.End)
                ) {
                    DialogTextButton(dismissText, cs.tertiary, onDismiss)
                    DialogTextButton(confirmText, confirmColor, onConfirm)
                }
            }
        }
    }
}

/** 48dp text button in a dialog's action row. */
@Composable
fun DialogTextButton(text: String, color: Color, onClick: () -> Unit) {
    TextButton(
        onClick = onClick,
        modifier = Modifier.height(48.dp),
        shape = CircleShape,
        contentPadding = PaddingValues(horizontal = Spacing.md),
        colors = ButtonDefaults.textButtonColors(contentColor = color)
    ) {
        Text(text, style = LaluzType.labelStrong)
    }
}
