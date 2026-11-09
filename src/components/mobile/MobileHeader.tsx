import { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ScanFace, User, LogOut } from 'lucide-react';
import { useAuth } from '../../store/auth';

interface MobileHeaderProps {
  onLoginClick?: () => void;
}

export function MobileHeader({ onLoginClick }: MobileHeaderProps) {
  const { user, logout, login } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const handleOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    if (menuOpen) {
      document.addEventListener('mousedown', handleOutside);
    }
    return () => document.removeEventListener('mousedown', handleOutside);
  }, [menuOpen]);

  const handleQuickLogin = async () => {
    try {
      await login('demo@acnevision.test', 'demo12345');
      navigate('/dashboard');
    } catch {
      if (onLoginClick) onLoginClick();
      else navigate('/login');
    }
  };

  const handleLogout = async () => {
    await logout();
    setMenuOpen(false);
    navigate('/');
  };

  const displayName = user?.full_name || user?.email || 'Nadia';
  const initial = (user?.full_name?.[0] || 'N').toUpperCase();

  return (
    <header className="flex items-center justify-between px-5 py-3 bg-white z-30">
      {/* Logo */}
      <Link to={user ? '/dashboard' : '/'} className="flex items-center gap-2.5">
        <div className="w-9 h-9 rounded-xl bg-[#2563EB] flex items-center justify-center text-white shadow-sm shadow-blue-500/20">
          <ScanFace className="w-5 h-5 stroke-[2.2]" />
        </div>
        <span className="text-[17px] font-bold text-slate-900 tracking-tight flex items-center gap-1">
          AcneVision <span className="text-[#2563EB]">AI</span>
        </span>
      </Link>

      {/* Right Action */}
      {user ? (
        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="w-9 h-9 rounded-full bg-[#EBF2FE] text-[#2563EB] font-medium text-sm flex items-center justify-center border border-blue-100 hover:bg-blue-100 transition-colors"
            aria-label="Profil Pengguna"
          >
            {initial}
          </button>

          {menuOpen && (
            <div className="absolute right-0 mt-2 w-48 bg-white rounded-2xl shadow-xl border border-slate-100 py-2 z-50 text-sm">
              <div className="px-4 py-2 border-b border-slate-100">
                <p className="font-semibold text-slate-800 text-xs truncate">{displayName}</p>
                <p className="text-[11px] text-slate-500 truncate">{user.email}</p>
              </div>
              <Link
                to="/profile"
                onClick={() => setMenuOpen(false)}
                className="flex items-center gap-2.5 px-4 py-2.5 text-slate-700 hover:bg-slate-50 transition-colors"
              >
                <User className="w-4 h-4 text-slate-400" />
                <span>Profil</span>
              </Link>
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-2.5 px-4 py-2.5 text-red-600 hover:bg-red-50 transition-colors text-left"
              >
                <LogOut className="w-4 h-4" />
                <span>Keluar</span>
              </button>
            </div>
          )}
        </div>
      ) : (
        <button
          onClick={handleQuickLogin}
          className="text-sm font-semibold text-slate-600 hover:text-slate-900 px-3 py-1.5 rounded-lg hover:bg-slate-50 transition-colors"
        >
          Login
        </button>
      )}
    </header>
  );
}
