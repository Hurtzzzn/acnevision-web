import { Lock } from 'lucide-react';
import { COPY, SEVERITY_META, SEVERITY_ORDER } from '@acnevision/shared';
import { DEMO_CONFIDENCE_PCT, DEMO_PROBABILITIES, type Zoom } from '../lib/demoLesions';
import { HeatmapKey } from './ClassParts';
import { ZoomPhoto } from './home/SamplePhoto';

/** Right cheek of the sample photo (the Home hero), where the sample lesions sit. */
const CHEEK_ZOOM: Zoom = { scale: 2.8, cx: 0.59, cy: 0.48, aspect: 1.6 };

const pct = (p: number) => `${Math.round(p * 100)}%`;

/**
 * The one locked "after you sign in" preview, shared by the guest UpgradeCard and the Home preview so they stay identical.
 * The sample photo with its sample Grad-CAM heat map is blurred so heavily that face and lesions cannot be made out, while the
 * warm heat colors still bleed through as a heat map; a lock and "Masuk untuk melihat" sit on top. The color key and the
 * numbers (class percentages, confidence) are blurred and locked too. Never derived from the guest's photo. Decorative only,
 * so it is hidden from assistive tech; the unlock list next to it carries the same information.
 * `side` puts the numbers next to the picture from `sm` (wide containers); otherwise everything stacks.
 */
export function LockedPreview({ side = false, className = '' }: { side?: boolean; className?: string }) {
  return (
    <div className={className} aria-hidden>
      <div className={side ? 'grid items-center gap-4 sm:grid-cols-[minmax(0,15rem)_1fr]' : 'space-y-3'}>
        <div>
          <div className="relative overflow-hidden rounded-btn bg-tint">
            {/* Scaled up a little so the blur never fades into transparent edges */}
            <div className="scale-125 blur-[18px] saturate-150">
              <ZoomPhoto zoom={CHEEK_ZOOM} heat />
            </div>
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-1.5 bg-white/20">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-ink-600 shadow-card">
                <Lock className="h-4 w-4" />
              </span>
              <span className="rounded-full bg-white/90 px-2.5 py-1 text-label-sm text-ink-900">{COPY.upgrade.previewLock}</span>
            </div>
          </div>
          <HeatmapKey compact />
        </div>

        <div className="rounded-btn bg-white p-3">
          <div className="flex items-center justify-between gap-2 text-label-md text-ink-900">
            <span className="whitespace-nowrap">{COPY.upgrade.previewConfidence}</span>
            <span className="inline-flex items-center gap-1.5">
              <span className="tnum select-none blur-[5px]">{pct(DEMO_CONFIDENCE_PCT / 100)}</span>
              <Lock className="h-3.5 w-3.5 text-ink-500" />
            </span>
          </div>
          <ul className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1.5">
            {SEVERITY_ORDER.map((s) => (
              <li key={s} className="flex items-center justify-between gap-2 text-body-sm text-ink-600">
                <span className="whitespace-nowrap">{SEVERITY_META[s].label}</span>
                <span className="tnum select-none blur-[5px]">{pct(DEMO_PROBABILITIES[s])}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <p className="mt-2 text-body-sm text-ink-500">{COPY.upgrade.previewCaption}</p>
    </div>
  );
}
