import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Navigation } from './components/Navigation';
import { Dashboard } from './components/Dashboard';
import { CustomerManagement } from './components/CustomerManagement';
import { Inventory } from './components/Inventory';
import { ServiceHistory } from './components/ServiceHistory';
import { motion } from 'motion/react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { LoginPage } from './components/LoginPage';
import { SystemBars } from './components/SystemBars';
import { BackButtonHandler } from './components/BackButtonHandler';

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
        
        <main className="flex-1 flex flex-col min-h-0 bg-transparent text-workshop-text relative">
          <div className="flex-1 overflow-y-auto p-4 md:p-8 lg:p-10 pt-[calc(5.5rem+env(safe-area-inset-top,0px))] md:pt-8 scroll-smooth pb-32 md:pb-8">
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="max-w-7xl mx-auto"
            >
              <Routes>
                <Route path="/" element={<Dashboard />} />
                <Route path="/customers" element={<CustomerManagement />} />
                <Route path="/inventory" element={<Inventory />} />
                <Route path="/services" element={<ServiceHistory />} />
              </Routes>
            </motion.div>
          </div>

          <footer className="hidden md:flex h-10 bg-[#08090C] border-t border-workshop-border px-8 items-center justify-between text-[10px] text-workshop-muted shrink-0 shadow-[0_-4px_20px_rgba(0,0,0,0.4)]">
            <div className="flex items-center gap-8 h-full">
              <div className="flex items-center gap-3">
                <div className="w-1.5 h-1.5 rounded-full bg-workshop-accent shadow-[0_0_10px_rgba(16,185,129,0.5)] animate-pulse" />
                <span className="opacity-40 uppercase tracking-[0.2em] font-bold">System Status:</span>
                <span className="text-workshop-accent font-black uppercase tracking-[0.2em]">Active</span>
              </div>
              <div className="flex items-center gap-3 border-l border-workshop-border pl-8 h-4">
                <span className="opacity-40 uppercase tracking-[0.2em] font-bold">Advisor:</span>
                <span className="text-workshop-text font-black uppercase tracking-[0.2em] opacity-80">{user.displayName || user.email}</span>
              </div>
            </div>
            <div className="hidden sm:block uppercase tracking-[0.3em] font-black text-rose-400 drop-shadow-[0_0_12px_rgba(251,113,133,0.15)]">Production Sync Ready</div>
          </footer>
        </main>
      </div>
    </Router>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
