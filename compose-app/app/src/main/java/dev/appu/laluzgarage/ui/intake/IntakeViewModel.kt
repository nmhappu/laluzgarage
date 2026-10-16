package dev.appu.laluzgarage.ui.intake

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import dagger.hilt.android.lifecycle.HiltViewModel
import dev.appu.laluzgarage.data.model.Customer
import dev.appu.laluzgarage.data.model.ServiceRecord
import dev.appu.laluzgarage.data.model.Vehicle
import dev.appu.laluzgarage.data.model.WorkshopUser
import dev.appu.laluzgarage.data.repository.ServiceRepository
import dev.appu.laluzgarage.ui.services.DEFAULT_INTAKE_TEMPLATE
import dev.appu.laluzgarage.ui.services.TaskLine
import dev.appu.laluzgarage.ui.services.parseRecordDate
import dev.appu.laluzgarage.ui.services.serializeTasks
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.combine
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import java.time.LocalDate
import java.time.LocalTime
import java.time.format.DateTimeFormatter
import java.time.temporal.ChronoUnit
import javax.inject.Inject

/** Accepted on every account until advisors set their own PIN (same as the web app). */
private const val DEFAULT_ADVISOR_PIN = "1234"

fun advisorPinMatches(advisor: WorkshopUser?, pin: String): Boolean {
    val own = advisor?.pin?.ifBlank { null }
    return (own != null && own == pin) || pin == DEFAULT_ADVISOR_PIN
}

/** Stored when the vehicle has no registration yet. */
const val UNREGISTERED_PLATE = "U/R"

/** Common makes offered as one-tap chips under the Make field. */
val COMMON_MAKES = listOf("Ola", "Ather", "Honda", "TVS", "Hero", "Tylos")

enum class IntakeStep { PIN, SEARCH, CUSTOMER, VEHICLE, JOB, SUCCESS }

/** One search hit: a customer, one of their vehicles (if any) and that vehicle's last service. */
data class IntakeMatch(val customer: Customer, val vehicle: Vehicle?, val lastService: LocalDate?)

/** What the success screen summarises and shares. */
data class IssuedJob(
    val customerName: String,
    val phone: String,
    val make: String,
    val model: String,
    val plate: String,
    val intakeDate: LocalDate,
    val deliveryDate: LocalDate?,
    val description: String
)

data class IntakeUiState(
    val step: IntakeStep = IntakeStep.PIN,
    val pin: String = "",
    val pinWrong: Boolean = false,

    val query: String = "",
    val matches: List<IntakeMatch> = emptyList(),

    // An existing customer / vehicle picked from search; null while registering new ones.
    val selectedCustomer: Customer? = null,
    val selectedVehicle: Vehicle? = null,

    val customerName: String = "",
    val customerPhone: String = "",

    val make: String = "",
    val model: String = "",
    val plate: String = "",
    val unregistered: Boolean = false,
    val colour: String = "",
    val vehiclePin: String = "",
    val physicalKey: Boolean = false,

    val odometer: String = "",
    val odometerTouched: Boolean = false,
    val deadVehicle: Boolean = false,
    val vehicleLocked: Boolean = false,
    val problems: String = "",
    val belongings: String = "",
    val intakeDate: LocalDate = LocalDate.now(),
    val deliveryDate: LocalDate? = null,

    val isSubmitting: Boolean = false,
    val submitError: String? = null,
    val issued: IssuedJob? = null,
    val intakeTemplate: String = DEFAULT_INTAKE_TEMPLATE
) {
    val pinReady: Boolean get() = pin.length == 4 && !pinWrong

    val phoneDigits: String get() = customerPhone.filter { it.isDigit() }

    val customerValid: Boolean get() = customerName.isNotBlank() && phoneDigits.length == 10

    val vehicleValid: Boolean
        get() = make.isNotBlank() && model.isNotBlank() &&
            (unregistered || plate.isNotBlank()) &&
            (physicalKey || vehiclePin.isNotBlank())

    val odometerOk: Boolean get() = deadVehicle || vehicleLocked || (odometer.toIntOrNull() ?: 0) > 0

    val odometerError: Boolean
        get() = !deadVehicle && !vehicleLocked && ((odometerTouched && !odometerOk) || odometer == "0" || odometer.matches(Regex("0+")))

    val jobValid: Boolean get() = problems.isNotBlank() && deliveryDate != null && odometerOk

    /** Anything worth a "Discard intake?" prompt. */
    val hasData: Boolean
        get() = query.isNotBlank() || selectedCustomer != null || customerName.isNotBlank() || customerPhone.isNotBlank() ||
            make.isNotBlank() || model.isNotBlank() || plate.isNotBlank() || unregistered || colour.isNotBlank() ||
            vehiclePin.isNotBlank() || physicalKey || odometer.isNotBlank() || deadVehicle || vehicleLocked ||
            problems.isNotBlank() || belongings.isNotBlank() || deliveryDate != null

    // Labels for the summary cards, from the picked records or the typed values.
    val customerLabel: String get() = selectedCustomer?.name?.ifBlank { null } ?: customerName.trim()
    val phoneLabel: String get() = selectedCustomer?.phone ?: phoneDigits
    val vehicleMake: String get() = selectedVehicle?.make ?: make.trim()
    val vehicleModel: String get() = selectedVehicle?.model ?: model.trim()
    val plateLabel: String get() = selectedVehicle?.plateNumber ?: if (unregistered) UNREGISTERED_PLATE else plate
    val securityLabel: String get() = selectedVehicle?.passwordOrPin ?: if (physicalKey) "Physical Key" else vehiclePin
}

@HiltViewModel
class IntakeViewModel @Inject constructor(
    private val serviceRepository: ServiceRepository
) : ViewModel() {

    private val _uiState = MutableStateFlow(IntakeUiState())
    val uiState: StateFlow<IntakeUiState> = _uiState.asStateFlow()

    private var customers: List<Customer> = emptyList()
    private var vehicles: List<Vehicle> = emptyList()
    private var lastServiceByVehicle: Map<String, LocalDate> = emptyMap()

    init {
        viewModelScope.launch {
            serviceRepository.getIntakeTemplate()?.let { t -> _uiState.update { it.copy(intakeTemplate = t) } }
        }
        viewModelScope.launch {
            combine(
                serviceRepository.getCustomersStream(),
                serviceRepository.getVehiclesStream(),
                serviceRepository.getServiceRecordsStream()
            ) { c, v, r -> Triple(c, v, r) }.collect { (c, v, r) ->
                customers = c
                vehicles = v
                lastServiceByVehicle = r.mapNotNull { rec -> parseRecordDate(rec.date)?.let { rec.vehicleId to it } }
                    .groupBy({ it.first }, { it.second })
                    .mapValues { (_, dates) -> dates.max() }
                _uiState.update { it.copy(matches = search(it.query)) }
            }
        }
    }

    /** Fresh intake, starting at advisor verification. */
    fun start() {
        val template = _uiState.value.intakeTemplate
        _uiState.value = IntakeUiState(intakeTemplate = template)
    }

    // ---- Advisor PIN ----

    fun setPin(value: String) {
        _uiState.update { it.copy(pin = value.filter(Char::isDigit).take(4), pinWrong = false) }
    }

    fun verifyPin(advisor: WorkshopUser?) {
        val pin = _uiState.value.pin
        if (pin.length != 4) return
        if (advisorPinMatches(advisor, pin)) _uiState.update { it.copy(step = IntakeStep.SEARCH, pinWrong = false) }
        else _uiState.update { it.copy(pinWrong = true) }
    }

    // ---- Customer discovery ----

    private val compact = Regex("[\\s+]")

    private fun search(query: String): List<IntakeMatch> {
        val needle = query.lowercase().replace(compact, "")
        if (needle.isEmpty()) return emptyList()
        val byCustomer = vehicles.groupBy { it.customerId }
        fun hit(s: String) = s.isNotBlank() && s.lowercase().replace(compact, "").contains(needle)
        return customers.flatMap { c ->
            val own = byCustomer[c.id].orEmpty()
            val customerHit = hit(c.name) || hit(c.phone)
            if (own.isEmpty()) {
                if (customerHit) listOf(IntakeMatch(c, null, null)) else emptyList()
            } else {
                own.filter { v -> customerHit || hit(v.plateNumber) || hit("${v.make} ${v.model}") }
                    .map { v -> IntakeMatch(c, v, lastServiceByVehicle[v.id]) }
            }
        }
            .sortedByDescending { it.lastService ?: LocalDate.MIN }
            .take(30)
    }

    fun setQuery(value: String) {
        _uiState.update { it.copy(query = value, matches = search(value)) }
    }

    /** A vehicle on record goes straight to the job; a customer without one adds a vehicle first. */
    fun pickMatch(match: IntakeMatch) {
        _uiState.update {
            it.copy(
                selectedCustomer = match.customer,
                selectedVehicle = match.vehicle,
                step = if (match.vehicle != null) IntakeStep.JOB else IntakeStep.VEHICLE
            )
        }
    }

    fun registerNewCustomer() {
        _uiState.update { s ->
            val digits = s.query.filter(Char::isDigit)
            val prefillPhone = s.customerPhone.isBlank() && digits.length >= 10 && s.query.none { it.isLetter() }
            s.copy(
                selectedCustomer = null,
                selectedVehicle = null,
                customerPhone = if (prefillPhone) digits.takeLast(10) else s.customerPhone,
                step = IntakeStep.CUSTOMER
            )
        }
    }

    // ---- New customer ----

    fun setCustomerName(value: String) = _uiState.update { it.copy(customerName = value) }

    /** Digits and spaces; a pasted "91…" country code is dropped. */
    fun setCustomerPhone(value: String) {
        var v = value.filter { it.isDigit() || it == ' ' }
        if (v.startsWith("91") && v.count(Char::isDigit) > 10) v = v.drop(2)
        _uiState.update { it.copy(customerPhone = v.take(11)) }
    }

    fun continueToVehicle() = _uiState.update { if (it.customerValid) it.copy(step = IntakeStep.VEHICLE) else it }

    // ---- Vehicle ----

    fun setMake(value: String) = _uiState.update { it.copy(make = value) }
    fun setModel(value: String) = _uiState.update { it.copy(model = value) }
    fun setPlate(value: String) = _uiState.update { it.copy(plate = value.replace(Regex("\\s+"), "").uppercase().take(15)) }
    fun toggleUnregistered() = _uiState.update { it.copy(unregistered = !it.unregistered, plate = "") }
    fun setColour(value: String) = _uiState.update { it.copy(colour = value) }
    fun setVehiclePin(value: String) {
        if (value.isEmpty() || (value.length <= 6 && value.all(Char::isDigit))) _uiState.update { it.copy(vehiclePin = value) }
    }
    fun togglePhysicalKey() = _uiState.update { it.copy(physicalKey = !it.physicalKey, vehiclePin = "") }

    fun continueToJob() = _uiState.update { if (it.vehicleValid) it.copy(step = IntakeStep.JOB) else it }

    // ---- Job ----

    fun setOdometer(value: String) = _uiState.update { it.copy(odometer = value.filter(Char::isDigit).take(7)) }
    fun touchOdometer() = _uiState.update { it.copy(odometerTouched = true) }
    fun toggleDeadVehicle() = _uiState.update { it.copy(deadVehicle = !it.deadVehicle, vehicleLocked = false, odometer = "") }
    fun toggleVehicleLocked() = _uiState.update { it.copy(vehicleLocked = !it.vehicleLocked, deadVehicle = false, odometer = "") }
    fun setProblems(value: String) = _uiState.update { it.copy(problems = value) }
    fun setBelongings(value: String) = _uiState.update { it.copy(belongings = value) }
    fun setIntakeDate(date: LocalDate) = _uiState.update { it.copy(intakeDate = date) }
    fun setDeliveryDate(date: LocalDate) = _uiState.update { it.copy(deliveryDate = date) }

    /** Steps back inside the flow. Returns false at the first step, where the caller closes the intake. */
    fun back(): Boolean {
        val s = _uiState.value
        val previous = when (s.step) {
            IntakeStep.CUSTOMER -> IntakeStep.SEARCH
            IntakeStep.VEHICLE -> if (s.selectedCustomer != null) IntakeStep.SEARCH else IntakeStep.CUSTOMER
            IntakeStep.JOB -> if (s.selectedVehicle != null) IntakeStep.SEARCH else IntakeStep.VEHICLE
            else -> return false
        }
        _uiState.update { it.copy(step = previous, submitError = null) }
        return true
    }

    fun issueJobCard(advisor: WorkshopUser?) {
        val s = _uiState.value
        if (!s.jobValid || s.isSubmitting) return
        val advisorId = advisor?.id.orEmpty().ifBlank { "advisor" }
        val advisorName = advisor?.name?.ifBlank { null } ?: advisor?.email ?: "Service Advisor"

        viewModelScope.launch {
            _uiState.update { it.copy(isSubmitting = true, submitError = null) }
            runCatching {
                val customerId = s.selectedCustomer?.id ?: serviceRepository.createCustomer(
                    name = s.customerName.trim(),
                    phone = "+91" + s.phoneDigits,
                    technicianId = advisorId
                ).getOrThrow().id

                val vehicleId = s.selectedVehicle?.id ?: serviceRepository.createVehicle(
                    customerId = customerId,
                    plateNumber = if (s.unregistered) UNREGISTERED_PLATE else s.plate,
                    make = s.make.trim(),
                    model = s.model.trim(),
                    color = s.colour.trim(),
                    passwordOrPin = if (s.physicalKey) "Physical Key" else s.vehiclePin.trim(),
                    technicianId = advisorId
                ).getOrThrow().id

                val description = serializeTasks(s.problems.lines().map { it.trim() }.filter { it.isNotEmpty() }.map { TaskLine(it, false) })
                val arrived = s.intakeDate.atTime(LocalTime.now().truncatedTo(ChronoUnit.SECONDS))
                    .format(DateTimeFormatter.ISO_LOCAL_DATE_TIME)

                serviceRepository.createServiceRecord(
                    ServiceRecord(
                        vehicleId = vehicleId,
                        customerId = customerId,
                        technicianId = advisorId,
                        technicianName = advisorName,
                        date = arrived,
                        expectedDeliveryDate = s.deliveryDate?.toString(),
                        mileage = if (s.deadVehicle || s.vehicleLocked) 0 else s.odometer.toIntOrNull() ?: 0,
                        isDeadVehicle = s.deadVehicle,
                        isUnknownMileage = s.vehicleLocked,
                        personalItems = s.belongings.trim().ifBlank { null },
                        description = description,
                        status = "pending"
                    )
                ).getOrThrow()

                IssuedJob(
                    customerName = s.customerLabel,
                    phone = s.phoneLabel,
                    make = s.vehicleMake,
                    model = s.vehicleModel,
                    plate = s.plateLabel,
                    intakeDate = s.intakeDate,
                    deliveryDate = s.deliveryDate,
                    description = description
                )
            }.onSuccess { issued ->
                _uiState.update { it.copy(isSubmitting = false, issued = issued, step = IntakeStep.SUCCESS) }
            }.onFailure { err ->
                _uiState.update {
                    it.copy(isSubmitting = false, submitError = "Couldn't issue the job card. ${err.message ?: "Check your connection and try again."}")
                }
            }
        }
    }
}
