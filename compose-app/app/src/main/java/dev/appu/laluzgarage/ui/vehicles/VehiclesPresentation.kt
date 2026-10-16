package dev.appu.laluzgarage.ui.vehicles

import androidx.compose.runtime.Immutable
import dev.appu.laluzgarage.data.model.Customer
import dev.appu.laluzgarage.data.model.ServiceRecord
import dev.appu.laluzgarage.data.model.Vehicle
import dev.appu.laluzgarage.ui.services.displayName
import dev.appu.laluzgarage.ui.services.formatPlate
import dev.appu.laluzgarage.ui.services.modelWithColor
import dev.appu.laluzgarage.ui.services.parseRecordDate
import dev.appu.laluzgarage.ui.services.relativeDayLabel
import java.time.LocalDate

@Immutable
data class VehicleCardModel(
    val vehicle: Vehicle,
    val plate: String,
    val description: String,
    val owner: String,
    val services: Int,
    val lastService: String
)

/** Everything the Vehicles list draws, derived off the main thread by the ViewModel. */
@Immutable
data class VehiclesListUi(
    val cards: List<VehicleCardModel> = emptyList(),
    val total: Int = 0,
    val query: String = "",
    val isLoading: Boolean = true
) {
    val summary: String get() = "$total ${if (total == 1) "vehicle" else "vehicles"} on file"
}

/** Card models plus search keys, built once per snapshot; a keystroke only re-filters. */
class VehiclesIndex(
    vehicles: Map<String, Vehicle>,
    customers: Map<String, Customer>,
    records: List<ServiceRecord>,
    private val isLoading: Boolean,
    today: LocalDate = LocalDate.now()
) {
    private class Entry(val card: VehicleCardModel, val last: LocalDate?, val plateKey: String, val textKey: String, val phoneKey: String)

    private val entries: List<Entry> = run {
        val byVehicle = records.groupBy { it.vehicleId }
        vehicles.values.map { v ->
            val jobs = byVehicle[v.id].orEmpty()
            val last = jobs.mapNotNull { parseRecordDate(it.date) }.maxOrNull()
            val owner = customers[v.customerId]
            Entry(
                card = VehicleCardModel(
                    vehicle = v,
                    plate = formatPlate(v.plateNumber),
                    description = v.modelWithColor(),
                    owner = owner.displayName(),
                    services = jobs.size,
                    lastService = if (jobs.isEmpty() || last == null) "No services yet" else last.relativeDayLabel(today)
                ),
                last = last,
                plateKey = v.plateNumber.lowercase().replace(" ", ""),
                textKey = "${v.make} ${v.model} ${owner?.name.orEmpty()}".lowercase(),
                phoneKey = owner?.phone.orEmpty().replace(" ", "")
            )
        }.sortedWith(compareByDescending<Entry> { it.last ?: LocalDate.MIN }.thenBy { it.card.plate })
    }

    fun select(query: String): VehiclesListUi {
        val needle = query.trim().lowercase()
        val compact = needle.replace(" ", "")
        val cards = entries
            .filter {
                needle.isEmpty() ||
                    it.plateKey.contains(compact) ||
                    it.textKey.contains(needle) ||
                    it.phoneKey.contains(compact)
            }
            .map { it.card }
        return VehiclesListUi(cards = cards, total = entries.size, query = query, isLoading = isLoading)
    }
}
