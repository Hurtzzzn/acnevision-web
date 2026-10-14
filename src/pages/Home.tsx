import { Link } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { ArrowRight, Check, Info } from 'lucide-react';
import { COPY, SEVERITY_META, SEVERITY_ORDER, type ScanListItem } from '@acnevision/shared';
import { useAuth } from '../store/auth';
import { api } from '../lib/runtime';
import { fmtDate } from '../lib/errors';
import { Disclaimer, SeverityChip } from '../components/ui';
import { Reveal } from '../components/Reveal';
import { HeroVisual } from '../components/home/HeroVisual';
import { MemberPreview } from '../components/home/MemberPreview';
import { DetectStepVisual, PhotoStepVisual, ResultStepVisual } from '../components/home/StepVisuals';
import logoOrnament from '../assets/images/logo-480.webp';

const STEP_VISUALS = [PhotoStepVisual, DetectStepVisual, ResultStepVisual];

/** Section rhythm: generous, equal gaps; the tinted and blue sections are rounded panels inside the page container. */
const SECTION_GAP = 'mt-20 md:mt-28';

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
      {/* Fixed-height slot: the link fades in after the fetch without pushing the page down. */}
      <div className="min-h-[2.75rem]">
        {last && (
          <Link to="/history" className="enter-fade flex min-h-[2.75rem] items-center gap-3 rounded-btn bg-primary-50 px-4 py-2 text-sm transition-colors hover:bg-blue-100">
            Scan terakhir: {fmtDate(last.created_at)}
            <SeverityChip severity={last.severity} />
          </Link>
        )}
      </div>
    </div>
  );
}

export default function Home() {
  const c = COPY.home;
  return (
    // -mb-8 cancels the page's bottom padding so the closing panel sits a sensible distance above the footer
    <div className="-mb-8">
      <LastScan />

      <section
        aria-labelledby="hero-title"
        className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-primary-50 via-primary-100/70 to-primary-200/60 px-5 py-8 sm:px-8 md:rounded-[2.5rem] md:px-12 md:py-14 lg:px-16"
      >
        <div className="grid items-center gap-10 md:grid-cols-[1.05fr_0.95fr] md:gap-8">
          <div>
            <h1
              id="hero-title"
              className="enter-up text-[2.5rem] font-bold leading-[1.06] tracking-tight md:text-5xl lg:text-[3.5rem]"
            >
              {c.title}
            </h1>
            <p className="enter-up mt-5 max-w-lg text-[1.0625rem] leading-[1.65] text-ink-600" style={{ animationDelay: '80ms' }}>
              {c.subtitle}
            </p>
            <div className="enter-up mt-8 flex flex-wrap items-center gap-x-5 gap-y-3" style={{ animationDelay: '160ms' }}>
              <Link to="/scan" className="btn-primary rounded-full px-7 py-3.5 text-base">
                {c.cta} <ArrowRight className="h-4 w-4" aria-hidden />
              </Link>
              <p className="flex items-center gap-1.5 text-body-md text-ink-600">
                <Info className="h-4 w-4 shrink-0" aria-hidden /> {c.guestNote}
              </p>
            </div>
            <div className="enter-up mt-6 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-body-md text-ink-600" style={{ animationDelay: '240ms' }}>
              <span>{c.levelsLead}</span>
              <ul className="flex flex-wrap gap-x-3 gap-y-1">
                {SEVERITY_ORDER.map((level) => (
                  <li key={level} className="inline-flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full" style={{ background: SEVERITY_META[level].solid }} aria-hidden />
                    {SEVERITY_META[level].label}
                  </li>
                ))}
              </ul>
            </div>
          </div>
          <HeroVisual />
        </div>
      </section>

      <section className={SECTION_GAP} aria-labelledby="steps-title">
        <Reveal className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div className="max-w-xl">
            <h2 id="steps-title" className="md:text-headline-xl">{c.stepsTitle}</h2>
            <p className="mt-2 text-[1.0625rem]">{c.stepsIntro}</p>
          </div>
          <Link to="/how-it-works" className="inline-flex items-center gap-1.5 self-start rounded-btn py-1 text-label-md text-primary-600 transition-colors hover:text-primary-700 md:self-auto">
            {c.stepsMore} <ArrowRight className="h-4 w-4" aria-hidden />
          </Link>
        </Reveal>

        <ol className="mt-8 space-y-6 md:mt-10 md:space-y-8">
          {c.steps.map((step, i) => {
            const Visual = STEP_VISUALS[i];
            const flip = i % 2 === 1;
            const last = i === c.steps.length - 1;
            return (
              <Reveal as="li" key={step.title} className="relative grid items-center gap-4 pl-14 md:grid-cols-2 md:gap-12 md:pl-0">
                {/* Thin line from this node down to the next one (left edge on phones, center on md+); the nodes sit on top of it */}
                {!last && <span className="absolute left-5 top-5 h-[calc(100%+1.5rem)] w-px bg-primary-200 md:left-1/2 md:top-1/2 md:h-[calc(100%+2rem)]" aria-hidden />}
                <span
                  className="tnum absolute left-0 top-0 z-10 flex h-10 w-10 items-center justify-center rounded-full border-2 border-primary-200 bg-white text-label-md text-primary-600 md:left-1/2 md:top-1/2 md:-translate-x-1/2 md:-translate-y-1/2"
                  aria-hidden
                >
                  {i + 1}
                </span>
                <div className={`max-w-md ${flip ? 'md:order-2' : 'md:justify-self-end'}`}>
                  <h3 className="text-headline-md">{step.title}</h3>
                  <p className="mt-2 text-[1.0625rem]">{step.text}</p>
                </div>
                <div className={`flex w-full ${flip ? 'md:order-1 md:justify-end' : 'md:justify-start'}`}>
                  <Visual />
                </div>
              </Reveal>
            );
          })}
        </ol>
      </section>

      <section
        className={`${SECTION_GAP} rounded-[2rem] bg-tint px-5 py-10 sm:px-8 md:rounded-[2.5rem] md:px-12 md:py-14`}
        aria-labelledby="tiers-title"
      >
        <Reveal className="max-w-xl">
          <h2 id="tiers-title" className="md:text-headline-xl">{c.tiersTitle}</h2>
          <p className="mt-2 text-[1.0625rem]">{c.tiersIntro}</p>
        </Reveal>

        <div className="mt-8 grid gap-5 md:mt-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,2.1fr)]">
          <Reveal delay={100} className="card card-lift flex flex-col bg-white md:p-8">
            <h3 className="text-headline-lg">{c.guestTitle}</h3>
            <ul className="mt-5 space-y-4 text-[1.0625rem]">
              {c.guestItems.map((t) => (
                <li key={t} className="flex gap-3">
                  <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-success/10">
                    <Check className="h-4 w-4 text-success" aria-hidden />
                  </span>
                  {t}
                </li>
              ))}
            </ul>
            <p className="mt-auto pt-6 text-body-md text-ink-600">{c.guestPhotoNote}</p>
            <Link to="/scan" className="btn-outline mt-4 self-start rounded-full">{c.cta}</Link>
          </Reveal>

          <Reveal
            delay={170}
            className="card-lift rounded-[1.75rem] bg-gradient-to-br from-primary-900 to-primary-800 p-6 text-white shadow-float md:p-8"
          >
            <h3 className="text-headline-lg text-white">{c.memberTitle}</h3>
            <ul className="mt-5 space-y-3">
              {c.memberItems.map((t) => (
                <li key={t} className="flex gap-2.5 text-primary-100"><Check className="mt-0.5 h-4 w-4 shrink-0 text-primary-300" aria-hidden />{t}</li>
              ))}
            </ul>
            <div className="mt-6">
              <MemberPreview />
            </div>
            <div className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-3">
              <Link to="/register" className="btn rounded-full bg-white px-6 text-primary-800 hover:bg-primary-50 focus-visible:outline-white">{c.register}</Link>
              <Link to="/login" className="rounded-btn text-label-md text-white underline-offset-4 hover:underline focus-visible:outline-white">{c.login}</Link>
            </div>
          </Reveal>
        </div>

        <Reveal className="mt-8">
          <Disclaimer variant="box" />
        </Reveal>
      </section>

      <Reveal
        as="section"
        className={`${SECTION_GAP} relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-primary-600 to-primary-700 px-6 py-12 text-white sm:px-10 md:rounded-[2.5rem] md:px-16 md:py-16`}
      >
        {/* Oversized logo, desaturated and faded into the blue so it reads as an ornament. Decorative. */}
        <img
          src={logoOrnament}
          alt=""
          width={480}
          height={480}
          loading="lazy"
          decoding="async"
          className="pointer-events-none absolute -bottom-20 -right-16 w-72 opacity-30 [filter:grayscale(1)_brightness(1.8)] md:-right-10 md:w-[26rem]"
        />
        <div className="relative max-w-xl">
          <h2 className="text-3xl font-bold leading-tight tracking-tight text-white md:text-4xl">{c.closing.title}</h2>
          <p className="mt-3 text-[1.0625rem] text-white">{c.closing.text}</p>
          <Link to="/scan" className="btn mt-7 rounded-full bg-white px-7 py-3.5 text-base text-primary-700 hover:bg-primary-50 focus-visible:outline-white">
            {c.cta} <ArrowRight className="h-4 w-4" aria-hidden />
          </Link>
        </div>
      </Reveal>
    </div>
  );
}
