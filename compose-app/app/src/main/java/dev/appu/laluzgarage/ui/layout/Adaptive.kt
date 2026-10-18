package dev.appu.laluzgarage.ui.layout

import androidx.compose.runtime.Composable
import androidx.compose.runtime.Immutable
import androidx.compose.runtime.compositionLocalOf
import androidx.compose.runtime.remember
import androidx.compose.ui.platform.LocalConfiguration

/**
 * Window classes from the Tablet Design canvas (Material 3 breakpoints): under 600dp is the phone
 * layout with the floating toolbar; from 600dp a navigation rail replaces it, details open in a side
 * sheet and lists sit in a content card; from 1200dp the rail starts expanded.
 */
@Immutable
data class Adaptive(val widthDp: Int) {
    val isTablet: Boolean get() = widthDp >= TabletMinDp

    /** The wide windows where the rail starts expanded and a side sheet is coplanar with the content. */
    val isLarge: Boolean get() = widthDp >= LargeMinDp
}

const val TabletMinDp = 600
const val LargeMinDp = 1200

val LocalAdaptive = compositionLocalOf { Adaptive(widthDp = 0) }

@Composable
fun rememberAdaptive(): Adaptive {
    val width = LocalConfiguration.current.screenWidthDp
    return remember(width) { Adaptive(width) }
}
