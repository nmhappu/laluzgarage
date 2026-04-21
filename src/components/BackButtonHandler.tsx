import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { App } from '@capacitor/app';
import { motion, AnimatePresence } from 'motion/react';

export function BackButtonHandler() {
  const location = useLocation();
  const navigate = useNavigate();
  const lastPressRef = useRef<number>(0);
  const [showExitHint, setShowExitHint] = useState(false);

  useEffect(() => {
    const initListener = async () => {
      const handler = await App.addListener('backButton', () => {
        if (location.pathname !== '/') {
          // If not on dashboard, navigate back to dashboard
          navigate('/');
        } else {
          // On dashboard, implement double-press to exit
          const now = Date.now();
          if (now - lastPressRef.current < 2000) {
            // Exit app if second press is within 2 seconds
            App.exitApp();
          } else {
            // First press on dashboard
            lastPressRef.current = now;
            setShowExitHint(true);
            setTimeout(() => setShowExitHint(false), 2000);
          }
        }
      });

      return handler;
    };

    const listenerPromise = initListener();

    return () => {
      listenerPromise.then(handler => handler.remove());
    };
  }, [location.pathname, navigate]);

  return (
    <AnimatePresence>
      {showExitHint && (
        <motion.div 
          initial={{ opacity: 0, y: 20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 10, scale: 0.95 }}
          className="fixed bottom-32 left-1/2 -translate-x-1/2 z-[999] pointer-events-none"
        >
          <div className="bg-workshop-surface/95 backdrop-blur-md border border-workshop-accent/30 px-6 py-3 rounded-2xl shadow-[0_8px_32px_rgba(0,0,0,0.4)] flex items-center gap-3">
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
