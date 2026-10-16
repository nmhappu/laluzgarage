package dev.appu.laluzgarage.ui.intake

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.material3.ripple
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.semantics.LiveRegionMode
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.semantics.clearAndSetSemantics
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.disabled
import androidx.compose.ui.semantics.liveRegion
import androidx.compose.ui.semantics.role
import androidx.compose.ui.semantics.selected
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.window.Dialog
import androidx.compose.ui.window.DialogProperties
import dev.appu.laluzgarage.ui.components.DialogScrim
import dev.appu.laluzgarage.ui.components.DialogTextButton
import dev.appu.laluzgarage.ui.components.LaluzIcons
import dev.appu.laluzgarage.ui.services.weekdayLabel
import dev.appu.laluzgarage.ui.theme.LaluzShape
import dev.appu.laluzgarage.ui.theme.Spacing
import java.time.LocalDate
import java.time.YearMonth
import java.time.format.DateTimeFormatter
import java.util.Locale

private val MonthYear = DateTimeFormatter.ofPattern("MMMM yyyy", Locale.ENGLISH)
private val LongDay = DateTimeFormatter.ofPattern("EEEE, d MMMM yyyy", Locale.ENGLISH)
private val Weekdays = listOf("S", "M", "T", "W", "T", "F", "S")

/**
 * Docked date picker from the intake artboard: label and selected-date headline, month row with
 * previous / next, a Sunday-first 7-column grid of 48dp cells with 40dp day circles, Cancel / OK.
 * Dates only, never a time of day. Days failing [isAllowed] are disabled.
 */
@Composable
fun IntakeDatePicker(
    label: String,
    initial: LocalDate?,
    today: LocalDate,
    isAllowed: (LocalDate) -> Boolean,
    onDismiss: () -> Unit,
    onConfirm: (LocalDate) -> Unit
) {
    val cs = MaterialTheme.colorScheme
    var selected by remember { mutableStateOf(initial) }
    var month by remember { mutableStateOf(YearMonth.from(initial ?: today)) }

    Dialog(onDismissRequest = onDismiss, properties = DialogProperties(usePlatformDefaultWidth = false)) {
        DialogScrim()
        Box(Modifier.fillMaxWidth().padding(horizontal = Spacing.md), contentAlignment = Alignment.Center) {
            Column(
                Modifier
                    .widthIn(max = 420.dp)
                    .fillMaxWidth()
                    .background(cs.surfaceContainerHigh, LaluzShape.hero)
                    .padding(start = Spacing.sm, end = Spacing.sm, top = Spacing.xl, bottom = Spacing.sm),
                verticalArrangement = Arrangement.spacedBy(Spacing.xs)
            ) {
                Column(Modifier.padding(horizontal = Spacing.sm), verticalArrangement = Arrangement.spacedBy(Spacing.xxs)) {
                    Text(label, style = MaterialTheme.typography.labelLarge, color = cs.onSurfaceVariant)
                    Text(
                        selected?.weekdayLabel() ?: "Select date",
                        style = MaterialTheme.typography.headlineMedium,
                        color = cs.onSurface
                    )
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
                    val leading = month.atDay(1).dayOfWeek.value % 7 // Sunday = 0
                    val cells = List(leading) { null } + (1..month.lengthOfMonth()).map { month.atDay(it) }
                    cells.chunked(7).forEach { week ->
                        Row {
                            week.forEach { day ->
                                Box(Modifier.weight(1f).height(48.dp), contentAlignment = Alignment.Center) {
                                    if (day != null) {
                                        DayCell(
                                            day = day,
                                            isSelected = day == selected,
                                            isToday = day == today,
                                            enabled = isAllowed(day),
                                            onClick = { selected = day }
                                        )
                                    }
                                }
                            }
                            repeat(7 - week.size) { Spacer(Modifier.weight(1f).height(48.dp)) }
                        }
                    }
                }
                Row(
                    Modifier
                        .fillMaxWidth()
                        .padding(top = Spacing.xxs),
                    horizontalArrangement = Arrangement.spacedBy(Spacing.xs, Alignment.End)
                ) {
                    DialogTextButton("Cancel", cs.tertiary, onDismiss)
                    DialogTextButton("OK", cs.tertiary) { selected?.let(onConfirm) ?: onDismiss() }
                }
            }
        }
    }
}

@Composable
private fun DayCell(day: LocalDate, isSelected: Boolean, isToday: Boolean, enabled: Boolean, onClick: () -> Unit) {
    val cs = MaterialTheme.colorScheme
    val textColor = when {
        isSelected -> cs.onPrimary
        !enabled -> cs.onSurface.copy(alpha = 0.38f)
        else -> cs.onSurface
    }
    Box(
        Modifier
            .size(48.dp)
            .clickable(
                interactionSource = remember { MutableInteractionSource() },
                indication = ripple(bounded = false, radius = 20.dp),
                enabled = enabled,
                onClick = onClick
            )
            .semantics {
                contentDescription = day.format(LongDay)
                role = Role.Button
                selected = isSelected
                if (!enabled) disabled()
            },
        contentAlignment = Alignment.Center
    ) {
        Box(
            Modifier
                .size(40.dp)
                .background(if (isSelected) cs.primary else Color.Transparent, CircleShape)
                .border(1.dp, if (isToday && !isSelected && enabled) cs.primary else Color.Transparent, CircleShape),
            contentAlignment = Alignment.Center
        ) {
            Text(
                day.dayOfMonth.toString(),
                style = if (isSelected) MaterialTheme.typography.bodyMedium.copy(fontWeight = FontWeight.Bold) else MaterialTheme.typography.bodyMedium,
                color = textColor
            )
        }
    }
}
