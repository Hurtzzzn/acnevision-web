import { useEffect, useRef, type ReactNode } from 'react';
import { AlertTriangle, Loader2, X } from 'lucide-react';
import { CLASS_META, COPY, SEVERITY_META, type AcneClass, type Lesion, type Severity } from '@acnevision/shared';
import { useUi } from '../store/ui';

export function Logo({ className = '' }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2 font-bold text-ink-900 ${className}`}>
      <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary-600" aria-hidden>
        <span className="flex h-4 w-4 items-center justify-center rounded-full border-2 border-white">
          <span className="h-1 w-1 rounded-full bg-white" />
        </span>
      </span>
      {COPY.appName}
    </span>
  );
}

export function Disclaimer({ variant = 'inline' }: { variant?: 'inline' | 'box' }) {
  if (variant === 'box') {
    return (
      <div role="note" className="flex gap-3 rounded-card border border-red-200 bg-red-50 p-4 text-sm text-red-800">
        <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" aria-hidden />
        <div>
          <p className="font-semibold">Medical Disclaimer</p>
          <p>{COPY.disclaimer}</p>
        </div>
      </div>
    );
  }
  return <p className="rounded-btn bg-red-50 px-3 py-2 text-xs text-red-700">{COPY.disclaimer}</p>;
}

export function SeverityBadge({ severity, isEstimate = true, large = false }: { severity: Severity; isEstimate?: boolean; large?: boolean }) {
  const m = SEVERITY_META[severity];
  return (
    <div className="inline-flex flex-col items-start gap-1">
      <span
        className={`badge ${large ? 'px-5 py-2 text-lg' : ''}`}
        style={{ background: m.bg, color: m.text }}
      >
        {m.label}
      </span>
      {isEstimate && <span className="text-xs text-ink-400">{COPY.severityNote}</span>}
    </div>
  );
}

export function ClassBadge({ cls }: { cls: AcneClass }) {
  return (
    <span className="badge gap-1.5 bg-slate-100 text-ink-900">
      <span className="h-2 w-2 rounded-full" style={{ background: CLASS_META[cls].color }} aria-hidden />
      {CLASS_META[cls].label}
    </span>
  );
}

export function Spinner({ label }: { label?: string }) {
  return (
    <span className="inline-flex items-center gap-2 text-sm text-ink-600" role="status">
      <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
      {label}
    </span>
  );
}

export function EmptyState({ title, text, action }: { title: string; text?: string; action?: ReactNode }) {
  return (
    <div className="card flex flex-col items-center gap-3 py-12 text-center">
      <h3>{title}</h3>
      {text && <p className="max-w-md text-sm">{text}</p>}
      {action}
    </div>
  );
}

export function ErrorBox({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div role="alert" className="flex items-center justify-between gap-3 rounded-btn border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
      <span>{message}</span>
      {onRetry && <button className="font-semibold underline" onClick={onRetry}>Coba lagi</button>}
    </div>
  );
}

export function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const prev = document.activeElement as HTMLElement | null;
    ref.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'Tab' && ref.current) {
        const f = ref.current.querySelectorAll<HTMLElement>('button, a[href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
        if (!f.length) return;
        const first = f[0], last = f[f.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    };
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('keydown', onKey); prev?.focus(); };
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4" onMouseDown={onClose}>
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
        className="card w-full max-w-md outline-none"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="mb-3 flex items-start justify-between gap-4">
          <h3>{title}</h3>
          <button aria-label="Tutup" className="rounded p-1 hover:bg-slate-100" onClick={onClose}><X className="h-5 w-5" /></button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function Toasts() {
  const toasts = useUi((s) => s.toasts);
  return (
    <div className="fixed bottom-4 right-4 z-[60] flex flex-col gap-2" aria-live="polite">
      {toasts.map((t) => (
        <div key={t.id} className={`rounded-btn px-4 py-3 text-sm font-medium text-white shadow-card ${t.kind === 'success' ? 'bg-success' : 'bg-danger'}`}>
          {t.text}
        </div>
      ))}
    </div>
  );
}

export function ClassDistributionBars({ classCounts }: { classCounts: Record<AcneClass, number> }) {
  const entries = (Object.keys(CLASS_META) as AcneClass[]).map((c) => ({ c, n: classCounts[c] ?? 0 }));
  const max = Math.max(1, ...entries.map((e) => e.n));
  return (
    <ul className="space-y-3">
      {entries.map(({ c, n }) => (
        <li key={c}>
          <div className="mb-1 flex justify-between text-sm">
            <span className="text-ink-900">{CLASS_META[c].label} <span className="text-ink-400">({c})</span></span>
            <span className="font-semibold text-ink-900">{n}</span>
          </div>
          <div className="h-2.5 overflow-hidden rounded-full bg-slate-100">
            <div className="h-full rounded-full transition-all" style={{ width: `${(n / max) * 100}%`, background: CLASS_META[c].color }} />
          </div>
        </li>
      ))}
    </ul>
  );
}

export function LesionList({ lesions, selectedIdx, onSelect }: { lesions: Lesion[]; selectedIdx: number | null; onSelect: (i: number | null) => void }) {
  return (
    <ul className="divide-y divide-border text-sm">
      {lesions.map((l) => (
        <li key={l.idx}>
          <button
            className={`flex w-full items-center gap-3 px-2 py-2 text-left hover:bg-primary-50 ${selectedIdx === l.idx ? 'bg-primary-50' : ''}`}
            onClick={() => onSelect(selectedIdx === l.idx ? null : l.idx)}
          >
            <span className="w-6 text-ink-400">#{l.idx + 1}</span>
            <ClassBadge cls={l.predicted_class} />
            <span className="ml-auto font-semibold text-ink-900">{Math.round(l.class_confidence * 100)}%</span>
            {l.is_low_confidence && <AlertTriangle className="h-4 w-4 text-warning" aria-label={COPY.lowConf} />}
          </button>
        </li>
      ))}
    </ul>
  );
}

export function AnnotatedImage({
  src, lesions, showGradcam = false, gradcam = {}, selectedIdx = null, onSelectLesion,
}: {
  src: string; lesions: Lesion[]; showGradcam?: boolean; gradcam?: Record<number, string>;
  selectedIdx?: number | null; onSelectLesion?: (i: number | null) => void;
}) {
  return (
    <div className="relative overflow-hidden rounded-card bg-slate-100">
      <img src={src} alt="Foto wajah yang dianalisis" className="block w-full" />
      {lesions.map((l) => {
        const { color } = CLASS_META[l.predicted_class];
        const style = {
          left: `${l.bbox.x1 * 100}%`, top: `${l.bbox.y1 * 100}%`,
          width: `${(l.bbox.x2 - l.bbox.x1) * 100}%`, height: `${(l.bbox.y2 - l.bbox.y1) * 100}%`,
          borderColor: color,
        };
        return (
          <button
            key={l.idx}
            aria-label={`${l.predicted_class} ${Math.round(l.class_confidence * 100)} persen`}
            onClick={() => onSelectLesion?.(selectedIdx === l.idx ? null : l.idx)}
            className={`absolute border-2 ${l.is_low_confidence ? 'border-dashed' : ''} ${selectedIdx === l.idx ? 'z-10 shadow-[0_0_0_3px_rgba(255,255,255,0.9)]' : ''}`}
            style={style}
          >
            {showGradcam && gradcam[l.idx] && (
              <img src={`data:image/png;base64,${gradcam[l.idx]}`} alt="" className="absolute inset-0 h-full w-full opacity-80" />
            )}
            <span
              className="absolute bottom-full left-0 mb-0.5 whitespace-nowrap rounded px-1 text-[10px] font-semibold leading-4 text-white"
              style={{ background: color }}
            >
              {l.predicted_class} {Math.round(l.class_confidence * 100)}%
            </span>
          </button>
        );
      })}
    </div>
  );
}
