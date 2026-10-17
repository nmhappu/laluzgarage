package dev.appu.laluzgarage.ui.auth

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.BoxWithConstraints
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.safeDrawingPadding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.heading
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import com.google.firebase.Timestamp
import dev.appu.laluzgarage.ui.components.ChipTone
import dev.appu.laluzgarage.ui.components.DetailField
import dev.appu.laluzgarage.ui.components.LaluzIcons
import dev.appu.laluzgarage.ui.components.StatusChip
import dev.appu.laluzgarage.ui.components.TonalRowButton
import dev.appu.laluzgarage.ui.components.initialsOf
import dev.appu.laluzgarage.ui.components.ProfilePhoto
import dev.appu.laluzgarage.ui.components.SpinningCookieBadge
import dev.appu.laluzgarage.ui.theme.LaluzShape
import dev.appu.laluzgarage.ui.theme.LaluzTheme
import dev.appu.laluzgarage.ui.theme.LaluzType
import dev.appu.laluzgarage.ui.theme.Spacing
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

private val WarningGlowBase = Color(0xFFFFD60A)

@Composable
fun PendingApprovalScreen(
    state: AuthUiState,
    isDarkTheme: Boolean,
    onSignOut: () -> Unit
) {
    val cs = MaterialTheme.colorScheme
    val ext = LaluzTheme.extendedColors
    val user = state.user
    val name = state.profile?.name?.ifEmpty { null } ?: user?.displayName?.ifEmpty { null }
        ?: user?.email?.substringBefore("@") ?: "Team member"
    val email = user?.email ?: state.profile?.email.orEmpty()
    val provider = if (user?.providerData?.any { it.providerId == "google.com" } == true) "Google" else "Email"
    val requested = remember(state.profile?.createdAt, user?.metadata?.creationTimestamp) {
        val millis = (state.profile?.createdAt as? Timestamp)?.toDate()?.time
            ?: user?.metadata?.creationTimestamp
        millis?.let { SimpleDateFormat("EEE, d MMM", Locale.ENGLISH).format(Date(it)) } ?: "Today"
    }

    BoxWithConstraints(
        modifier = Modifier
            .fillMaxSize()
            .background(cs.surface)
            .authGlow(WarningGlowBase.copy(alpha = if (isDarkTheme) 0.10f else 0.14f), 0.22f, 0.16f)
            .safeDrawingPadding()
    ) {
        val viewport = maxHeight
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .verticalScroll(rememberScrollState())
                .heightIn(min = viewport)
                .padding(start = Spacing.xl, end = Spacing.xl, top = 72.dp, bottom = Spacing.xl)
                .widthIn(max = 560.dp)
        ) {
            SpinningCookieBadge(LaluzIcons.Clock, container = ext.warningContainer, content = ext.onWarningContainer)
            Text(
                "Waiting for approval",
                style = MaterialTheme.typography.headlineMedium,
                color = cs.onSurface,
                modifier = Modifier
                    .padding(top = Spacing.xxl)
                    .semantics { heading() }
            )
            Text(
                "An admin needs to approve your account before you can use LaluZ Garage.",
                style = MaterialTheme.typography.bodyLarge,
                color = cs.onSurfaceVariant,
                modifier = Modifier.padding(top = Spacing.sm)
            )

            Column(
                modifier = Modifier
                    .padding(top = Spacing.xxl)
                    .fillMaxWidth()
                    .clip(LaluzShape.card)
                    .background(cs.surfaceContainerLow)
                    .padding(Spacing.md)
                    .semantics { contentDescription = "Account waiting for approval" },
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
                        Text(initialsOf(name), style = LaluzType.labelTiny, color = cs.onTertiaryContainer)
                        ProfilePhoto(
                            state.profile?.photoURL?.ifBlank { null } ?: user?.photoUrl?.toString(),
                            Modifier.matchParentSize()
                        )
                    }
                    Column(Modifier.weight(1f)) {
                        Text(name, style = MaterialTheme.typography.titleMedium, color = cs.onSurface, maxLines = 1, overflow = TextOverflow.Ellipsis)
                        Text(email, style = MaterialTheme.typography.bodyMedium, color = cs.onSurfaceVariant, maxLines = 1, overflow = TextOverflow.Ellipsis)
                    }
                    StatusChip("Pending", ChipTone.PENDING)
                }
                HorizontalDivider(thickness = 1.dp, color = cs.outlineVariant)
                Row(horizontalArrangement = Arrangement.spacedBy(Spacing.md)) {
                    DetailField("Signed in with", value = provider, modifier = Modifier.weight(1f))
                    DetailField("Requested", value = requested, modifier = Modifier.weight(1f))
                }
            }

            Spacer(Modifier.weight(1f).heightIn(min = Spacing.xl))
            TonalRowButton(text = "Sign out", onClick = onSignOut)
        }
    }
}
