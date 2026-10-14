import { describe, expect, it } from 'vitest';
import { allOk, checkGaze, checkLighting, checkPosition, guideOval, headAngles, IDLE_CHECKS } from './faceGuide';

const flat = (value: number, n = 100) => new Uint8ClampedArray(Array.from({ length: n * 4 }, (_, i) => (i % 4 === 3 ? 255 : value)));

// Column-major rotation about Y (yaw) and X (pitch), as MediaPipe lays out its 4x4 matrix.
function matrix(yawDeg: number, pitchDeg: number): number[] {
  const y = (yawDeg * Math.PI) / 180, p = (pitchDeg * Math.PI) / 180;
  const m = new Array(16).fill(0);
  m[0] = Math.cos(y); m[2] = -Math.sin(y);
  m[5] = Math.cos(p); m[6] = Math.sin(p);
  m[8] = Math.sin(y); m[10] = Math.cos(y) * Math.cos(p);
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

describe('face guide gaze', () => {
  it('reads yaw and pitch back from the matrix', () => {
    const a = headAngles(matrix(20, 0));
    expect(a.yaw).toBeCloseTo(20, 3);
    expect(headAngles(matrix(0, -10)).pitch).toBeCloseTo(-10, 3);
  });
  it('passes a frontal face and flags a turned one', () => {
    expect(checkGaze(matrix(5, 4)).state).toBe('ok');
    expect(checkGaze(matrix(45, 0)).state).toBe('bad');
    expect(checkGaze(matrix(30, 0)).state).toBe('ok');
    expect(checkGaze(matrix(-30, 0)).state).toBe('ok');
    expect(checkGaze(matrix(0, 22)).state).toBe('ok');
    expect(checkGaze(matrix(0, 30)).state).toBe('bad');
    expect(checkGaze(matrix(0, 40)).state).toBe('bad');
  });
  it('stays idle without a matrix', () => expect(checkGaze(undefined).state).toBe('idle'));
});

describe('face guide position', () => {
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
});

describe('allOk', () => {
  it('needs all three checks green', () => {
    expect(allOk(IDLE_CHECKS)).toBe(false);
    expect(allOk({ lighting: { state: 'ok' }, position: { state: 'ok' }, gaze: { state: 'ok' } })).toBe(true);
  });
});
