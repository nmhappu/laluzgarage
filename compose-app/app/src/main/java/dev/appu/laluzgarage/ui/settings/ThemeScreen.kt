package dev.appu.laluzgarage.ui.settings

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.selection.toggleable
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Switch
import androidx.compose.material3.SwitchDefaults
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.semantics.clearAndSetSemantics
import androidx.compose.ui.unit.dp
import dev.appu.laluzgarage.ui.theme.LaluzShape
import dev.appu.laluzgarage.ui.theme.Spacing
import dev.appu.laluzgarage.ui.theme.ThemeMode
import dev.appu.laluzgarage.ui.theme.supportsDynamicColor

internal val ThemeMode.label: String
    get() = when (this) {
        ThemeMode.SYSTEM -> "System"
        ThemeMode.LIGHT -> "Light"
        ThemeMode.DARK -> "Dark"
    }

private val ModeDefs = listOf(
    ThemeMode.SYSTEM to "Follow the device's dark theme setting",
    ThemeMode.LIGHT to "Always use the light theme",
    ThemeMode.DARK to "Always use the dark theme"
)

/** One-line summary for the Theme row on Settings home, e.g. "System · Material You". */
internal fun themeSummary(mode: ThemeMode, dynamicColor: Boolean): String =
    if (dynamicColor && supportsDynamicColor()) "${mode.label} · Material You" else "${mode.label} · LaluZ colours"

/** Theme: System / Light / Dark mode and the Material You (wallpaper colour) toggle. */
@Composable
internal fun ThemeScreen(
    themeMode: ThemeMode,
    dynamicColor: Boolean,
    onThemeModeChange: (ThemeMode) -> Unit,
    onDynamicColorChange: (Boolean) -> Unit,
    onBack: () -> Unit
) {
    val cs = MaterialTheme.colorScheme
    val dynamicAvailable = supportsDynamicColor()
    SettingsPage("Theme", onBack, null, {}) {
        Column(
            Modifier.padding(start = Spacing.md, end = Spacing.md, top = Spacing.xs, bottom = Spacing.xxl),
            verticalArrangement = Arrangement.spacedBy(Spacing.xxl)
        ) {
            Column(verticalArrangement = Arrangement.spacedBy(Spacing.xs)) {
                SettingsSectionLabel("Mode")
                ChoiceGroup {
                    ModeDefs.forEachIndexed { i, (mode, desc) ->
                        ChoiceRow(mode.label, desc, themeMode == mode, i, ModeDefs.size) { onThemeModeChange(mode) }
                    }
                }
            }

            Column(verticalArrangement = Arrangement.spacedBy(Spacing.xs)) {
                SettingsSectionLabel("Colour")
                val checked = dynamicColor && dynamicAvailable
                Row(
                    Modifier
                        .fillMaxWidth()
                        .clip(LaluzShape.card)
                        .background(cs.surfaceContainerLow)
                        .toggleable(
                            value = checked,
                            enabled = dynamicAvailable,
                            role = Role.Switch,
                            onValueChange = onDynamicColorChange
                        )
                        .padding(Spacing.md),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(Spacing.md)
                ) {
                    Column(Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(2.dp)) {
                        Text(
                            "Material You",
                            style = MaterialTheme.typography.titleMedium,
                            color = if (dynamicAvailable) cs.onSurface else cs.onSurface.copy(alpha = 0.38f)
                        )
                        Text(
                            if (dynamicAvailable) "Use colours from your wallpaper instead of the LaluZ palette."
                            else "Needs Android 12 or later.",
                            style = MaterialTheme.typography.bodyMedium,
                            color = cs.onSurfaceVariant
                        )
                    }
                    Switch(
                        checked = checked,
                        onCheckedChange = null,
                        enabled = dynamicAvailable,
                        colors = SwitchDefaults.colors(
                            checkedTrackColor = cs.primary,
                            checkedThumbColor = cs.onPrimary,
                            uncheckedTrackColor = cs.surfaceContainerHighest,
                            uncheckedBorderColor = cs.outline,
                            uncheckedThumbColor = cs.outline
                        )
                    )
                }
                PalettePreview()
            }
        }
    }
}

/** Swatches of the live colour scheme, so the Material You switch shows its effect here. */
@Composable
private fun PalettePreview() {
    val cs = MaterialTheme.colorScheme
    Row(
        Modifier
            .fillMaxWidth()
            .clip(LaluzShape.card)
            .background(cs.surfaceContainerLow)
            .padding(Spacing.md)
            .clearAndSetSemantics { },
        horizontalArrangement = Arrangement.spacedBy(Spacing.sm),
        verticalAlignment = Alignment.CenterVertically
    ) {
        listOf(cs.primary, cs.secondary, cs.tertiary, cs.primaryContainer, cs.secondaryContainer, cs.tertiaryContainer)
            .forEach { color ->
                Box(
                    Modifier
                        .size(32.dp)
                        .border(1.dp, cs.outlineVariant, CircleShape)
                        .background(color, CircleShape)
                )
            }
    }
}
