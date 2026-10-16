package dev.appu.laluzgarage.ui.components

import androidx.compose.runtime.Composable
import androidx.compose.runtime.remember
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import coil.compose.AsyncImage
import coil.request.ImageRequest

/** Pixel size requested from Google: sharp on the 88dp settings avatar at 3.5x density. */
private const val PhotoPx = 512

private val SizeSuffix = Regex("=s\\d+(-[a-z]+)*$")
private val SizePathSegment = Regex("/s\\d+(-[a-z]+)*/")

/**
 * Google account photos (lh3.googleusercontent.com) come at 96px by default; the size is part of the
 * URL ("=s96-c", or "/s96-c/" in older links). Ask for [PhotoPx] instead. Other URLs pass through.
 */
fun highResPhotoUrl(url: String?): String? {
    if (url.isNullOrBlank()) return null
    if ("googleusercontent.com" !in url) return url
    return when {
        SizeSuffix.containsMatchIn(url) -> url.replace(SizeSuffix, "=s$PhotoPx-c")
        SizePathSegment.containsMatchIn(url) -> url.replace(SizePathSegment, "/s$PhotoPx-c/")
        else -> "$url=s$PhotoPx-c"
    }
}

/**
 * The account photo, cropped to a circle and filling [modifier]. Draw it over the initials: until it
 * loads, or if there is none or it fails, it draws nothing and the initials show through.
 */
@Composable
fun ProfilePhoto(photoUrl: String?, modifier: Modifier = Modifier) {
    val url = remember(photoUrl) { highResPhotoUrl(photoUrl) } ?: return
    val context = LocalContext.current
    AsyncImage(
        model = remember(url) { ImageRequest.Builder(context).data(url).crossfade(true).build() },
        contentDescription = null,
        contentScale = ContentScale.Crop,
        modifier = modifier.clip(CircleShape)
    )
}
