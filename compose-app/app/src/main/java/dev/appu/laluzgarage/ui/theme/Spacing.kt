package dev.appu.laluzgarage.ui.theme

import androidx.compose.animation.core.CubicBezierEasing
import androidx.compose.ui.unit.dp

/** Spacing tokens (tokens.json → spacing): an 8dp grid with a 4dp half-step. */
object Spacing {
    val xxs = 4.dp     // space-1: icon to label
    val xs = 8.dp      // space-2: grid gap between tiles
    val sm = 12.dp     // space-3: compact padding
    val md = 16.dp     // space-4: screen gutter, card padding
    val lg = 20.dp     // space-5: detail section padding
    val xl = 24.dp     // space-6: hero card padding, section gap
    val xxl = 32.dp    // space-8: between major sections
    val touch = 48.dp  // minimum touch target
    val gutter = md
}

/** Elevation: tonal surfaces first; a shadow only where something floats. */
object Elevation {
    val level3 = 6.dp  // FAB and floating toolbar
}

/** Motion tokens. */
object Motion {
    val emphasized = CubicBezierEasing(0.2f, 0f, 0f, 1f)
    const val SHAPE_MORPH_MS = 250
    const val COLOR_MS = 150
}
