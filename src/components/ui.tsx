import { useEffect, useId, useRef, type ReactNode } from 'react';
import { AlertCircle, CheckCircle2, Info, Loader2, X } from 'lucide-react';
import { CLASS_META, COPY, SEVERITY_META, type AcneClass, type Severity } from '@acnevision/shared';
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
  // Soft light-blue note with left accent strip; informative, never alarming.
  if (variant === 'box') {
    return (
      <div role="note" className="disclaimer flex gap-3">
        <Info className="mt-0.5 h-5 w-5 shrink-0 text-primary-600" aria-hidden />
        <div>
          <p className="font-semibold">{COPY.disclaimerTitle}</p>
          <p>{COPY.disclaimer}</p>
        </div>
      </div>
    );
  }
  return (
    <p role="note" className="rounded-btn border border-primary-200 bg-primary-50 px-3 py-2 text-body-sm text-primary-800">
      {COPY.disclaimer}
    </p>
  );
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
      {isEstimate && <span className="text-body-sm text-ink-500">{COPY.severityNote}</span>}
    </div>
  );
}

/** Darker text per class so the 10%-tinted chip stays readable. Chip dot and tint come from CLASS_META. */
const CLASS_TEXT: Record<AcneClass, string> = {
  Blackheads: '#334155',
  Cyst: '#B91C1C',
  Papules: '#C2410C',
  Pustules: '#A16207',
  Whiteheads: '#0369A1',
};

export function ClassBadge({ cls }: { cls: AcneClass }) {
  const { color, label } = CLASS_META[cls];
  return (
    <span className="badge gap-1.5 py-1" style={{ background: `${color}1A`, color: CLASS_TEXT[cls] }}>
      <span className="h-2 w-2 rounded-full" style={{ background: color }} aria-hidden />
      {label}
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
  const titleId = useId();
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink-900/40 p-gutter-sm" onMouseDown={onClose}>
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className="card w-full max-w-md shadow-float outline-none"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="mb-3 flex items-start justify-between gap-4">
          <h3 id={titleId}>{title}</h3>
          <button
            aria-label={COPY.close}
            className="-mr-1 -mt-1 rounded-control p-1.5 text-ink-500 transition-colors hover:bg-tint hover:text-ink-900"
            onClick={onClose}
          >
            <X className="h-5 w-5" aria-hidden />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function Toasts() {
  const toasts = useUi((s) => s.toasts);
  return (
    <div className="fixed inset-x-gutter-sm bottom-4 z-[60] flex flex-col items-end gap-2 sm:left-auto sm:right-4" aria-live="polite">
      {toasts.map((t) => {
        const ok = t.kind === 'success';
        const Icon = ok ? CheckCircle2 : AlertCircle;
        return (
          <div key={t.id} className="frosted flex max-w-sm items-start gap-2.5 rounded-btn px-4 py-3 text-body-md font-medium text-ink-900 shadow-float">
            <Icon className={`mt-0.5 h-4 w-4 shrink-0 ${ok ? 'text-success' : 'text-danger'}`} aria-hidden />
            <span>{t.text}</span>
          </div>
        );
      })}
    </div>
  );
}
