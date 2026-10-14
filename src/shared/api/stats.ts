import type { Severity, UserStats } from '../types/api';

export const RECENT_LIMIT = 5;

export interface StatsSource {
  scan_id: string;
  created_at: string;
  thumbnail_url: string;
  total_lesions: number;
  /** Severity from the AI model, null for a scan without lesions. */
  severity: Severity | null;
}

/** Builds GET /me/stats (docs/05) from a user's saved scans. Every number is derived from the input, nothing is invented. */
export function buildUserStats(scans: readonly StatsSource[], recentLimit = RECENT_LIMIT): UserStats {
  const newestFirst = [...scans].sort((a, b) => b.created_at.localeCompare(a.created_at));

  return {
    totals: {
      analyses: newestFirst.length,
      total_lesions: newestFirst.reduce((sum, s) => sum + s.total_lesions, 0),
      latest_severity: newestFirst[0]?.severity ?? null,
    },
    recent: newestFirst.slice(0, recentLimit).map((s) => ({
      scan_id: s.scan_id,
      created_at: s.created_at,
      thumbnail_url: s.thumbnail_url,
      total_lesions: s.total_lesions,
      severity: s.severity,
    })),
  };
}
