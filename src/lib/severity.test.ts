import { describe, expect, it } from 'vitest';
import { ACNE_CLASSES, computeSeverity } from '@acnevision/shared';

describe('computeSeverity (docs/07 section 5)', () => {
  it.each([
    [0, false, 'clear'],
    [1, false, 'mild'],
    [5, false, 'mild'],
    [6, false, 'moderate'],
    [20, false, 'moderate'],
    [21, false, 'severe'],
  ])('%i lesions -> %s', (n, cyst, expected) => {
    expect(computeSeverity(n, cyst)).toBe(expected);
  });

  it('a confident cyst raises severity to at least moderate', () => {
    expect(computeSeverity(1, true)).toBe('moderate');
    expect(computeSeverity(30, true)).toBe('severe');
  });
});

describe('class order', () => {
  it('is fixed', () => {
    expect([...ACNE_CLASSES]).toEqual(['Blackheads', 'Cyst', 'Papules', 'Pustules', 'Whiteheads']);
  });
});
