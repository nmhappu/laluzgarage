package dev.appu.laluzgarage.ui.navigation

import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Build
import androidx.compose.material.icons.filled.DirectionsCar
import androidx.compose.material.icons.filled.GridView
import androidx.compose.material.icons.automirrored.filled.TrendingUp
import androidx.compose.material.icons.filled.Inventory2
import androidx.compose.ui.graphics.vector.ImageVector

sealed class Screen(val route: String, val title: String) {
    data object Login : Screen("login", "Sign In")
    data object AdvisorVerification : Screen("advisor_verification", "Advisor Verification")
    data object PendingApproval : Screen("pending_approval", "Pending Approval")
    data object Intake : Screen("intake", "Vehicle Intake")
}

enum class MainDestination(
    val route: String,
    val label: String,
    val icon: ImageVector,
    val isSecondaryAccent: Boolean = false // Matches 'Vehicles' secondary blue accent in React
) {
    DASHBOARD("dashboard", "Dashboard", Icons.Default.GridView),
    VEHICLES("vehicles", "Vehicle", Icons.Default.DirectionsCar, isSecondaryAccent = true),
    INVENTORY("inventory", "Inventory", Icons.Default.Inventory2),
    SERVICES("services", "Services", Icons.Default.Build),
    ANALYTICS("analytics", "Analytics", Icons.AutoMirrored.Filled.TrendingUp);

    companion object {
        fun fromRoute(route: String?): MainDestination {
            return entries.find { it.route == route } ?: DASHBOARD
        }
    }
}
