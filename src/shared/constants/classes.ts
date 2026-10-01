import type { AcneClass, Severity } from '../types/api';

/** Fixed order, must match the classification model output. Never re-sort. */
export const ACNE_CLASSES: readonly AcneClass[] = ['Blackheads', 'Cyst', 'Papules', 'Pustules', 'Whiteheads'];

export const CLASS_META: Record<AcneClass, { color: string; label: string }> = {
  Blackheads: { color: '#334155', label: 'Komedo Hitam' },
  Whiteheads: { color: '#0EA5E9', label: 'Komedo Putih' },
  Papules: { color: '#F97316', label: 'Papula' },
  Pustules: { color: '#EAB308', label: 'Pustula' },
  Cyst: { color: '#DC2626', label: 'Kista' },
};

export const SEVERITY_META: Record<Severity, { bg: string; text: string; label: string }> = {
  clear: { bg: '#DCFCE7', text: '#166534', label: 'Bersih' },
  mild: { bg: '#DCFCE7', text: '#15803D', label: 'Ringan' },
  moderate: { bg: '#FEF3C7', text: '#B45309', label: 'Sedang' },
  severe: { bg: '#FEE2E2', text: '#B91C1C', label: 'Berat' },
};

/** Upper bound (inclusive) of total lesions per severity. Keep in sync with backend/app/ml/severity.py. */
export const SEVERITY_THRESHOLDS = { clear: 0, mild: 5, moderate: 20 } as const;

export const LOW_CONFIDENCE_THRESHOLD = 0.6;
export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;
export const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const;

export function computeSeverity(total: number, hasConfidentCyst: boolean): Severity {
  let s: Severity =
    total === 0 ? 'clear'
    : total <= SEVERITY_THRESHOLDS.mild ? 'mild'
    : total <= SEVERITY_THRESHOLDS.moderate ? 'moderate'
    : 'severe';
  if (hasConfidentCyst && (s === 'clear' || s === 'mild')) s = 'moderate';
  return s;
}
