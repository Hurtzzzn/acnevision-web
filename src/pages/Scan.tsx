import { useCallback, useEffect, useRef, useState, type DragEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import Webcam from 'react-webcam';
import { Camera, Check, ImageUp, Lock, ScanFace } from 'lucide-react';
import { ALLOWED_IMAGE_TYPES, COPY, MAX_UPLOAD_BYTES } from '@acnevision/shared';
import { api } from '../lib/runtime';
import { errMessage } from '../lib/errors';
import { useAuth } from '../store/auth';
import { useScan } from '../store/scan';
import { ErrorBox } from '../components/ui';

type Mode = 'camera' | 'upload';

const STEP_MS = 800;

/** Calm staged progress shown over the card while the photo is processed (no large spinner). */
function ProcessingState({ step }: { step: number }) {
  const steps = COPY.scan.progress;
  return (
    <div className="absolute inset-0 z-10 flex items-center justify-center rounded-card bg-white/90 p-6" role="status" aria-live="polite">
      <ol className="w-full max-w-xs space-y-3">
        {steps.map((label, i) => {
          const done = i < step;
          const active = i === step;
          return (
            <li key={label} className={`flex items-center gap-3 text-body-lg ${active ? 'font-semibold text-ink-900' : done ? 'text-ink-600' : 'text-ink-500'}`}>
              <span
                className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${done ? 'bg-primary-600 text-white' : active ? 'border-2 border-primary-600' : 'border border-border-strong'}`}
                aria-hidden
              >
                {done ? <Check className="h-3 w-3" /> : active ? <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-primary-600" /> : null}
              </span>
              {label}
            </li>
          );
        })}
      </ol>
    </div>
  );
}

export default function Scan() {
  const [mode, setMode] = useState<Mode>('camera');
  const [camError, setCamError] = useState(false);
  const [camReady, setCamReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [step, setStep] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [drag, setDrag] = useState(false);
  const cam = useRef<Webcam>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const user = useAuth((s) => s.user);
  const { setScan, setDetection } = useScan();
  const navigate = useNavigate();

  useEffect(() => {
    if (!busy) return;
    setStep(0);
    const id = setInterval(() => setStep((s) => Math.min(s + 1, COPY.scan.progress.length - 1)), STEP_MS);
    return () => clearInterval(id);
  }, [busy]);

  const submit = useCallback(async (file: File, method: Mode) => {
    setError(null);
    if (!(ALLOWED_IMAGE_TYPES as readonly string[]).includes(file.type)) {
      setError(COPY.scan.invalidType);
      return;
    }
    if (file.size > MAX_UPLOAD_BYTES) {
      setError(COPY.scan.tooLarge);
      return;
    }
    setBusy(true);
    try {
      if (user) {
        // Signed-in users keep the full analysis flow.
        const analysis = await api.analyze(file, { source: 'web', input_method: method });
        setScan(analysis, URL.createObjectURL(file));
        navigate('/result');
      } else {
        const detection = await api.detect(file, { source: 'web', input_method: method });
        setDetection(detection, URL.createObjectURL(file));
        navigate('/detect-result');
      }
    } catch (e) {
      setError(errMessage(e, COPY.scan.detectFailed));
      setBusy(false);
    }
  }, [user, navigate, setScan, setDetection]);

  async function capture() {
    try {
      const shot = cam.current?.getScreenshot();
      if (!shot) throw new Error('no screenshot');
      const blob = await (await fetch(shot)).blob();
      submit(new File([blob], 'capture.jpg', { type: 'image/jpeg' }), 'camera');
    } catch {
      setError(COPY.scan.captureFailed);
    }
  }

  function onDrop(e: DragEvent) {
    e.preventDefault(); setDrag(false);
    const f = e.dataTransfer.files[0];
    if (f) submit(f, 'upload');
  }

  const showUpload = mode === 'upload' || camError;

  return (
    <div className="space-y-6">
      <header className="max-w-2xl">
        <span className="badge gap-1.5 bg-primary-50 text-primary-700"><ScanFace className="h-3.5 w-3.5" aria-hidden /> {COPY.scan.eyebrow}</span>
        <h1 className="mt-3">{COPY.scan.title}</h1>
        <p className="mt-1">{COPY.scan.subtitle}</p>
      </header>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="card relative lg:col-span-2">
          <div className="mb-4 flex gap-2" role="tablist" aria-label={COPY.scan.tabsLabel}>
            <button role="tab" aria-selected={!showUpload} className={!showUpload ? 'btn-primary' : 'btn-outline'} onClick={() => setMode('camera')} disabled={camError || busy}>
              <Camera className="h-4 w-4" aria-hidden /> {COPY.scan.tabCamera}
            </button>
            <button role="tab" aria-selected={showUpload} className={showUpload ? 'btn-primary' : 'btn-outline'} onClick={() => setMode('upload')} disabled={busy}>
              <ImageUp className="h-4 w-4" aria-hidden /> {COPY.scan.tabUpload}
            </button>
          </div>

          {camError && (
            <div className="mb-4"><ErrorBox message={COPY.scan.cameraDenied} /></div>
          )}

          {!showUpload ? (
            <div className="relative overflow-hidden rounded-card bg-tint">
              <Webcam
                ref={cam} audio={false} mirrored screenshotFormat="image/jpeg" screenshotQuality={0.92}
                videoConstraints={{ facingMode: 'user', width: 1280, height: 960 }}
                onUserMedia={() => setCamReady(true)}
                onUserMediaError={() => setCamError(true)}
                className="block aspect-[4/3] w-full object-cover"
              />
              {!camReady && (
                <p className="absolute inset-0 flex items-center justify-center text-body-md text-ink-500" role="status">{COPY.scan.cameraLoading}</p>
              )}
              {/* Face guide: dashed oval, 70% of frame height */}
              <div className="pointer-events-none absolute inset-0 flex items-center justify-center" aria-hidden>
                <div className="aspect-[3/4] h-[70%] rounded-[50%] border-2 border-dashed border-white shadow-[0_0_0_1px_rgba(37,99,235,0.5)]" />
              </div>
              <span className="frosted absolute left-1/2 top-3 -translate-x-1/2 whitespace-nowrap rounded-full px-3 py-1 text-label-sm text-ink-900">
                {COPY.scan.guideHint}
              </span>
            </div>
          ) : (
            <div
              onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
              onDragLeave={() => setDrag(false)}
              onDrop={onDrop}
              className={`flex aspect-[4/3] flex-col items-center justify-center gap-3 rounded-card border-2 border-dashed p-4 text-center ${drag ? 'border-primary-600 bg-primary-50' : 'border-border-strong bg-tint'}`}
            >
              <ImageUp className="h-10 w-10 text-primary-600" aria-hidden />
              <p className="text-sm">{COPY.scan.uploadTitle}</p>
              <button className="btn-primary" onClick={() => fileInput.current?.click()} disabled={busy}>{COPY.scan.uploadPick}</button>
              <p className="text-body-sm text-ink-500">{COPY.scan.uploadHint}</p>
              <input ref={fileInput} type="file" accept="image/jpeg,image/png,image/webp" hidden
                onChange={(e) => { const f = e.target.files?.[0]; if (f) submit(f, 'upload'); e.target.value = ''; }} />
            </div>
          )}

          {!showUpload && (
            <button className="btn-primary mt-4 w-full py-3" onClick={capture} disabled={!camReady || busy}>
              <Camera className="h-4 w-4" aria-hidden /> {COPY.scan.capture}
            </button>
          )}
          {error && <div className="mt-4"><ErrorBox message={error} /></div>}

          {!user && (
            <p className="mt-4 flex items-center gap-2 text-body-sm text-ink-500">
              <Lock className="h-3.5 w-3.5 shrink-0" aria-hidden /> {COPY.scan.privacyNote}
            </p>
          )}

          {busy && <ProcessingState step={step} />}
        </div>

        <aside className="card h-fit bg-primary-50">
          <h3 className="mb-3">{COPY.scan.tipsTitle}</h3>
          <ul className="space-y-2 text-sm">
            {COPY.photoTips.map((t) => (
              <li key={t} className="flex gap-2"><span className="text-success" aria-hidden>✓</span>{t}</li>
            ))}
          </ul>
        </aside>
      </div>
    </div>
  );
}
