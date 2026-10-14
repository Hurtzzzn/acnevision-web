import { describe, expect, it } from 'vitest';
import {
  COPY, SEVERITY_META, SEVERITY_ORDER, SEVERITY_THRESHOLDS, estimateSeverity, leadsWithDoctor, severityMismatch,
} from '@acnevision/shared';

describe('estimateSeverity (Hayashi, docs/07 section 5)', () => {
  it.each([
    [0, null],
    [1, 'mild'],
    [5, 'mild'],
    [6, 'moderate'],
    [20, 'moderate'],
    [21, 'severe'],
    [50, 'severe'],
    [51, 'very_severe'],
    [120, 'very_severe'],
  ])('%i lesions -> %s', (n, expected) => {
    expect(estimateSeverity(n)).toBe(expected);
  });

  it('uses the documented thresholds 5, 20, 50', () => {
    expect(SEVERITY_THRESHOLDS).toEqual({ mild: 5, moderate: 20, severe: 50 });
  });
});

describe('severity classes', () => {
  it('keep a fixed order with Indonesian labels and no "clear" level', () => {
    expect([...SEVERITY_ORDER]).toEqual(['mild', 'moderate', 'severe', 'very_severe']);
    expect(SEVERITY_ORDER.map((s) => SEVERITY_META[s].label)).toEqual(['Ringan', 'Sedang', 'Berat', 'Sangat Berat']);
    expect(Object.keys(SEVERITY_META)).toEqual([...SEVERITY_ORDER]);
  });

  it('draws very_severe as a filled badge: dark background, white text', () => {
    expect(SEVERITY_META.very_severe).toMatchObject({ bg: '#9F1239', text: '#FFFFFF' });
  });

  it('keeps the three lighter badge colors unchanged', () => {
    expect(SEVERITY_META.mild).toMatchObject({ bg: '#DCFCE7', text: '#15803D' });
    expect(SEVERITY_META.moderate).toMatchObject({ bg: '#FEF3C7', text: '#B45309' });
    expect(SEVERITY_META.severe).toMatchObject({ bg: '#FEE2E2', text: '#B91C1C' });
  });
});

describe('severityMismatch (FR-SCAN-19)', () => {
  it('stays quiet when the model and the lesion count agree or differ by one level', () => {
    expect(severityMismatch(3, 'mild')).toBe(false);
    expect(severityMismatch(3, 'moderate')).toBe(false);
    expect(severityMismatch(25, 'moderate')).toBe(false);
    expect(severityMismatch(25, 'very_severe')).toBe(false);
  });

  it('speaks up at 2 or more levels apart, in either direction', () => {
    expect(severityMismatch(3, 'severe')).toBe(true);
    expect(severityMismatch(3, 'very_severe')).toBe(true);
    expect(severityMismatch(10, 'very_severe')).toBe(true);
    expect(severityMismatch(60, 'mild')).toBe(true);
    expect(severityMismatch(25, 'mild')).toBe(true);
  });

  it('never fires without lesions', () => {
    expect(severityMismatch(0, 'very_severe')).toBe(false);
  });

  it('has a short, neutral note in the copy', () => {
    expect(COPY.severityMismatchNote).toContain('tampilan keseluruhan wajah');
  });
});

describe('leadsWithDoctor', () => {
  it('leads from moderate upward, not for mild or when there is no severity', () => {
    expect(leadsWithDoctor('mild')).toBe(false);
    expect(leadsWithDoctor('moderate')).toBe(true);
    expect(leadsWithDoctor('severe')).toBe(true);
    expect(leadsWithDoctor('very_severe')).toBe(true);
    expect(leadsWithDoctor(null)).toBe(false);
  });
});
