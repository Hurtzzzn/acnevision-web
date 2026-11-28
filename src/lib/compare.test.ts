import { describe, expect, it } from 'vitest';
import type { ScanListItem } from '@acnevision/shared';
import { isValidAfterScan, resolveComparePair } from './compare';

const makeScan = (id: string, iso: string, total = 10): ScanListItem => ({
  scan_id: id,
  created_at: iso,
  thumbnail_url: null,
  total_lesions: total,
  severity: 'moderate',
  severity_confidence: 0.85,
});

describe('resolveComparePair chronological rules', () => {
  const s1 = makeScan('s1', '2026-09-10T08:00:00Z', 24);
  const s2 = makeScan('s2', '2026-09-24T08:00:00Z', 18);
  const s3 = makeScan('s3', '2026-10-08T08:00:00Z', 12);
  const scans = [s3, s2, s1];

  it('returns null when fewer than 2 scans exist', () => {
    expect(resolveComparePair([s1])).toBeNull();
  });

  it('defaults to second-newest as before and newest as after', () => {
    const res = resolveComparePair(scans)!;
    expect(res.before.scan_id).toBe('s2');
    expect(res.after.scan_id).toBe('s3');
    expect(res.beforeOptions.map((s) => s.scan_id)).not.toContain('s3');
  });

  it('never allows after timestamp to be earlier than before timestamp', () => {
    const res = resolveComparePair(scans, 's2', 's1')!;
    expect(res.before.scan_id).toBe('s2');
    expect(res.after.scan_id).toBe('s3');
    expect(res.afterOptions.map((s) => s.scan_id)).toEqual(['s3']);
  });

  it('ignores oldest scan if requested as ?after= and keeps valid pair', () => {
    const res = resolveComparePair(scans, undefined, 's1')!;
    expect(new Date(res.after.created_at).getTime()).toBeGreaterThanOrEqual(
      new Date(res.before.created_at).getTime()
    );
  });

  it('supports multiple photos taken on the exact same day ordered by hour/minute', () => {
    const morning = makeScan('am', '2026-11-28T08:30:00Z', 20);
    const afternoon = makeScan('pm', '2026-11-28T15:15:00Z', 17);
    const evening = makeScan('eve', '2026-11-28T20:00:00Z', 15);
    const sameDay = [evening, morning, afternoon];

    // Morning cannot be After for afternoon
    expect(isValidAfterScan(morning, afternoon)).toBe(false);
    // Evening CAN be After for afternoon on the same day
    expect(isValidAfterScan(evening, afternoon)).toBe(true);

    const res = resolveComparePair(sameDay, 'pm', 'am')!;
    expect(res.before.scan_id).toBe('pm');
    expect(res.after.scan_id).toBe('eve');
  });
});
