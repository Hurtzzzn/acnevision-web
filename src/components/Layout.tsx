import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { ChevronDown, Info, Menu, X } from 'lucide-react';
import { COPY } from '@acnevision/shared';
import { useAuth } from '../store/auth';
import { USE_MOCK } from '../lib/runtime';
import { LoginPromptModal } from './LoginPromptModal';
import { Logo, Toasts } from './ui';

interface NavItem { to: string; label: string; end?: boolean }

const GUEST_LINKS: NavItem[] = [
  { to: '/', label: COPY.nav.home, end: true },
  { to: '/scan', label: COPY.nav.liveDetection },
  { to: '/how-it-works', label: COPY.nav.howItWorks },
  { to: '/about', label: COPY.nav.about },
];

// No user dashboard route exists yet; add `Dashboard` here when the page is built.
const USER_LINKS: NavItem[] = [
  { to: '/scan', label: COPY.nav.newAnalysis },
  { to: '/history', label: COPY.nav.history },
  { to: '/chat', label: COPY.nav.consultation },
];

const desktopLink = ({ isActive }: { isActive: boolean }) =>
  `whitespace-nowrap rounded-btn px-3 py-2 text-label-md transition-colors ${isActive ? 'bg-primary-50 text-primary-600' : 'text-ink-600 hover:bg-tint hover:text-ink-900'}`;

const drawerLink = ({ isActive }: { isActive: boolean }) =>
  `rounded-btn px-3 py-3 text-body-lg font-medium ${isActive ? 'bg-primary-50 text-primary-600' : 'text-ink-700 hover:bg-tint'}`;

export function Navbar() {
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const [menu, setMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const loc = useLocation();
  const navigate = useNavigate();

  useEffect(() => { setOpen(false); setMenu(false); }, [loc.pathname]);

  // Close drawer / account menu on Escape; close account menu on outside click.
  useEffect(() => {
    if (!open && !menu) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') { setOpen(false); setMenu(false); } };
    const onDown = (e: MouseEvent) => {
      if (menu && menuRef.current && !menuRef.current.contains(e.target as Node)) setMenu(false);
    };
    document.addEventListener('keydown', onKey);
    document.addEventListener('mousedown', onDown);
    return () => { document.removeEventListener('keydown', onKey); document.removeEventListener('mousedown', onDown); };
  }, [open, menu]);

  const links = user ? USER_LINKS : GUEST_LINKS;
  const displayName = user ? (user.full_name ?? user.email) : '';
  const handleLogout = async () => { await logout(); navigate('/'); };

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-surface/95 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-container items-center justify-between gap-4 px-gutter-sm md:px-margin-md xl:px-margin">
        <Link to="/" aria-label={COPY.nav.homeLabel} className="shrink-0 rounded-btn"><Logo /></Link>

        <nav className="hidden items-center gap-1 lg:flex" aria-label={COPY.nav.main}>
          {links.map((l) => (
            <NavLink key={l.to + l.label} to={l.to} end={l.end} className={desktopLink}>{l.label}</NavLink>
          ))}
        </nav>

        <div className="hidden items-center gap-2 lg:flex">
          {user ? (
            <div className="relative" ref={menuRef}>
              <button
                className="flex items-center gap-2 rounded-btn px-2 py-1.5 transition-colors hover:bg-tint"
                onClick={() => setMenu((m) => !m)}
                aria-expanded={menu}
                aria-haspopup="menu"
                aria-label={`${COPY.nav.userMenu}: ${displayName}`}
              >
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-600 text-label-md text-white" aria-hidden>
                  {displayName[0].toUpperCase()}
                </span>
                <span className="hidden max-w-[10rem] truncate text-label-md text-ink-900 lg:inline">{displayName}</span>
                <ChevronDown className={`h-4 w-4 text-ink-500 transition-transform ${menu ? 'rotate-180' : ''}`} aria-hidden />
              </button>
              {menu && (
                <div role="menu" className="absolute right-0 mt-2 w-52 overflow-hidden rounded-btn border border-border bg-white py-1 shadow-float">
                  {user.role === 'admin' && <Link role="menuitem" className="block px-4 py-2.5 text-body-md text-ink-900 hover:bg-tint" to="/admin">{COPY.nav.adminDashboard}</Link>}
                  <Link role="menuitem" className="block px-4 py-2.5 text-body-md text-ink-900 hover:bg-tint" to="/profile">{COPY.nav.profile}</Link>
                  <button role="menuitem" className="block w-full px-4 py-2.5 text-left text-body-md text-ink-900 hover:bg-tint" onClick={handleLogout}>
                    {COPY.nav.logout}
                  </button>
                </div>
              )}
            </div>
          ) : (
            <>
              <Link to="/login" className="rounded-btn px-3 py-2 text-label-md text-ink-900 transition-colors hover:bg-tint">{COPY.nav.login}</Link>
              <Link to="/scan" className="btn-primary rounded-full px-5">{COPY.nav.tryDetection}</Link>
            </>
          )}
        </div>

        <button
          className="rounded-btn p-2 text-ink-900 transition-colors hover:bg-tint lg:hidden"
          aria-label={COPY.nav.openMenu}
          aria-expanded={open}
          aria-controls="mobile-drawer"
          onClick={() => setOpen(true)}
        >
          <Menu className="h-6 w-6" aria-hidden />
        </button>
      </div>

      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-ink-900/40" onClick={() => setOpen(false)} aria-hidden />
          <aside
            id="mobile-drawer"
            role="dialog"
            aria-modal="true"
            aria-label={COPY.nav.main}
            className="absolute right-0 top-0 flex h-full w-[18rem] max-w-[85%] flex-col gap-1 bg-surface p-gutter-sm shadow-float"
          >
            <div className="mb-2 flex items-center justify-between">
              <Logo />
              <button className="rounded-btn p-2 text-ink-900 hover:bg-tint" aria-label={COPY.nav.closeMenu} onClick={() => setOpen(false)} autoFocus>
                <X className="h-6 w-6" aria-hidden />
              </button>
            </div>
            <nav className="flex flex-col gap-1" aria-label={COPY.nav.main}>
              {links.map((l) => (
                <NavLink key={l.to + l.label} to={l.to} end={l.end} className={drawerLink}>{l.label}</NavLink>
              ))}
            </nav>
            <div className="mt-auto flex flex-col gap-2 border-t border-border pt-4">
              {user ? (
                <>
                  <p className="truncate px-1 text-body-md text-ink-500">{displayName}</p>
                  {user.role === 'admin' && <Link to="/admin" className="btn-outline">{COPY.nav.adminDashboard}</Link>}
                  <Link to="/profile" className="btn-outline">{COPY.nav.profile}</Link>
                  <button className="btn-outline" onClick={handleLogout}>{COPY.nav.logout}</button>
                </>
              ) : (
                <>
                  <Link to="/login" className="btn-outline">{COPY.nav.login}</Link>
                  <Link to="/scan" className="btn-primary rounded-full">{COPY.nav.tryDetection}</Link>
                </>
              )}
            </div>
          </aside>
        </div>
      )}
    </header>
  );
}

export function Footer() {
  const { user } = useAuth();
  const navLinks = user ? USER_LINKS : GUEST_LINKS;
  const linkCls = 'text-body-md text-ink-600 hover:text-primary-600';
  return (
    <footer className="mt-16 border-t border-border bg-tint">
      <div className="mx-auto max-w-container px-gutter-sm py-10 md:px-margin-md xl:px-margin">
        <div className="grid gap-8 md:grid-cols-[2fr_1fr_1fr]">
          <div>
            <Logo />
            <p className="mt-3 max-w-sm text-body-md text-ink-600">{COPY.footer.tagline}</p>
            <p className="mt-2 max-w-sm text-body-sm text-ink-500">{COPY.footer.project}</p>
          </div>
          <nav aria-label={COPY.footer.navTitle}>
            <h2 className="text-label-md text-ink-900">{COPY.footer.navTitle}</h2>
            <ul className="mt-3 space-y-2">
              {navLinks.map((l) => <li key={l.to + l.label}><Link to={l.to} className={linkCls}>{l.label}</Link></li>)}
            </ul>
          </nav>
          <nav aria-label={COPY.footer.accessTitle}>
            <h2 className="text-label-md text-ink-900">{COPY.footer.accessTitle}</h2>
            <ul className="mt-3 space-y-2">
              {user ? (
                <li><Link to="/profile" className={linkCls}>{COPY.nav.profile}</Link></li>
              ) : (
                <>
                  <li><Link to="/login" className={linkCls}>{COPY.nav.login}</Link></li>
                  <li><Link to="/register" className={linkCls}>{COPY.footer.register}</Link></li>
                </>
              )}
            </ul>
          </nav>
        </div>
        <div className="mt-8 border-t border-border pt-5 text-body-sm text-ink-500">
          <p>{COPY.disclaimer}</p>
          {USE_MOCK && (
            <p className="mt-2 flex items-center gap-1.5">
              <Info className="h-3.5 w-3.5 shrink-0" aria-hidden />
              {COPY.footer.demoNote}
            </p>
          )}
          <p className="mt-2">© {new Date().getFullYear()} {COPY.appName}</p>
        </div>
      </div>
    </footer>
  );
}

export function Layout() {
  const { pathname } = useLocation();
  useEffect(() => { window.scrollTo(0, 0); }, [pathname]);
  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main className="mx-auto w-full max-w-container flex-1 px-gutter-sm py-8 md:px-margin-md xl:px-margin"><Outlet /></main>
      <Footer />
      <LoginPromptModal />
      <Toasts />
    </div>
  );
}
