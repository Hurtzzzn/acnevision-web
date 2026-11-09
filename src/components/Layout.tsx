import { useLayoutEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../store/auth';
import { MobileFrame } from './mobile/MobileFrame';
import { MobileStatusBar } from './mobile/MobileStatusBar';
import { MobileBottomNav } from './mobile/MobileBottomNav';
import { LoginPromptModal } from './LoginPromptModal';
import { Toasts } from './ui';

export function Layout() {
  const { pathname } = useLocation();
  const { user } = useAuth();

  useLayoutEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  const isScanRoute = pathname === '/scan';
  const isGuestLanding = pathname === '/' && !user;

  // Scan route manages its own full-screen camera container & dark status bar
  if (isScanRoute) {
    return (
      <MobileFrame dark={true}>
        <main className="flex-1 flex flex-col min-h-0">
          <Outlet />
        </main>
        <LoginPromptModal />
        <Toasts />
      </MobileFrame>
    );
  }

  return (
    <MobileFrame dark={false}>
      {/* Top Mobile Status Bar */}
      <MobileStatusBar dark={false} time="08.42" />

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-h-0 overflow-hidden relative">
        <Outlet />
      </main>

      {/* Bottom Navigation Bar (Hidden only on guest landing screen) */}
      {!isGuestLanding && <MobileBottomNav />}

      <LoginPromptModal />
      <Toasts />
    </MobileFrame>
  );
}

export default Layout;
