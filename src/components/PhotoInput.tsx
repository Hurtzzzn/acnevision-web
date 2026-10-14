import { useEffect, useId, useRef, useState, type DragEvent, type KeyboardEvent, type ReactNode } from 'react';
import Webcam from 'react-webcam';
import { Camera, ImageUp, Info, ScanFace } from 'lucide-react';
import { COPY } from '@acnevision/shared';
import { validatePhoto } from '../lib/photo';
import { frameToBlob } from '../lib/capture';
import { FaceGuide, type GuideState } from './FaceGuide';

export type PhotoMethod = 'camera' | 'upload';

/*
 * Fixed-height skeleton shared by every photo state (camera, upload, preview, processing), so switching state never moves
 * the content below: a top row, a 4:3 stage, and an action row. Messages and errors overlay the stage instead of adding rows.
 */
export function FrameTop({ children }: { children?: ReactNode }) {
  return <div className="flex h-11 items-center justify-between gap-2">{children}</div>;
}

export function FrameStage({ children }: { children?: ReactNode }) {
  return <div className="relative mt-3 aspect-[4/3] w-full overflow-hidden rounded-card bg-tint">{children}</div>;
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
  labels?: { camera: string; upload: string };
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
  onPick, disabled = false, defaultMode = 'camera', labels = { camera: COPY.scan.tabCamera, upload: COPY.scan.tabUpload },
  review = false, cameraGate = false, onModeChange,
}: PhotoInputProps) {
  const [mode, setMode] = useState<PhotoMethod>(defaultMode);
  const [camError, setCamError] = useState(false);
  const [camReady, setCamReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [drag, setDrag] = useState(false);
  const [guide, setGuide] = useState<GuideState>({ status: 'loading', ok: false });
  const [started, setStarted] = useState(!cameraGate);
  const [picked, setPicked] = useState<Picked | null>(null);
  const cam = useRef<Webcam>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const uid = useId();
  const panelId = `${uid}-panel`;

  const active: PhotoMethod = camError ? 'upload' : mode;
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

  // The button is never blocked by the face guide: it only advises. The file comes straight from the video frame (no overlay).
  async function capture() {
    try {
      const video = cam.current?.video;
      if (!video) throw new Error('no video');
      const blob = await frameToBlob(video, { mirrored: true });
      pick(new File([blob], 'capture.jpg', { type: 'image/jpeg' }), 'camera');
    } catch {
      setError(COPY.scan.captureFailed);
    }
  }

  function onDrop(e: DragEvent) {
    e.preventDefault(); setDrag(false);
    if (disabled) return;
    const f = e.dataTransfer.files[0];
    if (f) pick(f, 'upload');
  }

  function onTabKey(e: KeyboardEvent) {
    if (camError || (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight')) return;
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
        <div className="inline-flex h-11 gap-1 rounded-btn border border-border bg-tint p-1" role="tablist" aria-label={COPY.scan.tabsLabel} onKeyDown={onTabKey}>
          {order.map((m) => {
            const selected = active === m;
            const Icon = m === 'camera' ? Camera : ImageUp;
            return (
              <button
                key={m} id={`${uid}-tab-${m}`} role="tab" aria-selected={selected} aria-controls={panelId} tabIndex={selected ? 0 : -1}
                className={`inline-flex h-full items-center gap-2 rounded-control px-3.5 text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${selected ? 'bg-white text-ink-900 shadow-card' : 'text-ink-600 hover:text-ink-900'}`}
                onClick={() => { setError(null); setMode(m); }}
                disabled={disabled || (m === 'camera' && camError)}
              >
                <Icon className="h-4 w-4" aria-hidden /> {labels[m]}
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
              <button className="btn-primary" onClick={() => setStarted(true)} disabled={disabled}>
                <Camera className="h-4 w-4" aria-hidden /> {COPY.scan.cameraStart.open}
              </button>
            </div>
          ) : active === 'camera' ? (
            <>
              <Webcam
                ref={cam} audio={false} mirrored screenshotFormat="image/jpeg" screenshotQuality={0.92}
                videoConstraints={{ facingMode: 'user', width: 1280, height: 960 }}
                onUserMedia={() => setCamReady(true)}
                onUserMediaError={() => setCamError(true)}
                className="absolute inset-0 block h-full w-full object-cover"
              />
              {!camReady && (
                <p className="absolute inset-0 flex items-center justify-center text-body-md text-ink-500" role="status">{COPY.scan.cameraLoading}</p>
              )}
              {/* Plain oval (70% of frame height) only when the guide cannot run; otherwise FaceGuide draws the one oval, in status colors */}
              {guide.status === 'unavailable' && (
                <div className="pointer-events-none absolute inset-0 flex items-center justify-center" aria-hidden>
                  <div className="aspect-[3/4] h-[70%] rounded-[50%] border-2 border-dashed border-white shadow-[0_0_0_1px_rgba(37,99,235,0.5)]" />
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
              {camError ? (
                <p role="alert" className="flex max-w-md items-start gap-2 text-left text-body-sm text-ink-600">
                  <Info className="mt-0.5 h-4 w-4 shrink-0 text-primary-600" aria-hidden />
                  {COPY.scan.cameraDenied}
                </p>
              ) : (
                <ImageUp className="h-10 w-10 text-primary-600" aria-hidden />
              )}
              <p className="text-sm">{COPY.scan.uploadTitle}</p>
              <button className="btn-primary" onClick={() => fileInput.current?.click()} disabled={disabled}>{COPY.scan.uploadPick}</button>
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
            <button className="text-body-sm font-medium text-primary-700 underline underline-offset-4" onClick={() => { setError(null); setMode('upload'); }} disabled={disabled}>
              {COPY.scan.cameraStart.orUpload}
            </button>
          ) : active === 'camera' ? (
            <button className="btn-primary h-full w-full" onClick={capture} disabled={!camReady || disabled}>
              <Camera className="h-4 w-4" aria-hidden /> {COPY.scan.capture}
            </button>
          ) : (
            <p className="text-body-sm text-ink-500">{COPY.scan.uploadHint}</p>
          )}
        </FrameAction>
        {/* Fixed height so showing or hiding the note never moves the content below */}
        <p className={`mt-2 h-4 text-center text-caption text-ink-500 transition-opacity ${active === 'camera' && !gated && guide.status === 'ready' && !guide.ok ? 'opacity-100' : 'opacity-0'}`}>
          {COPY.scan.guide.softNote}
        </p>
      </div>
    </div>
  );
}
