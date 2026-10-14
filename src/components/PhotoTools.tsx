import { useId, type ReactNode } from 'react';
import { Minus, Plus } from 'lucide-react';
import { COPY, type DetectedLesion } from '@acnevision/shared';

export const ZOOM_STEPS = [1, 1.25, 1.5, 2, 3];

/** Largest zoom step that still keeps every lesion (plus a margin for number chips) in view, and the cluster center. */
export function fitLesions(lesions: Pick<DetectedLesion, 'bbox'>[]) {
  const x1 = Math.min(...lesions.map((l) => l.bbox.x1)), x2 = Math.max(...lesions.map((l) => l.bbox.x2));
  const y1 = Math.min(...lesions.map((l) => l.bbox.y1)), y2 = Math.max(...lesions.map((l) => l.bbox.y2));
  const fit = Math.min(1 / (x2 - x1 + 0.08), 1 / (y2 - y1 + 0.08));
  const zoomIdx = ZOOM_STEPS.reduce((best, z, i) => (z <= fit ? i : best), 0);
  return { zoomIdx, cx: (x1 + x2) / 2, cy: (y1 + y2) / 2 };
}

/**
 * Toolbar button with a 44px touch target. A button with visible text is named by that text (no aria-label that could differ);
 * `iconOnly` buttons carry the label. When disabled, `disabledReason` is shown as a tooltip and read by screen readers.
 */
export function ToolButton({ label, onClick, disabled, pressed, iconOnly = false, disabledReason, children }: {
  label: string; onClick: () => void; disabled?: boolean; pressed?: boolean; iconOnly?: boolean; disabledReason?: string; children: ReactNode;
}) {
  const reasonId = useId();
  const reason = disabled ? disabledReason : undefined;
  return (
    <>
      <button
        type="button"
        aria-label={iconOnly ? label : undefined}
        aria-describedby={reason ? reasonId : undefined}
        title={reason ?? label}
        aria-pressed={pressed}
        disabled={disabled}
        onClick={onClick}
        className="inline-flex min-h-11 min-w-11 items-center justify-center gap-1.5 rounded-control border border-border bg-white px-3 text-label-md text-ink-900 transition-colors hover:bg-primary-50 disabled:cursor-not-allowed disabled:opacity-50 aria-pressed:border-primary-200 aria-pressed:bg-primary-50"
      >
        {children}
      </button>
      {reason && <span id={reasonId} className="sr-only">{reason}</span>}
    </>
  );
}

/** One compact zoom control: minus, current percentage, plus. Pinch on the photo steps the same index. */
export function ZoomControl({ zoomIdx, onStep }: { zoomIdx: number; onStep: (delta: number) => void }) {
  const R = COPY.detectResult;
  return (
    <div role="group" aria-label={R.zoomGroupLabel} className="flex items-center gap-1">
      <ToolButton label={R.zoomOut} iconOnly disabled={zoomIdx === 0} disabledReason={R.zoomMinReason} onClick={() => onStep(-1)}>
        <Minus className="h-4 w-4" aria-hidden />
      </ToolButton>
      <span className="tnum w-12 text-center text-label-md text-ink-600" aria-live="polite">{Math.round(ZOOM_STEPS[zoomIdx] * 100)}%</span>
      <ToolButton label={R.zoomIn} iconOnly disabled={zoomIdx === ZOOM_STEPS.length - 1} disabledReason={R.zoomMaxReason} onClick={() => onStep(1)}>
        <Plus className="h-4 w-4" aria-hidden />
      </ToolButton>
    </div>
  );
}
