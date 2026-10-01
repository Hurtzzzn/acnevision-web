import { useCallback, useEffect, useState } from 'react';
import type { AdminUser, Paginated, UserRole, UserStatus } from '@acnevision/shared';
import { api } from '../../lib/runtime';
import { errMessage, fmtDate } from '../../lib/errors';
import { useAuth } from '../../store/auth';
import { useUi } from '../../store/ui';
import { ErrorBox, Modal, Spinner } from '../../components/ui';

type Pending = { user: AdminUser; patch: { status?: UserStatus; role?: UserRole }; text: string };

export default function Users() {
  const me = useAuth((s) => s.user);
  const toast = useUi((s) => s.toast);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<UserStatus | ''>('');
  const [role, setRole] = useState<UserRole | ''>('');
  const [page, setPage] = useState(1);
  const [data, setData] = useState<Paginated<AdminUser> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState<Pending | null>(null);

  const load = useCallback(() => {
    setError(null);
    api.adminUsers({ search, status, role, page }).then(setData).catch((e) => setError(errMessage(e)));
  }, [search, status, role, page]);
  useEffect(() => { const t = setTimeout(load, 250); return () => clearTimeout(t); }, [load]);

  async function apply() {
    if (!pending) return;
    try {
      await api.adminUpdateUser(pending.user.id, pending.patch);
      toast('Perubahan disimpan');
      setPending(null);
      load();
    } catch (e) { toast(errMessage(e), 'error'); setPending(null); }
  }

  const totalPages = data ? Math.max(1, Math.ceil(data.total / data.page_size)) : 1;

  return (
    <div className="space-y-4">
      <h1 className="text-3xl">Kelola User</h1>
      <div className="flex flex-wrap gap-2">
        <input className="input max-w-xs" placeholder="Cari nama atau email" aria-label="Cari" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
        <select className="input w-auto" aria-label="Status" value={status} onChange={(e) => { setStatus(e.target.value as UserStatus | ''); setPage(1); }}>
          <option value="">Semua status</option><option value="active">Aktif</option><option value="suspended">Nonaktif</option>
        </select>
        <select className="input w-auto" aria-label="Role" value={role} onChange={(e) => { setRole(e.target.value as UserRole | ''); setPage(1); }}>
          <option value="">Semua role</option><option value="user">User</option><option value="admin">Admin</option>
        </select>
      </div>
      {error && <ErrorBox message={error} onRetry={load} />}
      {!data && !error && <Spinner label="Memuat..." />}
      {data && (
        <div className="card overflow-x-auto p-0 md:p-0">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-border bg-primary-50 text-xs uppercase text-ink-600">
              <tr>{['Nama', 'Email', 'Role', 'Status', 'Daftar', 'Terakhir aktif', 'Scan', 'Aksi'].map((h) => <th key={h} className="whitespace-nowrap px-4 py-3">{h}</th>)}</tr>
            </thead>
            <tbody className="divide-y divide-border">
              {data.items.map((u) => {
                const self = u.id === me?.id;
                return (
                  <tr key={u.id}>
                    <td className="px-4 py-3">{u.full_name ?? '-'}</td><td className="px-4 py-3">{u.email}</td>
                    <td className="px-4 py-3">{u.role}</td>
                    <td className="px-4 py-3"><span className={`badge ${u.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>{u.status === 'active' ? 'Aktif' : 'Nonaktif'}</span></td>
                    <td className="whitespace-nowrap px-4 py-3">{fmtDate(u.created_at)}</td>
                    <td className="whitespace-nowrap px-4 py-3">{u.last_seen_at ? fmtDate(u.last_seen_at) : '-'}</td>
                    <td className="px-4 py-3">{u.saved_scans}</td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        <button className="btn-outline px-3 py-1.5" disabled={self}
                          onClick={() => setPending({ user: u, patch: { status: u.status === 'active' ? 'suspended' : 'active' }, text: u.status === 'active' ? `Nonaktifkan ${u.email}?` : `Aktifkan ${u.email}?` })}>
                          {u.status === 'active' ? 'Nonaktifkan' : 'Aktifkan'}
                        </button>
                        <button className="btn-outline px-3 py-1.5" disabled={self}
                          onClick={() => setPending({ user: u, patch: { role: u.role === 'admin' ? 'user' : 'admin' }, text: `Ubah role ${u.email} menjadi ${u.role === 'admin' ? 'user' : 'admin'}?` })}>
                          Ubah Role
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      {data && (
        <nav className="flex items-center justify-center gap-3" aria-label="Paginasi">
          <button className="btn-outline" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Sebelumnya</button>
          <span className="text-sm">Halaman {page} dari {totalPages}</span>
          <button className="btn-outline" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>Berikutnya</button>
        </nav>
      )}
      {pending && (
        <Modal title="Konfirmasi" onClose={() => setPending(null)}>
          <p className="mb-5 text-sm">{pending.text}</p>
          <div className="flex gap-3"><button className="btn-outline flex-1" onClick={() => setPending(null)}>Batal</button><button className="btn-primary flex-1" onClick={apply}>Ya, lanjutkan</button></div>
        </Modal>
      )}
    </div>
  );
}
