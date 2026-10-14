import { useEffect, useRef, useState } from 'react';
import { Check, Info } from 'lucide-react';
import { COPY } from '@acnevision/shared';
import {
  allOk, boundsOf, checkGaze, checkLighting, checkPosition, IDLE_CHECKS, NO_FACE_CHECKS,
  type Check as GuideCheck, type GuideChecks, type Point,
} from '../lib/faceGuide';
import { loadFaceLandmarker, type LoadedLandmarker } from '../lib/faceLandmarker';

const G = COPY.scan.guide;
/** Detection runs about 12 times a second, not every frame. */
const DETECT_INTERVAL_MS = 1000 / 12;
const SAMPLE_SIZE = 24;
/** Mesh opacity (before the fade factor) and line width: kept thin and faint so it never reads as a heavy wireframe. */
const MESH_ALPHA = 0.18;
const MESH_LINE_WIDTH = 0.5;
/** How much of the mesh fade is taken per detection step (about 0.4 s to vanish). */
const FADE_STEP = 0.2;

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
 * that names the first thing to adjust, and an optional thin landmark mesh that is hidden unless the user turns it on. Runs MediaPipe Face Landmarker in the browser (no frame leaves the device). If the model cannot load or run, it
 * reports `unavailable` and renders nothing, so the parent shows its plain oval and the camera keeps working. This component
 * only draws on its own overlay canvas; the photo is taken from the video element (see `frameToBlob`), never from here.
 */
export function FaceGuide({ video, onState }: { video: HTMLVideoElement | null; onState: (s: GuideState) => void }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const [loaded, setLoaded] = useState<LoadedLandmarker | null>(null);
  const [status, setStatus] = useState<GuideStatus>('loading');
  const [checks, setChecks] = useState<GuideChecks>(IDLE_CHECKS);
  const [faceSeen, setFaceSeen] = useState(false);
  const [showMesh, setShowMesh] = useState(false);
  const showMeshRef = useRef(showMesh);
  showMeshRef.current = showMesh;
  const onStateRef = useRef(onState);
  onStateRef.current = onState;

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
    const cv = canvas.current;
    const ctx = cv?.getContext('2d');
    if (!cv || !ctx || !video || !loaded) return;
    const scratch = document.createElement('canvas');
    scratch.width = SAMPLE_SIZE;
    scratch.height = SAMPLE_SIZE;
    const sctx = scratch.getContext('2d', { willReadFrequently: true });
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let raf = 0;
    let last = 0;
    let lastKey = '';
    let meshFade = 1;

    const publish = (next: GuideChecks, seen: boolean) => {
      const key = [next.lighting, next.position, next.gaze].map((c) => `${c.state}:${c.hint ?? ''}`).join('|') + seen;
      if (key !== lastKey) { lastKey = key; setChecks(next); setFaceSeen(seen); }
    };

    const detect = () => {
      const vw = video.videoWidth, vh = video.videoHeight;
      const dpr = window.devicePixelRatio || 1;
      const cw = cv.clientWidth, ch = cv.clientHeight;
      if (cv.width !== Math.round(cw * dpr) || cv.height !== Math.round(ch * dpr)) {
        cv.width = Math.round(cw * dpr);
        cv.height = Math.round(ch * dpr);
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, cw, ch);

      const result = loaded.landmarker.detectForVideo(video, performance.now());
      const face = result.faceLandmarks[0];
      if (!face) { meshFade = 1; publish(NO_FACE_CHECKS, false); return; }

      // Video pixels -> stage pixels: object-cover scaling (the video is cropped to fill the stage), then mirrored like the preview.
      const scale = Math.max(cw / vw, ch / vh);
      const offX = (cw - vw * scale) / 2, offY = (ch - vh * scale) / 2;
      const pts: Point[] = face.map((p) => ({ x: cw - (offX + p.x * vw * scale), y: offY + p.y * vh * scale }));

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

      // The mesh is off by default and only fades in or out with the toggle.
      const target = showMeshRef.current ? 1 : 0;
      meshFade = reduceMotion ? target : Math.max(0, Math.min(1, meshFade + Math.sign(target - meshFade) * FADE_STEP));
      if (meshFade > 0) {
        ctx.strokeStyle = `rgba(255,255,255,${MESH_ALPHA * meshFade})`;
        ctx.lineWidth = MESH_LINE_WIDTH;
        ctx.beginPath();
        for (const { start, end } of loaded.mesh) {
          ctx.moveTo(pts[start].x, pts[start].y);
          ctx.lineTo(pts[end].x, pts[end].y);
        }
        ctx.stroke();
      }
    };

    const tick = (t: number) => {
      raf = requestAnimationFrame(tick);
      if (t - last < DETECT_INTERVAL_MS || video.readyState < 2 || !video.videoWidth) return;
      last = t;
      try { detect(); } catch { cancelAnimationFrame(raf); setStatus('unavailable'); }
    };
    raf = requestAnimationFrame(tick);
    return () => { cancelAnimationFrame(raf); ctx.clearRect(0, 0, cv.width, cv.height); };
  }, [video, loaded]);

  const message = statusOf(checks);
  // Announced politely and only once it has been stable for a moment; the general hint is never read out.
  const spoken = useSettled(message.tone === 'neutral' ? '' : message.text, 1200);
  if (status === 'unavailable') return null;
  const ovalTone = ok ? 'border-green-500' : faceSeen ? 'border-amber-400' : 'border-white';
  return (
    <>
      <canvas ref={canvas} aria-hidden className="pointer-events-none absolute inset-0 h-full w-full" />
      {/* Target oval, 70% of the stage height; the position check uses this same oval (see guideOval) */}
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center" aria-hidden>
        <div className={`aspect-[3/4] h-[70%] rounded-[50%] border-2 border-dashed motion-safe:transition-colors ${ovalTone}`} />
      </div>

      {status === 'ready' && (
        <button
          type="button"
          aria-pressed={showMesh}
          onClick={() => setShowMesh((v) => !v)}
          className={`frosted absolute right-2 top-2 z-10 rounded-full px-3 py-1.5 text-label-sm ${showMesh ? 'text-primary-700' : 'text-ink-600'}`}
        >
          {G.showMesh}
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
