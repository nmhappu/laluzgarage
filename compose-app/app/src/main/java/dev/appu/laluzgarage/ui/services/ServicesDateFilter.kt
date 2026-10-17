package dev.appu.laluzgarage.ui.services

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalDensity
import androidx.compose.ui.semantics.LiveRegionMode
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.semantics.clearAndSetSemantics
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.liveRegion
import androidx.compose.ui.semantics.selected
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.IntOffset
import androidx.compose.ui.unit.dp
import androidx.compose.ui.window.Dialog
import androidx.compose.ui.window.Popup
import androidx.compose.ui.window.PopupProperties
import dev.appu.laluzgarage.ui.components.DialogTextButton
import dev.appu.laluzgarage.ui.components.LaluzIcons
import dev.appu.laluzgarage.ui.theme.LaluzShape
import dev.appu.laluzgarage.ui.theme.Spacing
import java.time.LocalDate
import java.time.YearMonth
import java.time.format.DateTimeFormatter
import java.util.Locale

private val MonthYear = DateTimeFormatter.ofPattern("MMMM yyyy", Locale.ENGLISH)
private val Weekdays = listOf("S", "M", "T", "W", "T", "F", "S")

/** "9 Oct" or "9 Oct – 11 Oct": date and month only, no weekday. */
fun dateRangeShortText(from: LocalDate, to: LocalDate?): String =
    if (to == null || to == from) from.shortLabel() else from.shortLabel() + " – " + to.shortLabel()

/** Active date filter badge next to the toolbar buttons: 32dp, 12sp label, tap to clear. */
@Composable
fun DateRangeChip(from: LocalDate, to: LocalDate?, onClear: () -> Unit, modifier: Modifier = Modifier) {
    val cs = MaterialTheme.colorScheme
    val text = dateRangeShortText(from, to)
    Surface(
        onClick = onClear,
        shape = CircleShape,
        color = cs.secondaryContainer,
        contentColor = cs.onSecondaryContainer,
        modifier = modifier
            .height(32.dp)
            .semantics { contentDescription = "Clear date filter: $text" }
    ) {
        Row(
            Modifier.padding(start = Spacing.sm, end = 10.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(Spacing.xs)
        ) {
            Text(text, style = MaterialTheme.typography.labelMedium)
            Icon(LaluzIcons.Close, contentDescription = null, modifier = Modifier.size(16.dp))
        }
    }
}

/**
 * Range calendar in a popup under the toolbar, built to the same shapes as the intake date picker
 * (28dp container, 48dp cells with 40dp day circles): tap a day for one date, a second day for a range.
 * Days that have jobs carry a dot. Outside taps dismiss it. [centered] shows it as a dialog in the
 * middle of the screen, over a scrim, instead.
 */
@Composable
fun DateRangePopup(
    from: LocalDate?,
    to: LocalDate?,
    arrivalDays: Set<LocalDate> = emptySet(),
    centered: Boolean = false,
    onChange: (LocalDate?, LocalDate?) -> Unit,
    onDismiss: () -> Unit
) {
    val cs = MaterialTheme.colorScheme
    var month by remember { mutableStateOf(YearMonth.from(from ?: LocalDate.now())) }
    val lo = from
    val hi = if (from == null) null else (to ?: from)
    val dropPx = with(LocalDensity.current) { 52.dp.roundToPx() }

    val headline = when {
        lo == null || hi == null -> "Select dates"
        lo == hi -> lo.weekdayLabel()
        else -> dateRangeShortText(lo, hi)
    }
    val hint = when {
        lo == null || hi == null -> "Tap a day, or tap two days for a range."
        lo == hi -> "Tap another day to make a range."
        else -> "Showing ${lo.weekdayLabel()} to ${hi.weekdayLabel()}."
    }

    fun pick(day: LocalDate) {
        when {
            from == null || (to != null && to != from) -> onChange(day, null)
            day == from -> onChange(day, day)
            else -> onChange(minOf(from, day), maxOf(from, day))
        }
    }

    val card: @Composable () -> Unit = {
        Column(
            Modifier
                .width(358.dp)
                .shadow(6.dp, LaluzShape.hero)
                .clip(LaluzShape.hero)
                .background(cs.surfaceContainerHigh)
                .padding(start = Spacing.sm, end = Spacing.sm, top = Spacing.xl, bottom = Spacing.sm),
            verticalArrangement = Arrangement.spacedBy(Spacing.xs)
        ) {
            Column(Modifier.padding(horizontal = Spacing.sm), verticalArrangement = Arrangement.spacedBy(Spacing.xxs)) {
                Text("Arrival date", style = MaterialTheme.typography.labelLarge, color = cs.onSurfaceVariant)
                Text(headline, style = MaterialTheme.typography.headlineMedium, color = cs.onSurface)
            }
            HorizontalDivider(thickness = 1.dp, color = cs.outlineVariant, modifier = Modifier.padding(top = Spacing.xs))
            Row(Modifier.padding(start = Spacing.sm), verticalAlignment = Alignment.CenterVertically) {
                Text(
                    month.format(MonthYear),
                    style = MaterialTheme.typography.titleMedium,
                    color = cs.onSurface,
                    modifier = Modifier
                        .weight(1f)
                        .semantics { liveRegion = LiveRegionMode.Polite }
                )
                IconButton(onClick = { month = month.minusMonths(1) }, modifier = Modifier.size(48.dp)) {
                    Icon(LaluzIcons.ChevronLeft, contentDescription = "Previous month", tint = cs.onSurface)
                }
                IconButton(onClick = { month = month.plusMonths(1) }, modifier = Modifier.size(48.dp)) {
                    Icon(LaluzIcons.ChevronRight, contentDescription = "Next month", tint = cs.onSurface)
                }
            }
            Column {
                Row(Modifier.clearAndSetSemantics { }) {
                    Weekdays.forEach { w ->
                        Box(Modifier.weight(1f).height(32.dp), contentAlignment = Alignment.Center) {
                            Text(w, style = MaterialTheme.typography.labelMedium, color = cs.onSurfaceVariant)
                        }
                    }
                }
                // Sunday-first grid: leading blanks, then each day of the month, padded to whole weeks.
                val lead = month.atDay(1).dayOfWeek.value % 7
                val days: List<LocalDate?> = List(lead) { null } + (1..month.lengthOfMonth()).map { month.atDay(it) }
                days.chunked(7).forEach { week ->
                    Row {
                        for (i in 0 until 7) {
                            val day = week.getOrNull(i)
                            if (day == null) {
                                Spacer(Modifier.weight(1f).height(48.dp))
                            } else {
                                DayCell(
                                    day = day,
                                    isEnd = lo != null && (day == lo || day == hi),
                                    inBand = lo != null && hi != null && lo != hi && !day.isBefore(lo) && !day.isAfter(hi),
                                    isStart = day == lo,
                                    isLast = day == hi,
                                    hasJobs = day in arrivalDays,
                                    onClick = { pick(day) },
                                    modifier = Modifier.weight(1f)
                                )
                            }
                        }
                    }
                }
            }
            Text(
                hint,
                style = MaterialTheme.typography.bodySmall,
                color = cs.onSurfaceVariant,
                modifier = Modifier.padding(horizontal = Spacing.sm)
            )
            Row(
                Modifier
                    .fillMaxWidth()
                    .padding(top = Spacing.xxs),
                horizontalArrangement = Arrangement.spacedBy(Spacing.xs, Alignment.End)
            ) {
                DialogTextButton("Clear", cs.tertiary) { onChange(null, null) }
                DialogTextButton("Done", cs.tertiary, onDismiss)
            }
        }
    }

    if (centered) {
        Dialog(onDismissRequest = onDismiss) { card() }
    } else {
        Popup(
            alignment = Alignment.TopEnd,
            offset = IntOffset(0, dropPx),
            onDismissRequest = onDismiss,
            properties = PopupProperties(focusable = true)
        ) { card() }
    }
}

/** 48dp cell with a 40dp day circle; the range band runs edge to edge behind it, capped at both ends. */
@Composable
private fun DayCell(
    day: LocalDate,
    isEnd: Boolean,
    inBand: Boolean,
    isStart: Boolean,
    isLast: Boolean,
    hasJobs: Boolean,
    onClick: () -> Unit,
    modifier: Modifier = Modifier
) {
    val cs = MaterialTheme.colorScheme
    val bandShape = RoundedCornerShape(
        topStartPercent = if (isStart) 50 else 0,
        bottomStartPercent = if (isStart) 50 else 0,
        topEndPercent = if (isLast) 50 else 0,
        bottomEndPercent = if (isLast) 50 else 0
    )
    Box(
        modifier
            .height(48.dp)
            .then(if (inBand) Modifier.padding(vertical = 4.dp).background(cs.secondaryContainer, bandShape) else Modifier)
            .clickable(role = Role.Button, onClick = onClick)
            .semantics {
                selected = isEnd
                contentDescription = day.weekdayLabel() + if (hasJobs) ", has jobs" else ""
            },
        contentAlignment = Alignment.Center
    ) {
        Box(
            Modifier
                .size(40.dp)
                .clip(CircleShape)
                .then(if (isEnd) Modifier.background(cs.primary) else Modifier),
            contentAlignment = Alignment.Center
        ) {
            Text(
                day.dayOfMonth.toString(),
                style = MaterialTheme.typography.bodyMedium.copy(fontWeight = if (isEnd) FontWeight.Bold else FontWeight.Normal),
                color = when {
                    isEnd -> cs.onPrimary
                    inBand -> cs.onSecondaryContainer
                    else -> cs.onSurface
                }
            )
        }
        Box(
            Modifier
                .align(Alignment.BottomCenter)
                .padding(bottom = 3.dp)
                .size(4.dp)
                .clip(CircleShape)
                .background(if (hasJobs) (if (isEnd) cs.onPrimary else cs.primary) else Color.Transparent)
        )
    }
}
