package dev.appu.laluzgarage.ui.inventory

import androidx.compose.runtime.Immutable
import dev.appu.laluzgarage.data.model.Part
import dev.appu.laluzgarage.ui.components.formatInrWhole

/** Inventory filter keys: "all", "low", or "cat:<category>". */
object PartFilter {
    const val ALL = "all"
    const val LOW = "low"
    fun category(name: String) = "cat:$name"
}

/** Inventory sort order, picked from the Sort menu. */
enum class PartSort(val label: String) {
    NAME_ASC("Name A to Z"),
    NAME_DESC("Name Z to A"),
    STOCK_ASC("Lowest stock first"),
    STOCK_DESC("Highest stock first"),
    PRICE_ASC("Lowest price first"),
    PRICE_DESC("Highest price first")
}

@Immutable
data class PartChip(val key: String, val label: String, val count: Int)

@Immutable
data class PartRowModel(
    val part: Part,
    val name: String,
    val meta: String,
    val price: String,
    val isLow: Boolean,
    val stockLabel: String
)

/** Everything the Inventory list draws, derived off the main thread by the ViewModel. */
@Immutable
data class InventoryUi(
    val rows: List<PartRowModel> = emptyList(),
    val chips: List<PartChip> = emptyList(),
    val categories: List<String> = emptyList(),
    val summary: String = "",
    val sort: PartSort = PartSort.NAME_ASC,
    val isLoading: Boolean = true
)

data class InventoryQuery(val search: String, val filter: String, val sort: PartSort)

/** Rows and chip counts built once per snapshot; search, filter and sort only re-select. */
class InventoryIndex(parts: List<Part>, private val isLoading: Boolean) {
    private val rows: List<PartRowModel> = parts.map { p ->
        PartRowModel(
            part = p,
            name = p.name,
            meta = listOf(p.category.trim(), p.location.trim()).filter { it.isNotEmpty() }.joinToString(" · "),
            price = formatInrWhole(p.price),
            isLow = p.isLowStock,
            stockLabel = if (p.isLowStock) "Low stock · ${p.stockQuantity}" else "${p.stockQuantity} in stock"
        )
    }

    private val categories: List<String> = parts.map { it.category.trim() }.filter { it.isNotEmpty() }.distinct().sortedBy { it.lowercase() }

    private val chips: List<PartChip> = buildList {
        add(PartChip(PartFilter.ALL, "All", rows.size))
        add(PartChip(PartFilter.LOW, "Low stock", rows.count { it.isLow }))
        categories.forEach { c -> add(PartChip(PartFilter.category(c), c, parts.count { it.category.trim() == c })) }
    }

    private val summary = "${rows.size} ${if (rows.size == 1) "part" else "parts"} · ${rows.count { it.isLow }} low stock"

    fun select(query: InventoryQuery): InventoryUi {
        val needle = query.search.trim().lowercase()
        val filter = query.filter
        val selected = rows
            .filter {
                when {
                    filter == PartFilter.LOW -> it.isLow
                    filter.startsWith("cat:") -> it.part.category.trim() == filter.removePrefix("cat:")
                    else -> true
                }
            }
            .filter { needle.isEmpty() || it.name.lowercase().contains(needle) || it.part.category.lowercase().contains(needle) }
            .sortedWith(
                when (query.sort) {
                    PartSort.NAME_ASC -> compareBy { it.name.lowercase() }
                    PartSort.NAME_DESC -> compareByDescending { it.name.lowercase() }
                    PartSort.STOCK_ASC -> compareBy<PartRowModel> { it.part.stockQuantity }.thenBy { it.name.lowercase() }
                    PartSort.STOCK_DESC -> compareByDescending<PartRowModel> { it.part.stockQuantity }.thenBy { it.name.lowercase() }
                    PartSort.PRICE_ASC -> compareBy<PartRowModel> { it.part.price }.thenBy { it.name.lowercase() }
                    PartSort.PRICE_DESC -> compareByDescending<PartRowModel> { it.part.price }.thenBy { it.name.lowercase() }
                }
            )
        return InventoryUi(
            rows = selected,
            chips = chips,
            categories = categories,
            summary = summary,
            sort = query.sort,
            isLoading = isLoading
        )
    }
}
