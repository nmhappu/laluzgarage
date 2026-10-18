package dev.appu.laluzgarage.ui.settings

import androidx.activity.compose.BackHandler
import androidx.compose.animation.core.tween
import androidx.compose.animation.togetherWith
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.layout.fillMaxSize
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.compose.animation.core.animateDpAsState
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.interaction.collectIsFocusedAsState
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ExperimentalLayoutApi
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.BasicTextField
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.drawBehind
import androidx.compose.ui.graphics.SolidColor
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.semantics.clearAndSetSemantics
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.heading
import androidx.compose.ui.semantics.role
import androidx.compose.ui.semantics.selected
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.AnnotatedString
import androidx.compose.ui.text.SpanStyle
import androidx.compose.ui.text.buildAnnotatedString
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardCapitalization
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.text.input.VisualTransformation
import androidx.compose.ui.text.withStyle
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import dev.appu.laluzgarage.data.model.ServiceRecord
import dev.appu.laluzgarage.data.model.UserRole
import dev.appu.laluzgarage.data.model.WorkshopUser
import dev.appu.laluzgarage.ui.components.BottomActionBar
import dev.appu.laluzgarage.ui.components.LaluzFilledField
import dev.appu.laluzgarage.ui.components.LaluzFilterChip
import dev.appu.laluzgarage.ui.components.LaluzIcons
import dev.appu.laluzgarage.ui.components.OutlinedPillButton
import dev.appu.laluzgarage.ui.components.PillButton
import dev.appu.laluzgarage.ui.components.connectedRowShape
import dev.appu.laluzgarage.ui.components.initialsOf
import dev.appu.laluzgarage.ui.components.ProfilePhoto
import dev.appu.laluzgarage.ui.theme.ThemeMode
import dev.appu.laluzgarage.ui.components.roleRingColor
import dev.appu.laluzgarage.ui.theme.LaluzShape
import dev.appu.laluzgarage.ui.theme.LaluzTheme
import dev.appu.laluzgarage.ui.theme.LaluzType
import dev.appu.laluzgarage.ui.theme.Motion
import dev.appu.laluzgarage.ui.rememberLastNonNull
import dev.appu.laluzgarage.ui.theme.Spacing

enum class SettingsRoute { HOME, TEAM, MEMBER, STATS, STAT_DETAIL, WHATSAPP, UPDATES, THEME }

/** The signed-in account shown at the top of Settings. */
data class SettingsProfile(val name: String, val email: String, val role: UserRole?, val uid: String?, val photoUrl: String? = null)

/**
 * Settings and its sub-pages. Owns its small back stack: system back and the top-bar arrow go
 * to the parent page, and from the home page out of Settings.
 */
@Composable
fun SettingsHost(
    viewModel: SettingsViewModel,
    records: List<ServiceRecord>,
    profile: SettingsProfile,
    isDarkTheme: Boolean,
    themeMode: ThemeMode,
    dynamicColor: Boolean,
    onThemeModeChange: (ThemeMode) -> Unit,
    onDynamicColorChange: (Boolean) -> Unit,
    onToggleTheme: () -> Unit,
    onLogOut: () -> Unit,
    onClose: () -> Unit,
    /** Where Settings opens; App Updates when coming from a dashboard update card. */
    startRoute: SettingsRoute = SettingsRoute.HOME
) {
    val state by viewModel.state.collectAsStateWithLifecycle()
    var route by rememberSaveable { mutableStateOf(startRoute) }
    var whatsAppKind by rememberSaveable { mutableStateOf(WhatsAppKind.INTAKE) }
    var statMetric by rememberSaveable { mutableStateOf(StatMetric.REVENUE) }
    androidx.compose.runtime.LaunchedEffect(Unit) { viewModel.onOpen() }

    val back: () -> Unit = {
        when (route) {
            // Opened straight onto a page (dashboard update card): back returns to where it came from.
            SettingsRoute.HOME, startRoute -> onClose()
            SettingsRoute.MEMBER -> { viewModel.closeMember(); route = SettingsRoute.TEAM }
            SettingsRoute.WHATSAPP -> { viewModel.discardTemplates(); route = SettingsRoute.HOME }
            SettingsRoute.STAT_DETAIL -> route = SettingsRoute.STATS
            else -> route = SettingsRoute.HOME
        }
    }
    BackHandler(onBack = back)

    // Edit member is driven by the form; if it vanished (saved elsewhere, process death) go back to the list.
    // A restored Statistics or Team route falls back to home if the account is no longer an admin.
    val statsLocked = profile.role != UserRole.ADMIN &&
        (route == SettingsRoute.STATS || route == SettingsRoute.STAT_DETAIL ||
            route == SettingsRoute.TEAM || route == SettingsRoute.MEMBER)
    val shown = when {
        statsLocked -> SettingsRoute.HOME
        route == SettingsRoute.MEMBER && state.member == null -> SettingsRoute.TEAM
        else -> route
    }
    androidx.compose.runtime.LaunchedEffect(statsLocked) { if (statsLocked) route = SettingsRoute.HOME }
    // Back clears the form before the transition runs; keep drawing it while Edit member slides out.
    val heldMember = rememberLastNonNull(state.member)

    val tablet = dev.appu.laluzgarage.ui.layout.LocalAdaptive.current.isTablet
    // Two panes on tablets: the right pane's top-level pages close Settings from their back arrow.
    val pageBack: () -> Unit = if (tablet && shown != SettingsRoute.MEMBER && shown != SettingsRoute.STAT_DETAIL) onClose else back
    val page: @Composable (SettingsRoute) -> Unit = { r ->
        when (r) {
            SettingsRoute.HOME -> SettingsHomeScreen(
                profile = profile,
                isDarkTheme = isDarkTheme,
                themeSummary = themeSummary(themeMode, dynamicColor),
                updateAvailable = state.updateAvailable,
                message = state.message,
                onMessageShown = viewModel::clearMessage,
                onBack = if (tablet) onClose else back,
                onToggleTheme = onToggleTheme,
                onOpen = { route = it },
                onLogOut = onLogOut
            )
            SettingsRoute.TEAM -> TeamScreen(
                state = state,
                onBack = pageBack,
                onMessageShown = viewModel::clearMessage,
                onOpenMember = { viewModel.editMember(it); route = SettingsRoute.MEMBER }
            )
            SettingsRoute.MEMBER -> heldMember?.let { form ->
                EditMemberScreen(
                    form = form,
                    allTags = state.tags.map { it.name },
                    isSaving = state.isSavingMember,
                    isSelf = form.original.id == profile.uid,
                    message = state.message,
                    onMessageShown = viewModel::clearMessage,
                    onBack = pageBack,
                    onRole = viewModel::setMemberRole,
                    onName = viewModel::setMemberName,
                    onEmail = viewModel::setMemberEmail,
                    onPin = viewModel::setMemberPin,
                    onToggleTag = viewModel::toggleMemberTag,
                    onSave = { viewModel.saveMember { route = SettingsRoute.TEAM } },
                    onDelete = { viewModel.deleteMember { route = SettingsRoute.TEAM } }
                )
            }
            SettingsRoute.STATS -> StatisticsMenuScreen(
                records = records,
                onOpen = { statMetric = it; route = SettingsRoute.STAT_DETAIL },
                onBack = pageBack
            )
            SettingsRoute.STAT_DETAIL -> StatisticsDetailScreen(metric = statMetric, records = records, onBack = pageBack)
            SettingsRoute.WHATSAPP -> WhatsAppScreen(
                kind = whatsAppKind,
                draft = state.whatsAppDraft,
                saved = state.presets,
                isSaving = state.isSavingWhatsApp,
                message = state.message,
                onMessageShown = viewModel::clearMessage,
                onKind = { whatsAppKind = it },
                onText = viewModel::setTemplate,
                onReset = viewModel::resetTemplate,
                onSave = viewModel::saveTemplates,
                onBack = pageBack
            )
            SettingsRoute.UPDATES -> AppUpdatesScreen(viewModel = viewModel, state = state, onBack = pageBack)
            SettingsRoute.THEME -> ThemeScreen(
                themeMode = themeMode,
                dynamicColor = dynamicColor,
                onThemeModeChange = onThemeModeChange,
                onDynamicColorChange = onDynamicColorChange,
                onBack = pageBack
            )
        }
    }
    if (tablet) {
        val cs = MaterialTheme.colorScheme
        val rightRoute = if (shown == SettingsRoute.HOME) {
            if (profile.role == UserRole.ADMIN) SettingsRoute.TEAM else SettingsRoute.THEME
        } else shown
        androidx.compose.foundation.layout.Row(Modifier.fillMaxSize().background(cs.surface)) {
            Box(Modifier.width(473.dp).fillMaxHeight()) { page(SettingsRoute.HOME) }
            Box(
                Modifier
                    .weight(1f)
                    .fillMaxHeight()
                    .statusBarsPadding()
                    .navigationBarsPadding()
                    .padding(top = Spacing.md, end = Spacing.xl, bottom = Spacing.xl)
            ) {
                dev.appu.laluzgarage.ui.layout.RaisedCard(Modifier.fillMaxSize()) {
                    androidx.compose.animation.AnimatedContent(
                        targetState = rightRoute,
                        transitionSpec = {
                            // Same page family: a clean fade out then in, no slide.
                            androidx.compose.animation.fadeIn(tween(150, delayMillis = 90)) togetherWith
                                androidx.compose.animation.fadeOut(tween(90)) using null
                        },
                        label = "SettingsPane"
                    ) { r -> page(r) }
                }
            }
        }
        return
    }
    androidx.compose.animation.AnimatedContent(
        targetState = shown,
        transitionSpec = {
            val forward = targetState.ordinal > initialState.ordinal && initialState != SettingsRoute.MEMBER
            val offset = tween<androidx.compose.ui.unit.IntOffset>(300, easing = Motion.emphasized)
            (androidx.compose.animation.slideInHorizontally(offset) { if (forward) it else -it / 4 } togetherWith
                androidx.compose.animation.slideOutHorizontally(offset) { if (forward) -it / 4 else it } using null)
                .apply { targetContentZIndex = if (forward) 1f else -1f }
        },
        label = "SettingsRoute"
    ) { r ->
        page(r)
    }
}

// ---------------------------------------------------------------------------
// Settings home
// ---------------------------------------------------------------------------

private class SettingsEntry(
    val route: SettingsRoute,
    val title: String,
    val supporting: String,
    val tone: SettingsTone,
    val icon: () -> androidx.compose.ui.graphics.vector.ImageVector
)

// Theme's supporting line is the live mode summary, filled in when the list is drawn.
private val Entries = listOf(
    SettingsEntry(SettingsRoute.TEAM, "Team Management", "Advisors, technicians & role permissions", SettingsTone.TEAM) { LaluzIcons.User },
    SettingsEntry(SettingsRoute.THEME, "Theme", "", SettingsTone.THEME) { LaluzIcons.Palette },
    SettingsEntry(SettingsRoute.STATS, "Statistics", "Workshop throughput, financials & business intelligence", SettingsTone.STATS) { LaluzIcons.TrendUp },
    SettingsEntry(SettingsRoute.WHATSAPP, "WhatsApp", "Vehicle intake & delivery notification templates", SettingsTone.WHATSAPP) { LaluzIcons.WhatsApp },
    SettingsEntry(SettingsRoute.UPDATES, "App Updates", "GitHub release channels, APK installation & build information", SettingsTone.UPDATES) { LaluzIcons.Download }
)

fun UserRole?.roleLabel(): String = when (this) {
    UserRole.ADMIN -> "Workshop Admin"
    UserRole.TECHNICIAN -> "Technician"
    UserRole.ASSISTANT -> "Assistant"
    null -> "Awaiting a role"
}

@Composable
private fun SettingsHomeScreen(
    profile: SettingsProfile,
    isDarkTheme: Boolean,
    themeSummary: String,
    updateAvailable: Boolean,
    message: String?,
    onMessageShown: () -> Unit,
    onBack: () -> Unit,
    onToggleTheme: () -> Unit,
    onOpen: (SettingsRoute) -> Unit,
    onLogOut: () -> Unit
) {
    val cs = MaterialTheme.colorScheme
    var confirmLogOut by rememberSaveable { mutableStateOf(false) }
    SettingsPage(
        title = "Settings",
        onBack = onBack,
        message = message,
        onMessageShown = onMessageShown,
        trailing = {
            IconButton(
                onClick = onToggleTheme,
                modifier = Modifier
                    .size(48.dp)
                    .background(cs.surfaceContainerHigh, CircleShape)
            ) {
                Icon(
                    if (isDarkTheme) LaluzIcons.SunLarge else LaluzIcons.Moon,
                    contentDescription = if (isDarkTheme) "Switch to light theme" else "Switch to dark theme",
                    tint = cs.primary
                )
            }
        }
    ) {
        // Profile
        Column(
            Modifier
                .fillMaxWidth()
                .padding(start = Spacing.xl, end = Spacing.xl, top = Spacing.xs, bottom = Spacing.xxl),
            verticalArrangement = Arrangement.spacedBy(Spacing.xxs)
        ) {
            val ring = roleRingColor(profile.role == UserRole.ADMIN)
            Box(
                Modifier
                    .padding(bottom = Spacing.sm)
                    .size(88.dp)
                    .drawBehind {
                        // The artboard's 2dp ring sits just outside the 88dp disc (box-shadow 0 0 0 2px).
                        drawCircle(ring, radius = size.minDimension / 2 + 1.dp.toPx(), style = Stroke(2.dp.toPx()))
                    }
                    .background(cs.surfaceContainerHigh, CircleShape)
                    .clearAndSetSemantics { },
                contentAlignment = Alignment.Center
            ) {
                Text(
                    initialsOf(profile.name),
                    style = MaterialTheme.typography.headlineLarge.copy(letterSpacing = 0.sp),
                    color = cs.onSurface
                )
                ProfilePhoto(profile.photoUrl, Modifier.matchParentSize())
            }
            Text(profile.name, style = MaterialTheme.typography.headlineMedium, color = cs.onSurface)
            Text(profile.email, style = MaterialTheme.typography.bodyLarge, color = cs.onSurfaceVariant)
            Row(
                Modifier
                    .padding(top = Spacing.xs)
                    .height(32.dp)
                    .background(cs.secondaryContainer, CircleShape)
                    .padding(start = 10.dp, end = Spacing.sm),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(6.dp)
            ) {
                Icon(LaluzIcons.Shield, contentDescription = null, tint = cs.onSecondaryContainer, modifier = Modifier.size(18.dp))
                Text(profile.role.roleLabel(), style = MaterialTheme.typography.labelLarge, color = cs.onSecondaryContainer)
            }
        }

        Column(
            Modifier.padding(start = Spacing.md, end = Spacing.md, bottom = Spacing.xxl),
            verticalArrangement = Arrangement.spacedBy(Spacing.xxl)
        ) {
            // Statistics carries workshop financials, so only admins see it.
            val entries = if (profile.role == UserRole.ADMIN) Entries else Entries.filter { it.route != SettingsRoute.STATS && it.route != SettingsRoute.TEAM }
            Column(verticalArrangement = Arrangement.spacedBy(2.dp)) {
                entries.forEachIndexed { i, e ->
                    SettingsNavRow(
                        icon = e.icon(),
                        title = e.title,
                        // Theme: System / Light / Dark and Material You; the top-bar toggle only flips light or dark.
                        supporting = if (e.route == SettingsRoute.THEME) themeSummary else e.supporting,
                        shape = connectedRowShape(i, entries.size),
                        chip = if (e.route == SettingsRoute.UPDATES && updateAvailable) "New" else null,
                        tone = e.tone,
                        onClick = { onOpen(e.route) }
                    )
                }
            }
            SettingsNavRow(
                icon = LaluzIcons.SignOut,
                title = "Log out",
                supporting = "End active session on this device",
                shape = connectedRowShape(0, 1),
                tint = cs.error,
                tone = SettingsTone.LOGOUT,
                onClick = { confirmLogOut = true }
            )
        }
    }

    if (confirmLogOut) {
        SettingsDialog(
            title = "Log out?",
            body = "You will be signed out of LaluZ Garage on this device. You can sign back in with Google or mail.",
            confirmText = "Log out",
            onConfirm = { confirmLogOut = false; onLogOut() },
            onDismiss = { confirmLogOut = false }
        )
    }
}

// ---------------------------------------------------------------------------
// Team
// ---------------------------------------------------------------------------

@Composable
private fun TeamScreen(
    state: SettingsUiState,
    onBack: () -> Unit,
    onMessageShown: () -> Unit,
    onOpenMember: (WorkshopUser) -> Unit
) {
    val cs = MaterialTheme.colorScheme
    SettingsPage("Team Management", onBack, state.message, onMessageShown) {
        val users = state.users
        val summary = buildString {
            append("${users.size} ${if (users.size == 1) "member" else "members"}")
            if (state.awaitingRole > 0) append(" · ${state.awaitingRole} awaiting a role")
        }
        Text(
            summary,
            style = MaterialTheme.typography.bodyMedium,
            color = cs.onSurfaceVariant,
            modifier = Modifier.padding(start = Spacing.xl, end = Spacing.xl, bottom = Spacing.md)
        )
        Column(
            Modifier.padding(start = Spacing.md, end = Spacing.md, bottom = Spacing.xxl),
            verticalArrangement = Arrangement.spacedBy(2.dp)
        ) {
            users.forEachIndexed { i, u ->
                val role = u.effectiveRole
                Surface(
                    onClick = { onOpenMember(u) },
                    shape = connectedRowShape(i, users.size),
                    color = cs.surfaceContainerLow,
                    contentColor = cs.onSurface,
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Row(
                        Modifier
                            .heightIn(min = 72.dp)
                            .padding(horizontal = Spacing.md, vertical = Spacing.xs),
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(Spacing.sm)
                    ) {
                        Box(
                            Modifier.size(48.dp).clip(CircleShape).background(cs.surfaceContainerHigh).clearAndSetSemantics { },
                            contentAlignment = Alignment.Center
                        ) {
                            Text(initialsOf(u.name.ifBlank { u.email }), style = MaterialTheme.typography.titleMedium, color = cs.onSurface)
                            ProfilePhoto(u.photoURL, Modifier.matchParentSize())
                        }
                        TwoLine(u.name.ifBlank { u.email.substringBefore("@") }, u.email, Modifier.weight(1f))
                        Box(Modifier.size(24.dp), contentAlignment = Alignment.Center) {
                            if (!u.pin.isNullOrBlank()) {
                                Icon(LaluzIcons.Key, contentDescription = "PIN set", tint = cs.primary, modifier = Modifier.size(24.dp))
                            }
                        }
                        Icon(
                            if (role == null) LaluzIcons.ShieldFilled else LaluzIcons.Shield,
                            contentDescription = role?.shortLabel() ?: "No role assigned",
                            tint = when (role) {
                                UserRole.ADMIN -> cs.error
                                null -> LaluzTheme.extendedColors.warningContainer
                                else -> cs.tertiary
                            },
                            modifier = Modifier.size(24.dp)
                        )
                        Icon(LaluzIcons.ChevronRight, contentDescription = null, tint = cs.onSurfaceVariant, modifier = Modifier.size(24.dp))
                    }
                }
            }
        }
    }
}

private fun UserRole.shortLabel(): String = when (this) {
    UserRole.ADMIN -> "Admin"
    UserRole.TECHNICIAN -> "Technician"
    UserRole.ASSISTANT -> "Assistant"
}

private val RoleDescriptions = listOf(
    UserRole.ADMIN to "Full access, deletion rights and role management.",
    UserRole.TECHNICIAN to "Full operations and parts intake. Cannot delete records or parts.",
    UserRole.ASSISTANT to "Service intake access. Read-only dashboard and records."
)

@OptIn(ExperimentalLayoutApi::class)
@Composable
private fun EditMemberScreen(
    form: MemberForm,
    allTags: List<String>,
    isSaving: Boolean,
    isSelf: Boolean,
    message: String?,
    onMessageShown: () -> Unit,
    onBack: () -> Unit,
    onRole: (UserRole) -> Unit,
    onName: (String) -> Unit,
    onEmail: (String) -> Unit,
    onPin: (String) -> Unit,
    onToggleTag: (String) -> Unit,
    onSave: () -> Unit,
    onDelete: () -> Unit
) {
    val cs = MaterialTheme.colorScheme
    var showPin by rememberSaveable { mutableStateOf(false) }
    var confirmDelete by rememberSaveable { mutableStateOf(false) }
    SettingsPage(
        title = "Edit member",
        onBack = onBack,
        message = message,
        onMessageShown = onMessageShown,
        bottomBar = {
            BottomActionBar {
                Row(horizontalArrangement = Arrangement.spacedBy(Spacing.xs)) {
                    OutlinedPillButton(
                        text = "Delete member",
                        onClick = { confirmDelete = true },
                        contentColor = cs.error,
                        borderColor = cs.error,
                        // Firestore rules don't let an admin delete their own account.
                        enabled = !isSelf,
                        modifier = Modifier.weight(1f)
                    )
                    PillButton(
                        text = "Save changes",
                        onClick = onSave,
                        containerColor = cs.primary,
                        contentColor = cs.onPrimary,
                        enabled = form.isDirty,
                        loading = isSaving,
                        modifier = Modifier.weight(1f)
                    )
                }
            }
        }
    ) {
        Column(
            Modifier.padding(start = Spacing.md, end = Spacing.md, top = Spacing.xs, bottom = Spacing.xxl),
            verticalArrangement = Arrangement.spacedBy(Spacing.xl)
        ) {
            Column(verticalArrangement = Arrangement.spacedBy(Spacing.xs)) {
                SettingsSectionLabel("Operational role", bold = false)
                ChoiceGroup {
                    RoleDescriptions.forEachIndexed { i, (role, desc) ->
                        ChoiceRow(role.shortLabel(), desc, form.role == role, i, RoleDescriptions.size) { onRole(role) }
                    }
                }
            }
            LaluzFilledField(
                value = form.name,
                onValueChange = onName,
                label = "Full name",
                placeholder = "e.g. John Doe"
            )
            LaluzFilledField(
                value = form.email,
                onValueChange = onEmail,
                label = "Email address",
                placeholder = "member@laluzgarage.com",
                keyboardType = KeyboardType.Email
            )
            LaluzFilledField(
                value = form.pin,
                onValueChange = onPin,
                label = "Advisor PIN",
                placeholder = "4 digits",
                keyboardType = KeyboardType.NumberPassword,
                visualTransformation = if (showPin) VisualTransformation.None else PasswordVisualTransformation(),
                supportingText = "4 digits. Asked when this advisor issues a job card.",
                textStyle = LaluzType.pin,
                trailing = {
                    IconButton(onClick = { showPin = !showPin }, modifier = Modifier.size(48.dp)) {
                        Icon(
                            if (showPin) LaluzIcons.EyeOff else LaluzIcons.Eye,
                            contentDescription = if (showPin) "Hide PIN" else "Show PIN",
                            tint = cs.onSurfaceVariant
                        )
                    }
                }
            )
            Column(verticalArrangement = Arrangement.spacedBy(Spacing.xs)) {
                SettingsSectionLabel("Skill and department tags", bold = false)
                if (allTags.isEmpty()) {
                    Text(
                        "No tags yet. Create them in Settings › Tags.",
                        style = MaterialTheme.typography.bodyMedium,
                        color = cs.onSurfaceVariant,
                        modifier = Modifier.padding(horizontal = Spacing.xs)
                    )
                } else {
                    FlowRow(
                        horizontalArrangement = Arrangement.spacedBy(Spacing.xs),
                        verticalArrangement = Arrangement.spacedBy(Spacing.xs)
                    ) {
                        allTags.forEach { tag ->
                            LaluzFilterChip(tag, tag in form.tags, onClick = { onToggleTag(tag) })
                        }
                    }
                }
            }
        }
    }

    if (confirmDelete) {
        SettingsDialog(
            title = "Delete advisor?",
            body = "Are you sure you want to permanently delete advisor \"${form.original.name}\"? This action cannot be undone.",
            confirmText = "Delete",
            onConfirm = { confirmDelete = false; onDelete() },
            onDismiss = { confirmDelete = false }
        )
    }
}

// ---------------------------------------------------------------------------
// WhatsApp templates
// ---------------------------------------------------------------------------

private val IntakeVars = listOf("customer_name", "vehicle_make", "vehicle_model", "vehicle_plate", "job_description")
private val DeliveryVars = listOf(
    "customer_name", "vehicle_title", "vehicle_make", "vehicle_model", "vehicle_plate",
    "job_description", "parts_list", "labor_cost", "total_cost"
)

/** The artboard's sample data for the preview. */
private val SampleValues = mapOf(
    "customer_name" to "Rafeeq A",
    "vehicle_title" to "Mahindra XUV300",
    "vehicle_make" to "Mahindra",
    "vehicle_model" to "XUV300",
    "vehicle_plate" to "KL 43 B 5512",
    "job_description" to "Full service and brake pad inspection",
    "parts_list" to "1. Brake pad set · front (x2) - ₹4,800\n2. Engine oil 5W-30 · 1L (x4) - ₹2,600",
    "labor_cost" to "₹1,800",
    "total_cost" to "₹9,200"
)

private val VarPattern = Regex("\\{([a-z_]+)\\}")

/** Fills the sample values and turns WhatsApp *bold* into bold spans. */
private fun previewOf(template: String): AnnotatedString {
    val filled = VarPattern.replace(template) { m -> SampleValues[m.groupValues[1]] ?: m.value }
    return buildAnnotatedString {
        var bold = false
        filled.forEach { ch ->
            if (ch == '*') bold = !bold
            else if (bold) withStyle(SpanStyle(fontWeight = FontWeight.Bold)) { append(ch) } else append(ch)
        }
    }
}

@OptIn(ExperimentalLayoutApi::class)
@Composable
private fun WhatsAppScreen(
    kind: WhatsAppKind,
    draft: dev.appu.laluzgarage.data.repository.WhatsAppPresets,
    saved: dev.appu.laluzgarage.data.repository.WhatsAppPresets,
    isSaving: Boolean,
    message: String?,
    onMessageShown: () -> Unit,
    onKind: (WhatsAppKind) -> Unit,
    onText: (WhatsAppKind, String) -> Unit,
    onReset: (WhatsAppKind) -> Unit,
    onSave: () -> Unit,
    onBack: () -> Unit
) {
    val cs = MaterialTheme.colorScheme
    val isDelivery = kind == WhatsAppKind.DELIVERY
    val text = if (isDelivery) draft.deliveryTemplate else draft.intakeTemplate
    val dirty = draft != saved
    SettingsPage(
        title = "WhatsApp",
        onBack = onBack,
        message = message,
        onMessageShown = onMessageShown,
        bottomBar = {
            BottomActionBar {
                Row(horizontalArrangement = Arrangement.spacedBy(Spacing.xs)) {
                    CompactOutlinedButton("Cancel", onBack, Modifier.weight(1f))
                    CompactOutlinedButton("Reset", { onReset(kind) }, Modifier.weight(1f), contentDescription = "Reset to default")
                    PillButton(
                        text = "Save",
                        onClick = onSave,
                        containerColor = cs.primary,
                        contentColor = cs.onPrimary,
                        enabled = dirty,
                        loading = isSaving,
                        modifier = Modifier.weight(1f)
                    )
                }
            }
        }
    ) {
        Column(
            Modifier.padding(start = Spacing.md, end = Spacing.md, bottom = Spacing.xxl),
            verticalArrangement = Arrangement.spacedBy(Spacing.xl)
        ) {
            Row(Modifier.semantics { contentDescription = "Message type" }, horizontalArrangement = Arrangement.spacedBy(2.dp)) {
                MessageTypeTab("Intake message", !isDelivery, { onKind(WhatsAppKind.INTAKE) }, Modifier.weight(1f))
                MessageTypeTab("Delivery message", isDelivery, { onKind(WhatsAppKind.DELIVERY) }, Modifier.weight(1f))
            }
            Column(Modifier.padding(horizontal = Spacing.xs), verticalArrangement = Arrangement.spacedBy(2.dp)) {
                Text(
                    if (isDelivery) "Delivery message" else "Intake message",
                    style = MaterialTheme.typography.titleLarge,
                    color = cs.onSurface,
                    modifier = Modifier.semantics { heading() }
                )
                Text(
                    if (isDelivery) "Sent when a job is delivered and the final bill is issued."
                    else "Sent when a vehicle is registered for service.",
                    style = MaterialTheme.typography.bodyMedium,
                    color = cs.onSurfaceVariant
                )
            }
            Column(verticalArrangement = Arrangement.spacedBy(Spacing.xs)) {
                SettingsSectionLabel("Variables", bold = false)
                FlowRow(horizontalArrangement = Arrangement.spacedBy(Spacing.xs), verticalArrangement = Arrangement.spacedBy(Spacing.xs)) {
                    (if (isDelivery) DeliveryVars else IntakeVars).forEach { v ->
                        VariableChip(v) { onText(kind, text + "{$v}") }
                    }
                }
                Text(
                    "Tap a variable to add it at the end of the message.",
                    style = MaterialTheme.typography.bodySmall,
                    color = cs.onSurfaceVariant,
                    modifier = Modifier.padding(horizontal = Spacing.xs)
                )
            }
            TemplateField(text, { onText(kind, it) }, minLines = if (isDelivery) 15 else 9)
            Column(
                Modifier
                    .fillMaxWidth()
                    .background(cs.surfaceContainerLow, LaluzShape.card)
                    .padding(Spacing.lg),
                verticalArrangement = Arrangement.spacedBy(Spacing.sm)
            ) {
                Column(verticalArrangement = Arrangement.spacedBy(2.dp)) {
                    Text("Preview", style = MaterialTheme.typography.titleSmall, color = cs.onSurfaceVariant, modifier = Modifier.semantics { heading() })
                    Text("Shown with sample data.", style = MaterialTheme.typography.bodySmall, color = cs.onSurfaceVariant)
                }
                Text(
                    previewOf(text),
                    style = MaterialTheme.typography.bodyMedium,
                    color = cs.onSurface,
                    modifier = Modifier
                        .fillMaxWidth()
                        .background(cs.surfaceContainerHigh, LaluzShape.field)
                        .padding(horizontal = Spacing.md, vertical = Spacing.sm)
                )
            }
        }
    }
}

/** Message-type tab: 48dp, selected = full pill on secondaryContainer, else 8dp corners on surfaceContainerHigh. */
@Composable
private fun MessageTypeTab(label: String, selected: Boolean, onClick: () -> Unit, modifier: Modifier = Modifier) {
    val cs = MaterialTheme.colorScheme
    val radius by animateDpAsState(if (selected) 24.dp else 8.dp, tween(Motion.SHAPE_MORPH_MS, easing = Motion.emphasized), label = "tabRadius")
    Surface(
        onClick = onClick,
        shape = RoundedCornerShape(radius),
        color = if (selected) cs.secondaryContainer else cs.surfaceContainerHigh,
        contentColor = if (selected) cs.onSecondaryContainer else cs.onSurfaceVariant,
        modifier = modifier
            .height(48.dp)
            .semantics {
                role = Role.Tab
                this.selected = selected
            }
    ) {
        Box(contentAlignment = Alignment.Center) { Text(label, style = LaluzType.labelStrong, maxLines = 1) }
    }
}

/** Outlined 40dp variable chip in mono 13/20. */
@Composable
private fun VariableChip(name: String, onClick: () -> Unit) {
    val cs = MaterialTheme.colorScheme
    Surface(
        onClick = onClick,
        shape = CircleShape,
        color = androidx.compose.ui.graphics.Color.Transparent,
        contentColor = cs.onSurface,
        border = BorderStroke(1.dp, cs.outline),
        modifier = Modifier
            .height(40.dp)
            .semantics { contentDescription = "Insert " + name.replace('_', ' ') }
    ) {
        Box(Modifier.padding(horizontal = Spacing.md), contentAlignment = Alignment.Center) {
            Text("{$name}", style = LaluzType.phoneSmall.copy(fontSize = 13.sp, lineHeight = 20.sp))
        }
    }
}

/** Multi-line filled field: label above, surfaceContainerHigh, 16dp radius, 2dp primary ring on focus. */
@Composable
private fun TemplateField(value: String, onValueChange: (String) -> Unit, minLines: Int) {
    val cs = MaterialTheme.colorScheme
    val interaction = remember { MutableInteractionSource() }
    val focused by interaction.collectIsFocusedAsState()
    Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
        Text("Message template", style = MaterialTheme.typography.labelLarge, color = cs.onSurfaceVariant)
        BasicTextField(
            value = value,
            onValueChange = onValueChange,
            minLines = minLines,
            textStyle = MaterialTheme.typography.bodyLarge.copy(color = cs.onSurface),
            cursorBrush = SolidColor(cs.primary),
            keyboardOptions = KeyboardOptions(capitalization = KeyboardCapitalization.Sentences),
            interactionSource = interaction,
            modifier = Modifier
                .fillMaxWidth()
                .clip(LaluzShape.field)
                .background(cs.surfaceContainerHigh)
                .border(2.dp, if (focused) cs.primary else androidx.compose.ui.graphics.Color.Transparent, LaluzShape.field)
                .padding(horizontal = Spacing.md, vertical = Spacing.sm)
        )
    }
}

/** 48dp outlined pill with tight padding for three-up bars. */
@Composable
private fun CompactOutlinedButton(text: String, onClick: () -> Unit, modifier: Modifier = Modifier, contentDescription: String? = null) {
    val cs = MaterialTheme.colorScheme
    OutlinedButton(
        onClick = onClick,
        modifier = modifier
            .height(48.dp)
            .then(if (contentDescription != null) Modifier.semantics { this.contentDescription = contentDescription } else Modifier),
        shape = CircleShape,
        border = BorderStroke(1.dp, cs.outline),
        colors = androidx.compose.material3.ButtonDefaults.outlinedButtonColors(contentColor = cs.onSurface),
        contentPadding = PaddingValues(horizontal = Spacing.xs)
    ) {
        Text(text, style = LaluzType.labelStrong, maxLines = 1)
    }
}
