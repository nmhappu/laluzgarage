import { useState, useEffect, useCallback, useRef } from 'react';
import {
  OtaUpdateService,
  type OtaChannel,
  type UpdateCheckResult,
  type DownloadProgress,
  STORAGE_KEYS,
} from '../services/otaUpdateService';

export interface UseOtaUpdateOptions {
  autoCheckOnMount?: boolean;
}

export function useOtaUpdate(options: UseOtaUpdateOptions = {}) {
  const { autoCheckOnMount = false } = options;

  const [channel, setChannelState] = useState<OtaChannel>(() => OtaUpdateService.getChannel());
  const [autoCheck, setAutoCheckState] = useState<boolean>(() => OtaUpdateService.isAutoCheckEnabled());
  const [checking, setChecking] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState<DownloadProgress>({
    progress: 0,
    bytesRead: 0,
    totalBytes: 0,
  });
  const [downloadedFilePath, setDownloadedFilePath] = useState<string | null>(null);
  const [updateResult, setUpdateResult] = useState<UpdateCheckResult | null>(() => {
    try {
      const cached = localStorage.getItem(STORAGE_KEYS.CACHED_RESULT);
      if (cached) {
        return JSON.parse(cached);
      }
    } catch {
      // ignore
    }
    return null;
  });
  const [permissionNeeded, setPermissionNeeded] = useState(false);
  const [installing, setInstalling] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastCheckedTime, setLastCheckedTime] = useState<string | null>(() => {
    try {
      return localStorage.getItem(STORAGE_KEYS.LAST_CHECKED);
    } catch {
      return null;
    }
  });

  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const setChannel = useCallback((newChannel: OtaChannel) => {
    setChannelState(newChannel);
    OtaUpdateService.setChannel(newChannel);
    // When channel changes, reset previous update result & downloaded state
    setDownloadedFilePath(null);
    setPermissionNeeded(false);
    setError(null);
  }, []);

  const setAutoCheck = useCallback((enabled: boolean) => {
    setAutoCheckState(enabled);
    OtaUpdateService.setAutoCheckEnabled(enabled);
  }, []);

  const checkForUpdates = useCallback(async (targetChannel?: OtaChannel): Promise<UpdateCheckResult | null> => {
    const ch = targetChannel || channel;
    setChecking(true);
    setError(null);

    try {
      const res = await OtaUpdateService.checkForUpdates(ch);
      if (isMountedRef.current) {
        setUpdateResult(res);
        setLastCheckedTime(res.checkedAt);
        // If there's no update or target changed, reset downloaded path
        if (!res.hasUpdate) {
          setDownloadedFilePath(null);
        }
      }
      return res;
    } catch (err: any) {
      if (isMountedRef.current) {
        const msg = err?.message || 'Failed to check for updates. Check internet connection.';
        setError(msg);
      }
      return null;
    } finally {
      if (isMountedRef.current) {
        setChecking(false);
      }
    }
  }, [channel]);

  const startDownload = useCallback(async (): Promise<string | null> => {
    if (!updateResult?.release?.apkUrl) {
      setError('No APK download link found for this release.');
      return null;
    }

    setDownloading(true);
    setError(null);
    setDownloadProgress({ progress: 0, bytesRead: 0, totalBytes: updateResult.release.apkSize || 0 });

    try {
      const filePath = await OtaUpdateService.downloadUpdate(
        updateResult.release.apkUrl,
        updateResult.release.apkName || 'laluzgarage.apk',
        (progress) => {
          if (isMountedRef.current) {
            setDownloadProgress(progress);
          }
        }
      );

      if (isMountedRef.current) {
        setDownloadedFilePath(filePath);
        setDownloading(false);
      }
      return filePath;
    } catch (err: any) {
      if (isMountedRef.current) {
        const msg = err?.message || 'Download failed. Please try again.';
        setError(msg);
        setDownloading(false);
      }
      return null;
    }
  }, [updateResult]);

  const install = useCallback(async () => {
    setInstalling(true);
    setError(null);

    try {
      const canInstall = await OtaUpdateService.canRequestPackageInstalls();
      if (!canInstall) {
        setPermissionNeeded(true);
        setInstalling(false);
        return;
      }

      const res = await OtaUpdateService.installUpdate(downloadedFilePath || undefined);
      if (res.permissionNeeded) {
        setPermissionNeeded(true);
      } else if (!res.success && res.message) {
        setError(res.message);
      }
    } catch (err: any) {
      setError(err?.message || 'Installation failed');
    } finally {
      if (isMountedRef.current) {
        setInstalling(false);
      }
    }
  }, [downloadedFilePath]);

  const openPermissionSettings = useCallback(async () => {
    try {
      await OtaUpdateService.openInstallPermissionSettings();
      // Reset flag so user can re-try install when returning
      setPermissionNeeded(false);
    } catch (err: any) {
      setError(err?.message || 'Failed to open settings');
    }
  }, []);

  const clearDownloaded = useCallback(async () => {
    await OtaUpdateService.deleteDownloadedUpdate();
    if (isMountedRef.current) {
      setDownloadedFilePath(null);
    }
  }, []);

  // Initial check on mount if enabled
  useEffect(() => {
    if (autoCheckOnMount && autoCheck) {
      checkForUpdates();
    }
  }, [autoCheckOnMount, autoCheck]);

  return {
    channel,
    setChannel,
    autoCheck,
    setAutoCheck,
    checking,
    downloading,
    downloadProgress,
    downloadedFilePath,
    updateResult,
    permissionNeeded,
    installing,
    error,
    lastCheckedTime,
    checkForUpdates,
    startDownload,
    install,
    openPermissionSettings,
    clearDownloaded,
  };
}
