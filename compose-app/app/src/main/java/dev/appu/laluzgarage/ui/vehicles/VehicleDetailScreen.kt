package dev.appu.laluzgarage.ui.vehicles

import dev.appu.laluzgarage.ui.components.rememberContainerSource
import dev.appu.laluzgarage.ui.components.containerSource
import dev.appu.laluzgarage.ui.components.LocalContainerTransform
import androidx.activity.compose.BackHandler
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.imePadding
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material3.SnackbarHost
import androidx.compose.material3.SnackbarHostState
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.rememberModalBottomSheetState
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
import androidx.compose.ui.platform.LocalUriHandler
import androidx.compose.ui.semantics.heading
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import dev.appu.laluzgarage.data.model.Customer
import dev.appu.laluzgarage.data.model.ServiceRecord
import dev.appu.laluzgarage.data.model.Vehicle
import dev.appu.laluzgarage.ui.components.ChipTone
import dev.appu.laluzgarage.ui.components.ContactRow
import dev.appu.laluzgarage.ui.components.DeleteEditBar
import dev.appu.laluzgarage.ui.components.DetailField
import dev.appu.laluzgarage.ui.components.DetailTopBar
import dev.appu.laluzgarage.ui.components.LaluzConfirmDialog
import dev.appu.laluzgarage.ui.components.LaluzFilledField
import dev.appu.laluzgarage.ui.components.LaluzFilterChip
import dev.appu.laluzgarage.ui.components.LaluzIcons
import dev.appu.laluzgarage.ui.components.MaxContentWidth
import dev.appu.laluzgarage.ui.components.PillButton
import dev.appu.laluzgarage.ui.components.PinBadge
import dev.appu.laluzgarage.ui.components.SectionCard
import dev.appu.laluzgarage.ui.components.StatusChip
import dev.appu.laluzgarage.ui.components.WavyDivider
import dev.appu.laluzgarage.ui.components.formatGrouped
import dev.appu.laluzgarage.ui.components.formatInrWhole
import dev.appu.laluzgarage.ui.services.JobStatus
import dev.appu.laluzgarage.ui.services.VehicleSecurity
import dev.appu.laluzgarage.ui.services.buildWhatsAppUrl
import dev.appu.laluzgarage.ui.services.displayName
import dev.appu.laluzgarage.ui.services.formatPhone
import dev.appu.laluzgarage.ui.services.formatPlate
import dev.appu.laluzgarage.ui.services.jobStatus
import dev.appu.laluzgarage.ui.services.modelWithColor
import dev.appu.laluzgarage.ui.services.parseRecordDate
import dev.appu.laluzgarage.ui.services.parseTasks
import dev.appu.laluzgarage.ui.services.security
import dev.appu.laluzgarage.ui.services.weekdayLabel
import dev.appu.laluzgarage.ui.theme.LaluzTheme
import dev.appu.laluzgarage.ui.theme.LaluzType
import dev.appu.laluzgarage.ui.theme.Spacing

@Composable
fun VehicleDetailScreen(
    vehicle: Vehicle,
    customer: Customer?,
    records: List<ServiceRecord>,
    message: String?,
    onMessageShown: () -> Unit,
    onBack: () -> Unit,
    onOpenRecord: (ServiceRecord) -> Unit,
    onSave: (Vehicle, onSaved: () -> Unit) -> Unit,
    onDelete: () -> Unit
) {
    val cs = MaterialTheme.colorScheme
    val ext = LaluzTheme.extendedColors
    val uriHandler = LocalUriHandler.current
    val scroll = rememberScrollState()
    val scrolled by remember { derivedStateOf { scroll.value > 0 } }
    val snackbar = remember { SnackbarHostState() }
    var editing by rememberSaveable { mutableStateOf(false) }
    var confirmDelete by rememberSaveable { mutableStateOf(false) }
    BackHandler(onBack = onBack)

    LaunchedEffect(message) {
        if (message != null) {
            snackbar.showSnackbar(message)
            onMessageShown()
        }
    }

    // Newest job first; the value counts every recorded job's total.
    val history = remember(records) {
        records.sortedByDescending { it.date }
    }
    val totalValue = remember(history) { history.sumOf { it.totalCost } }
    val phone = customer?.phone.orEmpty()

    Box(Modifier.fillMaxSize().background(cs.surface)) {
        Column(Modifier.fillMaxSize()) {
            DetailTopBar("Vehicle", "Back to vehicles", onBack, scrolled)
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
                        Text(formatPlate(vehicle.plateNumber), style = LaluzType.plateLarge, color = cs.onSurface, modifier = Modifier.semantics { heading() })
                        Column(
                            Modifier.padding(top = Spacing.sm),
                            verticalArrangement = Arrangement.spacedBy(Spacing.md)
                        ) {
                            Row(horizontalArrangement = Arrangement.spacedBy(Spacing.md)) {
                                DetailField("Make", value = vehicle.make.ifBlank { "—" }, modifier = Modifier.weight(1f))
                                DetailField("Model", value = vehicle.model.ifBlank { "—" }, modifier = Modifier.weight(1f))
                            }
                            Row(horizontalArrangement = Arrangement.spacedBy(Spacing.md)) {
                                DetailField("Colour", value = vehicle.color.ifBlank { "—" }, modifier = Modifier.weight(1f))
                                DetailField("Security", modifier = Modifier.weight(1f)) {
                                    when (val s = vehicle.security()) {
                                        is VehicleSecurity.Pin -> PinBadge(s.value)
                                        VehicleSecurity.PhysicalKey -> Text("Physical key", style = MaterialTheme.typography.titleMedium, color = cs.onSurface)
                                        VehicleSecurity.Unknown -> Text("Not recorded", style = MaterialTheme.typography.titleMedium, color = cs.onSurfaceVariant)
                                    }
                                }
                            }
                        }
                    }

                    Column(
                        Modifier.padding(start = Spacing.md, end = Spacing.md, bottom = Spacing.xl),
                        verticalArrangement = Arrangement.spacedBy(Spacing.xs)
                    ) {
                        // Owner and maintenance summary share one card
                        SectionCard(title = null, contentPadding = PaddingValues(0.dp), gap = 0.dp) {
                            ContactRow(
                                label = "Owner",
                                name = customer.displayName(),
                                phone = if (phone.isNotBlank()) formatPhone(phone) else "",
                                onCall = { uriHandler.openUri("tel:" + phone.filter { it.isDigit() || it == '+' }) },
                                onWhatsApp = { buildWhatsAppUrl(phone)?.let(uriHandler::openUri) }
                            )
                            HorizontalDivider(Modifier.padding(horizontal = Spacing.lg), thickness = 1.dp, color = cs.outlineVariant)
                            Row(Modifier.padding(Spacing.lg), horizontalArrangement = Arrangement.spacedBy(Spacing.md)) {
                                SummaryFigure("Total maintenance value", formatInrWhole(totalValue), Modifier.weight(1f))
                                SummaryFigure("Recorded jobs", history.size.toString(), Modifier.weight(1f))
                            }
                        }

                        // Service history
                        SectionCard(
                            title = "Service history · ${history.size} ${if (history.size == 1) "job" else "jobs"}",
                            contentPadding = PaddingValues(start = Spacing.lg, end = Spacing.lg, top = Spacing.lg, bottom = Spacing.xxs),
                            gap = Spacing.xxs
                        ) {
                            if (history.isEmpty()) {
                                Text(
                                    "No jobs recorded for this vehicle yet.",
                                    style = MaterialTheme.typography.bodyMedium,
                                    color = cs.onSurfaceVariant,
                                    modifier = Modifier.padding(top = Spacing.sm, bottom = Spacing.lg)
                                )
                            }
                            history.forEachIndexed { i, record ->
                                HistoryRow(record = record, showDivider = i > 0, onOpen = onOpenRecord)
                            }
                        }
                    }
                }
            }
            DeleteEditBar(
                deleteLabel = "Delete vehicle",
                editLabel = "Edit vehicle",
                onDelete = { confirmDelete = true },
                onEdit = { editing = true }
            )
        }
        SnackbarHost(
            snackbar,
            modifier = Modifier
                .align(Alignment.BottomCenter)
                .navigationBarsPadding()
                .padding(bottom = 96.dp)
        )
    }

    if (confirmDelete) {
        LaluzConfirmDialog(
            title = "Delete vehicle?",
            body = "${formatPlate(vehicle.plateNumber)} is removed from the vehicle list. Its job cards stay in Services.",
            confirmText = "Delete",
            dismissText = "Cancel",
            onConfirm = { confirmDelete = false; onDelete() },
            onDismiss = { confirmDelete = false }
        )
    }

    if (editing) {
        VehicleEditSheet(
            vehicle = vehicle,
            onDismiss = { editing = false },
            onSave = { updated -> onSave(updated) { editing = false } }
        )
    }
}

/** 12/16 caption over a 28/36 extra-bold figure. */
@Composable
private fun SummaryFigure(label: String, value: String, modifier: Modifier = Modifier) {
    val cs = MaterialTheme.colorScheme
    Column(modifier, verticalArrangement = Arrangement.spacedBy(Spacing.xxs)) {
        Text(label, style = MaterialTheme.typography.bodySmall, color = cs.onSurfaceVariant)
        Text(value, style = LaluzType.valueLarge, color = cs.onSurface)
    }
}

/** One job in the service history: date and status, invoiced total, notes, figures and parts. */
@Composable
private fun HistoryRow(record: ServiceRecord, showDivider: Boolean, onOpen: (ServiceRecord) -> Unit) {
    val cs = MaterialTheme.colorScheme
    val source = rememberContainerSource()
    val container = LocalContainerTransform.current
    val status = record.jobStatus
    val (chipLabel, chipTone) = when (status) {
        JobStatus.COMPLETED -> "Delivered" to ChipTone.COMPLETED
        else -> status.label to status.tone
    }
    val notes = remember(record.description) { parseTasks(record.description).joinToString("\n") { it.text } }
    val odometer = when {
        record.isDeadVehicle -> "Dead vehicle"
        record.isUnknownMileage -> "Unknown"
        else -> formatGrouped((record.completionMileage ?: record.mileage).toLong()) + " km"
    }
    Surface(
        onClick = { container.from("job:${record.id}", source); onOpen(record) },
        color = cs.surfaceContainerLow,
        contentColor = cs.onSurface,
        modifier = Modifier.containerSource(source, 0.dp)
    ) {
        Column(
            Modifier
                .fillMaxWidth()
                .padding(top = Spacing.sm, bottom = Spacing.lg),
            verticalArrangement = Arrangement.spacedBy(Spacing.md)
        ) {
            if (showDivider) WavyDivider(color = cs.onSurfaceVariant)
            Row(verticalAlignment = Alignment.Top, horizontalArrangement = Arrangement.spacedBy(Spacing.sm)) {
                Column(Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(Spacing.xs)) {
                    Text(
                        parseRecordDate(record.date)?.weekdayLabel() ?: "—",
                        style = MaterialTheme.typography.titleMedium.copy(fontWeight = androidx.compose.ui.text.font.FontWeight.Bold),
                        color = cs.onSurface
                    )
                    StatusChip(chipLabel, chipTone)
                }
                Column(horizontalAlignment = Alignment.End) {
                    Text(if (status == JobStatus.COMPLETED) "Invoiced" else "Est.", style = MaterialTheme.typography.bodySmall, color = cs.onSurfaceVariant)
                    Text(formatInrWhole(record.totalCost), style = MaterialTheme.typography.titleMedium, color = cs.onSurface)
                }
            }
            HistoryText("Complaint and repair notes", notes.ifEmpty { "No notes recorded" })
            Row(horizontalArrangement = Arrangement.spacedBy(Spacing.sm)) {
                HistoryFigure("Odometer", odometer, MaterialTheme.typography.labelLarge, Modifier.weight(1f))
                HistoryFigure("Labour", formatInrWhole(record.laborCost), MaterialTheme.typography.labelLarge, Modifier.weight(1f))
                HistoryFigure("Parts", formatInrWhole(record.partsCost), MaterialTheme.typography.labelLarge, Modifier.weight(1f))
            }
            HistoryText(
                "Parts used",
                record.partsUsed.joinToString("\n") { "${it.name} × ${it.quantity}" }.ifEmpty { "No parts used" }
            )
        }
    }
}

@Composable
private fun HistoryText(label: String, value: String) {
    val cs = MaterialTheme.colorScheme
    Column(verticalArrangement = Arrangement.spacedBy(2.dp)) {
        Text(label, style = MaterialTheme.typography.bodySmall, color = cs.onSurfaceVariant)
        Text(value, style = MaterialTheme.typography.bodyMedium, color = cs.onSurface)
    }
}

@Composable
private fun HistoryFigure(label: String, value: String, style: androidx.compose.ui.text.TextStyle, modifier: Modifier) {
    val cs = MaterialTheme.colorScheme
    Column(modifier) {
        Text(label, style = MaterialTheme.typography.bodySmall, color = cs.onSurfaceVariant)
        Text(value, style = style, color = cs.onSurface, maxLines = 1)
    }
}

/** Edit sheet: the vehicle fields the intake records, in the intake's filled-field style. */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun VehicleEditSheet(vehicle: Vehicle, onDismiss: () -> Unit, onSave: (Vehicle) -> Unit) {
    val cs = MaterialTheme.colorScheme
    val sheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true)
    val initialKey = vehicle.security() !is VehicleSecurity.Pin
    var make by rememberSaveable { mutableStateOf(vehicle.make) }
    var model by rememberSaveable { mutableStateOf(vehicle.model) }
    var colour by rememberSaveable { mutableStateOf(vehicle.color) }
    var plate by rememberSaveable { mutableStateOf(vehicle.plateNumber) }
    var physicalKey by rememberSaveable { mutableStateOf(initialKey) }
    var pin by rememberSaveable { mutableStateOf((vehicle.security() as? VehicleSecurity.Pin)?.value.orEmpty()) }
    val valid = make.isNotBlank() && plate.isNotBlank() && (physicalKey || pin.isNotBlank())

    ModalBottomSheet(onDismissRequest = onDismiss, sheetState = sheetState, containerColor = cs.surfaceContainerLow) {
        Column(
            Modifier
                .verticalScroll(rememberScrollState())
                .imePadding()
                .padding(start = Spacing.xl, end = Spacing.xl, bottom = Spacing.xl),
            verticalArrangement = Arrangement.spacedBy(Spacing.lg)
        ) {
            Text("Edit vehicle", style = MaterialTheme.typography.titleLarge, color = cs.onSurface, modifier = Modifier.semantics { heading() })
            LaluzFilledField(make, { make = it }, "Make", "e.g. Honda")
            LaluzFilledField(model, { model = it }, "Model", "e.g. Activa 6G")
            LaluzFilledField(plate, { plate = it.replace(" ", "").uppercase() }, "Plate number", "MH12AB1234", textStyle = LaluzType.plate)
            LaluzFilledField(colour, { colour = it }, "Colour", "e.g. Pearl White")
            Column(verticalArrangement = Arrangement.spacedBy(Spacing.sm)) {
                LaluzFilledField(
                    value = if (physicalKey) "Physical key" else pin,
                    onValueChange = { if (!physicalKey && (it.isEmpty() || (it.length <= 6 && it.all(Char::isDigit)))) pin = it },
                    label = "Security",
                    placeholder = "4 to 6 digit PIN",
                    keyboardType = KeyboardType.NumberPassword,
                    textStyle = if (physicalKey) MaterialTheme.typography.bodyLarge else LaluzType.pin
                )
                Row {
                    LaluzFilterChip("Physical key", physicalKey, onClick = { physicalKey = !physicalKey; pin = "" })
                }
            }
            PillButton(
                text = "Save vehicle",
                onClick = {
                    onSave(
                        vehicle.copy(
                            make = make,
                            model = model,
                            color = colour,
                            plateNumber = plate,
                            passwordOrPin = if (physicalKey) "Physical Key" else pin
                        )
                    )
                },
                enabled = valid,
                containerColor = cs.primary,
                contentColor = cs.onPrimary,
                modifier = Modifier.fillMaxWidth()
            )
        }
    }
}
