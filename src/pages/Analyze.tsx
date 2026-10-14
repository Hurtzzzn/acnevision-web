import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, RefreshCw, Sparkles } from 'lucide-react';
import { COPY } from '@acnevision/shared';
import { api } from '../lib/runtime';
import { errMessage } from '../lib/errors';

import { useAuth } from '../store/auth';
import { useScan } from '../store/scan';
import { FrameAction, FrameStage, FrameTop, PhotoInput, StageAlert, type PhotoMethod } from '../components/PhotoInput';
import { PhotoTips } from '../components/PhotoTips';
import { Spinner } from '../components/ui';

const C = COPY.analyze;

type View = 'pick' | 'ready' | 'processing';

export default function Analyze() {
  const [photo, setPhoto] = useState<{ file: File; method: PhotoMethod } | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const runId = useRef(0);
  const abort = useRef<AbortController | null>(null);
  const card = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const setScan = useScan((s) => s.setScan);
  const remember = useScan((s) => s.remember);
  const userId = useAuth((s) => s.user?.id);

  const view: View = busy && previewUrl ? 'processing' : photo && previewUrl ? 'ready' : 'pick';

  useEffect(() => {
    if (!photo) { setPreviewUrl(null); return; }
    const url = URL.createObjectURL(photo.file);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [photo]);

  // When the card swaps between steps, move focus to the new step's title (or, back at the start, the selected tab).
  const lastView = useRef<View>(view);
  useEffect(() => {
    if (lastView.current === view) return;
    lastView.current = view;
    card.current?.querySelector<HTMLElement>('[data-step-title], [role="tab"][aria-selected="true"]')?.focus();
  }, [view]);

  // Invalidate any in-flight run when the page unmounts.
  useEffect(() => () => { runId.current += 1; abort.current?.abort(); }, []);

  async function start() {
    if (!photo || busy) return;
    const id = ++runId.current;
    const controller = new AbortController();
    abort.current = controller;
    setError(null);
    setBusy(true);
    try {
      const analysis = await api.analyze(photo.file, { source: 'web', input_method: photo.method, include_gradcam: false, signal: controller.signal });
      if (id !== runId.current) return; // cancelled
      setScan(analysis, URL.createObjectURL(photo.file));
      // Signed-in only (this page sits behind RequireAuth): lets the result survive a refresh in this tab.
      if (userId) void remember(userId, photo.file);
      navigate(`/analysis/${analysis.analysis_id}`);
    } catch (e) {
      if (id !== runId.current) return;
      setError(errMessage(e, C.failed));
      setBusy(false);
    }
  }

  function cancel() {
    runId.current += 1;
    abort.current?.abort();
    setBusy(false);
  }

  return (
    <div className="space-y-6">
      <header className="max-w-2xl">
        <h1>{C.title}</h1>
        <p className="mt-1">{C.subtitle}</p>
      </header>

      <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,1.8fr)_minmax(0,1fr)] lg:gap-6">
        {/* Camera, preview and processing share one skeleton (top row, stage, two action rows), so the card never changes height. */}
        <div ref={card} className="card">
          {view === 'processing' && previewUrl ? (
            <>
              <FrameTop>
                <p data-step-title tabIndex={-1} className="text-label-md text-ink-900">{C.processingLabel}</p>
                <button className="btn-outline h-11 px-4" onClick={cancel}>{C.cancel}</button>
              </FrameTop>
              <FrameStage>
                <img src={previewUrl} alt={C.processingAlt} className="absolute inset-0 h-full w-full object-cover opacity-90" />
                <div className="scan-line" aria-hidden />
              </FrameStage>
              {/* One honest indicator instead of staged steps; same height as the two action rows in the other views (44 + 16 + 44) */}
              <div className="mt-4 flex h-[6.5rem] items-center justify-center text-center">
                <Spinner label={C.processingNote} />
              </div>
            </>
          ) : view === 'ready' && previewUrl ? (
            <>
              <FrameTop>
                <p data-step-title tabIndex={-1} className="text-body-md text-ink-600">{C.reviewQuestion}</p>
              </FrameTop>
              <FrameStage>
                <img src={previewUrl} alt={C.previewAlt} className="absolute inset-0 h-full w-full object-contain" />
                {error && (
                  <StageAlert>
                    <span>{error}</span>
                    <button className="min-h-11 shrink-0 rounded-control border border-red-300 bg-white px-4 font-semibold text-red-700 transition-[background-color,transform] duration-200 ease-out hover:bg-red-50 motion-safe:active:scale-[0.97]" onClick={start}>{COPY.scan.retry}</button>
                  </StageAlert>
                )}
              </FrameStage>
              <FrameAction>
                <button className="btn-outline h-full w-full" onClick={() => { setPhoto(null); setError(null); }}>
                  <RefreshCw className="h-4 w-4" aria-hidden /> {C.changePhoto}
                </button>
              </FrameAction>
              <div className="mt-4 h-11">
                <button className="btn-primary h-full w-full" onClick={start}>
                  <Sparkles className="h-4 w-4" aria-hidden /> {C.start}
                </button>
              </div>
            </>
          ) : (
            <PhotoInput onPick={(file, method) => { setError(null); setPhoto({ file, method }); }} defaultMode="camera" cameraGate />
          )}
        </div>

        {/* Plain typography, no cards, top-aligned with the camera card. It follows its own content height; the camera card keeps roughly the same share of the width as on the guest scan page. */}
        <div className="flex max-w-[24rem] flex-col gap-8">
          <div className="enter-soft">
            <PhotoTips plain title={C.tipsTitle} items={COPY.photoTips.slice(0, 3)} />
          </div>

          <section aria-labelledby="after-title">
            <h2 id="after-title" className="enter-soft text-base font-semibold text-ink-900" style={{ '--enter-delay': '40ms' } as CSSProperties}>{C.afterTitle}</h2>
            <ol className="enter-soft relative mt-3 flex flex-col gap-3.5" style={{ '--enter-delay': '70ms' } as CSSProperties}>
              {/* One hairline behind every number, from the first circle's center to the last circle */}
              <span className="absolute bottom-0 left-[11.5px] top-3 z-0 w-px bg-border-strong" aria-hidden />
              {C.afterSteps.map((step, i) => {
                const last = i === C.afterSteps.length - 1;
                return (
                  <li key={step.title} className="relative pl-10">
                    <span className="tnum absolute left-0 top-0 z-10 flex h-6 w-6 items-center justify-center rounded-full border border-border-strong bg-white text-label-sm text-ink-700" aria-hidden>{i + 1}</span>
                    {/* The last step's text is taller than its circle: hide the line below the circle */}
                    {last && <span className="absolute bottom-0 left-0 top-6 z-10 w-6 bg-white" aria-hidden />}
                    <p className="text-body-md font-semibold leading-6 text-ink-900">{step.title}</p>
                    <p className="text-body-sm text-ink-500">{step.text}</p>
                  </li>
                );
              })}
            </ol>
            <p className="enter-soft mt-6 flex items-start gap-1.5 text-body-sm text-ink-500" style={{ '--enter-delay': '100ms' } as CSSProperties}>
              <Lock className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden /> {C.photoNote}
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
