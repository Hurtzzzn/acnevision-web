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
  drawImage(image: CanvasImageSource, sx: number, sy: number, sw: number, sh: number, dx: number, dy: number, dw: number, dh: number): void;
}

/** A rectangle in the video's own pixels (before any mirroring). */
export interface CropRect { x: number; y: number; w: number; h: number }

/**
 * The part of the video that the stage shows, in video pixels: what you see is what you send. The video fills the stage with
 * `object-cover` (scaled to cover it, centered), so when the video and the stage have different shapes the overflowing sides are
 * trimmed away; when they match this is the whole frame. The photo is not cropped to the face guide: close-ups are what the detector
 * wants, so the whole visible frame goes at the camera's own resolution (no resampling).
 *
 * It is centered in the frame, so it is the same rectangle whether or not the preview is mirrored. Edges are rounded outward (never
 * inward) and clamped to the frame. The position check works in the same stage pixels (see `isInsideFrame`), so a landmark it counts
 * as inside the frame is inside this crop. Returns undefined when a size is not known yet.
 */
export function visibleCropRect(
  video: Pick<HTMLVideoElement, 'videoWidth' | 'videoHeight'>,
  stage: { width: number; height: number },
): CropRect | undefined {
  const vw = video.videoWidth, vh = video.videoHeight;
  if (!vw || !vh || !stage.width || !stage.height) return undefined;
  const scale = Math.max(stage.width / vw, stage.height / vh);
  const shownW = stage.width / scale, shownH = stage.height / scale;
  const x = Math.max(0, Math.floor((vw - shownW) / 2)), right = Math.min(vw, Math.ceil((vw + shownW) / 2));
  const y = Math.max(0, Math.floor((vh - shownH) / 2)), bottom = Math.min(vh, Math.ceil((vh + shownH) / 2));
  return right > x && bottom > y ? { x, y, w: right - x, h: bottom - y } : undefined;
}

/**
 * Takes the photo straight from the camera's video frame at its native resolution, on a fresh offscreen canvas. Only the video is
 * drawn: the face guide (mesh, oval, chips, overlay canvas) lives in sibling elements and is never a source here, so none of
 * it can end up in the file. `crop` keeps just that part of the frame (the whole frame when omitted); the crop is not resampled.
 * `mirrored` flips the result to match the mirrored preview.
 */
export function frameToBlob(
  video: HTMLVideoElement,
  { mirrored = true, quality = 0.95, crop, makeCanvas = () => document.createElement('canvas') as CaptureCanvas }: { mirrored?: boolean; quality?: number; crop?: CropRect; makeCanvas?: () => CaptureCanvas } = {},
): Promise<Blob> {
  const fw = video.videoWidth, fh = video.videoHeight;
  if (!fw || !fh) return Promise.reject(new Error('video has no frame'));
  const src = crop ?? { x: 0, y: 0, w: fw, h: fh };
  const canvas = makeCanvas();
  canvas.width = src.w;
  canvas.height = src.h;
  const ctx = canvas.getContext('2d');
  if (!ctx) return Promise.reject(new Error('no 2d context'));
  if (mirrored) { ctx.translate(src.w, 0); ctx.scale(-1, 1); }
  ctx.drawImage(video, src.x, src.y, src.w, src.h, 0, 0, src.w, src.h);
  return new Promise((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('encode failed'))), 'image/jpeg', quality));
}
