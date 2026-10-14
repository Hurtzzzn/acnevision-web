import { COPY, type Severity } from '@acnevision/shared';
import { SeverityScale } from './SeverityScale';
import { SeverityBadge } from './ui';

/** Count sentence plus estimated severity (badge, scale, note). One card below `lg` at the top, one in the right column from `lg`. */
export function SeveritySummary({ total, severity, isEstimate, className, compact = false }: {
  total: number; severity: Severity; isEstimate: boolean; className: string;
  /** Keeps the count line at headline size: the side column is narrow (20rem from xl, a third of the width at lg). */
  compact?: boolean;
}) {
  const R = COPY.detectResult;
  return (
    <section className={`card space-y-5 ${className}`} aria-label={R.severityTitle}>
      <h2 className={`text-headline-lg ${compact ? '' : 'lg:text-display-sm'}`}>
        <span className="tnum text-primary-600">{total}</span> {R.countUnit}
      </h2>
      <div className="space-y-3">
        <p className="text-label-md text-ink-600">{R.severityTitle}</p>
        <SeverityBadge severity={severity} isEstimate={false} large />
        <div className="pt-2">
          <SeverityScale severity={severity} total={total} />
        </div>
        {isEstimate && <p className="text-body-sm text-ink-500">{COPY.severityNote}</p>}
      </div>
    </section>
  );
}
