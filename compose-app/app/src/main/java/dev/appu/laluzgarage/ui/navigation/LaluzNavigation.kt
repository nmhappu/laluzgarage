package dev.appu.laluzgarage.ui.navigation

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.size
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.material3.windowsizeclass.WindowWidthSizeClass
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.rememberNavController
import dev.appu.laluzgarage.ui.auth.AdvisorVerificationScreen
import dev.appu.laluzgarage.ui.auth.AuthUiState
import dev.appu.laluzgarage.ui.auth.AuthViewModel
import dev.appu.laluzgarage.ui.auth.LoginScreen
import dev.appu.laluzgarage.ui.auth.PendingApprovalScreen
import dev.appu.laluzgarage.ui.components.AdaptiveScaffold
import dev.appu.laluzgarage.ui.components.LaluzLogo

@Composable
fun LaluzRootNavigation(
    windowWidthSizeClass: WindowWidthSizeClass,
    authViewModel: AuthViewModel = hiltViewModel()
) {
    val authState by authViewModel.uiState.collectAsState()
    val activeAdvisor by authViewModel.activeAdvisor.collectAsState()
    val loginError by authViewModel.loginError.collectAsState()
    val isLoginLoading by authViewModel.isLoginLoading.collectAsState()

    val pinCode by authViewModel.pinCode.collectAsState()
    val pinError by authViewModel.pinError.collectAsState()

    var showPinVerificationModal by remember { mutableStateOf(false) }

    when (val state = authState) {
        is AuthUiState.InitialLoading -> {
            Box(
                modifier = Modifier
                    .fillMaxSize()
                    .background(MaterialTheme.colorScheme.background),
                contentAlignment = Alignment.Center
            ) {
                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                    LaluzLogo(size = 48.dp)
                    Spacer(modifier = Modifier.height(24.dp))
                    CircularProgressIndicator(
                        modifier = Modifier.size(24.dp),
                        color = MaterialTheme.colorScheme.primary,
                        strokeWidth = 2.5.dp
                    )
                    Spacer(modifier = Modifier.height(12.dp))
                    Text(
                        text = "INITIALIZING WORKSHOP PORTAL",
                        style = MaterialTheme.typography.labelSmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                        letterSpacing = 1.5.sp
                    )
                }
            }
        }

        is AuthUiState.Unauthenticated -> {
            LoginScreen(
                onSignInEmail = { email, pass -> authViewModel.signInWithEmail(email, pass) },
                onSignInGoogle = { idToken -> authViewModel.signInWithGoogle(idToken) },
                onGoogleError = { err -> authViewModel.setLoginError(err) },
                errorMessage = loginError,
                isLoading = isLoginLoading
            )
        }

        is AuthUiState.PendingApproval -> {
            PendingApprovalScreen(
                user = state.user,
                authEmail = state.authEmail,
                authUid = state.authUid,
                isChecking = isLoginLoading,
                onRefresh = { authViewModel.refreshProfile() },
                onSignOut = { authViewModel.signOut() }
            )
        }

        is AuthUiState.Authenticated -> {
            var showIntakeWizard by remember { mutableStateOf(false) }

            if (showPinVerificationModal) {
                AdvisorVerificationScreen(
                    pinCode = pinCode,
                    onPinChange = { pin ->
                        authViewModel.onPinChange(pin) {
                            showPinVerificationModal = false
                        }
                    },
                    errorMessage = pinError,
                    onBack = {
                        authViewModel.clearPin()
                        showPinVerificationModal = false
                    }
                )
            } else if (showIntakeWizard) {
                dev.appu.laluzgarage.ui.intake.IntakeWizardScreen(
                    advisor = activeAdvisor,
                    onClose = { showIntakeWizard = false },
                    onOpenJobCard = { recordId ->
                        showIntakeWizard = false
                    }
                )
            } else {
                val navController = rememberNavController()
                var currentDestination by remember { mutableStateOf(MainDestination.DASHBOARD) }

                AdaptiveScaffold(
                    windowWidthSizeClass = windowWidthSizeClass,
                    currentDestination = currentDestination,
                    onNavigateToDestination = { dest ->
                        currentDestination = dest
                        navController.navigate(dest.route) {
                            popUpTo(MainDestination.DASHBOARD.route) { saveState = true }
                            launchSingleTop = true
                            restoreState = true
                        }
                    },
                    onStartIntake = {
                        showIntakeWizard = true
                    },
                    activeAdvisor = activeAdvisor,
                    onSwitchAdvisorClick = {
                        showPinVerificationModal = true
                    },
                    onSignOutClick = {
                        authViewModel.signOut()
                    }
                ) {
                    NavHost(
                        navController = navController,
                        startDestination = MainDestination.DASHBOARD.route
                    ) {
                        composable(MainDestination.DASHBOARD.route) {
                            PlaceholderScreen(title = "Dashboard View", subtitle = "Live workshop metrics & 14-day sparklines")
                        }
                        composable(MainDestination.VEHICLES.route) {
                            PlaceholderScreen(title = "Vehicle Registry", subtitle = "Fleet history, customer profiles & vehicle records")
                        }
                        composable(MainDestination.INVENTORY.route) {
                            dev.appu.laluzgarage.ui.inventory.InventoryScreen(
                                windowWidthSizeClass = windowWidthSizeClass
                            )
                        }
                        composable(MainDestination.SERVICES.route) {
                            dev.appu.laluzgarage.ui.services.ServicesScreen(
                                windowWidthSizeClass = windowWidthSizeClass
                            )
                        }
                        composable(MainDestination.ANALYTICS.route) {
                            PlaceholderScreen(title = "Analytics", subtitle = "Advisor performance, revenue & task turnaround")
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun PlaceholderScreen(
    title: String,
    subtitle: String,
    modifier: Modifier = Modifier
) {
    Box(
        modifier = modifier
            .fillMaxSize()
            .background(MaterialTheme.colorScheme.background),
        contentAlignment = Alignment.Center
    ) {
        Column(horizontalAlignment = Alignment.CenterHorizontally) {
            Text(
                text = title,
                style = MaterialTheme.typography.titleLarge,
                color = MaterialTheme.colorScheme.onSurface,
                fontWeight = FontWeight.Bold
            )
            Spacer(modifier = Modifier.height(6.dp))
            Text(
                text = subtitle,
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )
        }
    }
}
