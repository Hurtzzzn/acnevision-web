import { useCallback, useEffect, useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { Check, Info, Lock, ScanFace } from 'lucide-react';
import { COPY } from '@acnevision/shared';
import { api } from '../lib/runtime';
import { errMessage } from '../lib/errors';
import { useAuth } from '../store/auth';
import { useScan } from '../store/scan';
import { NEW_ANALYSIS_PATH } from '../lib/redirect';
import { ErrorBox, Spinner } from '../components/ui';
import { PhotoInput, type PhotoMethod } from '../components/PhotoInput';

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
  const [busy, setBusy] = useState(false);
  const [step, setStep] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const { user, ready } = useAuth();
  const setDetection = useScan((s) => s.setDetection);
  const navigate = useNavigate();
  const location = useLocation();
  // Set when /detect-result had nothing to show (e.g. after a refresh); read once, then cleared from history state.
  const [resultExpired] = useState(() => !!(location.state as { resultExpired?: boolean } | null)?.resultExpired);

  useEffect(() => {
    if (resultExpired) navigate(location.pathname, { replace: true, state: null });
  }, [resultExpired, navigate, location.pathname]);

  useEffect(() => {
    if (!busy) return;
    setStep(0);
    const id = setInterval(() => setStep((s) => Math.min(s + 1, COPY.scan.progress.length - 1)), STEP_MS);
    return () => clearInterval(id);
  }, [busy]);

  // Guests only: this page is detection-only. Signed-in users do the full analysis on /analyze.
  const submit = useCallback(async (file: File, method: PhotoMethod) => {
    setError(null);
    setBusy(true);
    try {
      const detection = await api.detect(file, { source: 'web', input_method: method });
      setDetection(detection, URL.createObjectURL(file));
      navigate('/detect-result');
    } catch (e) {
      setError(errMessage(e, COPY.scan.detectFailed));
      setBusy(false);
    }
  }, [navigate, setDetection]);

  if (!ready) return <div className="p-12 text-center"><Spinner label="Memuat..." /></div>;
  if (user) return <Navigate to={NEW_ANALYSIS_PATH} replace />;

  return (
    <div className="space-y-6">
      <header className="max-w-2xl">
        <span className="badge gap-1.5 bg-primary-50 text-primary-700"><ScanFace className="h-3.5 w-3.5" aria-hidden /> {COPY.scan.eyebrow}</span>
        <h1 className="mt-3">{COPY.scan.title}</h1>
        <p className="mt-1">{COPY.scan.subtitle}</p>
      </header>

      {resultExpired && (
        <p role="status" className="flex items-start gap-2.5 rounded-btn border border-primary-200 bg-primary-50 px-4 py-3 text-body-md text-primary-800">
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-primary-600" aria-hidden />
          {COPY.scan.resultExpired}
        </p>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="card relative lg:col-span-2">
          <PhotoInput onPick={submit} disabled={busy} defaultMode="camera" />
          {error && <div className="mt-4"><ErrorBox message={error} /></div>}

          <p className="mt-4 flex items-center gap-2 text-body-sm text-ink-500">
            <Lock className="h-3.5 w-3.5 shrink-0" aria-hidden /> {COPY.scan.privacyNote}
          </p>

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
