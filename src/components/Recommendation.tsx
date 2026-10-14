import { Bot, Droplets, FlaskConical, HandMetal, Stethoscope, type LucideIcon } from 'lucide-react';
import { COPY, leadsWithDoctor, type Severity } from '@acnevision/shared';

const R = COPY.recommendation;
const POINT_ICONS: Record<string, LucideIcon> = { cleansing: Droplets, actives: FlaskConical, avoid: HandMetal };
const LEAD_MAX = 180;

/** First sentence of the assistant's text, so the card stays short; the full conversation lives in the chat. */
function leadSentence(text: string): string {
  const first = text.trim().split(/(?<=[.!?])\s+/)[0] ?? '';
  if (first.length <= LEAD_MAX) return first;
  return `${first.slice(0, LEAD_MAX).replace(/\s+\S*$/, '')}...`;
}

/**
 * Care steps as one warm section: the assistant's opening line, three short steps, and "Kapan ke dokter" at the end.
 * The doctor note is highlighted when the AI's severity is moderate or higher. `severity` null (no lesions) keeps it low-key.
 */
export function Recommendation({ text, isFallback, loading, severity }: {
  text: string | null; isFallback?: boolean; loading: boolean; severity: Severity | null;
}) {
  const doctorFirst = leadsWithDoctor(severity);
  const doctor = R.points.find((p) => p.key === 'doctor')!;
  const care = R.points.filter((p) => p.key !== 'doctor');

  return (
    <section aria-labelledby="rec-title" className="card space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-btn bg-primary-50 text-primary-600" aria-hidden><Bot className="h-5 w-5" /></span>
        <h2 id="rec-title" className="text-headline-sm">{R.aiTitle}</h2>
        <span className="badge bg-primary-50 text-primary-700">{R.aiBadge}</span>
      </div>

      {/* Reserved height: the line arrives after a request and must not push what is below it */}
      <div className="min-h-12 text-body-md" aria-live="polite">
        {loading && (
          <div role="status" className="space-y-3">
            <span className="sr-only">{R.aiLoading}</span>
            {[100, 70].map((w, i) => <div key={i} className="h-3 animate-pulse rounded-full bg-tint" style={{ width: `${w}%` }} aria-hidden />)}
          </div>
        )}
        {!loading && !text && <p className="text-ink-500">{R.aiUnavailable}</p>}
        {text && <p>{leadSentence(text)}</p>}
        {text && isFallback && <p className="mt-1 text-body-sm text-ink-500">{R.aiFallback}</p>}
      </div>

      <ul className="space-y-3">
        {care.map((p) => {
          const Icon = POINT_ICONS[p.key];
          return (
            <li key={p.key} className="flex items-start gap-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-btn bg-primary-50 text-primary-600" aria-hidden><Icon className="h-4 w-4" /></span>
              <p className="pt-1.5 text-body-md text-ink-600"><span className="font-semibold text-ink-900">{p.title}.</span> {p.text}</p>
            </li>
          );
        })}
      </ul>

      <div className={`flex items-start gap-3 rounded-card p-4 ${doctorFirst ? 'border border-primary-200 bg-primary-50' : 'bg-tint'}`}>
        <Stethoscope className="mt-0.5 h-5 w-5 shrink-0 text-primary-600" aria-hidden />
        <p className="text-body-md text-ink-600">
          <span className="font-semibold text-ink-900">{doctor.title}.</span> {doctorFirst ? `${R.doctorLead} ` : ''}{doctor.text}
        </p>
      </div>
    </section>
  );
}
