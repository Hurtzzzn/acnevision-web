import type { ReactNode } from 'react';
import type { DetectedLesion } from '@acnevision/shared';

export const ZOOM_STEPS = [1, 1.25, 1.5, 2, 3];

/** Largest zoom step that still keeps every lesion (plus a margin for number chips) in view, and the cluster center. */
export function fitLesions(lesions: Pick<DetectedLesion, 'bbox'>[]) {
  const x1 = Math.min(...lesions.map((l) => l.bbox.x1)), x2 = Math.max(...lesions.map((l) => l.bbox.x2));
  const y1 = Math.min(...lesions.map((l) => l.bbox.y1)), y2 = Math.max(...lesions.map((l) => l.bbox.y2));
  const fit = Math.min(1 / (x2 - x1 + 0.08), 1 / (y2 - y1 + 0.08));
  const zoomIdx = ZOOM_STEPS.reduce((best, z, i) => (z <= fit ? i : best), 0);
  return { zoomIdx, cx: (x1 + x2) / 2, cy: (y1 + y2) / 2 };
}

export function ToolButton({ label, onClick, disabled, pressed, children }: {
  label: string; onClick: () => void; disabled?: boolean; pressed?: boolean; children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      aria-pressed={pressed}
      disabled={disabled}
      onClick={onClick}
      className="inline-flex h-9 items-center justify-center gap-1.5 rounded-control border border-border bg-white px-2.5 text-label-md text-ink-900 transition-colors hover:bg-primary-50 disabled:cursor-not-allowed disabled:opacity-50 aria-pressed:border-primary-200 aria-pressed:bg-primary-50"
    >
      {children}
    </button>
  );
}
