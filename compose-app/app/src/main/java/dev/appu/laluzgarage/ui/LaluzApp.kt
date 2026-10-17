package dev.appu.laluzgarage.ui

import kotlinx.coroutines.launch
import kotlinx.coroutines.CancellationException
import dev.appu.laluzgarage.ui.components.containerTransform
import dev.appu.laluzgarage.ui.components.LocalContainerTransform
import dev.appu.laluzgarage.ui.components.ContainerTransformState
import androidx.compose.ui.platform.LocalDensity
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.animation.core.rememberTransition
import androidx.compose.animation.core.SeekableTransitionState
import androidx.compose.animation.EnterExitState
import androidx.activity.compose.PredictiveBackHandler
import androidx.compose.animation.AnimatedContent
import androidx.compose.animation.ContentTransform
import androidx.compose.animation.Crossfade
import androidx.compose.animation.EnterTransition
import androidx.compose.animation.ExitTransition
import androidx.compose.animation.core.CubicBezierEasing
import androidx.compose.animation.core.tween
import androidx.compose.animation.core.Transition
import androidx.compose.animation.core.animateFloat
import androidx.compose.animation.core.updateTransition
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.layout.layout
import androidx.compose.ui.platform.LocalFocusManager
import kotlinx.coroutines.delay
import androidx.compose.ui.semantics.clearAndSetSemantics
import androidx.compose.animation.fadeOut
import androidx.compose.animation.slideInHorizontally
import androidx.compose.animation.slideInVertically
import androidx.compose.animation.slideOutHorizontally
import androidx.compose.animation.slideOutVertically
import androidx.compose.ui.unit.IntOffset
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.lazy.rememberLazyListState
import androidx.compose.material3.ExperimentalMaterial3ExpressiveApi
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.windowsizeclass.WindowWidthSizeClass
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.derivedStateOf
import androidx.compose.runtime.getValue
import androidx.compose.runtime.key
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.rememberUpdatedState
import androidx.compose.runtime.setValue
import androidx.compose.ui.input.nestedscroll.NestedScrollConnection
import androidx.compose.ui.input.nestedscroll.NestedScrollSource
import androidx.compose.ui.input.nestedscroll.nestedScroll
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import dev.appu.laluzgarage.data.model.UserRole
import dev.appu.laluzgarage.data.model.WorkshopUser
import dev.appu.laluzgarage.ui.auth.AuthScreenState
import dev.appu.laluzgarage.ui.auth.AuthViewModel
import dev.appu.laluzgarage.ui.auth.LoginScreen
import dev.appu.laluzgarage.ui.auth.PendingApprovalScreen
import dev.appu.laluzgarage.ui.auth.ThemePickerScreen
import dev.appu.laluzgarage.ui.components.AccountActions
import dev.appu.laluzgarage.ui.components.FloatingNavToolbar
import dev.appu.laluzgarage.ui.components.LaluzLogo
import dev.appu.laluzgarage.ui.components.ToolbarItem
import dev.appu.laluzgarage.ui.dashboard.DashboardScreen
import dev.appu.laluzgarage.ui.intake.AdvisorPinScreen
import dev.appu.laluzgarage.ui.intake.IntakeScreen
import dev.appu.laluzgarage.ui.intake.IntakeViewModel
import dev.appu.laluzgarage.ui.inventory.InventoryScreen
import dev.appu.laluzgarage.ui.inventory.PartDetailScreen
import dev.appu.laluzgarage.ui.inventory.PartFormSheet
import dev.appu.laluzgarage.ui.navigation.AppDestination
import dev.appu.laluzgarage.ui.vehicles.VehicleDetailScreen
import dev.appu.laluzgarage.ui.vehicles.VehiclesScreen
import dev.appu.laluzgarage.ui.services.JobCardScreen
import dev.appu.laluzgarage.ui.services.JobEditScreen
import dev.appu.laluzgarage.ui.settings.SettingsHost
import dev.appu.laluzgarage.ui.settings.SettingsProfile
import dev.appu.laluzgarage.ui.settings.SettingsRoute
import dev.appu.laluzgarage.ui.settings.SettingsViewModel
import dev.appu.laluzgarage.ui.theme.ThemeMode
import dev.appu.laluzgarage.ui.services.ServiceViewModel
import dev.appu.laluzgarage.ui.services.ServicesScreen

@OptIn(ExperimentalMaterial3ExpressiveApi::class)
@Composable
fun LaluzApp(
    windowWidthSizeClass: WindowWidthSizeClass,
    authViewModel: AuthViewModel,
    isDarkTheme: Boolean,
    serviceViewModel: ServiceViewModel = hiltViewModel(),
    intakeViewModel: IntakeViewModel = hiltViewModel(),
    settingsViewModel: SettingsViewModel = hiltViewModel(),
    modifier: Modifier = Modifier
) {
    val authState by authViewModel.uiState.collectAsStateWithLifecycle()
    val serviceState by serviceViewModel.uiState.collectAsStateWithLifecycle()
    val servicesListUi by serviceViewModel.servicesList.collectAsStateWithLifecycle()
    val dashboardUi by serviceViewModel.dashboard.collectAsStateWithLifecycle()
    val syncUi by serviceViewModel.sync.collectAsStateWithLifecycle()
    val isOnline by serviceViewModel.isOnline.collectAsStateWithLifecycle()
    val settingsUi by settingsViewModel.state.collectAsStateWithLifecycle()
    val vehiclesUi by serviceViewModel.vehiclesList.collectAsStateWithLifecycle()
    val inventoryUi by serviceViewModel.inventory.collectAsStateWithLifecycle()
    var currentDestination by rememberSaveable { mutableStateOf(AppDestination.DASHBOARD) }

    var isSwitchingOperator by rememberSaveable { mutableStateOf(false) }
    var activeOperator by remember { mutableStateOf<WorkshopUser?>(null) }
    var isIntakeOpen by rememberSaveable { mutableStateOf(false) }
    var openVehicleId by rememberSaveable { mutableStateOf<String?>(null) }
    var openPartId by rememberSaveable { mutableStateOf<String?>(null) }
    var isAddingPart by rememberSaveable { mutableStateOf(false) }
    var isSettingsOpen by rememberSaveable { mutableStateOf(false) }
    var settingsStartRoute by rememberSaveable { mutableStateOf(SettingsRoute.HOME) }
    var editingRecordId by rememberSaveable { mutableStateOf<String?>(null) }
    var focusServicesSearch by remember { mutableStateOf(false) }
    var toolbarExpanded by rememberSaveable { mutableStateOf(true) }

    Crossfade(
        targetState = authState.screenState,
        label = "AppScreenStateTransition",
        modifier = modifier.fillMaxSize()
    ) { screenState ->
        when (screenState) {
            AuthScreenState.LOADING -> {
                Box(
                    modifier = Modifier
                        .fillMaxSize()
                        .background(MaterialTheme.colorScheme.surface),
                    contentAlignment = Alignment.Center
                ) {
                    LaluzLogo()
                }
            }

            AuthScreenState.UNAUTHENTICATED -> {
                LoginScreen(
                    state = authState,
                    isDarkTheme = isDarkTheme,
                    onEmailChange = authViewModel::onEmailChanged,
                    onPasswordChange = authViewModel::onPasswordChanged,
                    onTogglePasswordVisibility = authViewModel::togglePasswordVisibility,
                    onSetAuthMethod = authViewModel::setAuthMethod,
                    onSignIn = authViewModel::signInWithEmail,
                    onGoogleSignIn = authViewModel::signInWithGoogle,
                    onToggleTheme = { authViewModel.toggleTheme(isDarkTheme) }
                )
            }

            AuthScreenState.PENDING_APPROVAL -> {
                PendingApprovalScreen(
                    state = authState,
                    isDarkTheme = isDarkTheme,
                    onSignOut = authViewModel::signOut
                )
            }

            AuthScreenState.CHOOSE_THEME -> {
                ThemePickerScreen(
                    state = authState,
                    isDarkTheme = isDarkTheme,
                    onThemeModeChange = authViewModel::setThemeMode,
                    onDynamicColorChange = authViewModel::setDynamicColor,
                    onContinue = authViewModel::finishThemeChoice
                )
            }

            AuthScreenState.AUTHENTICATED -> {
                LaunchedEffect(Unit) {
                    serviceViewModel.onAppShown()
                    settingsViewModel.checkOnLaunch()
                }
                val activeRecord = serviceState.activeEditingRecord
                val operator = activeOperator ?: authState.profile
                val operatorName = operator?.name?.ifEmpty { null }
                    ?: authState.user?.displayName?.ifEmpty { null }
                    ?: authState.user?.email?.substringBefore("@")
                    ?: "Operator"
                // Remembered so its lambdas keep identity and AccountActions.equals() lets avatars skip.
                // The operator's own photo; the signed-in account's Google photo stands in for themselves.
                val operatorPhoto = operator?.photoURL?.ifBlank { null }
                    ?: authState.user?.takeIf { operator == null || operator.id == it.uid }?.photoUrl?.toString()
                val operatorIsAdmin = operator?.effectiveRole == UserRole.ADMIN
                val account = remember(operatorName, operatorPhoto, operatorIsAdmin, authState.themeMode, authViewModel) {
                    AccountActions(
                        operatorName = operatorName,
                        themeMode = authState.themeMode,
                        onThemeModeChange = authViewModel::setThemeMode,
                        onSwitchOperator = { isSwitchingOperator = true },
                        onSignOut = {
                            activeOperator = null
                            authViewModel.signOut()
                        },
                        onOpenSettings = {
                            settingsStartRoute = SettingsRoute.HOME
                            isSettingsOpen = true
                        },
                        photoUrl = operatorPhoto,
                        isAdmin = operatorIsAdmin
                    )
                }

                // Coming back to the tabs (from a job card or the intake) always shows the toolbar.
                val openVehicle = openVehicleId?.let { serviceState.vehiclesMap[it] }
                val openPart = openPartId?.let { id -> serviceState.availableParts.firstOrNull { it.id == id } }
                val editingRecord = editingRecordId?.let { id -> serviceState.records.firstOrNull { it.id == id } }
                val onTabs = !isIntakeOpen && !isSwitchingOperator && activeRecord == null && openVehicle == null &&
                    openPart == null && !isSettingsOpen && editingRecord == null
                LaunchedEffect(onTabs) { if (onTabs) toolbarExpanded = true }
                val dashboardScroll = rememberScrollState()
                val servicesList = rememberLazyListState()
                val vehiclesListState = rememberLazyListState()
                val inventoryListState = rememberLazyListState()
                // derivedStateOf: only the boolean flip invalidates this scope, not every scrolled pixel.
                val atTop by remember(currentDestination) {
                    derivedStateOf {
                        when (currentDestination) {
                            AppDestination.DASHBOARD -> dashboardScroll.value == 0
                            AppDestination.SERVICES -> !servicesList.canScrollBackward
                            AppDestination.VEHICLES -> !vehiclesListState.canScrollBackward
                            AppDestination.INVENTORY -> !inventoryListState.canScrollBackward
                        }
                    }
                }
                LaunchedEffect(atTop) { if (atTop) toolbarExpanded = true }

                val layer = when {
                    isSwitchingOperator -> AppLayer.PIN
                    isIntakeOpen -> AppLayer.INTAKE
                    editingRecord != null -> AppLayer.JOB_EDIT
                    activeRecord != null -> AppLayer.JOB
                    openPart != null -> AppLayer.PART
                    openVehicle != null -> AppLayer.VEHICLE
                    isSettingsOpen -> AppLayer.SETTINGS
                    else -> AppLayer.TABS
                }
                // Keep the last values so a screen that is animating out still has its data.
                val heldRecord = rememberLastNonNull(activeRecord)
                val heldPart = rememberLastNonNull(openPart)
                val heldVehicle = rememberLastNonNull(openVehicle)
                val heldEditing = rememberLastNonNull(editingRecord)

                // Seekable so the predictive back gesture can scrub the same transition a tap plays.
                val layerState = remember { SeekableTransitionState(layer) }
                LaunchedEffect(layer) { layerState.animateTo(layer) }
                val layers = rememberTransition(layerState, label = "AppLayer")
                val container = remember { ContainerTransformState() }
                val density = LocalDensity.current
                // Screens that can grow out of the card that opened them, keyed like the cards register.
                val containerKey: (AppLayer) -> String? = { shownLayer ->
                    when (shownLayer) {
                        AppLayer.JOB -> heldRecord?.id?.let { "job:$it" }
                        AppLayer.VEHICLE -> heldVehicle?.id?.let { "vehicle:$it" }
                        AppLayer.PART -> heldPart?.id?.let { "part:$it" }
                        else -> null
                    }
                }
                // Predictive back for the detail screens whose back simply closes them: the layer the
                // gesture reveals. A job card with unsaved edits is left to its own handler, which asks
                // to discard.
                val backBelow: AppLayer? = when (layer) {
                    AppLayer.JOB -> if (serviceState.isDirty) null else when {
                        openPart != null -> AppLayer.PART
                        openVehicle != null -> AppLayer.VEHICLE
                        isSettingsOpen -> AppLayer.SETTINGS
                        else -> AppLayer.TABS
                    }
                    AppLayer.PART -> when {
                        openVehicle != null -> AppLayer.VEHICLE
                        isSettingsOpen -> AppLayer.SETTINGS
                        else -> AppLayer.TABS
                    }
                    AppLayer.VEHICLE -> if (isSettingsOpen) AppLayer.SETTINGS else AppLayer.TABS
                    else -> null
                }
                val backScope = rememberCoroutineScope()
                CompositionLocalProvider(LocalContainerTransform provides container) {
                Box(Modifier.fillMaxSize()) {
                    // Tabs stay composed under detail screens, so going back doesn't rebuild the dashboard or lists.
                    TabsLayer(layers, container, covered = layer != AppLayer.TABS) {
                        MainShell(
                            currentDestination = currentDestination,
                            toolbarExpanded = toolbarExpanded,
                            onToolbarExpandedChange = { toolbarExpanded = it },
                            onNavigate = { currentDestination = it; toolbarExpanded = true },
                            // On Inventory the FAB adds a part (as drawn); everywhere else it starts an intake.
                            fabContentDescription = if (currentDestination == AppDestination.INVENTORY) "Add part" else "New intake",
                            onFabClick = {
                                if (currentDestination == AppDestination.INVENTORY) {
                                    isAddingPart = true
                                } else {
                                    intakeViewModel.start()
                                    isIntakeOpen = true
                                }
                            }
                        ) { destination ->
                            when (destination) {
                                AppDestination.DASHBOARD -> DashboardScreen(
                                    dashboard = dashboardUi,
                                    sync = syncUi,
                                    isOnline = isOnline,
                                    onRefresh = serviceViewModel::refresh,
                                    onRangeChange = serviceViewModel::setDashboardRange,
                                    operatorName = operatorName,
                                    account = account,
                                    onSearch = {
                                        focusServicesSearch = true
                                        currentDestination = AppDestination.SERVICES
                                    },
                                    onOpenRecord = serviceViewModel::openRecord,
                                    onViewAllServices = {
                                        serviceViewModel.setStatusFilter("all")
                                        currentDestination = AppDestination.SERVICES
                                    },
                                    onOpenPendingJobs = {
                                        serviceViewModel.setStatusFilter("pending")
                                        currentDestination = AppDestination.SERVICES
                                    },
                                    onOpenCompletedJobs = {
                                        serviceViewModel.setStatusFilter("completed")
                                        currentDestination = AppDestination.SERVICES
                                    },
                                    onOpenVehicles = { currentDestination = AppDestination.VEHICLES },
                                    onOpenInventory = { currentDestination = AppDestination.INVENTORY },
                                    launchUpdates = settingsUi.launchUpdates,
                                    onOpenUpdate = {
                                        settingsViewModel.openLaunchUpdate(it)
                                        settingsStartRoute = SettingsRoute.UPDATES
                                        isSettingsOpen = true
                                    },
                                    onDismissUpdate = settingsViewModel::dismissLaunchUpdate,
                                    scrollState = dashboardScroll
                                )

                                AppDestination.SERVICES -> ServicesScreen(
                                    list = servicesListUi,
                                    sync = syncUi,
                                    searchQuery = serviceState.searchQuery,
                                    selectedStatusFilter = serviceState.selectedStatusFilter,
                                    account = account,
                                    onStatusFilterChange = serviceViewModel::setStatusFilter,
                                    onSearchQueryChange = serviceViewModel::setSearchQuery,
                                    onToggleSortOrder = serviceViewModel::toggleSortOrder,
                                    onOpenRecord = serviceViewModel::openRecord,
                                    onToggleCompact = serviceViewModel::toggleCompactCards,
                                    onDateRangeChange = serviceViewModel::setDateRange,
                                    onEditRecord = { editingRecordId = it.id },
                                    onDeleteRecord = { serviceViewModel.deleteRecord(it.id) },
                                    message = serviceState.catalogMessage,
                                    onMessageShown = serviceViewModel::clearCatalogMessage,
                                    focusSearch = focusServicesSearch,
                                    onSearchFocused = { focusServicesSearch = false },
                                    listState = servicesList
                                )

                                AppDestination.VEHICLES -> VehiclesScreen(
                                    list = vehiclesUi,
                                    sync = syncUi,
                                    searchQuery = serviceState.vehicleSearch,
                                    account = account,
                                    onSearchQueryChange = serviceViewModel::setVehicleSearch,
                                    onOpenVehicle = { openVehicleId = it.id },
                                    listState = vehiclesListState
                                )

                                AppDestination.INVENTORY -> InventoryScreen(
                                    inventory = inventoryUi,
                                    sync = syncUi,
                                    searchQuery = serviceState.partSearch,
                                    selectedFilter = serviceState.partFilter,
                                    account = account,
                                    onSearchQueryChange = serviceViewModel::setPartSearch,
                                    onFilterChange = serviceViewModel::setPartFilter,
                                    onToggleSort = serviceViewModel::togglePartsSort,
                                    onOpenPart = { openPartId = it.id },
                                    listState = inventoryListState
                                )
                            }
                        }
                    }
                    layers.AnimatedContent(
                        transitionSpec = {
                            val forward = isForward(initialState, targetState)
                            val upper = if (forward) targetState else initialState
                            // Grow from / shrink into the card when it is still on screen; otherwise slide.
                            if (container.begin(containerKey(upper), density) != null) containerLayerTransition(forward)
                            else layerTransition(initialState, targetState)
                        },
                        modifier = Modifier.fillMaxSize()
                    ) { shown ->
                        val containerProgress = transition.animateFloat(
                            transitionSpec = { tween(MotionMs, easing = EmphasizedEasing) },
                            label = "ContainerProgress"
                        ) { if (it == EnterExitState.Visible) 1f else 0f }
                        // Full size even for the empty TABS placeholder, so nothing resizes mid-transition.
                        Box(
                            Modifier
                                .fillMaxSize()
                                .containerTransform(container, containerKey(shown)) { containerProgress.value }
                                .then(if (shown != AppLayer.TABS) Modifier.blockTouchesBelow() else Modifier)
                        ) {
                            val activeRecord = heldRecord
                            val openPart = heldPart
                            val openVehicle = heldVehicle
                            when (shown) {
                            AppLayer.PIN -> AdvisorPinScreen(
                                title = "Switch operator",
                                description = "Enter your 4-digit security PIN to take over this device.",
                                advisor = operator,
                                onCancel = { isSwitchingOperator = false },
                                onVerified = { advisor ->
                                    isSwitchingOperator = false
                                    if (advisor != null) activeOperator = advisor
                                }
                            )

                            AppLayer.INTAKE -> IntakeScreen(
                                viewModel = intakeViewModel,
                                advisor = operator,
                                onClose = { isIntakeOpen = false },
                                onDone = {
                                    isIntakeOpen = false
                                    openVehicleId = null
                                    openPartId = null
                                    currentDestination = AppDestination.SERVICES
                                }
                            )

                            AppLayer.JOB -> if (activeRecord != null) JobCardScreen(
                                record = activeRecord,
                                original = serviceState.originalRecord,
                                vehicle = serviceState.vehiclesMap[activeRecord.vehicleId],
                                customer = serviceState.customersMap[activeRecord.customerId],
                                availableParts = serviceState.availableParts,
                                deliveryTemplate = serviceState.deliveryTemplate,
                                isDirty = serviceState.isDirty,
                                isSaving = serviceState.isSaving,
                                justSaved = serviceState.justSaved,
                                statusMessage = serviceState.statusMessage,
                                onBack = serviceViewModel::closeRecord,
                                onStatusChange = serviceViewModel::updateStatus,
                                onToggleTask = serviceViewModel::toggleTask,
                                onProblemsTextChange = serviceViewModel::setProblemsText,
                                onAddPart = serviceViewModel::addPart,
                                onUpdatePartQuantity = serviceViewModel::updatePartQuantity,
                                onLaborCostChange = serviceViewModel::updateLaborCost,
                                onRemarksChange = serviceViewModel::updateFinalRemarks,
                                onCompletionMileageChange = serviceViewModel::updateCompletionMileage,
                                onBatteryChange = serviceViewModel::updateBattery,
                                onDiscard = serviceViewModel::discardChanges,
                                onDelete = { serviceViewModel.deleteRecord(activeRecord.id, onDeleted = serviceViewModel::closeRecord) },
                                onSave = { serviceViewModel.saveActiveRecord(onSaved = serviceViewModel::closeRecord) },
                                onStatusMessageShown = serviceViewModel::clearStatusMessage
                            )

                            AppLayer.JOB_EDIT -> heldEditing?.let { record ->
                                JobEditScreen(
                                    record = record,
                                    vehicle = serviceState.vehiclesMap[record.vehicleId],
                                    message = serviceState.catalogMessage,
                                    onMessageShown = serviceViewModel::clearCatalogMessage,
                                    onBack = { editingRecordId = null },
                                    onSave = serviceViewModel::saveJobEdit
                                )
                            }

                            AppLayer.SETTINGS -> SettingsHost(
                                viewModel = settingsViewModel,
                                records = serviceState.records,
                                profile = SettingsProfile(
                                    name = authState.profile?.name?.ifBlank { null } ?: authState.user?.displayName?.ifBlank { null } ?: operatorName,
                                    email = authState.profile?.email?.ifBlank { null } ?: authState.user?.email.orEmpty(),
                                    role = authState.profile?.effectiveRole,
                                    uid = authState.user?.uid,
                                    photoUrl = authState.profile?.photoURL?.ifBlank { null } ?: authState.user?.photoUrl?.toString()
                                ),
                                isDarkTheme = isDarkTheme,
                                themeMode = authState.themeMode,
                                dynamicColor = authState.dynamicColor,
                                onThemeModeChange = authViewModel::setThemeMode,
                                onDynamicColorChange = authViewModel::setDynamicColor,
                                onToggleTheme = { authViewModel.setThemeMode(if (isDarkTheme) ThemeMode.LIGHT else ThemeMode.DARK) },
                                onLogOut = {
                                    isSettingsOpen = false
                                    activeOperator = null
                                    authViewModel.signOut()
                                },
                                onClose = { isSettingsOpen = false },
                                startRoute = settingsStartRoute
                            )

                            AppLayer.PART -> if (openPart != null) PartDetailScreen(
                                part = openPart,
                                categories = inventoryUi.categories,
                                message = serviceState.catalogMessage,
                                onMessageShown = serviceViewModel::clearCatalogMessage,
                                onBack = { openPartId = null },
                                onSave = serviceViewModel::savePart,
                                onDelete = { serviceViewModel.deletePart(openPart.id) { openPartId = null } }
                            )

                            AppLayer.VEHICLE -> if (openVehicle != null) VehicleDetailScreen(
                                vehicle = openVehicle,
                                customer = serviceState.customersMap[openVehicle.customerId],
                                records = remember(serviceState.records, openVehicle.id) {
                                    serviceState.records.filter { it.vehicleId == openVehicle.id }
                                },
                                message = serviceState.catalogMessage,
                                onMessageShown = serviceViewModel::clearCatalogMessage,
                                onBack = { openVehicleId = null },
                                onOpenRecord = serviceViewModel::openRecord,
                                onSave = serviceViewModel::saveVehicle,
                                onDelete = { serviceViewModel.deleteVehicle(openVehicle.id) { openVehicleId = null } }
                            )
                            AppLayer.TABS -> Unit
                            }
                            // Composed after the screen so it registers after the screen's own BackHandler:
                            // the newest handler wins. The screen only enters composition once the transition
                            // targets it, a frame after `layer` changes, so a handler outside this content
                            // would always be registered first and lose to the screen's plain back.
                            if (shown != AppLayer.TABS) {
                                PredictiveBackHandler(enabled = shown == layer && backBelow != null) { progress ->
                                    val below = backBelow ?: return@PredictiveBackHandler
                                    val closing = layer
                                    try {
                                        progress.collect { event -> layerState.seekTo(event.progress, below) }
                                        when (closing) {
                                            AppLayer.JOB -> serviceViewModel.closeRecord()
                                            AppLayer.PART -> openPartId = null
                                            AppLayer.VEHICLE -> openVehicleId = null
                                            else -> Unit
                                        }
                                    } catch (e: CancellationException) {
                                        // Gesture cancelled: settle back on the screen that is still open.
                                        backScope.launch { layerState.animateTo(closing) }
                                        throw e
                                    }
                                }
                            }
                        }
                    }

                }
                }

                if (isAddingPart) {
                    PartFormSheet(
                        part = null,
                        categories = inventoryUi.categories,
                        onDismiss = { isAddingPart = false },
                        onSave = { part -> serviceViewModel.savePart(part) { isAddingPart = false } }
                    )
                }
            }
        }
    }
}

private enum class AppLayer { TABS, SETTINGS, VEHICLE, PART, JOB, JOB_EDIT, INTAKE, PIN }

private const val MotionMs = 300
private const val TabPrewarmDelayMs = 800L
private const val TabPrewarmGapMs = 250L
private val EmphasizedEasing = CubicBezierEasing(0.2f, 0f, 0f, 1f)

internal class Held<T>(var value: T?)

/** Plain holder, not state: writing snapshot state during composition would force another recomposition. */
@Composable
internal fun <T : Any> rememberLastNonNull(value: T?): T? {
    val held = remember { Held<T>(null) }
    if (value != null) held.value = value
    return value ?: held.value
}

/**
 * Details slide in over the previous screen (which parallaxes back); intake/PIN rise as a full-height
 * sheet. Back reverses. The tabs aren't in this AnimatedContent ([TabsLayer] moves them), so the TABS
 * side of a transition is an empty placeholder with no animation.
 */
private fun layerTransition(from: AppLayer, to: AppLayer): ContentTransform {
    val forward = isForward(from, to)
    val vertical = (if (forward) to else from).isSheet
    val offset = tween<IntOffset>(MotionMs, easing = EmphasizedEasing)
    val enter = when {
        to == AppLayer.TABS -> EnterTransition.None
        vertical -> if (forward) slideInVertically(offset) { it } else EnterTransition.None
        else -> slideInHorizontally(offset) { if (forward) it else -it / 4 }
    }
    val exit = when {
        from == AppLayer.TABS -> ExitTransition.None
        vertical -> if (forward) ExitTransition.None else slideOutVertically(offset) { it }
        else -> slideOutHorizontally(offset) { if (forward) -it / 4 else it }
    }
    // No SizeTransform: every layer fills the screen, and resizing would clip the screen that is leaving.
    return ContentTransform(enter, exit, targetContentZIndex = if (forward) 1f else -1f, sizeTransform = null)
}

private val AppLayer.isSheet get() = this == AppLayer.INTAKE || this == AppLayer.PIN

private fun isForward(from: AppLayer, to: AppLayer) =
    from == AppLayer.TABS || (to != AppLayer.TABS && to.ordinal > from.ordinal)

/**
 * Container transform: the screen on top draws itself growing from (or shrinking into) its card via
 * [containerTransform], so AnimatedContent only has to keep both screens composed and opaque for
 * the duration. The screen underneath doesn't move.
 */
private fun containerLayerTransition(forward: Boolean): ContentTransform =
    ContentTransform(
        targetContentEnter = EnterTransition.None,
        // Fully visible until the very end, then gone: keeps the leaving screen composed and drawn.
        initialContentExit = fadeOut(tween(MotionMs, easing = { if (it < 1f) 0f else 1f })),
        targetContentZIndex = if (forward) 1f else -1f,
        sizeTransform = null
    )

/**
 * Hosts the tabs under every other layer. Its parallax is read in the draw phase, so animating it
 * never recomposes the tabs; once fully covered it stops drawing and leaves the accessibility tree.
 */
@Composable
private fun TabsLayer(
    layers: Transition<AppLayer>,
    container: ContainerTransformState,
    covered: Boolean,
    content: @Composable () -> Unit
) {
    val cover = layers.animateFloat(
        transitionSpec = { tween(MotionMs, easing = EmphasizedEasing) },
        label = "TabsCover"
    ) { if (it == AppLayer.TABS) 0f else 1f }
    Box(
        Modifier
            .fillMaxSize()
            .graphicsLayer {
                val p = cover.value
                val over = if (layers.targetState != AppLayer.TABS) layers.targetState else layers.currentState
                // Sheets rise over still tabs, and a card grows in place: only a slide pushes them back.
                translationX = if (over.isSheet || container.active != null) 0f else -size.width / 4f * p
                alpha = if (p >= 1f) 0f else 1f
            }
            .then(if (covered) Modifier.clearAndSetSemantics {} else Modifier)
    ) { content() }
}

/** Detail screens draw opaque backgrounds that don't consume touches; stop taps reaching the tabs below. */
private fun Modifier.blockTouchesBelow(): Modifier = pointerInput(Unit) {
    awaitPointerEventScope { while (true) awaitPointerEvent() }
}

/**
 * Main tabs with the M3 Expressive floating toolbar overlaid at the bottom (all widths).
 * Scrolling content down collapses the toolbar to the FAB; scrolling up expands it.
 */
@Composable
private fun MainShell(
    currentDestination: AppDestination,
    toolbarExpanded: Boolean,
    onToolbarExpandedChange: (Boolean) -> Unit,
    onNavigate: (AppDestination) -> Unit,
    fabContentDescription: String,
    onFabClick: () -> Unit,
    content: @Composable (AppDestination) -> Unit
) {
    val items = remember { AppDestination.entries.map { ToolbarItem(it.route, it.label, it.icon) } }
    val focusManager = LocalFocusManager.current
    Box(
        Modifier
            .fillMaxSize()
            .background(MaterialTheme.colorScheme.surface)
            .nestedScroll(rememberToolbarScrollConnection(toolbarExpanded, onToolbarExpandedChange))
    ) {
        // Visited tabs stay composed and are only placed while shown, so a switch never rebuilds a
        // screen from scratch. After launch the remaining tabs are pre-composed one at a time.
        val tabs = updateTransition(currentDestination, label = "Tab")
        val visited = remember { mutableSetOf<AppDestination>() }.apply { add(currentDestination) }
        var warmed by remember { mutableIntStateOf(0) }
        LaunchedEffect(Unit) {
            delay(TabPrewarmDelayMs)
            for (i in 1..AppDestination.entries.size) { warmed = i; delay(TabPrewarmGapMs) }
        }
        AppDestination.entries.forEachIndexed { i, dest ->
            if (dest in visited || i < warmed) {
                visited += dest
                key(dest) { TabPage(dest, tabs) { content(dest) } }
            }
        }
        FloatingNavToolbar(
            items = items,
            currentKey = currentDestination.route,
            onSelect = {
                // Hidden tabs stay composed, so drop focus (and the keyboard) rather than leave it behind.
                focusManager.clearFocus()
                onNavigate(AppDestination.fromRoute(it))
            },
            fabContentDescription = fabContentDescription,
            onFabClick = onFabClick,
            expanded = toolbarExpanded,
            modifier = Modifier.align(Alignment.BottomCenter)
        )
    }
}

/**
 * One tab, shown with shared axis X (10% slide, fade through; direction follows tab order). The
 * transition is applied in layout and draw only; a tab that isn't shown is measured but not placed,
 * so it isn't drawn, hit-tested or announced.
 */
@Composable
private fun TabPage(dest: AppDestination, tabs: Transition<AppDestination>, content: @Composable () -> Unit) {
    val shown = tabs.animateFloat(
        transitionSpec = { tween(MotionMs, easing = EmphasizedEasing) },
        label = "Tab ${dest.route}"
    ) { if (it == dest) 1f else 0f }
    Box(
        Modifier
            .fillMaxSize()
            .layout { measurable, constraints ->
                val placeable = measurable.measure(constraints)
                layout(placeable.width, placeable.height) {
                    val incoming = dest == tabs.targetState
                    // zIndex here also orders this tab among MainShell's children: keep the outgoing tab
                    // below the incoming one, and both at or below the toolbar (zIndex 0, placed last).
                    if (incoming || dest == tabs.currentState) placeable.place(0, 0, zIndex = if (incoming) 0f else -1f)
                }
            }
            .graphicsLayer {
                val v = shown.value
                val incoming = dest == tabs.targetState
                val dir = if (tabs.targetState.ordinal >= tabs.currentState.ordinal) 1f else -1f
                val shift = size.width * 0.1f * (1f - v)
                translationX = if (incoming) dir * shift else -dir * shift
                alpha = if (incoming) ((v - 0.3f) / 0.7f).coerceIn(0f, 1f) else ((v - 0.7f) / 0.3f).coerceIn(0f, 1f)
            }
    ) { content() }
}

/**
 * Collapses the floating toolbar after a sustained drag down and expands it after a sustained drag
 * up. Only finger drags count (not flings or overscroll bounce) and the accumulated distance must
 * pass a threshold, so jitter at the ends of a list can't flip the toolbar back and forth.
 */
@Composable
private fun rememberToolbarScrollConnection(
    expanded: Boolean,
    onExpandedChange: (Boolean) -> Unit
): NestedScrollConnection {
    val thresholdPx = with(androidx.compose.ui.platform.LocalDensity.current) { 32.dp.toPx() }
    val currentExpanded by rememberUpdatedState(expanded)
    val currentChange by rememberUpdatedState(onExpandedChange)
    return remember(thresholdPx) {
        object : NestedScrollConnection {
            private var travelled = 0f
            override fun onPreScroll(available: Offset, source: NestedScrollSource): Offset {
                if (source != NestedScrollSource.UserInput || available.y == 0f) return Offset.Zero
                // Direction change restarts the accumulation.
                if (travelled != 0f && (travelled > 0f) != (available.y > 0f)) travelled = 0f
                travelled += available.y
                if (travelled < -thresholdPx) {
                    if (currentExpanded) currentChange(false)
                    travelled = 0f
                } else if (travelled > thresholdPx) {
                    if (!currentExpanded) currentChange(true)
                    travelled = 0f
                }
                return Offset.Zero
            }
        }
    }
}
