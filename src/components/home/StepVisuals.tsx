import type { ReactNode } from 'react';
import { Camera, Upload } from 'lucide-react';
import { COPY } from '@acnevision/shared';
import { SeverityScale } from '../SeverityScale';
import { SeverityBadge } from '../ui';
import { ZoomBoxes, ZoomPhoto, type Zoom } from './SamplePhoto';

/** Close-up of the cheek for step 2: three times the hero's framing, boxes drawn large enough to read. */
const CHEEK_ZOOM: Zoom = { scale: 2.6, cx: 60, cy: 48, aspect: 1.6 };

/** Shared frame for the three step illustrations: a soft rounded panel, decorative, hidden from assistive tech. */
function Frame({ children }: { children: ReactNode }) {
  return (
    <div className="w-full max-w-md rounded-[1.5rem] bg-gradient-to-br from-primary-50 to-primary-100/70 p-4 sm:p-5" aria-hidden>
      {children}
    </div>
  );
}

/** Step 1: no photo, just the two ways to provide one, drawn as the scan screen's camera guide and its source buttons (labels reuse the scan tabs). */
export function PhotoStepVisual() {
  return (
    <Frame>
      <div className="relative flex aspect-video items-center justify-center rounded-card border-2 border-dashed border-primary-200 bg-white/70">
        <svg viewBox="0 0 120 150" className="h-[82%]" fill="none">
          <ellipse cx="60" cy="75" rx="46" ry="62" stroke="#93C5FD" strokeWidth="2" strokeDasharray="6 6" />
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

/** Step 2: a close-up of the cheek with example detection boxes and the lesion count. */
export function DetectStepVisual() {
  return (
    <Frame>
      <ZoomPhoto zoom={CHEEK_ZOOM} className="rounded-card bg-white">
        <ZoomBoxes zoom={CHEEK_ZOOM} size={12} />
      </ZoomPhoto>
      <div className="mt-4 flex justify-center">
        <span className="tnum inline-flex items-center rounded-full bg-white px-4 py-2 text-label-md text-ink-700 shadow-card">
          {COPY.home.preview.lesions}
        </span>
      </div>
    </Frame>
  );
}

/** Step 3: a result card built from the real scale and badge components, with sample numbers (7 lesions = Hayashi "Sedang"). */
export function ResultStepVisual() {
  return (
    <Frame>
      <div className="space-y-4 rounded-card border border-border bg-white p-4 shadow-card sm:p-5">
        <p className="text-headline-md text-ink-900 sm:text-headline-lg">
          <span className="tnum text-primary-600">7</span> {COPY.detectResult.countUnit}
        </p>
        <div className="space-y-3">
          <p className="text-label-md text-ink-600">{COPY.detectResult.severityTitle}</p>
          <SeverityBadge severity="moderate" isEstimate={false} large />
          <div className="pt-2">
            <SeverityScale severity="moderate" total={7} large />
          </div>
          <p className="text-body-md text-ink-600">{COPY.severityNote}</p>
        </div>
      </div>
      <p className="mt-3 text-center text-sm text-ink-600">{COPY.home.preview.sample}</p>
    </Frame>
  );
}
