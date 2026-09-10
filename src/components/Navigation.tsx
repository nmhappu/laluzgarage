import { useState, useEffect } from 'react';
import { useLocation, useSearchParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useUI } from '../contexts/UIContext';
import {
  DesktopSidebar,
  MobileTopBar,
  MobileBottomNav,
  LogoutModal,
} from './nav';

export function Navigation() {
  const { logout } = useAuth();
  const { isModalOpen } = useUI();
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const location = useLocation();

  const [searchParams, setSearchParams] = useSearchParams();

  const desktopQuery = searchParams.get('q') || '';
  const setDesktopQuery = (val: string) => {
    setSearchParams((prev) => {
      if (!val) {
        prev.delete('q');
      } else {
        prev.set('q', val);
      }
      return prev;
    }, { replace: true });
  };

  const mobileQuery = searchParams.get('qm') || '';
  const setMobileQuery = (val: string) => {
    setSearchParams((prev) => {
      if (!val) {
        prev.delete('qm');
      } else {
        prev.set('qm', val);
      }
      return prev;
    }, { replace: true });
  };

  const mobileStatus = searchParams.get('status_m') || 'all';
  const setMobileStatus = (val: string) => {
    setSearchParams((prev) => {
      if (val === 'all') {
        prev.delete('status_m');
      } else {
        prev.set('status_m', val);
      }
      return prev;
    }, { replace: true });
  };

  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    let scrollContainer: Element | null = null;

    const handleScroll = () => {
      if (scrollContainer) {
        const scrolled = scrollContainer.scrollTop > 10;
        setIsScrolled((prev) => (prev !== scrolled ? scrolled : prev));
      }
    };

    const bindScroll = () => {
      scrollContainer = document.querySelector('.overflow-y-auto');
      if (scrollContainer) {
        scrollContainer.addEventListener('scroll', handleScroll, { passive: true });
        handleScroll();
        return true;
      }
      return false;
    };

    if (!bindScroll()) {
      const interval = setInterval(() => {
        if (bindScroll()) {
          clearInterval(interval);
        }
      }, 100);
      return () => {
        clearInterval(interval);
        if (scrollContainer) {
          scrollContainer.removeEventListener('scroll', handleScroll);
        }
      };
    }

    return () => {
      if (scrollContainer) {
        scrollContainer.removeEventListener('scroll', handleScroll);
      }
    };
  }, []);

  if (location.pathname === '/settings' || location.pathname === '/intake') {
    return null;
  }

  const handleLogout = async () => {
    try {
      setIsLoggingOut(true);
      setShowLogoutConfirm(false);
      await logout();
    } catch (err) {
      console.error('Logout error:', err);
      setIsLoggingOut(false);
    }
  };

  return (
    <>
      {/* Desktop Sidebar */}
      <DesktopSidebar
        isModalOpen={isModalOpen}
        desktopQuery={desktopQuery}
        onDesktopQueryChange={setDesktopQuery}
        onLogoutClick={() => setShowLogoutConfirm(true)}
      />

      {/* Mobile Top Bar */}
      <MobileTopBar
        isModalOpen={isModalOpen}
        isScrolled={isScrolled}
        mobileQuery={mobileQuery}
        onMobileQueryChange={setMobileQuery}
        mobileStatus={mobileStatus}
        onMobileStatusChange={setMobileStatus}
        onLogoutClick={() => setShowLogoutConfirm(true)}
      />

      {/* Mobile Bottom Navigation */}
      <MobileBottomNav isModalOpen={isModalOpen} />

      {/* Logout Confirmation Modal */}
      <LogoutModal
        isOpen={showLogoutConfirm}
        isLoggingOut={isLoggingOut}
        onClose={() => setShowLogoutConfirm(false)}
        onConfirm={handleLogout}
      />
    </>
  );
}
