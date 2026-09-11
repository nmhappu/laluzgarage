import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { ShieldAlert, RefreshCw, LogOut } from 'lucide-react';
import { motion } from 'motion/react';
import { ThemeToggle } from './ThemeToggle';

export function PendingApprovalPage() {
  const { profile, user, logout } = useAuth();
  const [checking, setChecking] = useState(false);

  const handleRefresh = async () => {
    setChecking(true);
    // Reload window to re-evaluate real-time auth and role state
    setTimeout(() => {
      window.location.reload();
    }, 600);
  };

  const displayName = profile?.name || user?.displayName || user?.email?.split('@')[0] || 'Team Member';
  const displayEmail = profile?.email || user?.email || '';

  return (
    <div className="min-h-screen bg-workshop-bg flex flex-col justify-between p-6 sm:p-8 safe-top safe-bottom relative overflow-x-hidden">
      {/* Ambient background glow */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden flex items-center justify-center">
        <div className="w-[500px] h-[500px] bg-status-pending/5 rounded-full blur-3xl -translate-y-12" />
      </div>

      {/* Top Header */}
      <motion.header
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, delay: 0.05, ease: [0.2, 0, 0, 1] }}
        className="relative z-10 w-full max-w-lg mx-auto flex items-center justify-between py-2"
      >
        <span className="font-logo font-bold text-base tracking-tight text-workshop-text">
          LaluZ Garage
        </span>
        <ThemeToggle />
      </motion.header>

      {/* Main Content - Displayed directly on top of background */}
      <main className="relative z-10 max-w-md w-full mx-auto my-auto py-8">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-start text-left space-y-6 w-full"
        >
          {/* Status Icon */}
          <div className="relative text-status-pending">
            <div className="absolute -inset-2 bg-status-pending/20 blur-2xl rounded-full pointer-events-none" />
            <ShieldAlert className="relative w-12 h-12 stroke-[1.75]" />
          </div>

          {/* Heading & Subtitle */}
          <div className="space-y-2 text-left">
            <h1 className="text-2xl sm:text-3xl font-logo font-bold text-workshop-text tracking-tight">
              Contact your Supervisor
            </h1>
            <p className="text-workshop-muted text-xs sm:text-sm leading-relaxed">
              Welcome, <span className="font-semibold text-workshop-text">{displayName}</span>. Your account has been authenticated, but you do not have an active workshop role assigned yet.
            </p>
          </div>

          {/* User Details - Directly on background with subtle dividers */}
          <div className="w-full divide-y divide-workshop-border/60 border-y border-workshop-border/60 text-left py-1">
            <div className="flex items-center justify-between py-3 text-xs sm:text-sm">
              <span className="text-workshop-muted font-medium">Name</span>
              <span className="text-workshop-text font-semibold truncate max-w-[220px]">{displayName}</span>
            </div>
            <div className="flex items-center justify-between py-3 text-xs sm:text-sm">
              <span className="text-workshop-muted font-medium">Account</span>
              <span className="text-workshop-text font-mono text-xs truncate max-w-[220px]">{displayEmail}</span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="w-full space-y-3 pt-2">
            <button
              type="button"
              onClick={handleRefresh}
              disabled={checking}
              className="w-full flex items-center justify-center gap-2 bg-workshop-accent text-workshop-bg hover:bg-workshop-accent/90 px-5 py-3.5 rounded-xl font-bold text-xs uppercase tracking-wider transition-all shadow-md active:scale-[0.98] cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${checking ? 'animate-spin' : ''}`} />
              {checking ? 'Checking Status...' : 'Check Activation Status'}
            </button>

            <button
              type="button"
              onClick={() => logout()}
              className="w-full flex items-center justify-center gap-2 bg-workshop-surface/60 hover:bg-workshop-surface border border-workshop-border hover:border-status-urgent/40 text-workshop-muted hover:text-status-urgent px-5 py-3.5 rounded-xl font-bold text-xs uppercase tracking-wider transition-all active:scale-[0.98] cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
              Sign Out
            </button>
          </div>
        </motion.div>
      </main>
    </div>
  );
}

export default PendingApprovalPage;

