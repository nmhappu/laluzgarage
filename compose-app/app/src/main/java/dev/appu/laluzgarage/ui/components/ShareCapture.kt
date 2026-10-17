package dev.appu.laluzgarage.ui.components

import android.content.Context
import android.content.Intent
import android.graphics.Bitmap
import androidx.compose.runtime.Composable
import androidx.compose.runtime.remember
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.drawWithContent
import androidx.compose.ui.graphics.asAndroidBitmap
import androidx.compose.ui.graphics.layer.GraphicsLayer
import androidx.compose.ui.graphics.layer.drawLayer
import androidx.compose.ui.graphics.rememberGraphicsLayer
import androidx.core.content.FileProvider
import java.io.File

/**
 * Records the composable it is applied to into a layer so the same region can be
 * captured as an image on demand (plate down to the customer card).
 */
@Composable
fun rememberShareCapture(): ShareCapture {
    val layer = rememberGraphicsLayer()
    return remember(layer) { ShareCapture(layer) }
}

class ShareCapture(private val layer: GraphicsLayer) {
    /** Apply to the Column that holds the area to share. Give it a background first so the image is opaque. */
    val modifier: Modifier = Modifier.drawWithContent {
        layer.record { this@drawWithContent.drawContent() }
        drawLayer(layer)
    }

    suspend fun share(context: Context, fileName: String, chooserTitle: String) {
        val bitmap = layer.toImageBitmap().asAndroidBitmap()
        val dir = File(context.cacheDir, "shared").apply { mkdirs() }
        dir.listFiles()?.forEach { it.delete() }
        val file = File(dir, "$fileName.png")
        file.outputStream().use { bitmap.compress(Bitmap.CompressFormat.PNG, 100, it) }
        val uri = FileProvider.getUriForFile(context, "${context.packageName}.fileprovider", file)
        val send = Intent(Intent.ACTION_SEND).apply {
            type = "image/png"
            putExtra(Intent.EXTRA_STREAM, uri)
            addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
        }
        context.startActivity(Intent.createChooser(send, chooserTitle).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK))
    }
}
