import type { ReactNode } from 'react';
import { useAuth } from '../../store/auth';
import { Smartphone, UserCheck } from 'lucide-react';

interface MobileFrameProps {
  children: ReactNode;
  dark?: boolean;
}

export function MobileFrame({ children, dark = false }: MobileFrameProps) {
  const { user, login, logout } = useAuth();

  const handleToggleAuth = async () => {
    if (user) {
      await logout();
    } else {
      await login('demo@acnevision.test', 'demo12345');
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col items-center justify-start md:py-6 antialiased font-sans selection:bg-blue-100 selection:text-blue-900">
      {/* Desktop Helper Bar */}
      <div className="hidden md:flex items-center justify-between w-full max-w-[420px] px-2 mb-2 text-xs text-slate-500">
        <span className="flex items-center gap-1.5 font-medium">
          <Smartphone className="w-3.5 h-3.5 text-slate-400" />
          AcneVision Mobile
        </span>
        <button
          onClick={handleToggleAuth}
          className="flex items-center gap-1 text-[#2563EB] hover:text-blue-700 font-semibold px-2 py-0.5 rounded hover:bg-blue-50 transition-colors"
          title="Beralih antara mode Tamu dan Member"
        >
          <UserCheck className="w-3.5 h-3.5" />
          {user ? 'Mode: Member (Klik utk Tamu)' : 'Mode: Tamu (Klik utk Member)'}
        </button>
      </div>

      {/* Main Mobile Device Container */}
      <div
        className={`w-full max-w-[420px] min-h-screen md:min-h-[852px] md:max-h-[920px] md:rounded-[44px] md:shadow-[0_24px_64px_-12px_rgba(15,23,42,0.18)] md:ring-1 md:ring-slate-900/10 flex flex-col relative overflow-hidden transition-colors ${
          dark ? 'bg-slate-900 text-white' : 'bg-white text-slate-900'
        }`}
      >
        {children}
      </div>
    </div>
  );
}
