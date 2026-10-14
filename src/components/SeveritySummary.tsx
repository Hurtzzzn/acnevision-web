import { CircleDashed, Info } from 'lucide-react';
import { COPY, type Severity } from '@acnevision/shared';
import { SeverityScale } from './SeverityScale';
import { SeverityBadge } from './ui';

/** What only the AI model's result carries: confidence and the notes that go with it. */
export interface ModelSeverity {
  confidencePct: number;
  isLowConfidence: boolean;
  /** Lesion count and model severity are 2 or more levels apart (FR-SCAN-19). */
  showMismatchNote: boolean;
}

/**
 * Count sentence plus severity. Guest: estimate from the lesion count (badge, scale with marker, note).
 * Signed in (`model` given): the AI model's severity for the whole photo, with its confidence; never the count-based estimate.
 * One card below `lg` at the top, one in the right column from `lg`.
 */
export function SeveritySummary({ total, severity, className, compact = false, model }: {
  total: number; severity: Severity | null; className: string;
  /** Keeps the count line at headline size: the side column is narrow (20rem from xl, a third of the width at lg). */
  compact?: boolean;
  model?: ModelSeverity;
}) {
  const R = COPY.detectResult;
  const M = COPY.result;
  return (
    <section className={`card space-y-5 ${className}`} aria-label={model ? M.severityTitle : R.severityTitle}>
      <div>
        <h2 className={`text-headline-lg ${compact ? '' : 'lg:text-display-sm'}`}>
          <span className="tnum text-primary-600">{total}</span> {R.countUnit}
        </h2>
        {model && <p className="mt-1 text-body-sm text-ink-500">{COPY.lesionCountNote}</p>}
      </div>
      {severity && (
        <div className="space-y-3">
          <p className="text-label-md text-ink-600">{model ? M.severityTitle : R.severityTitle}</p>
          {model ? (
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
              <SeverityBadge severity={severity} isEstimate={false} large />
              <span className="tnum text-label-lg text-ink-900">{M.confidenceValue(model.confidencePct)}</span>
            </div>
          ) : (
            <SeverityBadge severity={severity} isEstimate={false} large />
          )}
          <div className="pt-2">
            <SeverityScale severity={severity} total={model ? undefined : total} />
          </div>
          {model ? (
            <>
              <p className="text-body-sm text-ink-500">{COPY.severityNoteModel}</p>
              {model.isLowConfidence && (
                <p className="flex items-center gap-1.5 text-body-sm text-ink-600">
                  <CircleDashed className="h-3.5 w-3.5 shrink-0" aria-hidden /> {COPY.lowConf}
                </p>
              )}
              {model.showMismatchNote && (
                <p className="flex items-start gap-2 text-body-sm text-ink-600">
                  <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-ink-500" aria-hidden /> {COPY.severityMismatchNote}
                </p>
              )}
            </>
          ) : (
            <p className="text-body-sm text-ink-500">{COPY.severityNote}</p>
          )}
        </div>
      )}
    </section>
  );
}
