import { useEffect, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/runtime';
import { errMessage, fmtDate } from '../lib/errors';
import { useAuth } from '../store/auth';
import { useUi } from '../store/ui';

export default function Profile() {
  const { user, setUser, logout } = useAuth();
  const toast = useUi((s) => s.toast);
  const navigate = useNavigate();
  const [name, setName] = useState(user?.full_name ?? '');
  const [busy, setBusy] = useState(false);
  const [stats, setStats] = useState<{ scans: number; chats: number } | null>(null);

  useEffect(() => {
    Promise.all([api.listScans(1, 1), api.listConversations(1)])
      .then(([s, c]) => setStats({ scans: s.total, chats: c.total }))
      .catch(() => setStats(null));
  }, []);

  if (!user) return null;

  async function save(e: FormEvent) {
    e.preventDefault();
    if (!name.trim()) return toast('Nama tidak boleh kosong.', 'error');
    setBusy(true);
    try {
      setUser(await api.updateMe({ full_name: name.trim() }));
      toast('Profil diperbarui');
    } catch (err) { toast(errMessage(err), 'error'); }
    finally { setBusy(false); }
  }

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <h1>Profil</h1>
      <div className="card space-y-5">
        <div className="flex items-center gap-4">
          <span className="flex h-16 w-16 items-center justify-center rounded-full bg-primary-600 text-2xl font-bold text-white">
            {(user.full_name ?? user.email)[0].toUpperCase()}
          </span>
          <div><p className="font-semibold text-ink-900">{user.full_name ?? '-'}</p><p className="text-sm">{user.email}</p></div>
        </div>
        <form onSubmit={save} className="space-y-4">
          <div><label htmlFor="name" className="mb-1 block text-sm font-medium">Nama</label>
            <input id="name" className="input" value={name} onChange={(e) => setName(e.target.value)} /></div>
          <div><label htmlFor="email" className="mb-1 block text-sm font-medium">Email</label>
            <input id="email" className="input bg-slate-50" value={user.email} readOnly /></div>
          <p className="text-sm">Bergabung sejak {fmtDate(user.created_at)}</p>
          <button className="btn-primary" disabled={busy}>Simpan</button>
        </form>
      </div>
      {stats && (
        <div className="grid grid-cols-2 gap-4">
          <div className="card text-center"><p className="text-3xl font-bold text-ink-900">{stats.scans}</p><p className="text-sm">Scan tersimpan</p></div>
          <div className="card text-center"><p className="text-3xl font-bold text-ink-900">{stats.chats}</p><p className="text-sm">Konsultasi</p></div>
        </div>
      )}
      <button className="btn-outline" onClick={async () => { await logout(); navigate('/'); }}>Keluar</button>
    </div>
  );
}
