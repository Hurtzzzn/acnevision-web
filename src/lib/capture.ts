/** The few canvas members `frameToBlob` uses, so it can be tested with a fake canvas. */
export interface CaptureCanvas {
  width: number;
  height: number;
  getContext(type: '2d'): CaptureContext | null;
  toBlob(cb: (b: Blob | null) => void, type: string, quality: number): void;
}
export interface CaptureContext {
  translate(x: number, y: number): void;
  scale(x: number, y: number): void;
  drawImage(image: CanvasImageSource, dx: number, dy: number, dw: number, dh: number): void;
}

/**
 * Takes the photo straight from the camera's video frame at its native size, on a fresh offscreen canvas. Only the video is
 * drawn: the face guide (mesh, oval, chips, overlay canvas) lives in sibling elements and is never a source here, so none of
 * it can end up in the file. `mirrored` flips it to match the mirrored preview.
 */
export function frameToBlob(
  video: HTMLVideoElement,
  { mirrored = true, quality = 0.92, makeCanvas = () => document.createElement('canvas') as CaptureCanvas }: { mirrored?: boolean; quality?: number; makeCanvas?: () => CaptureCanvas } = {},
): Promise<Blob> {
  const w = video.videoWidth, h = video.videoHeight;
  if (!w || !h) return Promise.reject(new Error('video has no frame'));
  const canvas = makeCanvas();
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) return Promise.reject(new Error('no 2d context'));
  if (mirrored) { ctx.translate(w, 0); ctx.scale(-1, 1); }
  ctx.drawImage(video, 0, 0, w, h);
  return new Promise((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('encode failed'))), 'image/jpeg', quality));
}
