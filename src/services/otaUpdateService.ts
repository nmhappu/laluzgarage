import { Capacitor, registerPlugin, type PluginListenerHandle } from '@capacitor/core';

export type OtaChannel = 'stable' | 'dev';

export interface OtaReleaseAsset {
  id: number;
  name: string;
  size: number;
  browser_download_url: string;
  content_type: string;
}

export interface GitHubRelease {
  id: number;
  tag_name: string;
  name: string;
  body: string;
  draft: boolean;
  prerelease: boolean;
  published_at: string;
  html_url: string;
  assets: OtaReleaseAsset[];
}

export interface OtaReleaseInfo {
  id: number;
  tagName: string;
  name: string;
  body: string;
  publishedAt: string;
  isPrerelease: boolean;
  channel: OtaChannel;
  apkUrl: string;
  apkName: string;
  apkSize: number;
  htmlUrl: string;
  cleanVersion: string;
}

export interface UpdateCheckResult {
  hasUpdate: boolean;
  currentVersion: string;
  latestVersion: string;
  release: OtaReleaseInfo | null;
  channel: OtaChannel;
  checkedAt: string;
}

export interface NativeAppInfo {
  versionName: string;
  versionCode: number;
  packageName: string;
}

export interface DownloadProgress {
  progress: number;
  bytesRead: number;
  totalBytes: number;
}

export interface InstallResult {
  success: boolean;
  permissionNeeded?: boolean;
  message?: string;
}

export interface OtaUpdaterPluginInterface {
  getAppInfo(): Promise<NativeAppInfo>;
  canRequestPackageInstalls(): Promise<{ canInstall: boolean }>;
  openInstallPermissionSettings(): Promise<{ opened: boolean }>;
  downloadUpdate(options: { url: string; fileName?: string }): Promise<{ filePath: string; fileName: string; fileSize: number }>;
  installUpdate(options?: { filePath?: string }): Promise<InstallResult>;
  deleteDownloadedUpdate(): Promise<{ deleted: boolean; deletedCount: number }>;
  addListener(eventName: 'downloadProgress', listenerFunc: (info: DownloadProgress) => void): Promise<PluginListenerHandle>;
}

const NativeOtaUpdater = registerPlugin<OtaUpdaterPluginInterface>('OtaUpdater');

// GitHub repository info
export const GITHUB_OWNER = 'nmhappu';
export const GITHUB_REPO = 'laluzgarage';
export const DEFAULT_WEB_VERSION = '0.2.0';

// Storage keys
export const STORAGE_KEYS = {
  CHANNEL: 'laluz_ota_channel',
  AUTO_CHECK: 'laluz_ota_auto_check',
  LAST_CHECKED: 'laluz_ota_last_checked',
  CACHED_RESULT: 'laluz_ota_cached_result',
} as const;

/**
 * Normalizes version strings by removing prefixes ('v', 'release-')
 * and standardizing format.
 */
export function normalizeVersion(rawVersion: string): string {
  if (!rawVersion) return '0.0.0';
  let cleaned = rawVersion.trim().replace(/^[vV]/, '').replace(/^release-/i, '');
  return cleaned;
}

/**
 * Parses a version into major, minor, patch and prerelease tag.
 */
export function parseSemver(vStr: string): { major: number; minor: number; patch: number; prerelease: string | null } {
  const cleaned = normalizeVersion(vStr);
  const prereleaseIndex = cleaned.search(/[-+]/);
  let mainPart = cleaned;
  let prerelease: string | null = null;

  if (prereleaseIndex !== -1) {
    mainPart = cleaned.substring(0, prereleaseIndex);
    prerelease = cleaned.substring(prereleaseIndex + 1);
  }

  const parts = mainPart.split('.').map(p => parseInt(p, 10) || 0);
  return {
    major: parts[0] ?? 0,
    minor: parts[1] ?? 0,
    patch: parts[2] ?? 0,
    prerelease: prerelease ? prerelease.toLowerCase() : null,
  };
}

/**
 * Compares two semantic version strings.
 * Returns:
 *   1 if v1 > v2 (v1 is newer)
 *  -1 if v1 < v2 (v1 is older)
 *   0 if v1 === v2
 */
export function compareSemver(v1: string, v2: string): number {
  const p1 = parseSemver(v1);
  const p2 = parseSemver(v2);

  if (p1.major !== p2.major) return p1.major > p2.major ? 1 : -1;
  if (p1.minor !== p2.minor) return p1.minor > p2.minor ? 1 : -1;
  if (p1.patch !== p2.patch) return p1.patch > p2.patch ? 1 : -1;

  // If major.minor.patch are equal:
  // A version with NO prerelease is GREATER than a version with a prerelease.
  // e.g. 1.0.0 > 1.0.0-dev
  if (!p1.prerelease && p2.prerelease) return 1;
  if (p1.prerelease && !p2.prerelease) return -1;
  if (!p1.prerelease && !p2.prerelease) return 0;

  // Both have prereleases: compare lexicographically or numerically
  if (p1.prerelease && p2.prerelease) {
    if (p1.prerelease === p2.prerelease) return 0;
    return p1.prerelease.localeCompare(p2.prerelease, undefined, { numeric: true });
  }

  return 0;
}

/**
 * Formats bytes to human-readable size (e.g. 14.5 MB).
 */
export function formatBytes(bytes: number, decimals = 1): string {
  if (!bytes || bytes <= 0) return '0 B';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

export const OtaUpdateService = {
  /**
   * Get user's preferred release channel ('stable' or 'dev').
   */
  getChannel(): OtaChannel {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.CHANNEL);
      if (stored === 'dev' || stored === 'stable') {
        return stored;
      }
    } catch {
      // fallback
    }
    return 'stable';
  },

  /**
   * Set user's preferred release channel.
   */
  setChannel(channel: OtaChannel): void {
    try {
      localStorage.setItem(STORAGE_KEYS.CHANNEL, channel);
    } catch {
      // ignore
    }
  },

  /**
   * Get auto check setting.
   */
  isAutoCheckEnabled(): boolean {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.AUTO_CHECK);
      return stored === null ? true : stored === 'true';
    } catch {
      return true;
    }
  },

  /**
   * Set auto check setting.
   */
  setAutoCheckEnabled(enabled: boolean): void {
    try {
      localStorage.setItem(STORAGE_KEYS.AUTO_CHECK, String(enabled));
    } catch {
      // ignore
    }
  },

  /**
   * Retrieves the currently installed app version and details.
   */
  async getInstalledVersion(): Promise<{ versionName: string; versionCode: number }> {
    if (Capacitor.isNativePlatform()) {
      try {
        const info = await NativeOtaUpdater.getAppInfo();
        return {
          versionName: info.versionName || DEFAULT_WEB_VERSION,
          versionCode: info.versionCode || 1,
        };
      } catch (err) {
        console.warn('[OtaUpdateService] Native getAppInfo failed, falling back to default:', err);
      }
    }
    return {
      versionName: DEFAULT_WEB_VERSION,
      versionCode: 1,
    };
  },

  /**
   * Fetches releases from GitHub and determines if an update is available
   * for the specified or current channel.
   */
  async checkForUpdates(targetChannel?: OtaChannel): Promise<UpdateCheckResult> {
    const channel = targetChannel || this.getChannel();
    const installed = await this.getInstalledVersion();
    const checkedAt = new Date().toISOString();

    try {
      const response = await fetch(
        `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/releases`,
        {
          headers: {
            Accept: 'application/vnd.github.v3+json',
          },
        }
      );

      if (!response.ok) {
        throw new Error(`GitHub API error: ${response.status} ${response.statusText}`);
      }

      const releases: GitHubRelease[] = await response.json();

      if (!Array.isArray(releases) || releases.length === 0) {
        return {
          hasUpdate: false,
          currentVersion: installed.versionName,
          latestVersion: installed.versionName,
          release: null,
          channel,
          checkedAt,
        };
      }

      // Filter releases according to channel
      let eligibleReleases: GitHubRelease[] = [];

      if (channel === 'stable') {
        // Stable: non-prereleases, and tag doesn't contain dev/beta/alpha/canary
        eligibleReleases = releases.filter(
          r => !r.draft && !r.prerelease && !/-(?:dev|alpha|beta|canary|rc)/i.test(r.tag_name)
        );

        // If no official non-prerelease exists yet, fall back to non-draft releases
        if (eligibleReleases.length === 0) {
          eligibleReleases = releases.filter(r => !r.draft);
        }
      } else {
        // Dev: any non-draft release (pre-release or stable)
        eligibleReleases = releases.filter(r => !r.draft);
      }

      // Find the first eligible release that contains an APK asset
      let selectedRelease: GitHubRelease | null = null;
      let matchedApkAsset: OtaReleaseAsset | null = null;

      for (const rel of eligibleReleases) {
        const apk = rel.assets?.find(
          a => a.name.endsWith('.apk') || a.content_type === 'application/vnd.android.package-archive'
        );
        if (apk) {
          selectedRelease = rel;
          matchedApkAsset = apk;
          break;
        }
      }

      if (!selectedRelease || !matchedApkAsset) {
        return {
          hasUpdate: false,
          currentVersion: installed.versionName,
          latestVersion: installed.versionName,
          release: null,
          channel,
          checkedAt,
        };
      }

      const cleanVersion = normalizeVersion(selectedRelease.tag_name);
      const comparison = compareSemver(cleanVersion, installed.versionName);

      // Has update if remote is strictly newer, or if version strings differ and not identical
      const hasUpdate = comparison > 0;

      const releaseInfo: OtaReleaseInfo = {
        id: selectedRelease.id,
        tagName: selectedRelease.tag_name,
        name: selectedRelease.name || selectedRelease.tag_name,
        body: selectedRelease.body || 'No release notes provided.',
        publishedAt: selectedRelease.published_at,
        isPrerelease: selectedRelease.prerelease,
        channel,
        apkUrl: matchedApkAsset.browser_download_url,
        apkName: matchedApkAsset.name,
        apkSize: matchedApkAsset.size,
        htmlUrl: selectedRelease.html_url,
        cleanVersion,
      };

      const result: UpdateCheckResult = {
        hasUpdate,
        currentVersion: installed.versionName,
        latestVersion: cleanVersion,
        release: releaseInfo,
        channel,
        checkedAt,
      };

      try {
        localStorage.setItem(STORAGE_KEYS.LAST_CHECKED, checkedAt);
        localStorage.setItem(STORAGE_KEYS.CACHED_RESULT, JSON.stringify(result));
      } catch {
        // ignore
      }

      return result;
    } catch (err) {
      console.error('[OtaUpdateService] Failed to check for updates:', err);
      throw err;
    }
  },

  /**
   * Check if Android has granted permission to install unknown apps.
   */
  async canRequestPackageInstalls(): Promise<boolean> {
    if (Capacitor.isNativePlatform()) {
      try {
        const res = await NativeOtaUpdater.canRequestPackageInstalls();
        return Boolean(res.canInstall);
      } catch (err) {
        console.warn('[OtaUpdateService] canRequestPackageInstalls failed:', err);
      }
    }
    return true;
  },

  /**
   * Open Android system settings to grant package install permission.
   */
  async openInstallPermissionSettings(): Promise<void> {
    if (Capacitor.isNativePlatform()) {
      await NativeOtaUpdater.openInstallPermissionSettings();
    }
  },

  /**
   * Downloads the update APK with progress reporting.
   */
  async downloadUpdate(
    apkUrl: string,
    fileName: string,
    onProgress?: (progress: DownloadProgress) => void
  ): Promise<string> {
    if (Capacitor.isNativePlatform()) {
      let listener: PluginListenerHandle | null = null;
      if (onProgress) {
        listener = await NativeOtaUpdater.addListener('downloadProgress', onProgress);
      }

      try {
        const result = await NativeOtaUpdater.downloadUpdate({
          url: apkUrl,
          fileName,
        });
        return result.filePath;
      } finally {
        if (listener) {
          await listener.remove();
        }
      }
    } else {
      // Browser / Web fallback: trigger standard download
      const link = document.createElement('a');
      link.href = apkUrl;
      link.download = fileName;
      link.target = '_blank';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      return apkUrl;
    }
  },

  /**
   * Launches native package installation prompt.
   */
  async installUpdate(filePath?: string): Promise<InstallResult> {
    if (Capacitor.isNativePlatform()) {
      return await NativeOtaUpdater.installUpdate({ filePath });
    } else {
      // Web fallback
      if (filePath) {
        window.open(filePath, '_blank');
      }
      return { success: true };
    }
  },

  /**
   * Deletes cached downloaded update files.
   */
  async deleteDownloadedUpdate(): Promise<void> {
    if (Capacitor.isNativePlatform()) {
      try {
        await NativeOtaUpdater.deleteDownloadedUpdate();
      } catch (err) {
        console.warn('[OtaUpdateService] Failed to clean up downloaded update:', err);
      }
    }
  },
};
