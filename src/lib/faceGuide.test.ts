import { describe, expect, it } from 'vitest';
import {
  allOk,
  checkGaze,
  checkLighting,
  checkPosition,
  checkPositionInOval,
  guideOval,
  headAngles,
  IDLE_CHECKS,
} from './faceGuide';

const flat = (value: number, n = 100) => new Uint8ClampedArray(Array.from({ length: n * 4 }, (_, i) => (i % 4 === 3 ? 255 : value)));

// Column-major rotation about Y (yaw), X (pitch), and Z (roll), as MediaPipe lays out its 4x4 matrix.
function matrix(yawDeg: number, pitchDeg: number, rollDeg = 0): number[] {
  const y = (yawDeg * Math.PI) / 180;
  const p = (pitchDeg * Math.PI) / 180;
  const r = (rollDeg * Math.PI) / 180;
  const m = new Array(16).fill(0);
  m[0] = Math.cos(y) * Math.cos(r);
  m[1] = Math.sin(r);
  m[2] = -Math.sin(y);
  m[5] = Math.cos(p) * Math.cos(r);
  m[6] = Math.sin(p);
  m[8] = Math.sin(y);
  m[10] = Math.cos(y) * Math.cos(p);
  m[15] = 1;
  return m;
}

describe('face guide lighting', () => {
  it('passes a mid-bright face', () => expect(checkLighting(flat(130)).state).toBe('ok'));
  it('flags a dark face with a hint', () => {
    const c = checkLighting(flat(30));
    expect(c.state).toBe('bad');
    expect(c.hint).toMatch(/terang/);
  });
  it('flags glare', () => expect(checkLighting(flat(252)).state).toBe('bad'));
});

describe('face guide gaze (including tilted and side-turned faces)', () => {
  it('reads yaw, pitch, and roll back from the matrix', () => {
    const a = headAngles(matrix(20, 0, 25));
    expect(a.yaw).toBeCloseTo(20, 2);
    expect(headAngles(matrix(0, -10)).pitch).toBeCloseTo(-10, 2);
    expect(headAngles(matrix(0, 0, 25)).roll).toBeCloseTo(25, 2);
  });

  it('passes frontal, tilted (roll), and angled side-turned (yaw <= 60°) faces', () => {
    expect(checkGaze(matrix(5, 4)).state).toBe('ok');
    expect(checkGaze(matrix(45, 0)).state).toBe('ok');
    expect(checkGaze(matrix(-55, 0)).state).toBe('ok');
    expect(checkGaze(matrix(0, 35, 35)).state).toBe('ok');
    expect(checkGaze(matrix(70, 0)).state).toBe('bad');
    expect(checkGaze(matrix(0, 50)).state).toBe('bad');
  });

  it('stays idle without a matrix', () => expect(checkGaze(undefined).state).toBe('idle'));
});

describe('face guide position & oval alignment', () => {
  const W = 800, H = 600;
  const oval = guideOval(W, H);
  const face = (scale: number, dx = 0) => [
    { x: oval.cx + dx, y: oval.cy - oval.ry * scale },
    { x: oval.cx + dx, y: oval.cy + oval.ry * scale },
    { x: oval.cx - oval.rx * scale * 0.7 + dx, y: oval.cy },
    { x: oval.cx + oval.rx * scale * 0.7 + dx, y: oval.cy },
  ];

  it('passes a face filling the oval', () => expect(checkPosition(face(0.85), W, H).state).toBe('ok'));
  it('asks to come closer when small', () => expect(checkPosition(face(0.4), W, H).hint).toMatch(/Dekatkan/));
  it('asks to move back when too large', () => expect(checkPosition(face(1.2), W, H).hint).toMatch(/Mundur/));
  it('asks to recenter when shifted', () => expect(checkPosition(face(0.85, 200), W, H).hint).toMatch(/tengah/));
  it('reports no face', () => expect(checkPosition([], W, H).state).toBe('bad'));

  it('supports tilted (rotated) face landmarks fitted inside a custom oval', () => {
    const customOval = { cx: 200, cy: 300, rx: 120, ry: 170 };
    const rad = (30 * Math.PI) / 180;
    const raw = [
      { x: 0, y: -135 },
      { x: 0, y: 135 },
      { x: -85, y: 0 },
      { x: 85, y: 0 },
    ];
    const tilted = raw.map((p) => ({
      x: customOval.cx + p.x * Math.cos(rad) - p.y * Math.sin(rad),
      y: customOval.cy + p.x * Math.sin(rad) + p.y * Math.cos(rad),
    }));
    const headSpan = Math.hypot(tilted[0].x - tilted[1].x, tilted[0].y - tilted[1].y);
    expect(checkPositionInOval(tilted, customOval, headSpan).state).toBe('ok');
  });
});

describe('allOk', () => {
  it('needs all three checks green', () => {
    expect(allOk(IDLE_CHECKS)).toBe(false);
    expect(allOk({ lighting: { state: 'ok' }, position: { state: 'ok' }, gaze: { state: 'ok' } })).toBe(true);
  });
});
