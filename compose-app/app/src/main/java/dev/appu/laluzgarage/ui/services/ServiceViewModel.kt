package dev.appu.laluzgarage.ui.services

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import dagger.hilt.android.lifecycle.HiltViewModel
import dev.appu.laluzgarage.data.model.Customer
import dev.appu.laluzgarage.data.model.Part
import dev.appu.laluzgarage.data.model.PartUsed
import dev.appu.laluzgarage.data.model.ServiceRecord
import dev.appu.laluzgarage.data.model.Vehicle
import dev.appu.laluzgarage.data.repository.AuthRepository
import dev.appu.laluzgarage.data.repository.ServiceRepository
import dev.appu.laluzgarage.data.sync.NetworkMonitor
import dev.appu.laluzgarage.data.sync.SyncManager
import dev.appu.laluzgarage.data.sync.SyncUiState
import dev.appu.laluzgarage.ui.dashboard.DashboardUi
import dev.appu.laluzgarage.ui.dashboard.ServiceRange
import dev.appu.laluzgarage.ui.dashboard.computeDashboard
import dev.appu.laluzgarage.ui.inventory.InventoryIndex
import dev.appu.laluzgarage.ui.inventory.InventoryQuery
import dev.appu.laluzgarage.ui.inventory.InventoryUi
import dev.appu.laluzgarage.ui.inventory.PartFilter
import dev.appu.laluzgarage.ui.inventory.PartSort
import dev.appu.laluzgarage.ui.vehicles.VehiclesIndex
import dev.appu.laluzgarage.ui.vehicles.VehiclesListUi
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.flow.flowOn
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.collectLatest
import kotlinx.coroutines.flow.distinctUntilChanged
import kotlinx.coroutines.flow.map
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.combine
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import java.time.LocalDate
import javax.inject.Inject

data class ServiceUiState(
    val records: List<ServiceRecord> = emptyList(),
    val vehiclesMap: Map<String, Vehicle> = emptyMap(),
    val customersMap: Map<String, Customer> = emptyMap(),
    val availableParts: List<Part> = emptyList(),
    val selectedStatusFilter: String = "all", // all, pending, in-progress, completed
    val searchQuery: String = "",
    val newestFirst: Boolean = true,
    /** Arrival-date filter: one day (dateTo null or equal) or an inclusive range; null = all dates. */
    val dateFrom: LocalDate? = null,
    val dateTo: LocalDate? = null,
    /** Services list shows compact cards (plate, vehicle, status and every problem). */
    val compactCards: Boolean = false,
    val dashboardRange: ServiceRange = ServiceRange.D45,
    val isLoading: Boolean = true,
    val activeEditingRecord: ServiceRecord? = null,
    /** The record as last loaded or saved; Discard restores it and dirty compares against it. */
    val originalRecord: ServiceRecord? = null,
    val isSaving: Boolean = false,
    val justSaved: Boolean = false,
    val deliveryTemplate: String = DEFAULT_DELIVERY_TEMPLATE,
    val statusMessage: String? = null,
    val vehicleSearch: String = "",
    val partSearch: String = "",
    val partFilter: String = PartFilter.ALL,
    val partSort: PartSort = PartSort.NAME_ASC,
    /** Result of a vehicle or part save / delete, shown once as a snackbar. */
    val catalogMessage: String? = null
) {
    val isDirty: Boolean get() = activeEditingRecord != null && activeEditingRecord != originalRecord
}

@HiltViewModel
class ServiceViewModel @Inject constructor(
    private val serviceRepository: ServiceRepository,
    private val authRepository: AuthRepository,
    private val syncManager: SyncManager,
    networkMonitor: NetworkMonitor
) : ViewModel() {

    /** App-wide sync run, drawn in the top bar. */
    val sync: StateFlow<SyncUiState> = syncManager.state

    /** False while the device has no working internet; the dashboard shows an offline banner. */
    val isOnline: StateFlow<Boolean> = networkMonitor.isOnline

    /** Pull to refresh: re-reads every collection from the server. */
    fun refresh() = syncManager.refresh()

    /** Cold-start sync; a no-op after the first call in this process. */
    fun onAppShown() = syncManager.onAppStart()

    private val _uiState = MutableStateFlow(ServiceUiState())
    val uiState: StateFlow<ServiceUiState> = _uiState.asStateFlow()

    /**
     * The streamed collections, compared by reference: job card edits, search and filter changes
     * copy the state but keep these instances, so they don't trigger rebuilds downstream.
     */
    private val snapshots = _uiState
        .map { DataSnapshot(it.records, it.vehiclesMap, it.customersMap, it.availableParts, it.isLoading) }
        .distinctUntilChanged { a, b ->
            a.records === b.records && a.vehicles === b.vehicles && a.customers === b.customers &&
                a.parts === b.parts && a.isLoading == b.isLoading
        }

    /** Services list: card models built once per snapshot, then filtered per query, all off the main thread. */
    val servicesList: StateFlow<ServicesListUi> = combine(
        snapshots.map { ServicesListIndex(it.records, it.vehicles, it.customers, it.isLoading) },
        _uiState.map { ServicesListQuery(it.selectedStatusFilter, it.searchQuery, it.newestFirst, it.compactCards, it.dateFrom, it.dateTo) }.distinctUntilChanged()
    ) { index, query -> index.select(query) }
        .flowOn(Dispatchers.Default)
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(STOP_TIMEOUT_MS), ServicesListUi())

    /** Dashboard aggregates for the selected range, computed off the main thread. */
    val dashboard: StateFlow<DashboardUi> = combine(
        snapshots,
        _uiState.map { it.dashboardRange }.distinctUntilChanged()
    ) { s, range ->
        DashboardUi(
            stats = computeDashboard(s.records, s.vehicles, s.customers, s.parts, range),
            range = range,
            isLoading = s.isLoading
        )
    }
        .flowOn(Dispatchers.Default)
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(STOP_TIMEOUT_MS), DashboardUi())

    /** Vehicles list: card models built once per snapshot, then filtered per search, off the main thread. */
    val vehiclesList: StateFlow<VehiclesListUi> = combine(
        snapshots.map { VehiclesIndex(it.vehicles, it.customers, it.records, it.isLoading) },
        _uiState.map { it.vehicleSearch }.distinctUntilChanged()
    ) { index, query -> index.select(query) }
        .flowOn(Dispatchers.Default)
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(STOP_TIMEOUT_MS), VehiclesListUi())

    /** Inventory list: rows built once per snapshot, then searched, filtered and sorted off the main thread. */
    val inventory: StateFlow<InventoryUi> = combine(
        snapshots.map { InventoryIndex(it.parts, it.isLoading) },
        _uiState.map { InventoryQuery(it.partSearch, it.partFilter, it.partSort) }.distinctUntilChanged()
    ) { index, query -> index.select(query) }
        .flowOn(Dispatchers.Default)
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(STOP_TIMEOUT_MS), InventoryUi())

    init {
        // Keep the Firestore listeners alive only while the UI observes state
        // (plus a grace period for rotation / brief backgrounding).
        viewModelScope.launch {
            var dataJob: Job? = null
            _uiState.subscriptionCount
                .map { it > 0 }
                .distinctUntilChanged()
                .collectLatest { active ->
                    if (active) {
                        if (dataJob?.isActive != true) {
                            dataJob = launch { collectData() }
                        }
                    } else {
                        delay(STOP_TIMEOUT_MS)
                        dataJob?.cancel()
                        dataJob = null
                    }
                }
        }
    }

    /**
     * Streams follow the signed-in user: Firestore rules reject listeners opened while signed out,
     * and a rejected listener never recovers, so restart them whenever the uid changes.
     */
    private suspend fun collectData() {
        authRepository.currentUser
            .map { it?.uid }
            .distinctUntilChanged()
            .collectLatest { uid ->
                if (uid == null) {
                    _uiState.update { ServiceUiState(isLoading = true) }
                } else {
                    _uiState.update { it.copy(isLoading = true) }
                    collectStreams()
                }
            }
    }

    private suspend fun collectStreams() {
        serviceRepository.getDeliveryTemplate()?.let { t -> _uiState.update { it.copy(deliveryTemplate = t) } }
        combine(
            serviceRepository.getServiceRecordsStream(),
            serviceRepository.getVehiclesStream(),
            serviceRepository.getCustomersStream(),
            serviceRepository.getPartsStream()
        ) { records, vehicles, customers, parts ->
            val vMap = vehicles.associateBy { it.id }
            val cMap = customers.associateBy { it.id }
            Quad(records, vMap, cMap, parts)
        }.collect { (records, vMap, cMap, parts) ->
            _uiState.update { current ->
                current.copy(
                    records = records,
                    vehiclesMap = vMap,
                    customersMap = cMap,
                    availableParts = parts,
                    isLoading = false
                )
            }
        }
    }

    private companion object {
        const val STOP_TIMEOUT_MS = 5_000L
    }

    fun setStatusFilter(filter: String) {
        _uiState.update { it.copy(selectedStatusFilter = filter) }
    }

    fun setSearchQuery(query: String) {
        _uiState.update { it.copy(searchQuery = query) }
    }

    fun toggleSortOrder() {
        _uiState.update { it.copy(newestFirst = !it.newestFirst) }
    }

    fun setDateRange(from: LocalDate?, to: LocalDate?) {
        _uiState.update { it.copy(dateFrom = from, dateTo = to) }
    }

    fun toggleCompactCards() {
        _uiState.update { it.copy(compactCards = !it.compactCards) }
    }

    fun setDashboardRange(range: ServiceRange) {
        _uiState.update { it.copy(dashboardRange = range) }
    }

    fun openRecord(record: ServiceRecord) {
        _uiState.update {
            it.copy(activeEditingRecord = record, originalRecord = record, justSaved = false, statusMessage = null)
        }
    }

    fun closeRecord() {
        _uiState.update {
            it.copy(activeEditingRecord = null, originalRecord = null, justSaved = false, statusMessage = null)
        }
    }

    /** Throws away unsaved edits on the open job card. */
    fun discardChanges() {
        _uiState.update { it.copy(activeEditingRecord = it.originalRecord, justSaved = false, statusMessage = null) }
    }

    fun clearStatusMessage() {
        _uiState.update { it.copy(statusMessage = null) }
    }

    private inline fun edit(crossinline block: (ServiceRecord) -> ServiceRecord) {
        _uiState.update { current ->
            val record = current.activeEditingRecord ?: return@update current
            current.copy(activeEditingRecord = block(record), justSaved = false)
        }
    }

    /**
     * Replaces the checklist from free text, one problem per line. Done states carry over by
     * line position, like the job card's Edit mode.
     */
    fun setProblemsText(text: String) = edit { record ->
        val previous = parseTasks(record.description)
        val lines = text.lines()
        val tasks = lines.mapIndexedNotNull { i, line ->
            val t = line.trim()
            if (t.isEmpty()) null else TaskLine(t, previous.getOrNull(i)?.done == true)
        }
        record.copy(description = serializeTasks(tasks))
    }

    fun updateStatus(newStatus: String) {
        _uiState.update { current ->
            val record = current.activeEditingRecord ?: return@update current
            current.copy(activeEditingRecord = record.copy(status = newStatus))
        }
    }

    fun updateLaborCost(cost: Double) {
        _uiState.update { current ->
            val record = current.activeEditingRecord ?: return@update current
            val total = cost + record.partsCost
            current.copy(activeEditingRecord = record.copy(laborCost = cost, totalCost = total))
        }
    }

    fun updateRemarks(remarks: String) {
        _uiState.update { current ->
            val record = current.activeEditingRecord ?: return@update current
            current.copy(activeEditingRecord = record.copy(remarks = remarks))
        }
    }

    fun updateFinalRemarks(finalRemarks: String) {
        _uiState.update { current ->
            val record = current.activeEditingRecord ?: return@update current
            current.copy(activeEditingRecord = record.copy(finalRemarks = finalRemarks))
        }
    }

    fun updateBattery(battery: Int?) = edit { it.copy(battery = battery) }

    fun updateCompletionMileage(mileage: Int?) {
        _uiState.update { current ->
            val record = current.activeEditingRecord ?: return@update current
            current.copy(activeEditingRecord = record.copy(completionMileage = mileage))
        }
    }

    fun toggleTask(index: Int) = edit { record ->
        val tasks = parseTasks(record.description).toMutableList()
        if (index in tasks.indices) tasks[index] = tasks[index].copy(done = !tasks[index].done)
        record.copy(description = serializeTasks(tasks))
    }

    fun addTask(taskName: String) {
        if (taskName.isBlank()) return
        edit { record ->
            record.copy(description = serializeTasks(parseTasks(record.description) + TaskLine(taskName.trim(), false)))
        }
    }

    fun addPart(part: Part) {
        _uiState.update { current ->
            val record = current.activeEditingRecord ?: return@update current
            val existingIndex = record.partsUsed.indexOfFirst { it.partId == part.id }
            val updatedParts = record.partsUsed.toMutableList()
            if (existingIndex >= 0) {
                val existing = updatedParts[existingIndex]
                updatedParts[existingIndex] = existing.copy(quantity = existing.quantity + 1)
            } else {
                updatedParts.add(
                    PartUsed(
                        partId = part.id,
                        name = part.name,
                        quantity = 1,
                        unitPrice = part.price
                    )
                )
            }
            val partsTotal = updatedParts.sumOf { it.total }
            val totalCost = record.laborCost + partsTotal
            current.copy(
                activeEditingRecord = record.copy(
                    partsUsed = updatedParts,
                    partsCost = partsTotal,
                    totalCost = totalCost
                )
            )
        }
    }

    fun updatePartQuantity(index: Int, delta: Int) {
        _uiState.update { current ->
            val record = current.activeEditingRecord ?: return@update current
            val updatedParts = record.partsUsed.toMutableList()
            if (index in updatedParts.indices) {
                val currentPart = updatedParts[index]
                val newQty = currentPart.quantity + delta
                if (newQty <= 0) {
                    updatedParts.removeAt(index)
                } else {
                    updatedParts[index] = currentPart.copy(quantity = newQty)
                }
            }
            val partsTotal = updatedParts.sumOf { it.total }
            val totalCost = record.laborCost + partsTotal
            current.copy(
                activeEditingRecord = record.copy(
                    partsUsed = updatedParts,
                    partsCost = partsTotal,
                    totalCost = totalCost
                )
            )
        }
    }

    fun removePart(index: Int) {
        _uiState.update { current ->
            val record = current.activeEditingRecord ?: return@update current
            val updatedParts = record.partsUsed.toMutableList()
            if (index in updatedParts.indices) {
                updatedParts.removeAt(index)
            }
            val partsTotal = updatedParts.sumOf { it.total }
            val totalCost = record.laborCost + partsTotal
            current.copy(
                activeEditingRecord = record.copy(
                    partsUsed = updatedParts,
                    partsCost = partsTotal,
                    totalCost = totalCost
                )
            )
        }
    }

    fun saveActiveRecord(onSaved: () -> Unit = {}) {
        val record = _uiState.value.activeEditingRecord ?: return
        viewModelScope.launch {
            _uiState.update { it.copy(isSaving = true) }
            val result = serviceRepository.updateServiceRecord(record)
            result.onSuccess {
                _uiState.update { it.copy(isSaving = false, originalRecord = record, justSaved = true, statusMessage = null) }
                onSaved()
            }.onFailure { err ->
                _uiState.update {
                    it.copy(isSaving = false, statusMessage = "Couldn't save the job card. ${err.message ?: "Check your connection and try again."}")
                }
            }
        }
    }

    // ---- Vehicles & inventory ----

    fun setVehicleSearch(query: String) = _uiState.update { it.copy(vehicleSearch = query) }

    fun setPartSearch(query: String) = _uiState.update { it.copy(partSearch = query) }

    fun setPartFilter(filter: String) = _uiState.update { it.copy(partFilter = filter) }

    fun setPartSort(sort: PartSort) = _uiState.update { it.copy(partSort = sort) }

    fun clearCatalogMessage() = _uiState.update { it.copy(catalogMessage = null) }

    private fun catalogWrite(failure: String, success: String?, onSuccess: () -> Unit = {}, write: suspend () -> Result<Unit>) {
        viewModelScope.launch {
            write().onSuccess {
                _uiState.update { it.copy(catalogMessage = success) }
                onSuccess()
            }.onFailure { err ->
                _uiState.update { it.copy(catalogMessage = "$failure ${err.message ?: "Check your connection and try again."}") }
            }
        }
    }

    fun saveVehicle(vehicle: Vehicle, onSaved: () -> Unit) =
        catalogWrite("Couldn't save the vehicle.", "Vehicle saved", onSaved) { serviceRepository.updateVehicle(vehicle) }

    fun deleteVehicle(vehicleId: String, onDeleted: () -> Unit) =
        catalogWrite("Couldn't delete the vehicle.", "Vehicle deleted", onDeleted) { serviceRepository.deleteVehicle(vehicleId) }

    fun savePart(part: Part, onSaved: () -> Unit) =
        catalogWrite("Couldn't save the part.", "Part saved", onSaved) { serviceRepository.savePart(part) }

    fun deletePart(partId: String, onDeleted: () -> Unit) =
        catalogWrite("Couldn't delete the part.", "Part deleted", onDeleted) { serviceRepository.deletePart(partId) }

    /** Saves the Edit job card form (odometer, problems, belongings, delivery date). */
    fun saveJobEdit(record: ServiceRecord, onSaved: () -> Unit) =
        catalogWrite("Couldn't save the job card.", "Job card updated", onSaved) {
            serviceRepository.updateServiceRecord(record)
        }

    /** Deletes a job card (admins only, per the Firestore rules); the result shows as a snackbar. */
    fun deleteRecord(recordId: String, onDeleted: () -> Unit = {}) =
        catalogWrite("Couldn't delete the job card.", "Job card deleted", onDeleted) {
            serviceRepository.deleteServiceRecord(recordId)
        }
}

private class DataSnapshot(
    val records: List<ServiceRecord>,
    val vehicles: Map<String, Vehicle>,
    val customers: Map<String, Customer>,
    val parts: List<Part>,
    val isLoading: Boolean
)

private data class Quad<A, B, C, D>(val first: A, val second: B, val third: C, val fourth: D)
