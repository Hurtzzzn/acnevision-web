import type { UserStats } from '@acnevision/shared';

type RecentScan = UserStats['recent'][number];

export type TrendDirection = 'down' | 'up' | 'same';

export interface LesionTrend {
  direction: TrendDirection;
  /** Lesion count of the previous analysis. */
  from: number;
  /** Lesion count of the latest analysis. */
  to: number;
  /** Signed change, latest minus previous. */
  delta: number;
}

export type GreetingKey = 'greetingMorning' | 'greetingNoon' | 'greetingAfternoon' | 'greetingEvening';

export function greetingKey(hour: number): GreetingKey {
  if (hour >= 4 && hour < 11) return 'greetingMorning';
  if (hour >= 11 && hour < 15) return 'greetingNoon';
  if (hour >= 15 && hour < 18) return 'greetingAfternoon';
  return 'greetingEvening';
}

export function firstName(fullName: string | null, email: string): string {
  const source = fullName?.trim() || email.split('@')[0];
  return source.split(/\s+/)[0];
}

/** Chart needs oldest to newest; the API returns newest first. */
export function chronological(recent: readonly RecentScan[]): RecentScan[] {
  return [...recent].sort((a, b) => a.created_at.localeCompare(b.created_at));
}

/** Compares the latest analysis with the one before it. Needs at least 2 analyses, otherwise null. */
export function lesionTrend(recent: readonly RecentScan[]): LesionTrend | null {
  if (recent.length < 2) return null;
  const ordered = chronological(recent);
  const from = ordered[ordered.length - 2].total_lesions;
  const to = ordered[ordered.length - 1].total_lesions;
  const delta = to - from;
  return { direction: delta < 0 ? 'down' : delta > 0 ? 'up' : 'same', from, to, delta };
}

/** "-3" / "+2", or null when unchanged; the caller supplies the wording for "same". */
export function formatDelta(delta: number): string | null {
  if (delta === 0) return null;
  return `${delta > 0 ? '+' : '−'}${Math.abs(delta)}`;
}
