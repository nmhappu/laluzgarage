package dev.appu.laluzgarage

import android.os.Build
import android.os.Bundle
import android.os.SystemClock
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.activity.viewModels
import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.windowsizeclass.ExperimentalMaterial3WindowSizeClassApi
import androidx.compose.material3.windowsizeclass.calculateWindowSizeClass
import androidx.compose.runtime.getValue
import androidx.core.splashscreen.SplashScreen.Companion.installSplashScreen
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import dagger.hilt.android.AndroidEntryPoint
import dev.appu.laluzgarage.ui.LaluzApp
import dev.appu.laluzgarage.ui.auth.AuthViewModel
import dev.appu.laluzgarage.ui.theme.LaluzGarageTheme
import dev.appu.laluzgarage.ui.theme.ThemeMode

@AndroidEntryPoint
class MainActivity : ComponentActivity() {

    private val authViewModel: AuthViewModel by viewModels()

    @OptIn(ExperimentalMaterial3WindowSizeClassApi::class)
    override fun onCreate(savedInstanceState: Bundle?) {
        val splashScreen = installSplashScreen()
        // Android 12+ animates the splash icon (splash_logo_animated, 800 ms); hold the splash
        // until it has played so a fast launch doesn't cut it short. Older versions show the
        // static logo, so they don't wait.
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            val splashShownAt = SystemClock.uptimeMillis()
            splashScreen.setKeepOnScreenCondition {
                SystemClock.uptimeMillis() - splashShownAt < SPLASH_ANIMATION_MS
            }
        }
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()

        setContent {
            val authState by authViewModel.uiState.collectAsStateWithLifecycle()
            val windowSizeClass = calculateWindowSizeClass(this)
            val darkTheme = when (authState.themeMode) {
                ThemeMode.SYSTEM -> isSystemInDarkTheme()
                ThemeMode.LIGHT -> false
                ThemeMode.DARK -> true
            }

            LaluzGarageTheme(darkTheme = darkTheme, dynamicColor = authState.dynamicColor) {
                LaluzApp(
                    windowWidthSizeClass = windowSizeClass.widthSizeClass,
                    authViewModel = authViewModel,
                    isDarkTheme = darkTheme
                )
            }
        }
    }

    private companion object {
        /** Matches windowSplashScreenAnimationDuration in values-v31/styles.xml. */
        const val SPLASH_ANIMATION_MS = 800L
    }
}
