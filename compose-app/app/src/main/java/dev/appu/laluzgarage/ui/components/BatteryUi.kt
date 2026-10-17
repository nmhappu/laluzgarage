package dev.appu.laluzgarage.ui.components

import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.BoxWithConstraints
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.offset
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Slider
import androidx.compose.material3.SliderState
import androidx.compose.material3.rememberSliderState
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.geometry.CornerRadius
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.BlendMode
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.CompositingStrategy
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.graphics.drawscope.clipPath
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.hapticfeedback.HapticFeedbackType
import androidx.compose.ui.platform.LocalHapticFeedback
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.semantics.stateDescription
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import dev.appu.laluzgarage.ui.theme.LaluzShape
import dev.appu.laluzgarage.ui.theme.LaluzTheme
import dev.appu.laluzgarage.ui.theme.Spacing
import kotlin.math.roundToInt

/** Battery level is recorded in 5% steps; null (shown as "~") means it wasn't checked. */
private const val BatteryStops = 21 // slider positions 0..21: 0 = "~", 1..21 = 0%..100% in 5% steps

private fun stopOf(percent: Int?): Int = if (percent == null) 0 else (percent / 5) + 1
private fun percentOf(stop: Int): Int? = if (stop <= 0) null else (stop - 1) * 5

/** Error at 20% or less, warning at 50% or less, otherwise primary; "~" stays neutral. */
@Composable
fun batteryLevelColor(percent: Int?): Color {
    val cs = MaterialTheme.colorScheme
    return when {
        percent == null -> cs.onSurfaceVariant
        percent <= 20 -> cs.error
        percent <= 50 -> LaluzTheme.extendedColors.warning
        else -> cs.primary
    }
}

fun batteryLabel(percent: Int?): String = if (percent == null) "~" else "$percent%"

private fun batterySpoken(percent: Int?): String = if (percent == null) "Battery not recorded" else "Battery $percent percent"

/** Outlined battery with the charge drawn as a fill; 24dp design box scaled to [size]. */
@Composable
fun BatteryGlyph(percent: Int?, tint: Color, size: Dp, modifier: Modifier = Modifier) {
    Canvas(modifier.size(size)) {
        val u = this.size.width / 24f
        val stroke = 2f * u
        drawRoundRect(
            tint, topLeft = Offset(3f * u, 7f * u), size = Size(16f * u, 10f * u),
            cornerRadius = CornerRadius(2f * u), style = Stroke(stroke)
        )
        drawLine(tint, Offset(22f * u, 11f * u), Offset(22f * u, 13f * u), strokeWidth = stroke, cap = androidx.compose.ui.graphics.StrokeCap.Round)
        if (percent != null && percent > 0) {
            drawRoundRect(
                tint, topLeft = Offset(5f * u, 9f * u), size = Size(12f * u * (percent / 100f), 6f * u),
                cornerRadius = CornerRadius(1f * u)
            )
        }
    }
}

/** 24dp badge for job cards and the job header: glyph plus "60%" or "~". */
@Composable
fun BatteryBadge(percent: Int?, modifier: Modifier = Modifier) {
    val cs = MaterialTheme.colorScheme
    val tint = batteryLevelColor(percent)
    Row(
        modifier
            .height(24.dp)
            .clip(LaluzShape.chip)
            .background(cs.surfaceContainerHigh)
            .padding(horizontal = Spacing.xs)
            .semantics(mergeDescendants = true) { contentDescription = batterySpoken(percent) },
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(Spacing.xxs)
    ) {
        BatteryGlyph(percent, tint, 16.dp)
        Text(batteryLabel(percent), style = MaterialTheme.typography.labelMedium, color = tint, maxLines = 1)
    }
}

/**
 * Battery level field: label with a live value chip, a slim discrete slider (~, 0, 5 ... 100) with a
 * 2dp gap around the handle and a cut mark after "~", scale labels and a hint. Each step gives a
 * medium haptic tick.
 */
@Composable
fun BatteryField(percent: Int?, onPercentChange: (Int?) -> Unit, modifier: Modifier = Modifier) {
    val cs = MaterialTheme.colorScheme
    val haptics = LocalHapticFeedback.current
    var lastStop by remember { mutableIntStateOf(stopOf(percent)) }
    val stop = stopOf(percent)
    val levelColor = batteryLevelColor(percent)

    Column(modifier, verticalArrangement = Arrangement.spacedBy(6.dp)) {
        Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
            Text(
                "Battery level",
                style = MaterialTheme.typography.titleSmall,
                color = cs.onSurfaceVariant,
                modifier = Modifier.weight(1f)
            )
            Row(
                Modifier
                    .height(28.dp)
                    .clip(LaluzShape.chip)
                    .background(cs.surfaceContainerHigh)
                    .padding(horizontal = 10.dp),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(6.dp)
            ) {
                BatteryGlyph(percent, levelColor, 20.dp)
                Text(batteryLabel(percent), style = MaterialTheme.typography.titleSmall, color = levelColor)
            }
        }

        val sliderState = rememberSliderState(
            value = stop.toFloat(),
            steps = BatteryStops - 1,
            trackRange = 0f..BatteryStops.toFloat()
        )
        LaunchedEffect(stop) { if (sliderState.value.roundToInt() != stop) sliderState.value = stop.toFloat() }
        Slider(
            state = sliderState,
            onValueChange = { v: Float ->
                val next = v.roundToInt().coerceIn(0, BatteryStops)
                sliderState.value = next.toFloat()
                if (next != lastStop) {
                    lastStop = next
                    haptics.performHapticFeedback(HapticFeedbackType.ContextClick)
                    onPercentChange(percentOf(next))
                }
            },
            thumb = { _: SliderState ->
                Box(Modifier.width(4.dp).height(44.dp).background(cs.primary, RoundedCornerShape(2.dp)))
            },
            track = { state: SliderState ->
                BatteryTrack(
                    stop = (state.value).roundToInt(),
                    activeColor = levelColor,
                    inactiveColor = cs.secondaryContainer,
                    hatchColor = cs.outline
                )
            },
            modifier = Modifier
                .fillMaxWidth()
                .height(44.dp)
                .semantics { stateDescription = if (percent == null) "Not recorded" else "$percent percent" }
        )

        BoxWithConstraints(Modifier.fillMaxWidth().height(16.dp)) {
            val travel = maxWidth - 4.dp
            fun xOf(stopIndex: Int): Dp = 2.dp + travel * (stopIndex / BatteryStops.toFloat())
            val labelStyle = MaterialTheme.typography.bodySmall
            val labelColor = cs.onSurfaceVariant
            Text("~", style = labelStyle, color = labelColor, modifier = Modifier.align(Alignment.CenterStart))
            Box(Modifier.offset(x = xOf(1) - 12.dp).width(24.dp), contentAlignment = Alignment.Center) {
                Text("0", style = labelStyle, color = labelColor)
            }
            Box(Modifier.offset(x = xOf(11) - 12.dp).width(24.dp), contentAlignment = Alignment.Center) {
                Text("50", style = labelStyle, color = labelColor)
            }
            Text("100", style = labelStyle, color = labelColor, modifier = Modifier.align(Alignment.CenterEnd))
        }

    }
}

/**
 * 16dp slim track: inactive bar, hatched "~" zone, active fill up to the handle, a 2dp gap either
 * side of the 4dp handle and a cut mark between "~" and 0.
 */
@Composable
private fun BatteryTrack(stop: Int, activeColor: Color, inactiveColor: Color, hatchColor: Color) {
    Canvas(
        Modifier
            .fillMaxWidth()
            .height(44.dp)
            .graphicsLayer { compositingStrategy = CompositingStrategy.Offscreen }
    ) {
        val d = density
        val handleW = 4f * d
        val travel = size.width - handleW
        val cx = handleW / 2f + travel * (stop / BatteryStops.toFloat())
        val cut = handleW / 2f + travel * (1f / BatteryStops)
        val trackH = 16f * d
        val top = (size.height - trackH) / 2f
        val r = CornerRadius(trackH / 2f)

        drawRoundRect(inactiveColor, Offset(0f, top), Size(size.width, trackH), r)

        // Hatched "~" zone, only visible while the handle sits at "~".
        clipPath(Path().apply { addRoundRect(androidx.compose.ui.geometry.RoundRect(0f, top, cut, top + trackH, r, CornerRadius.Zero, CornerRadius.Zero, r)) }) {
            var x = -trackH
            while (x < cut) {
                drawLine(hatchColor.copy(alpha = 0.5f), Offset(x, top + trackH), Offset(x + trackH, top), strokeWidth = 1f * d)
                x += 4f * d
            }
        }

        if (cx > 0f) {
            drawRoundRect(activeColor, Offset(0f, top), Size(cx, trackH), r)
        }

        // 2dp gap either side of the handle, then the cut mark.
        drawRect(Color.Black, Offset(cx - handleW / 2f - 2f * d, top), Size(handleW + 4f * d, trackH), blendMode = BlendMode.Clear)
        if (stop != 1) {
            drawRect(Color.Black, Offset(cut - 1f * d, top), Size(2f * d, trackH), blendMode = BlendMode.Clear)
        }
    }
}
