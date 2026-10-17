package dev.appu.laluzgarage.ui.theme

import androidx.compose.runtime.Immutable
import androidx.compose.runtime.staticCompositionLocalOf
import androidx.compose.ui.graphics.Color

/**
 * Colour roles that Material 3 does not define: warning (pending status, low stock),
 * the Total services hero card, WhatsApp brand actions and the logo ink.
 * Read through [LaluzTheme.extendedColors].
 */
@Immutable
data class ExtendedColors(
    val warning: Color,
    val warningContainer: Color,
    val onWarningContainer: Color,
    val heroTop: Color,
    val heroBottom: Color,
    val onHero: Color,
    val heroLine: Color,
    val whatsapp: Color,
    val onWhatsapp: Color,
    val logoInk: Color,
    val logoBolt: Color
)

internal val DarkExtendedColors = ExtendedColors(
    warning = DarkWarning,
    warningContainer = DarkWarningContainer,
    onWarningContainer = DarkOnWarningContainer,
    heroTop = DarkHeroTop,
    heroBottom = DarkHeroBottom,
    onHero = DarkHeroOn,
    heroLine = DarkHeroLine,
    whatsapp = WhatsAppGreen,
    onWhatsapp = OnWhatsAppGreen,
    logoInk = DarkLogoInk,
    logoBolt = LogoBolt
)

internal val LightExtendedColors = ExtendedColors(
    warning = LightWarning,
    warningContainer = LightWarningContainer,
    onWarningContainer = LightOnWarningContainer,
    heroTop = LightHeroTop,
    heroBottom = LightHeroBottom,
    onHero = LightHeroOn,
    heroLine = LightHeroLine,
    whatsapp = WhatsAppGreen,
    onWhatsapp = OnWhatsAppGreen,
    logoInk = LightLogoInk,
    logoBolt = LogoBolt
)

val LocalExtendedColors = staticCompositionLocalOf { DarkExtendedColors }
