package dev.appu.laluzgarage

import android.graphics.Color
import android.graphics.drawable.ColorDrawable
import android.os.Build
import android.os.Bundle
import android.view.WindowManager
import androidx.activity.SystemBarStyle
import androidx.activity.enableEdgeToEdge
import androidx.core.splashscreen.SplashScreen.Companion.installSplashScreen
import androidx.core.view.ViewCompat
import androidx.core.view.WindowCompat
import androidx.core.view.WindowInsetsCompat
import com.getcapacitor.BridgeActivity
import com.getcapacitor.JSObject
import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import com.getcapacitor.PluginMethod
import com.getcapacitor.annotation.CapacitorPlugin

@CapacitorPlugin(name = "AppSystemBars")
class AppSystemBarsPlugin : Plugin() {
    @PluginMethod
    fun setSystemBarsStyle(call: PluginCall) {
        val isDark = call.getBoolean("isDark", true) ?: true
        activity?.runOnUiThread {
            val window = activity?.window ?: return@runOnUiThread
            applySystemBars(window, isDark)
            val insetsData = getInsetsData()
            call.resolve(insetsData)
        }
    }

    private fun getInsetsData(): JSObject {
        val ret = JSObject()
        val act = activity ?: return ret
        val decorView = act.window?.decorView ?: return ret
        val insets = ViewCompat.getRootWindowInsets(decorView) ?: return ret

        val statusBarInsets = insets.getInsets(
            WindowInsetsCompat.Type.statusBars() or WindowInsetsCompat.Type.displayCutout()
        )
        val navBarInsets = insets.getInsets(WindowInsetsCompat.Type.navigationBars())
        val isImeVisible = insets.isVisible(WindowInsetsCompat.Type.ime())

        val density = act.resources.displayMetrics.density
        val topDp = (statusBarInsets.top / density).toInt()
        val bottomDp = if (isImeVisible) 0 else (navBarInsets.bottom / density).toInt()
        val leftDp = (statusBarInsets.left / density).toInt()
        val rightDp = (statusBarInsets.right / density).toInt()

        ret.put("top", topDp)
        ret.put("bottom", bottomDp)
        ret.put("left", leftDp)
        ret.put("right", rightDp)
        return ret
    }

    companion object {
        fun applySystemBars(window: android.view.Window, isDark: Boolean) {
            WindowCompat.setDecorFitsSystemWindows(window, false)

            val insetsController = WindowCompat.getInsetsController(window, window.decorView)
            insetsController.isAppearanceLightStatusBars = !isDark
            insetsController.isAppearanceLightNavigationBars = !isDark

            window.statusBarColor = Color.TRANSPARENT
            window.navigationBarColor = Color.TRANSPARENT

            val bgColor = if (isDark) Color.parseColor("#07080A") else Color.parseColor("#FFFFFF")
            window.setBackgroundDrawable(ColorDrawable(bgColor))
            window.decorView.setBackgroundColor(bgColor)

            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                window.isNavigationBarContrastEnforced = false
                @Suppress("DEPRECATION")
                if (Build.VERSION.SDK_INT < 35) {
                    window.isStatusBarContrastEnforced = false
                }
            }

            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
                window.attributes.layoutInDisplayCutoutMode =
                    WindowManager.LayoutParams.LAYOUT_IN_DISPLAY_CUTOUT_MODE_SHORT_EDGES
            }
        }
    }
}

class MainActivity : BridgeActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        registerPlugin(AppSystemBarsPlugin::class.java)
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

        AppSystemBarsPlugin.applySystemBars(window, isDark = true)
        WindowCompat.setDecorFitsSystemWindows(window, false)

        setupInsetsListener()
        preventWindowPan()
    }

    private var lastTopDp = -1
    private var lastBottomDp = -1
    private var lastLeftDp = -1
    private var lastRightDp = -1

    private fun setupInsetsListener() {
        ViewCompat.setOnApplyWindowInsetsListener(window.decorView) { _, insets ->
            val statusBarInsets = insets.getInsets(
                WindowInsetsCompat.Type.statusBars() or WindowInsetsCompat.Type.displayCutout()
            )
            val navBarInsets = insets.getInsets(WindowInsetsCompat.Type.navigationBars())
            val imeInsets = insets.getInsets(WindowInsetsCompat.Type.ime())
            val isImeVisible = insets.isVisible(WindowInsetsCompat.Type.ime())

            val density = resources.displayMetrics.density
            val topDp = (statusBarInsets.top / density).toInt()
            val bottomDp = if (isImeVisible) 0 else (navBarInsets.bottom / density).toInt()
            val leftDp = (statusBarInsets.left / density).toInt()
            val rightDp = (statusBarInsets.right / density).toInt()

            if (topDp != lastTopDp || bottomDp != lastBottomDp || leftDp != lastLeftDp || rightDp != lastRightDp) {
                lastTopDp = topDp
                lastBottomDp = bottomDp
                lastLeftDp = leftDp
                lastRightDp = rightDp

                bridge?.webView?.post {
                    val js = "document.documentElement.style.setProperty('--safe-area-inset-top', '${topDp}px');" +
                             "document.documentElement.style.setProperty('--safe-area-inset-bottom', '${bottomDp}px');" +
                             "document.documentElement.style.setProperty('--safe-area-inset-left', '${leftDp}px');" +
                             "document.documentElement.style.setProperty('--safe-area-inset-right', '${rightDp}px');"
                    bridge?.webView?.evaluateJavascript(js, null)
                }
            }

            insets
        }
    }

    private fun preventWindowPan() {
        // Enforce window scroll offset stays at 0 so Android WindowManager never pans the Activity window upwards
        window.decorView.viewTreeObserver.addOnScrollChangedListener {
            if (window.decorView.scrollY != 0) {
                window.decorView.scrollY = 0
            }
        }
    }

    override fun onResume() {
        super.onResume()
        WindowCompat.setDecorFitsSystemWindows(window, false)
        AppSystemBarsPlugin.applySystemBars(window, isDark = true)
    }
}


