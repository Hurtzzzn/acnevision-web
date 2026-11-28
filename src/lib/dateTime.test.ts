import { describe, expect, it } from 'vitest';
import {
  diffDaysBetween,
  formatChatDayHeader,
  formatCompareSpan,
  formatFullDateUpper,
  formatIndonesianDate,
  formatRelativeDateTime,
  formatTimeHHMM,
  getGreeting,
  getMonthName,
} from './dateTime';

describe('dateTime utilities', () => {
  it('returns correct Indonesian greeting for every hour band', () => {
    expect(getGreeting(new Date(2026, 10, 28, 7, 30)).period).toBe('pagi');
    expect(getGreeting(new Date(2026, 10, 28, 12, 0)).period).toBe('siang');
    expect(getGreeting(new Date(2026, 10, 28, 16, 15)).period).toBe('sore');
    expect(getGreeting(new Date(2026, 10, 28, 21, 0)).period).toBe('malam');
    expect(getGreeting(new Date(2026, 10, 28, 2, 0)).period).toBe('malam');
  });

  it('formats full uppercase Indonesian date', () => {
    // 2026-11-28 is Saturday (Sabtu)
    expect(formatFullDateUpper(new Date(2026, 10, 28, 18, 28))).toBe('SABTU, 28 NOVEMBER 2026');
  });

  it('formats time with dot separator', () => {
    expect(formatTimeHHMM(new Date(2026, 10, 28, 8, 5))).toBe('08.05');
  });

  it('formats relative date time cleanly', () => {
    const now = new Date(2026, 10, 28, 18, 30);
    const sameDay = new Date(2026, 10, 28, 9, 15).toISOString();
    const yesterday = new Date(2026, 10, 27, 14, 5).toISOString();
    const older = new Date(2026, 9, 8, 8, 42).toISOString();
    expect(formatRelativeDateTime(sameDay, now)).toBe('Hari ini, 09.15');
    expect(formatRelativeDateTime(yesterday, now)).toBe('Kemarin, 14.05');
    expect(formatRelativeDateTime(older, now)).toBe('8 Okt 2026 • 08.42');
  });

  it('formats chat headers, month names, day diffs, and compare spans', () => {
    const now = new Date(2026, 10, 28, 18, 28);
    expect(formatChatDayHeader(now, now)).toBe('HARI INI, 18.28');
    expect(getMonthName(now)).toBe('November');
    expect(formatIndonesianDate(now)).toBe('28 November 2026');
    expect(diffDaysBetween('2026-11-14T08:00:00Z', '2026-11-28T08:00:00Z')).toBe(14);
    expect(formatCompareSpan('2026-11-14T08:00:00Z', '2026-11-28T08:00:00Z')).toBe('dalam 14 hari');
    expect(formatCompareSpan('2026-11-28T08:00:00', '2026-11-28T19:00:00')).toBe('dalam 11 jam (hari yang sama)');
    expect(formatCompareSpan('2026-11-28T19:00:00', '2026-11-28T19:20:00')).toBe('pada hari yang sama');
  });
});
