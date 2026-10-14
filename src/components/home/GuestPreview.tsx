import { COPY, SEVERITY_META } from '@acnevision/shared';
import { SeverityBadge } from '../ui';
import { DEMO_LESION_COUNT, DEMO_SEVERITY, type Zoom } from '../../lib/demoLesions';
import { ZoomBoxes, ZoomPhoto } from './SamplePhoto';

/** A tall crop wide enough to hold every sample lesion (cheeks and chin), so all the boxes the text counts are drawn. */
const FACE_ZOOM: Zoom = { scale: 2, cx: 0.57, cy: 0.53, aspect: 0.8 };

/** "Try it now" preview: the sample photo with every numbered box, the count and the Hayashi estimate. Decorative. */
export function GuestPreview() {
  const p = COPY.home.preview;
  return (
    <div className="flex h-full flex-col rounded-card border border-border bg-white p-5 text-ink-600 shadow-float" aria-hidden>
      <p className="text-label-md text-ink-900">{p.guestPreviewTitle}</p>
      <div className="mt-4 grid flex-1 content-center items-center gap-5 sm:grid-cols-[minmax(0,13rem)_1fr]">
        <ZoomPhoto zoom={FACE_ZOOM} className="mx-auto w-full max-w-[18rem] rounded-btn bg-tint sm:max-w-none">
          <ZoomBoxes zoom={FACE_ZOOM} />
        </ZoomPhoto>
        <div className="space-y-3">
          <p className="tnum text-label-md text-ink-900">{p.guestSummary(DEMO_LESION_COUNT, SEVERITY_META[DEMO_SEVERITY].label)}</p>
          <SeverityBadge severity={DEMO_SEVERITY} isEstimate={false} />
          <p className="text-body-md text-ink-600">{COPY.severityNote}</p>
        </div>
      </div>
    </div>
  );
}
