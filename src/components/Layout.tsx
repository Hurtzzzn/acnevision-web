import { useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { ChevronDown, Lock, Menu, X } from 'lucide-react';
import { COPY } from '@acnevision/shared';
import { useAuth } from '../store/auth';
import { useUi } from '../store/ui';
import { USE_MOCK } from '../lib/runtime';
import { LoginPromptModal } from './LoginPromptModal';
import { Logo, Toasts } from './ui';

export function Navbar() {
  const { user, logout } = useAuth();
  const openLoginPrompt = useUi((s) => s.openLoginPrompt);
  const [open, setOpen] = useState(false);
  const [menu, setMenu] = useState(false);
  const loc = useLocation();
  const navigate = useNavigate();

  useEffect(() => { setOpen(false); setMenu(false); }, [loc.pathname]);

  const link = ({ isActive }: { isActive: boolean }) =>
    `rounded-btn px-3 py-2 text-sm font-medium ${isActive ? 'text-primary-600' : 'text-ink-600 hover:text-ink-900'}`;

  const items = (
    <>
      <NavLink to="/" end className={link}>Home</NavLink>
      <NavLink to="/scan" className={link}>Live Detection</NavLink>
      {user ? (
        <NavLink to="/history" className={link}>History</NavLink>
      ) : (
        <button
          className="rounded-btn px-3 py-2 text-left text-sm font-medium text-ink-600 hover:text-ink-900"
          onClick={() => openLoginPrompt({ message: COPY.loginGateHistory, redirectTo: '/history' })}
        >
          History <Lock className="ml-0.5 inline h-3 w-3" aria-label="terkunci" />
        </button>
      )}
      {user && <NavLink to="/chat" className={link}>Konsultasi</NavLink>}
      <NavLink to="/about" className={link}>About</NavLink>
      {user?.role === 'admin' && <NavLink to="/admin" className={link}>Admin</NavLink>}
    </>
  );

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-surface/95 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-container items-center justify-between px-4">
        <Link to="/" aria-label="Beranda AcneVision AI"><Logo /></Link>
        <nav className="hidden items-center gap-1 md:flex" aria-label="Navigasi utama">{items}</nav>

        <div className="hidden items-center gap-2 md:flex">
          {user ? (
            <div className="relative">
              <button className="flex items-center gap-2 rounded-btn px-2 py-1.5 hover:bg-primary-50" onClick={() => setMenu((m) => !m)} aria-expanded={menu}>
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-600 text-sm font-semibold text-white">
                  {(user.full_name ?? user.email)[0].toUpperCase()}
                </span>
                <span className="text-sm font-medium text-ink-900">{user.full_name ?? user.email}</span>
                <ChevronDown className="h-4 w-4" aria-hidden />
              </button>
              {menu && (
                <div className="absolute right-0 mt-2 w-48 rounded-btn border border-border bg-white py-1 shadow-card">
                  {user.role === 'admin' && <Link className="block px-4 py-2 text-sm hover:bg-primary-50" to="/admin">Dashboard Admin</Link>}
                  <Link className="block px-4 py-2 text-sm hover:bg-primary-50" to="/profile">Profil</Link>
                  <button
                    className="block w-full px-4 py-2 text-left text-sm hover:bg-primary-50"
                    onClick={async () => { await logout(); navigate('/'); }}
                  >Keluar</button>
                </div>
              )}
            </div>
          ) : (
            <>
              <Link to="/login" className="btn-outline">Masuk</Link>
              <Link to="/scan" className="btn-primary">Mulai Analisis</Link>
            </>
          )}
        </div>

        <button className="rounded p-2 md:hidden" aria-label={open ? 'Tutup menu' : 'Buka menu'} onClick={() => setOpen((o) => !o)}>
          {open ? <X /> : <Menu />}
        </button>
      </div>

      {open && (
        <div className="flex flex-col gap-1 border-t border-border bg-surface px-4 py-3 md:hidden">
          {items}
          <div className="mt-2 flex flex-col gap-2">
            {user ? (
              <>
                <Link to="/profile" className="btn-outline">Profil</Link>
                <button className="btn-outline" onClick={async () => { await logout(); navigate('/'); }}>Keluar</button>
              </>
            ) : (
              <>
                <Link to="/login" className="btn-outline">Masuk</Link>
                <Link to="/scan" className="btn-primary">Mulai Analisis</Link>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
}

export function Footer() {
  return (
    <footer className="mt-16 border-t border-border bg-surface">
      <div className="mx-auto max-w-container px-4 py-8 text-sm">
        <div className="flex flex-col justify-between gap-4 md:flex-row">
          <div>
            <Logo />
            <p className="mt-2 max-w-md text-ink-400">Proyek mata kuliah Project Teknologi Informasi bersama PT. Dutormasi Membangun Indonesia.</p>
          </div>
          <p className="max-w-md text-xs text-ink-400">{COPY.disclaimer}</p>
        </div>
        {USE_MOCK && <p className="mt-4 text-xs text-warning">Mode demo: backend dan hasil deteksi disimulasikan di browser, bukan output model AI.</p>}
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
      <main className="mx-auto w-full max-w-container flex-1 px-4 py-8"><Outlet /></main>
      <Footer />
      <LoginPromptModal />
      <Toasts />
    </div>
  );
}
