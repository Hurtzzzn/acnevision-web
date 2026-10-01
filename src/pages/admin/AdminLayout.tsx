import { useMemo, useState } from 'react';
import { Link, NavLink, Outlet, useNavigate, useOutletContext } from 'react-router-dom';
import { Activity, BarChart3, ClipboardList, Users } from 'lucide-react';
import type { DateRange, Granularity } from '@acnevision/shared';
import { useAuth } from '../../store/auth';
import { Logo, Toasts } from '../../components/ui';

export interface AdminCtx { range: DateRange }
export const useAdminRange = () => useOutletContext<AdminCtx>().range;

const nav = [
  { to: '/admin', end: true, icon: BarChart3, label: 'Dashboard' },
  { to: '/admin/model', icon: Activity, label: 'Monitoring Model' },
  { to: '/admin/users', icon: Users, label: 'Kelola User' },
  { to: '/admin/audit', icon: ClipboardList, label: 'Audit Log' },
];

const iso = (d: Date) => d.toISOString().slice(0, 10);

export default function AdminLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [days, setDays] = useState(30);
  const [gran, setGran] = useState<Granularity>('day');
  const range = useMemo<DateRange>(() => {
    const to = new Date();
    return { from: iso(new Date(to.getTime() - (days - 1) * 86400000)), to: iso(to), granularity: gran };
  }, [days, gran]);

  return (
    <div className="flex min-h-screen flex-col md:flex-row">
      <aside className="border-b border-border bg-surface md:w-60 md:border-b-0 md:border-r">
        <div className="flex h-16 items-center px-4"><Link to="/"><Logo /></Link></div>
        <nav className="flex gap-1 overflow-x-auto px-2 pb-2 md:flex-col md:pb-0" aria-label="Navigasi admin">
          {nav.map(({ to, icon: Icon, label, end }) => (
            <NavLink key={to} to={to} end={end}
              className={({ isActive }) => `flex items-center gap-2 whitespace-nowrap rounded-btn px-3 py-2.5 text-sm font-medium ${isActive ? 'bg-primary-50 text-primary-600' : 'text-ink-600 hover:bg-slate-50'}`}>
              <Icon className="h-4 w-4" aria-hidden /> {label}
            </NavLink>
          ))}
        </nav>
      </aside>

      <div className="flex-1">
        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-border bg-surface px-4 py-3">
          <div className="flex flex-wrap items-center gap-2">
            <label className="sr-only" htmlFor="days">Rentang</label>
            <select id="days" className="input w-auto" value={days} onChange={(e) => setDays(Number(e.target.value))}>
              <option value={7}>7 hari</option><option value={30}>30 hari</option><option value={90}>90 hari</option>
            </select>
            <label className="sr-only" htmlFor="gran">Granularitas</label>
            <select id="gran" className="input w-auto" value={gran} onChange={(e) => setGran(e.target.value as Granularity)}>
              <option value="day">Harian</option><option value="week">Mingguan</option><option value="month">Bulanan</option>
            </select>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <span>{user?.full_name ?? user?.email}</span>
            <button className="btn-outline px-3 py-1.5" onClick={async () => { await logout(); navigate('/'); }}>Keluar</button>
          </div>
        </header>
        <main className="p-4 md:p-6"><Outlet context={{ range } satisfies AdminCtx} /></main>
      </div>
      <Toasts />
    </div>
  );
}
