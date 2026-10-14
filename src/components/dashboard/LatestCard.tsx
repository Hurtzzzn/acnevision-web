import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { COPY, SEVERITY_META, type ScanDetail, type UserStats } from '@acnevision/shared';
import { api } from '../../lib/runtime';
import { fmtDate } from '../../lib/errors';
import type { LesionTrend } from '../../lib/dashboard';

const C = COPY.dashboard;
type Recent = UserStats['recent'][number];

/** One neutral phrase about the change versus the previous analysis (no "better" or "worse"). */
function deltaPhrase(trend: LesionTrend | null): string | null {
  if (!trend) return null;
  const n = Math.abs(trend.delta);
  return trend.direction === 'up' ? C.deltaMore(n) : trend.direction === 'down' ? C.deltaLess(n) : C.deltaSame;
}

/**
 * Latest analysis, kept to what reads in three seconds: severity, lesion count, change since last time.
 * Probabilities, confidence meter and heatmap live on the detail page. The list endpoint has no confidence, so the scan
 * is loaded only to know whether to show the "Kurang pasti" chip (best effort; the card works without it).
 */
export function LatestCard({ scan, trend }: { scan: Recent; trend: LesionTrend | null }) {
  const [detail, setDetail] = useState<ScanDetail | null>(null);

  useEffect(() => {
    let cancelled = false;
    setDetail(null);
    api.getScan(scan.scan_id).then((d) => { if (!cancelled) setDetail(d); }).catch(() => { /* optional */ });
    return () => { cancelled = true; };
  }, [scan.scan_id]);

  const level = scan.severity ? SEVERITY_META[scan.severity] : null;
  const lowConfidence = detail?.classification?.is_low_confidence === true;
  const change = deltaPhrase(trend);

  return (
    <section aria-labelledby="latest-title" className="enter-rise card flex flex-col justify-between gap-5 !bg-tint md:p-6">
      <div className="flex items-start gap-4 md:gap-6">
        <img
          src={detail?.image_url ?? scan.thumbnail_url}
          alt={C.latestAlt}
          className="aspect-[4/5] w-28 flex-none rounded-btn bg-white object-cover shadow-card sm:w-32"
        />
        <div className="flex min-w-0 flex-1 flex-col gap-2">
          <h2 id="latest-title" className="text-body-sm font-medium text-ink-600">
            {C.latestTitle} <span aria-hidden>·</span> {fmtDate(scan.created_at)}
          </h2>
          {level ? (
            <>
              <span
                className="inline-flex w-fit items-center rounded-full px-4 py-1.5 text-body-lg font-semibold"
                style={{ background: level.bg, color: level.text }}
              >
                {level.label}
              </span>
              <p className="tnum flex items-baseline gap-2 text-ink-900">
                <span className="text-display leading-none">{scan.total_lesions}</span>
                <span className="text-body-md text-ink-700">{C.lesionUnit}</span>
              </p>
              {change && <p className="text-body-md text-ink-700">{change}</p>}
              {lowConfidence && (
                <p className="w-fit rounded-full bg-white px-3 py-1 text-body-sm font-semibold text-ink-700 ring-1 ring-border">
                  {C.confidenceLow}
                </p>
              )}
            </>
          ) : (
            <>
              <p className="text-h3 font-semibold text-ink-900">{C.noLesions}</p>
              {change && <p className="text-body-md text-ink-700">{change}</p>}
            </>
          )}
        </div>
      </div>
      <Link to={`/history/${scan.scan_id}`} className="btn-primary min-h-11 w-full sm:w-fit">{C.viewDetail}</Link>
    </section>
  );
}
