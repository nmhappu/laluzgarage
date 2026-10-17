package dev.appu.laluzgarage

import android.content.Intent
import android.net.Uri
import android.os.Build
import android.provider.Settings
import androidx.core.content.FileProvider
import com.getcapacitor.JSObject
import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import com.getcapacitor.PluginMethod
import com.getcapacitor.annotation.CapacitorPlugin
import java.io.File
import java.io.FileOutputStream
import java.net.HttpURLConnection
import java.net.URL
import kotlin.concurrent.thread

@CapacitorPlugin(name = "OtaUpdater")
class OtaUpdaterPlugin : Plugin() {

    @PluginMethod
    fun getAppInfo(call: PluginCall) {
        try {
            val pInfo = context.packageManager.getPackageInfo(context.packageName, 0)
            val versionName = pInfo.versionName ?: "1.0"
            @Suppress("DEPRECATION")
            val versionCode = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
                pInfo.longVersionCode
            } else {
                pInfo.versionCode.toLong()
            }

            val ret = JSObject().apply {
                put("versionName", versionName)
                put("versionCode", versionCode)
                put("packageName", context.packageName)
            }
            call.resolve(ret)
        } catch (e: Exception) {
            call.reject("Failed to retrieve app info: ${e.message}", e)
        }
    }

    @PluginMethod
    fun canRequestPackageInstalls(call: PluginCall) {
        val canInstall = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            context.packageManager.canRequestPackageInstalls()
        } else {
            true
        }
        val ret = JSObject().apply {
            put("canInstall", canInstall)
        }
        call.resolve(ret)
    }

    @PluginMethod
    fun openInstallPermissionSettings(call: PluginCall) {
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                val intent = Intent(Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES).apply {
                    data = Uri.parse("package:${context.packageName}")
                    addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                }
                activity?.startActivity(intent)
            }
            val ret = JSObject().apply {
                put("opened", true)
            }
            call.resolve(ret)
        } catch (e: Exception) {
            call.reject("Failed to open install settings: ${e.message}", e)
        }
    }

    @PluginMethod
    fun downloadUpdate(call: PluginCall) {
        val downloadUrl = call.getString("url")
        if (downloadUrl.isNullOrBlank()) {
            call.reject("Download URL cannot be empty")
            return
        }

        val rawFileName = call.getString("fileName") ?: "update.apk"
        val fileName = if (rawFileName.endsWith(".apk")) rawFileName else "$rawFileName.apk"

        thread(name = "OtaDownloadThread") {
            try {
                val updatesDir = File(context.cacheDir, "updates")
                if (!updatesDir.exists()) {
                    updatesDir.mkdirs()
                }

                // Clean up any older downloaded updates in cache
                updatesDir.listFiles()?.forEach { file ->
                    if (file.name.endsWith(".apk")) {
                        try { file.delete() } catch (_: Exception) {}
                    }
                }

                val destinationFile = File(updatesDir, fileName)

                var currentUrl = downloadUrl
                var connection: HttpURLConnection? = null
                var redirectCount = 0
                val maxRedirects = 8

                while (redirectCount < maxRedirects) {
                    val url = URL(currentUrl)
                    connection = (url.openConnection() as HttpURLConnection).apply {
                        instanceFollowRedirects = true
                        setRequestProperty("User-Agent", "LaluzGarage-Updater")
                        connectTimeout = 30000
                        readTimeout = 30000
                    }
                    connection.connect()

                    val responseCode = connection.responseCode
                    if (responseCode == HttpURLConnection.HTTP_MOVED_PERM ||
                        responseCode == HttpURLConnection.HTTP_MOVED_TEMP ||
                        responseCode == HttpURLConnection.HTTP_SEE_OTHER ||
                        responseCode == 307 || responseCode == 308
                    ) {
                        val newUrl = connection.getHeaderField("Location")
                        connection.disconnect()
                        if (!newUrl.isNullOrBlank()) {
                            currentUrl = newUrl
                            redirectCount++
                            continue
                        }
                    }
                    break
                }

                val activeConn = connection ?: throw IllegalStateException("Failed to open HTTP connection")
                if (activeConn.responseCode !in 200..299) {
                    throw IllegalStateException("Server returned HTTP ${activeConn.responseCode}: ${activeConn.responseMessage}")
                }

                val fileLength: Long = activeConn.contentLength.toLong()
                val inputStream = activeConn.inputStream
                val outputStream = FileOutputStream(destinationFile)

                val buffer = ByteArray(32768)
                var bytesRead: Int
                var totalBytesRead: Long = 0
                var lastEmittedPercent = -1
                var lastEmittedTime: Long = 0

                try {
                    while (inputStream.read(buffer).also { bytesRead = it } != -1) {
                        outputStream.write(buffer, 0, bytesRead)
                        totalBytesRead += bytesRead

                        val percent = if (fileLength > 0) {
                            ((totalBytesRead * 100) / fileLength).toInt().coerceIn(0, 100)
                        } else {
                            0
                        }

                        val now = System.currentTimeMillis()
                        if (percent != lastEmittedPercent || now - lastEmittedTime > 150) {
                            lastEmittedPercent = percent
                            lastEmittedTime = now
                            val progressObj = JSObject().apply {
                                put("progress", percent)
                                put("bytesRead", totalBytesRead)
                                put("totalBytes", fileLength)
                            }
                            notifyListeners("downloadProgress", progressObj)
                        }
                    }
                    outputStream.flush()
                } finally {
                    try { outputStream.close() } catch (_: Exception) {}
                    try { inputStream.close() } catch (_: Exception) {}
                    try { activeConn.disconnect() } catch (_: Exception) {}
                }

                // Final 100% notification
                notifyListeners("downloadProgress", JSObject().apply {
                    put("progress", 100)
                    put("bytesRead", totalBytesRead)
                    put("totalBytes", if (fileLength > 0) fileLength else totalBytesRead)
                })

                val ret = JSObject().apply {
                    put("filePath", destinationFile.absolutePath)
                    put("fileName", destinationFile.name)
                    put("fileSize", destinationFile.length())
                }
                call.resolve(ret)
            } catch (e: Exception) {
                call.reject("Download failed: ${e.message}", e)
            }
        }
    }

    @PluginMethod
    fun installUpdate(call: PluginCall) {
        try {
            val filePath = call.getString("filePath")
            val apkFile = if (!filePath.isNullOrBlank()) {
                File(filePath)
            } else {
                val updatesDir = File(context.cacheDir, "updates")
                updatesDir.listFiles()?.firstOrNull { it.name.endsWith(".apk") }
                    ?: File(updatesDir, "update.apk")
            }

            if (!apkFile.exists()) {
                call.reject("APK file not found at: ${apkFile.absolutePath}")
                return
            }

            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                if (!context.packageManager.canRequestPackageInstalls()) {
                    val ret = JSObject().apply {
                        put("success", false)
                        put("permissionNeeded", true)
                        put("message", "Package install permission required.")
                    }
                    call.resolve(ret)
                    return
                }
            }

            val authority = "${context.packageName}.fileprovider"
            val apkUri = FileProvider.getUriForFile(context, authority, apkFile)

            val installIntent = Intent(Intent.ACTION_VIEW).apply {
                setDataAndType(apkUri, "application/vnd.android.package-archive")
                addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
                addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            }

            activity?.startActivity(installIntent)

            val ret = JSObject().apply {
                put("success", true)
            }
            call.resolve(ret)
        } catch (e: Exception) {
            call.reject("Failed to trigger update installation: ${e.message}", e)
        }
    }

    @PluginMethod
    fun deleteDownloadedUpdate(call: PluginCall) {
        try {
            val updatesDir = File(context.cacheDir, "updates")
            var deletedCount = 0
            if (updatesDir.exists()) {
                updatesDir.listFiles()?.forEach {
                    if (it.name.endsWith(".apk")) {
                        if (it.delete()) deletedCount++
                    }
                }
            }
            val ret = JSObject().apply {
                put("deleted", true)
                put("deletedCount", deletedCount)
            }
            call.resolve(ret)
        } catch (e: Exception) {
            call.reject("Failed to clean up downloaded files: ${e.message}", e)
        }
    }
}
