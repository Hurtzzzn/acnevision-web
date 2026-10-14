import type { ReactNode } from 'react';
import { Camera, Upload } from 'lucide-react';
import { COPY } from '@acnevision/shared';
import { SeverityScale } from '../SeverityScale';
import { SeverityBadge } from '../ui';
import { DEMO_LESION_COUNT, DEMO_SEVERITY, lesionsInZoom, type Zoom } from '../../lib/demoLesions';
import hero640 from '../../assets/images/heroine-640.webp';
import { ZoomBoxes, ZoomPhoto } from './SamplePhoto';

/** Close-up of the cheek for step 2: it frames only some of the sample lesions, so its label says "N dari total". */
const CHEEK_ZOOM: Zoom = { scale: 2.6, cx: 0.59, cy: 0.475, aspect: 1.6 };

/** Shared frame for the three step illustrations: a soft rounded panel, decorative, hidden from assistive tech. */
export function Frame({ children }: { children: ReactNode }) {
  return (
    <div className="w-full max-w-md rounded-[1.5rem] bg-gradient-to-br from-primary-50 to-primary-100/70 p-4 sm:p-5" aria-hidden>
      {children}
    </div>
  );
}

/** Step 1: a blurred sample photo as a camera preview with the face guide and camera button, plus the two ways to provide a photo (labels reuse the scan tabs). */
export function PhotoStepVisual() {
  return (
    <Frame>
      <div className="relative flex aspect-video items-center justify-center overflow-hidden rounded-card bg-primary-100">
        <img src={hero640} alt="" width={640} height={647} loading="lazy" decoding="async" className="absolute inset-0 h-full w-full scale-110 object-cover object-[50%_30%] opacity-70 blur-md" />
        <svg viewBox="0 0 120 150" className="relative h-[82%]" fill="none">
          <ellipse cx="60" cy="75" rx="46" ry="62" stroke="#FFFFFF" strokeWidth="2.5" strokeDasharray="6 6" />
        </svg>
        <span className="absolute flex h-16 w-16 items-center justify-center rounded-full bg-primary-600 text-white shadow-float">
          <Camera className="h-8 w-8" />
        </span>
      </div>
      <div className="mt-4 flex flex-wrap justify-center gap-3">
        <span className="inline-flex items-center gap-2 rounded-full bg-primary-600 px-4 py-2 text-label-md text-white">
          <Camera className="h-4 w-4" /> {COPY.scan.tabCamera}
        </span>
        <span className="inline-flex items-center gap-2 rounded-full border border-border bg-white px-4 py-2 text-label-md text-ink-700 shadow-card">
          <Upload className="h-4 w-4 text-primary-600" /> {COPY.scan.tabUpload}
        </span>
      </div>
    </Frame>
  );
}

/** Step 2: a close-up of the cheek with example detection boxes and the lesion count. `showUncertain` draws one box dashed and adds its key. */
export function DetectStepVisual({ showUncertain = false }: { showUncertain?: boolean }) {
  const inZoom = lesionsInZoom(CHEEK_ZOOM);
  const uncertain = showUncertain ? inZoom[inZoom.length - 1]?.n : undefined;
  return (
    <Frame>
      <ZoomPhoto zoom={CHEEK_ZOOM} className="rounded-card bg-white">
        <ZoomBoxes zoom={CHEEK_ZOOM} uncertain={uncertain} />
      </ZoomPhoto>
      <div className="mt-4 flex flex-wrap items-center justify-center gap-x-4 gap-y-2">
        <span className="tnum inline-flex items-center rounded-full bg-white px-4 py-2 text-label-md text-ink-700 shadow-card">
          {COPY.home.preview.lesionsPartial(inZoom.length, DEMO_LESION_COUNT)}
        </span>
        {showUncertain && <span className="text-body-sm text-ink-600">{COPY.howItWorks.boxKey}</span>}
      </div>
    </Frame>
  );
}

/** Step 3: a result card built from the real scale and badge components, with the shared sample numbers. */
export function ResultStepVisual() {
  return (
    <Frame>
      <div className="space-y-4 rounded-card border border-border bg-white p-4 shadow-card sm:p-5">
        <p className="text-headline-md text-ink-900 sm:text-headline-lg">
          <span className="tnum text-primary-600">{DEMO_LESION_COUNT}</span> {COPY.detectResult.countUnit}
        </p>
        <div className="space-y-3">
          <p className="text-label-md text-ink-600">{COPY.detectResult.severityTitle}</p>
          <SeverityBadge severity={DEMO_SEVERITY} isEstimate={false} large />
          <div className="pt-2">
            <SeverityScale severity={DEMO_SEVERITY} total={DEMO_LESION_COUNT} large />
          </div>
          <p className="text-body-md text-ink-600">{COPY.severityNote}</p>
        </div>
      </div>
    </Frame>
  );
}
