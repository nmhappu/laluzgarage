package dev.appu.laluzgarage.ui.settings

import androidx.compose.animation.AnimatedContent
import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.animateColorAsState
import androidx.compose.animation.animateContentSize
import androidx.compose.animation.core.Animatable
import androidx.compose.animation.core.CubicBezierEasing
import androidx.compose.animation.core.LinearEasing
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.tween
import androidx.compose.animation.expandVertically
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.scaleIn
import androidx.compose.animation.scaleOut
import androidx.compose.animation.shrinkVertically
import androidx.compose.animation.slideInVertically
import androidx.compose.animation.slideOutVertically
import androidx.compose.animation.togetherWith
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.selection.toggleable
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.ExperimentalMaterial3ExpressiveApi
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Switch
import androidx.compose.material3.SwitchDefaults
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableFloatStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.runtime.withFrameNanos
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.platform.LocalUriHandler
import androidx.compose.ui.semantics.LiveRegionMode
import androidx.compose.ui.semantics.ProgressBarRangeInfo
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.semantics.clearAndSetSemantics
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.heading
import androidx.compose.ui.semantics.liveRegion
import androidx.compose.ui.semantics.progressBarRangeInfo
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.SpanStyle
import androidx.compose.ui.text.buildAnnotatedString
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.withStyle
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.LifecycleResumeEffect
import dev.appu.laluzgarage.data.update.AppUpdater
import dev.appu.laluzgarage.data.update.ReleaseChannel
import dev.appu.laluzgarage.data.update.ReleaseInfo
import dev.appu.laluzgarage.ui.components.CookieShape
import dev.appu.laluzgarage.ui.components.LaluzIcons
import dev.appu.laluzgarage.ui.components.PillButton
import dev.appu.laluzgarage.ui.rememberLastNonNull
import dev.appu.laluzgarage.ui.theme.JetBrainsMono
import dev.appu.laluzgarage.ui.theme.LaluzShape
import dev.appu.laluzgarage.ui.theme.LaluzTheme
import dev.appu.laluzgarage.ui.theme.LaluzType
import dev.appu.laluzgarage.ui.theme.Spacing
import kotlinx.coroutines.delay
import java.time.format.DateTimeFormatter
import java.util.Locale
import kotlin.math.ceil
import kotlin.math.ln
import kotlin.math.pow
import kotlin.math.roundToInt

private val PublishedDate = DateTimeFormatter.ofPattern("d MMM yyyy", Locale.ENGLISH)
private val EmphasizedDecelerate = CubicBezierEasing(0.05f, 0.7f, 0.1f, 1f)

/** Same output as the web app's formatBytes: 1024 steps, one decimal, trailing zero dropped. */
private fun formatBytes(bytes: Long): String {
    if (bytes <= 0) return "0 B"
    val units = listOf("B", "KB", "MB", "GB")
    val i = (ln(bytes.toDouble()) / ln(1024.0)).toInt().coerceIn(0, units.lastIndex)
    val value = ((bytes / 1024.0.pow(i)) * 10).roundToInt() / 10.0
    val text = if (value % 1.0 == 0.0) value.toInt().toString() else value.toString()
    return "$text ${units[i]}"
}

private val ChannelDefs = listOf(
    Triple(ReleaseChannel.STABLE, "Stable releases", "Official releases tested for garage operations and production stability."),
    Triple(ReleaseChannel.DEV, "Development", "Early preview builds, experimental fixes and pre-release updates as soon as they are pushed.")
)

/** The section rises 24dp and fades in, [index] steps after the screen opens. */
@Composable
private fun Modifier.riseIn(index: Int): Modifier {
    val progress = remember { Animatable(0f) }
    LaunchedEffect(Unit) {
        delay(index * 70L)
        progress.animateTo(1f, tween(450, easing = EmphasizedDecelerate))
    }
    return graphicsLayer {
        alpha = progress.value
        translationY = (1f - progress.value) * 24.dp.toPx()
    }
}

@Composable
internal fun AppUpdatesScreen(viewModel: SettingsViewModel, state: SettingsUiState, onBack: () -> Unit) {
    val cs = MaterialTheme.colorScheme
    val ext = LaluzTheme.extendedColors
    val uri = LocalUriHandler.current
    val update = state.update

    LaunchedEffect(Unit) { if (state.update == UpdateState.Idle) viewModel.checkForUpdates() }
    LifecycleResumeEffect(Unit) {
        viewModel.onResumeFromPermission()
        onPauseOrDispose { }
    }

    SettingsPage("App Updates", onBack, state.message, viewModel::clearMessage) {
        Column(
            Modifier.padding(start = Spacing.md, end = Spacing.md, top = Spacing.xs, bottom = Spacing.xxl),
            verticalArrangement = Arrangement.spacedBy(Spacing.xl)
        ) {
            Column(Modifier.riseIn(0)) {
                CheckButton(
                    checking = update is UpdateState.Checking,
                    enabled = update !is UpdateState.Downloading,
                    onClick = viewModel::checkForUpdates
                )

                // Notices drop in between the button and the status card; the gap travels with them.
                val error = rememberLastNonNull(state.updateError)
                AnimatedVisibility(
                    visible = state.updateError != null,
                    enter = expandVertically(tween(350, easing = EmphasizedDecelerate)) + fadeIn(tween(250)) +
                        slideInVertically(tween(350, easing = EmphasizedDecelerate)) { -it / 4 },
                    exit = shrinkVertically(tween(250)) + fadeOut(tween(150))
                ) {
                    if (error != null) {
                        NoticeCard(
                            icon = LaluzIcons.AlertTriangle,
                            tint = cs.error,
                            title = error.title,
                            body = error.message,
                            alert = true,
                            modifier = Modifier.padding(top = Spacing.xs)
                        ) {
                            if (error.kind == UpdateErrorKind.DOWNGRADE) {
                                OutlinedWideButton("View on GitHub", LaluzIcons.GitHub) { uri.openUri(AppUpdater.RELEASES_URL) }
                            } else {
                                OutlinedWideButton(if (error.kind == UpdateErrorKind.DOWNLOAD) "Retry download" else "Retry", onClick = viewModel::retryUpdate)
                            }
                        }
                    }
                }
                AnimatedVisibility(
                    visible = state.installPermissionNeeded,
                    enter = expandVertically(tween(350, easing = EmphasizedDecelerate)) + fadeIn(tween(250)),
                    exit = shrinkVertically(tween(250)) + fadeOut(tween(150))
                ) {
                    NoticeCard(
                        icon = LaluzIcons.ShieldAlert,
                        tint = ext.warning,
                        title = "Permission needed to install",
                        body = "To finish installing, turn on \"Install unknown apps\" for LaluZ Garage in Android settings.",
                        modifier = Modifier.padding(top = Spacing.xs)
                    ) {
                        PillButton(
                            text = "Open Android settings",
                            onClick = viewModel::openInstallPermissionSettings,
                            containerColor = cs.primary,
                            contentColor = cs.onPrimary,
                            modifier = Modifier.fillMaxWidth()
                        )
                    }
                }

                Spacer(Modifier.height(Spacing.xs))
                StatusCard(
                    update = update,
                    channel = state.channel,
                    installedVersion = viewModel.installedVersion,
                    isDevBuild = viewModel.isDevBuild,
                    onInstall = viewModel::downloadAndInstall
                )
            }

            Column(Modifier.riseIn(1), verticalArrangement = Arrangement.spacedBy(Spacing.xs)) {
                SettingsSectionLabel("Release channel")
                ChoiceGroup {
                    ChannelDefs.forEachIndexed { i, (channel, label, desc) ->
                        ChoiceRow(label, desc, state.channel == channel, i, ChannelDefs.size) { viewModel.setChannel(channel) }
                    }
                }
            }

            Row(
                Modifier
                    .riseIn(2)
                    .fillMaxWidth()
                    .clip(LaluzShape.card)
                    .background(cs.surfaceContainerLow)
                    .toggleable(value = state.autoCheck, role = Role.Switch, onValueChange = viewModel::setAutoCheck)
                    .padding(Spacing.md),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(Spacing.md)
            ) {
                Column(Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(2.dp)) {
                    Text("Check for updates on launch", style = MaterialTheme.typography.titleMedium, color = cs.onSurface)
                    Text(
                        "Look for new stable and development releases each time the app opens.",
                        style = MaterialTheme.typography.bodyMedium,
                        color = cs.onSurfaceVariant
                    )
                }
                Switch(
                    checked = state.autoCheck,
                    onCheckedChange = null,
                    colors = SwitchDefaults.colors(
                        checkedTrackColor = cs.primary,
                        checkedThumbColor = cs.onPrimary,
                        uncheckedTrackColor = cs.surfaceContainerHighest,
                        uncheckedBorderColor = cs.outline,
                        uncheckedThumbColor = cs.outline
                    )
                )
            }
        }
    }
}

/**
 * Always on screen. While checking the icon spins and the label reads "Checking…"; the button
 * keeps its colour (taps are ignored) so it doesn't flash disabled.
 */
@Composable
private fun CheckButton(checking: Boolean, enabled: Boolean, onClick: () -> Unit) {
    val cs = MaterialTheme.colorScheme
    val rotation = remember { Animatable(0f) }
    LaunchedEffect(checking) {
        if (checking) {
            while (true) rotation.animateTo(rotation.value + 360f, tween(900, easing = LinearEasing))
        } else {
            // Finish the turn instead of snapping upright.
            rotation.animateTo(ceil(rotation.value / 360f) * 360f, tween(400, easing = EmphasizedDecelerate))
        }
    }
    Button(
        onClick = { if (!checking) onClick() },
        enabled = enabled,
        modifier = Modifier
            .fillMaxWidth()
            .height(48.dp),
        shape = CircleShape,
        contentPadding = PaddingValues(horizontal = Spacing.md),
        colors = ButtonDefaults.buttonColors(containerColor = cs.primary, contentColor = cs.onPrimary)
    ) {
        Icon(
            LaluzIcons.Refresh,
            contentDescription = null,
            modifier = Modifier
                .size(20.dp)
                .graphicsLayer { rotationZ = rotation.value }
        )
        Spacer(Modifier.width(Spacing.xs))
        AnimatedContent(
            targetState = checking,
            transitionSpec = {
                (fadeIn(tween(200)) + slideInVertically(tween(250)) { it / 2 }) togetherWith
                    (fadeOut(tween(150)) + slideOutVertically(tween(200)) { -it / 2 })
            },
            label = "checkLabel"
        ) { busy ->
            Text(if (busy) "Checking…" else "Check for updates", style = LaluzType.labelStrong)
        }
    }
}

private data class StatusText(val title: String, val body: String)

/**
 * The status card stays put and changes in place: header (badge + text) cross-fades, the card
 * resizes smoothly, and the latest version row with the release details slides in only once a
 * newer release is found.
 */
@Composable
private fun StatusCard(
    update: UpdateState,
    channel: ReleaseChannel,
    installedVersion: String,
    isDevBuild: Boolean,
    onInstall: () -> Unit
) {
    val cs = MaterialTheme.colorScheme
    val ext = LaluzTheme.extendedColors
    val word = if (channel == ReleaseChannel.DEV) "development" else "stable"
    val found = when (update) {
        is UpdateState.Available -> update.release
        is UpdateState.Downloading -> update.release
        else -> null
    }
    val revert = (update as? UpdateState.Available)?.revert == true || (update as? UpdateState.Downloading)?.revert == true
    // Dev builds read yellow, stable green (as on the dashboard card).
    val devAccent = channel == ReleaseChannel.DEV && !revert
    val accent = if (devAccent) ext.warning else cs.primary
    val accentContainer = if (devAccent) ext.warningContainer else cs.primaryContainer
    val onAccentContainer = if (devAccent) ext.onWarningContainer else cs.onPrimaryContainer

    val text = when (update) {
        UpdateState.Idle -> StatusText(
            "Not checked yet",
            if (channel == ReleaseChannel.STABLE && isDevBuild) "You're on a development build. Check for updates to find the latest stable release."
            else "Check for updates to look for a new $word release."
        )
        UpdateState.Checking -> StatusText("Checking for updates…", "Looking for the latest $word release on GitHub.")
        is UpdateState.UpToDate -> StatusText("You are up to date", "This is the latest version on the $word channel.")
        else -> if (revert) StatusText("Back to stable", "Leave the development channel for the latest stable release.")
        else StatusText(
            if (channel == ReleaseChannel.DEV) "Development build available" else "Update available",
            "Version ${found?.version} is ready to install."
        )
    }
    val badgeIcon = when {
        update is UpdateState.UpToDate -> LaluzIcons.CheckBold
        revert -> LaluzIcons.Undo
        found != null -> LaluzIcons.ArrowDownToLine
        else -> LaluzIcons.Refresh
    }
    val (badgeBg, badgeFg) = when {
        update is UpdateState.Checking -> cs.secondaryContainer to cs.onSecondaryContainer
        update is UpdateState.UpToDate || revert -> cs.primaryContainer to cs.onPrimaryContainer
        found != null -> accentContainer to onAccentContainer
        else -> cs.surfaceContainerHigh to cs.onSurfaceVariant
    }

    Column(
        Modifier
            .fillMaxWidth()
            .background(cs.surfaceContainerLow, LaluzShape.card)
            .animateContentSize(tween(400, easing = EmphasizedDecelerate))
            .padding(Spacing.lg)
            .semantics { liveRegion = LiveRegionMode.Polite },
        verticalArrangement = Arrangement.spacedBy(Spacing.md)
    ) {
        Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(Spacing.md)) {
            StatusBadge(
                icon = badgeIcon,
                container = badgeBg,
                content = badgeFg,
                fast = update is UpdateState.Checking || update is UpdateState.Downloading
            )
            AnimatedContent(
                targetState = text,
                transitionSpec = {
                    (fadeIn(tween(250, delayMillis = 60)) + slideInVertically(tween(350, easing = EmphasizedDecelerate)) { it / 3 }) togetherWith
                        fadeOut(tween(120))
                },
                modifier = Modifier.weight(1f),
                label = "statusText"
            ) { t ->
                Column {
                    Text(t.title, style = BoldTitle(), color = cs.onSurface, modifier = Modifier.semantics { heading() })
                    Text(t.body, style = MaterialTheme.typography.bodyMedium, color = cs.onSurfaceVariant)
                }
            }
        }

        Column(
            Modifier
                .fillMaxWidth()
                .clip(LaluzShape.field)
                .background(cs.surfaceContainerHigh)
        ) {
            VersionRow("Current version", AppUpdater.normalizeVersion(installedVersion), cs.onSurface)
            val held = rememberLastNonNull(found)
            AnimatedVisibility(
                visible = found != null,
                enter = expandVertically(tween(350, easing = EmphasizedDecelerate)) + fadeIn(tween(250, delayMillis = 80)),
                exit = shrinkVertically(tween(250)) + fadeOut(tween(150))
            ) {
                if (held != null) {
                    Column {
                        HorizontalDivider(color = cs.outlineVariant)
                        VersionRow("Latest version", held.version, accent)
                    }
                }
            }
        }

        val heldRelease = rememberLastNonNull(found)
        AnimatedVisibility(
            visible = found != null,
            enter = expandVertically(tween(400, easing = EmphasizedDecelerate)) + fadeIn(tween(300, delayMillis = 120)),
            exit = shrinkVertically(tween(250)) + fadeOut(tween(150))
        ) {
            if (heldRelease != null) {
                ReleaseDetails(
                    release = heldRelease,
                    downloading = update as? UpdateState.Downloading,
                    revert = revert,
                    accent = accent,
                    devAccent = devAccent,
                    onInstall = onInstall
                )
            }
        }
    }
}

/**
 * Cookie badge behind the state icon. It turns slowly, and speeds up while checking or downloading;
 * colours fade and the icon pops between states.
 */
@Composable
private fun StatusBadge(icon: ImageVector, container: Color, content: Color, fast: Boolean) {
    val bg by animateColorAsState(container, tween(300), label = "badgeBg")
    val fg by animateColorAsState(content, tween(300), label = "badgeFg")
    val speed by animateFloatAsState(if (fast) 180f else 18f, tween(600), label = "badgeSpeed") // degrees per second
    var angle by remember { mutableFloatStateOf(0f) }
    LaunchedEffect(Unit) {
        var last = withFrameNanos { it }
        while (true) {
            withFrameNanos { now ->
                angle = (angle + speed * (now - last) / 1_000_000_000f) % 360f
                last = now
            }
        }
    }
    Box(Modifier.size(48.dp).clearAndSetSemantics { }, contentAlignment = Alignment.Center) {
        Box(
            Modifier
                .matchParentSize()
                .graphicsLayer { rotationZ = angle }
                .clip(CookieShape)
                .background(bg)
        )
        AnimatedContent(
            targetState = icon,
            transitionSpec = {
                (fadeIn(tween(200)) + scaleIn(tween(300, easing = EmphasizedDecelerate), initialScale = 0.5f)) togetherWith
                    (fadeOut(tween(120)) + scaleOut(tween(150), targetScale = 0.5f))
            },
            label = "badgeIcon"
        ) { i ->
            Icon(i, contentDescription = null, tint = fg, modifier = Modifier.size(24.dp))
        }
    }
}

@Composable
private fun VersionRow(label: String, value: String, valueColor: Color) {
    val cs = MaterialTheme.colorScheme
    Row(
        Modifier
            .fillMaxWidth()
            .padding(horizontal = Spacing.md, vertical = Spacing.sm),
        verticalAlignment = Alignment.CenterVertically
    ) {
        Text(label, style = MaterialTheme.typography.bodyMedium, color = cs.onSurfaceVariant, modifier = Modifier.weight(1f))
        Text(value, style = LaluzType.monoValue, color = valueColor)
    }
}

/** Error / permission card: tinted icon and 16/24 bold title, 14/20 body, one action. */
@Composable
private fun NoticeCard(
    icon: ImageVector,
    tint: Color,
    title: String,
    body: String,
    modifier: Modifier = Modifier,
    alert: Boolean = false,
    action: @Composable () -> Unit
) {
    val cs = MaterialTheme.colorScheme
    Column(
        modifier
            .fillMaxWidth()
            .background(cs.surfaceContainerLow, LaluzShape.card)
            .padding(Spacing.lg)
            .then(if (alert) Modifier.semantics { liveRegion = LiveRegionMode.Assertive } else Modifier),
        verticalArrangement = Arrangement.spacedBy(Spacing.sm)
    ) {
        Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(Spacing.sm)) {
            Icon(icon, contentDescription = null, tint = tint, modifier = Modifier.size(24.dp))
            Text(title, style = BoldTitle(), color = tint, modifier = Modifier.semantics { heading() })
        }
        Text(body, style = MaterialTheme.typography.bodyMedium, color = cs.onSurfaceVariant)
        action()
    }
}

@Composable
private fun BoldTitle() = MaterialTheme.typography.titleMedium.copy(fontWeight = FontWeight.Bold)

@OptIn(ExperimentalMaterial3ExpressiveApi::class)
@Composable
private fun ReleaseDetails(
    release: ReleaseInfo,
    downloading: UpdateState.Downloading?,
    revert: Boolean,
    accent: Color,
    devAccent: Boolean,
    onInstall: () -> Unit
) {
    val cs = MaterialTheme.colorScheme
    val ext = LaluzTheme.extendedColors
    val uri = LocalUriHandler.current
    var notesOpen by rememberSaveable { mutableStateOf(true) }
    val size = formatBytes(release.apkSize)
    Column(verticalArrangement = Arrangement.spacedBy(Spacing.md)) {
        Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(Spacing.sm)) {
            Text(
                buildAnnotatedString {
                    append("Tag ")
                    withStyle(SpanStyle(fontFamily = JetBrainsMono, fontWeight = FontWeight.Bold, color = cs.onSurface)) {
                        append(release.tagName)
                    }
                    release.publishedOn?.let { append(" · Published " + it.format(PublishedDate)) }
                },
                style = MaterialTheme.typography.bodyMedium,
                color = cs.onSurfaceVariant,
                modifier = Modifier.weight(1f)
            )
            SmallChip(size, cs.surfaceContainerHigh, cs.onSurface, style = LaluzType.labelTiny.copy(fontFamily = JetBrainsMono))
        }

        if (revert) {
            Text(
                "Stable ${release.tagName} is older than this development build. If Android won't install it over the top, " +
                    "uninstall LaluZ Garage first, then install it from GitHub.",
                style = MaterialTheme.typography.bodyMedium,
                color = cs.onSurfaceVariant
            )
        }

        if (release.notes.isNotEmpty()) {
            Column(
                Modifier
                    .fillMaxWidth()
                    .clip(LaluzShape.field)
                    .background(cs.surfaceContainerHigh)
            ) {
                Row(
                    Modifier
                        .fillMaxWidth()
                        .height(48.dp)
                        .toggleable(value = notesOpen, onValueChange = { notesOpen = it }, role = Role.Button)
                        .semantics { contentDescription = if (notesOpen) "Release notes, expanded" else "Release notes, collapsed" }
                        .padding(horizontal = Spacing.md),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text("Release notes", style = MaterialTheme.typography.labelLarge, color = cs.onSurface, modifier = Modifier.weight(1f))
                    val turn by animateFloatAsState(if (notesOpen) 0f else 180f, tween(300, easing = EmphasizedDecelerate), label = "notesChevron")
                    Icon(
                        LaluzIcons.ChevronUp,
                        contentDescription = null,
                        tint = cs.onSurface,
                        modifier = Modifier.graphicsLayer { rotationZ = turn }
                    )
                }
                AnimatedVisibility(
                    notesOpen,
                    enter = expandVertically(tween(300, easing = EmphasizedDecelerate)) + fadeIn(tween(200, delayMillis = 60)),
                    exit = shrinkVertically(tween(250)) + fadeOut(tween(120))
                ) {
                    Column(
                        Modifier.padding(start = Spacing.lg, end = Spacing.md, bottom = Spacing.md),
                        verticalArrangement = Arrangement.spacedBy(Spacing.xxs)
                    ) {
                        release.notes.forEach { line ->
                            Row(horizontalArrangement = Arrangement.spacedBy(Spacing.xs)) {
                                Text("•", style = MaterialTheme.typography.bodyMedium, color = cs.onSurface)
                                Text(line, style = MaterialTheme.typography.bodyMedium, color = cs.onSurface)
                            }
                        }
                    }
                }
            }
        }

        AnimatedContent(
            targetState = downloading != null,
            transitionSpec = { fadeIn(tween(250, delayMillis = 60)) togetherWith fadeOut(tween(120)) },
            label = "installArea"
        ) { isDownloading ->
            if (isDownloading && downloading != null) {
                val total = downloading.total.coerceAtLeast(1)
                val fraction by animateFloatAsState(
                    (downloading.read.toFloat() / total).coerceIn(0f, 1f),
                    tween(250),
                    label = "downloadProgress"
                )
                val pct = (fraction * 100).toInt()
                Column(verticalArrangement = Arrangement.spacedBy(Spacing.md)) {
                    Column(verticalArrangement = Arrangement.spacedBy(Spacing.xs)) {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Text("Downloading update", style = MaterialTheme.typography.labelLarge, color = cs.onSurface, modifier = Modifier.weight(1f))
                            Text("$pct%", style = LaluzType.labelTiny.copy(fontFamily = JetBrainsMono), color = cs.onSurface)
                        }
                        Box(
                            Modifier
                                .fillMaxWidth()
                                .height(8.dp)
                                .clip(CircleShape)
                                .background(cs.surfaceContainerHighest)
                                .semantics {
                                    contentDescription = "Download progress"
                                    progressBarRangeInfo = ProgressBarRangeInfo(fraction, 0f..1f)
                                }
                        ) {
                            Box(
                                Modifier
                                    .fillMaxHeight()
                                    .fillMaxWidth(fraction)
                                    .clip(CircleShape)
                                    .background(accent)
                            )
                        }
                        Text(
                            "${formatBytes(downloading.read)} of ${formatBytes(downloading.total)}",
                            style = MaterialTheme.typography.bodySmall,
                            color = cs.onSurfaceVariant
                        )
                    }
                    PillButton(
                        text = "Downloading…",
                        onClick = {},
                        containerColor = cs.primary,
                        contentColor = cs.onPrimary,
                        enabled = false,
                        modifier = Modifier.fillMaxWidth()
                    )
                }
            } else {
                Column(verticalArrangement = Arrangement.spacedBy(Spacing.xs)) {
                    PillButton(
                        text = if (revert) "Install stable · $size" else "Download and install · $size",
                        onClick = onInstall,
                        containerColor = if (devAccent) ext.warningContainer else cs.primary,
                        contentColor = if (devAccent) ext.onWarningContainer else cs.onPrimary,
                        icon = LaluzIcons.Download,
                        modifier = Modifier.fillMaxWidth()
                    )
                    OutlinedWideButton("View on GitHub", LaluzIcons.GitHub) { uri.openUri(release.htmlUrl.ifBlank { AppUpdater.RELEASES_URL }) }
                }
            }
        }
    }
}

/** Full-width 48dp outlined pill in onSurface. */
@Composable
private fun OutlinedWideButton(text: String, icon: ImageVector? = null, onClick: () -> Unit) {
    val cs = MaterialTheme.colorScheme
    OutlinedButton(
        onClick = onClick,
        modifier = Modifier
            .fillMaxWidth()
            .height(48.dp),
        shape = CircleShape,
        border = BorderStroke(1.dp, cs.outline),
        colors = ButtonDefaults.outlinedButtonColors(contentColor = cs.onSurface),
        contentPadding = PaddingValues(horizontal = Spacing.md)
    ) {
        if (icon != null) {
            Icon(icon, contentDescription = null, modifier = Modifier.size(20.dp))
            Spacer(Modifier.width(Spacing.xs))
        }
        Text(text, style = LaluzType.labelStrong)
    }
}
