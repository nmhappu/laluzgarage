package dev.appu.laluzgarage.data.update

import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Build
import android.provider.Settings
import androidx.core.content.FileProvider
import androidx.core.content.pm.PackageInfoCompat
import dagger.hilt.android.qualifiers.ApplicationContext
import kotlinx.coroutines.CoroutineDispatcher
import kotlinx.coroutines.ensureActive
import kotlinx.coroutines.withContext
import org.json.JSONArray
import java.io.File
import java.net.HttpURLConnection
import java.net.URL
import java.time.Instant
import java.time.LocalDate
import java.time.ZoneId
import javax.inject.Inject
import javax.inject.Singleton
import kotlinx.coroutines.currentCoroutineContext

enum class ReleaseChannel { STABLE, DEV }

data class ReleaseInfo(
    val tagName: String,
    /** Version without the leading "v", e.g. "2.0.0" or "2.1.0-dev". */
    val version: String,
    val publishedOn: LocalDate?,
    val notes: List<String>,
    val apkUrl: String,
    val apkName: String,
    val apkSize: Long,
    val htmlUrl: String
)

/**
 * [hasUpdate]: [latest] is newer than the installed build. [revert]: the stable channel's latest is
 * older than an installed development build; installing it goes back to stable.
 */
data class UpdateCheck(
    val currentVersion: String,
    val latest: ReleaseInfo?,
    val hasUpdate: Boolean,
    val revert: Boolean = false
)

/** A newer release found by the launch check, shown as a card on the dashboard. */
data class LaunchUpdate(val channel: ReleaseChannel, val release: ReleaseInfo)

/**
 * GitHub release updater: the native port of the web app's otaUpdateService and the Capacitor
 * OtaUpdater plugin. Checks the repo's releases on the chosen channel, downloads the APK into
 * the cache and hands it to the package installer.
 */
@Singleton
class AppUpdater @Inject constructor(
    @ApplicationContext private val context: Context,
    private val ioDispatcher: CoroutineDispatcher
) {
    private val prefs = context.getSharedPreferences("laluz_prefs", Context.MODE_PRIVATE)

    var channel: ReleaseChannel
        get() = if (prefs.getString(KEY_CHANNEL, null) == "dev") ReleaseChannel.DEV else ReleaseChannel.STABLE
        set(value) = prefs.edit().putString(KEY_CHANNEL, if (value == ReleaseChannel.DEV) "dev" else "stable").apply()

    var autoCheck: Boolean
        get() = prefs.getBoolean(KEY_AUTO_CHECK, true)
        set(value) = prefs.edit().putBoolean(KEY_AUTO_CHECK, value).apply()

    val installedVersion: String
        get() = runCatching { context.packageManager.getPackageInfo(context.packageName, 0).versionName }
            .getOrNull() ?: "0.0.0"

    val installedVersionCode: Long
        get() = runCatching { PackageInfoCompat.getLongVersionCode(context.packageManager.getPackageInfo(context.packageName, 0)) }
            .getOrDefault(0L)

    /** True when the installed build carries a pre-release tag (a development build). */
    val isDevBuild: Boolean get() = PreTag.containsMatchIn(installedVersion)

    suspend fun check(channel: ReleaseChannel = this.channel): UpdateCheck = withContext(ioDispatcher) {
        evaluate(fetchReleases(), channel)
    }

    /** Both channels from one request; used by the launch check. */
    suspend fun checkAll(): Map<ReleaseChannel, UpdateCheck> = withContext(ioDispatcher) {
        val all = fetchReleases()
        ReleaseChannel.entries.associateWith { evaluate(all, it) }
    }

    private fun fetchReleases(): JSONArray {
        val conn = (URL("https://api.github.com/repos/$OWNER/$REPO/releases").openConnection() as HttpURLConnection).apply {
            setRequestProperty("Accept", "application/vnd.github.v3+json")
            setRequestProperty("User-Agent", "LaluzGarage-Updater")
            connectTimeout = 15_000
            readTimeout = 15_000
        }
        val body = try {
            if (conn.responseCode !in 200..299) error("GitHub returned HTTP ${conn.responseCode}")
            conn.inputStream.bufferedReader().use { it.readText() }
        } finally {
            conn.disconnect()
        }
        return JSONArray(body)
    }

    private fun evaluate(all: JSONArray, channel: ReleaseChannel): UpdateCheck {
        val current = installedVersion
        val release = pickRelease(all, channel)
        val cmp = release?.let { compareVersions(it.version, current) } ?: 0
        return UpdateCheck(
            currentVersion = current,
            latest = release,
            hasUpdate = release != null && cmp > 0,
            revert = release != null && cmp < 0 && channel == ReleaseChannel.STABLE &&
                isDevBuild && !PreTag.containsMatchIn(release.tagName)
        )
    }

    /** The tag of the launch card the user last dismissed on [channel]; that release isn't shown again. */
    fun dismissedTag(channel: ReleaseChannel): String? = prefs.getString(dismissKey(channel), null)

    fun dismiss(update: LaunchUpdate) = prefs.edit().putString(dismissKey(update.channel), update.release.tagName).apply()

    private fun dismissKey(channel: ReleaseChannel) = KEY_DISMISSED + channel.name.lowercase()

    /** versionCode of a downloaded APK, or null if it can't be read. */
    fun apkVersionCode(apk: File): Long? =
        runCatching { context.packageManager.getPackageArchiveInfo(apk.path, 0)?.let(PackageInfoCompat::getLongVersionCode) }.getOrNull()

    private fun pickRelease(all: JSONArray, channel: ReleaseChannel): ReleaseInfo? {
        val releases = List(all.length()) { all.getJSONObject(it) }.filter { !it.optBoolean("draft") }
        // Stable never falls back to dev builds. Highest version first, whatever order they were uploaded in.
        val eligible = (if (channel == ReleaseChannel.STABLE) {
            releases.filter { !it.optBoolean("prerelease") && !PreTag.containsMatchIn(it.optString("tag_name")) }
        } else releases).sortedWith { a, b -> compareVersions(b.optString("tag_name"), a.optString("tag_name")) }
        for (r in eligible) {
            val assets = r.optJSONArray("assets") ?: continue
            val apk = List(assets.length()) { assets.getJSONObject(it) }.firstOrNull {
                it.optString("name").endsWith(".apk") || it.optString("content_type") == APK_MIME
            } ?: continue
            val tag = r.optString("tag_name")
            return ReleaseInfo(
                tagName = tag,
                version = normalizeVersion(tag),
                publishedOn = runCatching {
                    Instant.parse(r.optString("published_at")).atZone(ZoneId.systemDefault()).toLocalDate()
                }.getOrNull(),
                notes = releaseNotes(r.optString("body")),
                apkUrl = apk.optString("browser_download_url"),
                apkName = apk.optString("name").ifEmpty { "update.apk" },
                apkSize = apk.optLong("size"),
                htmlUrl = r.optString("html_url").ifEmpty { RELEASES_URL }
            )
        }
        return null
    }

    /** Markdown body to plain bullet lines; headings and blank lines are dropped. */
    private fun releaseNotes(body: String): List<String> =
        body.lines()
            .map { it.trim() }
            .filter { it.isNotEmpty() && !it.startsWith("#") }
            .map { it.removePrefix("- ").removePrefix("* ").removePrefix("• ").replace("**", "").trim() }
            .filter { it.isNotEmpty() }
            .take(12)

    /** Downloads the APK into cache/updates, reporting bytes read and total. Returns the file. */
    suspend fun download(release: ReleaseInfo, onProgress: (read: Long, total: Long) -> Unit): File = withContext(ioDispatcher) {
        val dir = File(context.cacheDir, "updates").apply { mkdirs() }
        dir.listFiles()?.filter { it.name.endsWith(".apk") }?.forEach { it.delete() }
        val target = File(dir, if (release.apkName.endsWith(".apk")) release.apkName else "${release.apkName}.apk")
        // GitHub asset URLs redirect to a CDN host; HttpURLConnection follows same-protocol redirects.
        val conn = (URL(release.apkUrl).openConnection() as HttpURLConnection).apply {
            instanceFollowRedirects = true
            setRequestProperty("User-Agent", "LaluzGarage-Updater")
            connectTimeout = 30_000
            readTimeout = 30_000
        }
        try {
            if (conn.responseCode !in 200..299) error("Download failed: HTTP ${conn.responseCode}")
            val total = conn.contentLengthLong.takeIf { it > 0 } ?: release.apkSize
            var read = 0L
            var lastReport = 0L
            conn.inputStream.use { input ->
                target.outputStream().use { output ->
                    val buffer = ByteArray(32 * 1024)
                    while (true) {
                        currentCoroutineContext().ensureActive()
                        val n = input.read(buffer)
                        if (n < 0) break
                        output.write(buffer, 0, n)
                        read += n
                        val now = System.currentTimeMillis()
                        if (now - lastReport > 120) {
                            lastReport = now
                            onProgress(read, total)
                        }
                    }
                }
            }
            onProgress(read, if (total > 0) total else read)
        } finally {
            conn.disconnect()
        }
        target
    }

    fun canInstallPackages(): Boolean =
        Build.VERSION.SDK_INT < Build.VERSION_CODES.O || context.packageManager.canRequestPackageInstalls()

    fun openInstallPermissionSettings() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return
        context.startActivity(
            Intent(Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES, Uri.parse("package:${context.packageName}"))
                .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        )
    }

    /** Opens the system installer for [apk]. Needs [canInstallPackages]. */
    fun install(apk: File) {
        val uri = FileProvider.getUriForFile(context, "${context.packageName}.fileprovider", apk)
        context.startActivity(
            Intent(Intent.ACTION_VIEW)
                .setDataAndType(uri, APK_MIME)
                .addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION or Intent.FLAG_ACTIVITY_NEW_TASK)
        )
    }

    companion object {
        const val OWNER = "nmhappu"
        // Public, APK-only repo. The source repo is private, so its releases need a token.
        const val REPO = "laluzgarage-releases"
        const val RELEASES_URL = "https://github.com/$OWNER/$REPO/releases"
        private const val APK_MIME = "application/vnd.android.package-archive"
        private const val KEY_CHANNEL = "laluz_ota_channel"
        private const val KEY_AUTO_CHECK = "laluz_ota_auto_check"
        private const val KEY_DISMISSED = "laluz_ota_dismissed_"
        private val PreTag = Regex("-(?:dev|alpha|beta|canary|rc)", RegexOption.IGNORE_CASE)

        /** Dot-separated pre-release parts; numeric parts compare as numbers (dev.10 > dev.9 > dev). */
        private fun comparePre(a: String, b: String): Int {
            val pa = a.split('.')
            val pb = b.split('.')
            for (i in 0 until maxOf(pa.size, pb.size)) {
                val x = pa.getOrNull(i) ?: return -1
                val y = pb.getOrNull(i) ?: return 1
                val nx = x.toIntOrNull()
                val ny = y.toIntOrNull()
                val c = if (nx != null && ny != null) nx.compareTo(ny) else x.compareTo(y)
                if (c != 0) return c
            }
            return 0
        }

        fun normalizeVersion(raw: String): String =
            raw.trim().removePrefix("v").removePrefix("V").replace(Regex("^release-", RegexOption.IGNORE_CASE), "")

        /** Semver compare; a release without a pre-release tag sorts after one with it. */
        fun compareVersions(a: String, b: String): Int {
            fun split(v: String): Pair<List<Int>, String?> {
                val clean = normalizeVersion(v)
                val cut = clean.indexOfFirst { it == '-' || it == '+' }
                val main = if (cut >= 0) clean.substring(0, cut) else clean
                val pre = if (cut >= 0) clean.substring(cut + 1).lowercase() else null
                val parts = main.split('.').map { it.toIntOrNull() ?: 0 }
                return List(3) { parts.getOrElse(it) { 0 } } to pre
            }
            val (pa, preA) = split(a)
            val (pb, preB) = split(b)
            for (i in 0 until 3) if (pa[i] != pb[i]) return pa[i].compareTo(pb[i])
            return when {
                preA == null && preB == null -> 0
                preA == null -> 1
                preB == null -> -1
                else -> comparePre(preA, preB)
            }
        }
    }
}
