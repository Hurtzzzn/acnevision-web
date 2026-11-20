import { describe, expect, it, vi } from 'vitest';
import { frameToBlob, visibleCropRect, type CaptureCanvas } from './capture';
import { guideOval, isInsideFrame, type Point } from './faceGuide';
import photoInputSource from '../components/PhotoInput.tsx?raw';

function fakeCanvas() {
  const calls: string[] = [];
  const drawn: unknown[] = [];
  const qualities: number[] = [];
  const canvas: CaptureCanvas = {
    width: 0, height: 0,
    getContext: () => ({
      translate: (x, y) => calls.push(`translate(${x},${y})`),
      scale: (x, y) => calls.push(`scale(${x},${y})`),
      drawImage: (img, sx, sy, sw, sh, dx, dy, dw, dh) => { drawn.push(img); calls.push(`draw(${sx},${sy},${sw},${sh}->${dx},${dy},${dw},${dh})`); },
    }),
    toBlob: (cb, _type, quality) => { qualities.push(quality); cb(new Blob(['x'], { type: 'image/jpeg' })); },
  };
  return { canvas, calls, drawn, qualities };
}

const video = { videoWidth: 1280, videoHeight: 960 } as HTMLVideoElement;

describe('frameToBlob', () => {
  it('draws only the video frame, once, at its native size (no overlay canvas is ever a source)', async () => {
    const f = fakeCanvas();
    const overlay = { tag: 'overlay-canvas' };
    await frameToBlob(video, { makeCanvas: () => f.canvas });
    expect(f.drawn).toEqual([video]);
    expect(f.drawn).not.toContain(overlay);
    expect(f.calls).toContain('draw(0,0,1280,960->0,0,1280,960)');
    expect(f.canvas.width).toBe(1280);
    expect(f.canvas.height).toBe(960);
  });

  it('encodes at a high JPEG quality by default', async () => {
    const f = fakeCanvas();
    await frameToBlob(video, { makeCanvas: () => f.canvas });
    expect(f.qualities).toEqual([0.95]);
  });

  it('keeps only the crop rectangle, at native pixels, when given one', async () => {
    const f = fakeCanvas();
    await frameToBlob(video, { mirrored: false, crop: { x: 100, y: 50, w: 600, h: 800 }, makeCanvas: () => f.canvas });
    expect(f.drawn).toEqual([video]);
    expect(f.calls).toEqual(['draw(100,50,600,800->0,0,600,800)']);
    expect(f.canvas.width).toBe(600);
    expect(f.canvas.height).toBe(800);
  });

  it('mirrors a crop within the crop itself, so the file matches the mirrored preview', async () => {
    const f = fakeCanvas();
    await frameToBlob(video, { mirrored: true, crop: { x: 100, y: 50, w: 600, h: 800 }, makeCanvas: () => f.canvas });
    expect(f.calls.slice(0, 2)).toEqual(['translate(600,0)', 'scale(-1,1)']);
  });

  it('mirrors like the preview when asked, and not otherwise', async () => {
    const a = fakeCanvas();
    await frameToBlob(video, { mirrored: true, makeCanvas: () => a.canvas });
    expect(a.calls.slice(0, 2)).toEqual(['translate(1280,0)', 'scale(-1,1)']);
    const b = fakeCanvas();
    await frameToBlob(video, { mirrored: false, makeCanvas: () => b.canvas });
    expect(b.calls.some((c) => c.startsWith('scale'))).toBe(false);
  });

  it('has no path to an overlay: a mesh canvas next to the video is never touched, even when it holds mesh pixels', async () => {
    // The vitest environment here is node (no DOM), so the stage is modelled with plain objects. The overlay records every
    // member that is touched, and the video exposes it as a sibling the way the real stage does.
    const touched: string[] = [];
    const overlay = new Proxy({ tag: 'mesh-overlay', pixels: 'mesh' }, {
      get: (_t, prop) => { touched.push(String(prop)); return undefined; },
    });
    const stage = { children: [] as unknown[] };
    const base = { videoWidth: 1280, videoHeight: 960, parentElement: stage };
    const vid = base as unknown as HTMLVideoElement;
    stage.children.push(vid, overlay);

    const f = fakeCanvas();
    await frameToBlob(vid, { makeCanvas: () => f.canvas });

    expect(f.drawn).toHaveLength(1); // the one and only source is the video element
    expect(f.drawn[0]).toBe(vid);
    expect(touched).toEqual([]); // the overlay was never read, drawn, or encoded
  });

  it('cannot be given an overlay: no parameter accepts one, and the source never looks for other elements', () => {
    expect(frameToBlob.length).toBe(1); // (video, options?) only; options carry mirrored, quality, crop, makeCanvas
    const src = frameToBlob.toString();
    for (const lookup of ['querySelector', 'getElementById', 'getElementsBy', 'parentElement', 'parentNode', 'siblings', 'toDataURL', 'getImageData', 'drawImage(overlay']) {
      expect(src).not.toContain(lookup);
    }
    expect(src.match(/drawImage\(/g)).toHaveLength(1);
  });

  it('is called by PhotoInput with the video element, the mirror flag and the visible-area crop only', () => {
    const calls = photoInputSource.match(/frameToBlob\([^)]*\)/g) ?? [];
    expect(calls).toEqual(['frameToBlob(video, { mirrored: true, crop })']);
  });

  it('rejects when the video has no frame yet', async () => {
    const make = vi.fn();
    await expect(frameToBlob({ videoWidth: 0, videoHeight: 0 } as HTMLVideoElement, { makeCanvas: make })).rejects.toThrow();
    expect(make).not.toHaveBeenCalled();
  });
});

describe('visibleCropRect', () => {
  const wide = { videoWidth: 1920, videoHeight: 1080 };
  const stage = { width: 800, height: 600 }; // the 4:3 stage on desktop

  it('keeps what the 4:3 stage shows of a 16:9 frame: full height, sides trimmed to the stage shape, native pixels', () => {
    expect(visibleCropRect(wide, stage)).toEqual({ x: 240, y: 0, w: 1440, h: 1080 });
  });

  it('keeps what the 3:4 phone stage shows of a portrait frame', () => {
    expect(visibleCropRect({ videoWidth: 1080, videoHeight: 1920 }, { width: 360, height: 480 })).toEqual({ x: 0, y: 240, w: 1080, h: 1440 });
  });

  it('keeps the whole frame when the video and the stage have the same shape', () => {
    expect(visibleCropRect({ videoWidth: 640, videoHeight: 480 }, stage)).toEqual({ x: 0, y: 0, w: 640, h: 480 });
  });

  it('is not cropped down to the face guide: it is far larger than the oval', () => {
    const oval = guideOval(stage.width, stage.height);
    const scale = Math.max(stage.width / wide.videoWidth, stage.height / wide.videoHeight);
    const r = visibleCropRect(wide, stage)!;
    expect(r.h).toBeGreaterThan(((oval.ry * 2) / scale) * 1.1);
    expect(r.w).toBeGreaterThan(((oval.rx * 2) / scale) * 1.5);
  });

  it('is centered in the frame, so the same rectangle holds mirrored or not', () => {
    const r = visibleCropRect(wide, stage)!;
    expect(r.x + r.w / 2).toBeCloseTo(960, 0);
    expect(r.y + r.h / 2).toBeCloseTo(540, 0);
  });

  it('returns undefined until the frame and the stage have a size', () => {
    expect(visibleCropRect({ videoWidth: 0, videoHeight: 0 }, stage)).toBeUndefined();
    expect(visibleCropRect(wide, { width: 0, height: 0 })).toBeUndefined();
  });

  // Video frame x stage, for a laptop webcam (several resolutions) and a phone held upright.
  const setups = [
    { name: '1920x1080 on 800x600', video: { videoWidth: 1920, videoHeight: 1080 }, stage: { width: 800, height: 600 } },
    { name: '1280x720 on 640x480', video: { videoWidth: 1280, videoHeight: 720 }, stage: { width: 640, height: 480 } },
    { name: '640x480 on 800x600', video: { videoWidth: 640, videoHeight: 480 }, stage: { width: 800, height: 600 } },
    { name: '1080x1920 on 360x480', video: { videoWidth: 1080, videoHeight: 1920 }, stage: { width: 360, height: 480 } },
    { name: '1280x960 on 340x453', video: { videoWidth: 1280, videoHeight: 960 }, stage: { width: 340, height: 453 } },
    { name: '1920x1080 on 1013x760 (odd size)', video: { videoWidth: 1920, videoHeight: 1080 }, stage: { width: 1013, height: 760 } },
  ];

  it.each(setups)('stays inside the frame and keeps the whole visible area, and not more than a pixel extra ($name)', ({ video: v, stage: s }) => {
    const r = visibleCropRect(v, s)!;
    expect(r.x).toBeGreaterThanOrEqual(0);
    expect(r.y).toBeGreaterThanOrEqual(0);
    expect(r.x + r.w).toBeLessThanOrEqual(v.videoWidth);
    expect(r.y + r.h).toBeLessThanOrEqual(v.videoHeight);
    const scale = Math.max(s.width / v.videoWidth, s.height / v.videoHeight);
    const offX = (s.width - v.videoWidth * scale) / 2, offY = (s.height - v.videoHeight * scale) / 2;
    const eps = 1e-6;
    // Back in stage pixels the crop reaches the stage's edges (rounding is outward), and overshoots by under a video pixel.
    expect(offX + r.x * scale).toBeLessThanOrEqual(0 + eps);
    expect(offX + (r.x + r.w) * scale).toBeGreaterThanOrEqual(s.width - eps);
    expect(offY + r.y * scale).toBeLessThanOrEqual(0 + eps);
    expect(offY + (r.y + r.h) * scale).toBeGreaterThanOrEqual(s.height - eps);
    expect(r.w).toBeLessThanOrEqual(s.width / scale + 2);
    expect(r.h).toBeLessThanOrEqual(s.height / scale + 2);
  });

  it.each(setups)('holds every landmark the position check counts as inside the frame, mirrored preview included ($name)', ({ video: v, stage: s }) => {
    const r = visibleCropRect(v, s)!;
    const scale = Math.max(s.width / v.videoWidth, s.height / v.videoHeight);
    const offX = (s.width - v.videoWidth * scale) / 2, offY = (s.height - v.videoHeight * scale) / 2;
    // Points all along the edge of the stage (stage pixels, mirrored like the preview), where "inside" is decided.
    const edge: Point[] = [];
    for (let i = 0; i <= 40; i++) {
      const t = i / 40;
      edge.push({ x: t * s.width, y: 0 }, { x: t * s.width, y: s.height }, { x: 0, y: t * s.height }, { x: s.width, y: t * s.height });
    }
    for (const p of edge) {
      expect(isInsideFrame(p, s.width, s.height)).toBe(true);
      // The preview is mirrored, so a stage x maps to the opposite side of the video frame.
      const vx = (s.width - p.x - offX) / scale, vy = (p.y - offY) / scale;
      expect(vx).toBeGreaterThanOrEqual(r.x - 1e-6);
      expect(vx).toBeLessThanOrEqual(r.x + r.w + 1e-6);
      expect(vy).toBeGreaterThanOrEqual(r.y - 1e-6);
      expect(vy).toBeLessThanOrEqual(r.y + r.h + 1e-6);
    }
    // Just past the edge is already outside the frame for the check.
    expect(isInsideFrame({ x: -1, y: s.height / 2 }, s.width, s.height)).toBe(false);
    expect(isInsideFrame({ x: s.width + 1, y: s.height / 2 }, s.width, s.height)).toBe(false);
  });
});
