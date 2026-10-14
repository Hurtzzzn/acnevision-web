import type { ComponentType } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Lock, Sparkles } from 'lucide-react';
import { COPY } from '@acnevision/shared';
import { Reveal } from '../components/Reveal';
import { Faq } from '../components/Faq';
import { LockedPreview } from '../components/LockedPreview';
import { SeverityExplorer } from '../components/SeverityExplorer';
import { DetectStepVisual, Frame, PhotoStepVisual, ResultStepVisual } from '../components/home/StepVisuals';
import { DEMO_LESION_COUNT } from '../lib/demoLesions';
import { authPath, NEW_ANALYSIS_PATH } from '../lib/redirect';

/** Step 4: the same locked preview as the UpgradeCard, on the soft step frame. */
function LockedStepVisual() {
  return (
    <Frame>
      <div className="rounded-card bg-white p-3 sm:p-4">
        <LockedPreview />
      </div>
      <p className="mt-3 text-center text-body-sm text-ink-600">{COPY.howItWorks.gradcamCaption}</p>
    </Frame>
  );
}

/** Step 5: a short sample exchange with the assistant. Uses the shared sample count so it agrees with steps 2 and 3. */
function ChatStepVisual() {
  const sample = COPY.howItWorks.chatSample;
  return (
    <Frame>
      <div className="space-y-3 rounded-card bg-white p-4 shadow-card">
        <p className="ml-auto w-fit max-w-[85%] rounded-2xl rounded-br-md bg-primary-600 px-4 py-2.5 text-body-md text-white">{COPY.chat.quick[1]}</p>
        <div className="flex items-start gap-2.5">
          <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary-50 text-primary-600">
            <Sparkles className="h-4 w-4" />
          </span>
          <div className="rounded-2xl rounded-tl-md bg-tint px-4 py-3">
            <p className="text-label-sm text-ink-500">{sample.assistant}</p>
            <p className="mt-1 text-body-md text-ink-900">{sample.reply(DEMO_LESION_COUNT)}</p>
          </div>
        </div>
      </div>
      <p className="mt-3 text-center text-body-sm text-ink-500">{COPY.upgrade.previewCaption}</p>
    </Frame>
  );
}

/** Step 2 here also shows the dashed "less sure" box that the text explains. */
function DetectWithKeyVisual() {
  return <DetectStepVisual showUncertain />;
}

const STEP_VISUALS: ComponentType[] = [PhotoStepVisual, DetectWithKeyVisual, ResultStepVisual, LockedStepVisual, ChatStepVisual];

const SECTION_GAP = 'mt-20 md:mt-28';

/** One zigzag step: number node on a thin center line (left edge on phones), text on one side, illustration on the other. */
function Step({ index, last }: { index: number; last: boolean }) {
  const step = COPY.howItWorks.steps[index];
  const Visual = STEP_VISUALS[index];
  const flip = index % 2 === 1;
  return (
    <Reveal as="li" className="relative grid items-center gap-4 pl-14 md:grid-cols-2 md:gap-12 md:pl-0">
      {!last && <span className="absolute left-5 top-5 h-[calc(100%+1.5rem)] w-px bg-primary-200 md:left-1/2 md:top-1/2 md:h-[calc(100%+2rem)]" aria-hidden />}
      <span
        className="tnum absolute left-0 top-0 z-10 flex h-10 w-10 items-center justify-center rounded-full border-2 border-primary-200 bg-white text-label-md text-primary-600 md:left-1/2 md:top-1/2 md:-translate-x-1/2 md:-translate-y-1/2"
        aria-hidden
      >
        {index + 1}
      </span>
      <div className={`max-w-md ${flip ? 'md:order-2' : 'md:justify-self-end'}`}>
        <h3 className="text-headline-md">{step.title}</h3>
        <p className="mt-2 text-[1.0625rem]">{step.text}</p>
        <ul className="mt-4 space-y-2.5">
          {step.points.map((point) => (
            <li key={point} className="flex gap-2.5 text-body-md text-ink-600">
              <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-primary-600" aria-hidden />
              {point}
            </li>
          ))}
        </ul>
      </div>
      <div className={`flex w-full ${flip ? 'md:order-1 md:justify-end' : 'md:justify-start'}`}>
        <Visual />
      </div>
    </Reveal>
  );
}

export default function HowItWorks() {
  const c = COPY.howItWorks;
  return (
    <div>
      <header className="enter-up max-w-2xl">
        <h1 className="text-[2.25rem] font-bold leading-[1.1] tracking-tight md:text-5xl">{c.title}</h1>
        <p className="mt-3 text-[1.0625rem] leading-[1.65]">{c.intro}</p>
      </header>

      <section className="mt-12 md:mt-16" aria-labelledby="free-title">
        <h2 id="free-title" className="mb-8 md:mb-10 md:text-headline-xl">{c.freeGroup}</h2>
        <ol className="space-y-6 md:space-y-8">
          {[0, 1, 2].map((i) => <Step key={i} index={i} last={i === 2} />)}
        </ol>
      </section>

      {/* Plain block (not a separator role) so screen readers read the label and the text */}
      <Reveal className="my-12 md:my-16">
        <div className="flex items-center gap-4">
          <span className="h-px flex-1 bg-primary-200" aria-hidden />
          <span className="inline-flex items-center gap-2 rounded-full border border-primary-200 bg-primary-50 px-4 py-2 text-label-md text-primary-700">
            <Lock className="h-4 w-4" aria-hidden /> {c.gateLabel}
          </span>
          <span className="h-px flex-1 bg-primary-200" aria-hidden />
        </div>
        <p className="mx-auto mt-4 max-w-xl text-center text-[1.0625rem]">{c.gateText}</p>
        <p className="mt-2 flex flex-wrap justify-center gap-x-6">
          <Link to={authPath('/login', NEW_ANALYSIS_PATH)} className="inline-flex min-h-11 items-center rounded-btn text-label-md text-primary-600 underline-offset-4 transition-colors hover:text-primary-700 hover:underline">{COPY.upgrade.login}</Link>
          <Link to={authPath('/register', NEW_ANALYSIS_PATH)} className="inline-flex min-h-11 items-center rounded-btn text-label-md text-primary-600 underline-offset-4 transition-colors hover:text-primary-700 hover:underline">{COPY.upgrade.register}</Link>
        </p>
      </Reveal>

      <section aria-labelledby="full-title">
        <h2 id="full-title" className="mb-8 md:mb-10 md:text-headline-xl">{c.fullGroup}</h2>
        <ol start={4} className="space-y-6 md:space-y-8">
          {[3, 4].map((i) => <Step key={i} index={i} last={i === 4} />)}
        </ol>
      </section>

      <section className={SECTION_GAP} aria-labelledby="levels-title">
        <Reveal className="max-w-xl">
          <h2 id="levels-title" className="md:text-headline-xl">{c.severityTitle}</h2>
          <p className="mt-2 text-[1.0625rem]">{c.severityIntro}</p>
        </Reveal>
        <div className="mt-8 max-w-3xl">
          <SeverityExplorer />
        </div>
      </section>

      <section className={SECTION_GAP} aria-labelledby="faq-title">
        <h2 id="faq-title" className="mb-6 md:text-headline-xl">{c.faqTitle}</h2>
        <div className="max-w-3xl">
          <Faq items={c.faq} />
        </div>
      </section>

      <Reveal as="section" className={`${SECTION_GAP} rounded-[2rem] bg-gradient-to-br from-primary-50 to-primary-100/70 px-5 py-10 text-center md:px-12 md:py-14`} aria-labelledby="cta-title">
        <h2 id="cta-title" className="md:text-headline-xl">{c.ctaTitle}</h2>
        <p className="mx-auto mt-2 max-w-md text-[1.0625rem]">{c.ctaText}</p>
        <Link to="/scan" className="btn-primary mt-6 rounded-full px-7 py-3.5 text-base">
          {COPY.nav.tryDetection} <ArrowRight className="h-4 w-4" aria-hidden />
        </Link>
      </Reveal>
    </div>
  );
}
