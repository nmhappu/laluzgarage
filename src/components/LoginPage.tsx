import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Wrench, ChevronRight, Mail, Lock, AlertCircle, User as UserIcon } from 'lucide-react';
import { motion } from 'motion/react';

export function LoginPage() {
  const { login, loginWithGoogle, register } = useAuth();
  const [isRegistering, setIsRegistering] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  const handleGoogleSignIn = async () => {
    setError(null);
    setGoogleLoading(true);
    try {
      await loginWithGoogle();
    } catch (err: unknown) {
      console.error('Google sign-in error:', err);
      const error = err as { code?: string; message?: string };
      if (error.code === 'auth/popup-closed-by-user' || error.code === 'auth/cancelled-popup-request') {
        return;
      }
      if (error.code === 'auth/popup-blocked') {
        setError('Popup was blocked by your browser. Please allow popups and try again.');
        return;
      }
      if (error.code === 'auth/account-exists-with-different-credential') {
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
      if (isRegistering) {
        if (!displayName.trim()) {
          throw new Error('Please enter your full name');
        }
        await register(email, password, displayName);
      } else {
        await login(email, password);
      }
    } catch (err: unknown) {
      console.error('Auth action failed:', err);
      if (err instanceof Error) {
        setError(err.message);
        return;
      }
      const error = err as { code?: string };
      // Friendly error mapping
      if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password') {
        setError('Invalid credentials. Please try again.');
      } else if (error.code === 'auth/email-already-in-use') {
        setError('This email is already associated with an account.');
      } else if (error.code === 'auth/weak-password') {
        setError('Password should be at least 6 characters.');
      } else {
        setError('Authentication failed. Check your data and try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-workshop-bg flex items-center justify-center p-4 safe-top safe-bottom relative">
      <div className="max-w-md w-full">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-workshop-card rounded-xl shadow-2xl overflow-hidden p-8 md:p-10 space-y-8 border border-workshop-border"
        >
          <div className="flex flex-col items-center text-center space-y-2">
            <div className="w-16 h-16 bg-workshop-accent rounded-xl flex items-center justify-center shadow-lg shadow-workshop-accent/10 mb-2">
              <Wrench className="w-8 h-8 text-workshop-bg" />
            </div>
            <h1 className="text-3xl font-logo font-semibold text-workshop-text tracking-tight">LaluZ Garage</h1>
            <p className="text-workshop-muted text-xs font-bold uppercase tracking-[0.2em] opacity-60">Workshop Management Core</p>
          </div>

          <div className="space-y-4">
            <button
              type="button"
              disabled={googleLoading || loading}
              onClick={handleGoogleSignIn}
              className="w-full flex items-center justify-center gap-3 bg-workshop-surface border border-workshop-border hover:border-workshop-accent/50 text-workshop-text hover:bg-workshop-surface/80 px-6 py-3.5 rounded-xl font-bold text-xs uppercase tracking-[0.15em] transition-all active:scale-[0.98] shadow-sm disabled:opacity-50 disabled:cursor-not-allowed group cursor-pointer"
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
              <span>{googleLoading ? 'Signing in with Google...' : 'Continue with Google'}</span>
            </button>

            <div className="flex items-center gap-4 py-1">
              <div className="flex-1 h-px bg-workshop-border/60" />
              <span className="text-[10px] uppercase font-bold tracking-widest text-workshop-muted/60 select-none">
                Or with credentials
              </span>
              <div className="flex-1 h-px bg-workshop-border/60" />
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-4">
              {isRegistering && (
                <div className="relative group">
                  <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-workshop-muted group-focus-within:text-workshop-accent transition-colors" />
                  <input
                    type="text"
                    placeholder="Full Name / Advisor Name"
                    required
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    className="w-full bg-workshop-surface border border-workshop-border rounded-xl py-4 pl-12 pr-4 text-workshop-text placeholder:text-workshop-muted/50 focus:outline-none focus:ring-1 focus:ring-workshop-accent/30 focus:border-workshop-accent/50 transition-all font-bold text-sm"
                  />
                </div>
              )}

              <div className="relative group">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-workshop-muted group-focus-within:text-workshop-accent transition-colors" />
                <input
                  type="email"
                  placeholder="Technician Email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-workshop-surface border border-workshop-border rounded-xl py-4 pl-12 pr-4 text-workshop-text placeholder:text-workshop-muted/50 focus:outline-none focus:ring-1 focus:ring-workshop-accent/30 focus:border-workshop-accent/50 transition-all font-bold text-sm"
                />
              </div>

              <div className="relative group">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-workshop-muted group-focus-within:text-workshop-accent transition-colors" />
                <input
                  type="password"
                  placeholder="Security Password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-workshop-surface border border-workshop-border rounded-xl py-4 pl-12 pr-4 text-workshop-text placeholder:text-workshop-muted/50 focus:outline-none focus:ring-1 focus:ring-workshop-accent/30 focus:border-workshop-accent/50 transition-all font-bold text-sm"
                />
              </div>
            </div>

            {error && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex items-center gap-2 p-4 bg-status-urgent/10 border border-status-urgent/20 text-status-urgent rounded-xl text-[10px] font-black uppercase tracking-widest"
              >
                <AlertCircle className="w-4 h-4 shrink-0" />
                {error}
              </motion.div>
            )}

            <button
              disabled={loading}
              type="submit"
              className="w-full flex items-center justify-between bg-workshop-accent text-workshop-bg px-8 py-4 rounded-xl font-black text-xs uppercase tracking-[0.2em] hover:brightness-110 disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-95 shadow-lg shadow-workshop-accent/10 group"
            >
              <span>{loading ? 'Processing...' : isRegistering ? 'Initialize Account' : 'Authenticate Console'}</span>
              {!loading && <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />}
            </button>
          </form>

          <div className="text-center pt-2">
            <button
              onClick={() => setIsRegistering(!isRegistering)}
              className="text-[10px] font-black text-workshop-muted hover:text-workshop-accent uppercase tracking-[0.2em] transition-colors"
            >
              {isRegistering ? 'Already have access? Login' : 'Need new credentials? Register'}
            </button>
          </div>
        </motion.div>
        
        <div className="mt-12 text-center text-workshop-muted text-[10px] flex flex-col gap-3">
          <p className="font-bold opacity-30 uppercase tracking-[0.3em]">© 2026 LaluZ Garage Precision Workshop</p>
          <div className="flex items-center justify-center gap-4 opacity-20 font-numeric">
            <span>SECURE-NODE-AUTH</span>
            <span className="w-1 h-1 bg-workshop-muted rounded-full" />
            <span>v1.1.2-ALPHA</span>
          </div>
        </div>
      </div>
    </div>
  );
}
