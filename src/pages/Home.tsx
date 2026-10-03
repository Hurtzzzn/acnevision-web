import { Link } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { ArrowRight, Camera, Check, Info, ScanSearch, Sparkles, LineChart, Lock } from 'lucide-react';
import { ACNE_CLASSES, CLASS_META, COPY, SEVERITY_META, type ScanListItem } from '@acnevision/shared';
import { useAuth } from '../store/auth';
import { api } from '../lib/runtime';
import { fmtDate } from '../lib/errors';
import { Disclaimer } from '../components/ui';
import heroImage from '../assets/images/heroine.png';

const STEP_ICONS = [Camera, ScanSearch, LineChart];

function LastScan() {
  const { user } = useAuth();
  const [last, setLast] = useState<ScanListItem | null>(null);
  useEffect(() => {
    if (!user) return;
    api.listScans(1, 1).then((r) => setLast(r.items[0] ?? null)).catch(() => setLast(null));
  }, [user]);
  if (!user) return null;
  return (
    <div className="card mb-8 flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
      <p className="text-ink-900">Halo, <b>{user.full_name ?? user.email}</b></p>
      {last && (
        <Link to="/history" className="flex items-center gap-3 rounded-btn bg-primary-50 px-4 py-2 text-sm hover:bg-blue-100">
          Scan terakhir: {fmtDate(last.created_at)}
          <span className="badge" style={{ background: SEVERITY_META[last.severity].bg, color: SEVERITY_META[last.severity].text }}>
            {SEVERITY_META[last.severity].label}
          </span>
        </Link>
      )}
    </div>
  );
}

export default function Home() {
  const c = COPY.home;
  return (
    <div>
      <LastScan />

      <section className="grid items-center gap-8 bg-white md:grid-cols-2 md:gap-10 lg:py-6">
        <div>
          <span className="badge mb-5 gap-1.5 bg-primary-50 text-primary-600">
            <Sparkles className="h-3.5 w-3.5" aria-hidden /> {c.badge}
          </span>
          <h1 className="text-display-sm md:text-display">{c.title}</h1>
          <p className="mt-4 max-w-lg text-body-lg">{c.subtitle}</p>
          <div className="mt-7 flex flex-wrap items-center gap-x-5 gap-y-3">
            <Link to="/scan" className="btn-primary rounded-full px-6 py-3">
              {c.cta} <ArrowRight className="h-4 w-4" aria-hidden />
            </Link>
            <p className="flex items-center gap-1.5 text-body-md text-ink-500">
              <Info className="h-4 w-4 shrink-0" aria-hidden /> {c.guestNote}
            </p>
          </div>
          <div className="mt-8 max-w-lg rounded-card bg-tint p-4">
            <p className="text-label-md text-ink-900">{c.lesionTypesTitle}</p>
            <ul className="mt-3 flex flex-wrap gap-2">
              {ACNE_CLASSES.map((cls) => (
                <li key={cls} className="inline-flex items-center gap-1.5 rounded-full border border-border bg-white px-3 py-1 text-label-sm text-ink-700">
                  <span className="h-2 w-2 rounded-full" style={{ background: CLASS_META[cls].color }} aria-hidden />
                  {cls}
                </li>
              ))}
            </ul>
          </div>
        </div>
        <img
          src={heroImage}
          alt={c.heroAlt}
          width={1536}
          height={1024}
          loading="eager"
          decoding="async"
          className="mx-auto h-auto w-full max-w-xl md:max-w-none"
        />
      </section>

      <section className="mt-16 rounded-card bg-tint px-gutter-sm py-10 md:px-margin md:py-14" aria-labelledby="steps-title">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-label-sm uppercase text-primary-600">{c.stepsEyebrow}</p>
          <h2 id="steps-title" className="mt-1">{c.stepsTitle}</h2>
          <p className="mt-2">{c.stepsIntro}</p>
        </div>
        <ol className="mt-8 grid gap-gutter md:grid-cols-3">
          {c.steps.map((step, i) => {
            const Icon = STEP_ICONS[i];
            return (
              <li key={step.title} className="card">
                <div className="flex items-center justify-between">
                  <span className="flex h-11 w-11 items-center justify-center rounded-btn bg-primary-50 text-primary-600">
                    <Icon className="h-5 w-5" aria-hidden />
                  </span>
                  <span className="tnum text-label-md text-ink-500" aria-hidden>0{i + 1}</span>
                </div>
                <h3 className="mt-4 text-headline-sm">{step.title}</h3>
                <p className="mt-2">{step.text}</p>
              </li>
            );
          })}
        </ol>
      </section>

      <section className="mt-16" aria-labelledby="tiers-title">
        <div className="mx-auto max-w-2xl text-center">
          <h2 id="tiers-title">{c.tiersTitle}</h2>
          <p className="mt-2">{c.tiersIntro}</p>
        </div>
        <div className="mt-8 grid gap-gutter md:grid-cols-2">
          <div className="card">
            <h3 className="text-headline-sm">{c.guestTitle}</h3>
            <ul className="mt-4 space-y-3">
              {c.guestItems.map((t) => (
                <li key={t} className="flex gap-2.5"><Check className="mt-0.5 h-4 w-4 shrink-0 text-success" aria-hidden />{t}</li>
              ))}
            </ul>
            <p className="mt-5 text-body-sm text-ink-500">{c.guestPhotoNote}</p>
            <Link to="/scan" className="btn-outline mt-5 rounded-full">{c.cta}</Link>
          </div>
          <div className="card border-primary-200 bg-primary-50/40">
            <h3 className="flex items-center gap-2 text-headline-sm">
              <Lock className="h-4 w-4 text-primary-600" aria-hidden />{c.memberTitle}
            </h3>
            <ul className="mt-4 space-y-3">
              {c.memberItems.map((t) => (
                <li key={t} className="flex gap-2.5"><Check className="mt-0.5 h-4 w-4 shrink-0 text-primary-600" aria-hidden />{t}</li>
              ))}
            </ul>
            <div className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-2">
              <Link to="/register" className="btn-primary rounded-full">{c.register}</Link>
              <Link to="/login" className="text-label-md text-primary-600 hover:text-primary-700">{c.login}</Link>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto mt-14 max-w-3xl">
        <Disclaimer variant="box" />
      </section>
    </div>
  );
}
