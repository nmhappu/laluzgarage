package dev.appu.laluzgarage.ui.services

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import dagger.hilt.android.lifecycle.HiltViewModel
import dev.appu.laluzgarage.data.model.Customer
import dev.appu.laluzgarage.data.model.Part
import dev.appu.laluzgarage.data.model.ServiceRecord
import dev.appu.laluzgarage.data.model.Vehicle
import dev.appu.laluzgarage.data.repository.ServiceRepository
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.combine
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.launch
import javax.inject.Inject

enum class ServiceStatusFilter(val value: String, val label: String) {
    ALL("all", "All Jobs"),
    PENDING("pending", "Pending"),
    IN_PROGRESS("in-progress", "In Progress"),
    COMPLETED("completed", "Completed")
}

data class ServiceUiState(
    val records: List<ServiceRecord> = emptyList(),
    val vehicleMap: Map<String, Vehicle> = emptyMap(),
    val customerMap: Map<String, Customer> = emptyMap(),
    val parts: List<Part> = emptyList(),
    val isLoading: Boolean = true,
    val isUpdating: Boolean = false,
    val updateError: String? = null
)

@HiltViewModel
class ServiceViewModel @Inject constructor(
    private val serviceRepository: ServiceRepository
) : ViewModel() {

    private val _selectedFilter = MutableStateFlow(ServiceStatusFilter.ALL)
    val selectedFilter: StateFlow<ServiceStatusFilter> = _selectedFilter.asStateFlow()

    private val _searchQuery = MutableStateFlow("")
    val searchQuery: StateFlow<String> = _searchQuery.asStateFlow()

    private val _selectedRecord = MutableStateFlow<ServiceRecord?>(null)
    val selectedRecord: StateFlow<ServiceRecord?> = _selectedRecord.asStateFlow()

    private val _isUpdating = MutableStateFlow(false)
    val isUpdating: StateFlow<Boolean> = _isUpdating.asStateFlow()

    private val _updateError = MutableStateFlow<String?>(null)
    val updateError: StateFlow<String?> = _updateError.asStateFlow()

    // Combining all streams into unified UI state
    val uiState: StateFlow<ServiceUiState> = combine(
        serviceRepository.serviceRecordsFlow(),
        serviceRepository.vehiclesFlow(),
        serviceRepository.customersFlow(),
        serviceRepository.partsFlow()
    ) { records, vehicles, customers, parts ->
        ServiceUiState(
            records = records,
            vehicleMap = vehicles.associateBy { it.id },
            customerMap = customers.associateBy { it.id },
            parts = parts,
            isLoading = false
        )
    }.stateIn(
        scope = viewModelScope,
        started = SharingStarted.WhileSubscribed(5000),
        initialValue = ServiceUiState(isLoading = true)
    )

    fun setFilter(filter: ServiceStatusFilter) {
        _selectedFilter.value = filter
    }

    fun setSearchQuery(query: String) {
        _searchQuery.value = query
    }

    fun selectRecord(record: ServiceRecord?) {
        _selectedRecord.value = record
    }

    fun updateRecord(record: ServiceRecord, onSuccess: () -> Unit = {}) {
        viewModelScope.launch {
            _isUpdating.value = true
            _updateError.value = null
            try {
                serviceRepository.updateServiceRecord(record)
                _selectedRecord.value = record
                onSuccess()
            } catch (e: Exception) {
                _updateError.value = e.localizedMessage ?: "Failed to update record"
            } finally {
                _isUpdating.value = false
            }
        }
    }
}
