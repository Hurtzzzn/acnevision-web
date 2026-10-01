import { Navigate, useLocation } from 'react-router-dom';
import type { ReactNode } from 'react';
import { useAuth } from '../store/auth';
import { Spinner } from './ui';

export function RequireAuth({ children }: { children: ReactNode }) {
  const { user, ready } = useAuth();
  const loc = useLocation();
  if (!ready) return <div className="p-12 text-center"><Spinner label="Memuat..." /></div>;
  if (!user) return <Navigate to={`/login?redirectTo=${encodeURIComponent(loc.pathname)}`} replace />;
  return <>{children}</>;
}

export function RequireAdmin({ children }: { children: ReactNode }) {
  const { user, ready } = useAuth();
  const loc = useLocation();
  if (!ready) return <div className="p-12 text-center"><Spinner label="Memuat..." /></div>;
  if (!user) return <Navigate to={`/login?redirectTo=${encodeURIComponent(loc.pathname)}`} replace />;
  if (user.role !== 'admin') return <Navigate to="/" replace />;
  return <>{children}</>;
}
