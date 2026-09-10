package com.gearbox.workshop

import android.graphics.Color
import android.os.Build
import android.os.Bundle
import androidx.activity.SystemBarStyle
import androidx.activity.enableEdgeToEdge
import androidx.core.splashscreen.SplashScreen.Companion.installSplashScreen
import androidx.core.view.WindowCompat
import com.getcapacitor.BridgeActivity
import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import com.getcapacitor.PluginMethod
import com.getcapacitor.annotation.CapacitorPlugin

@CapacitorPlugin(name = "SystemBars")
class SystemBarsPlugin : Plugin() {
    @PluginMethod
    fun setSystemBarsStyle(call: PluginCall) {
        val isDark = call.getBoolean("isDark", true) ?: true
        activity?.runOnUiThread {
            val window = activity?.window ?: return@runOnUiThread
            val insetsController = WindowCompat.getInsetsController(window, window.decorView)
            insetsController.isAppearanceLightStatusBars = !isDark
            insetsController.isAppearanceLightNavigationBars = !isDark

            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                window.isNavigationBarContrastEnforced = false
                window.isStatusBarContrastEnforced = false
            }
            call.resolve()
        }
    }
}

class MainActivity : BridgeActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        registerPlugin(SystemBarsPlugin::class.java)
        installSplashScreen()

        val transparentStyle = SystemBarStyle.auto(
            Color.TRANSPARENT,
            Color.TRANSPARENT
        )
        enableEdgeToEdge(
            statusBarStyle = transparentStyle,
            navigationBarStyle = transparentStyle
        )

        super.onCreate(savedInstanceState)

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            window.isNavigationBarContrastEnforced = false
            window.isStatusBarContrastEnforced = false
        }
    }
}
