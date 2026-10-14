import { SEVERITY_ORDER, estimateSeverity, type Severity } from '@acnevision/shared';

/**
 * The one source of sample data for the Home illustrations. Every "N jerawat" text, every drawn box and the estimated
 * severity are derived from here, so the picture and the words can never disagree. Illustration only: these are not
 * detections of any real photo.
 */

/**
 * A sample lesion. `x` and `y` are the box center as fractions (0 to 1) of the original photo (`heroine.png`), measured on
 * the visible red spots. Because they are relative to the whole photo, every crop, scale or mask maps them with
 * `zoomPoint` and the box stays on its spot.
 */
export interface DemoLesion { n: number; x: number; y: number; label: LabelSide }

/** Where the number tag sits around its box. Several sample spots are close together, so tags use different sides to stay readable. */
export type LabelSide = 'top' | 'left' | 'right' | 'bottom-left' | 'top-left';

export const DEMO_LESIONS: readonly DemoLesion[] = [
  { n: 1, x: 0.618, y: 0.465, label: 'right' },
  { n: 2, x: 0.596, y: 0.441, label: 'top' },
  { n: 3, x: 0.582, y: 0.444, label: 'left' },
  { n: 4, x: 0.572, y: 0.466, label: 'bottom-left' },
  { n: 5, x: 0.622, y: 0.504, label: 'right' },
  { n: 6, x: 0.567, y: 0.533, label: 'left' },
  { n: 7, x: 0.519, y: 0.632, label: 'left' },
];

/** Box width as a fraction of the original photo's width. */
export const DEMO_BOX_SIZE = 0.04;

export const DEMO_LESION_COUNT = DEMO_LESIONS.length;

/** The guest estimate (Hayashi) for the sample count. */
export const DEMO_SEVERITY: Severity = estimateSeverity(DEMO_LESION_COUNT) ?? 'mild';

/** Sample model confidence shown in the hero chip and the Grad-CAM showcase. */
export const DEMO_CONFIDENCE_PCT = 82;

/** Sample class probabilities: the chosen level gets the confidence, the rest share what is left, nearer levels first. */
export function demoProbabilities(selected: Severity, confidencePct: number): Record<Severity, number> {
  const at = SEVERITY_ORDER.indexOf(selected);
  const weights = SEVERITY_ORDER.map((s, i) => (s === selected ? 0 : 1 / (1 + (i - at) ** 2)));
  const total = weights.reduce((a, b) => a + b, 0);
  const rest = 1 - confidencePct / 100;
  const out = {} as Record<Severity, number>;
  SEVERITY_ORDER.forEach((s, i) => { out[s] = s === selected ? confidencePct / 100 : (weights[i] / total) * rest; });
  return out;
}

export const DEMO_PROBABILITIES = demoProbabilities(DEMO_SEVERITY, DEMO_CONFIDENCE_PCT);

/** Height over width of the original photo, used to map photo coordinates into a cropped frame. */
const PHOTO_RATIO = 1158 / 1145;

/**
 * A crop of the original photo: `scale` times larger, with photo point (cx, cy), as fractions, at the center of the frame.
 * `aspect` is the frame's width over height.
 */
export interface Zoom { scale: number; cx: number; cy: number; aspect: number }

/** Where a photo point (fractions) lands inside a zoomed frame (percent of the frame). */
export function zoomPoint(z: Zoom, px: number, py: number) {
  return { x: 50 + (px - z.cx) * z.scale * 100, y: 50 + (py - z.cy) * z.scale * z.aspect * PHOTO_RATIO * 100 };
}

/** The sample lesions whose whole box falls inside the frame of a crop. */
export function lesionsInZoom(z: Zoom): DemoLesion[] {
  const half = (DEMO_BOX_SIZE * z.scale * 100) / 2;
  return DEMO_LESIONS.filter((l) => {
    const p = zoomPoint(z, l.x, l.y);
    return p.x - half >= 0 && p.x + half <= 100 && p.y - half >= 0 && p.y + half <= 100;
  });
}
