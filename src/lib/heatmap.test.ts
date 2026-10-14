import { describe, expect, it } from 'vitest';
import { DEMO_LESIONS } from './demoLesions';
import { heatColor, heatField } from './heatmap';

const W = 100;
const H = 101;
const at = (field: Float32Array, x: number, y: number) => field[Math.min(H - 1, Math.floor(y * H)) * W + Math.min(W - 1, Math.floor(x * W))];

describe('sample Grad-CAM heat', () => {
  const field = heatField(W, H);

  it('stays within 0..1 and reaches 1 at its peak', () => {
    expect(Math.max(...field)).toBeCloseTo(1, 5);
    expect(Math.min(...field)).toBeGreaterThanOrEqual(0);
  });

  it('is hot where the lesions cluster on the cheek, weaker at an isolated lesion, and cold away from all of them', () => {
    const cluster = DEMO_LESIONS.slice(0, 4);
    const cx = cluster.reduce((a, l) => a + l.x, 0) / cluster.length;
    const cy = cluster.reduce((a, l) => a + l.y, 0) / cluster.length;
    const chin = DEMO_LESIONS[DEMO_LESIONS.length - 1];
    expect(at(field, cx, cy)).toBeGreaterThan(0.85);
    expect(at(field, chin.x, chin.y)).toBeLessThan(at(field, cx, cy));
    expect(at(field, 0.1, 0.1)).toBeLessThan(0.05);
  });

  it('maps low influence to blue and high influence to red, with the alpha capped around 0.5', () => {
    expect(heatColor(0)[3]).toBe(0);
    const high = heatColor(1);
    expect(high[0]).toBeGreaterThan(high[2]);
    expect(high[3]).toBeGreaterThan(0.45);
    expect(high[3]).toBeLessThanOrEqual(0.55);
    const low = heatColor(0.2);
    expect(low[2]).toBeGreaterThan(low[0]);
  });
});
