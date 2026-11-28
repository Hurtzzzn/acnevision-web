import { useLayoutEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../store/auth';
import { MobileFrame } from './mobile/MobileFrame';
import { MobileBottomNav } from './mobile/MobileBottomNav';
import { LoginPromptModal } from './LoginPromptModal';
import { Toasts } from './ui';

const BOTTOM_NAV_PREFIXES = ['/dashboard', '/history', '/chat', '/detect-result', '/analysis'];

export function Layout() {
  const { pathname } = useLocation();
  const { user } = useAuth();

  useLayoutEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  const isScanRoute = pathname === '/scan' || pathname === '/analyze';
  const showBottomNav =
    (pathname === '/' && !!user) ||
    BOTTOM_NAV_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));

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
      <main className="flex-1 flex flex-col min-h-0 overflow-hidden relative pt-[env(safe-area-inset-top)]">
        <Outlet />
      </main>

      {showBottomNav && <MobileBottomNav />}

      <LoginPromptModal />
      <Toasts />
    </MobileFrame>
  );
}

export default Layout;
