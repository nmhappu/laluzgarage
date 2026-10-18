package dev.appu.laluzgarage.ui.components

import androidx.compose.animation.core.animateDpAsState
import androidx.compose.animation.core.tween
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.selected
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.semantics.stateDescription
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import dev.appu.laluzgarage.ui.theme.Elevation
import dev.appu.laluzgarage.ui.theme.LaluzShape
import dev.appu.laluzgarage.ui.theme.Motion
import dev.appu.laluzgarage.ui.theme.Spacing

val RailCollapsedWidth = 96.dp
val RailExpandedWidth = 220.dp
private const val RailMotionMs = 250

/**
 * Tablet navigation rail (Tablet Design canvas): a menu button that collapses or expands it, the
 * FAB (extended when expanded), then the destinations. 96dp collapsed with labels under the icons,
 * 220dp expanded with a pill per destination. Settings is not a destination: the avatar opens it.
 */
@Composable
fun LaluzNavRail(
    items: List<ToolbarItem>,
    currentKey: String,
    onSelect: (String) -> Unit,
    expanded: Boolean,
    onToggleExpanded: () -> Unit,
    fabLabel: String,
    onFab: () -> Unit,
    modifier: Modifier = Modifier
) {
    val cs = MaterialTheme.colorScheme
    val width by animateDpAsState(
        if (expanded) RailExpandedWidth else RailCollapsedWidth,
        tween(RailMotionMs, easing = Motion.emphasized),
        label = "railWidth"
    )
    Column(
        modifier = modifier
            .width(width)
            .fillMaxHeight()
            .background(cs.surfaceContainerLow)
            .statusBarsPadding()
            .navigationBarsPadding()
            .padding(vertical = Spacing.xl),
        horizontalAlignment = if (expanded) Alignment.Start else Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.spacedBy(Spacing.xxs)
    ) {
        IconButton(
            onClick = onToggleExpanded,
            modifier = Modifier
                .padding(start = if (expanded) Spacing.sm + Spacing.xxs else 0.dp, bottom = Spacing.xs)
                .size(48.dp)
                .semantics {
                    contentDescription = if (expanded) "Collapse navigation rail" else "Expand navigation rail"
                    stateDescription = if (expanded) "Expanded" else "Collapsed"
                }
        ) {
            Icon(if (expanded) LaluzIcons.MenuOpen else LaluzIcons.Menu, contentDescription = null, tint = cs.onSurface)
        }
        RailFab(expanded = expanded, label = fabLabel, onClick = onFab)
        Box(Modifier.height(Spacing.xs))
        items.forEach { item ->
            RailItem(item = item, active = item.key == currentKey, expanded = expanded, onClick = { onSelect(item.key) })
        }
    }
}

@Composable
private fun RailFab(expanded: Boolean, label: String, onClick: () -> Unit) {
    val cs = MaterialTheme.colorScheme
    Surface(
        onClick = onClick,
        shape = LaluzShape.fab,
        color = cs.primary,
        contentColor = cs.onPrimary,
        shadowElevation = Elevation.level3,
        modifier = Modifier
            .padding(start = if (expanded) Spacing.sm else 0.dp, bottom = Spacing.xs)
            .height(56.dp)
            .semantics { contentDescription = label }
    ) {
        Row(
            Modifier.padding(horizontal = 16.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(Spacing.sm)
        ) {
            Icon(LaluzIcons.Plus, contentDescription = null, modifier = Modifier.size(24.dp))
            if (expanded) Text(label, style = MaterialTheme.typography.labelLarge, maxLines = 1, overflow = TextOverflow.Clip)
        }
    }
}

@Composable
private fun RailItem(item: ToolbarItem, active: Boolean, expanded: Boolean, onClick: () -> Unit) {
    val cs = MaterialTheme.colorScheme
    val tint = if (active) cs.onSecondaryContainer else cs.onSurfaceVariant
    val pill = if (active) cs.secondaryContainer else Color.Transparent
    val semanticsMod = Modifier.semantics {
        contentDescription = item.label
        selected = active
    }
    if (expanded) {
        Row(
            modifier = Modifier
                .padding(horizontal = Spacing.sm)
                .fillMaxWidth()
                .height(56.dp)
                .clip(CircleShape)
                .background(pill)
                .clickable(role = Role.Tab, onClick = onClick)
                .then(semanticsMod)
                .padding(horizontal = Spacing.md),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(Spacing.sm)
        ) {
            Icon(item.icon, contentDescription = null, tint = tint, modifier = Modifier.size(24.dp))
            Text(item.label, style = MaterialTheme.typography.labelLarge, color = tint, maxLines = 1)
        }
    } else {
        Column(
            modifier = Modifier
                .width(80.dp)
                .clip(LaluzShape.card)
                .clickable(role = Role.Tab, onClick = onClick)
                .then(semanticsMod)
                .padding(vertical = Spacing.xxs),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.spacedBy(Spacing.xxs)
        ) {
            Box(Modifier.size(width = 56.dp, height = 32.dp).clip(CircleShape).background(pill), contentAlignment = Alignment.Center) {
                Icon(item.icon, contentDescription = null, tint = tint, modifier = Modifier.size(24.dp))
            }
            Text(item.label, style = MaterialTheme.typography.labelMedium, color = if (active) cs.onSurface else cs.onSurfaceVariant, maxLines = 1)
        }
    }
}
