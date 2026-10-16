package dev.appu.laluzgarage.ui.intake

import androidx.activity.compose.BackHandler
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.interaction.collectIsFocusedAsState
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.BoxWithConstraints
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ColumnScope
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.imePadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.text.BasicTextField
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.focus.FocusRequester
import androidx.compose.ui.focus.focusRequester
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.SolidColor
import androidx.compose.ui.graphics.luminance
import androidx.compose.ui.semantics.LiveRegionMode
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.heading
import androidx.compose.ui.semantics.liveRegion
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import dev.appu.laluzgarage.data.model.WorkshopUser
import dev.appu.laluzgarage.ui.auth.authGlow
import dev.appu.laluzgarage.ui.components.BottomActionBar
import dev.appu.laluzgarage.ui.components.DetailTopBar
import dev.appu.laluzgarage.ui.components.LaluzIcons
import dev.appu.laluzgarage.ui.components.MaxContentWidth
import dev.appu.laluzgarage.ui.components.OutlinedPillButton
import dev.appu.laluzgarage.ui.components.PillButton
import dev.appu.laluzgarage.ui.theme.LaluzShape
import dev.appu.laluzgarage.ui.theme.LaluzType
import dev.appu.laluzgarage.ui.theme.Spacing

/**
 * Tertiary glow behind the advisor PIN view: 12% (dark) / 10% (light) at 22% across and 24%
 * down, fading out by 55% of the farthest-corner radius.
 */
@Composable
fun Modifier.advisorPinGlow(): Modifier {
    val cs = MaterialTheme.colorScheme
    val dark = cs.surface.luminance() < 0.5f
    return authGlow(cs.tertiary.copy(alpha = if (dark) 0.12f else 0.10f), 0.22f, 0.24f)
}

/**
 * Standalone advisor verification (Switch operator): same view as the intake's first step.
 * Verifies against the advisor's own PIN, or the workshop default.
 */
@Composable
fun AdvisorPinScreen(
    title: String,
    description: String,
    advisor: WorkshopUser?,
    onCancel: () -> Unit,
    onVerified: (WorkshopUser?) -> Unit
) {
    var pin by rememberSaveable { mutableStateOf("") }
    var wrong by rememberSaveable { mutableStateOf(false) }
    val submit = {
        if (pin.length == 4) {
            if (advisorPinMatches(advisor, pin)) onVerified(advisor) else wrong = true
        }
    }
    BackHandler(onBack = onCancel)
    Column(
        Modifier
            .fillMaxSize()
            .background(MaterialTheme.colorScheme.surface)
            .advisorPinGlow()
            .imePadding()
    ) {
        DetailTopBar(title, "Close", onCancel, container = Color.Transparent)
        AdvisorPinContent(
            description = description,
            pin = pin,
            wrong = wrong,
            onPinChange = { pin = it.filter(Char::isDigit).take(4); wrong = false },
            onSubmit = submit,
            modifier = Modifier.weight(1f)
        )
        AdvisorPinBar(ready = pin.length == 4 && !wrong, onCancel = onCancel, onVerify = submit)
    }
}

/**
 * "Advisor verification" heading and the four PIN boxes, vertically centred in the space between
 * the top bar and the bottom bar (16dp more clearance below, as on the artboard).
 */
@Composable
fun AdvisorPinContent(
    description: String,
    pin: String,
    wrong: Boolean,
    onPinChange: (String) -> Unit,
    onSubmit: () -> Unit,
    modifier: Modifier = Modifier
) {
    BoxWithConstraints(modifier.fillMaxWidth(), contentAlignment = Alignment.TopCenter) {
        val viewport = maxHeight
        Column(
            Modifier
                .widthIn(max = MaxContentWidth)
                .fillMaxWidth()
                .verticalScroll(rememberScrollState())
                .heightIn(min = viewport)
        ) {
            Spacer(Modifier.weight(1f))
            StepHeading("Advisor verification", description)
            PinBoxes(pin = pin, wrong = wrong, onPinChange = onPinChange, onSubmit = onSubmit)
            Spacer(Modifier.weight(1f))
            Spacer(Modifier.height(Spacing.md))
        }
    }
}

/** Cancel (outlined tertiary) and Verify (tertiaryContainer) pinned at the bottom. */
@Composable
fun AdvisorPinBar(ready: Boolean, onCancel: () -> Unit, onVerify: () -> Unit) {
    val cs = MaterialTheme.colorScheme
    BottomActionBar {
        Row(horizontalArrangement = Arrangement.spacedBy(Spacing.xs)) {
            OutlinedPillButton(
                text = "Cancel",
                onClick = onCancel,
                contentColor = cs.tertiary,
                borderColor = cs.tertiary,
                modifier = Modifier.weight(1f)
            )
            PillButton(
                text = "Verify",
                onClick = onVerify,
                enabled = ready,
                containerColor = cs.tertiaryContainer,
                contentColor = cs.onTertiaryContainer,
                modifier = Modifier.weight(1f)
            )
        }
    }
}

/** Step heading: 28/36 title over 16/24 supporting text, 24dp gutters, 8dp top / 24dp bottom. */
@Composable
fun StepHeading(title: String, body: String) {
    val cs = MaterialTheme.colorScheme
    Column(
        Modifier.padding(start = Spacing.xl, end = Spacing.xl, top = Spacing.xs, bottom = Spacing.xl),
        verticalArrangement = Arrangement.spacedBy(Spacing.xs)
    ) {
        Text(title, style = MaterialTheme.typography.headlineMedium, color = cs.onSurface, modifier = Modifier.semantics { heading() })
        Text(body, style = MaterialTheme.typography.bodyLarge, color = cs.onSurfaceVariant)
    }
}

/**
 * Four 56×64dp boxes (16dp radius, surfaceContainerHigh, 12dp apart) over one hidden numeric field.
 * The next box gets a 2dp primary ring while focused; every box turns error after a wrong PIN.
 * Entering the fourth digit submits straight away.
 */
@Composable
private fun ColumnScope.PinBoxes(pin: String, wrong: Boolean, onPinChange: (String) -> Unit, onSubmit: () -> Unit) {
    val cs = MaterialTheme.colorScheme
    val focus = remember { FocusRequester() }
    val interaction = remember { MutableInteractionSource() }
    val focused by interaction.collectIsFocusedAsState()
    LaunchedEffect(Unit) { runCatching { focus.requestFocus() } }

    Column(Modifier.padding(horizontal = Spacing.xl), verticalArrangement = Arrangement.spacedBy(6.dp)) {
        Text("Advisor PIN", style = MaterialTheme.typography.labelLarge, color = cs.onSurfaceVariant)
        BasicTextField(
            value = pin,
            onValueChange = { value ->
                val digits = value.filter(Char::isDigit).take(4)
                onPinChange(digits)
                // Verify as soon as the fourth digit lands; no need to tap Verify.
                if (digits.length == 4 && pin.length < 4) onSubmit()
            },
            singleLine = true,
            cursorBrush = SolidColor(Color.Transparent),
            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.NumberPassword, imeAction = ImeAction.Done),
            keyboardActions = KeyboardActions(onDone = { onSubmit() }),
            interactionSource = interaction,
            modifier = Modifier
                .focusRequester(focus)
                .semantics { contentDescription = "Advisor PIN, 4 digits" },
            decorationBox = { inner ->
                Box {
                    Row(horizontalArrangement = Arrangement.spacedBy(Spacing.sm)) {
                        repeat(4) { i ->
                            val current = pin.length == i || (pin.length == 4 && i == 3)
                            val ring = when {
                                wrong -> cs.error
                                focused && current -> cs.primary
                                else -> Color.Transparent
                            }
                            Box(
                                Modifier
                                    .size(width = 56.dp, height = 64.dp)
                                    .background(cs.surfaceContainerHigh, LaluzShape.field)
                                    .border(2.dp, ring, LaluzShape.field),
                                contentAlignment = Alignment.Center
                            ) {
                                if (pin.length > i) {
                                    Text("•", style = LaluzType.pinDigit, color = cs.onSurface, textAlign = TextAlign.Center)
                                }
                            }
                        }
                    }
                    Box(Modifier.matchParentSize().alpha(0f)) { inner() }
                }
            }
        )
        Row(
            Modifier
                .heightIn(min = 16.dp)
                .padding(horizontal = Spacing.xxs)
                .semantics { liveRegion = LiveRegionMode.Polite },
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(Spacing.xs)
        ) {
            if (wrong) {
                Icon(LaluzIcons.AlertCircle, contentDescription = null, tint = cs.error, modifier = Modifier.size(16.dp))
                Text("Invalid advisor PIN. Please try again.", style = MaterialTheme.typography.bodySmall, color = cs.error)
            }
        }
    }
}
