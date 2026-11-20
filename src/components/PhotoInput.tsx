import { useEffect, useId, useRef, useState, type DragEvent, type KeyboardEvent, type ReactNode } from 'react';
import Webcam from 'react-webcam';
import { Camera, ImageUp, Info, RefreshCw, ScanFace } from 'lucide-react';
import { COPY } from '@acnevision/shared';
import { validatePhoto } from '../lib/photo';
import { frameToBlob, visibleCropRect } from '../lib/capture';
import { captureControl, INITIAL_GUIDE_STATE, isBlockingAdvice, OVAL_HEIGHT_PERCENT, type GuideState } from '../lib/faceGuide';
import { useDelayedTrue } from '../lib/useDelayedTrue';
import { FaceGuide } from './FaceGuide';

/** A problem (no face, too far, off to the side) must last this long before the capture button is switched off, so one bad frame does not flicker it. */
const BLOCK_DELAY_MS = 300;

export type PhotoMethod = 'camera' | 'upload';

/*
 * Fixed-height skeleton shared by every photo state (camera, upload, preview, processing), so switching state never moves
 * the content below: a top row, a stage (3:4 on phones, 4:3 from md), and an action row. Messages and errors overlay the stage instead of adding rows.
 */
export function FrameTop({ children }: { children?: ReactNode }) {
  return <div className="flex h-11 items-center justify-between gap-2">{children}</div>;
}

export function FrameStage({ children }: { children?: ReactNode }) {
  return <div className="relative mt-3 aspect-[3/4] w-full md:aspect-[4/3] overflow-hidden rounded-card bg-tint">{children}</div>;
}

export function FrameAction({ children }: { children?: ReactNode }) {
  return <div className="mt-4 flex h-11 items-center justify-center">{children}</div>;
}

/** Message laid over the bottom of the stage; read out by screen readers as an alert. */
export function StageAlert({ children }: { children: ReactNode }) {
  return (
    <div role="alert" className="absolute inset-x-3 bottom-3 z-20 flex items-center justify-between gap-3 rounded-btn border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
      {children}
    </div>
  );
}

interface PhotoInputProps {
  /** Called only with a file that passed validation (and, with `review`, that the user confirmed). */
  onPick: (file: File, method: PhotoMethod) => void;
  disabled?: boolean;
  /** Tab shown first and selected initially. */
  defaultMode?: PhotoMethod;
  /** Show the picked photo with "Ulangi" and "Pakai foto ini"; `onPick` is called only after the user confirms. */
  review?: boolean;
  /** Explain what the camera is used for, and ask for camera access only after the user presses "Buka kamera". */
  cameraGate?: boolean;
  /** Reports the tab that is showing, so the page around the input can adapt. */
  onModeChange?: (mode: PhotoMethod) => void;
}

interface Picked { file: File; method: PhotoMethod; url: string }

/** Shared camera + upload photo source (guest /scan and logged-in /analyze). Picking a photo never sends it anywhere. */
export function PhotoInput({
  onPick, disabled = false, defaultMode = 'camera',
  review = false, cameraGate = false, onModeChange,
}: PhotoInputProps) {
  const [mode, setMode] = useState<PhotoMethod>(defaultMode);
  const [camError, setCamError] = useState(false);
  const [camReady, setCamReady] = useState(false);
  // Bumped by "Coba lagi" so the camera asks for access again without reloading the page.
  const [camKey, setCamKey] = useState(0);
  // Phones are held upright, so ask for a portrait picture there. Both sizes are only "ideal": the browser falls back to the closest the camera has.
  const [portrait] = useState(() => typeof window.matchMedia === 'function' && window.matchMedia('(max-width: 767px)').matches);
  const [error, setError] = useState<string | null>(null);
  const [drag, setDrag] = useState(false);
  const [guide, setGuide] = useState<GuideState>(INITIAL_GUIDE_STATE);
  const [started, setStarted] = useState(!cameraGate);
  const [picked, setPicked] = useState<Picked | null>(null);
  const cam = useRef<Webcam>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const uid = useId();
  const panelId = `${uid}-panel`;
  const noteId = `${uid}-capture-note`;

  const active: PhotoMethod = mode;
  // The capture button follows the face guide (see captureControl). Switching it off waits a moment; switching it back on does not.
  const blockHeld = useDelayedTrue(isBlockingAdvice(guide.advice), BLOCK_DELAY_MS);
  const control = captureControl(guide.advice, { camReady, disabled, blockHeld });
  const order: PhotoMethod[] = defaultMode === 'upload' ? ['upload', 'camera'] : ['camera', 'upload'];

  useEffect(() => { onModeChange?.(active); }, [active, onModeChange]);
  // The preview URL lives only as long as the preview does.
  useEffect(() => () => { if (picked) URL.revokeObjectURL(picked.url); }, [picked]);

  function pick(file: File, method: PhotoMethod) {
    const problem = validatePhoto(file);
    if (problem) { setError(COPY.scan[problem]); return; }
    setError(null);
    if (!review) { onPick(file, method); return; }
    setCamReady(false); // the camera is released while the preview is shown, and reopened by "Ulangi"
    setPicked({ file, method, url: URL.createObjectURL(file) });
  }

  // The face guide blocks the button while there is no face, or it is too far or off to the side; with the guide still loading or
  // not working, nothing blocks it. The file comes straight from the video frame (no overlay), trimmed to what the stage shows (what
  // you see is what you send), at the camera's own resolution. The video element fills the stage, so its box is the stage. Not
  // cropped to the oval: close-ups are what the detector wants.
  async function capture() {
    // aria-disabled keeps the button focusable (so it can explain itself) but does not stop clicks or Enter, so stop them here.
    if (!control.canCapture) return;
    try {
      const video = cam.current?.video;
      if (!video) throw new Error('no video');
      const crop = visibleCropRect(video, { width: video.clientWidth, height: video.clientHeight });
      const blob = await frameToBlob(video, { mirrored: true, crop });
      pick(new File([blob], 'capture.jpg', { type: 'image/jpeg' }), 'camera');
    } catch {
      setError(COPY.scan.captureFailed);
    }
  }

  function retryCamera() {
    setError(null);
    setCamError(false);
    setCamReady(false);
    setCamKey((k) => k + 1);
  }

  function onDrop(e: DragEvent) {
    e.preventDefault(); setDrag(false);
    if (disabled) return;
    const f = e.dataTransfer.files[0];
    if (f) pick(f, 'upload');
  }

  function onTabKey(e: KeyboardEvent) {
    if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
    e.preventDefault();
    setMode(active === 'camera' ? 'upload' : 'camera');
    document.getElementById(`${uid}-tab-${active === 'camera' ? 'upload' : 'camera'}`)?.focus();
  }

  if (picked) {
    return (
      <div>
        <FrameTop>
          <p className="text-body-md text-ink-600">{COPY.scan.review.question}</p>
        </FrameTop>
        <FrameStage>
          <img src={picked.url} alt={COPY.scan.review.photoAlt} className="absolute inset-0 h-full w-full object-contain" />
        </FrameStage>
        <FrameAction>
          <div className="grid h-full w-full grid-cols-2 gap-3">
            <button className="btn-outline h-full" onClick={() => setPicked(null)} disabled={disabled}>{COPY.scan.review.retake}</button>
            <button className="btn-primary h-full" onClick={() => onPick(picked.file, picked.method)} disabled={disabled}>{COPY.scan.review.use}</button>
          </div>
        </FrameAction>
      </div>
    );
  }

  const gated = active === 'camera' && !started;

  return (
    <div>
      <FrameTop>
        <div className="relative inline-grid h-11 grid-cols-2 gap-1 rounded-btn border border-border bg-tint p-1" role="tablist" aria-label={COPY.scan.tabsLabel} onKeyDown={onTabKey}>
          {/* The active pill slides between the two tabs (transform only); it stays put under reduced motion */}
          <span
            aria-hidden
            className="pointer-events-none absolute inset-y-1 left-1 w-[calc((100%-0.75rem)/2)] rounded-control bg-white shadow-card transition-transform duration-200 ease-[cubic-bezier(0.23,1,0.32,1)] motion-reduce:transition-none"
            style={{ transform: order.indexOf(active) === 0 ? 'translateX(0)' : 'translateX(calc(100% + 0.25rem))' }}
          />
          {order.map((m) => {
            const selected = active === m;
            const Icon = m === 'camera' ? Camera : ImageUp;
            return (
              <button
                key={m} id={`${uid}-tab-${m}`} role="tab" aria-selected={selected} aria-controls={panelId} tabIndex={selected ? 0 : -1}
                className={`relative z-10 inline-flex h-full items-center justify-center gap-2 rounded-control px-3.5 text-sm font-semibold transition-[color,transform] duration-200 ease-out disabled:cursor-not-allowed disabled:opacity-50 motion-safe:active:scale-[0.97] ${selected ? 'text-ink-900' : 'text-ink-600 hover:text-ink-900'}`}
                onClick={() => { setError(null); setMode(m); }}
                disabled={disabled}
              >
                <Icon className="h-4 w-4" aria-hidden /> {m === 'camera' ? COPY.scan.tabCamera : COPY.scan.tabUpload}
              </button>
            );
          })}
        </div>
      </FrameTop>

      <div id={panelId} role="tabpanel" aria-labelledby={`${uid}-tab-${active}`}>
        <FrameStage>
          {gated ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-5 text-center">
              <ScanFace className="h-9 w-9 text-primary-600" aria-hidden />
              <h2 className="text-headline-sm">{COPY.scan.cameraStart.title}</h2>
              <p className="max-w-sm text-body-md text-ink-600">{COPY.scan.cameraStart.body}</p>
            </div>
          ) : active === 'camera' && camError ? (
            <p role="alert" className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-5 text-center text-body-md text-ink-600">
              <Info className="h-9 w-9 text-primary-600" aria-hidden />
              <span className="max-w-sm">{COPY.scan.cameraDenied}</span>
            </p>
          ) : active === 'camera' ? (
            <>
              <Webcam
                key={camKey} ref={cam} audio={false} mirrored screenshotFormat="image/jpeg" screenshotQuality={0.95}
                videoConstraints={{ facingMode: 'user', width: { ideal: portrait ? 1080 : 1920 }, height: { ideal: portrait ? 1920 : 1080 } }}
                onUserMedia={() => setCamReady(true)}
                onUserMediaError={() => setCamError(true)}
                className="absolute inset-0 block h-full w-full object-cover"
              />
              {!camReady && (
                <p className="absolute inset-0 flex items-center justify-center text-body-md text-ink-600" role="status">{COPY.scan.cameraLoading}</p>
              )}
              {/* Plain oval (see OVAL_HEIGHT_PERCENT) only when the guide cannot run; otherwise FaceGuide draws the one oval, in status colors */}
              {guide.status === 'unavailable' && (
                <div className="pointer-events-none absolute inset-0 flex items-center justify-center" aria-hidden>
                  <div className="aspect-[3/4] rounded-[50%] border-2 border-dashed border-white shadow-[0_0_0_1px_rgba(37,99,235,0.5)]" style={{ height: `${OVAL_HEIGHT_PERCENT}%` }} />
                </div>
              )}
              {/* Mounted only while the camera tab is open, so the model loads lazily and is released with the camera */}
              <FaceGuide video={camReady ? cam.current?.video ?? null : null} onState={setGuide} />
            </>
          ) : (
            <div
              onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
              onDragLeave={() => setDrag(false)}
              onDrop={onDrop}
              className={`absolute inset-0 flex flex-col items-center justify-center gap-3 rounded-card border-2 border-dashed p-4 text-center ${drag ? 'border-primary-600 bg-primary-50' : 'border-border-strong'}`}
            >
              <ImageUp className="h-10 w-10 text-primary-600" aria-hidden />
              <p className="text-sm">{COPY.scan.uploadTitle}</p>
              <button className="btn-primary min-h-11" onClick={() => fileInput.current?.click()} disabled={disabled}>{COPY.scan.uploadPick}</button>
              <input
                ref={fileInput} type="file" accept="image/jpeg,image/png,image/webp" hidden
                onChange={(e) => { const f = e.target.files?.[0]; if (f) pick(f, 'upload'); e.target.value = ''; }}
              />
            </div>
          )}
          {error && <StageAlert>{error}</StageAlert>}
        </FrameStage>

        <FrameAction>
          {gated ? (
            <button className="btn-primary h-full w-full" onClick={() => setStarted(true)} disabled={disabled}>
              <Camera className="h-4 w-4" aria-hidden /> {COPY.scan.cameraStart.open}
            </button>
          ) : active === 'camera' && camError ? (
            <button className="btn-primary h-full w-full" onClick={retryCamera} disabled={disabled}>
              <RefreshCw className="h-4 w-4" aria-hidden /> {COPY.scan.retry}
            </button>
          ) : active === 'camera' ? (
            <button
              className={`btn-primary h-full w-full ${control.blocked ? 'cursor-not-allowed opacity-50 hover:bg-primary-600 motion-safe:active:scale-100' : ''}`}
              onClick={capture}
              disabled={control.disabled}
              aria-disabled={control.blocked || undefined}
              aria-describedby={noteId}
            >
              <Camera className="h-4 w-4" aria-hidden /> {COPY.scan.capture}
            </button>
          ) : (
            <p className="text-body-sm text-ink-500">{COPY.scan.uploadHint}</p>
          )}
        </FrameAction>
        {/* Not shown: only the status pill at the bottom of the camera is. This is the same sentence as that pill (the guide reports it
            once, in `guide.message`), kept as the capture button's description and as a polite status, so screen readers hear why the
            button is unavailable, or the warning, without the sentence showing twice. */}
        <p id={noteId} role="status" className="sr-only">{guide.message}</p>
      </div>
    </div>
  );
}
