import { motion, AnimatePresence } from 'motion/react';
import { Sparkles, X, Download, ExternalLink } from 'lucide-react';
import { formatBytes, type OtaReleaseInfo } from '../../services/otaUpdateService';
import { cn } from '../../lib/utils';

export interface UpdatePromptModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUpdate: () => void;
  release: OtaReleaseInfo | null;
  currentVersion: string;
}

export function UpdatePromptModal({
  isOpen,
  onClose,
  onUpdate,
  release,
  currentVersion,
}: UpdatePromptModalProps) {
  if (!isOpen || !release) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-black/70 backdrop-blur-sm"
        />

        {/* Modal Card */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          transition={{ duration: 0.2, ease: [0.2, 0, 0, 1] }}
          className="relative w-full max-w-md bg-workshop-surface rounded-2xl border border-workshop-border/40 shadow-2xl p-6 text-workshop-text z-10 overflow-hidden"
        >
          {/* Accent glow on top */}
          <div className="absolute -top-12 -left-12 w-32 h-32 bg-workshop-accent/20 rounded-full blur-2xl pointer-events-none" />

          {/* Close button */}
          <button
            type="button"
            onClick={onClose}
            className="absolute top-4 right-4 p-2 rounded-lg text-workshop-muted hover:text-workshop-text hover:bg-workshop-border/30 transition-colors cursor-pointer"
            title="Dismiss"
          >
            <X className="w-4 h-4" />
          </button>

          {/* Header */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-workshop-accent/15 border border-workshop-accent/30 flex items-center justify-center text-workshop-accent shrink-0">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-black uppercase tracking-wider text-workshop-accent">
                  New Release Available
                </span>
                <span
                  className={cn(
                    'text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.2 rounded border',
                    release.channel === 'dev'
                      ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                      : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                  )}
                >
                  {release.channel}
                </span>
              </div>
              <h3 className="text-base font-bold text-workshop-text tracking-tight mt-0.5">
                {release.name}
              </h3>
            </div>
          </div>

          {/* Version delta & APK size */}
          <div className="mt-4 p-3 rounded-xl bg-workshop-bg/70 border border-workshop-border/30 flex items-center justify-between text-xs font-mono">
            <div>
              <span className="text-workshop-muted">Current: </span>
              <span className="text-workshop-text font-bold">v{currentVersion}</span>
            </div>
            <span className="text-workshop-muted">→</span>
            <div>
              <span className="text-workshop-muted">Latest: </span>
              <span className="text-workshop-accent font-bold">v{release.cleanVersion}</span>
            </div>
            {release.apkSize > 0 && (
              <span className="text-workshop-muted border-l border-workshop-border/30 pl-3">
                {formatBytes(release.apkSize)}
              </span>
            )}
          </div>

          {/* Release Notes Preview */}
          {release.body && (
            <div className="mt-3 p-3 rounded-xl bg-workshop-bg/40 border border-workshop-border/20 text-xs text-workshop-muted max-h-32 overflow-y-auto leading-relaxed whitespace-pre-wrap">
              {release.body}
            </div>
          )}

          {/* Actions */}
          <div className="mt-5 flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 px-4 rounded-xl border border-workshop-border/40 hover:bg-workshop-surface/80 text-workshop-muted hover:text-workshop-text font-bold text-xs tracking-wider transition-colors cursor-pointer"
            >
              Later
            </button>
            <button
              type="button"
              onClick={() => {
                onClose();
                onUpdate();
              }}
              className="flex-1 py-2.5 px-4 rounded-xl bg-workshop-accent hover:brightness-110 text-workshop-bg font-black text-xs tracking-wider uppercase transition-all shadow-md active:scale-95 flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              Update Now
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
