import { COPY, SEVERITY_META, SEVERITY_THRESHOLDS, type Severity } from '@acnevision/shared';

const ORDER: Severity[] = ['clear', 'mild', 'moderate', 'severe'];
const { mild, moderate } = SEVERITY_THRESHOLDS;

/** Lesion-count range shown under each segment, derived from SEVERITY_THRESHOLDS. */
const RANGE: Record<Severity, string> = {
  clear: '0',
  mild: `1–${mild}`,
  moderate: `${mild + 1}–${moderate}`,
  severe: `>${moderate}`,
};

/** Position of the marker inside its segment (0..1), from the lesion count. The last segment is open-ended. */
function withinSegment(severity: Severity, total: number): number {
  const span = (from: number, to: number) => Math.min(1, Math.max(0, (total - from + 0.5) / (to - from + 1)));
  switch (severity) {
    case 'clear': return 0.5;
    case 'mild': return span(1, mild);
    case 'moderate': return span(mild + 1, moderate);
    default: return Math.min(0.85, Math.max(0.15, (total - moderate) / moderate));
  }
}

/** Four-segment severity scale with a marker at the lesion count. Colors come from SEVERITY_META. */
export function SeverityScale({ severity, total }: { severity: Severity; total: number }) {
  const active = ORDER.indexOf(severity);
  const left = ((active + withinSegment(severity, total)) / ORDER.length) * 100;

  return (
    <div role="img" aria-label={`${SEVERITY_META[severity].label}, ${total} ${COPY.detectResult.lesionUnit}`}>
      <div className="relative h-2.5" aria-hidden>
        <span
          className="absolute -top-0.5 h-0 w-0 -translate-x-1/2 -translate-y-full border-x-[6px] border-t-[8px] border-x-transparent border-t-ink-900"
          style={{ left: `${left}%` }}
        />
      </div>
      <div className="mt-1 flex gap-1" aria-hidden>
        {ORDER.map((s, i) => (
          <span
            key={s}
            className="h-2.5 flex-1 first:rounded-l-full last:rounded-r-full"
            style={{ background: i === active ? SEVERITY_META[s].text : SEVERITY_META[s].bg }}
          />
        ))}
      </div>
      <div className="mt-2 flex gap-1" aria-hidden>
        {ORDER.map((s, i) => (
          <div key={s} className="flex-1 text-center">
            <p className={`text-label-sm ${i === active ? 'font-semibold text-ink-900' : 'text-ink-500'}`}>{SEVERITY_META[s].label}</p>
            <p className="tnum text-body-sm text-ink-500">{RANGE[s]}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
