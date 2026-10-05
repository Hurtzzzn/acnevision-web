import { ACNE_CLASSES } from '../constants/classes';
import type { AcneClass, AnalysisSummary, UserStats } from '../types/api';

export const RECENT_LIMIT = 5;

export interface StatsSource {
  scan_id: string;
  created_at: string;
  thumbnail_url: string;
  summary: AnalysisSummary;
}

/** Builds GET /me/stats (docs/05) from a user's saved scans. Every number is derived from the input, nothing is invented. */
export function buildUserStats(scans: readonly StatsSource[], recentLimit = RECENT_LIMIT): UserStats {
  const newestFirst = [...scans].sort((a, b) => b.created_at.localeCompare(a.created_at));

  const classTotals = Object.fromEntries(ACNE_CLASSES.map((c) => [c, 0])) as Record<AcneClass, number>;
  let totalLesions = 0;
  let confSum = 0;
  let confWeight = 0;
  for (const s of newestFirst) {
    totalLesions += s.summary.total_lesions;
    for (const c of ACNE_CLASSES) classTotals[c] += s.summary.class_counts[c] ?? 0;
    if (s.summary.avg_confidence != null && s.summary.total_lesions > 0) {
      confSum += s.summary.avg_confidence * s.summary.total_lesions;
      confWeight += s.summary.total_lesions;
    }
  }
  // Ties resolve by canonical class order, which keeps the result stable.
  const top = ACNE_CLASSES.reduce((best, c) => (classTotals[c] > classTotals[best] ? c : best), ACNE_CLASSES[0]);

  return {
    totals: {
      analyses: newestFirst.length,
      total_lesions: totalLesions,
      most_detected_class: classTotals[top] > 0 ? top : null,
      avg_confidence: confWeight > 0 ? confSum / confWeight : null,
    },
    recent: newestFirst.slice(0, recentLimit).map((s) => ({
      scan_id: s.scan_id,
      created_at: s.created_at,
      thumbnail_url: s.thumbnail_url,
      total_lesions: s.summary.total_lesions,
      classes_present: ACNE_CLASSES.filter((c) => (s.summary.class_counts[c] ?? 0) > 0),
      severity: s.summary.severity,
    })),
  };
}
