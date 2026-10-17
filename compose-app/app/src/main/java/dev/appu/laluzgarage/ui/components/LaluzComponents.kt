package dev.appu.laluzgarage.ui.components

import androidx.compose.animation.core.LinearEasing
import androidx.compose.animation.core.animateFloat
import androidx.compose.animation.core.infiniteRepeatable
import androidx.compose.animation.core.rememberInfiniteTransition
import androidx.compose.animation.core.tween
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.interaction.collectIsFocusedAsState
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ColumnScope
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.RowScope
import androidx.compose.foundation.layout.defaultMinSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.selection.selectableGroup
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.text.BasicTextField
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonGroupDefaults
import androidx.compose.material3.ToggleButton
import androidx.compose.material3.ToggleButtonDefaults
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Icon
import androidx.compose.material3.LocalContentColor
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Matrix
import androidx.compose.ui.graphics.Outline
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.graphics.Shape
import androidx.compose.ui.graphics.SolidColor
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.graphics.vector.PathParser
import androidx.compose.ui.layout.layout
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.semantics.clearAndSetSemantics
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.heading
import androidx.compose.ui.semantics.role
import androidx.compose.ui.semantics.selected
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.VisualTransformation
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.Density
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.LayoutDirection
import androidx.compose.ui.unit.dp
import dev.appu.laluzgarage.ui.theme.LaluzShape
import dev.appu.laluzgarage.ui.theme.LaluzTheme
import dev.appu.laluzgarage.ui.theme.LaluzType
import dev.appu.laluzgarage.ui.theme.Spacing

// ---------------------------------------------------------------------------
// Status chip
// ---------------------------------------------------------------------------

/** Status maps to a container / on-container role pair, never a raw hue. */
enum class ChipTone { PENDING, IN_PROGRESS, COMPLETED, OVERDUE, DELIVERED, NEUTRAL }

@Composable
private fun ChipTone.colors(): Pair<Color, Color> {
    val cs = MaterialTheme.colorScheme
    val ext = LaluzTheme.extendedColors
    return when (this) {
        ChipTone.PENDING -> ext.warningContainer to ext.onWarningContainer
        ChipTone.IN_PROGRESS -> cs.tertiaryContainer to cs.onTertiaryContainer
        ChipTone.COMPLETED -> cs.primaryContainer to cs.onPrimaryContainer
        ChipTone.OVERDUE -> cs.errorContainer to cs.onErrorContainer
        ChipTone.DELIVERED -> cs.primary to cs.onPrimary
        ChipTone.NEUTRAL -> cs.surfaceContainerHighest to cs.onSurface
    }
}

/** 24dp status chip: 8dp padding, Small shape, labelMedium. */
@Composable
fun StatusChip(text: String, tone: ChipTone, modifier: Modifier = Modifier) {
    val (container, content) = tone.colors()
    Box(
        modifier = modifier
            .height(24.dp)
            .clip(LaluzShape.chip)
            .background(container)
            .padding(horizontal = Spacing.xs),
        contentAlignment = Alignment.Center
    ) {
        Text(text = text, style = MaterialTheme.typography.labelMedium, color = content, maxLines = 1)
    }
}

/** Security PIN badge: secondaryContainer chip with the mono digits split 3/3 (announced as "PIN …"). */
@Composable
fun PinBadge(pin: String, modifier: Modifier = Modifier) {
    val shown = if (pin.length == 6) pin.take(3) + " " + pin.drop(3) else pin
    Row(
        modifier = modifier
            .padding(top = 2.dp)
            .height(28.dp)
            .clip(LaluzShape.chip)
            .background(MaterialTheme.colorScheme.secondaryContainer)
            .padding(horizontal = Spacing.xs)
            .clearAndSetSemantics { contentDescription = "PIN " + pin.toList().joinToString(" ") },
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(Spacing.xs)
    ) {
        val color = MaterialTheme.colorScheme.onSecondaryContainer
        Text(shown, style = LaluzType.pin, color = color)
    }
}

// ---------------------------------------------------------------------------
// Data display
// ---------------------------------------------------------------------------

/** A dt/dd pair: 12sp label over a 16sp semibold value. */
@Composable
fun DetailField(
    label: String,
    modifier: Modifier = Modifier,
    value: String? = null,
    valueStyle: TextStyle = MaterialTheme.typography.titleMedium,
    valueColor: Color = MaterialTheme.colorScheme.onSurface,
    maxLines: Int = Int.MAX_VALUE,
    content: (@Composable () -> Unit)? = null
) {
    Column(modifier = modifier) {
        Text(label, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
        if (content != null) content() else Text(
            text = value.orEmpty(),
            style = valueStyle,
            color = valueColor,
            maxLines = maxLines,
            overflow = TextOverflow.Ellipsis
        )
    }
}

/**
 * Contact row for the customer / owner: caption, name and number on the left, round 48dp Call and
 * WhatsApp icon buttons on the right. Sits inside a [SectionCard] with zero padding (12dp end, 20dp start).
 */
@Composable
fun ContactRow(
    label: String,
    name: String,
    phone: String,
    onCall: () -> Unit,
    onWhatsApp: () -> Unit,
    modifier: Modifier = Modifier
) {
    val cs = MaterialTheme.colorScheme
    val ext = dev.appu.laluzgarage.ui.theme.LaluzTheme.extendedColors
    val hasPhone = phone.isNotBlank()
    Row(
        modifier = modifier
            .fillMaxWidth()
            .padding(start = Spacing.lg, top = Spacing.sm, end = Spacing.sm, bottom = Spacing.sm),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(Spacing.sm)
    ) {
        Column(Modifier.weight(1f)) {
            Text(label, style = MaterialTheme.typography.bodySmall, color = cs.onSurfaceVariant)
            Text(name, style = MaterialTheme.typography.titleMedium, color = cs.onSurface, maxLines = 1, overflow = TextOverflow.Ellipsis)
            if (hasPhone) Text(phone, style = MaterialTheme.typography.bodyMedium, color = cs.onSurfaceVariant)
        }
        ContactIconButton(LaluzIcons.Phone, "Call $name", cs.surfaceContainerHighest, cs.onSurface, 20.dp, hasPhone, onCall)
        ContactIconButton(LaluzIcons.WhatsApp, "WhatsApp $name", ext.whatsapp, ext.onWhatsapp, 22.dp, hasPhone, onWhatsApp)
    }
}

@Composable
private fun ContactIconButton(
    icon: ImageVector,
    description: String,
    container: Color,
    content: Color,
    iconSize: androidx.compose.ui.unit.Dp,
    enabled: Boolean,
    onClick: () -> Unit
) {
    androidx.compose.material3.Surface(
        onClick = onClick,
        enabled = enabled,
        shape = CircleShape,
        color = container,
        contentColor = content,
        modifier = Modifier
            .size(48.dp)
            .semantics { contentDescription = description }
    ) {
        Box(contentAlignment = Alignment.Center) {
            Icon(icon, contentDescription = null, modifier = Modifier.size(iconSize))
        }
    }
}

/** Two-column definition grid (dl with grid-template-columns: 1fr 1fr). */
@Composable
fun DetailGrid(
    rows: List<Pair<@Composable () -> Unit, (@Composable () -> Unit)?>>,
    modifier: Modifier = Modifier,
    rowGap: Dp = Spacing.md,
    columnGap: Dp = Spacing.md
) {
    Column(modifier = modifier, verticalArrangement = Arrangement.spacedBy(rowGap)) {
        rows.forEach { (start, end) ->
            Row(horizontalArrangement = Arrangement.spacedBy(columnGap)) {
                Box(Modifier.weight(1f)) { start() }
                Box(Modifier.weight(1f)) { end?.invoke() }
            }
        }
    }
}

/** Card section on surfaceContainerLow: 20dp radius and padding, 14sp bold heading in onSurfaceVariant. */
@Composable
fun SectionCard(
    title: String?,
    modifier: Modifier = Modifier,
    contentPadding: PaddingValues = PaddingValues(Spacing.lg),
    gap: Dp = Spacing.md,
    titleTrailing: (@Composable RowScope.() -> Unit)? = null,
    content: @Composable ColumnScope.() -> Unit
) {
    Column(
        modifier = modifier
            .fillMaxWidth()
            .clip(LaluzShape.card)
            .background(MaterialTheme.colorScheme.surfaceContainerLow)
            .padding(contentPadding),
        verticalArrangement = Arrangement.spacedBy(gap)
    ) {
        if (title != null) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Text(
                    text = title,
                    style = MaterialTheme.typography.titleSmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    modifier = Modifier
                        .weight(1f)
                        .semantics { heading() }
                )
                titleTrailing?.invoke(this)
            }
        }
        content()
    }
}

/** 40dp tonal icon tile, Medium (12dp) shape, 20dp icon. */
@Composable
fun IconTile(
    icon: ImageVector,
    container: Color,
    content: Color,
    modifier: Modifier = Modifier,
    iconSize: Dp = 20.dp
) {
    Box(
        modifier = modifier
            .size(40.dp)
            .clip(LaluzShape.iconTile)
            .background(container),
        contentAlignment = Alignment.Center
    ) {
        Icon(icon, contentDescription = null, tint = content, modifier = Modifier.size(iconSize))
    }
}

/**
 * Hero badge: a [CookieShape] in [container] turning slowly (one turn per 20s) behind an upright
 * [icon]. The icon is 40% of [size].
 */
@Composable
fun SpinningCookieBadge(
    icon: ImageVector,
    container: Color,
    content: Color,
    modifier: Modifier = Modifier,
    size: Dp = 120.dp
) {
    val spin by rememberInfiniteTransition(label = "cookieSpin").animateFloat(
        initialValue = 0f,
        targetValue = 360f,
        animationSpec = infiniteRepeatable(tween(20_000, easing = LinearEasing)),
        label = "cookieRotation"
    )
    Box(modifier.size(size), contentAlignment = Alignment.Center) {
        Box(
            Modifier
                .matchParentSize()
                .graphicsLayer { rotationZ = spin }
                .clip(CookieShape)
                .background(container)
        )
        Icon(icon, contentDescription = null, tint = content, modifier = Modifier.size(size * 0.4f))
    }
}

// ---------------------------------------------------------------------------
// Shapes
// ---------------------------------------------------------------------------

private const val COOKIE_PATH =
    "M24.0 3.1 L25.4 3.4 L26.6 4.0 L27.8 4.9 L28.9 5.8 L29.9 6.7 L30.9 7.2 L32.1 7.6 L33.4 7.7 L34.8 7.8 L36.3 8.0 L37.6 8.5 L38.8 9.2 L39.5 10.4 L40.0 11.7 L40.2 13.2 L40.3 14.6 L40.4 15.9 L40.8 17.1 L41.3 18.1 L42.2 19.1 L43.1 20.2 L44.0 21.4 L44.6 22.6 L44.9 24.0 L44.6 25.4 L44.0 26.6 L43.1 27.8 L42.2 28.9 L41.3 29.9 L40.8 30.9 L40.4 32.1 L40.3 33.4 L40.2 34.8 L40.0 36.3 L39.5 37.6 L38.8 38.8 L37.6 39.5 L36.3 40.0 L34.8 40.2 L33.4 40.3 L32.1 40.4 L30.9 40.8 L29.9 41.3 L28.9 42.2 L27.8 43.1 L26.6 44.0 L25.4 44.6 L24.0 44.9 L22.6 44.6 L21.4 44.0 L20.2 43.1 L19.1 42.2 L18.1 41.3 L17.1 40.8 L15.9 40.4 L14.6 40.3 L13.2 40.2 L11.7 40.0 L10.4 39.5 L9.2 38.8 L8.5 37.6 L8.0 36.3 L7.8 34.8 L7.7 33.4 L7.6 32.1 L7.2 30.9 L6.7 29.9 L5.8 28.9 L4.9 27.8 L4.0 26.6 L3.4 25.4 L3.1 24.0 L3.4 22.6 L4.0 21.4 L4.9 20.2 L5.8 19.1 L6.7 18.1 L7.2 17.1 L7.6 15.9 L7.7 14.6 L7.8 13.2 L8.0 11.7 L8.5 10.4 L9.2 9.2 L10.4 8.5 L11.7 8.0 L13.2 7.8 L14.6 7.7 L15.9 7.6 L17.1 7.2 L18.1 6.7 L19.1 5.8 L20.2 4.9 L21.4 4.0 L22.6 3.4 Z"

/** M3 Expressive "cookie" shape from the artboards (48-unit grid, includes its own inset). */
object CookieShape : Shape {
    private val base: Path by lazy { PathParser().parsePathString(COOKIE_PATH).toPath() }

    override fun createOutline(size: Size, layoutDirection: LayoutDirection, density: Density): Outline {
        val path = Path().apply {
            addPath(base)
            transform(Matrix().apply { scale(size.width / 48f, size.height / 48f) })
        }
        return Outline.Generic(path)
    }
}

// ---------------------------------------------------------------------------
// Connected segmented selector (M3 Expressive button group)
// ---------------------------------------------------------------------------

data class SegmentColors(
    val selectedContainer: Color,
    val selectedContent: Color,
    val container: Color,
    val content: Color
)

/**
 * M3 Expressive connected button group: [ToggleButton]s with the connected leading / middle /
 * trailing shapes (full outer ends, 8dp inner corners, 2dp gaps). The checked button morphs to a
 * full pill using the theme's expressive motion scheme. Used as a single-select (radio) group.
 */
@Composable
fun <T> ConnectedSegments(
    options: List<T>,
    selected: T,
    onSelect: (T) -> Unit,
    label: (T) -> String,
    colors: (T) -> SegmentColors,
    modifier: Modifier = Modifier,
    height: Dp = 40.dp,
    fill: Boolean = false,
    minSegmentWidth: Dp = 48.dp,
    horizontalPadding: Dp = Spacing.sm,
    textStyle: TextStyle = LaluzType.labelStrong
) {
    Row(
        modifier = modifier.selectableGroup(),
        horizontalArrangement = Arrangement.spacedBy(ButtonGroupDefaults.ConnectedSpaceBetween)
    ) {
        options.forEachIndexed { index, option ->
            val isSelected = option == selected
            val c = colors(option)
            val shapes = when (index) {
                0 -> ButtonGroupDefaults.connectedLeadingButtonShapes()
                options.lastIndex -> ButtonGroupDefaults.connectedTrailingButtonShapes()
                else -> ButtonGroupDefaults.connectedMiddleButtonShapes()
            }
            ToggleButton(
                checked = isSelected,
                onCheckedChange = { onSelect(option) },
                shapes = shapes,
                colors = ToggleButtonDefaults.colors(
                    containerColor = c.container,
                    contentColor = c.content,
                    checkedContainerColor = c.selectedContainer,
                    checkedContentColor = c.selectedContent
                ),
                contentPadding = PaddingValues(horizontal = if (fill) 0.dp else horizontalPadding),
                modifier = (if (fill) Modifier.weight(1f) else Modifier.defaultMinSize(minWidth = minSegmentWidth))
                    .height(height)
                    .semantics {
                        role = Role.RadioButton
                        this.selected = isSelected
                    }
            ) {
                Text(label(option), style = textStyle, maxLines = 1)
            }
        }
    }
}

// ---------------------------------------------------------------------------
// Buttons
// ---------------------------------------------------------------------------

/** Full-width 48dp tonal pill on surfaceContainerHigh with left-aligned label (Login, Sign out). */
@Composable
fun TonalRowButton(
    text: String,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
    enabled: Boolean = true,
    loading: Boolean = false,
    leading: (@Composable () -> Unit)? = null
) {
    Button(
        onClick = onClick,
        enabled = enabled && !loading,
        modifier = modifier
            .fillMaxWidth()
            .height(48.dp),
        shape = CircleShape,
        contentPadding = PaddingValues(horizontal = Spacing.md),
        colors = ButtonDefaults.buttonColors(
            containerColor = MaterialTheme.colorScheme.surfaceContainerHigh,
            contentColor = MaterialTheme.colorScheme.onSurface
        )
    ) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.spacedBy(Spacing.sm),
            verticalAlignment = Alignment.CenterVertically
        ) {
            leading?.invoke()
            Text(text, style = MaterialTheme.typography.labelLarge, modifier = Modifier.weight(1f))
            if (loading) {
                CircularProgressIndicator(
                    modifier = Modifier.size(20.dp),
                    strokeWidth = 2.dp,
                    color = LocalContentColor.current
                )
            }
        }
    }
}

/** Centered 48dp pill with an optional 20dp leading icon; 14sp bold label. */
@Composable
fun PillButton(
    text: String,
    onClick: () -> Unit,
    containerColor: Color,
    contentColor: Color,
    modifier: Modifier = Modifier,
    icon: ImageVector? = null,
    enabled: Boolean = true,
    loading: Boolean = false
) {
    Button(
        onClick = onClick,
        enabled = enabled && !loading,
        modifier = modifier.height(48.dp),
        shape = CircleShape,
        contentPadding = PaddingValues(horizontal = Spacing.md),
        colors = ButtonDefaults.buttonColors(containerColor = containerColor, contentColor = contentColor)
    ) {
        if (loading) {
            CircularProgressIndicator(Modifier.size(20.dp), strokeWidth = 2.dp, color = LocalContentColor.current)
        } else {
            if (icon != null) {
                Icon(icon, contentDescription = null, modifier = Modifier.size(20.dp))
                Box(Modifier.size(Spacing.xs))
            }
            Text(text, style = LaluzType.labelStrong)
        }
    }
}

/** 48dp outlined pill: 1dp outline border. */
@Composable
fun OutlinedPillButton(
    text: String,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
    contentColor: Color = MaterialTheme.colorScheme.primary,
    enabled: Boolean = true,
    borderColor: Color = MaterialTheme.colorScheme.outline
) {
    val on = MaterialTheme.colorScheme.onSurface
    OutlinedButton(
        onClick = onClick,
        enabled = enabled,
        modifier = modifier.height(48.dp),
        shape = CircleShape,
        border = BorderStroke(1.dp, if (enabled) borderColor else on.copy(alpha = 0.12f)),
        colors = ButtonDefaults.outlinedButtonColors(
            contentColor = contentColor,
            disabledContentColor = on.copy(alpha = 0.38f)
        ),
        contentPadding = PaddingValues(horizontal = Spacing.xl)
    ) {
        Text(text, style = LaluzType.labelStrong)
    }
}

/** 48dp-tall text button in primary (View all, Edit, sort). */
@Composable
fun LaluzTextButton(
    text: String,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
    style: TextStyle = MaterialTheme.typography.labelLarge,
    icon: ImageVector? = null,
    contentDescription: String? = null
) {
    TextButton(
        onClick = onClick,
        modifier = modifier
            .height(48.dp)
            .then(if (contentDescription != null) Modifier.semantics { this.contentDescription = contentDescription } else Modifier),
        shape = CircleShape,
        contentPadding = PaddingValues(horizontal = Spacing.sm),
        colors = ButtonDefaults.textButtonColors(contentColor = MaterialTheme.colorScheme.primary)
    ) {
        if (icon != null) {
            Icon(icon, contentDescription = null, modifier = Modifier.size(18.dp))
            Box(Modifier.size(Spacing.xs))
        }
        Text(text, style = style)
    }
}

// ---------------------------------------------------------------------------
// Text fields
// ---------------------------------------------------------------------------

/**
 * Filled field from the login artboard: label above, 56dp surfaceContainerHigh box with a 16dp radius,
 * 2dp inset primary ring on focus. Errors switch the ring and supporting text to the error role.
 */
@Composable
fun LaluzFilledField(
    value: String,
    onValueChange: (String) -> Unit,
    label: String,
    placeholder: String,
    modifier: Modifier = Modifier,
    keyboardType: KeyboardType = KeyboardType.Text,
    visualTransformation: VisualTransformation = VisualTransformation.None,
    isError: Boolean = false,
    supportingText: String? = null,
    keyboardActions: KeyboardActions = KeyboardActions.Default,
    imeAction: androidx.compose.ui.text.input.ImeAction = androidx.compose.ui.text.input.ImeAction.Next,
    textStyle: TextStyle = MaterialTheme.typography.bodyLarge,
    trailing: (@Composable () -> Unit)? = null
) {
    val interaction = remember { MutableInteractionSource() }
    val focused by interaction.collectIsFocusedAsState()
    val cs = MaterialTheme.colorScheme
    val ringColor = when {
        isError -> cs.error
        focused -> cs.primary
        else -> Color.Transparent
    }
    Column(modifier = modifier, verticalArrangement = Arrangement.spacedBy(6.dp)) {
        Text(label, style = MaterialTheme.typography.labelLarge, color = if (isError) cs.error else cs.onSurfaceVariant)
        BasicTextField(
            value = value,
            onValueChange = onValueChange,
            singleLine = true,
            textStyle = textStyle.copy(color = cs.onSurface),
            cursorBrush = SolidColor(cs.primary),
            visualTransformation = visualTransformation,
            keyboardOptions = KeyboardOptions(keyboardType = keyboardType, imeAction = imeAction),
            keyboardActions = keyboardActions,
            interactionSource = interaction,
            decorationBox = { inner ->
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(56.dp)
                        .clip(LaluzShape.field)
                        .background(cs.surfaceContainerHigh)
                        .border(2.dp, ringColor, LaluzShape.field)
                        .padding(start = Spacing.md, end = if (trailing != null) Spacing.xxs else Spacing.md),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Box(Modifier.weight(1f)) {
                        if (value.isEmpty()) {
                            Text(placeholder, style = textStyle, color = cs.onSurfaceVariant)
                        }
                        inner()
                    }
                    trailing?.invoke()
                }
            }
        )
        if (supportingText != null) {
            Text(
                supportingText,
                style = MaterialTheme.typography.bodySmall,
                color = if (isError) cs.error else cs.onSurfaceVariant,
                modifier = Modifier.padding(horizontal = Spacing.md)
            )
        }
    }
}

/**
 * Outlined field from the job card: 12dp radius, 1dp outline at rest, 2dp primary when focused
 * or [emphasized]. Optional prefix and suffix text.
 */
@Composable
fun LaluzOutlinedField(
    value: String,
    onValueChange: (String) -> Unit,
    modifier: Modifier = Modifier,
    placeholder: String = "",
    textStyle: TextStyle = MaterialTheme.typography.bodyLarge,
    singleLine: Boolean = true,
    minLines: Int = 1,
    keyboardType: KeyboardType = KeyboardType.Text,
    emphasized: Boolean = false,
    /** Borderless: a surfaceContainerHigh fill, with the primary ring only while focused. */
    filled: Boolean = false,
    isError: Boolean = false,
    prefix: String? = null,
    suffix: String? = null,
    textAlign: TextAlign = TextAlign.Start,
    height: Dp? = 56.dp,
    contentPadding: PaddingValues = PaddingValues(horizontal = Spacing.md)
) {
    val interaction = remember { MutableInteractionSource() }
    val focused by interaction.collectIsFocusedAsState()
    val cs = MaterialTheme.colorScheme
    val (width, color) = when {
        isError -> 2.dp to cs.error
        filled -> if (focused) 2.dp to cs.primary else 0.dp to Color.Transparent
        focused || emphasized -> 2.dp to cs.primary
        else -> 1.dp to cs.outline
    }
    BasicTextField(
        value = value,
        onValueChange = onValueChange,
        singleLine = singleLine,
        minLines = minLines,
        textStyle = textStyle.copy(color = cs.onSurface, textAlign = textAlign),
        cursorBrush = SolidColor(cs.primary),
        keyboardOptions = KeyboardOptions(keyboardType = keyboardType),
        interactionSource = interaction,
        modifier = modifier,
        decorationBox = { inner ->
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .then(if (height != null) Modifier.height(height) else Modifier)
                    .then(if (filled) Modifier.background(cs.surfaceContainerHigh, LaluzShape.outlinedField) else Modifier)
                    .border(width, color, LaluzShape.outlinedField)
                    .padding(contentPadding),
                verticalAlignment = if (singleLine) Alignment.CenterVertically else Alignment.Top,
                horizontalArrangement = Arrangement.spacedBy(if (prefix != null) Spacing.xxs else Spacing.xs)
            ) {
                if (prefix != null) {
                    Text(prefix, style = MaterialTheme.typography.bodyLarge, color = cs.onSurfaceVariant)
                }
                Box(Modifier.weight(1f)) {
                    if (value.isEmpty() && placeholder.isNotEmpty()) {
                        Text(
                            placeholder,
                            style = textStyle.copy(textAlign = textAlign),
                            color = cs.onSurfaceVariant,
                            modifier = Modifier.fillMaxWidth()
                        )
                    }
                    inner()
                }
                if (suffix != null) {
                    Text(suffix, style = MaterialTheme.typography.bodyMedium, color = cs.onSurfaceVariant)
                }
            }
        }
    )
}

/** Full-pill search field on surfaceContainerHigh with a leading 24dp search icon. 56dp tall, 48dp in a top bar. */
@Composable
fun LaluzSearchField(
    value: String,
    onValueChange: (String) -> Unit,
    placeholder: String,
    modifier: Modifier = Modifier,
    onClear: (() -> Unit)? = null,
    height: Dp = 56.dp
) {
    val cs = MaterialTheme.colorScheme
    BasicTextField(
        value = value,
        onValueChange = onValueChange,
        singleLine = true,
        textStyle = MaterialTheme.typography.bodyLarge.copy(color = cs.onSurface),
        cursorBrush = SolidColor(cs.primary),
        keyboardOptions = KeyboardOptions(imeAction = androidx.compose.ui.text.input.ImeAction.Search),
        modifier = modifier,
        decorationBox = { inner ->
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .height(height)
                    .clip(CircleShape)
                    .background(cs.surfaceContainerHigh)
                    .padding(start = Spacing.md, end = if (onClear != null && value.isNotEmpty()) Spacing.xxs else Spacing.md),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(Spacing.md)
            ) {
                Icon(LaluzIcons.Search, contentDescription = null, tint = cs.onSurfaceVariant, modifier = Modifier.size(24.dp))
                Box(Modifier.weight(1f)) {
                    if (value.isEmpty()) {
                        Text(placeholder, style = MaterialTheme.typography.bodyLarge, color = cs.onSurfaceVariant, maxLines = 1)
                    }
                    inner()
                }
                if (onClear != null && value.isNotEmpty()) {
                    androidx.compose.material3.IconButton(onClick = onClear) {
                        Icon(LaluzIcons.Close, contentDescription = "Clear search", tint = cs.onSurfaceVariant)
                    }
                }
            }
        }
    )
}

/**
 * Lets a trailing text button bleed [amount] into the gutter (CSS negative margin) so its label
 * lines up with the content edge while keeping its full touch target.
 */
fun Modifier.bleedEnd(amount: Dp): Modifier = layout { measurable, constraints ->
    val shift = amount.roundToPx()
    val placeable = measurable.measure(
        if (constraints.hasBoundedWidth) constraints.copy(maxWidth = constraints.maxWidth + shift) else constraints
    )
    layout((placeable.width - shift).coerceAtLeast(0), placeable.height) { placeable.place(0, 0) }
}

/** Provides a content colour to a block (used inside custom containers). */
@Composable
fun WithContentColor(color: Color, content: @Composable () -> Unit) {
    CompositionLocalProvider(LocalContentColor provides color, content = content)
}
