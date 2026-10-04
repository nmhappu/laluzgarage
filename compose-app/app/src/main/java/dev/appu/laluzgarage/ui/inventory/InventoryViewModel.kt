package dev.appu.laluzgarage.ui.inventory

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import dagger.hilt.android.lifecycle.HiltViewModel
import dev.appu.laluzgarage.data.model.Part
import dev.appu.laluzgarage.data.repository.InventoryRepository
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.combine
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.launch
import javax.inject.Inject

val InventoryCategories = listOf(
    "All",
    "Brakes",
    "Engine",
    "Electrical",
    "Body",
    "Suspension",
    "Filters",
    "Fluids & Oils"
)

data class InventoryUiState(
    val parts: List<Part> = emptyList(),
    val totalPartsCount: Int = 0,
    val lowStockCount: Int = 0,
    val totalValuation: Double = 0.0,
    val isLoading: Boolean = true
)

@HiltViewModel
class InventoryViewModel @Inject constructor(
    private val inventoryRepository: InventoryRepository
) : ViewModel() {

    val searchQuery = MutableStateFlow("")
    val selectedCategory = MutableStateFlow("All")
    val showLowStockOnly = MutableStateFlow(false)

    val selectedPartForEdit = MutableStateFlow<Part?>(null)
    val isAddModalOpen = MutableStateFlow(false)

    private val _isSaving = MutableStateFlow(false)
    val isSaving: StateFlow<Boolean> = _isSaving.asStateFlow()

    private val _operationError = MutableStateFlow<String?>(null)
    val operationError: StateFlow<String?> = _operationError.asStateFlow()

    val uiState: StateFlow<InventoryUiState> = inventoryRepository.partsFlow().combine(
        MutableStateFlow(Unit)
    ) { parts, _ ->
        val lowStock = parts.count { it.stockQuantity <= it.minStockLevel }
        val valuation = parts.sumOf { it.price * it.stockQuantity }
        InventoryUiState(
            parts = parts,
            totalPartsCount = parts.size,
            lowStockCount = lowStock,
            totalValuation = valuation,
            isLoading = false
        )
    }.stateIn(
        scope = viewModelScope,
        started = SharingStarted.WhileSubscribed(5000),
        initialValue = InventoryUiState(isLoading = true)
    )

    fun savePart(part: Part, onSuccess: () -> Unit = {}) {
        viewModelScope.launch {
            _isSaving.value = true
            _operationError.value = null
            try {
                if (part.id.isBlank()) {
                    inventoryRepository.addPart(part)
                } else {
                    inventoryRepository.updatePart(part)
                }
                selectedPartForEdit.value = null
                isAddModalOpen.value = false
                onSuccess()
            } catch (e: Exception) {
                _operationError.value = e.localizedMessage ?: "Failed to save part"
            } finally {
                _isSaving.value = false
            }
        }
    }

    fun deletePart(partId: String, onSuccess: () -> Unit = {}) {
        viewModelScope.launch {
            _isSaving.value = true
            _operationError.value = null
            try {
                inventoryRepository.deletePart(partId)
                selectedPartForEdit.value = null
                onSuccess()
            } catch (e: Exception) {
                _operationError.value = e.localizedMessage ?: "Failed to delete part"
            } finally {
                _isSaving.value = false
            }
        }
    }
}
