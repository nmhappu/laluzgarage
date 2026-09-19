import { useEffect, useState, lazy, Suspense, useRef } from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation, useNavigate, Navigate, type Location } from 'react-router-dom';
import { Navigation } from './components/Navigation';
import { motion, AnimatePresence } from 'motion/react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { UIProvider } from './contexts/UIContext';
import { LoginPage } from './components/LoginPage';
import { PendingApprovalPage } from './components/PendingApprovalPage';
import { SystemBars } from './components/SystemBars';
import { BackButtonHandler } from './components/BackButtonHandler';
import { ThemeProvider } from './contexts/ThemeContext';
import { getUserRole } from './types';
import { AppLoadingScreen } from './components/auth/AppLoadingScreen';
import { SplashScreen } from '@capacitor/splash-screen';
import { UpdatePromptModal } from './components/shared/UpdatePromptModal';
import { OtaUpdateService, type OtaReleaseInfo } from './services/otaUpdateService';

const Dashboard = lazy(() => import('./components/Dashboard').then((m) => ({ default: m.Dashboard })));
const VehicleHistory = lazy(() => import('./components/VehicleHistory').then((m) => ({ default: m.VehicleHistory })));
const Inventory = lazy(() => import('./components/Inventory').then((m) => ({ default: m.Inventory })));
const ServiceHistory = lazy(() => import('./components/ServiceHistory').then((m) => ({ default: m.ServiceHistory })));
const SettingsPage = lazy(() => import('./components/SettingsModal').then((m) => ({ default: m.SettingsPage })));
const ServiceIntakePage = lazy(() => import('./components/ServiceIntake').then((m) => ({ default: m.ServiceIntakePage })));

const m3Variants = {
  enter: {
    opacity: 0,
    y: 12,
  },
  center: {
    opacity: 1,
    y: 0,
  },
  exit: {
    opacity: 0,
    y: -8,
  },
};

function RouteLoadingFallback() {
  return (
    <div className="w-full py-24 flex flex-col items-center justify-center gap-3 text-workshop-muted">
      <div className="w-6 h-6 border-2 border-workshop-accent border-t-transparent rounded-full animate-spin shrink-0" />
      <span className="text-[11px] font-bold uppercase tracking-widest opacity-60">Loading view...</span>
    </div>
  );
}

function StandardRoutes({ standardLocation }: { standardLocation: Location }) {
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={standardLocation.pathname}
        variants={m3Variants}
        initial="enter"
        animate="center"
        exit="exit"
        transition={{ duration: 0.2, ease: [0.2, 0, 0, 1] }}
        style={{ willChange: "transform, opacity" }}
        className="w-full max-w-7xl mx-auto"
      >
        <Suspense fallback={<RouteLoadingFallback />}>
          <Routes location={standardLocation}>
            <Route path="/" element={<Dashboard />} />
            <Route path="/vehicles" element={<VehicleHistory />} />
            <Route path="/inventory" element={<Inventory />} />
            <Route path="/services" element={<ServiceHistory />} />
            <Route path="/analytics" element={<Navigate to="/settings/statistics" replace />} />
          </Routes>
        </Suspense>
      </motion.div>
    </AnimatePresence>
  );
}

function MainLayout() {
  const { user, profile } = useAuth();
  const location = useLocation();
  const isFullScreen = location.pathname.startsWith('/settings') || location.pathname.startsWith('/intake');
  const role = getUserRole(profile);

  // Preserve the last visited standard location so that background pages (like Dashboard or Vehicles)
  // remain stably rendered in place without remounting, layout shifts, or unpadded stretching
  // while full-screen views (Settings / Intake) enter or exit.
  const lastStandardLocationRef = useRef<Location>(
    isFullScreen ? ({ ...location, pathname: '/' } as Location) : location
  );

  if (!isFullScreen && !location.pathname.startsWith('/analytics')) {
    lastStandardLocationRef.current = location;
  }

  const standardLocation = isFullScreen ? lastStandardLocationRef.current : location;

  return (
    <div className="relative h-mobile-screen overflow-hidden bg-workshop-bg text-workshop-text">
      {/* Persistent Standard Workspace Layout Shell */}
      <div
        className="flex flex-col md:flex-row h-full w-full overflow-hidden"
        inert={isFullScreen}
        aria-hidden={isFullScreen ? true : undefined}
      >
        <Navigation />

        <main className="flex-1 flex flex-col min-h-0 min-w-0 bg-transparent text-workshop-text relative">
          <div className="flex-1 min-h-0 overflow-y-auto scroll-smooth main-content-scroll px-4 md:px-8 lg:px-10 md:pt-6.5 md:pb-8">
            <StandardRoutes standardLocation={standardLocation} />
          </div>

          <footer className="hidden md:flex h-10 bg-workshop-surface border-t border-workshop-border px-8 items-center justify-between text-[10px] text-workshop-muted shrink-0 shadow-[0_-4px_20px_rgba(0,0,0,0.1)] transition-colors">
            <div className="flex items-center gap-8 h-full">
              <div className="flex items-center gap-3">
                <span className="opacity-40 uppercase tracking-[0.2em] font-bold">
                  {role ? `${role}:` : 'User:'}
                </span>
                <span className="text-workshop-text font-black uppercase tracking-[0.2em] opacity-80">
                  {profile?.name || user?.displayName || user?.email}
                </span>
              </div>
            </div>
          </footer>
        </main>
      </div>

      {/* Standalone Full-Screen View Overlay Layer (Settings, Service Intake) */}
      <AnimatePresence>
        {isFullScreen && (
          <motion.div
            key="fullscreen-overlay"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2, ease: [0.2, 0, 0, 1] }}
            style={{ willChange: "transform, opacity" }}
            className="fixed inset-0 z-[60] bg-workshop-bg flex flex-col overflow-hidden viewport-fill"
          >
            <Suspense fallback={<RouteLoadingFallback />}>
              <Routes location={location}>
                <Route path="/settings/*" element={<SettingsPage />} />
                <Route path="/intake" element={<ServiceIntakePage />} />
              </Routes>
            </Suspense>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function AppContent() {
  const { user, profile, loading } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  // Dismiss native splash screen smoothly into the web loading view
  useEffect(() => {
    SplashScreen.hide({ fadeOutDuration: 400 }).catch(() => {});
  }, []);

  useEffect(() => {
    if (!loading && !user && location.pathname !== '/') {
      navigate('/', { replace: true });
    }
  }, [loading, user, location.pathname, navigate]);

  const role = getUserRole(profile);

  // Background OTA update check on startup
  const [promptRelease, setPromptRelease] = useState<OtaReleaseInfo | null>(null);
  const [installedVer, setInstalledVer] = useState<string>('0.2.0');

  useEffect(() => {
    if (!user || !role) return;
    if (!OtaUpdateService.isAutoCheckEnabled()) return;

    const timer = setTimeout(async () => {
      try {
        const res = await OtaUpdateService.checkForUpdates();
        if (res.hasUpdate && res.release) {
          setPromptRelease(res.release);
          setInstalledVer(res.currentVersion);
        }
      } catch {
        // Silent on background check
      }
    }, 2500);

    return () => clearTimeout(timer);
  }, [user, role]);

  return (
    <>
      <SystemBars />
      <BackButtonHandler />
      <UpdatePromptModal
        isOpen={Boolean(promptRelease)}
        onClose={() => setPromptRelease(null)}
        onUpdate={() => {
          setPromptRelease(null);
          navigate('/settings/updates');
        }}
        release={promptRelease}
        currentVersion={installedVer}
      />
      <AnimatePresence mode="wait">
        {loading ? (
          <AppLoadingScreen key="app-loading-screen" />
        ) : !user ? (
          <motion.div
            key="app-login-view"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{
              opacity: 0,
              y: -8,
              transition: { duration: 0.2, ease: [0.2, 0, 0, 1] },
            }}
            transition={{ duration: 0.35, ease: [0.2, 0, 0, 1] }}
            className="w-full min-h-screen"
          >
            <LoginPage />
          </motion.div>
        ) : !role ? (
          <motion.div
            key="app-pending-view"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{
              opacity: 0,
              y: -8,
              transition: { duration: 0.2, ease: [0.2, 0, 0, 1] },
            }}
            transition={{ duration: 0.35, ease: [0.2, 0, 0, 1] }}
            className="w-full min-h-screen"
          >
            <PendingApprovalPage />
          </motion.div>
        ) : (
          <motion.div
            key="app-main-layout"
            initial={{ opacity: 0, scale: 0.99 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, transition: { duration: 0.2 } }}
            transition={{ duration: 0.35, ease: [0.2, 0, 0, 1] }}
            className="w-full h-full"
          >
            <MainLayout />
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <UIProvider>
          <Router>
            <AppContent />
          </Router>
        </UIProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
