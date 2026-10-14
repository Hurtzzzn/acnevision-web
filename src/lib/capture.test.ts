import { describe, expect, it, vi } from 'vitest';
import { frameToBlob, type CaptureCanvas } from './capture';

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

  it('rejects when the video has no frame yet', async () => {
    const make = vi.fn();
    await expect(frameToBlob({ videoWidth: 0, videoHeight: 0 } as HTMLVideoElement, { makeCanvas: make })).rejects.toThrow();
    expect(make).not.toHaveBeenCalled();
  });
});
