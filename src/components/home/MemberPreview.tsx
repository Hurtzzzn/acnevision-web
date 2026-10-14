import { COPY, type Severity } from '@acnevision/shared';
import { HeatmapKey, ProbabilityBars } from '../ClassParts';
import { SeverityBadge } from '../ui';
import { ZoomHeat, ZoomPhoto, type Zoom } from './SamplePhoto';

/** A wider crop than the step 2 close-up (cheek and part of the jaw), so the panel does not repeat the same picture. */
const HEAT_ZOOM: Zoom = { scale: 1.9, cx: 54, cy: 47, aspect: 1 };

/** Sample numbers for the illustration only; they describe no real analysis. */
const SAMPLE_PROBABILITIES: Record<Severity, number> = { mild: 0.05, moderate: 0.82, severe: 0.11, very_severe: 0.02 };

/** "After you sign in" teaser: Grad-CAM over a crop of the sample photo and the model result, drawn with the real bars and badge. Decorative. */
export function MemberPreview() {
  const p = COPY.home.preview;
  return (
    <div className="rounded-card bg-white p-5 text-ink-600 shadow-float" aria-hidden>
      <div className="flex items-center justify-between gap-3">
        <p className="text-label-md text-ink-900">{p.memberPreviewTitle}</p>
        <span className="shrink-0 whitespace-nowrap rounded-full bg-primary-50 px-2.5 py-1 text-xs font-medium text-primary-800">{p.sample}</span>
      </div>
      <div className="mt-4 grid items-center gap-5 sm:grid-cols-[minmax(0,13rem)_1fr]">
        <div>
          <ZoomPhoto zoom={HEAT_ZOOM} className="mx-auto w-full max-w-[13rem] rounded-btn bg-tint">
            <ZoomHeat zoom={HEAT_ZOOM} />
          </ZoomPhoto>
          <HeatmapKey />
        </div>
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <SeverityBadge severity="moderate" isEstimate={false} />
            <span className="tnum text-label-md text-ink-900">{COPY.result.confidenceValue(82)}</span>
          </div>
          <ProbabilityBars probabilities={SAMPLE_PROBABILITIES} selected="moderate" />
        </div>
      </div>
    </div>
  );
}
