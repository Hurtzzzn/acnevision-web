import type { Severity } from '../types/api';

/** Fixed order, must match the classification model output. Never re-sort. */
export const SEVERITY_ORDER: readonly Severity[] = ['mild', 'moderate', 'severe', 'very_severe'];

/**
 * `bg` and `text` are the badge pair. `solid` is the strong color for bars and the active scale segment, `tint` the pale
 * one for inactive segments and bar tracks. very_severe is a filled badge (dark background, white text, docs/06 section 1).
 */
export const SEVERITY_META: Record<Severity, { bg: string; text: string; solid: string; tint: string; label: string }> = {
  mild: { bg: '#DCFCE7', text: '#15803D', solid: '#15803D', tint: '#DCFCE7', label: 'Ringan' },
  moderate: { bg: '#FEF9C3', text: '#A16207', solid: '#A16207', tint: '#FEF9C3', label: 'Sedang' },
  severe: { bg: '#FFEDD5', text: '#C2410C', solid: '#C2410C', tint: '#FFEDD5', label: 'Berat' },
  very_severe: { bg: '#9F1239', text: '#FFFFFF', solid: '#9F1239', tint: '#FFE4E6', label: 'Sangat Berat' },
};

/** Upper bound (inclusive) of total lesions per severity (Hayashi). Above `severe` is very_severe. Keep in sync with backend/app/ml/severity.py. */
export const SEVERITY_THRESHOLDS = { mild: 5, moderate: 20, severe: 50 } as const;

export const LOW_CONFIDENCE_THRESHOLD = 0.6;
export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;
export const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const;

/** Severity estimated from the lesion count alone (guest path). null when there are no lesions. */
export function estimateSeverity(total: number): Severity | null {
  if (total <= 0) return null;
  if (total <= SEVERITY_THRESHOLDS.mild) return 'mild';
  if (total <= SEVERITY_THRESHOLDS.moderate) return 'moderate';
  if (total <= SEVERITY_THRESHOLDS.severe) return 'severe';
  return 'very_severe';
}

/**
 * True when the model's severity is 2 or more levels away from the Hayashi level of the lesion count, in either direction
 * (FR-SCAN-19). Only used to decide whether to show an explanatory note; the comparison itself is never displayed.
 */
export function severityMismatch(total: number, severity: Severity): boolean {
  const estimate = estimateSeverity(total);
  if (estimate === null) return false;
  return Math.abs(SEVERITY_ORDER.indexOf(estimate) - SEVERITY_ORDER.indexOf(severity)) >= 2;
}

/** Moderate and above lead with the "see a doctor" note. Calm tone either way. */
export function leadsWithDoctor(severity: Severity | null): boolean {
  return severity === 'moderate' || severity === 'severe' || severity === 'very_severe';
}
