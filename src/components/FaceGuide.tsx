import { useEffect, useRef, useState } from 'react';
import { Check, Info } from 'lucide-react';
import { COPY } from '@acnevision/shared';
import {
  allOk, boundsOf, checkGaze, checkLighting, checkPosition, IDLE_CHECKS, NO_FACE_CHECKS,
  type Check as GuideCheck, type GuideChecks, type Point,
} from '../lib/faceGuide';
import { FaceMeshIcon } from './FaceMeshIcon';
import { loadFaceLandmarker, type LoadedLandmarker } from '../lib/faceLandmarker';
import { drawMesh, emaAlpha, readMeshPref, smoothPoints, writeMeshPref } from '../lib/faceMesh';

const G = COPY.scan.guide;
/** Detection runs about 12 times a second, not every frame. */
const DETECT_INTERVAL_MS = 1000 / 12;
const SAMPLE_SIZE = 24;
/** The mesh eases toward each new detection (time constant) and is redrawn at most ~30 times a second. */
const MESH_SMOOTH_TAU_MS = 45;
const MESH_DRAW_INTERVAL_MS = 1000 / 30;
const MESH_MAX_DPR = 2;
/** Slightly longer than the 200 ms fade, so the canvas is wiped only after it has faded out. */
const MESH_FADE_MS = 220;

export type GuideStatus = 'loading' | 'ready' | 'unavailable';
export interface GuideState { status: GuideStatus; ok: boolean }

type Tone = 'ok' | 'bad' | 'neutral';

/** The one line shown on the stage: the first thing to adjust, else "all good", else the general hint. */
function statusOf(checks: GuideChecks): { tone: Tone; text: string } {
  if (allOk(checks)) return { tone: 'ok', text: G.allGood };
  const bad = [checks.position, checks.lighting, checks.gaze].find((c: GuideCheck) => c.state === 'bad' && c.hint);
  return bad ? { tone: 'bad', text: bad.hint as string } : { tone: 'neutral', text: G.hint };
}

/** Follows `value` only after it has stayed the same for `delay` ms, so a screen reader is not told about every flicker. */
function useSettled<T>(value: T, delay: number): T {
  const [settled, setSettled] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setSettled(value), delay);
    return () => clearTimeout(id);
  }, [value, delay]);
  return settled;
}

/** Soft amber for "not quite", never red: it should read as a suggestion, not an error. */
const TONE_CLASS: Record<Tone, string> = {
  ok: 'border-green-200 bg-green-50 text-green-800',
  bad: 'border-amber-200 bg-amber-50 text-amber-800',
  neutral: 'frosted text-ink-600',
};

/**
 * Real-time face position guide over the camera: the target oval (it changes color with the status), a single status line
 * that names the first thing to adjust. Runs MediaPipe Face Landmarker in the browser (no frame leaves the device). If the model
 * cannot load or run, it reports `unavailable` and renders nothing, so the parent shows its plain oval and the camera keeps
 * working. It can also draw a face mesh on its own overlay canvas (on by default, switchable); the photo is taken from the
 * video element (see `frameToBlob`), never from here, so neither the mesh nor the oval can end up in the file.
 */
export function FaceGuide({ video, onState }: { video: HTMLVideoElement | null; onState: (s: GuideState) => void }) {
  const [loaded, setLoaded] = useState<LoadedLandmarker | null>(null);
  const [status, setStatus] = useState<GuideStatus>('loading');
  const [checks, setChecks] = useState<GuideChecks>(IDLE_CHECKS);
  const [faceSeen, setFaceSeen] = useState(false);
  const [meshOn, setMeshOn] = useState(readMeshPref);
  const [pageVisible, setPageVisible] = useState(() => !document.hidden);
  const stage = useRef<HTMLDivElement>(null);
  const meshCanvas = useRef<HTMLCanvasElement>(null);
  const meshOnRef = useRef(meshOn);
  meshOnRef.current = meshOn;
  const onStateRef = useRef(onState);
  onStateRef.current = onState;

  function toggleMesh() {
    const next = !meshOn;
    setMeshOn(next);
    writeMeshPref(next);
  }

  useEffect(() => {
    const onChange = () => setPageVisible(!document.hidden);
    document.addEventListener('visibilitychange', onChange);
    return () => document.removeEventListener('visibilitychange', onChange);
  }, []);

  const meshVisible = meshOn && faceSeen && pageVisible;
  // Once the mesh has faded out, wipe the canvas so no stale frame is left behind.
  useEffect(() => {
    if (meshVisible) return;
    const canvas = meshCanvas.current;
    const id = setTimeout(() => canvas?.getContext('2d')?.clearRect(0, 0, canvas.width, canvas.height), MESH_FADE_MS);
    return () => clearTimeout(id);
  }, [meshVisible]);

  // Load the model once per mount, and release it on unmount.
  useEffect(() => {
    let cancelled = false;
    let current: LoadedLandmarker | null = null;
    loadFaceLandmarker().then(
      (l) => { if (cancelled) l.landmarker.close(); else { current = l; setLoaded(l); setStatus('ready'); } },
      () => { if (!cancelled) setStatus('unavailable'); },
    );
    return () => { cancelled = true; current?.landmarker.close(); };
  }, []);

  const ok = allOk(checks);
  useEffect(() => { onStateRef.current({ status, ok: status === 'ready' && ok }); }, [status, ok]);

  // Detection loop, throttled to ~12 fps; rAF also pauses it in background tabs.
  useEffect(() => {
    if (!video || !loaded) return;
    const scratch = document.createElement('canvas');
    scratch.width = SAMPLE_SIZE;
    scratch.height = SAMPLE_SIZE;
    const sctx = scratch.getContext('2d', { willReadFrequently: true });
    const canvas = meshCanvas.current;
    const mctx = canvas?.getContext('2d') ?? null;
    let raf = 0;
    let last = 0;
    let lastKey = '';
    // Mesh state: where the landmarks were last detected (stage pixels), and where they are drawn now (eased toward it).
    let target: Point[] | null = null;
    let shown: Point[] | null = null;
    let lastDraw = 0;
    let canvasW = 0, canvasH = 0;

    const publish = (next: GuideChecks, seen: boolean) => {
      const key = [next.lighting, next.position, next.gaze].map((c) => `${c.state}:${c.hint ?? ''}`).join('|') + seen;
      if (key !== lastKey) { lastKey = key; setChecks(next); setFaceSeen(seen); }
    };

    const detect = () => {
      const vw = video.videoWidth, vh = video.videoHeight;
      const cw = stage.current?.clientWidth ?? 0, ch = stage.current?.clientHeight ?? 0;
      if (!cw || !ch) return;

      const result = loaded.landmarker.detectForVideo(video, performance.now());
      const face = result.faceLandmarks[0];
      if (!face) { target = null; shown = null; publish(NO_FACE_CHECKS, false); return; }

      // Video pixels -> stage pixels: object-cover scaling (the video is cropped to fill the stage), then mirrored like the preview.
      const scale = Math.max(cw / vw, ch / vh);
      const offX = (cw - vw * scale) / 2, offY = (ch - vh * scale) / 2;
      const pts: Point[] = face.map((p) => ({ x: cw - (offX + p.x * vw * scale), y: offY + p.y * vh * scale }));
      // These are display coordinates (already mirrored like the preview), so the overlay canvas needs no CSS flip of its own.
      target = pts;

      // Lighting is measured on the inner part of the face in the (unmirrored) video frame.
      const vb = boundsOf(face.map((p) => ({ x: p.x * vw, y: p.y * vh })));
      const sx = Math.max(0, vb.minX + vb.width * 0.2), sy = Math.max(0, vb.minY + vb.height * 0.2);
      const sw = Math.min(vw - sx, vb.width * 0.6), sh = Math.min(vh - sy, vb.height * 0.6);
      const lighting: GuideCheck = sctx && sw > 2 && sh > 2
        ? (sctx.drawImage(video, sx, sy, sw, sh, 0, 0, SAMPLE_SIZE, SAMPLE_SIZE), checkLighting(sctx.getImageData(0, 0, SAMPLE_SIZE, SAMPLE_SIZE).data))
        : { state: 'idle' };
      const next: GuideChecks = {
        lighting,
        position: checkPosition(pts, cw, ch),
        gaze: checkGaze(result.facialTransformationMatrixes[0]?.data),
      };
      publish(next, true);

    };

    // Redraws the overlay from the same frame loop as detection (no second loop, no extra inference).
    const drawFrame = (t: number) => {
      if (!canvas || !mctx) return;
      if (!meshOnRef.current || !target || document.hidden) { shown = null; return; }
      if (t - lastDraw < MESH_DRAW_INTERVAL_MS) return;
      const cw = canvas.clientWidth, ch = canvas.clientHeight;
      if (!cw || !ch) return;
      const dpr = Math.min(window.devicePixelRatio || 1, MESH_MAX_DPR);
      if (cw !== canvasW || ch !== canvasH) {
        canvasW = cw; canvasH = ch;
        canvas.width = Math.round(cw * dpr);
        canvas.height = Math.round(ch * dpr);
      }
      shown = smoothPoints(shown, target, shown ? emaAlpha(t - lastDraw, MESH_SMOOTH_TAU_MS) : 1);
      lastDraw = t;
      mctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      mctx.clearRect(0, 0, cw, ch);
      drawMesh(mctx, shown, loaded.mesh, loaded.features);
    };

    const tick = (t: number) => {
      raf = requestAnimationFrame(tick);
      if (t - last >= DETECT_INTERVAL_MS && video.readyState >= 2 && video.videoWidth) {
        last = t;
        try { detect(); } catch { cancelAnimationFrame(raf); setStatus('unavailable'); return; }
      }
      drawFrame(t);
    };
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      mctx?.setTransform(1, 0, 0, 1, 0, 0);
      mctx?.clearRect(0, 0, canvas?.width ?? 0, canvas?.height ?? 0);
    };
  }, [video, loaded]);

  const message = statusOf(checks);
  // Announced politely and only once it has been stable for a moment; the general hint is never read out.
  const spoken = useSettled(message.tone === 'neutral' ? '' : message.text, 1200);
  if (status === 'unavailable') return null;
  // The oval steps back a little while the mesh is showing, so the two do not compete.
  const ovalTone = ok
    ? (meshVisible ? 'border-green-500/60' : 'border-green-500')
    : faceSeen ? (meshVisible ? 'border-amber-400/60' : 'border-amber-400') : 'border-white';
  return (
    <>
      {/* Target oval, 70% of the stage height; the position check uses this same oval (see guideOval). Also gives the stage size. */}
      <div ref={stage} className="pointer-events-none absolute inset-0 flex items-center justify-center" aria-hidden>
        {/* Mesh overlay: its own canvas, never read when the photo is taken. Fades in over 200 ms (instant under reduced motion). */}
        <canvas
          ref={meshCanvas}
          className={`absolute inset-0 h-full w-full transition-opacity duration-200 ease-out motion-reduce:transition-none ${meshVisible ? 'opacity-100' : 'opacity-0'}`}
        />
        <div className={`aspect-[3/4] h-[70%] rounded-[50%] border-2 border-dashed motion-safe:transition-colors ${ovalTone}`} />
      </div>

      {status === 'ready' && (
        <button
          type="button" onClick={toggleMesh} aria-pressed={meshOn} aria-label={meshOn ? G.meshHide : G.meshShow}
          className="frosted absolute right-2 top-2 z-10 inline-flex min-h-11 min-w-11 items-center justify-center gap-1.5 rounded-full px-3 text-label-sm text-ink-600 transition-[color,transform] duration-150 ease-out hover:text-ink-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-600 motion-safe:active:scale-[0.97]"
        >
          <FaceMeshIcon size={18} className={`shrink-0 transition-opacity duration-150 ease-out ${meshOn ? 'opacity-100' : 'opacity-55'}`} />
          <span>{G.meshLabel}</span>
        </button>
      )}

      <div className="pointer-events-none absolute inset-x-2 bottom-2 z-10 flex justify-center">
        {status === 'loading' ? (
          <p role="status" className="frosted rounded-full px-3 py-1 text-label-sm text-ink-600">{G.loading}</p>
        ) : (
          <>
            <p aria-hidden className={`flex max-w-full items-center gap-1.5 rounded-full border px-3 py-1.5 text-center text-label-sm motion-safe:transition-colors ${TONE_CLASS[message.tone]}`}>
              {message.tone === 'ok' && <Check className="h-3.5 w-3.5 shrink-0" aria-hidden />}
              {message.tone === 'bad' && <Info className="h-3.5 w-3.5 shrink-0" aria-hidden />}
              <span>{message.text}</span>
            </p>
            <p role="status" aria-live="polite" aria-label={G.statusLabel} className="sr-only">{spoken}</p>
          </>
        )}
      </div>
    </>
  );
}
