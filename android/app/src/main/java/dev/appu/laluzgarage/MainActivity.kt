package dev.appu.laluzgarage

import android.graphics.Color
import android.os.Build
import android.os.Bundle
import androidx.activity.SystemBarStyle
import androidx.activity.enableEdgeToEdge
import android.view.View
import androidx.core.splashscreen.SplashScreen.Companion.installSplashScreen
import androidx.core.view.ViewCompat
import androidx.core.view.WindowCompat
import androidx.core.view.WindowInsetsAnimationCompat
import androidx.core.view.WindowInsetsCompat
import androidx.core.view.updatePadding
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
                @Suppress("DEPRECATION")
                if (Build.VERSION.SDK_INT < 35) {
                    window.isStatusBarContrastEnforced = false
                }
            }
            call.resolve()
        }
    }
}

class MainActivity : BridgeActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        registerPlugin(SystemBarsPlugin::class.java)
        registerPlugin(OtaUpdaterPlugin::class.java)
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
            @Suppress("DEPRECATION")
            if (Build.VERSION.SDK_INT < 35) {
                window.isStatusBarContrastEnforced = false
            }
        }

        setupKeyboardAnimation()
    }

    private fun setupKeyboardAnimation() {
        val webView = bridge?.webView
        val container = (webView?.parent as? View) ?: webView ?: findViewById(android.R.id.content)

        var isAnimating = false

        ViewCompat.setWindowInsetsAnimationCallback(
            container,
            object : WindowInsetsAnimationCompat.Callback(DISPATCH_MODE_STOP) {
                override fun onPrepare(animation: WindowInsetsAnimationCompat) {
                    if ((animation.typeMask and WindowInsetsCompat.Type.ime()) != 0) {
                        isAnimating = true
                    }
                }

                override fun onProgress(
                    insets: WindowInsetsCompat,
                    runningAnimations: List<WindowInsetsAnimationCompat>
                ): WindowInsetsCompat {
                    val imeBottom = insets.getInsets(WindowInsetsCompat.Type.ime()).bottom
                    container.updatePadding(bottom = imeBottom)
                    return insets
                }

                override fun onEnd(animation: WindowInsetsAnimationCompat) {
                    if ((animation.typeMask and WindowInsetsCompat.Type.ime()) != 0) {
                        isAnimating = false
                        val currentInsets = ViewCompat.getRootWindowInsets(container)
                        val imeBottom = currentInsets?.getInsets(WindowInsetsCompat.Type.ime())?.bottom ?: 0
                        container.updatePadding(bottom = imeBottom)
                    }
                }
            }
        )

        ViewCompat.setOnApplyWindowInsetsListener(container) { v, insets ->
            if (!isAnimating) {
                val imeBottom = insets.getInsets(WindowInsetsCompat.Type.ime()).bottom
                v.updatePadding(bottom = imeBottom)
            }
            insets
        }

        ViewCompat.requestApplyInsets(container)
    }
}
