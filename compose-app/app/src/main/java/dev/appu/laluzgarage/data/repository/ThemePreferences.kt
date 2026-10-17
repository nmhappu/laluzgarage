package dev.appu.laluzgarage.data.repository

import android.app.UiModeManager
import android.content.Context
import android.os.Build
import dagger.hilt.android.qualifiers.ApplicationContext
import dev.appu.laluzgarage.ui.theme.ThemeMode
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import javax.inject.Inject
import javax.inject.Singleton

/**
 * Persists the System / Light / Dark theme setting, the Material You toggle and which accounts have
 * picked a theme on first sign-in, across launches.
 */
@Singleton
class ThemePreferences @Inject constructor(
    @ApplicationContext context: Context
) {
    private val prefs = context.getSharedPreferences("laluz_prefs", Context.MODE_PRIVATE)
    private val uiModeManager = context.getSystemService(UiModeManager::class.java)

    private val _themeMode = MutableStateFlow(
        runCatching { ThemeMode.valueOf(prefs.getString(KEY_THEME, null) ?: ThemeMode.SYSTEM.name) }
            .getOrDefault(ThemeMode.SYSTEM)
    )
    val themeMode: StateFlow<ThemeMode> = _themeMode.asStateFlow()

    init {
        // Covers installs that chose a mode before the system splash followed it.
        applyToSystem(_themeMode.value)
    }

    // Off by default so the LaluZ brand palette shows until the user opts in.
    private val _dynamicColor = MutableStateFlow(prefs.getBoolean(KEY_DYNAMIC_COLOR, false))
    val dynamicColor: StateFlow<Boolean> = _dynamicColor.asStateFlow()

    fun setThemeMode(mode: ThemeMode) {
        _themeMode.value = mode
        prefs.edit().putString(KEY_THEME, mode.name).apply()
        applyToSystem(mode)
    }

    /**
     * Tells the system the app's night mode so the launch splash, drawn before any app code runs,
     * uses the matching values / values-night resources. The system persists it across launches.
     */
    private fun applyToSystem(mode: ThemeMode) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.S) return
        uiModeManager?.setApplicationNightMode(
            when (mode) {
                ThemeMode.SYSTEM -> UiModeManager.MODE_NIGHT_AUTO
                ThemeMode.LIGHT -> UiModeManager.MODE_NIGHT_NO
                ThemeMode.DARK -> UiModeManager.MODE_NIGHT_YES
            }
        )
    }

    fun setDynamicColor(enabled: Boolean) {
        _dynamicColor.value = enabled
        prefs.edit().putBoolean(KEY_DYNAMIC_COLOR, enabled).apply()
    }

    // Accounts that have been through the first sign-in theme picker on this device.
    private val _themeChosenBy = MutableStateFlow(prefs.getStringSet(KEY_THEME_CHOSEN_BY, null).orEmpty().toSet())
    val themeChosenBy: StateFlow<Set<String>> = _themeChosenBy.asStateFlow()

    fun markThemeChosen(uid: String) {
        val next = _themeChosenBy.value + uid
        _themeChosenBy.value = next
        prefs.edit().putStringSet(KEY_THEME_CHOSEN_BY, next).apply()
    }

    private companion object {
        const val KEY_THEME = "theme_mode"
        const val KEY_DYNAMIC_COLOR = "dynamic_color"
        const val KEY_THEME_CHOSEN_BY = "theme_chosen_by"
    }
}
