package dev.appu.laluzgarage.ui.components

import androidx.compose.animation.AnimatedContent
import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.SizeTransform
import androidx.compose.animation.animateColorAsState
import androidx.compose.animation.core.animateDpAsState
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.scaleIn
import androidx.compose.animation.scaleOut
import androidx.compose.animation.slideInVertically
import androidx.compose.animation.slideOutVertically
import androidx.compose.animation.togetherWith
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.BoxScope
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.RowScope
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material3.ExperimentalMaterial3ExpressiveApi
import androidx.compose.material3.Icon
import androidx.compose.material3.LinearWavyProgressIndicator
import androidx.compose.material3.LoadingIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableFloatStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import kotlinx.coroutines.delay
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.semantics.LiveRegionMode
import androidx.compose.ui.semantics.liveRegion
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.unit.dp
import dev.appu.laluzgarage.data.sync.SyncPhase
import dev.appu.laluzgarage.data.sync.SyncUiState
import dev.appu.laluzgarage.ui.theme.Spacing

/**
 * [LaluzTopBar] with the sync chrome overlaid: a status pill centred in the bar and an M3
 * Expressive wavy progress bar along its bottom edge. Both are overlays, so nothing in the bar
 * moves as they come and go. All motion comes from the theme's expressive [MaterialTheme.motionScheme].
 * Fade the bar's own title with [syncTitleAlpha] so it doesn't sit under the pill.
 */
@Composable
fun LaluzSyncTopBar(
    sync: SyncUiState,
    modifier: Modifier = Modifier,
    scrolled: Boolean = false,
    content: @Composable RowScope.() -> Unit
) {
    // The bar grows by a strip while the run is visible, so the progress line sits in its own
    // space instead of overlapping the bar or the content below.
    val strip by animateDpAsState(
        targetValue = if (sync.isVisible) SyncStripHeight else 0.dp,
        animationSpec = MaterialTheme.motionScheme.defaultSpatialSpec(),
        label = "syncStrip"
    )
    Column(modifier.fillMaxWidth()) {
        Box(Modifier.fillMaxWidth()) {
            LaluzTopBar(scrolled = scrolled, content = content)
            // Same box as the bar row (below the status bar), so the pill centres on the row.
            Box(
                Modifier
                    .matchParentSize()
                    .statusBarsPadding(),
                contentAlignment = Alignment.Center
            ) {
                SyncPill(sync)
            }
        }
        Box(Modifier.fillMaxWidth().height(strip), contentAlignment = Alignment.Center) {
            SyncProgressBar(sync)
        }
    }
}

/** Extra bar height that holds the progress line while a sync is visible. */
private val SyncStripHeight = 16.dp

/** The line creeps toward this while a sync is running, leaving the last stretch to the real finish. */
private const val CreepCeiling = 0.92f

/** Title alpha for a bar using [LaluzSyncTopBar]: hidden while the pill is up. */
@Composable
fun syncTitleAlpha(sync: SyncUiState): Float {
    val alpha by animateFloatAsState(
        targetValue = if (sync.isVisible) 0f else 1f,
        animationSpec = MaterialTheme.motionScheme.defaultEffectsSpec(),
        label = "syncTitleAlpha"
    )
    return alpha
}

@Composable
private fun SyncPill(sync: SyncUiState) {
    val cs = MaterialTheme.colorScheme
    val motion = MaterialTheme.motionScheme
    AnimatedVisibility(
        visible = sync.isVisible,
        enter = fadeIn(motion.defaultEffectsSpec()) + scaleIn(motion.defaultSpatialSpec(), initialScale = 0.8f),
        exit = fadeOut(motion.slowEffectsSpec()) + scaleOut(motion.slowEffectsSpec(), targetScale = 0.9f)
    ) {
        val done = sync.phase == SyncPhase.DONE
        val container by animateColorAsState(
            if (done) cs.secondaryContainer else cs.surfaceContainerHigh,
            motion.defaultEffectsSpec(),
            label = "syncPillContainer"
        )
        val contentColor by animateColorAsState(
            if (done) cs.onSecondaryContainer else cs.onSurfaceVariant,
            motion.defaultEffectsSpec(),
            label = "syncPillContent"
        )
        Row(
            modifier = Modifier
                .height(36.dp)
                .clip(CircleShape)
                .background(container)
                .padding(start = Spacing.xs, end = Spacing.md)
                .semantics { liveRegion = LiveRegionMode.Polite },
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(Spacing.xs)
        ) {
            SyncPillIcon(sync.phase, contentColor)
            // Labels roll upward from one phase to the next; the pill resizes with a spatial spring.
            AnimatedContent(
                targetState = sync.label,
                transitionSpec = {
                    (fadeIn(motion.defaultEffectsSpec()) + slideInVertically(motion.defaultSpatialSpec()) { it / 2 })
                        .togetherWith(fadeOut(motion.fastEffectsSpec()) + slideOutVertically(motion.fastSpatialSpec()) { -it / 2 })
                        .using(SizeTransform(clip = false) { _, _ -> motion.defaultSpatialSpec() })
                },
                label = "syncLabel"
            ) { label ->
                Text(label, style = MaterialTheme.typography.labelLarge, color = contentColor, maxLines = 1)
            }
        }
    }
}

/** Expressive shape-morphing loader while work is in flight; it hands over to a springy tick. */
@OptIn(ExperimentalMaterial3ExpressiveApi::class)
@Composable
private fun SyncPillIcon(phase: SyncPhase, tint: Color) {
    val motion = MaterialTheme.motionScheme
    Box(Modifier.size(24.dp), contentAlignment = Alignment.Center) {
        AnimatedVisibility(
            visible = phase == SyncPhase.SYNCING || phase == SyncPhase.LOADING,
            enter = fadeIn(motion.fastEffectsSpec()),
            exit = fadeOut(motion.fastEffectsSpec()) + scaleOut(motion.fastSpatialSpec(), targetScale = 0.4f)
        ) {
            LoadingIndicator(modifier = Modifier.size(24.dp), color = tint)
        }
        AnimatedVisibility(
            visible = phase == SyncPhase.DONE,
            enter = fadeIn(motion.fastEffectsSpec()) + scaleIn(motion.fastSpatialSpec(), initialScale = 0.2f),
            exit = fadeOut(motion.slowEffectsSpec())
        ) {
            Icon(LaluzIcons.CheckBold, contentDescription = null, tint = tint, modifier = Modifier.size(18.dp))
        }
        AnimatedVisibility(
            visible = phase == SyncPhase.OFFLINE,
            enter = fadeIn(motion.fastEffectsSpec()) + scaleIn(motion.fastSpatialSpec(), initialScale = 0.4f),
            exit = fadeOut(motion.slowEffectsSpec())
        ) {
            Icon(LaluzIcons.Warning, contentDescription = null, tint = tint, modifier = Modifier.size(16.dp))
        }
    }
}

/**
 * Determinate wavy bar: it ripples while the run is in progress and flattens to a straight line as
 * it reaches 100% (the default amplitude curve), which lands together with the tick.
 */
@OptIn(ExperimentalMaterial3ExpressiveApi::class)
@Composable
private fun BoxScope.SyncProgressBar(sync: SyncUiState) {
    val cs = MaterialTheme.colorScheme
    val motion = MaterialTheme.motionScheme
    // Real progress only moves when a stage reports in, so between reports the line creeps
    // forward on its own (easing toward, never reaching, the end) and never goes backwards.
    var creep by remember { mutableFloatStateOf(0f) }
    LaunchedEffect(sync.isActive) {
        if (!sync.isActive) return@LaunchedEffect
        while (true) {
            delay(120)
            creep += (CreepCeiling - creep) * 0.03f
        }
    }
    LaunchedEffect(sync.phase) {
        if (sync.phase == SyncPhase.IDLE) creep = 0f
    }
    val progress by animateFloatAsState(
        targetValue = if (sync.isActive) maxOf(sync.progress, creep) else sync.progress,
        animationSpec = motion.slowEffectsSpec(),
        label = "syncProgress"
    )
    AnimatedVisibility(
        visible = sync.isVisible,
        modifier = Modifier.align(Alignment.BottomCenter).padding(bottom = 4.dp),
        enter = fadeIn(motion.defaultEffectsSpec()),
        exit = fadeOut(motion.slowEffectsSpec())
    ) {
        val lineModifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = Spacing.md)
        val color = if (sync.phase == SyncPhase.OFFLINE) cs.outline else cs.primary
        LinearWavyProgressIndicator(
            progress = { progress },
            modifier = lineModifier,
            color = color,
            trackColor = cs.secondaryContainer
        )
    }
}
