import { COPY } from '@acnevision/shared';

/**
 * Pure checks behind the camera face guide. They take landmarks and pixels only (no MediaPipe, no DOM), so they are testable.
 * Everything runs in the browser; nothing here sends a frame anywhere.
 */

export interface Point { x: number; y: number }
export type CheckState = 'ok' | 'bad' | 'idle';
export interface Check { state: CheckState; hint?: string }
export interface GuideChecks { lighting: Check; position: Check; gaze: Check }

const G = COPY.scan.guide;

export const IDLE_CHECKS: GuideChecks = { lighting: { state: 'idle' }, position: { state: 'idle' }, gaze: { state: 'idle' } };
export const NO_FACE_CHECKS: GuideChecks = { lighting: { state: 'idle' }, position: { state: 'bad', hint: G.noFace }, gaze: { state: 'idle' } };

export const allOk = (c: GuideChecks) => c.lighting.state === 'ok' && c.position.state === 'ok' && c.gaze.state === 'ok';

// Lighting: mean brightness (0 to 255) of the face area, and the share of near-white pixels (glare).
export const MIN_BRIGHTNESS = 70;
export const MAX_BRIGHTNESS = 200;
export const MAX_GLARE_SHARE = 0.12;
// Gaze: head turn limits in degrees. Loose on yaw, since people turn a little to show the cheek.
export const MAX_YAW_DEG = 35;
export const MAX_PITCH_DEG = 25;
// Position: the face height must fill this share of the oval height, and every landmark must sit inside the oval (with slack).
export const MIN_FACE_SHARE = 0.62;
const OVAL_SLACK = 1.06;

/** Mean brightness and glare share from RGBA pixel data. */
export function measureLight(rgba: ArrayLike<number>): { mean: number; glare: number } {
  const n = Math.floor(rgba.length / 4);
  if (n === 0) return { mean: 0, glare: 0 };
  let sum = 0;
  let glare = 0;
  for (let i = 0; i < n; i++) {
    const y = 0.299 * rgba[i * 4] + 0.587 * rgba[i * 4 + 1] + 0.114 * rgba[i * 4 + 2];
    sum += y;
    if (y > 245) glare++;
  }
  return { mean: sum / n, glare: glare / n };
}

export function checkLighting(rgba: ArrayLike<number>): Check {
  const { mean, glare } = measureLight(rgba);
  if (mean < MIN_BRIGHTNESS) return { state: 'bad', hint: G.lightingDark };
  if (mean > MAX_BRIGHTNESS || glare > MAX_GLARE_SHARE) return { state: 'bad', hint: G.lightingBright };
  return { state: 'ok' };
}

/** Yaw and pitch in degrees from MediaPipe's 4x4 facial transformation matrix (column-major, rotation in the top-left 3x3). */
export function headAngles(m: ArrayLike<number>): { yaw: number; pitch: number } {
  const deg = 180 / Math.PI;
  return { yaw: Math.asin(Math.max(-1, Math.min(1, -m[2]))) * deg, pitch: Math.atan2(m[6], m[10]) * deg };
}

export function checkGaze(m: ArrayLike<number> | undefined): Check {
  if (!m || m.length < 16) return { state: 'idle' };
  const { yaw, pitch } = headAngles(m);
  return Math.abs(yaw) <= MAX_YAW_DEG && Math.abs(pitch) <= MAX_PITCH_DEG ? { state: 'ok' } : { state: 'bad', hint: G.gazeBad };
}

/** The guide oval in stage pixels: centered, 70% of the stage height, 3:4 (matches the dashed oval drawn in PhotoInput). */
export function guideOval(width: number, height: number) {
  const ry = height * 0.35;
  return { cx: width / 2, cy: height / 2, rx: ry * 0.75, ry };
}

export function boundsOf(points: readonly Point[]) {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const p of points) {
    if (p.x < minX) minX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.x > maxX) maxX = p.x;
    if (p.y > maxY) maxY = p.y;
  }
  return { minX, minY, maxX, maxY, width: maxX - minX, height: maxY - minY };
}

/** `points` are face landmarks in stage pixels. */
export function checkPosition(points: readonly Point[], stageW: number, stageH: number): Check {
  if (points.length === 0) return { state: 'bad', hint: G.noFace };
  const oval = guideOval(stageW, stageH);
  const b = boundsOf(points);
  const outside = points.some((p) => ((p.x - oval.cx) / oval.rx) ** 2 + ((p.y - oval.cy) / oval.ry) ** 2 > OVAL_SLACK ** 2);
  const share = b.height / (oval.ry * 2);
  if (outside) return { state: 'bad', hint: share > 0.95 ? G.tooClose : G.offCenter };
  if (share < MIN_FACE_SHARE) return { state: 'bad', hint: G.tooFar };
  return { state: 'ok' };
}
