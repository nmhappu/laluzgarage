package dev.appu.laluzgarage.ui.layout

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.RowScope
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.semantics.heading
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import dev.appu.laluzgarage.data.sync.SyncUiState
import dev.appu.laluzgarage.ui.components.AccountActions
import dev.appu.laluzgarage.ui.components.LaluzSearchField
import dev.appu.laluzgarage.ui.components.LaluzSyncTopBar
import dev.appu.laluzgarage.ui.components.OperatorAvatarButton
import dev.appu.laluzgarage.ui.components.syncTitleAlpha
import dev.appu.laluzgarage.ui.theme.Radius
import dev.appu.laluzgarage.ui.theme.Spacing

/**
 * Tablet top bar: its own 96dp row on the plain surface, outside the content card. Title and count,
 * the search pill, any page [actions], then the avatar, which opens Settings.
 */
@Composable
fun TabletTopBar(
    title: String,
    summary: String,
    sync: SyncUiState,
    account: AccountActions,
    modifier: Modifier = Modifier,
    query: String? = null,
    onQueryChange: (String) -> Unit = {},
    placeholder: String = "",
    actions: @Composable RowScope.() -> Unit = {}
) {
    val cs = MaterialTheme.colorScheme
    LaluzSyncTopBar(sync = sync, modifier = modifier, height = 96.dp, startPadding = Spacing.xl) {
        Column(
            Modifier.weight(1f).alpha(syncTitleAlpha(sync)),
            verticalArrangement = Arrangement.spacedBy(Spacing.xxs)
        ) {
            Text(
                title,
                style = MaterialTheme.typography.displaySmall,
                color = cs.onSurface,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis,
                modifier = Modifier.semantics { heading() }
            )
            Text(summary, style = MaterialTheme.typography.bodyMedium, color = cs.onSurfaceVariant, maxLines = 1, overflow = TextOverflow.Ellipsis)
        }
        if (query != null) {
            LaluzSearchField(
                value = query,
                onValueChange = onQueryChange,
                placeholder = placeholder,
                onClear = { onQueryChange("") },
                modifier = Modifier.weight(1f).widthIn(max = 400.dp)
            )
        }
        actions()
        OperatorAvatarButton(account)
    }
}

/**
 * The card every tablet list sits in: surfaceContainerLow, 28dp radius, 24dp from the rail and the
 * bottom and right edges. Items inside use surfaceContainer, so the card reads as a surface.
 */
@Composable
fun TabletContentCard(modifier: Modifier = Modifier, content: @Composable () -> Unit) {
    Surface(
        shape = RoundedCornerShape(Radius.xxl),
        color = MaterialTheme.colorScheme.surfaceContainerLow,
        modifier = modifier
            .fillMaxSize()
            .sheetInsetPadding()
            .padding(start = Spacing.xl, end = Spacing.xl, bottom = Spacing.xl),
        content = content
    )
}
