package dev.appu.laluzgarage.ui.intake

import androidx.activity.compose.BackHandler
import androidx.compose.animation.AnimatedContent
import androidx.compose.animation.core.tween
import androidx.compose.animation.slideInHorizontally
import androidx.compose.animation.slideOutHorizontally
import androidx.compose.animation.togetherWith
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.interaction.collectIsFocusedAsState
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ColumnScope
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.RowScope
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.imePadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.text.BasicTextField
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.focus.onFocusChanged
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.SolidColor
import androidx.compose.ui.platform.LocalUriHandler
import androidx.compose.ui.semantics.LiveRegionMode
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.liveRegion
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.SpanStyle
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.buildAnnotatedString
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardCapitalization
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.text.withStyle
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import dev.appu.laluzgarage.data.model.WorkshopUser
import dev.appu.laluzgarage.ui.components.BottomActionBar
import dev.appu.laluzgarage.ui.components.CookieShape
import dev.appu.laluzgarage.ui.components.BatteryField
import dev.appu.laluzgarage.ui.components.DetailField
import dev.appu.laluzgarage.ui.components.DetailTopBar
import dev.appu.laluzgarage.ui.components.FilterChipTone
import dev.appu.laluzgarage.ui.components.LaluzConfirmDialog
import dev.appu.laluzgarage.ui.components.LaluzFilterChip
import dev.appu.laluzgarage.ui.components.LaluzIcons
import dev.appu.laluzgarage.ui.components.LaluzSearchField
import dev.appu.laluzgarage.ui.components.MaxContentWidth
import dev.appu.laluzgarage.ui.components.OutlinedPillButton
import dev.appu.laluzgarage.ui.components.PillButton
import dev.appu.laluzgarage.ui.components.SectionCard
import dev.appu.laluzgarage.ui.components.bleedEnd
import dev.appu.laluzgarage.ui.components.connectedRowShape
import dev.appu.laluzgarage.ui.services.VehicleSecurity
import dev.appu.laluzgarage.ui.services.buildWhatsAppUrl
import dev.appu.laluzgarage.ui.services.formatIntakeMessage
import dev.appu.laluzgarage.ui.services.formatPhone
import dev.appu.laluzgarage.ui.services.formatPlate
import dev.appu.laluzgarage.ui.services.parseTasks
import dev.appu.laluzgarage.ui.services.security
import dev.appu.laluzgarage.ui.services.weekdayLabel
import dev.appu.laluzgarage.data.model.Vehicle
import dev.appu.laluzgarage.ui.theme.JetBrainsMono
import dev.appu.laluzgarage.ui.theme.LaluzShape
import dev.appu.laluzgarage.ui.theme.LaluzTheme
import dev.appu.laluzgarage.ui.theme.LaluzType
import dev.appu.laluzgarage.ui.theme.Spacing
import java.time.LocalDate
import java.time.format.DateTimeFormatter
import java.util.Locale

private val FieldDate = DateTimeFormatter.ofPattern("EEE, d MMM yyyy", Locale.ENGLISH)

private enum class DateField { INTAKE, DELIVERY }

/**
 * Vehicle intake, full screen: advisor verification → find customer → (new customer) →
 * (vehicle specification) → job specification → job card issued. The primary action of each step
 * sits in a pinned bottom bar; leaving with unsaved details asks first.
 */
@Composable
fun IntakeScreen(
    viewModel: IntakeViewModel,
    advisor: WorkshopUser?,
    onClose: () -> Unit,
    onDone: () -> Unit
) {
    val state by viewModel.uiState.collectAsStateWithLifecycle()
    val cs = MaterialTheme.colorScheme
    var confirmDiscard by rememberSaveable { mutableStateOf(false) }
    var picker by rememberSaveable { mutableStateOf<DateField?>(null) }
    val today = remember { LocalDate.now() }

    val close = { if (state.hasData) confirmDiscard = true else onClose() }
    val back: () -> Unit = {
        when (state.step) {
            IntakeStep.PIN, IntakeStep.SEARCH -> close()
            IntakeStep.SUCCESS -> onDone()
            else -> viewModel.back()
        }
    }
    BackHandler(onBack = back)

    val step = state.step
    val backLabel = when (step) {
        IntakeStep.PIN, IntakeStep.SEARCH -> "Close intake"
        IntakeStep.CUSTOMER -> "Back to customer search"
        IntakeStep.VEHICLE -> if (state.selectedCustomer != null) "Back to customer search" else "Back to customer details"
        IntakeStep.JOB -> if (state.selectedVehicle != null) "Back to customer search" else "Back to vehicle details"
        IntakeStep.SUCCESS -> null
    }

    Column(
        Modifier
            .fillMaxSize()
            .background(cs.surface)
            .then(if (step == IntakeStep.PIN) Modifier.advisorPinGlow() else Modifier)
            .imePadding()
    ) {
        DetailTopBar(
            "Vehicle intake",
            backLabel,
            back,
            container = if (step == IntakeStep.PIN) Color.Transparent else cs.surface
        )
        AnimatedContent(
            targetState = step,
            transitionSpec = {
                val fwd = targetState.ordinal >= initialState.ordinal
                val spec = tween<androidx.compose.ui.unit.IntOffset>(300, easing = dev.appu.laluzgarage.ui.theme.Motion.emphasized)
                (slideInHorizontally(spec) { if (fwd) it else -it / 4 } togetherWith
                    slideOutHorizontally(spec) { if (fwd) -it / 4 else it } using null)
                    .apply { targetContentZIndex = if (fwd) 1f else -1f }
            },
            label = "intakeStep",
            modifier = Modifier.weight(1f)
        ) { s ->
            when (s) {
                IntakeStep.PIN -> AdvisorPinContent(
                    description = "Enter your 4-digit security PIN to authorise and start vehicle intake.",
                    pin = state.pin,
                    wrong = state.pinWrong,
                    onPinChange = viewModel::setPin,
                    onSubmit = { viewModel.verifyPin(advisor) },
                    modifier = Modifier.fillMaxSize()
                )
                IntakeStep.SEARCH -> StepScroll { SearchStep(state, viewModel) }
                IntakeStep.CUSTOMER -> StepScroll { CustomerStep(state, viewModel) }
                IntakeStep.VEHICLE -> StepScroll { VehicleStep(state, viewModel) }
                IntakeStep.JOB -> StepScroll {
                    JobStep(state, viewModel, onPickDate = { picker = it })
                }
                IntakeStep.SUCCESS -> StepScroll { SuccessStep(state) }
            }
        }

        when (step) {
            IntakeStep.PIN -> AdvisorPinBar(ready = state.pinReady, onCancel = onClose, onVerify = { viewModel.verifyPin(advisor) })
            IntakeStep.SEARCH -> BottomActionBar {
                IntakePrimaryButton("Register new customer", enabled = true, onClick = viewModel::registerNewCustomer)
            }
            IntakeStep.CUSTOMER -> BottomActionBar {
                IntakePrimaryButton("Continue to vehicle details", enabled = state.customerValid, onClick = viewModel::continueToVehicle)
            }
            IntakeStep.VEHICLE -> BottomActionBar {
                IntakePrimaryButton("Continue to job details", enabled = state.vehicleValid, onClick = viewModel::continueToJob)
            }
            IntakeStep.JOB -> BottomActionBar {
                state.submitError?.let {
                    Text(
                        it,
                        style = MaterialTheme.typography.bodySmall,
                        color = cs.error,
                        modifier = Modifier
                            .padding(horizontal = Spacing.xs)
                            .semantics { liveRegion = LiveRegionMode.Polite }
                    )
                }
                IntakePrimaryButton(
                    "Issue job card",
                    enabled = state.jobValid,
                    loading = state.isSubmitting,
                    onClick = { viewModel.issueJobCard(advisor) }
                )
            }
            IntakeStep.SUCCESS -> SuccessBar(state, onDone)
        }
    }

    if (confirmDiscard) {
        LaluzConfirmDialog(
            title = "Discard intake?",
            body = "You have unsaved details. If you leave now, this intake is discarded.",
            confirmText = "Discard",
            dismissText = "Keep editing",
            onConfirm = { confirmDiscard = false; onClose() },
            onDismiss = { confirmDiscard = false }
        )
    }

    picker?.let { field ->
        IntakeDatePicker(
            label = if (field == DateField.INTAKE) "Intake date" else "Estimated delivery date",
            initial = if (field == DateField.INTAKE) state.intakeDate else state.deliveryDate,
            today = today,
            isAllowed = { day -> if (field == DateField.INTAKE) !day.isAfter(today) else !day.isBefore(today) },
            onDismiss = { picker = null },
            onConfirm = { day ->
                if (field == DateField.INTAKE) viewModel.setIntakeDate(day) else viewModel.setDeliveryDate(day)
                picker = null
            }
        )
    }
}

/**
 * Scrolling step body, capped at the phone-first content width. Opaque, so the step sliding in on
 * top hides the one sliding out beneath it instead of the two bleeding through each other.
 */
@Composable
private fun StepScroll(content: @Composable ColumnScope.() -> Unit) {
    Box(
        Modifier
            .fillMaxSize()
            .background(MaterialTheme.colorScheme.surface),
        contentAlignment = Alignment.TopCenter
    ) {
        Column(
            Modifier
                .widthIn(max = MaxContentWidth)
                .fillMaxWidth()
                .verticalScroll(rememberScrollState())
                .padding(bottom = Spacing.xl),
            content = content
        )
    }
}

/** The intake's main action: a 48dp tertiaryContainer pill (disabled: onSurface 12% / 38%). */
@Composable
private fun IntakePrimaryButton(text: String, enabled: Boolean, onClick: () -> Unit, loading: Boolean = false) {
    val cs = MaterialTheme.colorScheme
    PillButton(
        text = text,
        onClick = onClick,
        enabled = enabled,
        loading = loading,
        containerColor = cs.tertiaryContainer,
        contentColor = cs.onTertiaryContainer,
        modifier = Modifier.fillMaxWidth()
    )
}

// ---------------------------------------------------------------------------
// Find customer
// ---------------------------------------------------------------------------

@Composable
private fun SearchStep(state: IntakeUiState, viewModel: IntakeViewModel) {
    val cs = MaterialTheme.colorScheme
    StepHeading("Find customer", "Search by phone number, plate or customer name.")
    LaluzSearchField(
        value = state.query,
        onValueChange = viewModel::setQuery,
        placeholder = "Plate, phone or customer name",
        onClear = { viewModel.setQuery("") },
        modifier = Modifier.padding(horizontal = Spacing.md)
    )
    if (state.query.isNotBlank()) {
        val matches = state.matches
        Column(
            Modifier.padding(start = Spacing.md, end = Spacing.md, top = Spacing.md),
            verticalArrangement = Arrangement.spacedBy(2.dp)
        ) {
            Text(
                when (matches.size) {
                    0 -> "No matches"
                    1 -> "1 match"
                    else -> "${matches.size} matches"
                },
                style = MaterialTheme.typography.labelLarge,
                color = cs.onSurfaceVariant,
                modifier = Modifier
                    .padding(start = Spacing.xs, end = Spacing.xs, bottom = Spacing.xs)
                    .semantics { liveRegion = LiveRegionMode.Polite }
            )
            matches.forEachIndexed { i, m ->
                MatchRow(m, i, matches.size) { viewModel.pickMatch(m) }
            }
            if (matches.isEmpty()) {
                Text(
                    "No customer or vehicle found for “${state.query.trim()}”. Register a new customer to continue.",
                    style = MaterialTheme.typography.bodyMedium,
                    color = cs.onSurfaceVariant,
                    modifier = Modifier.padding(horizontal = Spacing.xs, vertical = Spacing.xxl)
                )
            }
        }
    }
}

/** 88dp connected row: name, plate · vehicle, phone; last service on the right. */
@Composable
private fun MatchRow(match: IntakeMatch, index: Int, count: Int, onClick: () -> Unit) {
    val cs = MaterialTheme.colorScheme
    val v = match.vehicle
    Surface(
        onClick = onClick,
        shape = connectedRowShape(index, count),
        color = cs.surfaceContainerLow,
        contentColor = cs.onSurface,
        modifier = Modifier.fillMaxWidth()
    ) {
        Row(
            Modifier
                .heightIn(min = 88.dp)
                .padding(horizontal = Spacing.md, vertical = Spacing.sm),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(Spacing.md)
        ) {
            Column(Modifier.weight(1f)) {
                Text(match.customer.name.ifBlank { "Walk-in customer" }, style = MaterialTheme.typography.titleMedium, maxLines = 1, overflow = TextOverflow.Ellipsis)
                Text(
                    if (v != null) buildAnnotatedString {
                        withStyle(SpanStyle(fontFamily = JetBrainsMono, fontWeight = FontWeight.Bold, color = cs.onSurface)) {
                            append(formatPlate(v.plateNumber))
                        }
                        append(" · ${"${v.make} ${v.model}".trim()}")
                    } else buildAnnotatedString { append("No vehicle on record") },
                    style = MaterialTheme.typography.bodyMedium,
                    color = cs.onSurfaceVariant,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis
                )
                if (match.customer.phone.isNotBlank()) {
                    Text(formatPhone(match.customer.phone), style = LaluzType.phoneSmall, color = cs.onSurfaceVariant)
                }
            }
            if (v != null) {
                Column(horizontalAlignment = Alignment.End) {
                    Text("Last service", style = MaterialTheme.typography.bodySmall, color = cs.onSurfaceVariant)
                    Text(match.lastService?.weekdayLabel() ?: "None yet", style = MaterialTheme.typography.labelLarge, color = cs.onSurface)
                }
            }
        }
    }
}

// ---------------------------------------------------------------------------
// New customer
// ---------------------------------------------------------------------------

@Composable
private fun CustomerStep(state: IntakeUiState, viewModel: IntakeViewModel) {
    val cs = MaterialTheme.colorScheme
    StepHeading("New customer", "Enter the contact details to create a workshop profile.")
    Column(Modifier.padding(horizontal = Spacing.xl), verticalArrangement = Arrangement.spacedBy(Spacing.lg)) {
        IntakeField(
            value = state.customerName,
            onValueChange = viewModel::setCustomerName,
            label = "Full name",
            placeholder = "e.g. Joseph K",
            capitalization = KeyboardCapitalization.Words
        )
        IntakeField(
            value = state.customerPhone,
            onValueChange = viewModel::setCustomerPhone,
            label = "Mobile number",
            placeholder = "98765 43210",
            keyboardType = KeyboardType.Phone,
            textStyle = LaluzType.phone,
            leading = {
                Text("+91", style = LaluzType.monoValue, color = cs.onSurface)
                Box(Modifier.width(1.dp).height(24.dp).background(cs.outlineVariant))
            }
        )
    }
}

// ---------------------------------------------------------------------------
// Vehicle specification
// ---------------------------------------------------------------------------

@Composable
private fun VehicleStep(state: IntakeUiState, viewModel: IntakeViewModel) {
    StepHeading("Vehicle specification", "Record the vehicle and how to unlock it for this job card.")
    Column(Modifier.padding(horizontal = Spacing.md), verticalArrangement = Arrangement.spacedBy(Spacing.xl)) {
        SectionCard("Customer") {
            Row(horizontalArrangement = Arrangement.spacedBy(Spacing.md)) {
                DetailField("Name", value = state.customerLabel, maxLines = 1, modifier = Modifier.weight(1f))
                DetailField("Phone", value = formatPhone(state.phoneLabel), valueStyle = LaluzType.phone, maxLines = 1, modifier = Modifier.weight(1f))
            }
        }
        Column(Modifier.padding(horizontal = Spacing.xs), verticalArrangement = Arrangement.spacedBy(Spacing.lg)) {
            IntakeField(
                value = state.make,
                onValueChange = viewModel::setMake,
                label = "Make",
                placeholder = "e.g. Honda",
                capitalization = KeyboardCapitalization.Words,
                below = {
                    Row(
                        Modifier
                            .bleedEnd(Spacing.xl)
                            .horizontalScroll(rememberScrollState())
                            .padding(end = Spacing.xl)
                            .semantics { contentDescription = "Common makes" },
                        horizontalArrangement = Arrangement.spacedBy(Spacing.xs)
                    ) {
                        COMMON_MAKES.forEach { m ->
                            LaluzFilterChip(m, state.make.trim().equals(m, ignoreCase = true), onClick = { viewModel.setMake(m) })
                        }
                    }
                }
            )
            IntakeField(
                value = state.model,
                onValueChange = viewModel::setModel,
                label = "Model",
                placeholder = "e.g. Activa 6G, S1 Pro Gen 2, 450X",
                capitalization = KeyboardCapitalization.Words
            )
            IntakeField(
                value = if (state.unregistered) UNREGISTERED_PLATE else state.plate,
                onValueChange = viewModel::setPlate,
                label = "Plate number",
                placeholder = "MH12AB1234",
                enabled = !state.unregistered,
                textStyle = LaluzType.plate,
                capitalization = KeyboardCapitalization.Characters,
                below = {
                    Row { LaluzFilterChip("Unregistered (U/R)", state.unregistered, onClick = viewModel::toggleUnregistered) }
                }
            )
            IntakeField(
                value = state.colour,
                onValueChange = viewModel::setColour,
                label = "Colour",
                placeholder = "e.g. Pearl White",
                capitalization = KeyboardCapitalization.Words
            )
            IntakeField(
                value = if (state.physicalKey) "Physical key" else state.vehiclePin,
                onValueChange = viewModel::setVehiclePin,
                label = "Security",
                placeholder = "4 to 6 digit PIN",
                enabled = !state.physicalKey,
                keyboardType = KeyboardType.NumberPassword,
                textStyle = if (state.physicalKey) MaterialTheme.typography.bodyLarge else LaluzType.pin,
                below = {
                    Row { LaluzFilterChip("Physical key", state.physicalKey, onClick = viewModel::togglePhysicalKey) }
                }
            )
        }
    }
}

// ---------------------------------------------------------------------------
// Job specification
// ---------------------------------------------------------------------------

@Composable
private fun JobStep(state: IntakeUiState, viewModel: IntakeViewModel, onPickDate: (DateField) -> Unit) {
    val cs = MaterialTheme.colorScheme
    StepHeading("Job specification", "Add the odometer reading, battery level, what the customer wants done and the delivery date.")
    Column(Modifier.padding(horizontal = Spacing.md), verticalArrangement = Arrangement.spacedBy(Spacing.xl)) {
        SectionCard("Vehicle") {
            Column(verticalArrangement = Arrangement.spacedBy(Spacing.md)) {
                Row(horizontalArrangement = Arrangement.spacedBy(Spacing.md)) {
                    DetailField("Vehicle", value = "${state.vehicleMake} ${state.vehicleModel}".trim().ifEmpty { "Vehicle" }, modifier = Modifier.weight(1f))
                    DetailField(
                        "Plate",
                        value = if (state.plateLabel == UNREGISTERED_PLATE) UNREGISTERED_PLATE else formatPlate(state.plateLabel),
                        valueStyle = LaluzType.monoValue,
                        modifier = Modifier.weight(1f)
                    )
                }
                Row(horizontalArrangement = Arrangement.spacedBy(Spacing.md)) {
                    DetailField("Security", modifier = Modifier.weight(1f)) {
                        when (val sec = Vehicle(passwordOrPin = state.securityLabel).security()) {
                            is VehicleSecurity.Pin -> VehiclePinChip(sec.value)
                            VehicleSecurity.PhysicalKey -> Text("Physical key", style = MaterialTheme.typography.titleMedium, color = cs.onSurface)
                            VehicleSecurity.Unknown -> Text("Not recorded", style = MaterialTheme.typography.titleMedium, color = cs.onSurfaceVariant)
                        }
                    }
                    Box(Modifier.weight(1f))
                }
            }
        }

        Column(Modifier.padding(horizontal = Spacing.xs), verticalArrangement = Arrangement.spacedBy(Spacing.lg)) {
            val special = state.deadVehicle || state.vehicleLocked
            IntakeField(
                value = when {
                    state.deadVehicle -> "Vehicle dead"
                    state.vehicleLocked -> "Odometer locked"
                    else -> state.odometer
                },
                onValueChange = viewModel::setOdometer,
                label = "Odometer reading",
                placeholder = "e.g. 14250",
                enabled = !special,
                isError = state.odometerError,
                keyboardType = KeyboardType.Number,
                textStyle = if (special) MaterialTheme.typography.bodyLarge else LaluzType.monoValue,
                onFocusLost = viewModel::touchOdometer,
                trailing = { Text("km", style = MaterialTheme.typography.bodyMedium, color = cs.onSurfaceVariant) },
                supporting = {
                    Row(
                        Modifier
                            .padding(horizontal = Spacing.xxs)
                            .semantics { liveRegion = LiveRegionMode.Polite },
                        horizontalArrangement = Arrangement.spacedBy(Spacing.xs)
                    ) {
                        if (state.odometerError) {
                            Icon(LaluzIcons.AlertCircle, contentDescription = null, tint = cs.error, modifier = Modifier.size(16.dp))
                        }
                        Text(
                            if (state.odometerError) "Enter a reading above 0, or choose Dead vehicle or Vehicle locked."
                            else "Enter the reading, or choose below if it can’t be read.",
                            style = MaterialTheme.typography.bodySmall,
                            color = if (state.odometerError) cs.error else cs.onSurfaceVariant
                        )
                    }
                },
                below = {
                    Row(horizontalArrangement = Arrangement.spacedBy(Spacing.xs), modifier = Modifier.semantics { contentDescription = "Odometer not readable" }) {
                        LaluzFilterChip("Dead vehicle", state.deadVehicle, onClick = viewModel::toggleDeadVehicle, tone = FilterChipTone.ERROR)
                        LaluzFilterChip("Vehicle locked", state.vehicleLocked, onClick = viewModel::toggleVehicleLocked, tone = FilterChipTone.WARNING)
                    }
                }
            )
            BatteryField(percent = state.battery, onPercentChange = viewModel::setBattery)
            IntakeField(
                value = state.problems,
                onValueChange = viewModel::setProblems,
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
                value = state.belongings,
                onValueChange = viewModel::setBelongings,
                label = "Belongings left in vehicle",
                placeholder = "e.g. Helmet, original documents, charging cable",
                capitalization = KeyboardCapitalization.Sentences
            )
            DateButton("Intake date", state.intakeDate) { onPickDate(DateField.INTAKE) }
            DateButton("Estimated delivery date", state.deliveryDate) { onPickDate(DateField.DELIVERY) }
        }
    }
}

/** Vehicle PIN on the job step: 24dp secondaryContainer chip, mono 14/20 bold with 1sp tracking. */
@Composable
private fun VehiclePinChip(pin: String) {
    val cs = MaterialTheme.colorScheme
    Box(
        Modifier
            .height(24.dp)
            .background(cs.secondaryContainer, LaluzShape.chip)
            .padding(horizontal = Spacing.xs)
            .semantics { contentDescription = "PIN " + pin.toList().joinToString(" ") },
        contentAlignment = Alignment.Center
    ) {
        Text(pin, style = LaluzType.pinSmall, color = cs.onSecondaryContainer)
    }
}

/** Date field: label above a 56dp surfaceContainerHigh button with the date and a calendar icon. */
@Composable
internal fun DateButton(label: String, date: LocalDate?, onClick: () -> Unit) {
    val cs = MaterialTheme.colorScheme
    Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
        Text(label, style = MaterialTheme.typography.labelLarge, color = cs.onSurfaceVariant)
        Button(
            onClick = onClick,
            shape = LaluzShape.field,
            colors = ButtonDefaults.buttonColors(containerColor = cs.surfaceContainerHigh, contentColor = cs.onSurface),
            contentPadding = PaddingValues(horizontal = Spacing.md),
            modifier = Modifier
                .fillMaxWidth()
                .height(56.dp)
                .semantics { contentDescription = "$label, ${date?.format(FieldDate) ?: "not set"}" }
        ) {
            Text(
                date?.format(FieldDate) ?: "Select date",
                style = MaterialTheme.typography.bodyLarge,
                color = if (date != null) cs.onSurface else cs.onSurfaceVariant,
                modifier = Modifier.weight(1f)
            )
            Icon(LaluzIcons.Calendar, contentDescription = null, tint = cs.onSurfaceVariant, modifier = Modifier.size(24.dp))
        }
    }
}

// ---------------------------------------------------------------------------
// Job card issued
// ---------------------------------------------------------------------------

@Composable
private fun SuccessStep(state: IntakeUiState) {
    val cs = MaterialTheme.colorScheme
    val issued = state.issued ?: return
    Column(Modifier.padding(start = Spacing.xl, end = Spacing.xl, top = Spacing.md, bottom = Spacing.xl)) {
        Box(
            Modifier
                .size(96.dp)
                .background(cs.primaryContainer, CookieShape),
            contentAlignment = Alignment.Center
        ) {
            Icon(LaluzIcons.CheckBold, contentDescription = null, tint = cs.onPrimaryContainer, modifier = Modifier.size(40.dp))
        }
        Text(
            "Job card issued",
            style = MaterialTheme.typography.headlineMedium,
            color = cs.onSurface,
            modifier = Modifier
                .padding(top = Spacing.xl)
                .semantics { liveRegion = LiveRegionMode.Polite }
        )
        Text(
            "The job card is saved. Share it with the customer on WhatsApp.",
            style = MaterialTheme.typography.bodyLarge,
            color = cs.onSurfaceVariant,
            modifier = Modifier.padding(top = Spacing.xs)
        )
    }
    SectionCard(title = null, modifier = Modifier.padding(horizontal = Spacing.md)) {
        Column(verticalArrangement = Arrangement.spacedBy(Spacing.md)) {
            Row(horizontalArrangement = Arrangement.spacedBy(Spacing.md)) {
                DetailField("Customer", value = issued.customerName.ifBlank { "Walk-in customer" }, maxLines = 1, modifier = Modifier.weight(1f))
                DetailField(
                    "Vehicle",
                    value = if (issued.plate == UNREGISTERED_PLATE) UNREGISTERED_PLATE else formatPlate(issued.plate),
                    valueStyle = LaluzType.monoValue,
                    modifier = Modifier.weight(1f)
                )
            }
            Row(horizontalArrangement = Arrangement.spacedBy(Spacing.md)) {
                DetailField("Intake date", value = issued.intakeDate.weekdayLabel(), modifier = Modifier.weight(1f))
                DetailField("Estimated delivery", value = issued.deliveryDate?.weekdayLabel() ?: "Not set", modifier = Modifier.weight(1f))
            }
        }
        Column(verticalArrangement = Arrangement.spacedBy(2.dp)) {
            Text("Problems and requests", style = MaterialTheme.typography.bodySmall, color = cs.onSurfaceVariant)
            Text(
                parseTasks(issued.description).joinToString("\n") { it.text },
                style = MaterialTheme.typography.bodyMedium,
                color = cs.onSurface
            )
        }
    }
}

@Composable
private fun SuccessBar(state: IntakeUiState, onDone: () -> Unit) {
    val cs = MaterialTheme.colorScheme
    val ext = LaluzTheme.extendedColors
    val uriHandler = LocalUriHandler.current
    val issued = state.issued
    BottomActionBar {
        PillButton(
            text = "Share on WhatsApp",
            icon = LaluzIcons.WhatsApp,
            enabled = issued != null && issued.phone.isNotBlank(),
            onClick = {
                if (issued != null) {
                    val text = formatIntakeMessage(state.intakeTemplate, issued.customerName, issued.make, issued.model, issued.plate, issued.description)
                    buildWhatsAppUrl(issued.phone, text)?.let(uriHandler::openUri)
                }
            },
            containerColor = ext.whatsapp,
            contentColor = ext.onWhatsapp,
            modifier = Modifier.fillMaxWidth()
        )
        OutlinedPillButton(
            text = "Done",
            onClick = onDone,
            contentColor = cs.tertiary,
            borderColor = cs.tertiary,
            modifier = Modifier.fillMaxWidth()
        )
    }
}

// ---------------------------------------------------------------------------
// Field
// ---------------------------------------------------------------------------

/**
 * Intake field: 14/20 label, 6dp, then a 56dp surfaceContainerHigh box (16dp radius) with a 2dp
 * primary ring on focus and an error ring when [isError]. Multi-line fields grow from [minLines]
 * with 12dp vertical padding. [supporting] sits 6dp below; [below] (chips) 12dp below.
 */
@Composable
internal fun IntakeField(
    value: String,
    onValueChange: (String) -> Unit,
    label: String,
    placeholder: String,
    enabled: Boolean = true,
    isError: Boolean = false,
    singleLine: Boolean = true,
    minLines: Int = 1,
    textStyle: TextStyle = MaterialTheme.typography.bodyLarge,
    keyboardType: KeyboardType = KeyboardType.Text,
    capitalization: KeyboardCapitalization = KeyboardCapitalization.None,
    onFocusLost: (() -> Unit)? = null,
    leading: (@Composable RowScope.() -> Unit)? = null,
    trailing: (@Composable RowScope.() -> Unit)? = null,
    supporting: (@Composable () -> Unit)? = null,
    below: (@Composable () -> Unit)? = null
) {
    val cs = MaterialTheme.colorScheme
    val interaction = remember { MutableInteractionSource() }
    val focused by interaction.collectIsFocusedAsState()
    var wasFocused by remember { mutableStateOf(false) }
    val ring = when {
        isError -> cs.error
        focused -> cs.primary
        else -> Color.Transparent
    }
    val textColor = if (enabled) cs.onSurface else cs.onSurface.copy(alpha = 0.38f)
    Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
        Text(label, style = MaterialTheme.typography.labelLarge, color = cs.onSurfaceVariant)
        BasicTextField(
            value = value,
            onValueChange = onValueChange,
            enabled = enabled,
            singleLine = singleLine,
            minLines = minLines,
            textStyle = textStyle.copy(color = textColor),
            cursorBrush = SolidColor(cs.primary),
            keyboardOptions = KeyboardOptions(keyboardType = keyboardType, capitalization = capitalization),
            interactionSource = interaction,
            modifier = Modifier
                .fillMaxWidth()
                .onFocusChanged {
                    if (it.isFocused) wasFocused = true
                    else if (wasFocused) {
                        wasFocused = false
                        onFocusLost?.invoke()
                    }
                },
            decorationBox = { inner ->
                Row(
                    Modifier
                        .fillMaxWidth()
                        .then(if (singleLine) Modifier.height(56.dp) else Modifier)
                        .background(cs.surfaceContainerHigh, LaluzShape.field)
                        .border(2.dp, ring, LaluzShape.field)
                        .padding(horizontal = Spacing.md, vertical = if (singleLine) 0.dp else Spacing.sm),
                    verticalAlignment = if (singleLine) Alignment.CenterVertically else Alignment.Top,
                    horizontalArrangement = Arrangement.spacedBy(if (leading != null) Spacing.sm else Spacing.xs)
                ) {
                    leading?.invoke(this)
                    Box(Modifier.weight(1f)) {
                        if (value.isEmpty()) {
                            Text(placeholder, style = textStyle, color = cs.onSurfaceVariant, maxLines = if (singleLine) 1 else Int.MAX_VALUE)
                        }
                        inner()
                    }
                    trailing?.invoke(this)
                }
            }
        )
        supporting?.invoke()
        if (below != null) {
            Box(Modifier.padding(top = 6.dp)) { below() }
        }
    }
}
