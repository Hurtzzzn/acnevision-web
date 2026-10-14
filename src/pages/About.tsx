import { Link } from 'react-router-dom';
import { ArrowRight, Camera, Gauge, ScanSearch } from 'lucide-react';
import { COPY, SEVERITY_META, SEVERITY_ORDER } from '@acnevision/shared';
import { Reveal } from '../components/Reveal';
import { Crescent } from '../components/home/Crescent';
import { SampleBoxes, SamplePhoto } from '../components/home/SamplePhoto';

const STAGE_ICONS = [Camera, ScanSearch, Gauge];
const SECTION_GAP = 'mt-20 md:mt-28';

/** The four severity levels as a colored bar plus a 2x2 legend, so no level depends on color alone. */
function LevelsLegend() {
  return (
    <div className="mt-4 max-w-xs">
      <div className="flex gap-1" aria-hidden>
        {SEVERITY_ORDER.map((k) => <span key={k} className="h-1.5 flex-1 rounded-full" style={{ background: SEVERITY_META[k].solid }} />)}
      </div>
      <ul className="mt-2.5 grid grid-cols-2 gap-x-4 gap-y-1.5 text-sm text-ink-600" aria-label={COPY.about.levelsLabel}>
        {SEVERITY_ORDER.map((k) => (
          <li key={k} className="flex items-center gap-2">
            <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: SEVERITY_META[k].solid }} aria-hidden />
            {SEVERITY_META[k].label}
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function About() {
  const c = COPY.about;
  return (
    <div>
      <header className="grid items-center gap-12 md:grid-cols-[1.1fr_1fr] md:gap-16">
        <div className="enter-up max-w-xl">
          <h1 className="text-[2.25rem] font-bold leading-[1.1] tracking-tight md:text-5xl">{c.title}</h1>
          <p className="mt-5 text-[1.0625rem] leading-[1.65]">{c.intro}</p>
        </div>
        <div className="relative mx-auto w-full max-w-[20rem] sm:max-w-[24rem] md:max-w-none">
          <Crescent />
          <SamplePhoto alt={c.photoAlt} imgClassName="enter-hero-img" imgStyle={{ animationDelay: '120ms' }}>
            <SampleBoxes animated baseDelay={700} />
          </SamplePhoto>
        </div>
      </header>

      <section className={SECTION_GAP} aria-labelledby="principles-title">
        <Reveal>
          <h2 id="principles-title" className="md:text-headline-xl">{c.principlesTitle}</h2>
        </Reveal>
        <ol className="mt-8 border-t border-border">
          {c.principles.map((p, i) => (
            <Reveal as="li" key={p.title} delay={i * 60} className="grid items-baseline gap-x-10 gap-y-2 border-b border-border py-8 md:grid-cols-[6rem_1fr_1.2fr] md:py-10">
              <span className="tnum text-4xl font-bold leading-none tracking-tight text-primary-500 md:text-6xl">{String(i + 1).padStart(2, '0')}</span>
              <h3 className="text-headline-md md:text-headline-lg">{p.title}</h3>
              <p className="text-[1.0625rem]">{p.text}</p>
            </Reveal>
          ))}
        </ol>
      </section>

      <section className={SECTION_GAP} aria-labelledby="build-title">
        <Reveal>
          <h2 id="build-title" className="md:text-headline-xl">{c.buildTitle}</h2>
        </Reveal>
        <ol className="mt-8 grid gap-10 md:grid-cols-3 md:gap-0">
          {c.stages.map((s, i) => {
            const Icon = STAGE_ICONS[i];
            const last = i === c.stages.length - 1;
            return (
              <Reveal as="li" key={s.title} delay={i * 80} className="relative pl-16 md:pl-0 md:pr-8">
                {/* Phones: vertical line down the icon column. Desktop: horizontal line to the next stage. */}
                {!last && <span className="absolute -bottom-8 left-6 top-14 w-px bg-primary-200 md:hidden" aria-hidden />}
                {!last && <span className="absolute left-14 right-4 top-6 hidden h-px bg-primary-200 md:block" aria-hidden />}
                <span className="absolute left-0 top-0 flex h-12 w-12 items-center justify-center rounded-full bg-primary-50 text-primary-600 ring-4 ring-canvas md:relative">
                  <Icon className="h-5 w-5" aria-hidden />
                </span>
                <p className="tnum text-label-md text-primary-700 md:mt-4">{c.stageLabel(i + 1)}</p>
                <h3 className="mt-0.5 text-headline-sm">{s.title}</h3>
                <p className="mt-1.5 max-w-xs text-body-md">{s.text}</p>
                {last && <LevelsLegend />}
              </Reveal>
            );
          })}
        </ol>
        <Reveal className="mt-10 max-w-2xl">
          <p className="text-[1.0625rem]">{c.buildNote}</p>
        </Reveal>
      </section>

      <section className={SECTION_GAP} aria-labelledby="limits-title">
        <Reveal className="grid gap-6 md:grid-cols-[1fr_1.6fr] md:gap-16">
          <h2 id="limits-title" className="md:text-headline-xl">{c.limitsTitle}</h2>
          <div className="soft-panel">
            <ul className="space-y-3">
              {c.limits.map((item) => (
                <li key={item} className="flex gap-3">
                  <span className="mt-2.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary-600" aria-hidden />
                  {item}
                </li>
              ))}
            </ul>
            <p className="mt-4 border-t border-border pt-4 text-ink-900">{c.limitsDoctor}</p>
          </div>
        </Reveal>
      </section>

      <Reveal as="section" className={`${SECTION_GAP} relative overflow-hidden border-t border-border pt-10 md:pt-14`} aria-labelledby="cta-title">
        <Crescent className="pointer-events-none absolute -right-28 top-4 h-72 w-72 opacity-25 md:-right-12 md:top-1/2 md:h-96 md:w-96 md:-translate-y-1/2" />
        <div className="relative flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div className="max-w-lg">
            <h2 id="cta-title" className="md:text-headline-xl">{c.ctaTitle}</h2>
            <p className="mt-2 text-[1.0625rem]">{c.ctaText}</p>
          </div>
          <Link to="/scan" className="btn-primary self-start rounded-full px-7 py-3.5 text-base md:mr-16 md:self-auto">
            {COPY.nav.tryDetection} <ArrowRight className="h-4 w-4" aria-hidden />
          </Link>
        </div>
        <p className="relative mt-12 text-sm text-ink-500">{c.partner}</p>
      </Reveal>
    </div>
  );
}
