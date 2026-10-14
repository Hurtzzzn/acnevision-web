import { LOW_CONFIDENCE_THRESHOLD, type DetectedLesion } from '@acnevision/shared';

type Scored = Pick<DetectedLesion, 'idx' | 'det_confidence'>;

export const isLowConfidence = (l: Pick<DetectedLesion, 'det_confidence'>) => l.det_confidence < LOW_CONFIDENCE_THRESHOLD;

/** Highest detection confidence first; ties keep the photo order. Does not renumber: `idx` stays the number on the box. */
export function sortByConfidence<T extends Scored>(lesions: readonly T[]): T[] {
  return [...lesions].sort((a, b) => b.det_confidence - a.det_confidence || a.idx - b.idx);
}

/** Lesion list order: photo numbers by default, or most confident first. Never renumbers: `idx` stays the number on the box. */
export function orderLesions<T extends Scored>(lesions: readonly T[], byConfidence: boolean): T[] {
  return byConfidence ? sortByConfidence(lesions) : [...lesions].sort((a, b) => a.idx - b.idx);
}

/** Real numbers for the one-line list summary. `avgPct` is null when there are no lesions. */
export function summarizeConfidence(lesions: DetectedLesion[]): { count: number; avgPct: number | null; lowCount: number } {
  const count = lesions.length;
  const avgPct = count ? Math.round((lesions.reduce((sum, l) => sum + l.det_confidence, 0) / count) * 100) : null;
  return { count, avgPct, lowCount: lesions.filter(isLowConfidence).length };
}
