package dev.appu.laluzgarage.ui.theme

import androidx.compose.material3.Typography
import androidx.compose.ui.text.ExperimentalTextApi
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.Font
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontVariation
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.LineHeightStyle
import androidx.compose.ui.unit.TextUnit
import androidx.compose.ui.unit.sp
import dev.appu.laluzgarage.R

@OptIn(ExperimentalTextApi::class)
private fun variableFamily(resId: Int, weights: List<FontWeight>) = FontFamily(
    weights.map { w ->
        Font(resId, weight = w, variationSettings = FontVariation.Settings(FontVariation.weight(w.weight)))
    }
)

private val allWeights = listOf(
    FontWeight.Normal, FontWeight.Medium, FontWeight.SemiBold,
    FontWeight.Bold, FontWeight.ExtraBold
)

val PlusJakartaSans = variableFamily(R.font.plus_jakarta_sans, allWeights)
/** Plate numbers: Google Sans Flex (open-licence build of Google Sans), weight axis only. */
val GoogleSansFlex = variableFamily(R.font.google_sans_flex, listOf(FontWeight.SemiBold, FontWeight.Bold))
val JetBrainsMono = variableFamily(R.font.jetbrains_mono, listOf(FontWeight.Medium, FontWeight.Bold))

// CSS-style half-leading: glyphs sit centred in the line box, like the artboards.
private val CssLineHeight = LineHeightStyle(
    alignment = LineHeightStyle.Alignment.Center,
    trim = LineHeightStyle.Trim.None
)

private fun style(
    family: FontFamily,
    size: Int,
    lineHeight: Int,
    weight: FontWeight,
    tracking: TextUnit = 0.sp
) = TextStyle(
    fontFamily = family,
    fontSize = size.sp,
    lineHeight = lineHeight.sp,
    fontWeight = weight,
    letterSpacing = tracking,
    lineHeightStyle = CssLineHeight
)

/** Type scale (tokens.json → type). Plus Jakarta Sans for UI, JetBrains Mono for plates and codes. */
val Typography = Typography(
    displayLarge = style(PlusJakartaSans, 57, 64, FontWeight.ExtraBold, (-1.5).sp),   // display-hero
    displayMedium = style(PlusJakartaSans, 45, 52, FontWeight.ExtraBold, (-1).sp),
    displaySmall = style(PlusJakartaSans, 36, 44, FontWeight.ExtraBold, (-0.5).sp),   // headline-screen, KPI tiles
    headlineLarge = style(PlusJakartaSans, 32, 40, FontWeight.ExtraBold, (-0.5).sp),  // bill total
    headlineMedium = style(PlusJakartaSans, 28, 36, FontWeight.Bold),                 // headline-greeting
    headlineSmall = style(PlusJakartaSans, 24, 32, FontWeight.Bold),
    titleLarge = style(PlusJakartaSans, 20, 28, FontWeight.Bold),                     // title-lg
    titleMedium = style(PlusJakartaSans, 16, 24, FontWeight.SemiBold),                // title-md
    titleSmall = style(PlusJakartaSans, 14, 20, FontWeight.Bold),                     // card section headings
    bodyLarge = style(PlusJakartaSans, 16, 24, FontWeight.Normal),                    // body-lg
    bodyMedium = style(PlusJakartaSans, 14, 20, FontWeight.Normal),                   // body-md
    bodySmall = style(PlusJakartaSans, 12, 16, FontWeight.Normal),                    // captions, helper text
    labelLarge = style(PlusJakartaSans, 14, 20, FontWeight.SemiBold),                 // label-lg
    labelMedium = style(PlusJakartaSans, 12, 16, FontWeight.SemiBold),                // label-sm: chips, captions
    labelSmall = style(PlusJakartaSans, 11, 16, FontWeight.SemiBold, 0.8.sp)          // overlines only
)

/** Styles outside the M3 scale. */
object LaluzType {
    val plateLarge = style(GoogleSansFlex, 36, 44, FontWeight.Bold, 2.sp)  // job card and vehicle headers
    val plateCard = style(GoogleSansFlex, 24, 32, FontWeight.Bold, 1.sp)   // Services cards
    val plateValue = style(GoogleSansFlex, 16, 24, FontWeight.Bold, 1.sp)  // plate in detail grids
    val plate = style(JetBrainsMono, 18, 24, FontWeight.Bold, 0.5.sp)      // job cards
    val plateSmall = style(JetBrainsMono, 14, 20, FontWeight.Bold, 0.5.sp) // compact cards, list rows
    val pin = style(JetBrainsMono, 16, 24, FontWeight.Bold, 1.sp)          // PIN badge
    val monoValue = style(JetBrainsMono, 16, 24, FontWeight.Bold)          // plate / odometer values
    val phone = style(JetBrainsMono, 16, 24, FontWeight.Medium)            // phone numbers
    val labelStrong = style(PlusJakartaSans, 14, 20, FontWeight.Bold)      // emphasised buttons, segments
    val labelTiny = style(PlusJakartaSans, 12, 16, FontWeight.Bold)        // avatar initials, chip counts
    val valueLarge = style(PlusJakartaSans, 28, 36, FontWeight.ExtraBold, (-0.5).sp) // vehicle summary figures
    val monoSmall = style(JetBrainsMono, 14, 20, FontWeight.Bold)          // odometer in history rows
    val phoneSmall = style(JetBrainsMono, 14, 20, FontWeight.Medium)       // phone in intake search rows
    val pinDigit = style(JetBrainsMono, 28, 36, FontWeight.Bold)           // advisor PIN boxes
    val pinSmall = style(JetBrainsMono, 14, 20, FontWeight.Bold, 1.sp)     // inline vehicle PIN chip
}
