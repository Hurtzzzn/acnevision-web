import { COPY, SEVERITY_META, SEVERITY_ORDER, SEVERITY_THRESHOLDS, type Severity } from '@acnevision/shared';

const { mild, moderate, severe } = SEVERITY_THRESHOLDS;

/** Lesion-count range shown under each segment (guest estimate only), derived from SEVERITY_THRESHOLDS. */
export const SEVERITY_RANGE: Record<Severity, string> = {
  mild: `1-${mild}`,
  moderate: `${mild + 1}-${moderate}`,
  severe: `${moderate + 1}-${severe}`,
  very_severe: `>${severe}`,
};

/** Position of the marker inside its segment (0..1), from the lesion count. The last segment is open-ended. */
function withinSegment(severity: Severity, total: number): number {
  const span = (from: number, to: number) => Math.min(1, Math.max(0, (total - from + 0.5) / (to - from + 1)));
  switch (severity) {
    case 'mild': return span(1, mild);
    case 'moderate': return span(mild + 1, moderate);
    case 'severe': return span(moderate + 1, severe);
    default: return Math.min(0.85, Math.max(0.15, (total - severe) / severe));
  }
}

/**
 * Four-segment severity scale. With `total` (guest estimate) a marker sits at the lesion count and each segment shows its
 * count range. Without it (the AI model's result) only the segment of the model's severity is highlighted: the lesion
 * ranges are the Hayashi estimate and must not sit next to a severity that did not come from the count.
 */
export function SeverityScale({ severity, total, large = false }: { severity: Severity; total?: number; large?: boolean }) {
  const active = SEVERITY_ORDER.indexOf(severity);
  const estimate = total !== undefined;
  const left = estimate ? ((active + withinSegment(severity, total)) / SEVERITY_ORDER.length) * 100 : 0;
  const label = estimate ? `${SEVERITY_META[severity].label}, ${total} ${COPY.detectResult.lesionUnit}` : SEVERITY_META[severity].label;

  return (
    <div role="img" aria-label={label}>
      {estimate && (
        <div className="relative h-2" aria-hidden>
          <span
            className="absolute -top-0.5 h-0 w-0 -translate-x-1/2 -translate-y-full border-x-[5px] border-t-[7px] border-x-transparent border-t-ink-600"
            style={{ left: `${left}%` }}
          />
        </div>
      )}
      <div className="mt-1 flex gap-1" aria-hidden>
        {SEVERITY_ORDER.map((s, i) => (
          <span
            key={s}
            className="h-2 flex-1 border first:rounded-l-full last:rounded-r-full"
            // Inactive segments keep a thin border in their own hue so the pale fill stays visible on white
            style={{
              background: i === active ? SEVERITY_META[s].solid : SEVERITY_META[s].tint,
              borderColor: i === active ? SEVERITY_META[s].solid : `${SEVERITY_META[s].solid}59`,
            }}
          />
        ))}
      </div>
      <div className="mt-2 flex gap-1" aria-hidden>
        {SEVERITY_ORDER.map((s, i) => (
          <div key={s} className="flex-1 text-center">
            <p className={`${large ? 'text-label-md' : 'text-label-sm'} ${i === active ? 'font-semibold text-ink-900' : 'text-ink-500'}`}>{SEVERITY_META[s].label}</p>
            {estimate && <p className={`tnum ${large ? 'text-body-md' : 'text-body-sm'} text-ink-500`}>{SEVERITY_RANGE[s]}</p>}
          </div>
        ))}
      </div>
    </div>
  );
}
