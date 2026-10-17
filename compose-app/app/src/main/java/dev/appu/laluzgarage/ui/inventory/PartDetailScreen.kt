package dev.appu.laluzgarage.ui.inventory

import androidx.activity.compose.BackHandler
import androidx.compose.foundation.background
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
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
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material3.SnackbarHost
import androidx.compose.material3.SnackbarHostState
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
import androidx.compose.ui.semantics.heading
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import dev.appu.laluzgarage.data.model.Part
import dev.appu.laluzgarage.ui.components.ChipTone
import dev.appu.laluzgarage.ui.components.DeleteEditBar
import dev.appu.laluzgarage.ui.components.DetailField
import dev.appu.laluzgarage.ui.components.DetailTopBar
import dev.appu.laluzgarage.ui.components.LaluzConfirmDialog
import dev.appu.laluzgarage.ui.components.LaluzFilledField
import dev.appu.laluzgarage.ui.components.LaluzFilterChip
import dev.appu.laluzgarage.ui.components.MaxContentWidth
import dev.appu.laluzgarage.ui.components.PillButton
import dev.appu.laluzgarage.ui.components.SectionCard
import dev.appu.laluzgarage.ui.components.StatusChip
import dev.appu.laluzgarage.ui.components.formatInrWhole
import dev.appu.laluzgarage.ui.theme.LaluzTheme
import dev.appu.laluzgarage.ui.theme.Spacing

@Composable
fun PartDetailScreen(
    part: Part,
    categories: List<String>,
    message: String?,
    onMessageShown: () -> Unit,
    onBack: () -> Unit,
    onSave: (Part, onSaved: () -> Unit) -> Unit,
    onDelete: () -> Unit
) {
    val cs = MaterialTheme.colorScheme
    val ext = LaluzTheme.extendedColors
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

    val low = part.isLowStock

    Box(Modifier.fillMaxSize().background(cs.surface)) {
        Column(Modifier.fillMaxSize()) {
            DetailTopBar("Part", "Back to inventory", onBack, scrolled)
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
                        Text(part.name, style = MaterialTheme.typography.headlineMedium, color = cs.onSurface, modifier = Modifier.semantics { heading() })
                        if (part.category.isNotBlank()) {
                            Text(part.category, style = MaterialTheme.typography.bodyLarge, color = cs.onSurfaceVariant)
                        }
                        if (low) {
                            Row(Modifier.padding(top = Spacing.xxs)) { StatusChip("Low stock", ChipTone.PENDING) }
                        }
                    }

                    Column(
                        Modifier.padding(start = Spacing.md, end = Spacing.md, bottom = Spacing.xl),
                        verticalArrangement = Arrangement.spacedBy(Spacing.xs)
                    ) {
                        SectionCard("Stock") {
                            Row(horizontalArrangement = Arrangement.spacedBy(Spacing.md)) {
                                StockFigure("In stock", part.stockQuantity.toString(), if (low) ext.warning else cs.onSurface, Modifier.weight(1f))
                                StockFigure("Minimum stock", part.minStockLevel.toString(), cs.onSurface, Modifier.weight(1f))
                            }
                            if (low) {
                                Text(
                                    "Stock is at or below the minimum of ${part.minStockLevel}.",
                                    style = MaterialTheme.typography.labelLarge,
                                    color = ext.onWarningContainer,
                                    modifier = Modifier
                                        .fillMaxWidth()
                                        .background(ext.warningContainer, MaterialTheme.shapes.medium)
                                        .padding(horizontal = Spacing.md, vertical = Spacing.sm)
                                )
                            }
                        }
                        SectionCard("Pricing") {
                            Row(horizontalArrangement = Arrangement.spacedBy(Spacing.md)) {
                                DetailField("Unit price", value = formatInrWhole(part.price), modifier = Modifier.weight(1f))
                                DetailField("Stock value", value = formatInrWhole(part.price * part.stockQuantity), modifier = Modifier.weight(1f))
                            }
                        }
                        SectionCard("Storage") {
                            Row(horizontalArrangement = Arrangement.spacedBy(Spacing.md)) {
                                DetailField("Category", value = part.category.ifBlank { "—" }, modifier = Modifier.weight(1f))
                                DetailField(
                                    "Location",
                                    value = part.location.ifBlank { "Not set" },
                                    valueColor = if (part.location.isBlank()) cs.onSurfaceVariant else cs.onSurface,
                                    modifier = Modifier.weight(1f)
                                )
                            }
                        }
                    }
                }
            }
            DeleteEditBar(
                deleteLabel = "Delete part",
                editLabel = "Edit part",
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
            title = "Delete part?",
            body = "${part.name} is removed from inventory. Job cards that used it keep their bill lines.",
            confirmText = "Delete",
            dismissText = "Cancel",
            onConfirm = { confirmDelete = false; onDelete() },
            onDismiss = { confirmDelete = false }
        )
    }

    if (editing) {
        PartFormSheet(
            part = part,
            categories = categories,
            onDismiss = { editing = false },
            onSave = { updated -> onSave(updated) { editing = false } }
        )
    }
}

/** 12/16 caption over a 36/44 extra-bold count. */
@Composable
private fun StockFigure(label: String, value: String, color: androidx.compose.ui.graphics.Color, modifier: Modifier) {
    Column(modifier, verticalArrangement = Arrangement.spacedBy(Spacing.xxs)) {
        Text(label, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
        Text(value, style = MaterialTheme.typography.displaySmall, color = color)
    }
}

/** Add / edit part sheet. A blank [part] id creates a new part. */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun PartFormSheet(
    part: Part?,
    categories: List<String>,
    onDismiss: () -> Unit,
    onSave: (Part) -> Unit
) {
    val cs = MaterialTheme.colorScheme
    val sheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true)
    val source = part ?: Part()
    var name by rememberSaveable { mutableStateOf(source.name) }
    var category by rememberSaveable { mutableStateOf(source.category) }
    var price by rememberSaveable { mutableStateOf(if (part != null) source.price.toLong().toString() else "") }
    var stock by rememberSaveable { mutableStateOf(if (part != null) source.stockQuantity.toString() else "") }
    var minimum by rememberSaveable { mutableStateOf(source.minStockLevel.toString()) }
    var location by rememberSaveable { mutableStateOf(source.location) }
    val valid = name.isNotBlank() && price.toLongOrNull() != null && stock.toIntOrNull() != null
    val digits = { raw: String -> raw.filter(Char::isDigit).take(7) }

    ModalBottomSheet(onDismissRequest = onDismiss, sheetState = sheetState, containerColor = cs.surfaceContainerLow) {
        Column(
            Modifier
                .verticalScroll(rememberScrollState())
                .imePadding()
                .padding(start = Spacing.xl, end = Spacing.xl, bottom = Spacing.xl),
            verticalArrangement = Arrangement.spacedBy(Spacing.lg)
        ) {
            Text(
                if (part == null) "Add part" else "Edit part",
                style = MaterialTheme.typography.titleLarge,
                color = cs.onSurface,
                modifier = Modifier.semantics { heading() }
            )
            LaluzFilledField(name, { name = it }, "Part name", "e.g. Oil filter · Hyundai")
            Column(verticalArrangement = Arrangement.spacedBy(Spacing.sm)) {
                LaluzFilledField(category, { category = it }, "Category", "e.g. Filters")
                if (categories.isNotEmpty()) {
                    Row(
                        Modifier.horizontalScroll(rememberScrollState()),
                        horizontalArrangement = Arrangement.spacedBy(Spacing.xs)
                    ) {
                        categories.forEach { c ->
                            LaluzFilterChip(c, category.trim().equals(c, ignoreCase = true), onClick = { category = c })
                        }
                    }
                }
            }
            LaluzFilledField(price, { price = digits(it) }, "Unit price (₹)", "e.g. 420", keyboardType = KeyboardType.Number)
            Row(horizontalArrangement = Arrangement.spacedBy(Spacing.md)) {
                LaluzFilledField(stock, { stock = digits(it) }, "In stock", "0", keyboardType = KeyboardType.Number, modifier = Modifier.weight(1f))
                LaluzFilledField(minimum, { minimum = digits(it) }, "Minimum stock", "5", keyboardType = KeyboardType.Number, modifier = Modifier.weight(1f))
            }
            LaluzFilledField(location, { location = it }, "Location", "e.g. Cabinet B, Shelf 2")
            PillButton(
                text = if (part == null) "Add part" else "Save part",
                onClick = {
                    onSave(
                        source.copy(
                            name = name.trim(),
                            category = category.trim(),
                            price = price.toLongOrNull()?.toDouble() ?: 0.0,
                            stockQuantity = stock.toIntOrNull() ?: 0,
                            minStockLevel = minimum.toIntOrNull() ?: 0,
                            location = location.trim()
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
