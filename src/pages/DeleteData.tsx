import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Info } from 'lucide-react';
import { useAuth } from '../store/auth';
import { useScan } from '../store/scan';
import { api } from '../lib/runtime';

export default function DeleteData() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const resetScanStore = useScan((s) => s.reset);

  const [scanCount, setScanCount] = useState(0);
  const [deleting, setDeleting] = useState(false);
  const [deletedDone, setDeletedDone] = useState(false);

  useEffect(() => {
    if (!user) return;
    api
      .listScans(1, 50)
      .then((res) => setScanCount(res.total))
      .catch(() => {});
  }, [user]);

  const handleDeleteAll = async () => {
    setDeleting(true);
    try {
      if (user) {
        const scans = await api.listScans(1, 50).catch(() => ({ items: [] }));
        await Promise.all(scans.items.map((s) => api.deleteScan(s.scan_id).catch(() => {})));
        const convs = await api.listConversations(1).catch(() => ({ items: [] }));
        await Promise.all(convs.items.map((c) => api.deleteConversation(c.conversation_id).catch(() => {})));
      }
      resetScanStore();
      setDeletedDone(true);
    } finally {
      setDeleting(false);
    }
  };

  // Completion View matching Screenshot 2026-11-28 181104.png
  if (deletedDone) {
    return (
      <div className="flex-1 flex flex-col justify-between bg-white p-5">
        <div className="flex-1 flex flex-col items-center justify-center">
          <div className="w-full rounded-[24px] bg-[#C04646] text-white py-14 px-6 text-center shadow-lg">
            <h1 className="text-3xl font-extrabold tracking-wide leading-snug text-white">
              SEMUA DATA
              <br />
              TELAH DI
              <br />
              HAPUS
            </h1>
          </div>
        </div>

        <button
          onClick={() => navigate(user ? '/dashboard' : '/', { replace: true })}
          className="w-full bg-[#EEF4FF] hover:bg-blue-100/80 text-[#2563EB] font-semibold text-sm py-3.5 rounded-2xl transition-colors"
        >
          Kembali ke beranda
        </button>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col justify-between bg-white overflow-y-auto">
      <div className="px-5 pt-4 pb-6 space-y-5">
        {/* Top Bar */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/profile')}
            className="w-9 h-9 rounded-full flex items-center justify-center text-slate-700 hover:bg-slate-100 transition-colors"
            aria-label="Kembali"
          >
            <ArrowLeft className="w-5 h-5 stroke-[2.2]" />
          </button>
          <h1 className="text-[17px] font-bold text-slate-900">Hapus data</h1>
        </div>

        {/* Red Warning Card */}
        <div className="bg-[#FEE2E2]/65 rounded-[24px] p-5 space-y-2.5 border border-red-200/60">
          <div className="w-9 h-9 rounded-full border border-amber-700/40 text-amber-800 flex items-center justify-center">
            <Info className="w-4 h-4" />
          </div>
          <h2 className="text-[22px] font-extrabold text-slate-900 leading-snug tracking-tight">
            Hapus semua data kulitmu?
          </h2>
          <p className="text-xs font-semibold text-red-700 leading-relaxed">
            Tindakan ini permanen dan tidak bisa dibatalkan.
          </p>
        </div>

        {/* Items list */}
        <div className="bg-[#F8FAFC] rounded-[20px] p-4 space-y-2 border border-slate-100">
          <h3 className="text-xs font-bold text-slate-900">Yang akan dihapus</h3>
          <ul className="text-xs text-slate-600 space-y-1.5 list-disc list-inside">
            <li>Semua foto yang kamu setujui untuk disimpan</li>
            <li>{scanCount} hasil analisis dan riwayat pemindaian</li>
            <li>Catatan serta data perbandingan</li>
          </ul>
        </div>

        <p className="text-xs text-slate-500 leading-relaxed px-0.5">
          Akun dan pengingat pindai tetap ada. Kamu bisa memulai riwayat baru kapan saja.
        </p>
      </div>

      {/* Bottom Action Buttons */}
      <div className="px-5 pb-6 space-y-2.5">
        <button
          onClick={() => navigate('/profile')}
          disabled={deleting}
          className="w-full bg-[#EEF4FF] hover:bg-blue-100/80 text-[#2563EB] font-semibold text-sm py-3.5 rounded-2xl transition-colors"
        >
          Batal, pertahankan data
        </button>

        <button
          onClick={handleDeleteAll}
          disabled={deleting}
          className="w-full bg-[#C04646] hover:bg-red-700 active:scale-[0.99] text-white font-semibold text-sm py-3.5 rounded-2xl shadow-lg shadow-red-500/20 transition-all disabled:opacity-60"
        >
          {deleting ? 'Menghapus data...' : 'Ya, hapus semua data'}
        </button>
      </div>
    </div>
  );
}
