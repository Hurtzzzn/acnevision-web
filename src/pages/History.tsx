import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Trash2 } from 'lucide-react';
import { COPY, type Paginated, type ScanListItem, type TrendPoint } from '@acnevision/shared';
import { api } from '../lib/runtime';
import { errMessage, fmtDate, pct } from '../lib/errors';
import { useUi } from '../store/ui';
import { EmptyState, ErrorBox, Modal, SeverityChip, Spinner } from '../components/ui';

const PAGE_SIZE = 10;
const H = COPY.history;

export default function HistoryPage() {
  const [page, setPage] = useState(1);
  const [data, setData] = useState<Paginated<ScanListItem> | null>(null);
  const [trend, setTrend] = useState<TrendPoint[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [toDelete, setToDelete] = useState<ScanListItem | null>(null);
  const toast = useUi((s) => s.toast);

  const load = useCallback(() => {
    setError(null);
    api.listScans(page, PAGE_SIZE).then(setData).catch((e) => setError(errMessage(e)));
    api.scanTrend(20).then((r) => setTrend(r.points)).catch(() => setTrend([]));
  }, [page]);
  useEffect(load, [load]);

  async function confirmDelete() {
    if (!toDelete) return;
    try {
      await api.deleteScan(toDelete.scan_id);
      toast(H.deleted);
      setToDelete(null);
      load();
    } catch (e) {
      toast(errMessage(e), 'error');
    }
  }

  const totalPages = data ? Math.max(1, Math.ceil(data.total / PAGE_SIZE)) : 1;

  return (
    <div className="space-y-6">
      <h1>{COPY.nav.history}</h1>
      {error && <ErrorBox message={error} onRetry={load} />}
      {!data && !error && <Spinner label={H.loading} />}
      {data && data.total === 0 && (
        <EmptyState title={H.emptyTitle} text={H.emptyText} action={<Link to="/scan" className="btn-primary">{H.start}</Link>} />
      )}

      {trend.length > 1 && (
        <section className="card" aria-label={H.trendTitle}>
          <h3 className="mb-3">{H.trendTitle}</h3>
          <div className="h-44">
            <ResponsiveContainer>
              <LineChart data={trend.map((p) => ({ ...p, label: fmtDate(p.created_at) }))}>
                <CartesianGrid stroke="#E2E8F0" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 12 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                <Tooltip />
                <Line type="monotone" dataKey="total_lesions" name={H.trendSeries} stroke="#2563EB" strokeWidth={2} dot />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </section>
      )}

      {data && data.total > 0 && (
        <>
          <div className="card hidden overflow-x-auto p-0 md:block md:p-0">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-border bg-primary-50 text-xs uppercase text-ink-600">
                <tr>{H.columns.map((h) => <th key={h} className="px-4 py-3">{h}</th>)}</tr>
              </thead>
              <tbody className="divide-y divide-border">
                {data.items.map((s) => (
                  <tr key={s.scan_id}>
                    <td className="px-4 py-3">{fmtDate(s.created_at, true)}</td>
                    <td className="px-4 py-3">{s.thumbnail_url && <img src={s.thumbnail_url} alt="" className="h-12 w-12 rounded-btn object-cover" />}</td>
                    <td className="px-4 py-3">{s.severity ? <SeverityChip severity={s.severity} /> : '-'}</td>
                    <td className="px-4 py-3">{pct(s.severity_confidence)}</td>
                    <td className="px-4 py-3">{s.total_lesions}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Link to={`/history/${s.scan_id}`} className="btn-outline px-3 py-1.5">{H.view}</Link>
                        <button aria-label={H.delete} className="rounded p-2 text-danger transition-colors hover:bg-red-50" onClick={() => setToDelete(s)}><Trash2 className="h-4 w-4" /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <ul className="space-y-3 md:hidden">
            {data.items.map((s) => (
              <li key={s.scan_id} className="card flex gap-3">
                {s.thumbnail_url && <img src={s.thumbnail_url} alt="" className="h-16 w-16 rounded-btn object-cover" />}
                <div className="flex-1 space-y-1 text-sm">
                  <p className="font-semibold text-ink-900">{fmtDate(s.created_at, true)}</p>
                  <div className="flex items-center gap-2"><SeverityChip severity={s.severity} /><span>{H.lesionCount(s.total_lesions)}</span></div>
                  <div className="flex gap-2 pt-1">
                    <Link to={`/history/${s.scan_id}`} className="btn-outline min-h-11 px-3 py-1.5">{H.view}</Link>
                    <button className="btn-outline min-h-11 px-3 py-1.5 text-danger" onClick={() => setToDelete(s)}>{H.delete}</button>
                  </div>
                </div>
              </li>
            ))}
          </ul>

          <nav className="flex items-center justify-center gap-3" aria-label={H.pagination}>
            <button className="btn-outline" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>{H.prev}</button>
            <span className="text-sm">{H.pageOf(page, totalPages)}</span>
            <button className="btn-outline" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>{H.next}</button>
          </nav>
        </>
      )}

      {toDelete && (
        <Modal title={H.confirmTitle} onClose={() => setToDelete(null)}>
          <p className="mb-5 text-sm">{H.confirmText(fmtDate(toDelete.created_at, true))}</p>
          <div className="flex gap-3">
            <button className="btn-outline flex-1" onClick={() => setToDelete(null)}>{H.cancel}</button>
            <button className="btn-danger flex-1" onClick={confirmDelete}>{H.delete}</button>
          </div>
        </Modal>
      )}
    </div>
  );
}
