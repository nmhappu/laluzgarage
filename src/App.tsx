import { useEffect, lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation, useNavigate } from 'react-router-dom';
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

function AnimatedRoutes() {
  const location = useLocation();
  
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={location.pathname}
        variants={m3Variants}
        initial="enter"
        animate="center"
        exit="exit"
        transition={{ duration: 0.2, ease: [0.2, 0, 0, 1] }}
        style={{ willChange: "transform, opacity" }}
        className="w-full max-w-7xl mx-auto"
      >
        <Suspense fallback={<RouteLoadingFallback />}>
          <Routes location={location}>
            <Route path="/" element={<Dashboard />} />
            <Route path="/vehicles" element={<VehicleHistory />} />
            <Route path="/inventory" element={<Inventory />} />
            <Route path="/services" element={<ServiceHistory />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="/intake" element={<ServiceIntakePage />} />
          </Routes>
        </Suspense>
      </motion.div>
    </AnimatePresence>
  );
}

function MainLayout() {
  const { user, profile } = useAuth();
  const location = useLocation();
  const isFullScreen = ['/settings', '/intake'].includes(location.pathname);
  const role = getUserRole(profile);

  if (isFullScreen) {
    return (
      <div className="h-mobile-screen overflow-y-auto bg-workshop-bg text-workshop-text">
        <AnimatedRoutes />
      </div>
    );
  }

  return (
    <div className="flex flex-col md:flex-row h-mobile-screen overflow-hidden bg-workshop-bg">
      <Navigation />
      
      <main className="flex-1 flex flex-col min-h-0 min-w-0 bg-transparent text-workshop-text relative">
        <div className="flex-1 overflow-y-auto scroll-smooth main-content-scroll px-4 md:px-8 lg:px-10 md:pt-6.5 md:pb-8">
          <AnimatedRoutes />
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

  return (
    <>
      <SystemBars />
      <BackButtonHandler />
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
