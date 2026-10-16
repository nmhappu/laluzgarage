package dev.appu.laluzgarage.ui.theme

import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Shapes
import androidx.compose.ui.unit.dp

/** Radius tokens (tokens.json → radius). */
object Radius {
    val xs = 4.dp      // inner corners of connected list rows
    val sm = 8.dp      // chips, PIN badge, checkboxes, segmented inner corners
    val md = 12.dp     // icon tiles, outlined fields on the job card
    val lg = 16.dp     // FAB, filled text fields
    val xl = 20.dp     // cards, tiles, list group ends
    val xxl = 28.dp    // hero card, dialogs, sheets
}

val LaluzShapes = Shapes(
    extraSmall = RoundedCornerShape(Radius.xs),
    small = RoundedCornerShape(Radius.sm),
    medium = RoundedCornerShape(Radius.md),
    large = RoundedCornerShape(Radius.lg),
    extraLarge = RoundedCornerShape(Radius.xxl)
)

/** Shapes M3 has no slot for. */
object LaluzShape {
    val card = RoundedCornerShape(Radius.xl)
    val hero = RoundedCornerShape(Radius.xxl)
    val chip = RoundedCornerShape(Radius.sm)
    val iconTile = RoundedCornerShape(Radius.md)
    val fab = RoundedCornerShape(Radius.lg)
    val field = RoundedCornerShape(Radius.lg)
    val outlinedField = RoundedCornerShape(Radius.md)
    val full = CircleShape
}
