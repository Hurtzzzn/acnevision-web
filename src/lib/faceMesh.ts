import type { Point } from './faceGuide';

/**
 * Pure helpers behind the optional face mesh drawn over the camera preview: the saved on/off choice, landmark smoothing,
 * and the drawing itself (against a minimal canvas interface so it can be tested). The mesh is drawn on its own overlay
 * canvas; the photo never reads from it (see `frameToBlob`).
 */

export const MESH_PREF_KEY = 'acnevision.faceMesh';

/** On unless the person turned it off. Anything unreadable counts as "no choice yet", which is on. */
export function parseMeshPref(raw: string | null | undefined): boolean {
  return raw !== '0';
}

export function readMeshPref(storage?: Pick<Storage, 'getItem'>): boolean {
  try {
    return parseMeshPref((storage ?? window.localStorage).getItem(MESH_PREF_KEY));
  } catch {
    return true; // storage blocked or unavailable
  }
}

export function writeMeshPref(on: boolean, storage?: Pick<Storage, 'setItem'>): void {
  try {
    (storage ?? window.localStorage).setItem(MESH_PREF_KEY, on ? '1' : '0');
  } catch {
    // The choice just won't be remembered.
  }
}

/** Per-frame blend factor of an exponential moving average with time constant `tauMs`, so smoothing does not depend on frame rate. */
export function emaAlpha(dtMs: number, tauMs: number): number {
  if (dtMs <= 0) return 0;
  return 1 - Math.exp(-dtMs / tauMs);
}

/** Moves `prev` toward `target` by `alpha` (0 keeps prev, 1 jumps to target). A first frame or a changed point count snaps. */
export function smoothPoints(prev: readonly Point[] | null, target: readonly Point[], alpha: number): Point[] {
  if (!prev || prev.length !== target.length) return target.map((p) => ({ x: p.x, y: p.y }));
  const a = Math.max(0, Math.min(1, alpha));
  return target.map((t, i) => ({ x: prev[i].x + (t.x - prev[i].x) * a, y: prev[i].y + (t.y - prev[i].y) * a }));
}

export interface MeshConnection { start: number; end: number }

/** The few canvas members `drawMesh` uses. */
export interface MeshContext {
  strokeStyle: string | CanvasGradient | CanvasPattern;
  fillStyle: string | CanvasGradient | CanvasPattern;
  lineWidth: number;
  lineCap: CanvasLineCap;
  beginPath(): void;
  moveTo(x: number, y: number): void;
  lineTo(x: number, y: number): void;
  stroke(): void;
  rect(x: number, y: number, w: number, h: number): void;
  fill(): void;
}

// Light blue (primary-200) for the fine net, white for the face features; both stay faint so the skin remains visible.
export const MESH_STYLE = {
  net: { color: 'rgba(191, 219, 254, 0.26)', width: 0.5 },
  features: { color: 'rgba(255, 255, 255, 0.45)', width: 0.9 },
  dots: { color: 'rgba(255, 255, 255, 0.4)', size: 1.2 },
} as const;

function strokeConnections(ctx: MeshContext, pts: readonly Point[], links: readonly MeshConnection[], color: string, width: number) {
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.beginPath();
  for (const { start, end } of links) {
    const a = pts[start], b = pts[end];
    if (!a || !b) continue;
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
  }
  ctx.stroke();
}

/** Draws the mesh in three batched passes (net, features, dots) instead of one path per segment. `pts` are in canvas CSS pixels. */
export function drawMesh(ctx: MeshContext, pts: readonly Point[], net: readonly MeshConnection[], features: readonly MeshConnection[]): void {
  ctx.lineCap = 'round';
  strokeConnections(ctx, pts, net, MESH_STYLE.net.color, MESH_STYLE.net.width);
  strokeConnections(ctx, pts, features, MESH_STYLE.features.color, MESH_STYLE.features.width);
  const s = MESH_STYLE.dots.size;
  ctx.fillStyle = MESH_STYLE.dots.color;
  ctx.beginPath();
  for (const p of pts) ctx.rect(p.x - s / 2, p.y - s / 2, s, s);
  ctx.fill();
}
