import { Bot, Droplets, FlaskConical, HandMetal, Stethoscope, type LucideIcon } from 'lucide-react';
import { COPY, type Severity } from '@acnevision/shared';

const R = COPY.recommendation;
const POINT_ICONS: Record<string, LucideIcon> = { cleansing: Droplets, actives: FlaskConical, avoid: HandMetal, doctor: Stethoscope };

/**
 * Care recommendation: the assistant's own text in one card, then four short general-guidance points.
 * For moderate or severe estimates the "Kapan ke Dokter" point comes first. Tone stays calm either way.
 */
export function Recommendation({ text, isFallback, loading, severity }: {
  text: string | null; isFallback?: boolean; loading: boolean; severity: Severity;
}) {
  const doctorFirst = severity === 'moderate' || severity === 'severe';
  const points = doctorFirst ? [...R.points].sort((a, b) => Number(b.key === 'doctor') - Number(a.key === 'doctor')) : R.points;

  return (
    <section aria-labelledby="rec-title" className="space-y-4">
      <div className="card">
        <div className="flex flex-wrap items-center gap-2">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-btn bg-primary-50 text-primary-600" aria-hidden><Bot className="h-5 w-5" /></span>
          <h2 id="rec-title" className="text-headline-sm">{R.aiTitle}</h2>
          <span className="badge bg-primary-50 text-primary-700">{R.aiBadge}</span>
        </div>
        {/* Reserved height: the text arrives after a request, and must not push the cards below it down */}
        <div className="mt-3 min-h-64 text-body-md sm:min-h-32" aria-live="polite">
          {loading && (
            <div role="status" className="space-y-3">
              <span className="sr-only">{R.aiLoading}</span>
              {[100, 95, 100, 80, 90, 60].map((w, i) => <div key={i} className="h-3 animate-pulse rounded-full bg-tint" style={{ width: `${w}%` }} aria-hidden />)}
            </div>
          )}
          {!loading && !text && <p className="text-ink-500">{R.aiUnavailable}</p>}
          {text && <p className="whitespace-pre-line">{text}</p>}
          {text && isFallback && <p className="mt-2 text-body-sm text-ink-500">{R.aiFallback}</p>}
        </div>
      </div>

      <div>
        <h3 className="text-headline-sm">{R.guidanceTitle}</h3>
        <p className="mt-1 text-body-sm text-ink-500">{R.guidanceNote}</p>
        <ul className="mt-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {points.map((p) => {
            const Icon = POINT_ICONS[p.key];
            const lead = doctorFirst && p.key === 'doctor';
            return (
              <li key={p.key} className={`card flex flex-col gap-2 ${lead ? 'border-primary-200 bg-primary-50' : ''}`}>
                <span className="flex h-9 w-9 items-center justify-center rounded-btn bg-primary-50 text-primary-600" aria-hidden><Icon className="h-5 w-5" /></span>
                <h4 className="text-label-lg text-ink-900">{p.title}</h4>
                <p className="text-body-md text-ink-600">{lead ? `${R.doctorLead} ${p.text}` : p.text}</p>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
