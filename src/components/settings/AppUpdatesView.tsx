import { useState } from 'react';
import { motion, AnimatePresence, type Variants } from 'motion/react';
import {
  RefreshCw,
  Download,
  CheckCircle2,
  AlertTriangle,
  ExternalLink,
  Sparkles,
  Smartphone,
  ShieldCheck,
  ChevronDown,
  ChevronUp,
  Settings as SettingsIcon,
  Layers,
  HardDrive,
  Info,
} from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import { cn } from '../../lib/utils';
import { useOtaUpdate } from '../../hooks/useOtaUpdate';
import { formatBytes, type OtaChannel } from '../../services/otaUpdateService';

export interface AppUpdatesViewProps {
  pageVariants?: Variants;
}

export function AppUpdatesView({ pageVariants }: AppUpdatesViewProps) {
  const {
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
  } = useOtaUpdate({ autoCheckOnMount: false });

  const [showChangelog, setShowChangelog] = useState(true);

  const handleChannelSwitch = (newChannel: OtaChannel) => {
    if (newChannel === channel) return;
    setChannel(newChannel);
    checkForUpdates(newChannel);
  };

  const formattedLastChecked = lastCheckedTime
    ? (() => {
        try {
          return `${formatDistanceToNow(new Date(lastCheckedTime), { addSuffix: true })} (${format(new Date(lastCheckedTime), 'p')})`;
        } catch {
          return null;
        }
      })()
    : null;

  return (
    <motion.div
      key="updates"
      variants={pageVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      className="space-y-6 pb-12"
    >
      {/* Hero: Current App Version Info */}
      <div className="relative overflow-hidden rounded-2xl bg-workshop-surface/60 border border-workshop-border/30 p-5 sm:p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-workshop-accent/10 border border-workshop-accent/20 flex items-center justify-center text-workshop-accent shrink-0 shadow-inner">
              <Smartphone className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h3 className="text-base font-bold text-workshop-text tracking-tight">LaluZ Garage</h3>
                <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-full bg-workshop-border/30 text-workshop-text border border-workshop-border/40">
                  v{updateResult?.currentVersion || '0.2.0'}
                </span>
                <span
                  className={cn(
                    'text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full border',
                    channel === 'dev'
                      ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                      : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                  )}
                >
                  {channel === 'dev' ? 'Dev Channel' : 'Stable Track'}
                </span>
              </div>
              <p className="text-xs text-workshop-muted mt-1">
                Over-The-Air GitHub release distribution for workshop devices
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => checkForUpdates()}
            disabled={checking || downloading}
            className={cn(
              'flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs tracking-wide transition-all shadow-sm cursor-pointer shrink-0',
              checking
                ? 'bg-workshop-border/40 text-workshop-muted cursor-wait'
                : 'bg-workshop-accent text-workshop-bg hover:brightness-110 active:scale-[0.98]'
            )}
          >
            <RefreshCw className={cn('w-4 h-4', checking && 'animate-spin')} />
            {checking ? 'Checking GitHub...' : 'Check for Updates'}
          </button>
        </div>

        {formattedLastChecked && (
          <div className="mt-4 pt-3 border-t border-workshop-border/20 flex items-center justify-between text-[11px] text-workshop-muted">
            <span>Last checked: {formattedLastChecked}</span>
            <a
              href="https://github.com/nmhappu/laluzgarage/releases"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 hover:text-workshop-accent transition-colors"
            >
              GitHub Releases <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        )}
      </div>

      {/* Release Channel Selector */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <label className="text-xs font-black uppercase tracking-wider text-workshop-muted flex items-center gap-2">
            <Layers className="w-3.5 h-3.5 text-workshop-accent" />
            Release Channel
          </label>
          <span className="text-[11px] text-workshop-muted">Switch anytime</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* Stable Channel Card */}
          <button
            type="button"
            onClick={() => handleChannelSwitch('stable')}
            disabled={checking || downloading}
            className={cn(
              'relative p-4 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between',
              channel === 'stable'
                ? 'bg-workshop-surface border-emerald-500/40 ring-1 ring-emerald-500/20 shadow-sm'
                : 'bg-workshop-surface/30 border-workshop-border/20 hover:border-workshop-border/40 hover:bg-workshop-surface/50'
            )}
          >
            <div className="flex items-start justify-between w-full">
              <div className="flex items-center gap-2">
                <div
                  className={cn(
                    'w-2 h-2 rounded-full',
                    channel === 'stable' ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.5)]' : 'bg-workshop-muted/40'
                  )}
                />
                <span className="text-sm font-bold text-workshop-text">Stable Releases</span>
              </div>
              <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                Recommended
              </span>
            </div>
            <p className="text-xs text-workshop-muted mt-2 leading-relaxed">
              Official releases thoroughly tested for garage operations and production stability.
            </p>
          </button>

          {/* Dev Channel Card */}
          <button
            type="button"
            onClick={() => handleChannelSwitch('dev')}
            disabled={checking || downloading}
            className={cn(
              'relative p-4 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between',
              channel === 'dev'
                ? 'bg-workshop-surface border-amber-500/40 ring-1 ring-amber-500/20 shadow-sm'
                : 'bg-workshop-surface/30 border-workshop-border/20 hover:border-workshop-border/40 hover:bg-workshop-surface/50'
            )}
          >
            <div className="flex items-start justify-between w-full">
              <div className="flex items-center gap-2">
                <div
                  className={cn(
                    'w-2 h-2 rounded-full',
                    channel === 'dev' ? 'bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.5)]' : 'bg-workshop-muted/40'
                  )}
                />
                <span className="text-sm font-bold text-workshop-text">Development / Dev</span>
              </div>
              <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20">
                Bleeding Edge
              </span>
            </div>
            <p className="text-xs text-workshop-muted mt-2 leading-relaxed">
              Early preview builds, experimental fixes, and pre-release updates as soon as they are pushed.
            </p>
          </button>
        </div>
      </div>

      {/* Auto Check Toggle */}
      <div className="p-4 rounded-xl bg-workshop-surface/40 border border-workshop-border/20 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-workshop-border/20 flex items-center justify-center text-workshop-muted shrink-0">
            <Sparkles className="w-4 h-4 text-workshop-accent" />
          </div>
          <div>
            <p className="text-sm font-semibold text-workshop-text leading-tight">Check for updates on launch</p>
            <p className="text-xs text-workshop-muted mt-0.5">Automatically query GitHub when opening the app</p>
          </div>
        </div>

        <button
          type="button"
          role="switch"
          aria-checked={autoCheck}
          onClick={() => setAutoCheck(!autoCheck)}
          className={cn(
            'w-11 h-6 flex items-center rounded-full p-1 transition-colors cursor-pointer shrink-0',
            autoCheck ? 'bg-workshop-accent' : 'bg-workshop-border/50'
          )}
        >
          <div
            className={cn(
              'bg-workshop-bg w-4 h-4 rounded-full shadow-md transform transition-transform',
              autoCheck ? 'translate-x-5' : 'translate-x-0'
            )}
          />
        </button>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="p-4 rounded-xl bg-status-urgent/10 border border-status-urgent/30 flex items-start gap-3 text-status-urgent">
          <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold">Update Check Failed</p>
            <p className="text-xs opacity-90 mt-0.5 break-words">{error}</p>
          </div>
          <button
            type="button"
            onClick={() => checkForUpdates()}
            className="text-xs font-bold underline shrink-0 hover:opacity-80 cursor-pointer"
          >
            Retry
          </button>
        </div>
      )}

      {/* Permission Needed Alert */}
      {permissionNeeded && (
        <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-amber-400">
          <div className="flex items-start gap-3">
            <ShieldCheck className="w-5 h-5 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-bold">Android Permission Required</p>
              <p className="text-xs text-workshop-muted mt-0.5">
                To complete installation, enable "Install unknown apps" for LaluZ Garage in Android Settings.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={openPermissionSettings}
            className="px-3.5 py-2 rounded-lg bg-amber-500 text-black font-bold text-xs tracking-wide hover:brightness-110 active:scale-95 transition-all flex items-center justify-center gap-1.5 cursor-pointer shrink-0"
          >
            <SettingsIcon className="w-3.5 h-3.5" />
            Open Android Settings
          </button>
        </div>
      )}

      {/* Dynamic State: Update Available vs Up To Date */}
      <AnimatePresence mode="wait">
        {updateResult?.hasUpdate && updateResult.release ? (
          <motion.div
            key="update-card"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="rounded-2xl border-2 border-workshop-accent/40 bg-workshop-surface/70 p-5 sm:p-6 shadow-md space-y-5"
          >
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-workshop-accent text-workshop-bg">
                    New Update Available
                  </span>
                  <span
                    className={cn(
                      'text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border',
                      updateResult.release.channel === 'dev'
                        ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                        : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                    )}
                  >
                    {updateResult.release.channel === 'dev' ? 'Dev Channel' : 'Stable Track'}
                  </span>
                </div>
                <h4 className="text-lg font-black text-workshop-text tracking-tight mt-1.5">
                  {updateResult.release.name}
                </h4>
                <p className="text-xs text-workshop-muted mt-0.5">
                  Tag: <span className="font-mono text-workshop-text">{updateResult.release.tagName}</span> • Published{' '}
                  {(() => {
                    try {
                      return format(new Date(updateResult.release.publishedAt), 'MMM d, yyyy');
                    } catch {
                      return 'Recently';
                    }
                  })()}
                </p>
              </div>

              <div className="flex items-center gap-2 self-start bg-workshop-bg/80 border border-workshop-border/30 px-3 py-1.5 rounded-xl text-xs font-mono text-workshop-muted shrink-0">
                <HardDrive className="w-3.5 h-3.5 text-workshop-accent" />
                <span>{formatBytes(updateResult.release.apkSize)}</span>
              </div>
            </div>

            {/* Release Notes / Changelog */}
            {updateResult.release.body && (
              <div className="rounded-xl bg-workshop-bg/60 border border-workshop-border/30 overflow-hidden">
                <button
                  type="button"
                  onClick={() => setShowChangelog(!showChangelog)}
                  className="w-full px-4 py-2.5 flex items-center justify-between text-left text-xs font-bold text-workshop-text hover:bg-workshop-surface/40 transition-colors cursor-pointer"
                >
                  <span className="flex items-center gap-2">
                    <Info className="w-3.5 h-3.5 text-workshop-accent" />
                    Changelog & Release Notes
                  </span>
                  {showChangelog ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </button>

                {showChangelog && (
                  <div className="px-4 py-3 border-t border-workshop-border/20 text-xs text-workshop-text font-sans leading-relaxed whitespace-pre-wrap max-h-56 overflow-y-auto font-normal opacity-90">
                    {updateResult.release.body}
                  </div>
                )}
              </div>
            )}

            {/* Download Progress Bar */}
            {downloading && (
              <div className="space-y-2 pt-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-workshop-accent flex items-center gap-2">
                    <Download className="w-3.5 h-3.5 animate-bounce" />
                    Downloading APK update...
                  </span>
                  <span className="font-mono font-bold text-workshop-text">
                    {downloadProgress.progress}% ({formatBytes(downloadProgress.bytesRead)} /{' '}
                    {formatBytes(downloadProgress.totalBytes)})
                  </span>
                </div>

                <div className="w-full h-2.5 bg-workshop-bg rounded-full overflow-hidden border border-workshop-border/30 p-0.5">
                  <div
                    className="h-full bg-gradient-to-r from-workshop-accent via-emerald-400 to-workshop-accent rounded-full transition-all duration-150"
                    style={{ width: `${Math.max(4, downloadProgress.progress)}%` }}
                  />
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="pt-2 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              {downloadedFilePath ? (
                <button
                  type="button"
                  onClick={install}
                  disabled={installing}
                  className="flex-1 py-3 px-5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-workshop-bg font-black text-xs tracking-wider uppercase transition-all shadow-md active:scale-[0.98] flex items-center justify-center gap-2 cursor-pointer"
                >
                  <ShieldCheck className="w-4 h-4" />
                  {installing ? 'Preparing Package Installer...' : 'Install Update Now'}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={startDownload}
                  disabled={downloading}
                  className={cn(
                    'flex-1 py-3 px-5 rounded-xl font-black text-xs tracking-wider uppercase transition-all shadow-md active:scale-[0.98] flex items-center justify-center gap-2 cursor-pointer',
                    downloading
                      ? 'bg-workshop-border/50 text-workshop-muted cursor-wait'
                      : 'bg-workshop-accent text-workshop-bg hover:brightness-110'
                  )}
                >
                  <Download className="w-4 h-4" />
                  {downloading ? 'Downloading...' : `Download & Install (${formatBytes(updateResult.release.apkSize)})`}
                </button>
              )}

              <a
                href={updateResult.release.htmlUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="py-3 px-4 rounded-xl bg-workshop-surface border border-workshop-border/30 hover:bg-workshop-border/20 text-workshop-text font-bold text-xs transition-colors flex items-center justify-center gap-1.5"
              >
                View on GitHub
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          </motion.div>
        ) : updateResult && !updateResult.hasUpdate ? (
          <motion.div
            key="up-to-date"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="rounded-2xl border border-emerald-500/30 bg-emerald-500/5 p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
          >
            <div className="flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div>
                <p className="text-sm font-bold text-workshop-text">LaluZ Garage is up to date</p>
                <p className="text-xs text-workshop-muted mt-0.5">
                  You are currently on the latest version available on the{' '}
                  <span className="font-semibold text-workshop-text capitalize">{channel}</span> channel.
                </p>
              </div>
            </div>

            {updateResult.release && (
              <button
                type="button"
                onClick={startDownload}
                disabled={downloading}
                className="text-xs font-bold text-workshop-muted hover:text-workshop-text transition-colors py-2 px-3 rounded-lg border border-workshop-border/30 hover:border-workshop-border/60 shrink-0 cursor-pointer"
                title="Force download release APK again"
              >
                {downloading ? 'Downloading...' : 'Re-download APK'}
              </button>
            )}
          </motion.div>
        ) : null}
      </AnimatePresence>
    </motion.div>
  );
}
