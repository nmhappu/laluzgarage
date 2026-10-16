package dev.appu.laluzgarage.ui.navigation

import androidx.compose.ui.graphics.vector.ImageVector
import dev.appu.laluzgarage.ui.components.LaluzIcons

/** Floating-toolbar destinations, in toolbar order. */
enum class AppDestination(
    val route: String,
    val label: String,
    private val iconProvider: () -> ImageVector
) {
    DASHBOARD("dashboard", "Dashboard", { LaluzIcons.Grid }),
    VEHICLES("vehicles", "Vehicles", { LaluzIcons.CarSimple }),
    INVENTORY("inventory", "Inventory", { LaluzIcons.Inventory }),
    SERVICES("services", "Services", { LaluzIcons.Wrench });

    val icon: ImageVector get() = iconProvider()

    companion object {
        fun fromRoute(route: String?): AppDestination =
            entries.find { it.route == route } ?: DASHBOARD
    }
}
