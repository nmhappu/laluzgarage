package dev.appu.laluzgarage.ui.services

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.CarRepair
import androidx.compose.material.icons.filled.Clear
import androidx.compose.material.icons.filled.Search
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.FilterChip
import androidx.compose.material3.FilterChipDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.OutlinedTextFieldDefaults
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.rememberModalBottomSheetState
import androidx.compose.material3.windowsizeclass.WindowWidthSizeClass
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import dev.appu.laluzgarage.data.model.ServiceRecord
import dev.appu.laluzgarage.ui.theme.DarkOutline
import dev.appu.laluzgarage.ui.theme.DarkSurfaceContainer

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ServicesScreen(
    windowWidthSizeClass: WindowWidthSizeClass,
    viewModel: ServiceViewModel = hiltViewModel(),
    modifier: Modifier = Modifier
) {
    val uiState by viewModel.uiState.collectAsState()
    val selectedFilter by viewModel.selectedFilter.collectAsState()
    val searchQuery by viewModel.searchQuery.collectAsState()
    val selectedRecord by viewModel.selectedRecord.collectAsState()
    val isUpdating by viewModel.isUpdating.collectAsState()

    val isTablet = windowWidthSizeClass != WindowWidthSizeClass.Compact

    // Filter and search logic
    val filteredRecords = remember(uiState.records, selectedFilter, searchQuery, uiState.vehicleMap, uiState.customerMap) {
        uiState.records.filter { record ->
            // Filter tab match
            val matchesTab = when (selectedFilter) {
                ServiceStatusFilter.ALL -> true
                ServiceStatusFilter.PENDING -> record.status.equals("pending", ignoreCase = true)
                ServiceStatusFilter.IN_PROGRESS -> record.status.equals("in-progress", ignoreCase = true)
                ServiceStatusFilter.COMPLETED -> record.status.equals("completed", ignoreCase = true)
            }

            if (!matchesTab) return@filter false

            // Search query match
            if (searchQuery.isBlank()) return@filter true

            val q = searchQuery.trim().lowercase()
            val vehicle = uiState.vehicleMap[record.vehicleId]
            val customer = uiState.customerMap[record.customerId]

            (vehicle?.plateNumber?.lowercase()?.contains(q) == true) ||
            ("${vehicle?.make} ${vehicle?.model}".lowercase().contains(q)) ||
            (customer?.name?.lowercase()?.contains(q) == true) ||
            (customer?.phone?.contains(q) == true) ||
            (record.description.lowercase().contains(q))
        }
    }

    if (uiState.isLoading) {
        Box(
            modifier = modifier.fillMaxSize(),
            contentAlignment = Alignment.Center
        ) {
            Column(horizontalAlignment = Alignment.CenterHorizontally) {
                CircularProgressIndicator(
                    color = MaterialTheme.colorScheme.primary,
                    strokeWidth = 2.5.dp
                )
                Spacer(modifier = Modifier.height(12.dp))
                Text(
                    text = "Syncing live workshop service records...",
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
            }
        }
        return
    }

    if (isTablet) {
        // Rugged Tablet: Master-Detail Two-Pane Layout
        Row(
            modifier = modifier
                .fillMaxSize()
                .background(MaterialTheme.colorScheme.background)
        ) {
            // Left Pane: Filter, Search & Job Cards List (45% width)
            Column(
                modifier = Modifier
                    .weight(1f)
                    .fillMaxHeight()
                    .border(width = 1.dp, color = DarkOutline)
                    .padding(16.dp)
            ) {
                ServicesHeader(
                    searchQuery = searchQuery,
                    onSearchChange = { viewModel.setSearchQuery(it) },
                    selectedFilter = selectedFilter,
                    onFilterChange = { viewModel.setFilter(it) },
                    resultCount = filteredRecords.size
                )

                Spacer(modifier = Modifier.height(12.dp))

                LazyColumn(
                    modifier = Modifier.fillMaxSize(),
                    verticalArrangement = Arrangement.spacedBy(12.dp),
                    contentPadding = PaddingValues(bottom = 24.dp)
                ) {
                    items(filteredRecords, key = { it.id }) { record ->
                        ServiceRecordCard(
                            record = record,
                            vehicle = uiState.vehicleMap[record.vehicleId],
                            customer = uiState.customerMap[record.customerId],
                            isSelected = selectedRecord?.id == record.id,
                            onClick = { viewModel.selectRecord(record) }
                        )
                    }
                }
            }

            // Right Pane: Embedded Vehicle Ledger & Work Order Drawer (55% width)
            Box(
                modifier = Modifier
                    .weight(1.25f)
                    .fillMaxHeight()
                    .background(DarkSurfaceContainer)
            ) {
                if (selectedRecord != null) {
                    EditRecordSheetContent(
                        record = selectedRecord!!,
                        vehicle = uiState.vehicleMap[selectedRecord!!.vehicleId],
                        customer = uiState.customerMap[selectedRecord!!.customerId],
                        availableParts = uiState.parts,
                        onSaveRecord = { updated ->
                            viewModel.updateRecord(updated)
                        },
                        onClose = { viewModel.selectRecord(null) },
                        isUpdating = isUpdating
                    )
                } else {
                    Box(
                        modifier = Modifier.fillMaxSize(),
                        contentAlignment = Alignment.Center
                    ) {
                        Column(horizontalAlignment = Alignment.CenterHorizontally) {
                            Icon(
                                imageVector = Icons.Default.CarRepair,
                                contentDescription = null,
                                tint = MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.4f),
                                modifier = Modifier.size(56.dp)
                            )
                            Spacer(modifier = Modifier.height(12.dp))
                            Text(
                                text = "Select a Job Card",
                                style = MaterialTheme.typography.titleMedium,
                                fontWeight = FontWeight.Bold,
                                color = MaterialTheme.colorScheme.onSurfaceVariant
                            )
                            Text(
                                text = "Choose a vehicle from the left pane to view ledger & update repair items.",
                                style = MaterialTheme.typography.bodySmall,
                                color = MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.7f),
                                modifier = Modifier.padding(top = 4.dp)
                            )
                        }
                    }
                }
            }
        }
    } else {
        // Phone Layout: Single Column List + ModalBottomSheet Drawer
        Column(
            modifier = modifier
                .fillMaxSize()
                .background(MaterialTheme.colorScheme.background)
                .padding(horizontal = 16.dp, vertical = 12.dp)
        ) {
            ServicesHeader(
                searchQuery = searchQuery,
                onSearchChange = { viewModel.setSearchQuery(it) },
                selectedFilter = selectedFilter,
                onFilterChange = { viewModel.setFilter(it) },
                resultCount = filteredRecords.size
            )

            Spacer(modifier = Modifier.height(12.dp))

            LazyColumn(
                modifier = Modifier.fillMaxSize(),
                verticalArrangement = Arrangement.spacedBy(12.dp),
                contentPadding = PaddingValues(bottom = 80.dp)
            ) {
                items(filteredRecords, key = { it.id }) { record ->
                    ServiceRecordCard(
                        record = record,
                        vehicle = uiState.vehicleMap[record.vehicleId],
                        customer = uiState.customerMap[record.customerId],
                        isSelected = false,
                        onClick = { viewModel.selectRecord(record) }
                    )
                }
            }
        }

        // Phone Bottom Sheet
        if (selectedRecord != null) {
            val sheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true)
            ModalBottomSheet(
                onDismissRequest = { viewModel.selectRecord(null) },
                sheetState = sheetState,
                containerColor = MaterialTheme.colorScheme.background,
                dragHandle = null
            ) {
                EditRecordSheetContent(
                    record = selectedRecord!!,
                    vehicle = uiState.vehicleMap[selectedRecord!!.vehicleId],
                    customer = uiState.customerMap[selectedRecord!!.customerId],
                    availableParts = uiState.parts,
                    onSaveRecord = { updated ->
                        viewModel.updateRecord(updated) {
                            viewModel.selectRecord(null)
                        }
                    },
                    onClose = { viewModel.selectRecord(null) },
                    isUpdating = isUpdating
                )
            }
        }
    }
}

@Composable
private fun ServicesHeader(
    searchQuery: String,
    onSearchChange: (String) -> Unit,
    selectedFilter: ServiceStatusFilter,
    onFilterChange: (ServiceStatusFilter) -> Unit,
    resultCount: Int
) {
    Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
        // Search Input
        OutlinedTextField(
            value = searchQuery,
            onValueChange = onSearchChange,
            placeholder = { Text("Search plate, customer, phone, tasks...") },
            leadingIcon = {
                Icon(
                    imageVector = Icons.Default.Search,
                    contentDescription = "Search",
                    tint = MaterialTheme.colorScheme.onSurfaceVariant
                )
            },
            trailingIcon = {
                if (searchQuery.isNotEmpty()) {
                    IconButton(onClick = { onSearchChange("") }) {
                        Icon(
                            imageVector = Icons.Default.Clear,
                            contentDescription = "Clear search",
                            tint = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                    }
                }
            },
            singleLine = true,
            modifier = Modifier.fillMaxWidth(),
            shape = RoundedCornerShape(14.dp),
            colors = OutlinedTextFieldDefaults.colors(
                focusedBorderColor = MaterialTheme.colorScheme.primary,
                unfocusedBorderColor = MaterialTheme.colorScheme.outline
            )
        )

        // Filter Tabs Row
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .horizontalScroll(rememberScrollState()),
            horizontalArrangement = Arrangement.spacedBy(8.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            ServiceStatusFilter.entries.forEach { filter ->
                val isSelected = selectedFilter == filter
                FilterChip(
                    selected = isSelected,
                    onClick = { onFilterChange(filter) },
                    label = {
                        Text(
                            text = filter.label,
                            fontWeight = if (isSelected) FontWeight.Bold else FontWeight.Medium
                        )
                    },
                    shape = RoundedCornerShape(10.dp),
                    colors = FilterChipDefaults.filterChipColors(
                        selectedContainerColor = MaterialTheme.colorScheme.primary.copy(alpha = 0.18f),
                        selectedLabelColor = MaterialTheme.colorScheme.primary
                    )
                )
            }

            Spacer(modifier = Modifier.weight(1f))

            Text(
                text = "$resultCount jobs",
                style = MaterialTheme.typography.labelSmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                modifier = Modifier.padding(start = 8.dp)
            )
        }
    }
}
