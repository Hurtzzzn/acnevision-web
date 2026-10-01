import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Trash2 } from 'lucide-react';
import { CLASS_META, SEVERITY_META, type Paginated, type ScanListItem, type TrendPoint } from '@acnevision/shared';
import { api } from '../lib/runtime';
import { errMessage, fmtDate, pct } from '../lib/errors';
import { useUi } from '../store/ui';
import { EmptyState, ErrorBox, Modal, Spinner } from '../components/ui';

const PAGE_SIZE = 10;

function Sev({ s }: { s: ScanListItem['severity'] }) {
  return <span className="badge" style={{ background: SEVERITY_META[s].bg, color: SEVERITY_META[s].text }}>{SEVERITY_META[s].label}</span>;
}

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
      toast('Riwayat dihapus');
      setToDelete(null);
      load();
    } catch (e) {
      toast(errMessage(e), 'error');
    }
  }

  const totalPages = data ? Math.max(1, Math.ceil(data.total / PAGE_SIZE)) : 1;

  return (
    <div className="space-y-6">
      <h1>Analysis History</h1>
      {error && <ErrorBox message={error} onRetry={load} />}
      {!data && !error && <Spinner label="Memuat riwayat..." />}
      {data && data.total === 0 && (
        <EmptyState title="Belum ada riwayat" text="Simpan hasil analisis untuk melihatnya di sini." action={<Link to="/scan" className="btn-primary">Mulai Analisis</Link>} />
      )}

      {trend.length > 1 && (
        <section className="card" aria-label="Tren jumlah lesi">
          <h3 className="mb-3">Tren jumlah lesi</h3>
          <div className="h-44">
            <ResponsiveContainer>
              <LineChart data={trend.map((p) => ({ ...p, label: fmtDate(p.created_at) }))}>
                <CartesianGrid stroke="#E2E8F0" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 12 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                <Tooltip />
                <Line type="monotone" dataKey="total_lesions" name="Jumlah lesi" stroke="#2563EB" strokeWidth={2} dot />
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
                <tr>{['Tanggal', 'Foto', 'Hasil', 'Jumlah Lesi', 'Kelas Dominan', 'Confidence', 'Aksi'].map((h) => <th key={h} className="px-4 py-3">{h}</th>)}</tr>
              </thead>
              <tbody className="divide-y divide-border">
                {data.items.map((s) => (
                  <tr key={s.scan_id}>
                    <td className="px-4 py-3">{fmtDate(s.created_at, true)}</td>
                    <td className="px-4 py-3">{s.thumbnail_url && <img src={s.thumbnail_url} alt="" className="h-12 w-12 rounded-btn object-cover" />}</td>
                    <td className="px-4 py-3"><Sev s={s.severity} /></td>
                    <td className="px-4 py-3">{s.total_lesions}</td>
                    <td className="px-4 py-3">{s.dominant_class ? CLASS_META[s.dominant_class].label : '-'}</td>
                    <td className="px-4 py-3">{pct(s.avg_confidence, 1)}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Link to={`/history/${s.scan_id}`} className="btn-outline px-3 py-1.5">Lihat</Link>
                        <button aria-label="Hapus" className="rounded p-2 text-danger hover:bg-red-50" onClick={() => setToDelete(s)}><Trash2 className="h-4 w-4" /></button>
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
                  <div className="flex items-center gap-2"><Sev s={s.severity} /><span>{s.total_lesions} lesi</span></div>
                  <div className="flex gap-2 pt-1">
                    <Link to={`/history/${s.scan_id}`} className="btn-outline px-3 py-1.5">Lihat</Link>
                    <button className="btn-outline px-3 py-1.5 text-danger" onClick={() => setToDelete(s)}>Hapus</button>
                  </div>
                </div>
              </li>
            ))}
          </ul>

          <nav className="flex items-center justify-center gap-3" aria-label="Paginasi">
            <button className="btn-outline" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Sebelumnya</button>
            <span className="text-sm">Halaman {page} dari {totalPages}</span>
            <button className="btn-outline" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>Berikutnya</button>
          </nav>
        </>
      )}

      {toDelete && (
        <Modal title="Hapus riwayat?" onClose={() => setToDelete(null)}>
          <p className="mb-5 text-sm">Scan tanggal {fmtDate(toDelete.created_at, true)} beserta fotonya akan dihapus permanen.</p>
          <div className="flex gap-3">
            <button className="btn-outline flex-1" onClick={() => setToDelete(null)}>Batal</button>
            <button className="btn-danger flex-1" onClick={confirmDelete}>Hapus</button>
          </div>
        </Modal>
      )}
    </div>
  );
}
