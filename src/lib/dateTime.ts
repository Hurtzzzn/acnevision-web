export type GreetingPeriod = 'pagi' | 'siang' | 'sore' | 'malam';

export interface GreetingInfo {
  period: GreetingPeriod;
  shortLabel: string;
  fullLabel: string;
}

const DAYS_ID = ['MINGGU', 'SENIN', 'SELASA', 'RABU', 'KAMIS', 'JUMAT', 'SABTU'] as const;
const MONTHS_LONG_ID = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
] as const;
const MONTHS_SHORT_ID = [
  'Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun',
  'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des',
] as const;

/** Returns Indonesian greeting based on local hour (Pagi 04-10, Siang 11-14, Sore 15-17, Malam 18-03). */
export function getGreeting(now: Date = new Date()): GreetingInfo {
  const h = now.getHours();
  if (h >= 4 && h < 11) return { period: 'pagi', shortLabel: 'Pagi', fullLabel: 'Selamat pagi' };
  if (h >= 11 && h < 15) return { period: 'siang', shortLabel: 'Siang', fullLabel: 'Selamat siang' };
  if (h >= 15 && h < 18) return { period: 'sore', shortLabel: 'Sore', fullLabel: 'Selamat sore' };
  return { period: 'malam', shortLabel: 'Malam', fullLabel: 'Selamat malam' };
}

/** Formats a date as uppercase Indonesian header, e.g. "SABTU, 28 NOVEMBER 2026". */
export function formatFullDateUpper(now: Date = new Date()): string {
  const dayName = DAYS_ID[now.getDay()];
  const day = now.getDate();
  const month = MONTHS_LONG_ID[now.getMonth()].toUpperCase();
  const year = now.getFullYear();
  return `${dayName}, ${day} ${month} ${year}`;
}

/** Formats time with Indonesian dot separator, e.g. "08.42". */
export function formatTimeHHMM(date: Date): string {
  const hh = String(date.getHours()).padStart(2, '0');
  const mm = String(date.getMinutes()).padStart(2, '0');
  return `${hh}.${mm}`;
}

/** Formats a full Indonesian date string, e.g. "28 November 2026" or "28 Nov 2026". */
export function formatIndonesianDate(isoOrDate: string | Date, shortMonth = false): string {
  const d = typeof isoOrDate === 'string' ? new Date(isoOrDate) : isoOrDate;
  if (Number.isNaN(d.getTime())) return '-';
  const months = shortMonth ? MONTHS_SHORT_ID : MONTHS_LONG_ID;
  return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
}

/** Returns month name in Indonesian, e.g. "November". */
export function getMonthName(isoOrDate: string | Date): string {
  const d = typeof isoOrDate === 'string' ? new Date(isoOrDate) : isoOrDate;
  if (Number.isNaN(d.getTime())) return '';
  return MONTHS_LONG_ID[d.getMonth()];
}

/** Formats scan timestamp relative to `now`, e.g. "Hari ini, 18.28" or "28 November 2026 • 18.28". */
export function formatRelativeDateTime(iso: string, now: Date = new Date()): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '-';
  const timeStr = formatTimeHHMM(d);
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const startOfDate = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const dayDiff = Math.round((startOfToday - startOfDate) / 86_400_000);
  if (dayDiff === 0) return `Hari ini, ${timeStr}`;
  if (dayDiff === 1) return `Kemarin, ${timeStr}`;
  return `${formatIndonesianDate(d, true)} • ${timeStr}`;
}

/** Formats chat separator header, e.g. "HARI INI, 18.28". */
export function formatChatDayHeader(isoOrDate: string | Date, now: Date = new Date()): string {
  const d = typeof isoOrDate === 'string' ? new Date(isoOrDate) : isoOrDate;
  if (Number.isNaN(d.getTime())) return 'HARI INI';
  const timeStr = formatTimeHHMM(d);
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const startOfDate = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  if (startOfToday === startOfDate) return `HARI INI, ${timeStr}`;
  return `${d.getDate()} ${MONTHS_SHORT_ID[d.getMonth()].toUpperCase()}, ${timeStr}`;
}

/** Whole-day difference between two ISO dates (always >= 0). */
export function diffDaysBetween(olderIso: string, newerIso: string): number {
  const a = new Date(olderIso).getTime();
  const b = new Date(newerIso).getTime();
  if (Number.isNaN(a) || Number.isNaN(b)) return 0;
  return Math.max(0, Math.round(Math.abs(b - a) / 86_400_000));
}

/** Human-readable Indonesian duration span for Before/After comparison (handles same-day captures). */
export function formatCompareSpan(olderIso: string, newerIso: string): string {
  const a = new Date(olderIso);
  const b = new Date(newerIso);
  if (Number.isNaN(a.getTime()) || Number.isNaN(b.getTime())) return 'antara 2 pemindaian';

  const sameCalendarDay =
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();

  const diffMs = Math.max(0, b.getTime() - a.getTime());
  if (sameCalendarDay) {
    const hours = Math.round(diffMs / 3_600_000);
    return hours >= 1 ? `dalam ${hours} jam (hari yang sama)` : 'pada hari yang sama';
  }

  const days = Math.max(1, diffDaysBetween(olderIso, newerIso));
  return `dalam ${days} hari`;
}
