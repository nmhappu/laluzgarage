package dev.appu.laluzgarage.ui.settings

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ColumnScope
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.RowScope
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.imePadding
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.selection.selectable
import androidx.compose.foundation.selection.selectableGroup
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.SnackbarHost
import androidx.compose.material3.SnackbarHostState
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.semantics.heading
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import androidx.compose.ui.window.Dialog
import androidx.compose.ui.window.DialogProperties
import dev.appu.laluzgarage.ui.components.DialogScrim
import dev.appu.laluzgarage.ui.components.DialogTextButton
import dev.appu.laluzgarage.ui.components.LaluzIcons
import dev.appu.laluzgarage.ui.components.LaluzTopBar
import dev.appu.laluzgarage.ui.components.MaxContentWidth
import dev.appu.laluzgarage.ui.components.connectedRowShape
import dev.appu.laluzgarage.ui.theme.LaluzShape
import dev.appu.laluzgarage.ui.theme.Spacing

/** Settings top bar: 48dp back arrow, 20/28 title, optional trailing action. */
@Composable
internal fun SettingsTopBar(
    title: String,
    onBack: () -> Unit,
    trailing: (@Composable RowScope.() -> Unit)? = null
) {
    val cs = MaterialTheme.colorScheme
    LaluzTopBar(startPadding = Spacing.xxs) {
        IconButton(onClick = onBack, modifier = Modifier.size(48.dp)) {
            Icon(LaluzIcons.ArrowBackShort, contentDescription = "Back", tint = cs.onSurface)
        }
        Text(
            title,
            style = MaterialTheme.typography.titleLarge,
            color = cs.onSurface,
            modifier = Modifier
                .weight(1f)
                .semantics { heading() }
        )
        trailing?.invoke(this)
    }
}

/**
 * Settings page frame: top bar, a scrolling body capped at the phone-first width, an optional
 * pinned [bottomBar] and a snackbar for [message].
 */
@Composable
internal fun SettingsPage(
    title: String,
    onBack: () -> Unit,
    message: String?,
    onMessageShown: () -> Unit,
    trailing: (@Composable RowScope.() -> Unit)? = null,
    bottomBar: (@Composable () -> Unit)? = null,
    content: @Composable ColumnScope.() -> Unit
) {
    val cs = MaterialTheme.colorScheme
    val scroll = rememberScrollState()
    val snackbar = remember { SnackbarHostState() }
    LaunchedEffect(message) {
        if (message != null) {
            snackbar.showSnackbar(message)
            onMessageShown()
        }
    }
    Box(Modifier.fillMaxSize().background(cs.surface)) {
        // Edge-to-edge: adjustResize doesn't shrink the content, so pad for the keyboard here. This
        // consumes the nav-bar inset too, so the action bar sits right on top of the keyboard.
        Column(Modifier.fillMaxSize().imePadding()) {
            SettingsTopBar(title, onBack, trailing)
            Column(
                Modifier
                    .weight(1f)
                    .fillMaxWidth()
                    .verticalScroll(scroll),
                horizontalAlignment = Alignment.CenterHorizontally
            ) {
                Column(
                    Modifier
                        .widthIn(max = MaxContentWidth)
                        .fillMaxWidth()
                        .then(if (bottomBar == null) Modifier.navigationBarsPadding() else Modifier),
                    content = content
                )
            }
            bottomBar?.invoke()
        }
        SnackbarHost(
            snackbar,
            modifier = Modifier
                .align(Alignment.BottomCenter)
                .navigationBarsPadding()
                .padding(bottom = if (bottomBar != null) 96.dp else Spacing.md)
        )
    }
}

/** 40dp surfaceContainerHigh tile with a 24dp icon, Medium (12dp) shape. */
@Composable
internal fun SettingsIconTile(icon: ImageVector, tint: Color) {
    Box(
        Modifier
            .size(40.dp)
            .background(MaterialTheme.colorScheme.surfaceContainerHigh, LaluzShape.iconTile),
        contentAlignment = Alignment.Center
    ) {
        Icon(icon, contentDescription = null, tint = tint, modifier = Modifier.size(24.dp))
    }
}

/** Small 8dp-radius chip: [height] tall, 8dp padding, labelMedium. */
@Composable
internal fun SmallChip(
    text: String,
    container: Color,
    content: Color,
    height: Dp = 24.dp,
    style: TextStyle = MaterialTheme.typography.labelMedium
) {
    Box(
        Modifier
            .height(height)
            .background(container, LaluzShape.chip)
            .padding(horizontal = Spacing.xs),
        contentAlignment = Alignment.Center
    ) {
        Text(
            text,
            style = style,
            color = content,
            maxLines = 1
        )
    }
}

/**
 * Navigation row on surfaceContainerLow: 16dp padding, icon tile, title (+ optional chip) over a
 * supporting line, trailing chevron. [tint] colours the title, icon and chevron (error for Log out).
 */
@Composable
internal fun SettingsNavRow(
    icon: ImageVector,
    title: String,
    supporting: String,
    shape: RoundedCornerShape,
    onClick: () -> Unit,
    chip: String? = null,
    tint: Color = MaterialTheme.colorScheme.onSurface
) {
    val cs = MaterialTheme.colorScheme
    Surface(onClick = onClick, shape = shape, color = cs.surfaceContainerLow, contentColor = tint, modifier = Modifier.fillMaxWidth()) {
        Row(
            Modifier.padding(Spacing.md),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(Spacing.md)
        ) {
            SettingsIconTile(icon, tint)
            Column(Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(2.dp)) {
                Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(Spacing.xs)) {
                    Text(title, style = MaterialTheme.typography.titleMedium, color = tint)
                    if (chip != null) SmallChip(chip, cs.secondaryContainer, cs.onSecondaryContainer, height = 20.dp)
                }
                Text(supporting, style = MaterialTheme.typography.bodyMedium, color = cs.onSurfaceVariant)
            }
            Icon(
                LaluzIcons.ChevronRight,
                contentDescription = null,
                tint = if (tint == cs.onSurface) cs.onSurfaceVariant else tint,
                modifier = Modifier.size(24.dp)
            )
        }
    }
}

/**
 * Single-choice row (role, release channel): connected list shape, selected = secondaryContainer
 * with a filled check radio; unselected = surfaceContainerLow with a 2dp outline ring.
 */
@Composable
internal fun ChoiceRow(
    label: String,
    description: String,
    selected: Boolean,
    index: Int,
    count: Int,
    onClick: () -> Unit
) {
    val cs = MaterialTheme.colorScheme
    val container = if (selected) cs.secondaryContainer else cs.surfaceContainerLow
    val content = if (selected) cs.onSecondaryContainer else cs.onSurface
    Row(
        Modifier
            .fillMaxWidth()
            .background(container, connectedRowShape(index, count))
            .selectable(selected = selected, role = Role.RadioButton, onClick = onClick)
            .padding(Spacing.md),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(Spacing.md)
    ) {
        Column(Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(2.dp)) {
            Text(label, style = MaterialTheme.typography.titleMedium, color = content)
            Text(description, style = MaterialTheme.typography.bodyMedium, color = if (selected) cs.onSecondaryContainer else cs.onSurfaceVariant)
        }
        if (selected) {
            Box(Modifier.size(24.dp).background(cs.onSecondaryContainer, CircleShape), contentAlignment = Alignment.Center) {
                Icon(LaluzIcons.CheckHeavy, contentDescription = null, tint = cs.secondaryContainer, modifier = Modifier.size(16.dp))
            }
        } else {
            Box(Modifier.size(24.dp).border(2.dp, cs.outline, CircleShape))
        }
    }
}

/** Radio group wrapper: rows 2dp apart. */
@Composable
internal fun ChoiceGroup(modifier: Modifier = Modifier, content: @Composable ColumnScope.() -> Unit) {
    Column(modifier.selectableGroup(), verticalArrangement = Arrangement.spacedBy(2.dp), content = content)
}

/** 14/20 bold section heading in onSurfaceVariant with the artboard's 8dp inset. */
@Composable
internal fun SettingsSectionLabel(text: String, modifier: Modifier = Modifier, bold: Boolean = true) {
    Text(
        text,
        style = if (bold) MaterialTheme.typography.titleSmall else MaterialTheme.typography.labelLarge,
        color = MaterialTheme.colorScheme.onSurfaceVariant,
        modifier = modifier
            .padding(horizontal = Spacing.xs)
            .semantics { heading() }
    )
}

/** Two-line text block used inside list rows. */
@Composable
internal fun TwoLine(title: String, supporting: String, modifier: Modifier = Modifier, ellipsize: Boolean = true) {
    val cs = MaterialTheme.colorScheme
    Column(modifier) {
        Text(
            title,
            style = MaterialTheme.typography.titleMedium,
            color = cs.onSurface,
            maxLines = if (ellipsize) 1 else Int.MAX_VALUE,
            overflow = TextOverflow.Ellipsis
        )
        Text(
            supporting,
            style = MaterialTheme.typography.bodyMedium,
            color = cs.onSurfaceVariant,
            maxLines = if (ellipsize) 1 else Int.MAX_VALUE,
            overflow = TextOverflow.Ellipsis
        )
    }
}

/**
 * Settings confirmation dialog: surfaceContainerHigh, 28dp radius, 24/24/16/24 padding, 16dp gaps,
 * 24/32 title and 16/24 body; Cancel in primary, the destructive action in error. 16dp side margin.
 */
@Composable
internal fun SettingsDialog(
    title: String,
    body: String,
    confirmText: String,
    onConfirm: () -> Unit,
    onDismiss: () -> Unit
) {
    val cs = MaterialTheme.colorScheme
    Dialog(onDismissRequest = onDismiss, properties = DialogProperties(usePlatformDefaultWidth = false)) {
        DialogScrim()
        Box(Modifier.fillMaxWidth().padding(horizontal = Spacing.md), contentAlignment = Alignment.Center) {
            Column(
                Modifier
                    .widthIn(max = 560.dp)
                    .fillMaxWidth()
                    .background(cs.surfaceContainerHigh, LaluzShape.hero)
                    .padding(start = Spacing.xl, end = Spacing.xl, top = Spacing.xl, bottom = Spacing.md),
                verticalArrangement = Arrangement.spacedBy(Spacing.md)
            ) {
                Text(title, style = MaterialTheme.typography.headlineSmall, color = cs.onSurface, modifier = Modifier.semantics { heading() })
                Text(body, style = MaterialTheme.typography.bodyLarge, color = cs.onSurfaceVariant)
                Row(
                    Modifier
                        .fillMaxWidth()
                        .padding(top = Spacing.xs),
                    horizontalArrangement = Arrangement.spacedBy(Spacing.xs, Alignment.End)
                ) {
                    DialogTextButton("Cancel", cs.primary, onDismiss)
                    DialogTextButton(confirmText, cs.error, onConfirm)
                }
            }
        }
    }
}

/** Body padding used under every settings sub-page header. */
internal val SettingsBodyPadding = PaddingValues(start = Spacing.md, end = Spacing.md, top = Spacing.xs, bottom = Spacing.xxl)
