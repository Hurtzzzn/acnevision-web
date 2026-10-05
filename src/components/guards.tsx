import { Navigate, useLocation } from 'react-router-dom';
import type { ReactNode } from 'react';
import { useAuth } from '../store/auth';
import { authPath } from '../lib/redirect';
import { Spinner } from './ui';

function useLoginRedirect(): string {
  const { pathname, search } = useLocation();
  return authPath('/login', pathname + search);
}

export function RequireAuth({ children }: { children: ReactNode }) {
  const { user, ready } = useAuth();
  const loginPath = useLoginRedirect();
  if (!ready) return <div className="p-12 text-center"><Spinner label="Memuat..." /></div>;
  if (!user) return <Navigate to={loginPath} replace />;
  return <>{children}</>;
}

export function RequireAdmin({ children }: { children: ReactNode }) {
  const { user, ready } = useAuth();
  const loginPath = useLoginRedirect();
  if (!ready) return <div className="p-12 text-center"><Spinner label="Memuat..." /></div>;
  if (!user) return <Navigate to={loginPath} replace />;
  if (user.role !== 'admin') return <Navigate to="/" replace />;
  return <>{children}</>;
}
