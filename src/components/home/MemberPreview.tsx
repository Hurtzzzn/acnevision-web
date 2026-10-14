import { COPY } from '@acnevision/shared';
import { HeatmapKey, ProbabilityBars } from '../ClassParts';
import { SeverityBadge } from '../ui';
import { DEMO_CONFIDENCE_PCT, DEMO_PROBABILITIES, DEMO_SEVERITY, type Zoom } from '../../lib/demoLesions';
import { ZoomPhoto } from './SamplePhoto';

/** A wider crop than the step 2 close-up (cheek and part of the jaw), so the panel does not repeat the same picture. */
const HEAT_ZOOM: Zoom = { scale: 1.9, cx: 0.575, cy: 0.47, aspect: 1 };

/** "After you sign in" teaser: Grad-CAM over a crop of the sample photo and the model result, drawn with the real bars and badge. Decorative. */
export function MemberPreview() {
  const p = COPY.home.preview;
  return (
    <div className="flex h-full flex-col rounded-card border border-border bg-white p-5 text-ink-600 shadow-float" aria-hidden>
      <p className="text-label-md text-ink-900">{p.memberPreviewTitle}</p>
      <div className="mt-4 grid flex-1 content-center items-center gap-5 sm:grid-cols-[minmax(0,13rem)_1fr]">
        <div>
          <ZoomPhoto zoom={HEAT_ZOOM} heat className="mx-auto w-full max-w-[13rem] rounded-btn bg-tint" />
          <HeatmapKey compact />
        </div>
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <SeverityBadge severity={DEMO_SEVERITY} isEstimate={false} />
            <span className="tnum text-label-md text-ink-900">{COPY.result.confidenceValue(DEMO_CONFIDENCE_PCT)}</span>
          </div>
          <ProbabilityBars probabilities={DEMO_PROBABILITIES} selected={DEMO_SEVERITY} />
        </div>
      </div>
    </div>
  );
}
