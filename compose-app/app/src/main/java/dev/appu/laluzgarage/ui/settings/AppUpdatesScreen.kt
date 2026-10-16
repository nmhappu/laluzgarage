package dev.appu.laluzgarage.ui.settings

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.selection.toggleable
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Surface
import androidx.compose.material3.Switch
import androidx.compose.material3.SwitchDefaults
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalUriHandler
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.semantics.clearAndSetSemantics
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.heading
import androidx.compose.ui.semantics.liveRegion
import androidx.compose.ui.semantics.LiveRegionMode
import androidx.compose.ui.semantics.progressBarRangeInfo
import androidx.compose.ui.semantics.ProgressBarRangeInfo
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.SpanStyle
import androidx.compose.ui.text.buildAnnotatedString
import androidx.compose.ui.text.withStyle
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.LifecycleResumeEffect
import dev.appu.laluzgarage.data.update.AppUpdater
import dev.appu.laluzgarage.data.update.ReleaseChannel
import dev.appu.laluzgarage.data.update.ReleaseInfo
import dev.appu.laluzgarage.ui.components.LaluzIcons
import dev.appu.laluzgarage.ui.components.PillButton
import dev.appu.laluzgarage.ui.services.longLabel
import dev.appu.laluzgarage.ui.theme.JetBrainsMono
import dev.appu.laluzgarage.ui.theme.LaluzShape
import dev.appu.laluzgarage.ui.theme.LaluzTheme
import dev.appu.laluzgarage.ui.theme.LaluzType
import dev.appu.laluzgarage.ui.theme.Spacing
import java.time.format.DateTimeFormatter
import java.util.Locale
import kotlin.math.ln
import kotlin.math.pow
import kotlin.math.roundToInt

private val PublishedDate = DateTimeFormatter.ofPattern("d MMM yyyy", Locale.ENGLISH)

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

@Composable
internal fun AppUpdatesScreen(viewModel: SettingsViewModel, state: SettingsUiState, onBack: () -> Unit) {
    val cs = MaterialTheme.colorScheme
    val ext = LaluzTheme.extendedColors
    val update = state.update
    val busy = update is UpdateState.Checking || update is UpdateState.Downloading

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
            Column(verticalArrangement = Arrangement.spacedBy(Spacing.xs)) {
                PillButton(
                    text = if (update is UpdateState.Checking) "Checking…" else "Check for updates",
                    onClick = viewModel::checkForUpdates,
                    containerColor = cs.primary,
                    contentColor = cs.onPrimary,
                    icon = LaluzIcons.Refresh,
                    enabled = !busy,
                    modifier = Modifier.fillMaxWidth()
                )

                if (update is UpdateState.Failed) {
                    NoticeCard(
                        icon = LaluzIcons.AlertTriangle,
                        tint = cs.error,
                        title = if (update.release != null) "Download failed" else "Update check failed",
                        body = update.message,
                        alert = true
                    ) {
                        OutlinedWideButton("Retry") {
                            if (update.release != null) viewModel.downloadAndInstall() else viewModel.checkForUpdates()
                        }
                    }
                }
                if (state.installPermissionNeeded) {
                    NoticeCard(
                        icon = LaluzIcons.ShieldAlert,
                        tint = ext.warning,
                        title = "Permission needed to install",
                        body = "To finish installing, turn on \"Install unknown apps\" for LaluZ Garage in Android settings."
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
                when (update) {
                    is UpdateState.Available -> ReleaseCard(update.release, null, viewModel::downloadAndInstall)
                    is UpdateState.Downloading -> ReleaseCard(update.release, update, viewModel::downloadAndInstall)
                    is UpdateState.UpToDate -> UpToDateCard(update.currentVersion, state.channel)
                    else -> Unit
                }
            }

            Column(verticalArrangement = Arrangement.spacedBy(Spacing.xs)) {
                SettingsSectionLabel("Release channel")
                ChoiceGroup {
                    ChannelDefs.forEachIndexed { i, (channel, label, desc) ->
                        ChoiceRow(label, desc, state.channel == channel, i, ChannelDefs.size) { viewModel.setChannel(channel) }
                    }
                }
            }

            Row(
                Modifier
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
                    Text("Look for a new release each time the app opens.", style = MaterialTheme.typography.bodyMedium, color = cs.onSurfaceVariant)
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

/** Error / permission card: tinted icon and 16/24 bold title, 14/20 body, one action. */
@Composable
private fun NoticeCard(
    icon: androidx.compose.ui.graphics.vector.ImageVector,
    tint: Color,
    title: String,
    body: String,
    alert: Boolean = false,
    action: @Composable () -> Unit
) {
    val cs = MaterialTheme.colorScheme
    Column(
        Modifier
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
private fun BoldTitle() = MaterialTheme.typography.titleMedium.copy(fontWeight = androidx.compose.ui.text.font.FontWeight.Bold)

@Composable
private fun ReleaseCard(release: ReleaseInfo, downloading: UpdateState.Downloading?, onInstall: () -> Unit) {
    val cs = MaterialTheme.colorScheme
    val uri = LocalUriHandler.current
    var notesOpen by rememberSaveable { mutableStateOf(true) }
    val size = formatBytes(release.apkSize)
    Column(
        Modifier
            .fillMaxWidth()
            .background(cs.surfaceContainerLow, LaluzShape.card)
            .padding(Spacing.lg),
        verticalArrangement = Arrangement.spacedBy(Spacing.md)
    ) {
        Row(verticalAlignment = Alignment.Top, horizontalArrangement = Arrangement.spacedBy(Spacing.sm)) {
            Column(Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(Spacing.xs)) {
                SmallChip("Update available", cs.primaryContainer, cs.onPrimaryContainer)
                Text(
                    "Version ${release.version}",
                    style = MaterialTheme.typography.titleLarge,
                    color = cs.onSurface,
                    modifier = Modifier.semantics { heading() }
                )
                Text(
                    buildAnnotatedString {
                        append("Tag ")
                        withStyle(SpanStyle(fontFamily = JetBrainsMono, fontWeight = androidx.compose.ui.text.font.FontWeight.Bold, color = cs.onSurface)) {
                            append(release.tagName)
                        }
                        release.publishedOn?.let { append(" · Published " + it.format(PublishedDate)) }
                    },
                    style = MaterialTheme.typography.bodyMedium,
                    color = cs.onSurfaceVariant
                )
            }
            SmallChip(size, cs.surfaceContainerHigh, cs.onSurface, style = LaluzType.labelTiny.copy(fontFamily = JetBrainsMono))
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
                    Icon(if (notesOpen) LaluzIcons.ChevronUp else LaluzIcons.ChevronDown, contentDescription = null, tint = cs.onSurface)
                }
                AnimatedVisibility(notesOpen) {
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

        if (downloading != null) {
            val total = downloading.total.coerceAtLeast(1)
            val fraction = (downloading.read.toFloat() / total).coerceIn(0f, 1f)
            val pct = (fraction * 100).toInt()
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
                            .background(cs.primary)
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
        } else {
            Column(verticalArrangement = Arrangement.spacedBy(Spacing.xs)) {
                PillButton(
                    text = "Download and install · $size",
                    onClick = onInstall,
                    containerColor = cs.primary,
                    contentColor = cs.onPrimary,
                    icon = LaluzIcons.Download,
                    modifier = Modifier.fillMaxWidth()
                )
                OutlinedWideButton("View on GitHub") { uri.openUri(release.htmlUrl.ifBlank { AppUpdater.RELEASES_URL }) }
            }
        }
    }
}

@Composable
private fun UpToDateCard(currentVersion: String, channel: ReleaseChannel) {
    val cs = MaterialTheme.colorScheme
    Column(
        Modifier
            .fillMaxWidth()
            .background(cs.surfaceContainerLow, LaluzShape.card)
            .padding(Spacing.lg),
        verticalArrangement = Arrangement.spacedBy(Spacing.md)
    ) {
        Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(Spacing.md)) {
            Box(
                Modifier
                    .size(40.dp)
                    .background(cs.primaryContainer, CircleShape)
                    .clearAndSetSemantics { },
                contentAlignment = Alignment.Center
            ) {
                Icon(LaluzIcons.CheckBold, contentDescription = null, tint = cs.onPrimaryContainer, modifier = Modifier.size(24.dp))
            }
            Column(Modifier.weight(1f)) {
                Text("You are up to date", style = BoldTitle(), color = cs.onSurface, modifier = Modifier.semantics { heading() })
                Text(
                    "This is the latest version on the ${if (channel == ReleaseChannel.DEV) "development" else "stable"} channel.",
                    style = MaterialTheme.typography.bodyMedium,
                    color = cs.onSurfaceVariant
                )
            }
        }
        Row(
            Modifier
                .fillMaxWidth()
                .background(cs.surfaceContainerHigh, LaluzShape.field)
                .padding(horizontal = Spacing.md, vertical = Spacing.sm),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Text("Current version", style = MaterialTheme.typography.bodyMedium, color = cs.onSurfaceVariant, modifier = Modifier.weight(1f))
            Text("v" + AppUpdater.normalizeVersion(currentVersion), style = LaluzType.monoValue, color = cs.onSurface)
        }
    }
}

/** Full-width 48dp outlined pill in onSurface. */
@Composable
private fun OutlinedWideButton(text: String, onClick: () -> Unit) {
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
        Text(text, style = LaluzType.labelStrong)
    }
}
