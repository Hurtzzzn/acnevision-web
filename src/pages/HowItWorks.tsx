import { Link } from 'react-router-dom';
import { Camera, Check, CheckCircle2, Lock, LogIn, MessageCircle, ScanSearch } from 'lucide-react';
import { COPY, SEVERITY_META, SEVERITY_ORDER } from '@acnevision/shared';

const STEP_ICONS = [Camera, ScanSearch, CheckCircle2, LogIn, MessageCircle];

export default function HowItWorks() {
  const c = COPY.howItWorks;
  const home = COPY.home;
  return (
    <div className="space-y-12">
      <header className="text-center"><h1>{c.title}</h1><p className="mt-2">{c.intro}</p></header>
      <ol className="grid gap-4 md:grid-cols-5">
        {c.steps.map(({ title, text }, i) => {
          const Icon = STEP_ICONS[i];
          return (
            <li key={title} className="card text-center">
              <span className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-primary-50 text-primary-600"><Icon className="h-6 w-6" aria-hidden /></span>
              <p className="text-xs font-semibold text-primary-600">{c.stepLabel(i + 1)}</p>
              <h3 className="text-base">{title}</h3>
              <p className="mt-1 text-sm">{text}</p>
            </li>
          );
        })}
      </ol>

      <section aria-labelledby="access-title">
        <h2 id="access-title" className="mb-2 text-center">{c.accessTitle}</h2>
        <p className="mx-auto mb-6 max-w-xl text-center">{c.accessIntro}</p>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="card">
            <h3 className="text-headline-sm">{home.guestTitle}</h3>
            <ul className="mt-4 space-y-3">
              {home.guestItems.map((t) => (
                <li key={t} className="flex gap-2.5"><Check className="mt-0.5 h-4 w-4 shrink-0 text-success" aria-hidden />{t}</li>
              ))}
            </ul>
            <p className="mt-5 text-body-sm text-ink-500">{home.guestPhotoNote}</p>
          </div>
          <div className="card border-primary-200 bg-primary-50/40">
            <h3 className="flex items-center gap-2 text-headline-sm">
              <Lock className="h-4 w-4 text-primary-600" aria-hidden />{home.memberTitle}
            </h3>
            <ul className="mt-4 space-y-3">
              {home.memberItems.map((t) => (
                <li key={t} className="flex gap-2.5"><Check className="mt-0.5 h-4 w-4 shrink-0 text-primary-600" aria-hidden />{t}</li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <section aria-labelledby="levels-title">
        <h2 id="levels-title" className="mb-2 text-center">{c.severityTitle}</h2>
        <p className="mx-auto mb-6 max-w-xl text-center">{c.severityIntro}</p>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {SEVERITY_ORDER.map((s) => (
            <div key={s} className="card">
              <div className="mb-3 h-16 rounded-btn" style={{ background: SEVERITY_META[s].tint, borderLeft: `4px solid ${SEVERITY_META[s].solid}` }} aria-hidden />
              <h3 className="text-base">{SEVERITY_META[s].label}</h3>
              <p className="mt-2 text-sm">{c.severityText[s]}</p>
            </div>
          ))}
        </div>
      </section>

      <div className="text-center"><Link to="/scan" className="btn-primary">{c.cta}</Link></div>
    </div>
  );
}
