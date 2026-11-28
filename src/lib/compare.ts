import type { ScanListItem } from '@acnevision/shared';

export interface CompareSelection {
  before: ScanListItem;
  after: ScanListItem;
  beforeOptions: ScanListItem[];
  afterOptions: ScanListItem[];
}

const ts = (item: ScanListItem) => new Date(item.created_at).getTime();

/** Returns true when `candidate` is chronologically valid as "SESUDAH" for the given `before` scan. */
export function isValidAfterScan(candidate: ScanListItem, before: ScanListItem): boolean {
  return candidate.scan_id !== before.scan_id && ts(candidate) >= ts(before);
}

/**
 * Resolves a chronologically valid Before/After comparison pair where `timestamp(after) >= timestamp(before)`.
 * Supports multiple scans captured on the same day by ordering down to exact capture hour/minute/second.
 */
export function resolveComparePair(
  scans: readonly ScanListItem[],
  requestedBeforeId?: string | null,
  requestedAfterId?: string | null,
): CompareSelection | null {
  if (scans.length < 2) return null;

  const asc = [...scans].sort((a, b) => ts(a) - ts(b));
  const newest = asc[asc.length - 1];

  // "Before" options exclude the absolute newest scan so there is always at least one valid later "After" scan
  const beforeOptions = asc.slice(0, asc.length - 1).reverse();

  const before =
    beforeOptions.find((s) => s.scan_id === requestedBeforeId) ??
    beforeOptions[0]; // default to second-newest scan

  let afterOptions = asc
    .filter((s) => isValidAfterScan(s, before))
    .reverse();

  if (afterOptions.length === 0) {
    afterOptions = [newest];
  }

  let after = afterOptions.find((s) => s.scan_id === requestedAfterId) ?? afterOptions[0];

  if (ts(after) < ts(before)) {
    after = afterOptions[0];
  }

  return { before, after, beforeOptions, afterOptions };
}
