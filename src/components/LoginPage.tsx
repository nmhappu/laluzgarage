import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useBackHandler } from '../contexts/UIContext';
import {
  Mail,
  Lock,
  AlertCircle,
  ArrowLeft,
  Eye,
  EyeOff,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { ThemeToggle } from './ThemeToggle';
import { LaluzLogo } from './ui/LaluzLogo';

const tapSpringTransition = {
  type: 'spring' as const,
  stiffness: 500,
  damping: 25,
};


export function LoginPage() {
  const { login, loginWithGoogle } = useAuth();
  const [authMethod, setAuthMethod] = useState<'idle' | 'email'>('idle');

  // Back handling: return to idle sign-in choices if in email mode
  useBackHandler(() => {
    setAuthMethod('idle');
    return true;
  }, authMethod === 'email', 50);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  const emailInputRef = useRef<HTMLInputElement>(null);

  // Auto-focus email input when revealing credentials form
  useEffect(() => {
    if (authMethod === 'email') {
      const timer = setTimeout(() => {
        emailInputRef.current?.focus();
      }, 150);
      return () => clearTimeout(timer);
    }
  }, [authMethod]);

  const handleGoogleSignIn = async () => {
    setError(null);
    setGoogleLoading(true);
    try {
      await loginWithGoogle();
    } catch (err: unknown) {
      console.error('Google sign-in error:', err);
      const errorObj = err as { code?: string; message?: string };
      const message = err instanceof Error ? err.message : String(err);
      if (
        errorObj.code === 'auth/popup-closed-by-user' ||
        errorObj.code === 'auth/cancelled-popup-request' ||
        message.toLowerCase().includes('cancel') ||
        errorObj.code === '12501'
      ) {
        return;
      }
      if (errorObj.code === 'auth/popup-blocked') {
        setError('Popup was blocked by your browser. Please allow popups and try again.');
        return;
      }
      if (errorObj.code === 'auth/account-exists-with-different-credential') {
        setError('An account already exists with this email using another sign-in method.');
        return;
      }
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Google authentication failed. Please try again.');
      }
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      await login(email, password);
    } catch (err: unknown) {
      console.error('Auth action failed:', err);
      if (err instanceof Error) {
        setError(err.message);
        return;
      }
      const errorObj = err as { code?: string };
      if (
        errorObj.code === 'auth/user-not-found' ||
        errorObj.code === 'auth/wrong-password' ||
        errorObj.code === 'auth/invalid-credential'
      ) {
        setError('Invalid credentials. Please verify your email and password.');
      } else if (errorObj.code === 'auth/too-many-requests') {
        setError('Too many failed attempts. Please try again later.');
      } else {
        setError('Authentication failed. Check your data and try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-workshop-bg flex flex-col justify-between p-6 sm:p-8 safe-top safe-bottom relative overflow-x-hidden">
      {/* Precision Canvas Dot Grid Background */}
      <div
        className="canvas-grid pointer-events-none absolute inset-0 opacity-60 dark:opacity-40"
        style={{
          maskImage: 'radial-gradient(ellipse 85% 85% at 50% 50%, #000 40%, transparent 95%)',
          WebkitMaskImage: 'radial-gradient(ellipse 85% 85% at 50% 50%, #000 40%, transparent 95%)',
        }}
      />

      {/* Ambient Background Glow */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden flex items-center justify-center">
        <div className="w-[500px] h-[500px] bg-workshop-accent/5 rounded-full blur-3xl -translate-y-12" />
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
          transition={{ duration: 0.4, ease: [0.2, 0, 0, 1] }}
          className="flex flex-col items-start text-left space-y-6 w-full"
        >
          {/* Brand Icon */}
          <div className="relative text-workshop-text">
            <div className="absolute -inset-3 bg-workshop-accent/15 blur-2xl rounded-full pointer-events-none" />
            <LaluzLogo size={96} showGlow={false} />
          </div>

          {/* Heading & Subtitle */}
          <div className="space-y-2 text-left">
            <h1 className="text-2xl sm:text-3xl font-logo font-bold text-workshop-text tracking-tight">
              Welcome to LaluZ Garage
            </h1>
            <p className="text-workshop-muted text-xs sm:text-sm leading-relaxed">
              Sign in to manage vehicle records and inventory.
            </p>
            <p className="text-workshop-muted text-xs sm:text-sm leading-relaxed">
              Internal use only.
            </p>
          </div>

          {/* Interactive Actions Area */}
          <AnimatePresence mode="wait" initial={false}>
            {authMethod === 'idle' ? (
              <motion.div
                key="idle-view"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.16, ease: [0.2, 0, 0, 1] }}
                className="w-full space-y-3 pt-2"
              >
                {/* Google Sign In */}
                <motion.button
                  type="button"
                  disabled={googleLoading || loading}
                  onClick={handleGoogleSignIn}
                  whileTap={{ scale: 0.97 }}
                  transition={tapSpringTransition}
                  className="w-full flex items-center justify-start gap-3 bg-workshop-surface/60 hover:bg-workshop-surface border border-workshop-border hover:border-workshop-accent/50 text-workshop-text px-5 py-3.5 rounded-xl font-medium font-google-sans text-xs uppercase tracking-wider shadow-sm disabled:opacity-50 disabled:cursor-not-allowed group cursor-pointer text-left accelerate-gpu will-change-transform"
                >
                  {googleLoading ? (
                    <div className="w-4 h-4 border-2 border-workshop-accent border-t-transparent rounded-full animate-spin shrink-0" />
                  ) : (
                    <img
                      src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg"
                      alt="Google"
                      className="w-4 h-4 shrink-0 transition-transform group-hover:scale-110"
                      referrerPolicy="no-referrer"
                    />
                  )}
                  <span>{googleLoading ? 'Connecting...' : 'Continue with Google'}</span>
                </motion.button>

                {/* Continue with mail button */}
                <motion.button
                  type="button"
                  onClick={() => {
                    setError(null);
                    setAuthMethod('email');
                  }}
                  whileTap={{ scale: 0.97 }}
                  transition={tapSpringTransition}
                  className="w-full flex items-center justify-start gap-3 bg-workshop-surface/60 hover:bg-workshop-surface border border-workshop-border hover:border-workshop-accent/50 text-workshop-text px-5 py-3.5 rounded-xl font-medium font-google-sans text-xs uppercase tracking-wider shadow-sm cursor-pointer group text-left accelerate-gpu will-change-transform"
                >
                  <Mail className="w-4 h-4 text-workshop-accent shrink-0 transition-transform group-hover:scale-110" />
                  <span>Continue with mail</span>
                </motion.button>

                {/* Error Banner */}
                {error && (
                  <div className="flex items-center gap-2.5 p-3.5 bg-status-urgent/10 border border-status-urgent/25 text-status-urgent rounded-xl text-xs font-semibold">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{error}</span>
                  </div>
                )}
              </motion.div>
            ) : (
              <motion.form
                key="email-view"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.16, ease: [0.2, 0, 0, 1] }}
                onSubmit={handleSubmit}
                className="w-full space-y-4 pt-1"
              >
                {/* Inputs */}
                <div className="w-full space-y-3">
                  <div className="space-y-1.5 text-left">
                    <label className="text-xs font-semibold text-workshop-muted pl-0.5">
                      Email address
                    </label>
                    <div className="relative group">
                      <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-workshop-muted group-focus-within:text-workshop-accent transition-colors" />
                      <input
                        ref={emailInputRef}
                        type="email"
                        placeholder="technician@laluzgarage.com"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full bg-workshop-surface/60 hover:bg-workshop-surface focus:bg-workshop-surface border border-workshop-border rounded-xl py-3.5 pl-11 pr-4 text-workshop-text placeholder:text-workshop-muted/40 focus:outline-none focus:border-workshop-accent/60 transition-colors font-medium text-sm"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5 text-left">
                    <label className="text-xs font-semibold text-workshop-muted pl-0.5">
                      Password
                    </label>
                    <div className="relative group">
                      <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-workshop-muted group-focus-within:text-workshop-accent transition-colors" />
                      <input
                        type={showPassword ? 'text' : 'password'}
                        placeholder="••••••••••••"
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full bg-workshop-surface/60 hover:bg-workshop-surface focus:bg-workshop-surface border border-workshop-border rounded-xl py-3.5 pl-11 pr-11 text-workshop-text placeholder:text-workshop-muted/40 focus:outline-none focus:border-workshop-accent/60 transition-colors font-medium text-sm"
                      />
                      <motion.button
                        type="button"
                        tabIndex={-1}
                        onClick={() => setShowPassword((prev) => !prev)}
                        whileTap={{ scale: 0.85 }}
                        transition={tapSpringTransition}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-workshop-muted hover:text-workshop-text p-1 transition-colors cursor-pointer"
                        aria-label={showPassword ? 'Hide password' : 'Show password'}
                      >
                        {showPassword ? (
                          <EyeOff className="w-4 h-4" />
                        ) : (
                          <Eye className="w-4 h-4" />
                        )}
                      </motion.button>
                    </div>
                  </div>
                </div>

                {/* Error Banner */}
                {error && (
                  <div className="flex items-center gap-2.5 p-3.5 bg-status-urgent/10 border border-status-urgent/25 text-status-urgent rounded-xl text-xs font-semibold">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{error}</span>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="w-full space-y-3 pt-2">
                  <motion.button
                    disabled={loading}
                    type="submit"
                    whileTap={{ scale: 0.97 }}
                    transition={tapSpringTransition}
                    className="w-full flex items-center justify-start gap-3 bg-workshop-accent text-workshop-bg hover:bg-workshop-accent/90 px-5 py-3.5 rounded-xl font-medium font-google-sans text-xs uppercase tracking-wider shadow-md cursor-pointer disabled:opacity-50 text-left accelerate-gpu will-change-transform"
                  >
                    {loading && (
                      <div className="w-4 h-4 border-2 border-workshop-bg border-t-transparent rounded-full animate-spin shrink-0" />
                    )}
                    <span>{loading ? 'Authenticating...' : 'Sign In'}</span>
                  </motion.button>

                  <motion.button
                    type="button"
                    onClick={() => {
                      setError(null);
                      setAuthMethod('idle');
                    }}
                    whileTap={{ scale: 0.97 }}
                    transition={tapSpringTransition}
                    className="w-full flex items-center justify-start gap-3 bg-workshop-surface/60 hover:bg-workshop-surface border border-workshop-border hover:border-workshop-accent/50 text-workshop-muted hover:text-workshop-text px-5 py-3.5 rounded-xl font-medium font-google-sans text-xs uppercase tracking-wider cursor-pointer text-left accelerate-gpu will-change-transform"
                  >
                    <ArrowLeft className="w-4 h-4 shrink-0" />
                    <span>Other Sign-In Options</span>
                  </motion.button>
                </div>
              </motion.form>
            )}
          </AnimatePresence>
        </motion.div>
      </main>
    </div>
  );
}


