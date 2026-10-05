import { describe, expect, it } from 'vitest';
import type { DetectedLesion } from '@acnevision/shared';
import { isLowConfidence, sortByConfidence, summarizeConfidence } from './detection';

const lesion = (idx: number, det_confidence: number): DetectedLesion => ({
  idx, det_confidence, label: 'Jerawat', bbox: { x1: 0.1, y1: 0.1, x2: 0.2, y2: 0.2 },
});

describe('detection list helpers', () => {
  it('sorts by confidence, highest first, keeping each idx', () => {
    const sorted = sortByConfidence([lesion(0, 0.7), lesion(1, 0.95), lesion(2, 0.7), lesion(3, 0.5)]);
    expect(sorted.map((l) => l.idx)).toEqual([1, 0, 2, 3]);
  });

  it('does not mutate the input order', () => {
    const input = [lesion(0, 0.6), lesion(1, 0.9)];
    sortByConfidence(input);
    expect(input.map((l) => l.idx)).toEqual([0, 1]);
  });

  it('flags only lesions below the low-confidence threshold', () => {
    expect(isLowConfidence(lesion(0, 0.59))).toBe(true);
    expect(isLowConfidence(lesion(1, 0.6))).toBe(false);
  });

  it('summarizes count, rounded average, and low-confidence count', () => {
    expect(summarizeConfidence([lesion(0, 0.9), lesion(1, 0.7), lesion(2, 0.5)])).toEqual({ count: 3, avgPct: 70, lowCount: 1 });
  });

  it('returns a null average for an empty list', () => {
    expect(summarizeConfidence([])).toEqual({ count: 0, avgPct: null, lowCount: 0 });
  });
});
