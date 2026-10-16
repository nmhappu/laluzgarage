package dev.appu.laluzgarage

import android.os.Bundle
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
        installSplashScreen()
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
}
