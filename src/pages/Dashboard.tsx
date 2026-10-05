import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Camera } from 'lucide-react';
import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { COPY, SEVERITY_META, type UserStats } from '@acnevision/shared';
import { api } from '../lib/runtime';
import { useAuth } from '../store/auth';
import { NEW_ANALYSIS_PATH } from '../lib/redirect';
import { errMessage, fmtDate } from '../lib/errors';
import { chronological, firstName, formatDelta, greetingKey, lesionTrend } from '../lib/dashboard';
import { Disclaimer, EmptyState, ErrorBox, Spinner } from '../components/ui';

const C = COPY.dashboard;

function SeverityChip({ severity }: { severity: UserStats['recent'][number]['severity'] }) {
  const m = SEVERITY_META[severity];
  return <span className="badge" style={{ background: m.bg, color: m.text }}>{m.label}</span>;
}

function StatCard({ label, value, note }: { label: string; value: string; note: string }) {
  return (
    <div className="card">
      <p className="text-label-md text-ink-600">{label}</p>
      <p className="tnum mt-3 text-display-sm font-semibold text-ink-900">{value}</p>
      <p className="mt-1 text-body-sm text-ink-500">{note}</p>
    </div>
  );
}

function TrendChart({ recent }: { recent: UserStats['recent'] }) {
  const trend = lesionTrend(recent);
  const points = useMemo(
    () => chronological(recent).map((p) => ({ label: fmtDate(p.created_at), total: p.total_lesions })),
    [recent],
  );
  if (!trend) return null;
  const sentence = trend.direction === 'down' ? C.trendDown(trend.from, trend.to)
    : trend.direction === 'up' ? C.trendUp(trend.from, trend.to)
    : C.trendSame(trend.to);

  return (
    <section className="card" aria-labelledby="trend-title">
      <h2 id="trend-title" className="text-h3">{C.trendTitle}</h2>
      <p className="mt-1 text-body-md text-ink-600">{sentence}</p>
      <div className="mt-4 h-44" role="img" aria-label={`${C.trendChartLabel(points.length)} ${sentence}`}>
        <ResponsiveContainer>
          <LineChart data={points} margin={{ top: 8, right: 12, bottom: 0, left: -20 }}>
            <XAxis dataKey="label" tick={{ fontSize: 12 }} tickLine={false} axisLine={{ stroke: '#E2E8F0' }} />
            <YAxis allowDecimals={false} tick={{ fontSize: 12 }} tickLine={false} axisLine={false} />
            <Tooltip />
            <Line type="monotone" dataKey="total" name={C.trendSeries} stroke="#2563EB" strokeWidth={2} dot isAnimationActive={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <table className="sr-only">
        <caption>{C.trendTitle}</caption>
        <thead><tr><th scope="col">{C.trendTableDate}</th><th scope="col">{C.trendSeries}</th></tr></thead>
        <tbody>{points.map((p, i) => <tr key={i}><td>{p.label}</td><td>{p.total}</td></tr>)}</tbody>
      </table>
    </section>
  );
}

export default function Dashboard() {
  const user = useAuth((s) => s.user);
  const [stats, setStats] = useState<UserStats | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    setError(null);
    api.getMyStats().then(setStats).catch((e) => setError(errMessage(e, C.loadError)));
  }, []);
  useEffect(load, [load]);

  const name = user ? firstName(user.full_name, user.email) : '';
  const latest = stats?.recent[0];
  const trend = stats ? lesionTrend(stats.recent) : null;
  const changeValue = trend ? formatDelta(trend.delta) ?? C.statChangeSame : '';

  return (
    <div className="space-y-8">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-display-sm">{C[greetingKey(new Date().getHours())]}, {name}</h1>
          <p className="mt-2 max-w-xl text-body-lg">{C.subtitle}</p>
        </div>
        {stats && stats.totals.analyses > 0 && (
          <Link to={NEW_ANALYSIS_PATH} className="btn-primary self-start rounded-full px-6 py-3 sm:self-auto">
            <Camera className="h-4 w-4" aria-hidden /> {C.newAnalysis}
          </Link>
        )}
      </header>

      {error && <ErrorBox message={error} onRetry={load} />}
      {!stats && !error && <Spinner label={C.loading} />}

      {stats && stats.totals.analyses === 0 && (
        <EmptyState
          title={C.emptyTitle}
          text={C.emptyText}
          action={<Link to={NEW_ANALYSIS_PATH} className="btn-primary mt-2 rounded-full px-6 py-3">{C.emptyCta}</Link>}
        />
      )}

      {stats && latest && (
        <>
          <section aria-labelledby="latest-title">
            <h2 id="latest-title" className="mb-3 text-h3">{C.latestTitle}</h2>
            <div className="card flex flex-col gap-4 sm:flex-row sm:items-center">
              <img src={latest.thumbnail_url} alt={`${C.latestAlt}, ${fmtDate(latest.created_at)}`} className="h-20 w-20 shrink-0 rounded-btn object-cover" />
              <div className="flex-1 space-y-2">
                <p className="text-body-md text-ink-600">{fmtDate(latest.created_at, true)}</p>
                <p className="tnum text-h3 font-semibold text-ink-900">{C.lesionCount(latest.total_lesions)}</p>
                <SeverityChip severity={latest.severity} />
              </div>
              <Link to={`/history/${latest.scan_id}`} className="btn-outline self-start sm:self-center">
                {C.viewDetail} <ArrowRight className="h-4 w-4" aria-hidden />
              </Link>
            </div>
          </section>

          <section aria-labelledby="summary-title">
            <h2 id="summary-title" className="mb-3 text-h3">{C.summaryTitle}</h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <StatCard label={C.statAnalyses} value={String(stats.totals.analyses)} note={C.statAnalysesNote} />
              <StatCard label={C.statLesions} value={String(stats.totals.total_lesions)} note={C.statLesionsNote} />
              {trend && <StatCard label={C.statChange} value={changeValue} note={C.statChangeNote} />}
            </div>
          </section>

          <TrendChart recent={stats.recent} />

          <section aria-labelledby="recent-title">
            <div className="mb-3 flex items-baseline justify-between gap-3">
              <h2 id="recent-title" className="text-h3">{C.recentTitle}</h2>
              <Link to="/history" className="rounded text-label-md text-primary-600 hover:underline">{C.viewAll}</Link>
            </div>
            <ul className="space-y-3">
              {stats.recent.map((s) => (
                <li key={s.scan_id} className="card flex items-center gap-3 p-3 md:p-4">
                  <img src={s.thumbnail_url} alt="" className="h-12 w-12 shrink-0 rounded-btn object-cover" />
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-ink-900">{fmtDate(s.created_at)}</p>
                    <p className="tnum text-body-sm text-ink-600">{C.lesionCount(s.total_lesions)}</p>
                  </div>
                  <SeverityChip severity={s.severity} />
                  <Link to={`/history/${s.scan_id}`} className="btn-outline px-3 py-1.5">{C.viewDetail}</Link>
                </li>
              ))}
            </ul>
          </section>
        </>
      )}

      <Disclaimer variant="box" />
    </div>
  );
}
