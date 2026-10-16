package dev.appu.laluzgarage.ui.auth

import androidx.activity.compose.BackHandler
import androidx.compose.animation.AnimatedContent
import androidx.compose.animation.core.tween
import androidx.compose.animation.slideInHorizontally
import androidx.compose.animation.slideOutHorizontally
import androidx.compose.animation.togetherWith
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.BoxWithConstraints
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.imePadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.safeDrawingPadding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.IconButtonDefaults
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.drawBehind
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalUriHandler
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.semantics.heading
import androidx.compose.ui.semantics.liveRegion
import androidx.compose.ui.semantics.LiveRegionMode
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.semantics.stateDescription
import androidx.compose.ui.text.SpanStyle
import androidx.compose.ui.text.buildAnnotatedString
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.text.input.VisualTransformation
import androidx.compose.ui.text.withStyle
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import dev.appu.laluzgarage.ui.components.LaluzFilledField
import dev.appu.laluzgarage.ui.components.LaluzIcons
import dev.appu.laluzgarage.ui.components.LaluzLogo
import dev.appu.laluzgarage.ui.components.TonalRowButton
import dev.appu.laluzgarage.ui.theme.Spacing
import kotlin.math.hypot
import kotlin.math.max

private const val LICENSE_URL = "https://github.com/nmhappu/laluzgarage/blob/master/LICENSE"

/**
 * Soft radial glow behind auth screens: circle at ([cx], [cy]) fading to transparent at 55% of the
 * farthest-corner radius, matching the artboard's CSS radial-gradient.
 */
fun Modifier.authGlow(color: Color, cx: Float, cy: Float): Modifier = drawBehind {
    val center = Offset(size.width * cx, size.height * cy)
    val farthest = max(
        max(hypot(center.x, center.y), hypot(size.width - center.x, center.y)),
        max(hypot(center.x, size.height - center.y), hypot(size.width - center.x, size.height - center.y))
    )
    drawRect(
        Brush.radialGradient(
            0f to color,
            0.55f to Color.Transparent,
            center = center,
            radius = farthest
        )
    )
}

@Composable
fun LoginScreen(
    state: AuthUiState,
    isDarkTheme: Boolean,
    onEmailChange: (String) -> Unit,
    onPasswordChange: (String) -> Unit,
    onTogglePasswordVisibility: () -> Unit,
    onSetAuthMethod: (AuthMethod) -> Unit,
    onSignIn: () -> Unit,
    onGoogleSignIn: (android.content.Context) -> Unit,
    onToggleTheme: () -> Unit
) {
    val isMail = state.authMethod == AuthMethod.EMAIL
    BackHandler(enabled = isMail) { onSetAuthMethod(AuthMethod.IDLE) }
    val glow = MaterialTheme.colorScheme.primary.copy(alpha = if (isDarkTheme) 0.10f else 0.07f)

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(MaterialTheme.colorScheme.surface)
            .authGlow(glow, 0.20f, 0.38f)
            .safeDrawingPadding()
    ) {
        AnimatedContent(
            targetState = isMail,
            transitionSpec = {
                val fwd = targetState
                val spec = tween<androidx.compose.ui.unit.IntOffset>(300, easing = dev.appu.laluzgarage.ui.theme.Motion.emphasized)
                (slideInHorizontally(spec) { if (fwd) it else -it / 4 } togetherWith
                    slideOutHorizontally(spec) { if (fwd) -it / 4 else it } using null)
                    .apply { targetContentZIndex = if (fwd) 1f else -1f }
            },
            label = "loginView"
        ) { mail ->
            if (mail) {
                MailView(
                    state = state,
                    onBack = { onSetAuthMethod(AuthMethod.IDLE) },
                    onEmailChange = onEmailChange,
                    onPasswordChange = onPasswordChange,
                    onTogglePasswordVisibility = onTogglePasswordVisibility,
                    onSignIn = onSignIn
                )
            } else {
                StartView(
                    state = state,
                    isDarkTheme = isDarkTheme,
                    onToggleTheme = onToggleTheme,
                    onGoogleSignIn = onGoogleSignIn,
                    onMail = { onSetAuthMethod(AuthMethod.EMAIL) }
                )
            }
        }
    }
}

@Composable
private fun StartView(
    state: AuthUiState,
    isDarkTheme: Boolean,
    onToggleTheme: () -> Unit,
    onGoogleSignIn: (android.content.Context) -> Unit,
    onMail: () -> Unit
) {
    val context = LocalContext.current
    val cs = MaterialTheme.colorScheme
    Column(Modifier.fillMaxSize()) {
        // Header: brand + theme toggle
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .height(64.dp)
                .padding(start = Spacing.md, end = Spacing.xs),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(Spacing.xs)
        ) {
            Text(
                "LaluZ Garage",
                style = MaterialTheme.typography.bodyLarge.copy(fontWeight = FontWeight.Bold),
                color = cs.onSurface,
                modifier = Modifier.padding(start = 6.dp)
            )
            Spacer(Modifier.weight(1f))
            IconButton(
                onClick = onToggleTheme,
                modifier = Modifier.size(48.dp),
                colors = IconButtonDefaults.iconButtonColors(
                    containerColor = cs.surfaceContainerHigh,
                    contentColor = cs.onSurface
                )
            ) {
                Icon(
                    if (isDarkTheme) LaluzIcons.Moon else LaluzIcons.Sun,
                    contentDescription = if (isDarkTheme) "Switch to light theme" else "Switch to dark theme"
                )
            }
        }

        // Fills the viewport (3:4 spacers around the content) and scrolls when it can't fit.
        BoxWithConstraints(Modifier.weight(1f).fillMaxWidth()) {
        val viewport = maxHeight
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .verticalScroll(rememberScrollState())
                .heightIn(min = viewport)
        ) {
            Spacer(Modifier.weight(3f))
            Column(Modifier.padding(horizontal = Spacing.xl).widthIn(max = 560.dp)) {
                LaluzLogo()
                Text(
                    "Welcome to LaluZ Garage",
                    style = MaterialTheme.typography.headlineSmall.copy(lineHeight = 36.sp),
                    color = cs.onSurface,
                    modifier = Modifier
                        .padding(top = Spacing.xxl)
                        .semantics { heading() }
                )
                Text(
                    "Sign in to manage vehicle records and inventory.\nInternal use only.",
                    style = MaterialTheme.typography.bodyMedium.copy(lineHeight = 24.sp),
                    color = cs.onSurfaceVariant,
                    modifier = Modifier.padding(top = Spacing.xs)
                )
            }
            Column(
                modifier = Modifier
                    .padding(start = Spacing.xl, end = Spacing.xl, top = Spacing.xxl)
                    .widthIn(max = 560.dp),
                verticalArrangement = Arrangement.spacedBy(Spacing.sm)
            ) {
                TonalRowButton(
                    text = "Continue with Google",
                    onClick = { onGoogleSignIn(context) },
                    loading = state.isGoogleAuthenticating,
                    enabled = !state.isAuthenticating,
                    leading = {
                        Box(
                            modifier = Modifier
                                .size(24.dp)
                                .clip(CircleShape)
                                .background(Color.White),
                            contentAlignment = Alignment.Center
                        ) {
                            Icon(LaluzIcons.GoogleG, contentDescription = null, tint = Color.Unspecified, modifier = Modifier.size(14.dp))
                        }
                    }
                )
                TonalRowButton(
                    text = "Continue with mail",
                    onClick = onMail,
                    enabled = !state.isGoogleAuthenticating,
                    leading = { Icon(LaluzIcons.Mail, contentDescription = null, modifier = Modifier.size(24.dp)) }
                )
                if (state.errorMessage != null) {
                    Text(
                        state.errorMessage,
                        style = MaterialTheme.typography.bodyMedium,
                        color = cs.error,
                        modifier = Modifier
                            .padding(horizontal = Spacing.md)
                            .semantics { liveRegion = LiveRegionMode.Polite }
                    )
                }
            }
            Spacer(Modifier.weight(4f))
        }
        }

        LoginFooter()
    }
}

@Composable
private fun LoginFooter() {
    val cs = MaterialTheme.colorScheme
    val uriHandler = LocalUriHandler.current
    val caption = MaterialTheme.typography.bodySmall
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .padding(start = Spacing.xl, end = Spacing.xl, bottom = Spacing.sm),
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(6.dp)) {
            Text("Created with", style = caption, color = cs.onSurfaceVariant)
            Icon(LaluzIcons.Heart, contentDescription = "love", tint = cs.error, modifier = Modifier.size(14.dp))
            Text(
                buildAnnotatedString {
                    append("by ")
                    withStyle(SpanStyle(fontWeight = FontWeight.SemiBold, color = cs.onSurface)) { append("Prince Santhosh") }
                },
                style = caption,
                color = cs.onSurfaceVariant
            )
        }
        Row(verticalAlignment = Alignment.CenterVertically) {
            Text("© 2026 LaluZ Garage · ", style = caption, color = cs.onSurfaceVariant)
            // 16dp tall line, with a padded 40dp tap area that does not shift layout (like the artboard's negative margins).
            Box(Modifier.height(16.dp), contentAlignment = Alignment.Center) {
                Text(
                    "License",
                    style = caption.copy(fontWeight = FontWeight.SemiBold),
                    color = cs.onSurface,
                    modifier = Modifier
                        .clip(CircleShape)
                        .clickable(role = Role.Button, onClickLabel = "Open license") { uriHandler.openUri(LICENSE_URL) }
                )
            }
        }
    }
}

@Composable
private fun MailView(
    state: AuthUiState,
    onBack: () -> Unit,
    onEmailChange: (String) -> Unit,
    onPasswordChange: (String) -> Unit,
    onTogglePasswordVisibility: () -> Unit,
    onSignIn: () -> Unit
) {
    val cs = MaterialTheme.colorScheme
    Column(
        Modifier
            .fillMaxSize()
            .imePadding()
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .height(64.dp)
                .padding(start = Spacing.xs, end = Spacing.xs),
            verticalAlignment = Alignment.CenterVertically
        ) {
            IconButton(onClick = onBack, modifier = Modifier.size(48.dp)) {
                Icon(LaluzIcons.ArrowBack, contentDescription = "Back", tint = cs.onSurface)
            }
        }
        Column(
            modifier = Modifier
                .weight(1f)
                .verticalScroll(rememberScrollState())
                .padding(horizontal = Spacing.xl)
                .widthIn(max = 560.dp)
        ) {
            Column(Modifier.padding(top = Spacing.xs), verticalArrangement = Arrangement.spacedBy(Spacing.xs)) {
                Text(
                    "Sign in with mail",
                    style = MaterialTheme.typography.headlineMedium,
                    color = cs.onSurface,
                    modifier = Modifier.semantics { heading() }
                )
                Text(
                    "Use the email and password for your account.",
                    style = MaterialTheme.typography.bodyLarge,
                    color = cs.onSurfaceVariant
                )
            }
            Column(Modifier.padding(top = Spacing.xl), verticalArrangement = Arrangement.spacedBy(Spacing.md)) {
                LaluzFilledField(
                    value = state.email,
                    onValueChange = onEmailChange,
                    label = "Email",
                    placeholder = "name@example.com",
                    keyboardType = KeyboardType.Email,
                    isError = state.emailError != null,
                    supportingText = state.emailError
                )
                LaluzFilledField(
                    value = state.password,
                    onValueChange = onPasswordChange,
                    label = "Password",
                    placeholder = "Password",
                    keyboardType = KeyboardType.Password,
                    imeAction = ImeAction.Done,
                    keyboardActions = KeyboardActions(onDone = { onSignIn() }),
                    visualTransformation = if (state.isPasswordVisible) VisualTransformation.None else PasswordVisualTransformation(),
                    isError = state.passwordError != null,
                    supportingText = state.passwordError,
                    trailing = {
                        IconButton(
                            onClick = onTogglePasswordVisibility,
                            modifier = Modifier
                                .size(48.dp)
                                .semantics { stateDescription = if (state.isPasswordVisible) "Shown" else "Hidden" }
                        ) {
                            Icon(
                                if (state.isPasswordVisible) LaluzIcons.EyeOff else LaluzIcons.Eye,
                                contentDescription = if (state.isPasswordVisible) "Hide password" else "Show password",
                                tint = cs.onSurfaceVariant
                            )
                        }
                    }
                )
            }
            if (state.errorMessage != null) {
                Text(
                    state.errorMessage,
                    style = MaterialTheme.typography.bodyMedium,
                    color = cs.error,
                    modifier = Modifier
                        .padding(top = Spacing.md, start = Spacing.md, end = Spacing.md)
                        .semantics { liveRegion = LiveRegionMode.Polite }
                )
            }
            TonalRowButton(
                text = "Sign in",
                onClick = onSignIn,
                loading = state.isAuthenticating,
                modifier = Modifier.padding(top = Spacing.xl, bottom = Spacing.xl)
            )
        }
    }
}
