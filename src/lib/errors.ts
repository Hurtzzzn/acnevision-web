export function errMessage(e: unknown, fallback = 'Terjadi kesalahan. Coba lagi.'): string {
  return e instanceof Error && e.message ? e.message : fallback;
}

export function fmtDate(iso: string, withTime = false): string {
  return new Date(iso).toLocaleString('id-ID', {
    day: 'numeric', month: 'short', year: 'numeric', ...(withTime ? { hour: '2-digit', minute: '2-digit' } : {}),
  });
}

export const pct = (v: number | null | undefined, digits = 0) => (v == null ? '-' : `${(v * 100).toFixed(digits)}%`);
