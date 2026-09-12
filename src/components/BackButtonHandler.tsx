import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { App } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';
import { motion, AnimatePresence } from 'motion/react';
import { useUI } from '../contexts/UIContext';

export function BackButtonHandler() {
  const location = useLocation();
  const navigate = useNavigate();
  const lastPressRef = useRef<number>(0);
  const [showExitHint, setShowExitHint] = useState(false);
  const { executeBackAction, isModalOpen } = useUI();

  // Stable refs to prevent recreating listeners on route changes
  const locationRef = useRef(location);
  const navigateRef = useRef(navigate);
  const executeBackActionRef = useRef(executeBackAction);
  const isModalOpenRef = useRef(isModalOpen);

  useEffect(() => {
    locationRef.current = location;
  }, [location]);

  useEffect(() => {
    navigateRef.current = navigate;
  }, [navigate]);

  useEffect(() => {
    executeBackActionRef.current = executeBackAction;
  }, [executeBackAction]);

  useEffect(() => {
    isModalOpenRef.current = isModalOpen;
  }, [isModalOpen]);

  // Handle standard browser/PWA popstate (swipe-back on mobile browser)
  useEffect(() => {
    const handlePopState = () => {
      // If an overlay/modal was active, close it and prevent leaving the current view
      if (isModalOpenRef.current) {
        const handled = executeBackActionRef.current();
        if (handled) {
          // Keep current route stable on browser back
          const currentPath = locationRef.current.pathname + locationRef.current.search;
          window.history.pushState(null, '', currentPath);
        }
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Native Capacitor hardware & gesture back button listener
  useEffect(() => {
    let removeHandler: (() => void) | null = null;

    const initListener = async () => {
      try {
        const handler = await App.addListener('backButton', () => {
          // 1. First, check if any active overlay/modal/drawer/wizard step consumed the back event
          const handled = executeBackActionRef.current();
          if (handled) {
            return;
          }

          const currentPath = locationRef.current.pathname;

          // 2. If in full-screen sub-routes (/settings, /intake), navigate back in history or to dashboard
          if (currentPath === '/settings' || currentPath === '/intake') {
            if (window.history.length > 1) {
              navigateRef.current(-1);
            } else {
              navigateRef.current('/', { replace: true });
            }
            return;
          }

          // 3. If on non-dashboard tabs (/vehicles, /inventory, /services), navigate back or to dashboard
          if (currentPath !== '/') {
            if (window.history.length > 1) {
              navigateRef.current(-1);
            } else {
              navigateRef.current('/', { replace: true });
            }
            return;
          }

          // 4. On root dashboard or auth screens, enforce 2-second double-press to exit
          const now = Date.now();
          if (now - lastPressRef.current < 2000) {
            App.exitApp();
          } else {
            lastPressRef.current = now;
            setShowExitHint(true);
            setTimeout(() => setShowExitHint(false), 2000);
          }
        });

        removeHandler = () => {
          handler.remove();
        };
      } catch (err) {
        if (Capacitor.isNativePlatform()) {
          console.warn('Capacitor App backButton listener registration error:', err);
        }
      }
    };

    initListener();

    return () => {
      if (removeHandler) {
        removeHandler();
      }
    };
  }, []);

  return (
    <AnimatePresence>
      {showExitHint && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 8 }}
          transition={{ duration: 0.2, ease: [0.2, 0, 0, 1] }}
          style={{ willChange: 'transform, opacity' }}
          className="fixed bottom-32 left-1/2 -translate-x-1/2 z-[9999] pointer-events-none"
        >
          <div className="bg-workshop-surface border border-workshop-accent/30 px-6 py-3 rounded-2xl shadow-[0_8px_32px_rgba(0,0,0,0.45)] flex items-center gap-3">
            <div className="w-1.5 h-1.5 rounded-full bg-workshop-accent animate-pulse" />
            <p className="text-workshop-text text-[10px] font-black uppercase tracking-[0.2em] leading-none whitespace-nowrap">
              Press back again to exit
            </p>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
