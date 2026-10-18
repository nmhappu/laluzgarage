package dev.appu.laluzgarage.ui.vehicles

import dev.appu.laluzgarage.ui.theme.Radius
import dev.appu.laluzgarage.ui.components.rememberContainerSource
import dev.appu.laluzgarage.ui.components.containerSource
import dev.appu.laluzgarage.ui.components.LocalContainerTransform
import dev.appu.laluzgarage.ui.components.TopBarTitleSearch
import dev.appu.laluzgarage.ui.components.rememberHeaderScrolledAway
import dev.appu.laluzgarage.ui.components.syncTitleAlpha
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.imePadding
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.lazy.grid.items as gridItems
import dev.appu.laluzgarage.ui.layout.LocalAdaptive
import dev.appu.laluzgarage.ui.layout.TabletContentCard
import dev.appu.laluzgarage.ui.layout.TabletTopBar
import androidx.compose.foundation.lazy.LazyListState
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.lazy.rememberLazyListState
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.LocalContentColor
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import dev.appu.laluzgarage.data.model.Vehicle
import dev.appu.laluzgarage.data.sync.SyncUiState
import dev.appu.laluzgarage.ui.components.AccountActions
import dev.appu.laluzgarage.ui.components.DetailField
import dev.appu.laluzgarage.ui.components.LaluzSearchField
import dev.appu.laluzgarage.ui.components.LaluzSyncTopBar
import dev.appu.laluzgarage.ui.components.MaxContentWidth
import dev.appu.laluzgarage.ui.components.OperatorAvatarButton
import dev.appu.laluzgarage.ui.components.ScreenHeader
import dev.appu.laluzgarage.ui.theme.LaluzShape
import dev.appu.laluzgarage.ui.theme.LaluzType
import dev.appu.laluzgarage.ui.theme.Spacing

/** Vehicles tab: every vehicle on file, newest service first, searchable by plate, vehicle, owner or phone. */
@Composable
fun VehiclesScreen(
    list: VehiclesListUi,
    sync: SyncUiState,
    searchQuery: String,
    account: AccountActions,
    onSearchQueryChange: (String) -> Unit,
    onOpenVehicle: (Vehicle) -> Unit,
    listState: LazyListState = rememberLazyListState(),
    /** Tablet: the vehicle whose details are open in the side sheet. */
    selectedVehicleId: String? = null
) {
    if (LocalAdaptive.current.isTablet) {
        VehiclesTablet(list, sync, searchQuery, account, onSearchQueryChange, onOpenVehicle, selectedVehicleId)
        return
    }
    val cs = MaterialTheme.colorScheme
    val cards = list.cards
    val container = LocalContainerTransform.current
    Column(Modifier.fillMaxSize().background(cs.surface)) {
        LaluzSyncTopBar(sync = sync, scrolled = listState.canScrollBackward) {
            TopBarTitleSearch(
                title = "Vehicles",
                summary = list.summary,
                headerGone = rememberHeaderScrolledAway(listState),
                query = searchQuery,
                onQueryChange = onSearchQueryChange,
                placeholder = "Search plate, vehicle, owner or phone",
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
            // The title is its own item so the top bar can take it over once it scrolls away.
            item(key = "title", contentType = "title") {
                ScreenHeader("Vehicles", list.summary, Modifier.widthIn(max = MaxContentWidth).fillMaxWidth())
            }
            item(key = "search", contentType = "search") {
                Column(Modifier.widthIn(max = MaxContentWidth).fillMaxWidth()) {
                    LaluzSearchField(
                        value = searchQuery,
                        onValueChange = onSearchQueryChange,
                        placeholder = "Search plate, vehicle, owner or phone",
                        onClear = { onSearchQueryChange("") },
                        modifier = Modifier.padding(horizontal = Spacing.md)
                    )
                    Text(
                        "${cards.size} ${if (cards.size == 1) "vehicle" else "vehicles"}",
                        style = MaterialTheme.typography.labelLarge,
                        color = cs.onSurfaceVariant,
                        modifier = Modifier.padding(start = Spacing.xl, end = Spacing.xl, top = Spacing.md, bottom = Spacing.xs)
                    )
                }
            }
            items(cards, key = { it.vehicle.id }, contentType = { "vehicle" }) { card ->
                val source = rememberContainerSource()
                VehicleCard(
                    card = card,
                    onClick = { container.from("vehicle:${card.vehicle.id}", source); onOpenVehicle(card.vehicle) },
                    modifier = Modifier
                        .widthIn(max = MaxContentWidth)
                        .fillMaxWidth()
                        .padding(start = Spacing.md, end = Spacing.md, bottom = Spacing.xs)
                        .containerSource(source, Radius.xl)
                )
            }
            if (cards.isEmpty()) {
                item(key = "empty", contentType = "empty") {
                    Text(
                        when {
                            list.isLoading -> "Loading vehicles…"
                            list.query.isNotBlank() -> "No vehicles match your search."
                            else -> "No vehicles on file yet."
                        },
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
 * Tablet Vehicles: top bar on the plain surface, the cards in a content card. The grid reflows as the
 * side sheet takes width, and each card slides to its new place.
 */
@Composable
private fun VehiclesTablet(
    list: VehiclesListUi,
    sync: SyncUiState,
    searchQuery: String,
    account: AccountActions,
    onSearchQueryChange: (String) -> Unit,
    onOpenVehicle: (Vehicle) -> Unit,
    selectedId: String?
) {
    val cs = MaterialTheme.colorScheme
    val cards = list.cards
    Column(Modifier.fillMaxSize().background(cs.surface)) {
        TabletTopBar(
            title = "Vehicles",
            summary = list.summary,
            sync = sync,
            account = account,
            query = searchQuery,
            onQueryChange = onSearchQueryChange,
            placeholder = "Search plate, vehicle, owner or phone"
        )
        TabletContentCard {
            if (cards.isEmpty()) {
                Text(
                    when {
                        list.isLoading -> "Loading vehicles…"
                        list.query.isNotBlank() -> "No vehicles match your search."
                        else -> "No vehicles on file yet."
                    },
                    style = MaterialTheme.typography.bodyMedium,
                    color = cs.onSurfaceVariant,
                    textAlign = TextAlign.Center,
                    modifier = Modifier.fillMaxWidth().padding(horizontal = Spacing.xl, vertical = 48.dp)
                )
            } else {
                LazyVerticalGrid(
                    columns = GridCells.Adaptive(280.dp),
                    contentPadding = PaddingValues(Spacing.md),
                    horizontalArrangement = Arrangement.spacedBy(Spacing.xs),
                    verticalArrangement = Arrangement.spacedBy(Spacing.xs),
                    modifier = Modifier.fillMaxSize()
                ) {
                    gridItems(cards, key = { it.vehicle.id }, contentType = { "vehicle" }) { card ->
                        VehicleCard(
                            card = card,
                            onClick = { onOpenVehicle(card.vehicle) },
                            selected = card.vehicle.id == selectedId,
                            modifier = Modifier.animateItem()
                        )
                    }
                }
            }
        }
    }
}

/**
 * Vehicle card: plate and vehicle top-left, service count top-right, then a hairline and an
 * Owner / Last service pair. surfaceContainerLow, 20dp radius, 16dp padding.
 */
@Composable
private fun VehicleCard(card: VehicleCardModel, onClick: () -> Unit, modifier: Modifier = Modifier, selected: Boolean = false) {
    val cs = MaterialTheme.colorScheme
    val tablet = LocalAdaptive.current.isTablet
    Surface(
        onClick = onClick,
        shape = LaluzShape.card,
        // On tablets the card sits in a content card, so it is one tone up; selected while its sheet is open.
        color = if (selected) cs.secondaryContainer else if (tablet) cs.surfaceContainer else cs.surfaceContainerLow,
        contentColor = if (selected) cs.onSecondaryContainer else cs.onSurface,
        modifier = modifier
    ) {
        Column(Modifier.padding(Spacing.md), verticalArrangement = Arrangement.spacedBy(Spacing.md)) {
            Row(verticalAlignment = Alignment.Top) {
                Column(Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(Spacing.xxs)) {
                    Text(card.plate, style = LaluzType.plate, color = LocalContentColor.current)
                    Text(
                        card.description,
                        style = MaterialTheme.typography.bodyMedium,
                        color = cs.onSurfaceVariant,
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis
                    )
                }
                Spacer(Modifier.size(Spacing.xs))
                Column(horizontalAlignment = Alignment.End) {
                    Text(card.services.toString(), style = MaterialTheme.typography.titleLarge, color = cs.onSurface)
                    Text(
                        if (card.services == 1) "service" else "services",
                        style = MaterialTheme.typography.bodySmall,
                        color = cs.onSurfaceVariant
                    )
                }
            }
            Column {
                HorizontalDivider(thickness = 1.dp, color = cs.outlineVariant)
                Row(Modifier.padding(top = Spacing.sm), horizontalArrangement = Arrangement.spacedBy(Spacing.md)) {
                    DetailField("Owner", value = card.owner, maxLines = 1, modifier = Modifier.weight(1f))
                    DetailField("Last service", value = card.lastService, maxLines = 1, modifier = Modifier.weight(1f))
                }
            }
        }
    }
}
