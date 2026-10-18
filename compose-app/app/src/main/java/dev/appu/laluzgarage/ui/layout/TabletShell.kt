package dev.appu.laluzgarage.ui.layout

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.core.animateDpAsState
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.tween
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.slideInHorizontally
import androidx.compose.animation.slideOutHorizontally
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.runtime.State
import androidx.compose.runtime.compositionLocalOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.ui.layout.layout
import androidx.compose.ui.unit.offset
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.layout.wrapContentWidth
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clipToBounds
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.semantics.clearAndSetSemantics
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import dev.appu.laluzgarage.ui.components.LaluzNavRail
import dev.appu.laluzgarage.ui.components.ToolbarItem
import dev.appu.laluzgarage.ui.theme.Motion
import dev.appu.laluzgarage.ui.theme.Radius
import dev.appu.laluzgarage.ui.theme.Spacing

private const val SheetInMs = 300
private const val SheetOutMs = 250
val SideSheetWidth = 400.dp

private val NoInset = mutableStateOf(0.dp)

/** Width the coplanar side sheet currently takes from the right edge; content cards give it up. */
val LocalSheetInset = compositionLocalOf<State<Dp>> { NoInset }

/** Shrinks this node by the side sheet's width (read at layout time, so the animation doesn't recompose). */
@Composable
fun Modifier.sheetInsetPadding(): Modifier {
    val inset = LocalSheetInset.current
    return layout { measurable, constraints ->
        val e = inset.value.roundToPx().coerceAtMost(constraints.maxWidth)
        val placeable = measurable.measure(constraints.offset(horizontal = -e))
        layout(placeable.width + e, placeable.height) { placeable.place(0, 0) }
    }
}

/**
 * Tablet frame: navigation rail, the tabs, and the side sheet details open in (Tablet Design canvas,
 * "Side sheet details"). Wide windows share the screen with the sheet: it enters from beyond the right
 * edge and the content gives up its width, so the lists reflow beside it. Medium windows can't spare
 * 400dp, so the sheet is modal there, over a 32% scrim.
 *
 * [sheet] draws the open detail; it is only composed while the sheet is visible or animating out.
 */
@Composable
fun TabletShell(
    items: List<ToolbarItem>,
    currentKey: String,
    onSelect: (String) -> Unit,
    railExpanded: Boolean,
    onToggleRail: () -> Unit,
    fabLabel: String,
    onFab: () -> Unit,
    sheetOpen: Boolean,
    /** Height of the page's top bar below the status bar: the sheet starts under it. */
    sheetTop: Dp,
    onDismissSheet: () -> Unit,
    sheet: @Composable () -> Unit,
    content: @Composable () -> Unit
) {
    val adaptive = LocalAdaptive.current
    val coplanar = adaptive.isLarge
    Row(Modifier.fillMaxSize().background(MaterialTheme.colorScheme.surface)) {
        LaluzNavRail(
            items = items,
            currentKey = currentKey,
            onSelect = onSelect,
            expanded = railExpanded,
            onToggleExpanded = onToggleRail,
            fabLabel = fabLabel,
            onFab = onFab
        )
        Box(Modifier.weight(1f).fillMaxHeight()) {
            if (coplanar) {
                // The top bar keeps the full width; the sheet sits under it beside the content card.
                val gutter = Spacing.xl
                val target: Dp = if (sheetOpen) SideSheetWidth + gutter else 0.dp
                val width = animateDpAsState(
                    target,
                    tween(if (sheetOpen) SheetInMs else SheetOutMs, easing = Motion.emphasized),
                    label = "sideSheetWidth"
                )
                CompositionLocalProvider(LocalSheetInset provides width) {
                    Box(Modifier.fillMaxSize()) {
                        content()
                        CoplanarSheet(width = width.value, top = sheetTop, sheet = sheet, modifier = Modifier.align(Alignment.TopEnd))
                    }
                }
            } else {
                Box(Modifier.fillMaxSize()) { content() }
                ModalSheet(open = sheetOpen, onDismiss = onDismissSheet, sheet = sheet)
            }
        }
    }
}

/**
 * A 28dp card one tone up from the surface (side sheet, Settings detail pane). Detail screens draw on `surface` with `surfaceContainerLow`
 * cards, so inside the sheet every tone moves one step up and they keep their contrast.
 */
@Composable
fun RaisedCard(modifier: Modifier = Modifier, content: @Composable () -> Unit) {
    val cs = MaterialTheme.colorScheme
    val raised = remember(cs) {
        cs.copy(
            surface = cs.surfaceContainerLow,
            surfaceContainerLow = cs.surfaceContainerHigh,
            surfaceContainer = cs.surfaceContainerHigh,
            surfaceContainerHigh = cs.surfaceContainerHighest
        )
    }
    MaterialTheme(colorScheme = raised) {
        Surface(
            modifier = modifier,
            shape = RoundedCornerShape(Radius.xxl),
            color = cs.surfaceContainerLow,
            contentColor = cs.onSurface,
            content = content
        )
    }
}

/** Wide windows: a card under the top bar, beside the content, that widens from zero, clipping a fixed-width sheet so it reads as sliding in. */
@Composable
private fun CoplanarSheet(width: Dp, top: Dp, sheet: @Composable () -> Unit, modifier: Modifier = Modifier) {
    val gutter = Spacing.xl
    if (width <= 0.dp) return
    Box(
        modifier
            .width(width)
            .fillMaxHeight()
            .clipToBounds()
            .statusBarsPadding()
            .navigationBarsPadding()
            .padding(top = top, bottom = gutter, end = gutter)
    ) {
        // Keeps its full width while the box grows; the box edge is what moves. The 24dp gap beside the
        // content comes from the content card's own end margin.
        RaisedCard(
            Modifier
                .wrapContentWidth(Alignment.Start, unbounded = true)
                .width(SideSheetWidth)
                .fillMaxHeight()
        ) { sheet() }
    }
}

/** Medium windows: slides in from the right edge over a scrim; the scrim, the back arrow or system back closes it. */
@Composable
private fun ModalSheet(open: Boolean, onDismiss: () -> Unit, sheet: @Composable () -> Unit) {
    val scrim by animateFloatAsState(
        if (open) 0.32f else 0f,
        tween(if (open) SheetInMs else SheetOutMs, easing = Motion.emphasized),
        label = "sheetScrim"
    )
    if (scrim > 0f) {
        Box(
            Modifier
                .fillMaxSize()
                .background(Color.Black.copy(alpha = scrim))
                .clickable(interactionSource = remember { MutableInteractionSource() }, indication = null, onClick = onDismiss)
                .clearAndSetSemantics { }
        )
    }
    AnimatedVisibility(
        visible = open,
        modifier = Modifier.fillMaxSize(),
        enter = slideInHorizontally(tween(SheetInMs, easing = Motion.emphasized)) { it } + fadeIn(tween(150, delayMillis = 100)),
        exit = slideOutHorizontally(tween(SheetOutMs, easing = Motion.emphasized)) { it } + fadeOut(tween(75))
    ) {
        Box(Modifier.fillMaxSize(), contentAlignment = Alignment.CenterEnd) {
            RaisedCard(
                Modifier
                    .statusBarsPadding()
                    .navigationBarsPadding()
                    .padding(Spacing.xl)
                    .width(SideSheetWidth)
                    .fillMaxHeight()
            ) { sheet() }
        }
    }
}
