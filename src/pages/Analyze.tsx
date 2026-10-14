import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Check, Crosshair, Layers, Lightbulb, MessageSquareText, RefreshCw, ScanFace, Sparkles, Sun, Tags, UserRound, Wand2 } from 'lucide-react';
import { COPY } from '@acnevision/shared';
import { api } from '../lib/runtime';
import { errMessage } from '../lib/errors';
import { useScan } from '../store/scan';
import { Disclaimer } from '../components/ui';
import { FrameAction, FrameStage, FrameTop, PhotoInput, StageAlert, type PhotoMethod } from '../components/PhotoInput';

const C = COPY.analyze;
const STEP_MS = 1500;
const BENEFIT_ICONS = [Crosshair, Tags, Layers, MessageSquareText];
const TIP_ICONS = [Sun, UserRound, Wand2];

/** Steps taking turns over the bottom of the photo. Active state is shown by color and marker only (no weight change), so text never reflows. */
function Steps({ step }: { step: number }) {
  return (
    <ol className="absolute inset-x-3 bottom-3 z-10 space-y-2 rounded-btn bg-white/90 p-3">
      {C.progress.map((label, i) => {
        const done = i < step;
        const active = i === step;
        return (
          <li key={label} className={`flex items-center gap-3 text-body-md ${active ? 'text-ink-900' : done ? 'text-ink-600' : 'text-ink-500'}`} aria-current={active ? 'step' : undefined}>
            <span
              className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${done ? 'bg-primary-600 text-white' : active ? 'border-2 border-primary-600' : 'border border-border-strong'}`}
              aria-hidden
            >
              {done ? <Check className="h-3 w-3" /> : active ? <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-primary-600" /> : null}
            </span>
            <span className="min-w-0 flex-1">{label}</span>
          </li>
        );
      })}
    </ol>
  );
}

export default function Analyze() {
  const [photo, setPhoto] = useState<{ file: File; method: PhotoMethod } | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [step, setStep] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const runId = useRef(0);
  const navigate = useNavigate();
  const setScan = useScan((s) => s.setScan);

  useEffect(() => {
    if (!photo) { setPreviewUrl(null); return; }
    const url = URL.createObjectURL(photo.file);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [photo]);

  useEffect(() => {
    if (!busy) return;
    setStep(0);
    const id = setInterval(() => setStep((s) => Math.min(s + 1, C.progress.length - 1)), STEP_MS);
    return () => clearInterval(id);
  }, [busy]);

  // Invalidate any in-flight run when the page unmounts.
  useEffect(() => () => { runId.current += 1; }, []);

  async function start() {
    if (!photo || busy) return;
    const id = ++runId.current;
    setError(null);
    setBusy(true);
    try {
      const analysis = await api.analyze(photo.file, { source: 'web', input_method: photo.method, include_gradcam: false });
      if (id !== runId.current) return; // cancelled
      setScan(analysis, URL.createObjectURL(photo.file));
      navigate(`/analysis/${analysis.analysis_id}`);
    } catch (e) {
      if (id !== runId.current) return;
      setError(errMessage(e, C.failed));
      setBusy(false);
    }
  }

  function cancel() {
    runId.current += 1;
    setBusy(false);
  }

  return (
    <div className="space-y-6">
      <header className="max-w-2xl">
        <span className="badge gap-1.5 bg-primary-50 text-primary-700"><ScanFace className="h-3.5 w-3.5" aria-hidden /> {C.eyebrow}</span>
        <h1 className="mt-3">{C.title}</h1>
        <p className="mt-1">{C.subtitle}</p>
      </header>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        {/* Camera, preview and processing share one skeleton (top row, 4:3 stage, two action rows), so the card never changes height. */}
        <div className="card">
          {busy && previewUrl ? (
            <>
              <FrameTop><p className="text-label-md text-ink-900" role="status">{C.processingLabel}</p></FrameTop>
              <FrameStage>
                <img src={previewUrl} alt={C.processingAlt} className="absolute inset-0 h-full w-full object-cover opacity-90" />
                <div className="scan-line" aria-hidden />
                <Steps step={step} />
              </FrameStage>
              <FrameAction />
            </>
          ) : photo && previewUrl ? (
            <>
              <FrameTop>
                <p className="flex items-center gap-2 text-label-md text-ink-900"><Check className="h-4 w-4 text-primary-600" aria-hidden /> {C.photoReady}</p>
              </FrameTop>
              <FrameStage>
                <img src={previewUrl} alt={C.previewAlt} className="absolute inset-0 h-full w-full object-contain" />
                {error && (
                  <StageAlert>
                    <span>{error}</span>
                    <button className="shrink-0 font-semibold underline" onClick={start}>{COPY.scan.retry}</button>
                  </StageAlert>
                )}
              </FrameStage>
              <FrameAction>
                <button className="btn-outline h-full w-full" onClick={() => { setPhoto(null); setError(null); }}>
                  <RefreshCw className="h-4 w-4" aria-hidden /> {C.changePhoto}
                </button>
              </FrameAction>
            </>
          ) : (
            <PhotoInput onPick={(file, method) => { setError(null); setPhoto({ file, method }); }} defaultMode="upload" labels={{ upload: C.tabUpload, camera: C.tabCamera }} />
          )}

          <div className="mt-4 h-11">
            {busy ? (
              <button className="btn-outline h-full w-full" onClick={cancel}>{C.cancel}</button>
            ) : (
              <button className="btn-primary h-full w-full" onClick={start} disabled={!photo}>
                <Sparkles className="h-4 w-4" aria-hidden /> {C.start}
              </button>
            )}
          </div>
        </div>

        <div className="space-y-6">
          <section className="card" aria-labelledby="benefits-title">
            <h2 id="benefits-title" className="text-h3">{C.benefitsTitle}</h2>
            <ul className="mt-4 space-y-4">
              {C.benefits.map((b, i) => {
                const Icon = BENEFIT_ICONS[i];
                return (
                  <li key={b.title} className="flex gap-3">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-btn bg-primary-50 text-primary-600" aria-hidden><Icon className="h-4 w-4" /></span>
                    <div>
                      <p className="font-semibold text-ink-900">{b.title}</p>
                      <p className="text-body-md text-ink-600">{b.text}</p>
                    </div>
                  </li>
                );
              })}
            </ul>
          </section>

          <section className="card bg-primary-50" aria-labelledby="tips-title">
            <h2 id="tips-title" className="flex items-center gap-2 text-h3"><Lightbulb className="h-5 w-5 text-primary-600" aria-hidden /> {C.tipsTitle}</h2>
            <ul className="mt-4 space-y-3">
              {C.tips.map((t, i) => {
                const Icon = TIP_ICONS[i];
                return (
                  <li key={t.title} className="flex gap-3">
                    <Icon className="mt-0.5 h-4 w-4 shrink-0 text-primary-600" aria-hidden />
                    <div>
                      <p className="font-semibold text-ink-900">{t.title}</p>
                      <p className="text-body-md text-ink-600">{t.text}</p>
                    </div>
                  </li>
                );
              })}
            </ul>
          </section>
        </div>
      </div>

      <Disclaimer />
    </div>
  );
}
