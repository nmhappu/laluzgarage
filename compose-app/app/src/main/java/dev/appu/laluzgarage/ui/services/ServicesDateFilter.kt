package dev.appu.laluzgarage.ui.services

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material3.DatePickerDialog
import androidx.compose.material3.DateRangePicker
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.rememberDateRangePickerState
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.unit.dp
import dev.appu.laluzgarage.ui.components.LaluzIcons
import dev.appu.laluzgarage.ui.theme.Spacing
import java.time.Instant
import java.time.LocalDate
import java.time.ZoneOffset

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
 * Material 3 date range picker in a dialog: tap a start day, then an end day (a start day alone filters
 * to that single date). Save applies, Clear removes the filter, Cancel keeps the current one.
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun DateRangePopup(
    from: LocalDate?,
    to: LocalDate?,
    onChange: (LocalDate?, LocalDate?) -> Unit,
    onDismiss: () -> Unit
) {
    val state = rememberDateRangePickerState(
        initialSelectedStartDateMillis = from?.toUtcMillis(),
        initialSelectedEndDateMillis = (to ?: from)?.toUtcMillis(),
        initialDisplayedMonthMillis = (from ?: LocalDate.now()).toUtcMillis()
    )
    DatePickerDialog(
        onDismissRequest = onDismiss,
        confirmButton = {
            TextButton(
                enabled = state.selectedStartDateMillis != null,
                onClick = {
                    val start = state.selectedStartDateMillis?.toUtcDate()
                    val end = state.selectedEndDateMillis?.toUtcDate() ?: start
                    onChange(start, end)
                    onDismiss()
                }
            ) { Text("Save") }
        },
        dismissButton = {
            Row {
                TextButton(onClick = { onChange(null, null); onDismiss() }) { Text("Clear") }
                TextButton(onClick = onDismiss) { Text("Cancel") }
            }
        }
    ) {
        DateRangePicker(state = state, modifier = Modifier.weight(1f, fill = false))
    }
}

private fun LocalDate.toUtcMillis(): Long = atStartOfDay(ZoneOffset.UTC).toInstant().toEpochMilli()

private fun Long.toUtcDate(): LocalDate = Instant.ofEpochMilli(this).atZone(ZoneOffset.UTC).toLocalDate()
