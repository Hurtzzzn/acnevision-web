import { LOW_CONFIDENCE_THRESHOLD, type DetectedLesion } from '@acnevision/shared';

export const isLowConfidence = (l: DetectedLesion) => l.det_confidence < LOW_CONFIDENCE_THRESHOLD;

/** Highest detection confidence first; ties keep the photo order. Does not renumber: `idx` stays the number on the box. */
export function sortByConfidence(lesions: DetectedLesion[]): DetectedLesion[] {
  return [...lesions].sort((a, b) => b.det_confidence - a.det_confidence || a.idx - b.idx);
}

/** Highest class confidence first for classified lesions; ties keep the photo order. `idx` stays the number on the box. */
export function sortByClassConfidence<T extends { idx: number; class_confidence: number }>(lesions: readonly T[]): T[] {
  return [...lesions].sort((a, b) => b.class_confidence - a.class_confidence || a.idx - b.idx);
}

/** Lesion list order: photo numbers by default, or most confident first. Never renumbers: `idx` stays the number on the box. */
export function orderLesions<T extends { idx: number; class_confidence: number }>(lesions: readonly T[], byConfidence: boolean): T[] {
  return byConfidence ? sortByClassConfidence(lesions) : [...lesions].sort((a, b) => a.idx - b.idx);
}

/** Real numbers for the one-line list summary. `avgPct` is null when there are no lesions. */
export function summarizeConfidence(lesions: DetectedLesion[]): { count: number; avgPct: number | null; lowCount: number } {
  const count = lesions.length;
  const avgPct = count ? Math.round((lesions.reduce((sum, l) => sum + l.det_confidence, 0) / count) * 100) : null;
  return { count, avgPct, lowCount: lesions.filter(isLowConfidence).length };
}
