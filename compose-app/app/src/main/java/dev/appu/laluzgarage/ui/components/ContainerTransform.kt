package dev.appu.laluzgarage.ui.components

import androidx.compose.runtime.Composable
import androidx.compose.runtime.Stable
import androidx.compose.runtime.remember
import androidx.compose.runtime.staticCompositionLocalOf
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.CornerRadius
import androidx.compose.ui.geometry.Rect
import androidx.compose.ui.geometry.RoundRect
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Outline
import androidx.compose.ui.graphics.Shape
import androidx.compose.ui.graphics.TransformOrigin
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.layout.LayoutCoordinates
import androidx.compose.ui.layout.boundsInRoot
import androidx.compose.ui.layout.onPlaced
import androidx.compose.ui.unit.Density
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.LayoutDirection
import androidx.compose.ui.unit.dp
import androidx.compose.ui.util.lerp

/*
 * Material container transform, hand-rolled: a tapped card grows into the screen it opens and the
 * screen shrinks back into the card on back. The shared-element APIs need both ends inside one
 * AnimatedContent, but the tabs are deliberately kept outside it (composed under the detail
 * screens), so the card only reports where it is and the detail screen draws itself from there.
 */

/** Where a card sits, so the screen it opens can grow out of it. Remember one per card. */
@Stable
class ContainerSource internal constructor() {
    internal var coordinates: LayoutCoordinates? = null
    internal var corner: Dp = 0.dp

    /** The card's bounds in the window, or null once it has scrolled away or left composition. */
    internal fun boundsInRoot(): Rect? =
        coordinates?.takeIf { it.isAttached }?.boundsInRoot()?.takeIf { it.width > 1f && it.height > 1f }
}

@Composable
fun rememberContainerSource(): ContainerSource = remember { ContainerSource() }

/** Marks this node as [source]'s container; [corner] is the card's corner radius. */
fun Modifier.containerSource(source: ContainerSource, corner: Dp): Modifier = onPlaced {
    source.coordinates = it
    source.corner = corner
}

/** One running container transform: [key]'s screen grows from / shrinks into [bounds]. */
class ContainerMotion(val key: String, val bounds: Rect, val cornerPx: Float)

/**
 * Which card opened which screen. Cards call [from] just before opening; the layer host asks
 * [begin] at the start of each transition whether that screen can grow from (or shrink into) its
 * card, and the screen's [containerTransform] modifier draws [active].
 */
@Stable
class ContainerTransformState {
    private val sources = HashMap<String, ContainerSource>()

    /** The transform running now; plain (not snapshot) state, read every frame in the draw phase. */
    var active: ContainerMotion? = null
        private set

    /** Records that the card [source] is opening the screen identified by [key]. */
    fun from(key: String, source: ContainerSource) {
        sources[key] = source
    }

    /** Starts a transition: a transform for [key] if its card is still on screen, otherwise none. */
    fun begin(key: String?, density: Density): ContainerMotion? {
        val source = key?.let(sources::get)
        val bounds = source?.boundsInRoot()
        active = if (key != null && source != null && bounds != null) {
            ContainerMotion(key, bounds, with(density) { source.corner.toPx() })
        } else null
        return active
    }
}

val LocalContainerTransform = staticCompositionLocalOf { ContainerTransformState() }

/**
 * Draws this full-screen layer as a container transform for [key] while one is [ContainerTransformState.active]:
 * scaled to the card's width, moved to its position and clipped to its height and corners at
 * [progress] 0, full screen at 1. The content fades in over the first third, so the card shows
 * through as the container starts to grow (fade through).
 */
fun Modifier.containerTransform(state: ContainerTransformState, key: String?, progress: () -> Float): Modifier =
    graphicsLayer {
        val motion = state.active?.takeIf { it.key == key } ?: return@graphicsLayer
        val p = progress()
        if (p >= 1f) return@graphicsLayer
        val r = motion.bounds
        val scale = lerp(r.width / size.width, 1f, p)
        transformOrigin = TransformOrigin(0f, 0f)
        scaleX = scale
        scaleY = scale
        translationX = lerp(r.left, 0f, p)
        translationY = lerp(r.top, 0f, p)
        // Clip in the layer's own (unscaled) space: the visible height shrinks with the card.
        shape = ContainerClip(
            height = lerp(r.height, size.height, p) / scale,
            corner = lerp(motion.cornerPx, 0f, p) / scale
        )
        clip = true
        alpha = (p / FadeThroughFraction).coerceIn(0f, 1f)
    }

private const val FadeThroughFraction = 0.35f

private class ContainerClip(private val height: Float, private val corner: Float) : Shape {
    override fun createOutline(size: Size, layoutDirection: LayoutDirection, density: Density): Outline =
        Outline.Rounded(RoundRect(0f, 0f, size.width, height.coerceAtMost(size.height), CornerRadius(corner)))
}
