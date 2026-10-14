import type { ReactNode } from 'react';
import { Lock } from 'lucide-react';
import { COPY, SEVERITY_META } from '@acnevision/shared';
import { DEMO_LESION_COUNT, DEMO_SEVERITY } from '../../lib/demoLesions';
import { Crescent } from './Crescent';
import { SampleBoxes, SamplePhoto } from './SamplePhoto';

/**
 * Chip that enters once (outer, `chip-in`) and then bobs slowly (inner, `float-slow`). Two elements so the two animations
 * never share the `transform` property. Reduced motion removes the bobbing (see index.css).
 */
function FloatingChip({ className, delay, duration, children }: { className: string; delay: number; duration: number; children: ReactNode }) {
  return (
    <div className={`absolute ${className}`}>
      <div className="chip-in" style={{ animationDelay: `${delay}ms` }}>
        <div className="float-slow" style={{ animationDuration: `${duration}s`, animationDelay: `${delay + 500}ms` }}>
          <span className="inline-flex items-center gap-2 whitespace-nowrap rounded-full border border-white bg-white/95 px-3 py-1.5 text-[0.8125rem] font-semibold text-ink-900 shadow-float sm:px-3.5 sm:py-2 sm:text-sm">
            {children}
          </span>
        </div>
      </div>
    </div>
  );
}

/**
 * Right side of the hero: a blue crescent that echoes the logo's curve, the sample photo faded into it, thin numbered boxes
 * on the cheek and three floating example chips. Under the photo sit the "Contoh tampilan" note and the one handwritten
 * phrase, in normal flow on a clean background so they never overlap the photo or its ring. Everything except the photo
 * is illustration, hidden from assistive tech.
 */
export function HeroVisual() {
  const p = COPY.home.preview;
  const severity = SEVERITY_META[DEMO_SEVERITY];
  return (
    <div className="mx-auto w-full max-w-[22rem] sm:max-w-[26rem] md:max-w-none">
      <div className="relative">
        <Crescent />

        <SamplePhoto alt={COPY.home.heroAlt} imgClassName="enter-hero-img" imgStyle={{ animationDelay: '120ms' }}>
          <SampleBoxes animated baseDelay={900} />

          <div aria-hidden>
            <FloatingChip className="-left-[4%] top-[7%]" delay={600} duration={5.4}>
              <span className="tnum">{p.lesions(DEMO_LESION_COUNT)}</span>
            </FloatingChip>
            <FloatingChip className="-right-[4%] top-[22%]" delay={740} duration={6.4}>
              <span className="h-2.5 w-2.5 rounded-full" style={{ background: severity.solid }} />
              {p.estimate(severity.label)}
            </FloatingChip>
            <FloatingChip className="-left-[2%] bottom-[22%]" delay={880} duration={5.8}>
              <Lock className="h-3.5 w-3.5 text-ink-500" aria-hidden />
              {p.lockedChip}
            </FloatingChip>
          </div>
        </SamplePhoto>
      </div>

      <div className="enter-fade mt-6 flex flex-wrap items-center justify-between gap-x-4 gap-y-2 px-1" style={{ animationDelay: '1000ms' }} aria-hidden>
        <span className="rounded-full bg-white/85 px-3 py-1 text-xs font-medium text-ink-700">{p.sample}</span>
        <p className="-rotate-2 whitespace-nowrap font-script text-[1.65rem] leading-none text-primary-800 sm:text-3xl">{p.handwritten}</p>
      </div>
    </div>
  );
}
