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

  it('uses a green, yellow, orange, rose progression for the four levels', () => {
    expect(SEVERITY_META.mild).toMatchObject({ bg: '#DCFCE7', text: '#15803D', solid: '#15803D', tint: '#DCFCE7' });
    expect(SEVERITY_META.moderate).toMatchObject({ bg: '#FEF9C3', text: '#A16207', solid: '#A16207', tint: '#FEF9C3' });
    expect(SEVERITY_META.severe).toMatchObject({ bg: '#FFEDD5', text: '#C2410C', solid: '#C2410C', tint: '#FFEDD5' });
    expect(SEVERITY_META.very_severe).toMatchObject({ solid: '#9F1239', tint: '#FFE4E6' });
  });

  it('keeps badge text readable (WCAG AA, 4.5:1) on its badge, and the solid colour on white', () => {
    const lum = (hex: string) => {
      const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
        .map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
      return 0.2126 * r + 0.7152 * g + 0.0722 * b;
    };
    const ratio = (a: string, b: string) => {
      const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x);
      return (hi + 0.05) / (lo + 0.05);
    };
    for (const s of SEVERITY_ORDER) {
      expect(ratio(SEVERITY_META[s].text, SEVERITY_META[s].bg), s + ' on badge').toBeGreaterThanOrEqual(4.5);
      // solid doubles as text colour on white (scale labels, unfilled chips)
      if (s !== 'very_severe') expect(ratio(SEVERITY_META[s].solid, '#FFFFFF'), s + ' on white').toBeGreaterThanOrEqual(4.5);
    }
  });

  it('gives every level its own tint, so adjacent levels never look alike', () => {
    expect(new Set(SEVERITY_ORDER.map((s) => SEVERITY_META[s].tint)).size).toBe(4);
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
