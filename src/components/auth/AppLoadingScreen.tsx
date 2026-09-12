import { motion } from 'motion/react';
import { LaluzLogo } from '../ui/LaluzLogo';
import { CircularProgress } from '../ui/CircularProgress';

interface AppLoadingScreenProps {
  statusText?: string;
}

export function AppLoadingScreen({
  statusText = 'Waking up workshop systems...'
}: AppLoadingScreenProps) {
  return (
    <motion.div
      key="app-loading-screen"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{
        opacity: 0,
        y: -16,
        scale: 0.97,
        transition: { duration: 0.35, ease: [0.2, 0, 0, 1] }
      }}
      className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-workshop-bg text-workshop-text select-none overflow-hidden"
    >
      {/* Precision Canvas Dot Grid Background */}
      <div
        className="canvas-grid pointer-events-none absolute inset-0 opacity-40"
        style={{
          maskImage: 'radial-gradient(ellipse 70% 70% at 50% 50%, #000 30%, transparent 90%)',
          WebkitMaskImage: 'radial-gradient(ellipse 70% 70% at 50% 50%, #000 30%, transparent 90%)',
        }}
      />

      {/* Ambient Pulsing Aura */}
      <motion.div
        animate={{
          scale: [1, 1.15, 1],
          opacity: [0.12, 0.22, 0.12]
        }}
        transition={{
          repeat: Infinity,
          duration: 3,
          ease: 'easeInOut'
        }}
        className="pointer-events-none absolute w-72 h-72 rounded-full bg-workshop-accent/20 blur-3xl -translate-y-4"
      />

      {/* Centered Brand Unit */}
      <div className="relative z-10 flex flex-col items-center text-center space-y-6 px-6">
        {/* Animated Brand Emblem */}
        <motion.div
          animate={{
            scale: [1, 1.03, 1],
          }}
          transition={{
            repeat: Infinity,
            duration: 2.4,
            ease: 'easeInOut'
          }}
          className="relative flex items-center justify-center text-workshop-text"
        >
          <LaluzLogo size={96} showGlow={false} />
        </motion.div>

        {/* Title & Status */}
        <div className="space-y-3 flex flex-col items-center">
          <motion.p
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1, duration: 0.4 }}
            className="font-logo font-bold text-lg tracking-tight text-workshop-text"
          >
            LaluZ Garage
          </motion.p>

          {/* Micro Progress Spinner */}
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2, duration: 0.3 }}
            className="pt-1"
          >
            <CircularProgress
              size={24}
              strokeWidth={2.5}
              color="var(--color-workshop-accent)"
            />
          </motion.div>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3, duration: 0.4 }}
            className="text-[11px] font-semibold text-workshop-muted tracking-wider uppercase opacity-60 pt-0.5"
          >
            {statusText}
          </motion.p>
        </div>
      </div>
    </motion.div>
  );
}
