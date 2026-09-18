import React, { useEffect } from 'react';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';
import { Statusbar } from './Statusbar';
import { ErrorBoundary } from '../components/ErrorBoundary';
import { QuickCaptureModal } from '../components/QuickCaptureModal';
import { GlobalSearchModal } from '../components/search/GlobalSearchModal';
import { LockScreen } from '../components/security/LockScreen';
import { ToastContainer } from '../components/Toast';
import { useQuickCaptureStore } from '../store/useQuickCaptureStore';
import { useSearchStore } from '../stores/searchStore';
import { useAuthStore } from '../stores/authStore';

interface AppShellProps {
  children: React.ReactNode;
}

export const AppShell: React.FC<AppShellProps> = ({ children }) => {
  const openQuickCapture = useQuickCaptureStore((state) => state.openModal);
  const toggleSearchModal = useSearchStore((state) => state.toggleModal);

  const updateActivity = useAuthStore((state) => state.updateActivityTimestamp);
  const checkAutoLock = useAuthStore((state) => state.checkAutoLock);
  const lockApp = useAuthStore((state) => state.lockApp);
  const autoLockTimeout = useAuthStore((state) => state.autoLockTimeout);

  // Global keybindings
  useEffect(() => {
    const handleGlobalShortcut = (e: KeyboardEvent) => {
      // Ctrl+Shift+C or Cmd+Shift+C -> Quick Capture
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'C' || e.key === 'c' || e.code === 'KeyC')) {
        e.preventDefault();
        openQuickCapture();
      }
      // Ctrl+K or Cmd+K -> Global Search Modal
      if ((e.ctrlKey || e.metaKey) && !e.shiftKey && (e.key === 'K' || e.key === 'k' || e.code === 'KeyK')) {
        e.preventDefault();
        toggleSearchModal();
      }
    };

    window.addEventListener('keydown', handleGlobalShortcut);
    return () => window.removeEventListener('keydown', handleGlobalShortcut);
  }, [openQuickCapture, toggleSearchModal]);

  // Idle detection & Auto-Lock timer
  useEffect(() => {
    const handleUserActivity = () => {
      updateActivity();
    };

    const handleVisibilityChange = () => {
      if (document.hidden && autoLockTimeout === 'immediate') {
        lockApp();
      }
    };

    const events = ['mousemove', 'keydown', 'click', 'touchstart', 'scroll'];
    events.forEach((ev) => window.addEventListener(ev, handleUserActivity));
    document.addEventListener('visibilitychange', handleVisibilityChange);

    const checkInterval = setInterval(() => {
      checkAutoLock();
    }, 1000);

    return () => {
      events.forEach((ev) => window.removeEventListener(ev, handleUserActivity));
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      clearInterval(checkInterval);
    };
  }, [updateActivity, checkAutoLock, lockApp, autoLockTimeout]);

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#f3f5f8] dark:bg-[#0d0f12] text-[#1f1f1f] dark:text-[#f5f6f8] antialiased transition-colors duration-200">
      {/* Sidebar Navigation */}
      <Sidebar />

      {/* Main Content Area */}
      <div className="flex flex-col flex-1 h-full overflow-hidden">
        {/* Top Header */}
        <Topbar />

        {/* Content Viewport with Error Boundary */}
        <main className="flex-1 overflow-y-auto p-6 md:p-8">
          <ErrorBoundary>{children}</ErrorBoundary>
        </main>

        {/* Bottom Statusbar */}
        <Statusbar />
      </div>

      {/* Omnipresent Rapid Capture Modal */}
      <QuickCaptureModal />

      {/* Universal Instant Search Modal (Cmd/Ctrl+K) */}
      <GlobalSearchModal />

      {/* Passcode Security Lock Screen */}
      <LockScreen />

      {/* Modern Fluent Toast Notification System */}
      <ToastContainer />
    </div>
  );
};
