import { describe, expect, it, vi } from 'vitest';
import { frameToBlob, type CaptureCanvas } from './capture';
import photoInputSource from '../components/PhotoInput.tsx?raw';

function fakeCanvas() {
  const calls: string[] = [];
  const drawn: unknown[] = [];
  const canvas: CaptureCanvas = {
    width: 0, height: 0,
    getContext: () => ({
      translate: (x, y) => calls.push(`translate(${x},${y})`),
      scale: (x, y) => calls.push(`scale(${x},${y})`),
      drawImage: (img, dx, dy, dw, dh) => { drawn.push(img); calls.push(`draw(${dx},${dy},${dw},${dh})`); },
    }),
    toBlob: (cb) => cb(new Blob(['x'], { type: 'image/jpeg' })),
  };
  return { canvas, calls, drawn };
}

const video = { videoWidth: 1280, videoHeight: 960 } as HTMLVideoElement;

describe('frameToBlob', () => {
  it('draws only the video frame, once, at its native size (no overlay canvas is ever a source)', async () => {
    const f = fakeCanvas();
    const overlay = { tag: 'overlay-canvas' };
    await frameToBlob(video, { makeCanvas: () => f.canvas });
    expect(f.drawn).toEqual([video]);
    expect(f.drawn).not.toContain(overlay);
    expect(f.calls).toContain('draw(0,0,1280,960)');
    expect(f.canvas.width).toBe(1280);
    expect(f.canvas.height).toBe(960);
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
    expect(frameToBlob.length).toBe(1); // (video, options?) only; options carry mirrored, quality, makeCanvas
    const src = frameToBlob.toString();
    for (const lookup of ['querySelector', 'getElementById', 'getElementsBy', 'parentElement', 'parentNode', 'siblings', 'toDataURL', 'getImageData', 'drawImage(overlay']) {
      expect(src).not.toContain(lookup);
    }
    expect(src.match(/drawImage\(/g)).toHaveLength(1);
  });

  it('is called by PhotoInput with the video element only', () => {
    const calls = photoInputSource.match(/frameToBlob\([^)]*\)/g) ?? [];
    expect(calls).toEqual(['frameToBlob(video, { mirrored: true })']);
  });

  it('rejects when the video has no frame yet', async () => {
    const make = vi.fn();
    await expect(frameToBlob({ videoWidth: 0, videoHeight: 0 } as HTMLVideoElement, { makeCanvas: make })).rejects.toThrow();
    expect(make).not.toHaveBeenCalled();
  });
});
