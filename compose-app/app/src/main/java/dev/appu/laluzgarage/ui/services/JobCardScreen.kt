package dev.appu.laluzgarage.ui.services

import androidx.activity.compose.BackHandler
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.imePadding
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.selection.toggleable
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material3.SnackbarHost
import androidx.compose.material3.SnackbarHostState
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.rememberModalBottomSheetState
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.derivedStateOf
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.ui.platform.LocalContext
import kotlinx.coroutines.launch
import dev.appu.laluzgarage.ui.components.rememberShareCapture
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalUriHandler
import androidx.compose.ui.semantics.LiveRegionMode
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.liveRegion
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.SpanStyle
import androidx.compose.ui.text.buildAnnotatedString
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.withStyle
import androidx.compose.ui.unit.sp
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextDecoration
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import dev.appu.laluzgarage.data.model.Customer
import dev.appu.laluzgarage.data.model.Part
import dev.appu.laluzgarage.data.model.ServiceRecord
import dev.appu.laluzgarage.data.model.Vehicle
import dev.appu.laluzgarage.ui.components.BatteryBadge
import dev.appu.laluzgarage.ui.components.BatteryField
import dev.appu.laluzgarage.ui.components.ChipTone
import dev.appu.laluzgarage.ui.components.ConnectedSegments
import dev.appu.laluzgarage.ui.components.ContactRow
import dev.appu.laluzgarage.ui.components.LaluzConfirmDialog
import dev.appu.laluzgarage.ui.components.DetailField
import dev.appu.laluzgarage.ui.components.LaluzIcons
import dev.appu.laluzgarage.ui.components.LaluzOutlinedField
import dev.appu.laluzgarage.ui.components.LaluzTextButton
import dev.appu.laluzgarage.ui.components.LaluzTopBar
import dev.appu.laluzgarage.ui.components.MaxContentWidth
import dev.appu.laluzgarage.ui.components.OutlinedPillButton
import dev.appu.laluzgarage.ui.components.PillButton
import dev.appu.laluzgarage.ui.components.PinBadge
import dev.appu.laluzgarage.ui.components.SectionCard
import dev.appu.laluzgarage.ui.components.SegmentColors
import dev.appu.laluzgarage.ui.components.StatusChip
import dev.appu.laluzgarage.ui.components.bleedEnd
import dev.appu.laluzgarage.ui.components.formatGrouped
import dev.appu.laluzgarage.ui.components.formatInrWhole
import dev.appu.laluzgarage.ui.theme.GoogleSansFlex
import dev.appu.laluzgarage.ui.theme.LaluzShape
import dev.appu.laluzgarage.ui.theme.LaluzTheme
import dev.appu.laluzgarage.ui.theme.LaluzType
import dev.appu.laluzgarage.ui.theme.Spacing
import java.time.LocalDate
import java.time.ZoneId

/** Status options on the job card. "Delivered" is the label for the stored `completed` status. */
private enum class CardStatus(val status: JobStatus, val label: String) {
    PENDING(JobStatus.PENDING, "Pending"),
    IN_PROGRESS(JobStatus.IN_PROGRESS, "In progress"),
    DELIVERED(JobStatus.COMPLETED, "Delivered")
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun JobCardScreen(
    record: ServiceRecord,
    original: ServiceRecord?,
    vehicle: Vehicle?,
    customer: Customer?,
    availableParts: List<Part>,
    deliveryTemplate: String,
    isDirty: Boolean,
    isSaving: Boolean,
    justSaved: Boolean,
    statusMessage: String?,
    onBack: () -> Unit,
    onStatusChange: (String) -> Unit,
    onToggleTask: (Int) -> Unit,
    onProblemsTextChange: (String) -> Unit,
    onAddPart: (Part) -> Unit,
    onUpdatePartQuantity: (Int, Int) -> Unit,
    onLaborCostChange: (Double) -> Unit,
    onRemarksChange: (String) -> Unit,
    onCompletionMileageChange: (Int?) -> Unit,
    onBatteryChange: (Int?) -> Unit,
    onDiscard: () -> Unit,
    onDelete: () -> Unit,
    onSave: () -> Unit,
    onStatusMessageShown: () -> Unit
) {
    val cs = MaterialTheme.colorScheme
    val ext = LaluzTheme.extendedColors
    val uriHandler = LocalUriHandler.current
    val context = LocalContext.current
    val scope = rememberCoroutineScope()
    val capture = rememberShareCapture()
    val today = remember { LocalDate.now() }
    val scroll = rememberScrollState()
    val scrolled by remember { derivedStateOf { scroll.value > 0 } }
    val snackbar = remember { SnackbarHostState() }
    var confirmLeave by remember { mutableStateOf(false) }
    var showParts by remember { mutableStateOf(false) }
    var confirmDelete by remember { mutableStateOf(false) }

    LaunchedEffect(statusMessage) {
        if (statusMessage != null) {
            snackbar.showSnackbar(statusMessage)
            onStatusMessageShown()
        }
    }
    val leave = { if (isDirty) confirmLeave = true else onBack() }
    BackHandler(onBack = leave)

    val status = record.jobStatus
    val cardStatus = when (status) {
        JobStatus.COMPLETED -> CardStatus.DELIVERED
        JobStatus.IN_PROGRESS -> CardStatus.IN_PROGRESS
        else -> CardStatus.PENDING
    }
    val isDelivered = status == JobStatus.COMPLETED
    val needsOdometer = isDelivered && !record.isDeadVehicle && !record.isUnknownMileage
    val odometerValid = !needsOdometer || (record.completionMileage ?: -1) >= record.mileage
    val tasks = remember(record.description) { parseTasks(record.description) }
    val due = record.dueFlag(today)
    val phone = customer?.phone.orEmpty()

    Box(Modifier.fillMaxSize().background(cs.surface)) {
        Column(Modifier.fillMaxSize().imePadding()) {
            LaluzTopBar(scrolled = scrolled, startPadding = Spacing.xxs) {
                IconButton(onClick = leave, modifier = Modifier.size(48.dp)) {
                    Icon(LaluzIcons.ArrowBackShort, contentDescription = "Back to services", tint = cs.onSurface)
                }
                Text("Job card", style = MaterialTheme.typography.titleLarge, color = cs.onSurface, modifier = Modifier.weight(1f))
                IconButton(
                    onClick = {
                        scope.launch {
                            capture.share(context, "jobcard-" + vehicle?.plateNumber.orEmpty().filter { it.isLetterOrDigit() }, "Share job card")
                        }
                    },
                    modifier = Modifier.size(48.dp)
                ) {
                    Icon(LaluzIcons.Share, contentDescription = "Share job card", tint = cs.onSurface)
                }
                IconButton(onClick = { confirmDelete = true }, modifier = Modifier.size(48.dp)) {
                    Icon(LaluzIcons.Trash, contentDescription = "Delete job card", tint = cs.error)
                }
            }

            Column(
                modifier = Modifier
                    .weight(1f)
                    .fillMaxWidth()
                    .verticalScroll(scroll),
                horizontalAlignment = Alignment.CenterHorizontally
            ) {
                Column(Modifier.widthIn(max = MaxContentWidth).fillMaxWidth()) {
                    // Plate down to the customer card is what the share button captures
                    Column(Modifier.fillMaxWidth().background(cs.surface).then(capture.modifier)) {
                    // Header
                    Column(
                        Modifier.padding(start = Spacing.xl, end = Spacing.xl, top = Spacing.xs, bottom = Spacing.xl),
                        verticalArrangement = Arrangement.spacedBy(Spacing.xs)
                    ) {
                        Text(formatPlate(vehicle?.plateNumber), style = LaluzType.plateLarge, color = cs.onSurface)
                        Column(
                            Modifier.padding(top = Spacing.xxs),
                            verticalArrangement = Arrangement.spacedBy(Spacing.md)
                        ) {
                            Row(horizontalArrangement = Arrangement.spacedBy(Spacing.md)) {
                                DetailField("Model", value = vehicle.modelLabel(), modifier = Modifier.weight(1f))
                                DetailField("Colour", value = vehicle?.color?.ifBlank { null } ?: "—", modifier = Modifier.weight(1f))
                            }
                            Row(horizontalArrangement = Arrangement.spacedBy(Spacing.md)) {
                                DetailField("Security", modifier = Modifier.weight(1f)) {
                                    when (val s = vehicle.security()) {
                                        is VehicleSecurity.Pin -> PinBadge(s.value)
                                        VehicleSecurity.PhysicalKey -> Text("Physical key", style = MaterialTheme.typography.titleMedium, color = cs.onSurface)
                                        VehicleSecurity.Unknown -> Text("Not recorded", style = MaterialTheme.typography.titleMedium, color = cs.onSurfaceVariant)
                                    }
                                }
                                DetailField("Battery", modifier = Modifier.weight(1f)) {
                                    BatteryBadge(record.battery, Modifier.padding(top = 2.dp))
                                }
                            }
                        }
                        Row(Modifier.padding(top = Spacing.xxs), horizontalArrangement = Arrangement.spacedBy(Spacing.xs)) {
                            StatusChip(
                                cardStatus.label,
                                when (cardStatus) {
                                    CardStatus.PENDING -> ChipTone.PENDING
                                    CardStatus.IN_PROGRESS -> ChipTone.IN_PROGRESS
                                    CardStatus.DELIVERED -> ChipTone.DELIVERED
                                }
                            )
                            if (due != null) StatusChip(due.label, if (due.isOverdue) ChipTone.OVERDUE else ChipTone.NEUTRAL)
                        }
                    }

                    Column(Modifier.padding(start = Spacing.md, end = Spacing.md, bottom = Spacing.xs)) {
                        // Customer
                        SectionCard(title = null, contentPadding = PaddingValues(0.dp), gap = 0.dp) {
                            ContactRow(
                                label = "Customer",
                                name = customer.displayName(),
                                phone = phone,
                                onCall = { uriHandler.openUri("tel:" + phone.filter { it.isDigit() || it == '+' }) },
                                onWhatsApp = { buildWhatsAppUrl(phone)?.let(uriHandler::openUri) }
                            )
                        }
                    }
                    }

                    Column(
                        Modifier.padding(start = Spacing.md, end = Spacing.md, bottom = Spacing.xl),
                        verticalArrangement = Arrangement.spacedBy(Spacing.xs)
                    ) {
                        // Dates & odometer
                        SectionCard("Dates, odometer & battery") {
                            val wasDelivered = original?.jobStatus == JobStatus.COMPLETED
                            val deliveredOn = when {
                                !isDelivered -> null
                                wasDelivered -> record.updatedAt?.toDate()?.toInstant()?.atZone(ZoneId.systemDefault())?.toLocalDate() ?: today
                                else -> today
                            }
                            Column(verticalArrangement = Arrangement.spacedBy(Spacing.md)) {
                                Row(horizontalArrangement = Arrangement.spacedBy(Spacing.md)) {
                                    DetailField("Arrived", value = parseRecordDate(record.date)?.weekdayLabel() ?: "—", modifier = Modifier.weight(1f))
                                    DetailField(
                                        "Estimated delivery",
                                        value = parseRecordDate(record.expectedDeliveryDate)?.weekdayLabel() ?: "Not set",
                                        modifier = Modifier.weight(1f)
                                    )
                                }
                                Row(horizontalArrangement = Arrangement.spacedBy(Spacing.md)) {
                                    DetailField(
                                        "Odometer in",
                                        value = when {
                                            record.isDeadVehicle -> "Dead vehicle"
                                            record.isUnknownMileage -> "Unknown"
                                            else -> formatGrouped(record.mileage.toLong()) + " km"
                                        },
                                        modifier = Modifier.weight(1f)
                                    )
                                    DetailField(
                                        "Delivered",
                                        value = deliveredOn?.relativeDayLabel(today) ?: "Not yet",
                                        valueColor = if (deliveredOn != null) cs.primary else cs.onSurfaceVariant,
                                        modifier = Modifier.weight(1f)
                                    )
                                }
                            }
                            BatteryField(percent = record.battery, onPercentChange = onBatteryChange)
                            if (needsOdometer) {
                                OdometerOut(record = record, valid = odometerValid, onChange = onCompletionMileageChange)
                            }
                        }

                        // Problems & requests
                        ProblemsSection(tasks = tasks, onToggleTask = onToggleTask, onProblemsTextChange = onProblemsTextChange)

                        // Parts & spares
                        SectionCard("Parts & spares", gap = Spacing.xs) {
                            // 4dp under the heading (12dp total with the card gap), as on the artboard.
                            Column(Modifier.padding(top = Spacing.xxs), verticalArrangement = Arrangement.spacedBy(Spacing.xs)) {
                            if (record.partsUsed.isEmpty()) {
                                Text("No parts added yet.", style = MaterialTheme.typography.bodyMedium, color = cs.onSurfaceVariant)
                            }
                            record.partsUsed.forEachIndexed { index, p ->
                                Column {
                                    Row(
                                        Modifier.padding(vertical = Spacing.xs),
                                        verticalAlignment = Alignment.CenterVertically,
                                        horizontalArrangement = Arrangement.spacedBy(Spacing.sm)
                                    ) {
                                        Column(Modifier.weight(1f)) {
                                            Text(p.name, style = MaterialTheme.typography.titleMedium, color = cs.onSurface)
                                            Row {
                                                Text("${formatInrWhole(p.unitPrice)} each · ", style = MaterialTheme.typography.bodyMedium, color = cs.onSurfaceVariant)
                                                Text(
                                                    formatInrWhole(p.total),
                                                    style = MaterialTheme.typography.bodyMedium.copy(fontWeight = FontWeight.Bold),
                                                    color = cs.onSurface
                                                )
                                            }
                                        }
                                        QuantityStepper(
                                            quantity = p.quantity,
                                            name = p.name,
                                            onDecrement = { onUpdatePartQuantity(index, -1) },
                                            onIncrement = { onUpdatePartQuantity(index, 1) }
                                        )
                                    }
                                    HorizontalDivider(thickness = 1.dp, color = cs.outlineVariant)
                                }
                            }
                            }
                            OutlinedPillButton(
                                text = "+ Add part",
                                onClick = { showParts = true },
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .padding(top = Spacing.xs)
                            )
                        }

                        // Remarks for the customer
                        SectionCard("Remarks for the customer", gap = Spacing.xs) {
                            LaluzOutlinedField(
                                value = record.finalRemarks.orEmpty(),
                                onValueChange = onRemarksChange,
                                placeholder = "Advice or notes the customer should see",
                                singleLine = false,
                                minLines = 3,
                                height = null,
                                filled = true,
                                contentPadding = PaddingValues(horizontal = Spacing.md, vertical = Spacing.sm),
                                modifier = Modifier.semantics { contentDescription = "Remarks for the customer" }
                            )
                        }

                        // Bill
                        BillSection(
                            record = record,
                            onLaborCostChange = onLaborCostChange,
                            onSendBill = {
                                val text = formatDeliveryMessage(deliveryTemplate, record, vehicle, customer?.name)
                                buildWhatsAppUrl(phone, text)?.let(uriHandler::openUri)
                            },
                            canSend = phone.isNotBlank()
                        )
                    }
                }
            }

            StatusBar(
                selected = cardStatus,
                onSelect = { onStatusChange(it.status.value) },
                isDirty = isDirty,
                justSaved = justSaved,
                isSaving = isSaving,
                canSave = odometerValid,
                onDiscard = onDiscard,
                onSave = onSave
            )
        }

        SnackbarHost(
            snackbar,
            modifier = Modifier
                .align(Alignment.BottomCenter)
                .navigationBarsPadding()
                .padding(bottom = 180.dp)
        )
    }

    if (confirmLeave) {
        AlertDialog(
            onDismissRequest = { confirmLeave = false },
            title = { Text("Discard changes?") },
            text = { Text("Your edits to this job card haven't been saved.") },
            confirmButton = {
                TextButton(onClick = { confirmLeave = false; onDiscard(); onBack() }) { Text("Discard") }
            },
            dismissButton = {
                TextButton(onClick = { confirmLeave = false }) { Text("Keep editing") }
            },
            containerColor = cs.surfaceContainerHigh,
            shape = LaluzShape.hero
        )
    }

    if (confirmDelete) {
        LaluzConfirmDialog(
            title = "Delete job card?",
            lead = {
                Text(
                    buildAnnotatedString {
                        withStyle(SpanStyle(fontFamily = GoogleSansFlex, fontWeight = FontWeight.Bold, letterSpacing = 1.sp, color = cs.onSurface)) {
                            append(formatPlate(vehicle?.plateNumber))
                        }
                        append(" · " + customer.displayName())
                    },
                    style = MaterialTheme.typography.bodyMedium,
                    color = cs.onSurfaceVariant
                )
            },
            body = "This job card and its tasks are permanently deleted. This can’t be undone.",
            confirmText = "Delete",
            dismissText = "Cancel",
            onConfirm = { confirmDelete = false; onDelete() },
            onDismiss = { confirmDelete = false }
        )
    }

    if (showParts) {
        val sheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true)
        ModalBottomSheet(
            onDismissRequest = { showParts = false },
            sheetState = sheetState,
            containerColor = cs.surfaceContainerLow
        ) {
            Text(
                "Add part",
                style = MaterialTheme.typography.titleLarge,
                color = cs.onSurface,
                modifier = Modifier.padding(horizontal = Spacing.xl, vertical = Spacing.xs)
            )
            Column(
                Modifier
                    .verticalScroll(rememberScrollState())
                    .padding(bottom = Spacing.xl)
            ) {
                if (availableParts.isEmpty()) {
                    Text(
                        "No parts in inventory yet.",
                        style = MaterialTheme.typography.bodyMedium,
                        color = cs.onSurfaceVariant,
                        modifier = Modifier.padding(horizontal = Spacing.xl, vertical = Spacing.md)
                    )
                }
                availableParts.forEach { part ->
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .heightIn(min = 72.dp)
                            .clickable(role = Role.Button) { onAddPart(part); showParts = false }
                            .padding(horizontal = Spacing.xl, vertical = Spacing.xs),
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(Spacing.md)
                    ) {
                        Column(Modifier.weight(1f)) {
                            Text(part.name, style = MaterialTheme.typography.titleMedium, color = cs.onSurface, maxLines = 1, overflow = TextOverflow.Ellipsis)
                            Text(
                                "${part.stockQuantity} in stock" + (part.location.takeIf { it.isNotBlank() }?.let { " · Shelf $it" } ?: ""),
                                style = MaterialTheme.typography.bodyMedium,
                                color = if (part.isLowStock) ext.warning else cs.onSurfaceVariant
                            )
                        }
                        Text(formatInrWhole(part.price), style = MaterialTheme.typography.titleMedium.copy(fontWeight = FontWeight.Bold), color = cs.onSurface)
                    }
                }
            }
        }
    }
}

@Composable
private fun OdometerOut(record: ServiceRecord, valid: Boolean, onChange: (Int?) -> Unit) {
    val cs = MaterialTheme.colorScheme
    val inKm = formatGrouped(record.mileage.toLong())
    val out = record.completionMileage
    val help = when {
        out == null -> "Enter the reading when the customer collects the vehicle."
        !valid -> "Must be at least $inKm km (odometer in)."
        else -> "Driven ${formatGrouped((out - record.mileage).toLong())} km in the shop."
    }
    val isError = out != null && !valid
    Column(verticalArrangement = Arrangement.spacedBy(Spacing.xxs)) {
        Text(
            "Odometer out (required to deliver)",
            style = MaterialTheme.typography.labelMedium,
            color = if (isError) cs.error else cs.primary
        )
        LaluzOutlinedField(
            value = out?.toString().orEmpty(),
            onValueChange = { raw -> onChange(raw.filter { it.isDigit() }.take(7).toIntOrNull()) },
            placeholder = "$inKm or more",
            textStyle = LaluzType.monoValue,
            keyboardType = KeyboardType.Number,
            emphasized = true,
            isError = isError,
            suffix = "km",
            modifier = Modifier.semantics { contentDescription = "Odometer out" }
        )
        Text(
            help,
            style = MaterialTheme.typography.bodySmall,
            color = if (isError) cs.error else cs.onSurfaceVariant,
            modifier = Modifier
                .padding(horizontal = Spacing.md)
                .semantics { liveRegion = LiveRegionMode.Polite }
        )
    }
}

@Composable
private fun ProblemsSection(
    tasks: List<TaskLine>,
    onToggleTask: (Int) -> Unit,
    onProblemsTextChange: (String) -> Unit
) {
    val cs = MaterialTheme.colorScheme
    var editing by rememberSaveable { mutableStateOf(false) }
    var draft by rememberSaveable { mutableStateOf("") }
    SectionCard(
        title = "Problems & requests · ${tasks.count { it.done }} of ${tasks.size} done",
        contentPadding = PaddingValues(start = Spacing.lg, end = Spacing.lg, top = Spacing.sm, bottom = Spacing.sm),
        gap = Spacing.xs,
        titleTrailing = {
            LaluzTextButton(
                text = if (editing) "Done" else "Edit",
                onClick = {
                    if (!editing) draft = tasks.joinToString("\n") { it.text }
                    editing = !editing
                },
                style = LaluzType.labelStrong,
                modifier = Modifier.bleedEnd(Spacing.sm)
            )
        }
    ) {
        if (editing) {
            Column(Modifier.padding(bottom = Spacing.xs), verticalArrangement = Arrangement.spacedBy(Spacing.xxs)) {
                Text("One problem per line", style = MaterialTheme.typography.labelMedium, color = cs.primary)
                LaluzOutlinedField(
                    value = draft,
                    onValueChange = { draft = it; onProblemsTextChange(it) },
                    singleLine = false,
                    minLines = 6,
                    height = null,
                    emphasized = true,
                    contentPadding = PaddingValues(horizontal = Spacing.md, vertical = Spacing.sm),
                    modifier = Modifier.semantics { contentDescription = "Problems, one per line" }
                )
                Text(
                    "Each line becomes its own checklist item.",
                    style = MaterialTheme.typography.bodySmall,
                    color = cs.onSurfaceVariant,
                    modifier = Modifier.padding(horizontal = Spacing.md)
                )
            }
        } else {
            if (tasks.isEmpty()) {
                Text(
                    "No problems recorded. Tap Edit to add them.",
                    style = MaterialTheme.typography.bodyMedium,
                    color = cs.onSurfaceVariant,
                    modifier = Modifier.padding(vertical = Spacing.sm)
                )
            }
            Column {
                tasks.forEachIndexed { i, task ->
                    if (i > 0) HorizontalDivider(thickness = 1.dp, color = cs.outlineVariant)
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .heightIn(min = 56.dp)
                            .toggleable(value = task.done, role = Role.Checkbox, onValueChange = { onToggleTask(i) })
                            .padding(vertical = Spacing.xs),
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(Spacing.md)
                    ) {
                        Box(
                            modifier = Modifier
                                .size(24.dp)
                                .clip(LaluzShape.chip)
                                .background(if (task.done) cs.primary else Color.Transparent)
                                .border(2.dp, if (task.done) cs.primary else cs.outline, LaluzShape.chip),
                            contentAlignment = Alignment.Center
                        ) {
                            if (task.done) Icon(LaluzIcons.CheckHeavy, contentDescription = null, tint = cs.onPrimary, modifier = Modifier.size(14.dp))
                        }
                        Text(
                            task.text,
                            style = MaterialTheme.typography.bodyLarge.copy(
                                textDecoration = if (task.done) TextDecoration.LineThrough else TextDecoration.None
                            ),
                            color = if (task.done) cs.onSurfaceVariant else cs.onSurface
                        )
                    }
                }
            }
        }
    }
}

/** − qty + pill on surfaceContainerHigh with 40dp buttons. */
@Composable
private fun QuantityStepper(quantity: Int, name: String, onDecrement: () -> Unit, onIncrement: () -> Unit) {
    val cs = MaterialTheme.colorScheme
    val style = MaterialTheme.typography.titleLarge
    Row(
        Modifier
            .clip(CircleShape)
            .background(cs.surfaceContainerHigh),
        verticalAlignment = Alignment.CenterVertically
    ) {
        IconButton(onClick = onDecrement, modifier = Modifier.size(40.dp).semantics { contentDescription = "Remove one $name" }) {
            Text("−", style = style, color = cs.onSurface)
        }
        Text(
            quantity.toString(),
            style = MaterialTheme.typography.titleMedium.copy(fontWeight = FontWeight.Bold),
            color = cs.onSurface,
            textAlign = TextAlign.Center,
            modifier = Modifier.widthIn(min = 24.dp)
        )
        IconButton(onClick = onIncrement, modifier = Modifier.size(40.dp).semantics { contentDescription = "Add one $name" }) {
            Text("+", style = style, color = cs.onSurface)
        }
    }
}

@Composable
private fun BillSection(
    record: ServiceRecord,
    onLaborCostChange: (Double) -> Unit,
    onSendBill: () -> Unit,
    canSend: Boolean
) {
    val cs = MaterialTheme.colorScheme
    val ext = LaluzTheme.extendedColors
    val partsTotal = record.partsUsed.sumOf { it.total }
    var labour by remember(record.id) { mutableStateOf(if (record.laborCost > 0) record.laborCost.toLong().toString() else "") }
    LaunchedEffect(record.laborCost) {
        val current = labour.toLongOrNull()?.toDouble() ?: 0.0
        if (current != record.laborCost) labour = if (record.laborCost > 0) record.laborCost.toLong().toString() else ""
    }
    SectionCard("Bill", gap = Spacing.sm) {
        if (record.partsUsed.isNotEmpty()) {
            Column(verticalArrangement = Arrangement.spacedBy(Spacing.xxs)) {
                record.partsUsed.forEach { p ->
                    Row {
                        Text("${p.name} × ${p.quantity}", style = MaterialTheme.typography.bodyMedium, color = cs.onSurfaceVariant, modifier = Modifier.weight(1f))
                        Spacer(Modifier.width(Spacing.sm))
                        Text(formatInrWhole(p.total), style = MaterialTheme.typography.bodyMedium, color = cs.onSurfaceVariant)
                    }
                }
            }
        }
        Row {
            Text("Parts subtotal", style = MaterialTheme.typography.titleMedium, color = cs.onSurface, modifier = Modifier.weight(1f))
            Text(formatInrWhole(partsTotal), style = MaterialTheme.typography.titleMedium, color = cs.onSurface)
        }
        Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(Spacing.md)) {
            Text("Labour charge", style = MaterialTheme.typography.titleMedium, color = cs.onSurface, modifier = Modifier.weight(1f))
            LaluzOutlinedField(
                value = labour,
                onValueChange = { raw ->
                    labour = raw.filter { it.isDigit() }.take(7)
                    onLaborCostChange(labour.toLongOrNull()?.toDouble() ?: 0.0)
                },
                prefix = "₹",
                placeholder = "0",
                textStyle = MaterialTheme.typography.bodyLarge.copy(fontWeight = FontWeight.Bold),
                textAlign = TextAlign.End,
                keyboardType = KeyboardType.Number,
                filled = true,
                modifier = Modifier
                    .width(152.dp)
                    .semantics { contentDescription = "Labour charge" }
            )
        }
        HorizontalDivider(thickness = 1.dp, color = cs.outlineVariant)
        Row(verticalAlignment = Alignment.Bottom) {
            Text(
                "Total",
                style = MaterialTheme.typography.titleMedium.copy(fontWeight = FontWeight.Bold),
                color = cs.onSurface,
                modifier = Modifier
                    .weight(1f)
                    .padding(bottom = 6.dp)
            )
            Text(formatInrWhole(partsTotal + record.laborCost), style = MaterialTheme.typography.headlineLarge, color = cs.onSurface)
        }
        PillButton(
            text = "Send bill on WhatsApp",
            icon = LaluzIcons.WhatsApp,
            onClick = onSendBill,
            enabled = canSend,
            containerColor = ext.whatsapp,
            contentColor = ext.onWhatsapp,
            modifier = Modifier.fillMaxWidth()
        )
    }
}

@Composable
private fun StatusBar(
    selected: CardStatus,
    onSelect: (CardStatus) -> Unit,
    isDirty: Boolean,
    justSaved: Boolean,
    isSaving: Boolean,
    canSave: Boolean,
    onDiscard: () -> Unit,
    onSave: () -> Unit
) {
    val cs = MaterialTheme.colorScheme
    val ext = LaluzTheme.extendedColors
    Column(
        Modifier
            .fillMaxWidth()
            .background(cs.surfaceContainer)
            .navigationBarsPadding(),
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        Column(
            Modifier
                .widthIn(max = MaxContentWidth)
                .fillMaxWidth()
                .padding(start = Spacing.md, end = Spacing.md, top = Spacing.sm, bottom = Spacing.lg),
            verticalArrangement = Arrangement.spacedBy(Spacing.xs)
        ) {
            Row(Modifier.padding(horizontal = Spacing.xs), verticalAlignment = Alignment.CenterVertically) {
                Text("Job status", style = MaterialTheme.typography.labelMedium, color = cs.onSurfaceVariant, modifier = Modifier.weight(1f))
                val note = when {
                    isDirty -> "Unsaved changes"
                    justSaved -> "All changes saved"
                    else -> ""
                }
                Text(
                    note,
                    style = LaluzType.labelTiny,
                    color = if (isDirty) ext.warning else cs.primary,
                    modifier = Modifier.semantics { liveRegion = LiveRegionMode.Polite }
                )
            }
            ConnectedSegments(
                options = CardStatus.entries,
                selected = selected,
                onSelect = onSelect,
                label = { it.label },
                colors = {
                    when (it) {
                        CardStatus.PENDING -> SegmentColors(ext.warningContainer, ext.onWarningContainer, cs.surfaceContainerHigh, cs.onSurface)
                        CardStatus.IN_PROGRESS -> SegmentColors(cs.tertiaryContainer, cs.onTertiaryContainer, cs.surfaceContainerHigh, cs.onSurface)
                        CardStatus.DELIVERED -> SegmentColors(cs.primary, cs.onPrimary, cs.surfaceContainerHigh, cs.onSurface)
                    }
                },
                height = 56.dp,
                fill = true,
                modifier = Modifier
                    .fillMaxWidth()
                    .semantics { contentDescription = "Job status" }
            )
            Row(Modifier.padding(top = Spacing.xxs), horizontalArrangement = Arrangement.spacedBy(Spacing.xs)) {
                OutlinedPillButton(
                    text = "Discard",
                    onClick = onDiscard,
                    enabled = isDirty && !isSaving,
                    contentColor = cs.onSurface,
                    modifier = Modifier.weight(1f)
                )
                PillButton(
                    text = "Update",
                    onClick = onSave,
                    enabled = isDirty && canSave,
                    loading = isSaving,
                    containerColor = cs.primary,
                    contentColor = cs.onPrimary,
                    modifier = Modifier.weight(1f)
                )
            }
        }
    }
}
