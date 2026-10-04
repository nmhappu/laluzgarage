package dev.appu.laluzgarage.ui.theme

import android.app.Activity
import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.runtime.Immutable
import androidx.compose.runtime.SideEffect
import androidx.compose.runtime.staticCompositionLocalOf
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.toArgb
import androidx.compose.ui.platform.LocalView
import androidx.core.view.WindowCompat

@Immutable
data class WorkshopCustomColors(
    val statusSuccess: Color = StatusSuccess,
    val statusPending: Color = StatusPending,
    val statusUrgent: Color = StatusUrgent,
    val whatsApp: Color = WhatsAppBrand,
    val surfaceContainer: Color = DarkSurfaceContainer
)

val LocalWorkshopColors = staticCompositionLocalOf { WorkshopCustomColors() }

private val DarkColorScheme = darkColorScheme(
    primary = BrandPrimary,
    onPrimary = BrandOnPrimary,
    primaryContainer = BrandPrimary.copy(alpha = 0.15f),
    onPrimaryContainer = BrandPrimary,

    secondary = BrandSecondary,
    onSecondary = BrandOnSecondary,
    secondaryContainer = BrandSecondary.copy(alpha = 0.15f),
    onSecondaryContainer = BrandSecondary,

    background = DarkBackground,
    onBackground = DarkTextPrimary,

    surface = DarkSurface,
    onSurface = DarkTextPrimary,
    surfaceVariant = DarkSurfaceVariant,
    onSurfaceVariant = DarkTextSecondary,

    outline = DarkOutline,
    outlineVariant = DarkOutlineVariant,

    error = StatusUrgent,
    onError = Color.White
)

private val LightColorScheme = lightColorScheme(
    primary = BrandPrimary,
    onPrimary = BrandOnPrimary,
    primaryContainer = BrandPrimary.copy(alpha = 0.15f),
    onPrimaryContainer = BrandPrimary,

    secondary = BrandSecondary,
    onSecondary = BrandOnSecondary,
    secondaryContainer = BrandSecondary.copy(alpha = 0.15f),
    onSecondaryContainer = BrandSecondary,

    background = LightBackground,
    onBackground = LightTextPrimary,

    surface = LightSurface,
    onSurface = LightTextPrimary,
    surfaceVariant = LightSurfaceVariant,
    onSurfaceVariant = LightTextSecondary,

    outline = LightOutline,
    outlineVariant = LightOutlineVariant,

    error = StatusUrgent,
    onError = Color.White
)

@Composable
fun LaluzTheme(
    darkTheme: Boolean = true, // Default to workshop dark theme (Obsidian)
    content: @Composable () -> Unit
) {
    val colorScheme = if (darkTheme) DarkColorScheme else LightColorScheme
    val workshopColors = if (darkTheme) {
        WorkshopCustomColors(
            statusSuccess = StatusSuccess,
            statusPending = StatusPending,
            statusUrgent = StatusUrgent,
            whatsApp = WhatsAppBrand,
            surfaceContainer = DarkSurfaceContainer
        )
    } else {
        WorkshopCustomColors(
            statusSuccess = StatusSuccess,
            statusPending = StatusPending,
            statusUrgent = StatusUrgent,
            whatsApp = WhatsAppBrand,
            surfaceContainer = LightSurfaceContainer
        )
    }

    val view = LocalView.current
    if (!view.isInEditMode) {
        SideEffect {
            val window = (view.context as? Activity)?.window
            if (window != null) {
                window.statusBarColor = Color.Transparent.toArgb()
                window.navigationBarColor = Color.Transparent.toArgb()
                val insetsController = WindowCompat.getInsetsController(window, view)
                insetsController.isAppearanceLightStatusBars = !darkTheme
                insetsController.isAppearanceLightNavigationBars = !darkTheme
            }
        }
    }

    CompositionLocalProvider(LocalWorkshopColors provides workshopColors) {
        MaterialTheme(
            colorScheme = colorScheme,
            typography = LaluzTypography,
            content = content
        )
    }
}
