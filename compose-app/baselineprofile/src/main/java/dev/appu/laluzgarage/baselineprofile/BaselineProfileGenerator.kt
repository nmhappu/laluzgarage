package dev.appu.laluzgarage.baselineprofile

import androidx.benchmark.macro.junit4.BaselineProfileRule
import androidx.test.ext.junit.runners.AndroidJUnit4
import androidx.test.uiautomator.UiDevice
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith

/**
 * Records the app's critical user journeys (cold start, dashboard scroll, Services list scroll)
 * so ART can precompile them. Strictly read-only: it never taps save/delete/intake controls.
 * The device must already be signed in to the app.
 */
@RunWith(AndroidJUnit4::class)
class BaselineProfileGenerator {

    @get:Rule
    val rule = BaselineProfileRule()

    @Test
    fun generate() = rule.collect(
        packageName = "dev.appu.laluzgarage",
        includeInStartupProfile = true
    ) {
        pressHome()
        startActivityAndWait()
        device.waitForIdle(3_000)

        // Dashboard
        scrollList(device)

        // Services tab (4th item in the bottom nav) -> list + filter pills
        device.click((device.displayWidth * 0.74f).toInt(), (device.displayHeight * 0.915f).toInt())
        device.waitForIdle(2_000)
        scrollList(device)
    }

    private fun scrollList(device: UiDevice) {
        val x = device.displayWidth / 2
        val top = (device.displayHeight * 0.25f).toInt()
        val bottom = (device.displayHeight * 0.70f).toInt()
        repeat(3) {
            device.swipe(x, bottom, x, top, 20)
            device.waitForIdle()
        }
        repeat(3) {
            device.swipe(x, top, x, bottom, 20)
            device.waitForIdle()
        }
    }
}
