package dev.appu.laluzgarage.ui.auth

import androidx.compose.animation.animateColorAsState
import androidx.compose.animation.core.tween
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.BoxWithConstraints
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.IntrinsicSize
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.safeDrawingPadding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.selection.selectable
import androidx.compose.foundation.selection.selectableGroup
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.semantics.clearAndSetSemantics
import androidx.compose.ui.semantics.heading
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.unit.dp
import dev.appu.laluzgarage.ui.components.LaluzIcons
import dev.appu.laluzgarage.ui.components.PillButton
import dev.appu.laluzgarage.ui.components.SpinningCookieBadge
import dev.appu.laluzgarage.ui.theme.LaluzShape
import dev.appu.laluzgarage.ui.theme.LaluzType
import dev.appu.laluzgarage.ui.theme.Motion
import dev.appu.laluzgarage.ui.theme.Spacing
import dev.appu.laluzgarage.ui.theme.ThemeMode
import dev.appu.laluzgarage.ui.theme.supportsDynamicColor

/** The four choices. Material You is wallpaper colour that follows the device's light/dark setting. */
private enum class ThemeChoice(val label: String, val icon: () -> ImageVector) {
    SYSTEM("System Default", { LaluzIcons.Smartphone }),
    DARK("Dark", { LaluzIcons.Moon }),
    LIGHT("Light", { LaluzIcons.Sun }),
    MATERIAL_YOU("Material You", { LaluzIcons.Palette })
}

/**
 * First sign-in theme picker, shown once per account after approval. Choices apply live (the whole
 * app recolours), so the preview card is the real theme rather than a mock-up.
 */
@Composable
fun ThemePickerScreen(
    state: AuthUiState,
    isDarkTheme: Boolean,
    onThemeModeChange: (ThemeMode) -> Unit,
    onDynamicColorChange: (Boolean) -> Unit,
    onContinue: () -> Unit
) {
    val cs = MaterialTheme.colorScheme
    val dynamicAvailable = supportsDynamicColor()
    val selected = when {
        state.dynamicColor && dynamicAvailable -> ThemeChoice.MATERIAL_YOU
        state.themeMode == ThemeMode.DARK -> ThemeChoice.DARK
        state.themeMode == ThemeMode.LIGHT -> ThemeChoice.LIGHT
        else -> ThemeChoice.SYSTEM
    }
    val choices = ThemeChoice.entries.filter { it != ThemeChoice.MATERIAL_YOU || dynamicAvailable }
    val surface by animateColorAsState(cs.surface, tween(Motion.COLOR_MS), label = "ThemePickerSurface")
    val cookie by animateColorAsState(cs.secondaryContainer, tween(Motion.COLOR_MS), label = "ThemePickerCookie")
    val onCookie by animateColorAsState(cs.onSecondaryContainer, tween(Motion.COLOR_MS), label = "ThemePickerCookieIcon")

    fun choose(choice: ThemeChoice) {
        when (choice) {
            ThemeChoice.SYSTEM -> { onDynamicColorChange(false); onThemeModeChange(ThemeMode.SYSTEM) }
            ThemeChoice.DARK -> { onDynamicColorChange(false); onThemeModeChange(ThemeMode.DARK) }
            ThemeChoice.LIGHT -> { onDynamicColorChange(false); onThemeModeChange(ThemeMode.LIGHT) }
            ThemeChoice.MATERIAL_YOU -> { onThemeModeChange(ThemeMode.SYSTEM); onDynamicColorChange(true) }
        }
    }

    BoxWithConstraints(
        modifier = Modifier
            .fillMaxSize()
            .background(surface)
            .safeDrawingPadding()
    ) {
        val viewport = maxHeight
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .verticalScroll(rememberScrollState())
                .heightIn(min = viewport)
                .padding(start = Spacing.xl, end = Spacing.xl, top = 56.dp, bottom = Spacing.xl)
                .widthIn(max = 560.dp)
        ) {
            SpinningCookieBadge(selected.icon(), container = cookie, content = onCookie, size = 104.dp)
            Text(
                "Choose your theme",
                style = MaterialTheme.typography.headlineMedium,
                color = cs.onSurface,
                modifier = Modifier
                    .padding(top = Spacing.xl)
                    .semantics { heading() }
            )
            Text(
                "See how the app looks before you start. You can change this later in Settings.",
                style = MaterialTheme.typography.bodyLarge,
                color = cs.onSurfaceVariant,
                modifier = Modifier.padding(top = Spacing.xs)
            )

            PreviewCustomerCard(Modifier.padding(top = Spacing.xl))

            Text(
                "Theme",
                style = MaterialTheme.typography.titleSmall,
                color = cs.onSurfaceVariant,
                modifier = Modifier.padding(top = Spacing.xl, bottom = Spacing.xs)
            )
            Column(Modifier.selectableGroup(), verticalArrangement = Arrangement.spacedBy(Spacing.xs)) {
                choices.chunked(2).forEach { rowChoices ->
                    Row(
                        Modifier
                            .fillMaxWidth()
                            .height(IntrinsicSize.Min),
                        horizontalArrangement = Arrangement.spacedBy(Spacing.xs)
                    ) {
                        rowChoices.forEach { choice ->
                            ThemeButton(choice, choice == selected, Modifier.weight(1f)) { choose(choice) }
                        }
                        if (rowChoices.size == 1) Spacer(Modifier.weight(1f))
                    }
                }
            }

            Spacer(Modifier.weight(1f).heightIn(min = Spacing.xl))
            PillButton(
                text = "Continue",
                onClick = onContinue,
                containerColor = cs.primary,
                contentColor = cs.onPrimary,
                icon = LaluzIcons.ArrowForward,
                modifier = Modifier
                    .fillMaxWidth()
                    .height(56.dp)
            )
        }
    }
}

/** A customer card with a call button and a "New job" button, drawn in the live theme. Decorative to TalkBack. */
@Composable
private fun PreviewCustomerCard(modifier: Modifier = Modifier) {
    val cs = MaterialTheme.colorScheme
    Column(
        modifier
            .fillMaxWidth()
            .clip(LaluzShape.card)
            .background(cs.surfaceContainerLow)
            .padding(Spacing.md)
            .clearAndSetSemantics { },
        verticalArrangement = Arrangement.spacedBy(Spacing.md)
    ) {
        Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(Spacing.sm)) {
            Box(
                Modifier
                    .size(40.dp)
                    .clip(CircleShape)
                    .background(cs.tertiaryContainer),
                contentAlignment = Alignment.Center
            ) {
                Text("JW", style = LaluzType.labelTiny, color = cs.onTertiaryContainer)
            }
            Column(Modifier.weight(1f)) {
                Text("John Wick", style = MaterialTheme.typography.titleMedium, color = cs.onSurface, maxLines = 1)
                Text("+91 85471 87744", style = LaluzType.monoSmall, color = cs.onSurfaceVariant, maxLines = 1)
            }
            Box(
                Modifier
                    .height(24.dp)
                    .clip(LaluzShape.chip)
                    .background(cs.secondaryContainer)
                    .padding(horizontal = Spacing.xs),
                contentAlignment = Alignment.Center
            ) {
                Text("Regular", style = MaterialTheme.typography.labelMedium, color = cs.onSecondaryContainer)
            }
        }
        HorizontalDivider(thickness = 1.dp, color = cs.outlineVariant)
        Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
            Text(
                "Swift Dzire · KL 07 CD 4521",
                style = MaterialTheme.typography.bodyMedium,
                color = cs.onSurfaceVariant,
                maxLines = 1,
                modifier = Modifier.weight(1f)
            )
            Text("₹4,850", style = LaluzType.monoSmall, color = cs.primary)
        }
        Row(horizontalArrangement = Arrangement.spacedBy(Spacing.xs)) {
            PreviewPill("Call", cs.primary, cs.onPrimary, LaluzIcons.Phone, Modifier.weight(1f))
            PreviewPill("New job", cs.secondaryContainer, cs.onSecondaryContainer, LaluzIcons.Plus, Modifier.weight(1f))
        }
    }
}

/** Non-interactive button look-alike; the preview must not act on taps. */
@Composable
private fun PreviewPill(
    text: String,
    container: Color,
    content: Color,
    icon: ImageVector,
    modifier: Modifier = Modifier
) {
    Row(
        modifier
            .height(44.dp)
            .clip(CircleShape)
            .background(container),
        horizontalArrangement = Arrangement.Center,
        verticalAlignment = Alignment.CenterVertically
    ) {
        Icon(icon, null, Modifier.size(18.dp), tint = content)
        Spacer(Modifier.size(Spacing.xs))
        Text(text, style = LaluzType.labelStrong, color = content)
    }
}

@Composable
private fun ThemeButton(choice: ThemeChoice, selected: Boolean, modifier: Modifier = Modifier, onSelect: () -> Unit) {
    val cs = MaterialTheme.colorScheme
    val ring by animateColorAsState(if (selected) cs.primary else cs.outlineVariant, tween(Motion.COLOR_MS), label = "ThemeButtonRing")
    val disc by animateColorAsState(if (selected) cs.primary else cs.surfaceContainerHigh, tween(Motion.COLOR_MS), label = "ThemeButtonDisc")
    val glyph by animateColorAsState(if (selected) cs.onPrimary else cs.onSurfaceVariant, tween(Motion.COLOR_MS), label = "ThemeButtonGlyph")
    Row(
        modifier
            .heightIn(min = 64.dp)
            .clip(LaluzShape.card)
            .background(cs.surfaceContainerLow)
            .border(if (selected) 2.dp else 1.dp, ring, LaluzShape.card)
            .selectable(selected = selected, role = Role.RadioButton, onClick = onSelect)
            .padding(start = Spacing.xs, end = Spacing.sm, top = Spacing.xs, bottom = Spacing.xs),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(Spacing.xs)
    ) {
        Box(
            Modifier
                .size(36.dp)
                .background(disc, CircleShape),
            contentAlignment = Alignment.Center
        ) {
            Icon(choice.icon(), null, Modifier.size(20.dp), tint = glyph)
        }
        Text(choice.label, style = LaluzType.labelStrong, color = cs.onSurface, modifier = Modifier.weight(1f))
        if (selected) {
            Box(
                Modifier
                    .size(20.dp)
                    .background(cs.primary, CircleShape),
                contentAlignment = Alignment.Center
            ) {
                Icon(LaluzIcons.CheckBold, null, Modifier.size(14.dp), tint = cs.onPrimary)
            }
        }
    }
}
