import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import { Navigation } from './components/Navigation';
import { Dashboard } from './components/Dashboard';
import { VehicleHistory } from './components/VehicleHistory';
import { Inventory } from './components/Inventory';
import { ServiceHistory } from './components/ServiceHistory';
import { motion, AnimatePresence } from 'motion/react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { UIProvider } from './contexts/UIContext';
import { LoginPage } from './components/LoginPage';
import { SystemBars } from './components/SystemBars';
import { BackButtonHandler } from './components/BackButtonHandler';
import { ThemeProvider } from './contexts/ThemeContext';

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
        <Routes location={location}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/vehicles" element={<VehicleHistory />} />
          <Route path="/inventory" element={<Inventory />} />
          <Route path="/services" element={<ServiceHistory />} />
        </Routes>
      </motion.div>
    </AnimatePresence>
  );
}

function AppContent() {
  const { user } = useAuth();

  if (!user) {
    return (
      <>
        <SystemBars />
        <LoginPage />
      </>
    );
  }

  return (
    <Router>
      <SystemBars />
      <BackButtonHandler />
      <div className="flex flex-col md:flex-row h-mobile-screen overflow-hidden bg-workshop-bg">
        <Navigation />
        
        <main className="flex-1 flex flex-col min-h-0 min-w-0 bg-transparent text-workshop-text relative">
          <div className="flex-1 overflow-y-auto p-4 md:p-8 lg:p-10 pt-[calc(5.5rem+env(safe-area-inset-top,0px))] md:pt-8 scroll-smooth pb-32 md:pb-8">
            <AnimatedRoutes />
          </div>

          <footer className="hidden md:flex h-10 bg-workshop-surface border-t border-workshop-border px-8 items-center justify-between text-[10px] text-workshop-muted shrink-0 shadow-[0_-4px_20px_rgba(0,0,0,0.1)] transition-colors">
            <div className="flex items-center gap-8 h-full">
              <div className="flex items-center gap-3">
                <span className="opacity-40 uppercase tracking-[0.2em] font-bold">Advisor:</span>
                <span className="text-workshop-text font-black uppercase tracking-[0.2em] opacity-80">{user.displayName || user.email}</span>
              </div>
            </div>
          </footer>
        </main>
      </div>
    </Router>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <UIProvider>
          <AppContent />
        </UIProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
