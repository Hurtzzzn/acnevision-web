import { useEffect, useId, useMemo, useRef, useState, type ReactNode } from 'react';
import { AlertCircle, AlertTriangle, CheckCircle2, Info, Loader2, X } from 'lucide-react';
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

export function ClassDistributionBars({ classCounts }: { classCounts: Record<AcneClass, number> }) {
  const entries = (Object.keys(CLASS_META) as AcneClass[]).map((c) => ({ c, n: classCounts[c] ?? 0 }));
  const max = Math.max(1, ...entries.map((e) => e.n));
  return (
    <ul className="space-y-3">
      {entries.map(({ c, n }) => (
        <li key={c}>
          <div className="mb-1 flex justify-between text-sm">
            <span className="text-ink-900">{CLASS_META[c].label} <span className="text-ink-500">({c})</span></span>
            <span className="tnum font-semibold text-ink-900">{n}</span>
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
            <span className="tnum w-6 text-ink-500">#{l.idx + 1}</span>
            <ClassBadge cls={l.predicted_class} />
            <span className="tnum ml-auto font-semibold text-ink-900">{Math.round(l.class_confidence * 100)}%</span>
            {l.is_low_confidence && <AlertTriangle className="h-4 w-4 text-warning" aria-label={COPY.lowConf} />}
          </button>
        </li>
      ))}
    </ul>
  );
}

interface LabelPlacement { x: number; y: number; w: number; compact: boolean }

const LABEL_H = 22;
const COMPACT_W = 24;

function overlaps(a: { x: number; y: number; w: number }, b: { x: number; y: number; w: number }) {
  return a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + LABEL_H && b.y < a.y + LABEL_H;
}

/**
 * Place one label per lesion without overlaps. Tries the full label ("Papula 94%") at several
 * anchors around the box; if none is free, falls back to a small number chip matching the list (#n).
 * Coordinates are px relative to the image box.
 */
function placeLabels(lesions: Lesion[], W: number, H: number): Map<number, LabelPlacement> {
  const placed: { x: number; y: number; w: number }[] = [];
  const out = new Map<number, LabelPlacement>();
  for (const l of lesions) {
    const bx = l.bbox.x1 * W, by = l.bbox.y1 * H;
    const bw = (l.bbox.x2 - l.bbox.x1) * W, bh = (l.bbox.y2 - l.bbox.y1) * H;
    const text = `${CLASS_META[l.predicted_class].label} ${Math.round(l.class_confidence * 100)}%`;
    const fullW = Math.ceil(text.length * 6.8) + 22;
    const tryWidth = (w: number) => {
      const clampX = (x: number) => Math.max(0, Math.min(W - w, x));
      const clampY = (y: number) => Math.max(0, Math.min(H - LABEL_H, y));
      const anchors = [
        { x: bx, y: by - LABEL_H - 2 },
        { x: bx + bw - w, y: by - LABEL_H - 2 },
        { x: bx, y: by + bh + 2 },
        { x: bx + bw - w, y: by + bh + 2 },
        { x: bx + 2, y: by + 2 },
        { x: bx + bw + 2, y: by },
        { x: bx - w - 2, y: by },
      ];
      for (const a of anchors) {
        const c = { x: clampX(a.x), y: clampY(a.y), w };
        if (!placed.some((p) => overlaps(c, p))) return c;
      }
      return null;
    };
    const full = tryWidth(fullW);
    const chip = full ? null : tryWidth(COMPACT_W);
    const pick = full ?? chip ?? { x: Math.max(0, Math.min(W - COMPACT_W, bx)), y: Math.max(0, by - LABEL_H - 2), w: COMPACT_W };
    placed.push(pick);
    out.set(l.idx, { ...pick, compact: !full });
  }
  return out;
}

export function AnnotatedImage({
  src, lesions, showGradcam = false, gradcam = {}, selectedIdx = null, onSelectLesion,
}: {
  src: string; lesions: Lesion[]; showGradcam?: boolean; gradcam?: Record<number, string>;
  selectedIdx?: number | null; onSelectLesion?: (i: number | null) => void;
}) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: 0, h: 0 });

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const measure = () => setSize({ w: el.clientWidth, h: el.clientHeight });
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const placements = useMemo(
    () => (size.w && size.h ? placeLabels(lesions, size.w, size.h) : new Map<number, LabelPlacement>()),
    [lesions, size.w, size.h],
  );

  return (
    <div ref={wrapRef} className="relative overflow-hidden rounded-card bg-tint">
      <img src={src} alt="Foto wajah yang dianalisis" className="block w-full" />
      {lesions.map((l) => {
        const { color, label } = CLASS_META[l.predicted_class];
        const conf = Math.round(l.class_confidence * 100);
        const boxStyle = {
          left: `${l.bbox.x1 * 100}%`, top: `${l.bbox.y1 * 100}%`,
          width: `${(l.bbox.x2 - l.bbox.x1) * 100}%`, height: `${(l.bbox.y2 - l.bbox.y1) * 100}%`,
          borderColor: color,
        };
        const p = placements.get(l.idx);
        const selected = selectedIdx === l.idx;
        return (
          <button
            key={l.idx}
            aria-label={`Lesi ${l.idx + 1}: ${label}, keyakinan ${conf} persen`}
            aria-pressed={selected}
            onClick={() => onSelectLesion?.(selected ? null : l.idx)}
            className={`absolute rounded-[3px] border-[1.5px] ${l.is_low_confidence ? 'border-dashed' : ''} ${selected ? 'z-20 shadow-[0_0_0_3px_rgba(255,255,255,0.9)]' : ''}`}
            style={boxStyle}
          >
            {showGradcam && gradcam[l.idx] && (
              <img src={`data:image/png;base64,${gradcam[l.idx]}`} alt="" className="absolute inset-0 h-full w-full opacity-80" />
            )}
            {p && (
              <span
                aria-hidden
                className="frosted absolute flex items-center justify-center gap-1.5 whitespace-nowrap rounded-full text-[12px] font-semibold leading-none text-ink-900 shadow-card"
                style={{
                  // button has no padding, so px offsets are relative to the box; convert from image coordinates
                  left: p.x - l.bbox.x1 * size.w, top: p.y - l.bbox.y1 * size.h, width: p.w, height: LABEL_H,
                }}
              >
                {p.compact ? (
                  <span className="tnum">{l.idx + 1}</span>
                ) : (
                  <>
                    <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: color }} />
                    <span className="tnum">{label} {conf}%</span>
                  </>
                )}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
