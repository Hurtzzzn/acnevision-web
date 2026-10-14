import { describe, expect, it } from 'vitest';
import { buildUserStats, type Severity, type StatsSource, type UserStats } from '@acnevision/shared';
import {
  chronological, confidencePercent, daysSince, firstName, formatDelta, greetingKey, lesionTrend, nudgeKind,
} from './dashboard';

type Recent = UserStats['recent'][number];

function scan(id: string, date: string, total: number, severity: Severity | null = total === 0 ? null : 'mild'): StatsSource {
  return { scan_id: id, created_at: date, thumbnail_url: `thumb-${id}`, total_lesions: total, severity };
}

const recent = (id: string, date: string, total: number): Recent => ({
  scan_id: id, created_at: date, thumbnail_url: '', total_lesions: total, severity: 'mild',
});

describe('buildUserStats', () => {
  it('returns zeros and nulls for a user without scans', () => {
    expect(buildUserStats([])).toEqual({
      totals: { analyses: 0, total_lesions: 0, latest_severity: null },
      recent: [],
    });
  });

  it('sums lesions, counts analyses and takes the severity of the newest scan', () => {
    const stats = buildUserStats([
      scan('a', '2026-09-01T10:00:00Z', 4, 'mild'),
      scan('b', '2026-09-10T10:00:00Z', 3, 'severe'),
    ]);
    expect(stats.totals.analyses).toBe(2);
    expect(stats.totals.total_lesions).toBe(7);
    expect(stats.totals.latest_severity).toBe('severe');
  });

  it('has no latest severity when the newest scan found no lesions', () => {
    const stats = buildUserStats([scan('a', '2026-09-01T10:00:00Z', 4, 'moderate'), scan('b', '2026-09-02T10:00:00Z', 0)]);
    expect(stats.totals.latest_severity).toBeNull();
    expect(stats.recent[0].severity).toBeNull();
  });

  it('lists recent scans newest first, capped at the limit, and carries no class fields', () => {
    const scans = Array.from({ length: 7 }, (_, i) => scan(`s${i}`, `2026-09-0${i + 1}T10:00:00Z`, 2));
    const stats = buildUserStats(scans);
    expect(stats.recent).toHaveLength(5);
    expect(stats.recent[0].scan_id).toBe('s6');
    expect(Object.keys(stats.recent[0]).sort()).toEqual(['created_at', 'scan_id', 'severity', 'thumbnail_url', 'total_lesions']);
    expect(stats.totals.analyses).toBe(7);
  });

  it('does not mutate its input', () => {
    const scans = [scan('a', '2026-09-01T10:00:00Z', 1), scan('b', '2026-09-02T10:00:00Z', 1)];
    buildUserStats(scans);
    expect(scans.map((s) => s.scan_id)).toEqual(['a', 'b']);
  });
});

describe('lesionTrend', () => {
  it('needs at least 2 analyses', () => {
    expect(lesionTrend([])).toBeNull();
    expect(lesionTrend([recent('a', '2026-09-01T00:00:00Z', 4)])).toBeNull();
  });

  it('reports a decrease versus the previous analysis regardless of input order', () => {
    const t = lesionTrend([recent('b', '2026-09-10T00:00:00Z', 3), recent('a', '2026-09-01T00:00:00Z', 8)]);
    expect(t).toEqual({ direction: 'down', from: 8, to: 3, delta: -5 });
  });

  it('reports an increase and an unchanged count', () => {
    expect(lesionTrend([recent('b', '2026-09-10T00:00:00Z', 9), recent('a', '2026-09-01T00:00:00Z', 4)])?.direction).toBe('up');
    expect(lesionTrend([recent('b', '2026-09-10T00:00:00Z', 4), recent('a', '2026-09-01T00:00:00Z', 4)])?.direction).toBe('same');
  });

  it('only compares the last two of several analyses', () => {
    const t = lesionTrend([
      recent('c', '2026-09-20T00:00:00Z', 6),
      recent('b', '2026-09-10T00:00:00Z', 2),
      recent('a', '2026-09-01T00:00:00Z', 30),
    ]);
    expect(t).toMatchObject({ from: 2, to: 6, delta: 4 });
  });
});

describe('dashboard helpers', () => {
  it('orders chart points oldest to newest without mutating the input', () => {
    const input = [recent('b', '2026-09-10T00:00:00Z', 1), recent('a', '2026-09-01T00:00:00Z', 2)];
    expect(chronological(input).map((r) => r.scan_id)).toEqual(['a', 'b']);
    expect(input[0].scan_id).toBe('b');
  });

  it('formats the signed delta', () => {
    expect(formatDelta(-3)).toBe('\u22123');
    expect(formatDelta(2)).toBe('+2');
    expect(formatDelta(0)).toBeNull();
  });

  it('picks the greeting by hour', () => {
    expect(greetingKey(7)).toBe('greetingMorning');
    expect(greetingKey(12)).toBe('greetingNoon');
    expect(greetingKey(16)).toBe('greetingAfternoon');
    expect(greetingKey(21)).toBe('greetingEvening');
    expect(greetingKey(2)).toBe('greetingEvening');
  });

  it('uses the first word of the name, falling back to the email prefix', () => {
    expect(firstName('Gena Darma', 'g@x.id')).toBe('Gena');
    expect(firstName(null, 'gena.darma@x.id')).toBe('gena.darma');
    expect(firstName('  ', 'budi@x.id')).toBe('budi');
  });
});

describe('follow-up helpers', () => {
  it('counts whole days since an analysis and never goes negative', () => {
    const now = new Date('2026-10-15T12:00:00Z');
    expect(daysSince('2026-10-15T08:00:00Z', now)).toBe(0);
    expect(daysSince('2026-10-08T11:00:00Z', now)).toBe(7);
    expect(daysSince('2026-10-20T00:00:00Z', now)).toBe(0);
  });

  it('chooses the nudge by days since the last analysis', () => {
    expect(nudgeKind(0)).toBe('fresh');
    expect(nudgeKind(2)).toBe('fresh');
    expect(nudgeKind(3)).toBe('soon');
    expect(nudgeKind(7)).toBe('due');
    expect(nudgeKind(14)).toBe('long');
  });

  it('rounds confidence to a whole percent within 0-100', () => {
    expect(confidencePercent(0.8449)).toBe(84);
    expect(confidencePercent(1.2)).toBe(100);
  });
});
