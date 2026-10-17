package dev.appu.laluzgarage.ui.components

import androidx.compose.foundation.Canvas
import androidx.compose.foundation.layout.size
import androidx.compose.runtime.Composable
import androidx.compose.runtime.remember
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.graphics.PathMeasure
import androidx.compose.ui.graphics.StrokeJoin
import androidx.compose.ui.graphics.drawscope.DrawScope
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.graphics.drawscope.clipPath
import androidx.compose.ui.graphics.drawscope.scale
import androidx.compose.ui.graphics.drawscope.translate
import androidx.compose.ui.graphics.vector.PathParser
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.unit.dp
import dev.appu.laluzgarage.ui.theme.LaluzTheme
import kotlin.math.min

private const val LOGO_X = 227f
private const val LOGO_Y = 426f
private const val LOGO_W = 800f
private const val LOGO_H = 403f

// Artboard SVG paths, viewBox "227 426 800 403".
private const val INK_L =
    "M375.641 735.346l43.365 -97.683 60.698 -135.652 34.841 -76.253 -125.363 -.084 -39.464 93.3 -122.504 286.466c8.79 3.751 14.553 10.396 16.521 19.408l219.693 -.06 6.242 -14.069 32.138 -75.097 -126.166 -.276Z"
private const val BOLT =
    "M627.609 634.262l-77.582 -.455 43.503 -78.677 12.708 -22.83 -18.02 16.779 -67.552 64.621 -60.47 58.776 87.812 .281 -46.923 114.255h0l-14.986 37.971c8.805 -8.289 14.953 -18.188 22.253 -28.141h0s119.257 -162.58 119.257 -162.58Z"
private const val INK_UZ =
    "M785.248 567.462c-15.687 .021 -29.883 8.313 -41.359 18.259 -29.852 25.871 -44.948 76.418 -24.659 111.322 8.58 14.76 23.145 24.62 40.276 24.681l99.279 .353 -10.893 24.145c-1.95 4.323 -6.017 8.74 -11.497 8.747l-167.805 .199c-6.387 .008 -12.105 -4.179 -14.607 -7.814 -3.666 -5.325 -4.519 -11.869 -1.989 -17.879l57.783 -137.282 18.511 -43.542c6.197 -14.576 21.436 -24.818 37.595 -24.845l172.088 -.284 25.992 -49.088 24.357 -47.035 -243.897 .117c-46.053 .022 -91.915 31.626 -111.18 72.898l-55.912 119.778 75.051 .345 -111.359 159.929c7.098 32.906 36.766 47.867 69.693 47.833l220.52 -.228c.012 .067 .029 .132 .041 .199l81.01 .054h1.338c7.438 -18.471 15.323 -38.115 15.338 -38.154 0 0 0 -.002 0 -.002l.003 -.008 1.488 -3.345s.004 .006 .007 .009l1.619 -3.666 42.954 -97.28 51.751 -118.746 -241.539 .328ZM900.15 660.689l-59.526 .086c-6.527 .009 -5.626 11.073 -19.682 21.091 -18.631 13.277 -45.563 7.596 -56.015 -13.849l32.252 -2.583 10.046 -17.597 -10.238 -17.504 -31.715 -2.368c8.258 -19.429 31.088 -27.646 49.931 -18.433 11.732 5.736 19.02 16.276 22.712 28.714l72.004 .402 -9.769 22.042Z"
private const val INK_DOT =
    "M930.705 787.139c-.082 -.104 -.16 -.21 -.242 -.314l-.022 .05c.089 .088 .176 .176 .264 .264Z"

/** Total length of the login draw-on (the "Logo draw-on" artboard), excluding its start delay. */
const val LOGO_DRAW_MS = 1400

/**
 * One pen stroke of the draw-on: [pen] runs along the glyph's centerline and is drawn [width]
 * wide, clipped to the glyph at [clip] (index into the logo paths), between [start] and [end]
 * as fractions of [LOGO_DRAW_MS].
 */
private class PenStroke(
    pen: String,
    val clip: Int,
    val width: Float,
    val start: Float,
    val end: Float,
    val easeOut: Boolean
) {
    val path: Path = PathParser().parsePathString(pen).toPath()
}

// Stroke order, as you'd write it: L stem top to bottom then the foot, the bolt zig-zag,
// the G from its top bar round to the right side, then the G crossbar into the wrench.
// L 0-420 ms, bolt 370-590, G 560-1200, crossbar 1150-1400.
private val PEN_STROKES = listOf(
    PenStroke("M455 400 L290 788 L520 782", clip = 0, width = 150f, start = 0f, end = 0.3f, easeOut = false),
    PenStroke("M618 515 L484 660 L606 648 L476 846", clip = 1, width = 84f, start = 0.2643f, end = 0.4214f, easeOut = true),
    PenStroke(
        "M1010 476 L735 476 C700 476 684 495 672 520 L640 620 L612 730 L592 790 L880 790 C915 790 925 770 932 740 L960 640",
        clip = 2, width = 132f, start = 0.4f, end = 0.8571f, easeOut = false
    ),
    PenStroke("M1040 645 L700 645", clip = 2, width = 160f, start = 0.8214f, end = 1f, easeOut = true)
)

private fun easeInOutCubic(u: Float) = if (u < 0.5f) 4f * u * u * u else 1f - (-2f * u + 2f).let { it * it * it } / 2f
private fun easeOutCubic(u: Float) = 1f - (1f - u).let { it * it * it }

/**
 * LaluZ wordmark drawn from the artboard vector, so the ink follows the theme
 * (white on dark, slate on light) while the bolt stays green.
 * Default size is the 128×64 login artboard frame; the mark is fitted and centred like SVG "meet".
 *
 * [drawProgress] (0..1 over [LOGO_DRAW_MS]) writes the mark stroke by stroke for the login
 * draw-on; it is read at draw time, so animating it does not recompose. Null or 1 draws it solid.
 */
@Composable
fun LaluzLogo(
    modifier: Modifier = Modifier,
    inkColor: Color = LaluzTheme.extendedColors.logoInk,
    boltColor: Color = LaluzTheme.extendedColors.logoBolt,
    drawProgress: (() -> Float)? = null
) {
    val paths = remember {
        listOf(INK_L, BOLT, INK_UZ, INK_DOT).map { PathParser().parsePathString(it).toPath() }
    }
    val measure = remember { PathMeasure() }
    val segment = remember { Path() }
    Canvas(
        modifier = modifier
            .size(width = 128.dp, height = 64.dp)
            .semantics { contentDescription = "LaluZ Garage logo" }
    ) {
        val s = min(size.width / LOGO_W, size.height / LOGO_H)
        val dx = (size.width - LOGO_W * s) / 2f
        val dy = (size.height - LOGO_H * s) / 2f
        translate(dx, dy) {
            scale(s, s, pivot = androidx.compose.ui.geometry.Offset.Zero) {
                translate(-LOGO_X, -LOGO_Y) {
                    val t = drawProgress?.invoke() ?: 1f
                    if (t >= 1f) {
                        paths.forEachIndexed { i, p -> drawPath(p, if (i == 1) boltColor else inkColor) }
                    } else {
                        PEN_STROKES.forEach { stroke ->
                            drawPenStroke(stroke, t, paths[stroke.clip], if (stroke.clip == 1) boltColor else inkColor, measure, segment)
                        }
                    }
                }
            }
        }
    }
}

private fun DrawScope.drawPenStroke(
    stroke: PenStroke,
    t: Float,
    glyph: Path,
    color: Color,
    measure: PathMeasure,
    segment: Path
) {
    val u = ((t - stroke.start) / (stroke.end - stroke.start)).coerceIn(0f, 1f)
    if (u <= 0f) return
    val eased = if (stroke.easeOut) easeOutCubic(u) else easeInOutCubic(u)
    measure.setPath(stroke.path, false)
    segment.reset()
    measure.getSegment(0f, measure.length * eased, segment, true)
    clipPath(glyph) {
        drawPath(segment, color, style = Stroke(width = stroke.width, join = StrokeJoin.Round))
    }
}
