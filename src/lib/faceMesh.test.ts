import { describe, expect, it } from 'vitest';
import { drawMesh, emaAlpha, MESH_PREF_KEY, parseMeshPref, readMeshPref, smoothPoints, writeMeshPref, type MeshContext } from './faceMesh';

describe('mesh preference', () => {
  it('is on by default and only off for an explicit "0"', () => {
    expect(parseMeshPref(null)).toBe(true);
    expect(parseMeshPref(undefined)).toBe(true);
    expect(parseMeshPref('')).toBe(true);
    expect(parseMeshPref('garbage')).toBe(true);
    expect(parseMeshPref('1')).toBe(true);
    expect(parseMeshPref('0')).toBe(false);
  });

  it('round-trips through storage', () => {
    const data = new Map<string, string>();
    const storage = { getItem: (k: string) => data.get(k) ?? null, setItem: (k: string, v: string) => void data.set(k, v) };
    expect(readMeshPref(storage)).toBe(true);
    writeMeshPref(false, storage);
    expect(data.get(MESH_PREF_KEY)).toBe('0');
    expect(readMeshPref(storage)).toBe(false);
    writeMeshPref(true, storage);
    expect(readMeshPref(storage)).toBe(true);
  });

  it('keeps working when storage throws', () => {
    const broken = { getItem: () => { throw new Error('blocked'); }, setItem: () => { throw new Error('blocked'); } };
    expect(readMeshPref(broken)).toBe(true);
    expect(() => writeMeshPref(false, broken)).not.toThrow();
  });
});

describe('smoothing', () => {
  const a = [{ x: 0, y: 0 }, { x: 10, y: 20 }];
  const b = [{ x: 10, y: 10 }, { x: 20, y: 40 }];

  it('snaps on the first frame and when the point count changes, without aliasing the input', () => {
    const first = smoothPoints(null, b, 0.2);
    expect(first).toEqual(b);
    expect(first[0]).not.toBe(b[0]);
    expect(smoothPoints([{ x: 0, y: 0 }], b, 0.2)).toEqual(b);
  });

  it('moves a fraction of the way toward the target', () => {
    expect(smoothPoints(a, b, 0.5)).toEqual([{ x: 5, y: 5 }, { x: 15, y: 30 }]);
    expect(smoothPoints(a, b, 0)).toEqual(a);
    expect(smoothPoints(a, b, 1)).toEqual(b);
  });

  it('clamps alpha and converges on a still target', () => {
    expect(smoothPoints(a, b, 5)).toEqual(b);
    let cur = a;
    for (let i = 0; i < 40; i++) cur = smoothPoints(cur, b, 0.3);
    expect(cur[1].x).toBeCloseTo(20, 3);
  });

  it('derives alpha from elapsed time, so a slow frame catches up more', () => {
    expect(emaAlpha(0, 50)).toBe(0);
    expect(emaAlpha(16, 50)).toBeLessThan(emaAlpha(33, 50));
    expect(emaAlpha(1000, 50)).toBeGreaterThan(0.99);
  });
});

describe('drawMesh', () => {
  it('draws in batched passes and skips links to missing points', () => {
    const ops: string[] = [];
    const ctx: MeshContext = {
      strokeStyle: '', fillStyle: '', lineWidth: 0, lineCap: 'butt',
      beginPath: () => ops.push('begin'), moveTo: () => ops.push('move'), lineTo: () => ops.push('line'),
      stroke: () => ops.push('stroke'), rect: () => ops.push('rect'), fill: () => ops.push('fill'),
    };
    const pts = [{ x: 1, y: 1 }, { x: 2, y: 2 }, { x: 3, y: 3 }];
    drawMesh(ctx, pts, [{ start: 0, end: 1 }, { start: 1, end: 9 }], [{ start: 1, end: 2 }]);
    expect(ops.filter((o) => o === 'stroke')).toHaveLength(2);
    expect(ops.filter((o) => o === 'move')).toHaveLength(2); // the link to point 9 is skipped
    expect(ops.filter((o) => o === 'rect')).toHaveLength(3);
    expect(ctx.lineCap).toBe('round');
  });
});
