package dev.appu.laluzgarage.ui.services

import androidx.activity.compose.BackHandler
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.imePadding
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.SnackbarHost
import androidx.compose.material3.SnackbarHostState
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.derivedStateOf
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.heading
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.input.KeyboardCapitalization
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import dev.appu.laluzgarage.data.model.ServiceRecord
import dev.appu.laluzgarage.data.model.Vehicle
import dev.appu.laluzgarage.ui.components.BottomActionBar
import dev.appu.laluzgarage.ui.components.BatteryField
import dev.appu.laluzgarage.ui.components.DetailField
import dev.appu.laluzgarage.ui.components.DetailTopBar
import dev.appu.laluzgarage.ui.components.FilterChipTone
import dev.appu.laluzgarage.ui.components.LaluzFilterChip
import dev.appu.laluzgarage.ui.components.LaluzIcons
import dev.appu.laluzgarage.ui.components.MaxContentWidth
import dev.appu.laluzgarage.ui.components.OutlinedPillButton
import dev.appu.laluzgarage.ui.components.PillButton
import dev.appu.laluzgarage.ui.components.PinBadge
import dev.appu.laluzgarage.ui.components.SectionCard
import dev.appu.laluzgarage.ui.intake.DateButton
import dev.appu.laluzgarage.ui.intake.IntakeDatePicker
import dev.appu.laluzgarage.ui.intake.IntakeField
import dev.appu.laluzgarage.ui.theme.LaluzShape
import dev.appu.laluzgarage.ui.theme.LaluzType
import dev.appu.laluzgarage.ui.theme.Spacing
import java.time.LocalDate
import java.time.format.DateTimeFormatter
import java.util.Locale

private val IntakeDateFormat = DateTimeFormatter.ofPattern("EEE, d MMM yyyy", Locale.ENGLISH)

/**
 * Edit job card (from a Services card's Edit button): the job specification as it was issued at
 * intake. Odometer, problems, belongings and the estimated delivery date can change; the
 * intake date is locked once the job card exists.
 */
@Composable
fun JobEditScreen(
    record: ServiceRecord,
    vehicle: Vehicle?,
    message: String?,
    onMessageShown: () -> Unit,
    onBack: () -> Unit,
    onSave: (ServiceRecord, onSaved: () -> Unit) -> Unit
) {
    val cs = MaterialTheme.colorScheme
    val initialProblems = remember(record.id) { parseTasks(record.description).joinToString("\n") { it.text } }
    val initialOdo = remember(record.id) { if (record.isDeadVehicle || record.isUnknownMileage || record.mileage <= 0) "" else record.mileage.toString() }
    val initialDelivery = remember(record.id) { parseRecordDate(record.expectedDeliveryDate) }

    var odometer by rememberSaveable(record.id) { mutableStateOf(initialOdo) }
    var dead by rememberSaveable(record.id) { mutableStateOf(record.isDeadVehicle) }
    var locked by rememberSaveable(record.id) { mutableStateOf(record.isUnknownMileage && !record.isDeadVehicle) }
    var battery by rememberSaveable(record.id) { mutableStateOf(record.battery) }
    var problems by rememberSaveable(record.id) { mutableStateOf(initialProblems) }
    var belongings by rememberSaveable(record.id) { mutableStateOf(record.personalItems.orEmpty()) }
    var delivery by rememberSaveable(record.id) { mutableStateOf(initialDelivery) }
    var picking by rememberSaveable { mutableStateOf(false) }
    var showOdoError by rememberSaveable { mutableStateOf(false) }
    var saving by remember { mutableStateOf(false) }

    val dirty = odometer != initialOdo || battery != record.battery || dead != record.isDeadVehicle ||
        locked != (record.isUnknownMileage && !record.isDeadVehicle) ||
        problems != initialProblems || belongings != record.personalItems.orEmpty() || delivery != initialDelivery
    val special = dead || locked
    val intakeDate = parseRecordDate(record.date)
    val today = LocalDate.now()

    val scroll = rememberScrollState()
    val scrolled by remember { derivedStateOf { scroll.value > 0 } }
    val snackbar = remember { SnackbarHostState() }
    BackHandler(onBack = onBack)
    LaunchedEffect(message) {
        if (message != null) {
            snackbar.showSnackbar(message)
            onMessageShown()
            saving = false
        }
    }

    fun save() {
        val reading = odometer.toIntOrNull() ?: 0
        if (!special && reading <= 0) {
            showOdoError = true
            return
        }
        val previous = parseTasks(record.description)
        val tasks = problems.lines().map { it.trim() }.filter { it.isNotEmpty() }
            .mapIndexed { i, t -> TaskLine(t, previous.getOrNull(i)?.done == true) }
        saving = true
        onSave(
            record.copy(
                mileage = if (special) 0 else reading,
                isDeadVehicle = dead,
                isUnknownMileage = locked,
                battery = battery,
                description = serializeTasks(tasks),
                personalItems = belongings.trim().ifBlank { null },
                expectedDeliveryDate = delivery?.toString()
            ),
            onBack
        )
    }

    Box(Modifier.fillMaxSize().background(cs.surface)) {
        // Edge-to-edge: pad for the keyboard so the fields and action bar stay above it.
        Column(Modifier.fillMaxSize().imePadding()) {
            DetailTopBar("Edit job card", "Back to Services", onBack, scrolled)
            Column(
                Modifier
                    .weight(1f)
                    .fillMaxWidth()
                    .verticalScroll(scroll),
                horizontalAlignment = Alignment.CenterHorizontally
            ) {
                Column(Modifier.widthIn(max = MaxContentWidth).fillMaxWidth()) {
                    Column(
                        Modifier.padding(start = Spacing.xl, end = Spacing.xl, top = Spacing.xs, bottom = Spacing.xl),
                        verticalArrangement = Arrangement.spacedBy(Spacing.xs)
                    ) {
                        Text(
                            "Job specification",
                            style = MaterialTheme.typography.headlineMedium,
                            color = cs.onSurface,
                            modifier = Modifier.semantics { heading() }
                        )
                        Text("Update the details for this job card.", style = MaterialTheme.typography.bodyLarge, color = cs.onSurfaceVariant)
                    }

                    Column(
                        Modifier.padding(start = Spacing.md, end = Spacing.md, bottom = Spacing.xxl),
                        verticalArrangement = Arrangement.spacedBy(Spacing.xl)
                    ) {
                        SectionCard("Vehicle") {
                            Row(horizontalArrangement = Arrangement.spacedBy(Spacing.md)) {
                                DetailField("Vehicle", value = vehicle.modelWithColor(), modifier = Modifier.weight(1f))
                                DetailField("Plate", value = formatPlate(vehicle?.plateNumber), valueStyle = LaluzType.plateValue, modifier = Modifier.weight(1f))
                            }
                            Row(horizontalArrangement = Arrangement.spacedBy(Spacing.md)) {
                                DetailField("Security", modifier = Modifier.weight(1f)) {
                                    when (val s = vehicle.security()) {
                                        is VehicleSecurity.Pin -> PinBadge(s.value)
                                        VehicleSecurity.PhysicalKey -> Text("Physical key", style = MaterialTheme.typography.titleMedium, color = cs.onSurface)
                                        VehicleSecurity.Unknown -> Text("Not recorded", style = MaterialTheme.typography.titleMedium, color = cs.onSurfaceVariant)
                                    }
                                }
                                Box(Modifier.weight(1f))
                            }
                        }

                        Column(Modifier.padding(horizontal = Spacing.xs), verticalArrangement = Arrangement.spacedBy(Spacing.lg)) {
                            val odoError = showOdoError && !special && (odometer.toIntOrNull() ?: 0) <= 0
                            IntakeField(
                                value = when {
                                    dead -> "Vehicle dead"
                                    locked -> "Odometer locked"
                                    else -> odometer
                                },
                                onValueChange = { odometer = it.filter(Char::isDigit).take(7) },
                                label = "Odometer reading",
                                placeholder = "e.g. 14250",
                                enabled = !special,
                                isError = odoError,
                                keyboardType = KeyboardType.Number,
                                textStyle = if (special) MaterialTheme.typography.bodyLarge else LaluzType.monoValue,
                                trailing = { Text("km", style = MaterialTheme.typography.bodyMedium, color = cs.onSurfaceVariant) },
                                supporting = {
                                    Text(
                                        if (odoError) "Enter a reading above 0, or choose Dead vehicle or Vehicle locked."
                                        else "Enter the reading, or choose below if it can’t be read.",
                                        style = MaterialTheme.typography.bodySmall,
                                        color = if (odoError) cs.error else cs.onSurfaceVariant,
                                        modifier = Modifier.padding(horizontal = Spacing.xxs)
                                    )
                                },
                                below = {
                                    Row(
                                        horizontalArrangement = Arrangement.spacedBy(Spacing.xs),
                                        modifier = Modifier.semantics { contentDescription = "Odometer not readable" }
                                    ) {
                                        LaluzFilterChip("Dead vehicle", dead, onClick = { dead = !dead; locked = false }, tone = FilterChipTone.ERROR)
                                        LaluzFilterChip("Vehicle locked", locked, onClick = { locked = !locked; dead = false }, tone = FilterChipTone.WARNING)
                                    }
                                }
                            )
                            BatteryField(percent = battery, onPercentChange = { battery = it })
                            IntakeField(
                                value = problems,
                                onValueChange = { problems = it },
                                label = "Problems and requests",
                                placeholder = "Front brake pad replacement\nPeriodic servicing\nWheel alignment",
                                singleLine = false,
                                minLines = 4,
                                capitalization = KeyboardCapitalization.Sentences,
                                supporting = {
                                    Text(
                                        "One per line. Each line becomes a checklist item on the job card.",
                                        style = MaterialTheme.typography.bodySmall,
                                        color = cs.onSurfaceVariant,
                                        modifier = Modifier.padding(horizontal = Spacing.md)
                                    )
                                }
                            )
                            IntakeField(
                                value = belongings,
                                onValueChange = { belongings = it },
                                label = "Belongings left in vehicle",
                                placeholder = "e.g. Helmet, original documents, charging cable",
                                capitalization = KeyboardCapitalization.Sentences
                            )
                            LockedDateField(intakeDate)
                            DateButton("Estimated delivery date", delivery) { picking = true }
                        }
                    }
                }
            }
            BottomActionBar {
                Row(horizontalArrangement = Arrangement.spacedBy(Spacing.xs)) {
                    OutlinedPillButton(
                        text = "Cancel",
                        onClick = onBack,
                        contentColor = cs.onSurface,
                        modifier = Modifier.weight(1f)
                    )
                    PillButton(
                        text = "Save changes",
                        onClick = ::save,
                        containerColor = cs.primary,
                        contentColor = cs.onPrimary,
                        enabled = dirty,
                        loading = saving,
                        modifier = Modifier.weight(1f)
                    )
                }
            }
        }
        SnackbarHost(
            snackbar,
            modifier = Modifier
                .align(Alignment.BottomCenter)
                .navigationBarsPadding()
                .padding(bottom = 96.dp)
        )
    }

    if (picking) {
        IntakeDatePicker(
            label = "Estimated delivery date",
            initial = delivery,
            today = today,
            isAllowed = { day -> !day.isBefore(intakeDate ?: today) },
            onDismiss = { picking = false },
            onConfirm = { day -> delivery = day; picking = false }
        )
    }
}

/** Intake date: the filled field at 72% opacity with a lock icon, plus why it can't change. */
@Composable
private fun LockedDateField(date: LocalDate?) {
    val cs = MaterialTheme.colorScheme
    val text = date?.format(IntakeDateFormat) ?: "Not recorded"
    Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
        Text("Intake date", style = MaterialTheme.typography.labelLarge, color = cs.onSurfaceVariant)
        Row(
            Modifier
                .fillMaxWidth()
                .height(56.dp)
                .alpha(0.72f)
                .background(cs.surfaceContainerHigh, LaluzShape.field)
                .padding(horizontal = Spacing.md)
                .semantics { contentDescription = "Intake date, $text, locked" },
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(Spacing.xs)
        ) {
            Text(text, style = MaterialTheme.typography.bodyLarge, color = cs.onSurfaceVariant, modifier = Modifier.weight(1f))
            Icon(LaluzIcons.Lock, contentDescription = null, tint = cs.onSurfaceVariant, modifier = Modifier.size(24.dp))
        }
        Text(
            "Locked. The intake date can’t be changed after the job card is issued.",
            style = MaterialTheme.typography.bodySmall,
            color = cs.onSurfaceVariant,
            modifier = Modifier.padding(horizontal = Spacing.md)
        )
    }
}
