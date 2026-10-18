package dev.appu.laluzgarage.ui.inventory

import dev.appu.laluzgarage.ui.components.rememberContainerSource
import dev.appu.laluzgarage.ui.components.containerSource
import dev.appu.laluzgarage.ui.components.LocalContainerTransform
import dev.appu.laluzgarage.ui.components.TopBarTitleSearch
import dev.appu.laluzgarage.ui.components.rememberHeaderScrolledAway
import dev.appu.laluzgarage.ui.components.syncTitleAlpha
import dev.appu.laluzgarage.ui.components.PinnedBand
import androidx.compose.foundation.background
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.size
import androidx.compose.material3.DropdownMenu
import androidx.compose.material3.DropdownMenuItem
import androidx.compose.material3.Icon
import androidx.compose.material3.MenuDefaults
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.imePadding
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyListState
import androidx.compose.foundation.lazy.itemsIndexed
import androidx.compose.foundation.lazy.rememberLazyListState
import androidx.compose.foundation.rememberScrollState
import androidx.compose.material3.LocalContentColor
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.SolidColor
import androidx.compose.ui.graphics.StrokeJoin
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.graphics.vector.addPathNodes
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import dev.appu.laluzgarage.data.model.Part
import dev.appu.laluzgarage.data.sync.SyncUiState
import dev.appu.laluzgarage.ui.components.AccountActions
import dev.appu.laluzgarage.ui.components.LaluzFilterChip
import dev.appu.laluzgarage.ui.components.LaluzIcons
import dev.appu.laluzgarage.ui.components.LaluzSearchField
import dev.appu.laluzgarage.ui.components.LaluzSyncTopBar
import dev.appu.laluzgarage.ui.components.LaluzTextButton
import dev.appu.laluzgarage.ui.components.MaxContentWidth
import dev.appu.laluzgarage.ui.components.OperatorAvatarButton
import dev.appu.laluzgarage.ui.components.ScreenHeader
import dev.appu.laluzgarage.ui.components.connectedRowShape
import dev.appu.laluzgarage.ui.theme.LaluzTheme
import dev.appu.laluzgarage.ui.theme.Spacing

/** Inventory tab: parts in a connected list with category / low-stock filters and a stock sort. */
@Composable
fun InventoryScreen(
    inventory: InventoryUi,
    sync: SyncUiState,
    searchQuery: String,
    selectedFilter: String,
    account: AccountActions,
    onSearchQueryChange: (String) -> Unit,
    onFilterChange: (String) -> Unit,
    onSortChange: (PartSort) -> Unit,
    onOpenPart: (Part) -> Unit,
    listState: LazyListState = rememberLazyListState(),
    /** Tablet: the part whose details are open in the side sheet. */
    selectedPartId: String? = null
) {
    if (dev.appu.laluzgarage.ui.layout.LocalAdaptive.current.isTablet) {
        InventoryTablet(inventory, sync, searchQuery, selectedFilter, account, onSearchQueryChange, onFilterChange, onSortChange, onOpenPart, selectedPartId)
        return
    }
    val cs = MaterialTheme.colorScheme
    val rows = inventory.rows
    val container = LocalContainerTransform.current
    Column(Modifier.fillMaxSize().background(cs.surface)) {
        LaluzSyncTopBar(sync = sync, scrolled = listState.canScrollBackward) {
            TopBarTitleSearch(
                title = "Inventory",
                summary = inventory.summary,
                headerGone = rememberHeaderScrolledAway(listState),
                query = searchQuery,
                onQueryChange = onSearchQueryChange,
                placeholder = "Search parts or category",
                titleAlpha = syncTitleAlpha(sync)
            )
            OperatorAvatarButton(account)
        }
        LazyColumn(
            state = listState,
            // Shrinks above the keyboard while searching, so the last rows can still be scrolled to.
            modifier = Modifier.fillMaxSize().imePadding(),
            horizontalAlignment = Alignment.CenterHorizontally,
            contentPadding = PaddingValues(bottom = 168.dp)
        ) {
            // Title and search scroll away; the filters stay pinned under the top bar, which takes over the title.
            item(key = "title", contentType = "title") {
                ScreenHeader("Inventory", inventory.summary, Modifier.widthIn(max = MaxContentWidth).fillMaxWidth())
            }
            item(key = "search", contentType = "search") {
                LaluzSearchField(
                    value = searchQuery,
                    onValueChange = onSearchQueryChange,
                    placeholder = "Search parts or category",
                    onClear = { onSearchQueryChange("") },
                    modifier = Modifier
                        .widthIn(max = MaxContentWidth)
                        .fillMaxWidth()
                        .padding(horizontal = Spacing.md)
                )
            }
            stickyHeader(key = "filters", contentType = "filters") {
                PinnedBand {
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .horizontalScroll(rememberScrollState())
                            .padding(start = Spacing.md, end = Spacing.md, top = Spacing.md)
                            .semantics { contentDescription = "Filter parts" },
                        horizontalArrangement = Arrangement.spacedBy(Spacing.xs)
                    ) {
                        inventory.chips.forEach { chip ->
                            LaluzFilterChip(
                                label = chip.label,
                                count = chip.count,
                                selected = selectedFilter == chip.key,
                                onClick = { onFilterChange(chip.key) }
                            )
                        }
                    }
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(start = Spacing.xl, end = Spacing.xs, top = Spacing.xs),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Text(
                            "${rows.size} ${if (rows.size == 1) "part" else "parts"}",
                            style = MaterialTheme.typography.labelLarge,
                            color = cs.onSurfaceVariant,
                            modifier = Modifier.weight(1f)
                        )
                        PartSortButton(sort = inventory.sort, onSortChange = onSortChange)
                    }
                }
            }
            itemsIndexed(rows, key = { _, row -> row.part.id }, contentType = { _, _ -> "part" }) { index, row ->
                val source = rememberContainerSource()
                PartRow(
                    row = row,
                    index = index,
                    count = rows.size,
                    onClick = { container.from("part:${row.part.id}", source); onOpenPart(row.part) },
                    modifier = Modifier
                        .widthIn(max = MaxContentWidth)
                        .fillMaxWidth()
                        .padding(start = Spacing.md, end = Spacing.md, bottom = 2.dp)
                        // Connected rows: mostly the small inner corner.
                        .containerSource(source, 4.dp)
                )
            }
            if (rows.isEmpty()) {
                item(key = "empty", contentType = "empty") {
                    Text(
                        if (inventory.isLoading) "Loading parts…" else "No parts match.",
                        style = MaterialTheme.typography.bodyMedium,
                        color = cs.onSurfaceVariant,
                        textAlign = TextAlign.Center,
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(horizontal = Spacing.xl, vertical = 48.dp)
                    )
                }
            }
        }
    }
}

/**
 * Tablet Inventory: top bar on the plain surface; the filters, count and rows sit in a content card.
 * Rows slide to their place when the side sheet changes the card's width or the filter changes.
 */
@Composable
private fun InventoryTablet(
    inventory: InventoryUi,
    sync: SyncUiState,
    searchQuery: String,
    selectedFilter: String,
    account: AccountActions,
    onSearchQueryChange: (String) -> Unit,
    onFilterChange: (String) -> Unit,
    onSortChange: (PartSort) -> Unit,
    onOpenPart: (Part) -> Unit,
    selectedId: String?
) {
    val cs = MaterialTheme.colorScheme
    val rows = inventory.rows
    Column(Modifier.fillMaxSize().background(cs.surface)) {
        dev.appu.laluzgarage.ui.layout.TabletTopBar(
            title = "Inventory",
            summary = inventory.summary,
            sync = sync,
            account = account,
            query = searchQuery,
            onQueryChange = onSearchQueryChange,
            placeholder = "Search parts or category"
        )
        dev.appu.laluzgarage.ui.layout.TabletContentCard {
            Column(Modifier.fillMaxSize()) {
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .horizontalScroll(rememberScrollState())
                        .padding(start = Spacing.md, end = Spacing.md, top = Spacing.md)
                        .semantics { contentDescription = "Filter parts" },
                    horizontalArrangement = Arrangement.spacedBy(Spacing.xs)
                ) {
                    inventory.chips.forEach { chip ->
                        LaluzFilterChip(
                            label = chip.label,
                            count = chip.count,
                            selected = selectedFilter == chip.key,
                            onClick = { onFilterChange(chip.key) }
                        )
                    }
                }
                Row(
                    modifier = Modifier.fillMaxWidth().padding(start = Spacing.lg, end = Spacing.xs, top = Spacing.xs),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text(
                        "${rows.size} ${if (rows.size == 1) "part" else "parts"}",
                        style = MaterialTheme.typography.labelLarge,
                        color = cs.onSurfaceVariant,
                        modifier = Modifier.weight(1f)
                    )
                    PartSortButton(sort = inventory.sort, onSortChange = onSortChange)
                }
                LazyColumn(
                    modifier = Modifier.fillMaxSize(),
                    contentPadding = PaddingValues(start = Spacing.md, end = Spacing.md, bottom = Spacing.md)
                ) {
                    itemsIndexed(rows, key = { _, row -> row.part.id }, contentType = { _, _ -> "part" }) { index, row ->
                        PartRow(
                            row = row,
                            index = index,
                            count = rows.size,
                            onClick = { onOpenPart(row.part) },
                            selected = row.part.id == selectedId,
                            modifier = Modifier.fillMaxWidth().padding(bottom = 2.dp).animateItem()
                        )
                    }
                    if (rows.isEmpty()) {
                        item(key = "empty", contentType = "empty") {
                            Text(
                                if (inventory.isLoading) "Loading parts…" else "No parts match.",
                                style = MaterialTheme.typography.bodyMedium,
                                color = cs.onSurfaceVariant,
                                textAlign = TextAlign.Center,
                                modifier = Modifier.fillMaxWidth().padding(horizontal = Spacing.xl, vertical = 48.dp)
                            )
                        }
                    }
                }
            }
        }
    }
}

/** Triangle with rounded corners and no mark inside; the Icon tint colours it as the warning. */
private val LowStockTriangle: ImageVector by lazy {
    ImageVector.Builder("LowStockTriangle", 24.dp, 24.dp, 24f, 24f)
        .addPath(
            pathData = addPathNodes("M12 4L21 19H3Z"),
            fill = SolidColor(Color.Black),
            stroke = SolidColor(Color.Black),
            strokeLineWidth = 2f,
            strokeLineJoin = StrokeJoin.Round
        )
        .build()
}

/** Sort menu: the current order on the button; the six orders listed in a dropdown, selected one in primary. */
@Composable
private fun PartSortButton(sort: PartSort, onSortChange: (PartSort) -> Unit) {
    var open by remember { mutableStateOf(false) }
    Box {
        LaluzTextButton(
            text = sort.label,
            onClick = { open = true },
            icon = LaluzIcons.Sort,
            contentDescription = "Sorted by ${sort.label.lowercase()}. Open sort options"
        )
        DropdownMenu(expanded = open, onDismissRequest = { open = false }) {
            PartSort.entries.forEach { option ->
                DropdownMenuItem(
                    text = { Text(option.label) },
                    onClick = {
                        open = false
                        onSortChange(option)
                    },
                    colors = MenuDefaults.itemColors(
                        textColor = if (option == sort) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.onSurface
                    )
                )
            }
        }
    }
}

/** 72dp connected row: name and category · location, price and stock on the right. */
@Composable
private fun PartRow(row: PartRowModel, index: Int, count: Int, onClick: () -> Unit, modifier: Modifier = Modifier, selected: Boolean = false) {
    val cs = MaterialTheme.colorScheme
    val tablet = dev.appu.laluzgarage.ui.layout.LocalAdaptive.current.isTablet
    Surface(
        onClick = onClick,
        shape = connectedRowShape(index, count),
        color = if (selected) cs.secondaryContainer else if (tablet) cs.surfaceContainer else cs.surfaceContainerLow,
        contentColor = if (selected) cs.onSecondaryContainer else cs.onSurface,
        modifier = modifier
    ) {
        Row(
            Modifier
                .heightIn(min = 72.dp)
                .padding(horizontal = Spacing.md, vertical = Spacing.xs),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(Spacing.md)
        ) {
            Column(Modifier.weight(1f)) {
                Text(row.name, style = MaterialTheme.typography.titleMedium, color = LocalContentColor.current, maxLines = 1, overflow = TextOverflow.Ellipsis)
                if (row.meta.isNotEmpty()) {
                    Text(row.meta, style = MaterialTheme.typography.bodyMedium, color = cs.onSurfaceVariant, maxLines = 1, overflow = TextOverflow.Ellipsis)
                }
            }
            Column(horizontalAlignment = Alignment.End, verticalArrangement = Arrangement.spacedBy(Spacing.xxs)) {
                // Low stock: a warning triangle sits beside the price instead of a chip under it.
                Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(Spacing.xxs)) {
                    if (row.isLow) Icon(
                        LowStockTriangle,
                        contentDescription = row.stockLabel,
                        tint = LaluzTheme.extendedColors.warning,
                        modifier = Modifier.size(18.dp)
                    )
                    Text(row.price, style = MaterialTheme.typography.titleMedium.copy(fontWeight = FontWeight.Bold), color = LocalContentColor.current)
                }
                if (!row.isLow) Text(row.stockLabel, style = MaterialTheme.typography.bodySmall, color = cs.onSurfaceVariant)
            }
        }
    }
}
