import { useId, useState } from 'react';
import { Bot, ChevronDown, Droplets, FlaskConical, HandMetal, Stethoscope, type LucideIcon } from 'lucide-react';
import { COPY, leadsWithDoctor, type Severity } from '@acnevision/shared';

const R = COPY.recommendation;
const POINT_ICONS: Record<string, LucideIcon> = { cleansing: Droplets, actives: FlaskConical, avoid: HandMetal, doctor: Stethoscope };

/**
 * Care recommendation: the assistant's own text in one card, then general guidance. "Kapan ke Dokter" is always visible
 * (highlighted when the AI's severity is moderate or higher); the three care points fold away until asked for. Tone stays calm.
 * `severity` is the model's result; null (no lesions, so no severity) keeps the note low-key.
 */
export function Recommendation({ text, isFallback, loading, severity }: {
  text: string | null; isFallback?: boolean; loading: boolean; severity: Severity | null;
}) {
  const uid = useId();
  const [open, setOpen] = useState(false);
  const doctorFirst = leadsWithDoctor(severity);
  const doctor = R.points.find((p) => p.key === 'doctor')!;
  const care = R.points.filter((p) => p.key !== 'doctor');
  const DoctorIcon = POINT_ICONS.doctor;

  return (
    <section aria-labelledby="rec-title" className="space-y-4">
      <div className="card">
        <div className="flex flex-wrap items-center gap-2">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-btn bg-primary-50 text-primary-600" aria-hidden><Bot className="h-5 w-5" /></span>
          <h2 id="rec-title" className="text-headline-sm">{R.aiTitle}</h2>
          <span className="badge bg-primary-50 text-primary-700">{R.aiBadge}</span>
        </div>
        {/* Reserved height: the text arrives after a request, and must not push the cards below it down */}
        <div className="mt-3 min-h-40 text-body-md sm:min-h-20" aria-live="polite">
          {loading && (
            <div role="status" className="space-y-3">
              <span className="sr-only">{R.aiLoading}</span>
              {[100, 95, 100, 70].map((w, i) => <div key={i} className="h-3 animate-pulse rounded-full bg-tint" style={{ width: `${w}%` }} aria-hidden />)}
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

        <div className={`card mt-3 flex items-start gap-3 ${doctorFirst ? 'border-primary-200 bg-primary-50' : ''}`}>
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-btn bg-primary-50 text-primary-600" aria-hidden><DoctorIcon className="h-5 w-5" /></span>
          <div>
            <h4 className="text-label-lg text-ink-900">{doctor.title}</h4>
            <p className="mt-1 text-body-md text-ink-600">{doctorFirst ? `${R.doctorLead} ${doctor.text}` : doctor.text}</p>
          </div>
        </div>

        <button
          type="button" aria-expanded={open} aria-controls={`${uid}-care`}
          onClick={() => setOpen((o) => !o)}
          className="-ml-2 mt-2 inline-flex items-center gap-1.5 rounded-control px-2 py-2 text-label-md text-primary-600 hover:underline"
        >
          {open ? R.showLess : R.showMore}
          <ChevronDown className={`h-4 w-4 transition-transform ${open ? 'rotate-180' : ''}`} aria-hidden />
        </button>

        <ul id={`${uid}-care`} className={open ? 'mt-1 grid gap-4 sm:grid-cols-3' : 'hidden'}>
          {care.map((p) => {
            const Icon = POINT_ICONS[p.key];
            return (
              <li key={p.key} className="card flex flex-col gap-2">
                <span className="flex h-9 w-9 items-center justify-center rounded-btn bg-primary-50 text-primary-600" aria-hidden><Icon className="h-5 w-5" /></span>
                <h4 className="text-label-lg text-ink-900">{p.title}</h4>
                <p className="text-body-md text-ink-600">{p.text}</p>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
