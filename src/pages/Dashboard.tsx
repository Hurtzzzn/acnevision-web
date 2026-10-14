import { useCallback, useEffect, useMemo, useState, type CSSProperties } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Camera, LineChart as LineChartIcon, MessageCircle } from 'lucide-react';
import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { COPY, SEVERITY_META, SEVERITY_ORDER, type Severity, type UserStats } from '@acnevision/shared';
import { api } from '../lib/runtime';
import { useAuth } from '../store/auth';
import { NEW_ANALYSIS_PATH } from '../lib/redirect';
import { errMessage, fmtDate } from '../lib/errors';
import { chronological, daysSince, firstName, greetingKey, lesionTrend, nudgeKind } from '../lib/dashboard';
import { Crescent } from '../components/home/Crescent';
import { LatestCard } from '../components/dashboard/LatestCard';
import { ErrorBox, Spinner } from '../components/ui';

const C = COPY.dashboard;
type Recent = UserStats['recent'][number];

/** Per-element animation offset for the chart dots (see .chart-dot in index.css). */
const delay = (ms: number) => ({ '--d': `${ms}ms` }) as CSSProperties;
const NEUTRAL_DOT = '#94A3B8';
const dotColor = (severity: Severity | null) => (severity ? SEVERITY_META[severity].solid : NEUTRAL_DOT);
const shortDate = (iso: string) => new Date(iso).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
const TEXT_LINK = 'inline-flex min-h-11 items-center gap-1 rounded text-label-md font-semibold text-primary-600 hover:underline';

function usePrefersReducedMotion(): boolean {
  const [reduce, setReduce] = useState(
    () => typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches,
  );
  useEffect(() => {
    const mq = window.matchMedia?.('(prefers-reduced-motion: reduce)');
    if (!mq) return;
    const onChange = () => setReduce(mq.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);
  return reduce;
}

/** Soft side card: one short time-based nudge and the shortcut to the assistant. */
function AssistCard({ latest }: { latest: Recent }) {
  const days = daysSince(latest.created_at);
  const kind = nudgeKind(days);
  const text = kind === 'fresh' ? C.nudgeFresh
    : kind === 'soon' ? C.nudgeSoon(days)
    : kind === 'due' ? C.nudgeDue(days)
    : C.nudgeLong(days);
  return (
    <section className="card flex flex-col justify-between gap-5" aria-labelledby="next-title">
      <div>
        <h2 id="next-title" className="text-h3">{C.nextTitle}</h2>
        <p className="mt-2 text-body-md text-ink-700">{text}</p>
      </div>
      <Link to="/chat" className="btn-outline min-h-11 w-full sm:w-fit">
        <MessageCircle className="h-4 w-4 flex-none" aria-hidden /> {C.askAssistant}
      </Link>
    </section>
  );
}

interface Point { label: string; total: number; severity: Severity | null; dateLabel: string }

function TrendTooltip({ active, payload }: { active?: boolean; payload?: Array<{ payload: Point }> }) {
  const point = active ? payload?.[0]?.payload : undefined;
  if (!point) return null;
  return (
    <div className="rounded-btn border border-border bg-white px-3 py-2 text-body-sm shadow-card">
      <p className="text-ink-600">{point.dateLabel}</p>
      <p className="tnum font-semibold text-ink-900">{C.lesionCount(point.total)}</p>
      {point.severity && <p style={{ color: SEVERITY_META[point.severity].solid }}>{SEVERITY_META[point.severity].label}</p>}
    </div>
  );
}

function HistoryLink({ total }: { total: number }) {
  return <Link to="/history" className={TEXT_LINK}>{C.viewAllCount(total)} <ArrowRight className="h-4 w-4" aria-hidden /></Link>;
}

function TrendChart({ recent, total }: { recent: Recent[]; total: number }) {
  const reduceMotion = usePrefersReducedMotion();
  const trend = lesionTrend(recent);
  const points = useMemo<Point[]>(
    () => chronological(recent).map((p) => ({ label: shortDate(p.created_at), dateLabel: fmtDate(p.created_at), total: p.total_lesions, severity: p.severity })),
    [recent],
  );
  if (!trend) return null;
  const sentence = trend.direction === 'down' ? C.trendDown(trend.to, trend.from)
    : trend.direction === 'up' ? C.trendUp(trend.to, trend.from)
    : C.trendSame(trend.to);
  const present = SEVERITY_ORDER.filter((s) => points.some((p) => p.severity === s));
  const lastIndex = points.length - 1;

  // Dots carry the severity color. The newest one is labeled directly (count and level), so color is never the only cue.
  // The transparent 22 px circle widens the touch area around each dot to 44 px.
  const renderDot = (props: { cx?: number; cy?: number; index?: number; payload?: Point }) => {
    const { cx, cy, index = 0, payload } = props;
    if (cx == null || cy == null || !payload) return <g key={`d-${index}`} />;
    const level = payload.severity ? SEVERITY_META[payload.severity] : null;
    return (
      <g key={`d-${index}`} className="chart-dot" style={delay(index * 60)}>
        <circle cx={cx} cy={cy} r={22} fill="transparent" />
        <circle cx={cx} cy={cy} r={6} fill={dotColor(payload.severity)} stroke="#fff" strokeWidth={2} />
        {index === lastIndex && (
          <text x={cx + 8} y={cy - 12} textAnchor="end" fontSize={12} fontWeight={600} fill={level ? level.solid : '#475569'}>
            {level ? `${payload.total} · ${level.label}` : payload.total}
          </text>
        )}
      </g>
    );
  };

  return (
    <section className="card" aria-labelledby="trend-title">
      <div className="flex flex-col items-start gap-x-4 sm:flex-row sm:items-center sm:justify-between">
        <h2 id="trend-title" className="text-h3">{C.trendTitle}</h2>
        <HistoryLink total={total} />
      </div>
      <p className="mt-2 text-body-lg text-ink-900">{sentence}</p>
      <div className="mt-4 h-52" role="group" aria-label={C.trendChartLabel(points.length)}>
        <ResponsiveContainer>
          <LineChart data={points} margin={{ top: 24, right: 16, bottom: 0, left: -16 }} accessibilityLayer>
            <XAxis dataKey="label" tick={{ fontSize: 12, fill: '#475569' }} tickLine={false} axisLine={{ stroke: '#E2E8F0' }} interval="preserveStartEnd" />
            <YAxis allowDecimals={false} domain={[0, 'auto']} tick={{ fontSize: 12, fill: '#475569' }} tickLine={false} axisLine={false} width={44} />
            <Tooltip content={<TrendTooltip />} cursor={{ stroke: '#CBD5E1' }} />
            <Line
              type="monotone" dataKey="total" name={C.trendSeries} stroke="#2563EB" strokeWidth={2}
              dot={renderDot} activeDot={{ r: 8, stroke: '#fff', strokeWidth: 2 }}
              isAnimationActive={!reduceMotion} animationDuration={600} animationEasing="ease-out"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <p className="mt-3 text-body-sm text-ink-600">{C.trendLegend}</p>
      {present.length > 0 && (
        <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-body-sm text-ink-600">
          {present.map((s) => (
            <li key={s} className="inline-flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full" style={{ background: SEVERITY_META[s].solid }} aria-hidden />
              {SEVERITY_META[s].label}
            </li>
          ))}
        </ul>
      )}
      <p className="mt-2 text-body-sm text-ink-500">{C.trendCaveat}</p>
      <table className="sr-only">
        <caption>{C.trendTitle}</caption>
        <thead>
          <tr>
            <th scope="col">{C.trendTableDate}</th>
            <th scope="col">{C.trendSeries}</th>
            <th scope="col">{C.trendTableSeverity}</th>
          </tr>
        </thead>
        <tbody>
          {points.map((p, i) => (
            <tr key={i}>
              <td>{p.dateLabel}</td>
              <td>{p.total}</td>
              <td>{p.severity ? SEVERITY_META[p.severity].label : C.trendNoSeverity}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}

/** One friendly line instead of a chart that has nothing to compare yet. */
function SingleAnalysisLine({ total }: { total: number }) {
  return (
    <div className="px-1">
      <p className="flex items-start gap-3 text-body-md text-ink-700">
        <LineChartIcon className="mt-0.5 h-5 w-5 flex-none text-primary-600" aria-hidden />
        <span>{C.singleText}</span>
      </p>
      <div className="pl-8"><HistoryLink total={total} /></div>
    </div>
  );
}

function FirstTimeCard() {
  return (
    <section className="card enter-rise relative flex flex-col items-center gap-3 overflow-hidden !bg-tint px-6 py-10 text-center" aria-labelledby="empty-title">
      <div className="relative h-40 w-40" aria-hidden>
        <Crescent className="absolute inset-0 h-full w-full opacity-70" />
        <span className="absolute left-1/2 top-1/2 flex h-16 w-16 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-white text-primary-600 shadow-card">
          <Camera className="h-7 w-7" />
        </span>
      </div>
      <h2 id="empty-title" className="text-h3">{C.emptyTitle}</h2>
      <p className="max-w-md text-body-md text-ink-700">{C.emptyText}</p>
      <Link to={NEW_ANALYSIS_PATH} className="btn-primary mt-2 min-h-11 rounded-full px-6 py-3">{C.emptyCta}</Link>
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
  const isEmpty = !!stats && stats.totals.analyses === 0;

  return (
    <div className="space-y-6 md:space-y-8">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-display-sm">{C[greetingKey(new Date().getHours())]}, {name}</h1>
          {stats && <p className="mt-2 max-w-xl text-body-lg">{isEmpty ? C.emptyGreeting : C.welcomeBack}</p>}
        </div>
        {stats && !isEmpty && (
          <Link to={NEW_ANALYSIS_PATH} className="btn-primary min-h-11 self-start rounded-full px-6 py-3 sm:self-auto">
            <Camera className="h-4 w-4" aria-hidden /> {C.newAnalysis}
          </Link>
        )}
      </header>

      {error && <ErrorBox message={error} onRetry={load} />}
      {!stats && !error && <Spinner label={C.loading} />}

      {isEmpty && <FirstTimeCard />}

      {stats && latest && (
        <>
          <div className="grid gap-4 md:grid-cols-[minmax(0,3fr)_minmax(0,2fr)] md:gap-6">
            <LatestCard scan={latest} trend={lesionTrend(stats.recent)} />
            <AssistCard latest={latest} />
          </div>
          {stats.recent.length >= 2
            ? <TrendChart recent={stats.recent} total={stats.totals.analyses} />
            : <SingleAnalysisLine total={stats.totals.analyses} />}
        </>
      )}
    </div>
  );
}
