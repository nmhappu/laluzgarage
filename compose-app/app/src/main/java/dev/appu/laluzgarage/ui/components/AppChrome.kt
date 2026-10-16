package dev.appu.laluzgarage.ui.components

import androidx.compose.animation.animateColorAsState
import androidx.compose.animation.core.animateDpAsState
import androidx.compose.animation.core.tween
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.BoxWithConstraints
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.RowScope
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material3.DropdownMenu
import androidx.compose.material3.DropdownMenuItem
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.FloatingActionButton
import androidx.compose.material3.FloatingActionButtonDefaults
import androidx.compose.material3.FloatingToolbarDefaults
import androidx.compose.material3.HorizontalFloatingToolbar
import androidx.compose.material3.TooltipAnchorPosition
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.PlainTooltip
import androidx.compose.material3.Text
import androidx.compose.material3.TooltipBox
import androidx.compose.material3.TooltipDefaults
import androidx.compose.material3.rememberTooltipState
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.drawBehind
import androidx.compose.ui.layout.layout
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.selected
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.unit.dp
import dev.appu.laluzgarage.ui.theme.Elevation
import dev.appu.laluzgarage.ui.theme.LaluzShape
import dev.appu.laluzgarage.ui.theme.LaluzType
import dev.appu.laluzgarage.ui.theme.Motion
import dev.appu.laluzgarage.ui.theme.Spacing
import dev.appu.laluzgarage.ui.theme.ThemeMode

/** Phone-first layouts are capped at this width and centred on tablets. */
val MaxContentWidth = 640.dp

private val WhitespaceRegex = Regex("\\s+")

fun initialsOf(name: String): String {
    val parts = name.trim().split(WhitespaceRegex).filter { it.isNotEmpty() }
    return when {
        parts.isEmpty() -> "?"
        parts.size == 1 -> parts[0].take(2).uppercase()
        else -> "${parts.first().first()}${parts.last().first()}".uppercase()
    }
}

/**
 * Small top app bar: 64dp row (16dp start / 8dp end padding) under the status bar, always on the
 * surface colour. [scrolled] is kept for call-site compatibility and no longer changes the colour.
 */
@Composable
fun LaluzTopBar(
    modifier: Modifier = Modifier,
    scrolled: Boolean = false,
    startPadding: androidx.compose.ui.unit.Dp = Spacing.md,
    // The app background (surface) by default; it does not tint on scroll. Transparent over a glow.
    container: Color = MaterialTheme.colorScheme.surface,
    content: @Composable RowScope.() -> Unit
) {
    Row(
        modifier = modifier
            .fillMaxWidth()
            .drawBehind { drawRect(container) }
            .statusBarsPadding()
            .height(64.dp)
            .padding(start = startPadding, end = Spacing.xs),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(Spacing.xs),
        content = content
    )
}

/** What the top-bar avatar shows and does: the operator, their role ring and opening Settings. */
data class AccountActions(
    val operatorName: String,
    val themeMode: ThemeMode,
    val onThemeModeChange: (ThemeMode) -> Unit,
    val onSwitchOperator: () -> Unit,
    val onSignOut: () -> Unit,
    val onOpenSettings: () -> Unit = {},
    val photoUrl: String? = null,
    val isAdmin: Boolean = false
)

/**
 * 48dp avatar action: a 40dp avatar with a 2dp role ring (error red for admins, tertiary blue for
 * everyone else) and 2dp gap: the account photo, or initials on tertiaryContainer when there is
 * none. Opens Settings.
 */
@Composable
fun OperatorAvatarButton(actions: AccountActions, modifier: Modifier = Modifier) {
    val ring = roleRingColor(actions.isAdmin)
    Box(
        modifier = modifier
            .size(48.dp)
            .clip(CircleShape)
            .clickable(role = Role.Button, onClick = actions.onOpenSettings)
            .semantics { contentDescription = "${actions.operatorName}: open settings" },
        contentAlignment = Alignment.Center
    ) {
        Box(
            modifier = Modifier
                .size(40.dp)
                .border(2.dp, ring, CircleShape)
                .padding(4.dp)
                .clip(CircleShape)
                .background(MaterialTheme.colorScheme.tertiaryContainer),
            contentAlignment = Alignment.Center
        ) {
            Text(
                initialsOf(actions.operatorName),
                style = LaluzType.labelTiny,
                color = MaterialTheme.colorScheme.onTertiaryContainer
            )
            ProfilePhoto(actions.photoUrl, Modifier.matchParentSize())
        }
    }
}

/** Avatar ring colour by role: red for admins, blue for technicians and assistants. */
@Composable
fun roleRingColor(isAdmin: Boolean): Color =
    if (isAdmin) MaterialTheme.colorScheme.error else MaterialTheme.colorScheme.tertiary

/** 48dp icon button in onSurfaceVariant (top-bar search). */
@Composable
fun BarIconButton(icon: ImageVector, contentDescription: String, onClick: () -> Unit) {
    IconButton(onClick = onClick, modifier = Modifier.size(48.dp)) {
        Icon(icon, contentDescription = contentDescription, tint = MaterialTheme.colorScheme.onSurfaceVariant)
    }
}

private const val ToolbarMotionMs = 350

data class ToolbarItem(val key: String, val label: String, val icon: ImageVector)

/**
 * M3 Expressive [HorizontalFloatingToolbar] with a FAB, as drawn on the artboards:
 * 64dp full-shape toolbar on surfaceContainer with a level-3 shadow, 16dp side margins and 24dp
 * above the bottom edge, stretched to fill the row. Four 48dp icon items; the current one is a
 * 56×48dp secondaryContainer pill. When [expanded] is false the toolbar collapses and only the
 * FAB stays (drive it with FloatingToolbarDefaults.floatingToolbarVerticalNestedScroll).
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun FloatingNavToolbar(
    items: List<ToolbarItem>,
    currentKey: String,
    onSelect: (String) -> Unit,
    fabContentDescription: String,
    onFabClick: () -> Unit,
    modifier: Modifier = Modifier,
    expanded: Boolean = true
) {
    val cs = MaterialTheme.colorScheme
    // The library lays the toolbar out in an 80dp-tall slot (the largest FAB size) and centres the
    // 64dp toolbar in it, so 8dp less bottom margin puts the toolbar 24dp above the edge.
    val slotInset = (80.dp - FloatingToolbarDefaults.ContainerSize) / 2
    BoxWithConstraints(
        modifier = modifier
            .widthIn(max = MaxContentWidth)
            .fillMaxWidth()
            .navigationBarsPadding()
            .padding(start = Spacing.md, end = Spacing.md, bottom = Spacing.xl - slotInset)
    ) {
        val fabSize = 56.dp
        val toolbarPadding = Spacing.sm
        val itemsWidth = (maxWidth - fabSize - Spacing.xs - toolbarPadding * 2).coerceAtLeast(0.dp)
        HorizontalFloatingToolbar(
            expanded = expanded,
            modifier = Modifier.align(Alignment.CenterEnd),
            colors = FloatingToolbarDefaults.standardFloatingToolbarColors(
                toolbarContainerColor = cs.surfaceContainer,
                toolbarContentColor = cs.onSurfaceVariant,
                fabContainerColor = cs.primary,
                fabContentColor = cs.onPrimary
            ),
            contentPadding = PaddingValues(horizontal = toolbarPadding),
            expandedShadowElevation = Elevation.level3,
            // The default expressive spring finishes in ~100ms and overshoots, so the FAB bounces and
            // a sliver of the pill pokes out behind it. A longer, non-bouncy emphasized curve reads cleanly.
            animationSpec = tween(ToolbarMotionMs, easing = Motion.emphasized),
            floatingActionButton = {
                FloatingActionButton(
                    onClick = onFabClick,
                    shape = LaluzShape.fab,
                    containerColor = cs.primary,
                    contentColor = cs.onPrimary,
                    elevation = FloatingActionButtonDefaults.elevation(
                        defaultElevation = Elevation.level3,
                        pressedElevation = Elevation.level3,
                        focusedElevation = Elevation.level3,
                        hoveredElevation = Elevation.level3
                    ),
                    modifier = Modifier
                        .fillMaxSize()
                        .semantics { contentDescription = fabContentDescription }
                ) {
                    Icon(LaluzIcons.Plus, contentDescription = null, modifier = Modifier.size(24.dp))
                }
            }
        ) {
            Row(
                modifier = Modifier.width(itemsWidth),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                items.forEach { item ->
                    ToolbarNavItem(item = item, active = item.key == currentKey, onClick = { onSelect(item.key) })
                }
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun ToolbarNavItem(item: ToolbarItem, active: Boolean, onClick: () -> Unit) {
    // Read in the layout phase below so the width animation only re-measures this item.
    val width = animateDpAsState(
        if (active) 56.dp else 48.dp,
        MaterialTheme.motionScheme.fastSpatialSpec(),
        label = "navWidth"
    )
    // No visible labels, so every item gets a tooltip and a content description.
    TooltipBox(
        positionProvider = TooltipDefaults.rememberTooltipPositionProvider(TooltipAnchorPosition.Above),
        tooltip = { PlainTooltip { Text(item.label) } },
        state = rememberTooltipState()
    ) {
        Box(
            modifier = Modifier
                .layout { measurable, constraints ->
                    val w = width.value.roundToPx()
                    val placeable = measurable.measure(constraints.copy(minWidth = w, maxWidth = w))
                    layout(placeable.width, placeable.height) { placeable.place(0, 0) }
                }
                .height(48.dp)
                .clip(CircleShape)
                .background(if (active) MaterialTheme.colorScheme.secondaryContainer else Color.Transparent)
                .clickable(role = Role.Tab, onClick = onClick)
                .semantics {
                    contentDescription = item.label
                    selected = active
                },
            contentAlignment = Alignment.Center
        ) {
            Icon(
                item.icon,
                contentDescription = null,
                tint = if (active) MaterialTheme.colorScheme.onSecondaryContainer else MaterialTheme.colorScheme.onSurfaceVariant,
                modifier = Modifier.size(24.dp)
            )
        }
    }
}
