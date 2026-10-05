import { describe, expect, it } from 'vitest';
import { ACNE_CLASSES, buildUserStats, type AcneClass, type AnalysisSummary, type UserStats } from '@acnevision/shared';
import type { StatsSource } from '@acnevision/shared';
import { chronological, firstName, formatDelta, greetingKey, lesionTrend } from './dashboard';

type Recent = UserStats['recent'][number];

function scan(id: string, date: string, counts: Partial<Record<AcneClass, number>>, avgConfidence: number | null = 0.9): StatsSource {
  const class_counts = Object.fromEntries(ACNE_CLASSES.map((c) => [c, counts[c] ?? 0])) as Record<AcneClass, number>;
  const total = Object.values(class_counts).reduce((a, b) => a + b, 0);
  const summary: AnalysisSummary = {
    total_lesions: total, class_counts, dominant_class: null, avg_confidence: avgConfidence,
    low_confidence_count: 0, severity: total === 0 ? 'clear' : 'mild', severity_is_estimate: true,
  };
  return { scan_id: id, created_at: date, thumbnail_url: `thumb-${id}`, summary };
}

const recent = (id: string, date: string, total: number): Recent => ({
  scan_id: id, created_at: date, thumbnail_url: '', total_lesions: total, classes_present: [], severity: 'mild',
});

describe('buildUserStats', () => {
  it('returns zeros and nulls for a user without scans', () => {
    expect(buildUserStats([])).toEqual({
      totals: { analyses: 0, total_lesions: 0, most_detected_class: null, avg_confidence: null },
      recent: [],
    });
  });

  it('sums lesions, counts analyses and finds the most detected class', () => {
    const stats = buildUserStats([
      scan('a', '2026-09-01T10:00:00Z', { Papules: 3, Blackheads: 1 }),
      scan('b', '2026-09-10T10:00:00Z', { Papules: 2, Cyst: 1 }),
    ]);
    expect(stats.totals.analyses).toBe(2);
    expect(stats.totals.total_lesions).toBe(7);
    expect(stats.totals.most_detected_class).toBe('Papules');
  });

  it('weights average confidence by lesion count and ignores scans with none', () => {
    const stats = buildUserStats([
      scan('a', '2026-09-01T10:00:00Z', { Papules: 1 }, 0.5),
      scan('b', '2026-09-02T10:00:00Z', { Papules: 3 }, 0.9),
      scan('c', '2026-09-03T10:00:00Z', {}, null),
    ]);
    expect(stats.totals.avg_confidence).toBeCloseTo((0.5 * 1 + 0.9 * 3) / 4);
  });

  it('lists recent scans newest first, capped at the limit, with canonical class order', () => {
    const scans = Array.from({ length: 7 }, (_, i) => scan(`s${i}`, `2026-09-0${i + 1}T10:00:00Z`, { Pustules: 1, Blackheads: 1 }));
    const stats = buildUserStats(scans);
    expect(stats.recent).toHaveLength(5);
    expect(stats.recent[0].scan_id).toBe('s6');
    expect(stats.recent[0].classes_present).toEqual(['Blackheads', 'Pustules']);
    expect(stats.totals.analyses).toBe(7);
  });

  it('does not mutate its input', () => {
    const scans = [scan('a', '2026-09-01T10:00:00Z', { Cyst: 1 }), scan('b', '2026-09-02T10:00:00Z', { Cyst: 1 })];
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
