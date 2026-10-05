import { useId, useRef, useState, type DragEvent, type KeyboardEvent } from 'react';
import Webcam from 'react-webcam';
import { Camera, ImageUp } from 'lucide-react';
import { COPY } from '@acnevision/shared';
import { validatePhoto } from '../lib/photo';
import { ErrorBox } from './ui';

export type PhotoMethod = 'camera' | 'upload';

interface PhotoInputProps {
  /** Called only with a file that passed validation. */
  onPick: (file: File, method: PhotoMethod) => void;
  disabled?: boolean;
  /** Tab shown first and selected initially. */
  defaultMode?: PhotoMethod;
  labels?: { camera: string; upload: string };
}

/** Shared camera + upload photo source (guest /scan and logged-in /analyze). Picking a photo never sends it anywhere. */
export function PhotoInput({ onPick, disabled = false, defaultMode = 'camera', labels = { camera: COPY.scan.tabCamera, upload: COPY.scan.tabUpload } }: PhotoInputProps) {
  const [mode, setMode] = useState<PhotoMethod>(defaultMode);
  const [camError, setCamError] = useState(false);
  const [camReady, setCamReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [drag, setDrag] = useState(false);
  const cam = useRef<Webcam>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const uid = useId();
  const panelId = `${uid}-panel`;

  const active: PhotoMethod = camError ? 'upload' : mode;
  const order: PhotoMethod[] = defaultMode === 'upload' ? ['upload', 'camera'] : ['camera', 'upload'];

  function pick(file: File, method: PhotoMethod) {
    const problem = validatePhoto(file);
    if (problem) { setError(COPY.scan[problem]); return; }
    setError(null);
    onPick(file, method);
  }

  async function capture() {
    try {
      const shot = cam.current?.getScreenshot();
      if (!shot) throw new Error('no screenshot');
      const blob = await (await fetch(shot)).blob();
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

  return (
    <div>
      <div className="mb-4 flex gap-2" role="tablist" aria-label={COPY.scan.tabsLabel} onKeyDown={onTabKey}>
        {order.map((m) => {
          const selected = active === m;
          const Icon = m === 'camera' ? Camera : ImageUp;
          return (
            <button
              key={m} id={`${uid}-tab-${m}`} role="tab" aria-selected={selected} aria-controls={panelId} tabIndex={selected ? 0 : -1}
              className={selected ? 'btn-primary' : 'btn-outline'}
              onClick={() => setMode(m)}
              disabled={disabled || (m === 'camera' && camError)}
            >
              <Icon className="h-4 w-4" aria-hidden /> {labels[m]}
            </button>
          );
        })}
      </div>

      {camError && <div className="mb-4"><ErrorBox message={COPY.scan.cameraDenied} /></div>}

      <div id={panelId} role="tabpanel" aria-labelledby={`${uid}-tab-${active}`}>
        {active === 'camera' ? (
          <>
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
            <button className="btn-primary mt-4 w-full py-3" onClick={capture} disabled={!camReady || disabled}>
              <Camera className="h-4 w-4" aria-hidden /> {COPY.scan.capture}
            </button>
          </>
        ) : (
          <div
            onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
            onDragLeave={() => setDrag(false)}
            onDrop={onDrop}
            className={`flex aspect-[4/3] flex-col items-center justify-center gap-3 rounded-card border-2 border-dashed p-4 text-center ${drag ? 'border-primary-600 bg-primary-50' : 'border-border-strong bg-tint'}`}
          >
            <ImageUp className="h-10 w-10 text-primary-600" aria-hidden />
            <p className="text-sm">{COPY.scan.uploadTitle}</p>
            <button className="btn-primary" onClick={() => fileInput.current?.click()} disabled={disabled}>{COPY.scan.uploadPick}</button>
            <p className="text-body-sm text-ink-500">{COPY.scan.uploadHint}</p>
            <input
              ref={fileInput} type="file" accept="image/jpeg,image/png,image/webp" hidden
              onChange={(e) => { const f = e.target.files?.[0]; if (f) pick(f, 'upload'); e.target.value = ''; }}
            />
          </div>
        )}
      </div>

      {error && <div className="mt-4"><ErrorBox message={error} /></div>}
    </div>
  );
}
