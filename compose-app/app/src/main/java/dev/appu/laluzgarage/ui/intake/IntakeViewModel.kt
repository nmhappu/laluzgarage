package dev.appu.laluzgarage.ui.intake

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import dagger.hilt.android.lifecycle.HiltViewModel
import dev.appu.laluzgarage.data.model.Customer
import dev.appu.laluzgarage.data.model.Vehicle
import dev.appu.laluzgarage.data.model.WorkshopUser
import dev.appu.laluzgarage.data.repository.IntakeRepository
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import java.net.URLEncoder
import java.time.LocalDate
import java.time.format.DateTimeFormatter
import javax.inject.Inject

enum class IntakeStep(val stepNumber: Int, val title: String) {
    CUSTOMER(1, "Customer Discovery"),
    VEHICLE(2, "Vehicle Selection"),
    JOB(3, "Job Specification"),
    SUCCESS(4, "Intake Complete")
}

data class CreatedIntakeSummary(
    val recordId: String,
    val customerName: String,
    val customerPhone: String,
    val vehicleTitle: String,
    val vehiclePlate: String,
    val description: String,
    val whatsAppUrl: String
)

@HiltViewModel
class IntakeViewModel @Inject constructor(
    private val intakeRepository: IntakeRepository
) : ViewModel() {

    private val _currentStep = MutableStateFlow(IntakeStep.CUSTOMER)
    val currentStep: StateFlow<IntakeStep> = _currentStep.asStateFlow()

    // Existing data cache for lookups
    val existingCustomers = MutableStateFlow<List<Customer>>(emptyList())
    val existingVehicles = MutableStateFlow<List<Vehicle>>(emptyList())

    // Step 1: Customer Form
    val customerSearchQuery = MutableStateFlow("")
    val selectedCustomer = MutableStateFlow<Customer?>(null)
    val inputCustomerName = MutableStateFlow("")
    val inputCustomerPhone = MutableStateFlow("")

    // Step 2: Vehicle Form
    val selectedVehicle = MutableStateFlow<Vehicle?>(null)
    val inputPlateNumber = MutableStateFlow("")
    val inputMake = MutableStateFlow("")
    val inputModel = MutableStateFlow("")
    val inputColor = MutableStateFlow("")
    val isKeyPin = MutableStateFlow(true) // True = Physical Key, False = Screen PIN
    val inputPasscodeOrPin = MutableStateFlow("")

    // Step 3: Job Specification Form
    val inputMileage = MutableStateFlow("")
    val isDeadVehicle = MutableStateFlow(false)
    val expectedDeliveryDate = MutableStateFlow(LocalDate.now().plusDays(1).format(DateTimeFormatter.ISO_DATE))
    val taskList = MutableStateFlow<List<String>>(emptyList())
    val inputPersonalItems = MutableStateFlow("")
    val inputRemarks = MutableStateFlow("")

    // Submission states
    private val _isSubmitting = MutableStateFlow(false)
    val isSubmitting: StateFlow<Boolean> = _isSubmitting.asStateFlow()

    private val _submissionError = MutableStateFlow<String?>(null)
    val submissionError: StateFlow<String?> = _submissionError.asStateFlow()

    private val _createdJob = MutableStateFlow<CreatedIntakeSummary?>(null)
    val createdJob: StateFlow<CreatedIntakeSummary?> = _createdJob.asStateFlow()

    init {
        loadData()
    }

    private fun loadData() {
        viewModelScope.launch {
            try {
                existingCustomers.value = intakeRepository.getCustomers()
                existingVehicles.value = intakeRepository.getVehicles()
            } catch (_: Exception) { }
        }
    }

    fun nextStep() {
        when (_currentStep.value) {
            IntakeStep.CUSTOMER -> _currentStep.value = IntakeStep.VEHICLE
            IntakeStep.VEHICLE -> _currentStep.value = IntakeStep.JOB
            IntakeStep.JOB -> {} // Submit triggers step change to SUCCESS
            IntakeStep.SUCCESS -> {}
        }
    }

    fun previousStep() {
        when (_currentStep.value) {
            IntakeStep.CUSTOMER -> {}
            IntakeStep.VEHICLE -> _currentStep.value = IntakeStep.CUSTOMER
            IntakeStep.JOB -> _currentStep.value = IntakeStep.VEHICLE
            IntakeStep.SUCCESS -> {}
        }
    }

    fun addTask(task: String) {
        if (task.isNotBlank() && !taskList.value.contains(task.trim())) {
            taskList.value = taskList.value + task.trim()
        }
    }

    fun removeTask(task: String) {
        taskList.value = taskList.value - task
    }

    fun submitIntake(advisor: WorkshopUser?) {
        viewModelScope.launch {
            _isSubmitting.value = true
            _submissionError.value = null

            try {
                val technicianId = advisor?.id ?: "unassigned"
                val technicianName = advisor?.name?.ifBlank { advisor.email } ?: "Service Advisor"

                // 1. Resolve Customer ID
                val customerId = selectedCustomer.value?.id ?: run {
                    val name = inputCustomerName.value.ifBlank { "Valued Customer" }
                    val phone = inputCustomerPhone.value
                    intakeRepository.createCustomer(name, phone, technicianId)
                }
                val finalCustomerName = selectedCustomer.value?.name ?: inputCustomerName.value
                val finalCustomerPhone = selectedCustomer.value?.phone ?: inputCustomerPhone.value

                // 2. Resolve Vehicle ID
                val vehicleId = selectedVehicle.value?.id ?: run {
                    intakeRepository.createVehicle(
                        customerId = customerId,
                        make = inputMake.value.ifBlank { "Generic" },
                        model = inputModel.value.ifBlank { "Vehicle" },
                        color = inputColor.value,
                        plateNumber = inputPlateNumber.value,
                        passwordOrPin = inputPasscodeOrPin.value,
                        technicianId = technicianId
                    )
                }
                val finalMake = selectedVehicle.value?.make ?: inputMake.value
                val finalModel = selectedVehicle.value?.model ?: inputModel.value
                val finalPlate = selectedVehicle.value?.plateNumber ?: inputPlateNumber.value.uppercase()

                // 3. Format Tasks Checklist Description
                val descriptionLines = if (taskList.value.isNotEmpty()) {
                    taskList.value.joinToString("\n") { "[ ] $it" }
                } else {
                    "[ ] General inspection & workshop service"
                }

                val mileage = if (isDeadVehicle.value) 0L else (inputMileage.value.toLongOrNull() ?: 0L)

                // 4. Create Service Record
                val recordId = intakeRepository.createServiceRecord(
                    customerId = customerId,
                    vehicleId = vehicleId,
                    technicianId = technicianId,
                    technicianName = technicianName,
                    mileage = mileage,
                    isDeadVehicle = isDeadVehicle.value,
                    expectedDeliveryDate = expectedDeliveryDate.value,
                    description = descriptionLines,
                    personalItems = inputPersonalItems.value.ifBlank { null },
                    remarks = inputRemarks.value.ifBlank { null }
                )

                // 5. Generate Pre-filled WhatsApp Notification URL
                val cleanPhone = finalCustomerPhone.replace(Regex("[^0-9]"), "").let {
                    if (it.length == 10) "91$it" else it
                }
                val waMessage = """
                    Hello $finalCustomerName,
                    
                    We have successfully registered your vehicle *$finalMake $finalModel* [$finalPlate] at LaluZ Garage.
                    
                    *Job Details:*
                    $descriptionLines
                    
                    *Status:* Pending
                    
                    We will keep you updated on the repair progress. Thank you!
                """.trimIndent()

                val encodedText = URLEncoder.encode(waMessage, "UTF-8")
                val waUrl = "https://api.whatsapp.com/send?phone=$cleanPhone&text=$encodedText"

                _createdJob.value = CreatedIntakeSummary(
                    recordId = recordId,
                    customerName = finalCustomerName,
                    customerPhone = finalCustomerPhone,
                    vehicleTitle = "$finalMake $finalModel",
                    vehiclePlate = finalPlate,
                    description = descriptionLines,
                    whatsAppUrl = waUrl
                )

                _currentStep.value = IntakeStep.SUCCESS
            } catch (e: Exception) {
                _submissionError.value = e.localizedMessage ?: "Failed to submit vehicle intake"
            } finally {
                _isSubmitting.value = false
            }
        }
    }

    fun resetWizard() {
        _currentStep.value = IntakeStep.CUSTOMER
        selectedCustomer.value = null
        inputCustomerName.value = ""
        inputCustomerPhone.value = ""
        selectedVehicle.value = null
        inputPlateNumber.value = ""
        inputMake.value = ""
        inputModel.value = ""
        inputColor.value = ""
        inputPasscodeOrPin.value = ""
        inputMileage.value = ""
        isDeadVehicle.value = false
        taskList.value = emptyList()
        inputPersonalItems.value = ""
        inputRemarks.value = ""
        _createdJob.value = null
        _submissionError.value = null
    }
}
