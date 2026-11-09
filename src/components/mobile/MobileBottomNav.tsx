import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Home, ScanLine, MessageSquare, TrendingUp } from 'lucide-react';
import { useAuth } from '../../store/auth';

interface NavItem {
  id: string;
  label: string;
  to: string;
  icon: React.ComponentType<{ className?: string }>;
  matches: string[];
}

export function MobileBottomNav() {
  const location = useLocation();
  const { user } = useAuth();
  const path = location.pathname;

  const items: NavItem[] = [
    {
      id: 'home',
      label: 'Beranda',
      to: user ? '/dashboard' : '/',
      icon: Home,
      matches: ['/', '/dashboard'],
    },
    {
      id: 'scan',
      label: 'Pindai',
      to: '/scan',
      icon: ScanLine,
      matches: ['/scan', '/detect-result', '/analysis'],
    },
    {
      id: 'chat',
      label: 'Konsultasi',
      to: '/chat',
      icon: MessageSquare,
      matches: ['/chat'],
    },
    {
      id: 'history',
      label: 'Riwayat',
      to: '/history',
      icon: TrendingUp,
      matches: ['/history'],
    },
  ];

  const isActive = (item: NavItem) => {
    if (item.id === 'home') {
      return path === '/' || path === '/dashboard';
    }
    return item.matches.some((m) => path === m || path.startsWith(`${m}/`));
  };

  return (
    <nav
      aria-label="Navigasi bawah"
      className="sticky bottom-0 z-40 w-full bg-white/95 backdrop-blur-md border-t border-slate-100 px-3 pt-2 pb-1.5 shadow-[0_-4px_16px_rgba(0,0,0,0.03)]"
    >
      <div className="flex items-center justify-around max-w-md mx-auto">
        {items.map((item) => {
          const active = isActive(item);
          const Icon = item.icon;
          return (
            <Link
              key={item.id}
              to={item.to}
              className="flex flex-col items-center justify-center min-w-[68px] py-1 transition-transform active:scale-95 group"
            >
              <div
                className={`flex items-center justify-center transition-all duration-200 ${
                  active
                    ? 'bg-[#EBF2FE] text-[#2563EB] px-5 py-1 rounded-full'
                    : 'text-slate-400 group-hover:text-slate-600 px-3 py-1'
                }`}
              >
                <Icon className={`w-5 h-5 ${active ? 'stroke-[2.2]' : 'stroke-[1.8]'}`} />
              </div>
              <span
                className={`text-[11px] mt-0.5 tracking-tight ${
                  active ? 'text-[#2563EB] font-semibold' : 'text-slate-400 font-normal'
                }`}
              >
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>

      {/* Bottom iOS / Android Home Indicator Bar */}
      <div className="w-36 h-1 bg-slate-900 rounded-full mx-auto mt-2 mb-0.5" />
    </nav>
  );
}

