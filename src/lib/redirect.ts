/** Where a user lands after signing in when no destination was carried over. */
export const DEFAULT_AFTER_LOGIN = '/dashboard';

/** "Analisis Baru" for logged-in users (full analysis). Guests use /scan, which is detection only. */
export const NEW_ANALYSIS_PATH = '/analyze';

const AUTH_PATHS = ['/login', '/register', '/reset-password'];
const BASE = 'http://acnevision.local';

/** Accepts only same-site paths (no open redirect) and never an auth page, which would loop. */
export function safeRedirect(raw: string | null | undefined): string | null {
  if (!raw || !raw.startsWith('/') || raw.startsWith('//')) return null;
  // Backslashes and control characters are normalized by browsers into "//" or stripped, so reject them outright.
  if (/[\\\u0000-\u001f]/.test(raw)) return null;
  let url: URL;
  try { url = new URL(raw, BASE); } catch { return null; }
  if (url.origin !== BASE || AUTH_PATHS.includes(url.pathname)) return null;
  return url.pathname + url.search + url.hash;
}

/** Link to an auth page that carries the destination along (dropped when unsafe or empty). */
export function authPath(base: '/login' | '/register', redirectTo?: string | null): string {
  const safe = safeRedirect(redirectTo);
  return safe ? `${base}?redirectTo=${encodeURIComponent(safe)}` : base;
}
