import { useEffect, useState } from 'react';
import type { AuditLogItem, Paginated } from '@acnevision/shared';
import { api } from '../../lib/runtime';
import { errMessage, fmtDate } from '../../lib/errors';
import { EmptyState, ErrorBox, Spinner } from '../../components/ui';

export default function Audit() {
  const [page, setPage] = useState(1);
  const [data, setData] = useState<Paginated<AuditLogItem> | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setError(null);
    api.adminAudit(page).then(setData).catch((e) => setError(errMessage(e)));
  }, [page]);

  const totalPages = data ? Math.max(1, Math.ceil(data.total / data.page_size)) : 1;
  return (
    <div className="space-y-4">
      <h1 className="text-3xl">Audit Log</h1>
      {error && <ErrorBox message={error} />}
      {!data && !error && <Spinner label="Memuat..." />}
      {data && data.total === 0 && <EmptyState title="Belum ada aksi admin" />}
      {data && data.total > 0 && (
        <>
          <div className="card overflow-x-auto p-0 md:p-0">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-border bg-primary-50 text-xs uppercase text-ink-600">
                <tr>{['Waktu', 'Admin', 'Aksi', 'Target', 'Detail'].map((h) => <th key={h} className="px-4 py-3">{h}</th>)}</tr>
              </thead>
              <tbody className="divide-y divide-border">
                {data.items.map((l) => (
                  <tr key={l.id}>
                    <td className="whitespace-nowrap px-4 py-3">{fmtDate(l.created_at, true)}</td><td className="px-4 py-3">{l.admin_email}</td>
                    <td className="px-4 py-3">{l.action}</td><td className="px-4 py-3">{l.target_email ?? '-'}</td>
                    <td className="px-4 py-3 font-mono text-xs">{JSON.stringify(l.details)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <nav className="flex items-center justify-center gap-3" aria-label="Paginasi">
            <button className="btn-outline" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Sebelumnya</button>
            <span className="text-sm">Halaman {page} dari {totalPages}</span>
            <button className="btn-outline" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>Berikutnya</button>
          </nav>
        </>
      )}
    </div>
  );
}
