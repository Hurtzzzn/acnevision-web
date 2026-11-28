import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { useScan } from '../store/scan';
import { useAuth } from '../store/auth';
import { useUi } from '../store/ui';
import { Modal } from '../components/ui';

export default function PhotoConsent() {
  const navigate = useNavigate();
  const { pendingPhoto } = useScan();
  const { user } = useAuth();
  const openLoginPrompt = useUi((s) => s.openLoginPrompt);
  const [privacyOpen, setPrivacyOpen] = useState(false);

  useEffect(() => {
    if (!pendingPhoto) {
      navigate('/scan', { replace: true });
    }
  }, [pendingPhoto, navigate]);

  if (!pendingPhoto) return null;

  const handleSaveAndAnalyze = () => {
    if (!user) {
      openLoginPrompt({
        message: 'Masuk terlebih dahulu untuk menyimpan foto dan riwayat analisis ke akunmu.',
        redirectTo: '/scan/consent',
      });
      return;
    }
    navigate('/scan/analyzing?save=1');
  };

  return (
    <div className="flex-1 flex flex-col justify-between bg-[#EEF4FF]/70 overflow-y-auto">
      {/* Top Preview Section */}
      <div className="px-5 pt-4 pb-5 space-y-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/scan/preview')}
            className="w-9 h-9 rounded-full flex items-center justify-center text-slate-700 hover:bg-white/70 transition-colors"
            aria-label="Kembali"
          >
            <ArrowLeft className="w-5 h-5 stroke-[2.2]" />
          </button>
          <h1 className="text-[17px] font-bold text-slate-900">Privasi foto</h1>
        </div>

        <div className="rounded-[24px] overflow-hidden aspect-[4/3.1] bg-white border border-white shadow-xs">
          <img
            src={pendingPhoto.previewUrl}
            alt="Foto siap dianalisis"
            className="w-full h-full object-cover object-center"
          />
        </div>

        <p className="text-sm font-bold text-slate-900">Foto siap dianalisis</p>
      </div>

      {/* White Consent Card */}
      <div className="bg-white rounded-t-[28px] px-5 pt-6 pb-6 space-y-4 shadow-[0_-8px_30px_rgba(15,23,42,0.06)] flex-1 flex flex-col justify-between">
        <div className="space-y-4">
          <div className="space-y-1.5">
            <h2 className="text-[22px] font-extrabold text-slate-900 leading-snug tracking-tight">
              Simpan untuk melihat progres kulitmu?
            </h2>
            <p className="text-xs text-slate-500 leading-relaxed">
              Pilih apakah foto dan hasil analisis ini boleh disimpan ke riwayat akunmu.
            </p>
          </div>

          <div className="bg-[#EEF4FF]/70 rounded-[20px] p-4 space-y-1 border border-blue-100/60">
            <h3 className="text-xs font-bold text-slate-900">Foto wajah, hasil, dan tanggal pindai</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Digunakan untuk riwayat dan perbandingan. Kamu bisa menghapusnya dari Pengaturan.
            </p>
          </div>

          <p className="text-[11px] text-slate-400 leading-relaxed">
            Persetujuan hanya untuk foto ini. Tanpa persetujuan, foto tidak masuk riwayat dan tidak tersedia untuk perbandingan.
          </p>
        </div>

        <div className="space-y-2.5 pt-2">
          <button
            onClick={handleSaveAndAnalyze}
            className="w-full bg-[#2563EB] hover:bg-blue-700 active:scale-[0.99] text-white font-semibold text-sm py-3.5 rounded-2xl shadow-lg shadow-blue-500/20 transition-all"
          >
            Setuju, simpan dan analisis
          </button>

          <button
            onClick={() => navigate('/scan/analyzing?save=0')}
            className="w-full bg-[#EEF4FF] hover:bg-blue-100/80 text-[#2563EB] font-semibold text-sm py-3.5 rounded-2xl transition-colors"
          >
            Analisis tanpa menyimpan
          </button>

          <button
            onClick={() => setPrivacyOpen(true)}
            className="w-full text-center text-xs font-semibold text-[#2563EB] hover:underline pt-1"
          >
            Kebijakan privasi
          </button>
        </div>
      </div>

      {privacyOpen && (
        <Modal title="Kebijakan Privasi Foto" onClose={() => setPrivacyOpen(false)}>
          <div className="space-y-3 text-xs text-slate-600 leading-relaxed">
            <p>
              <strong>1. Tanpa Penyimpanan Otomatis:</strong> Foto wajah yang dianalisis tanpa persetujuan hanya diproses sementara di memori dan langsung dibuang setelah hasil ditampilkan.
            </p>
            <p>
              <strong>2. Kontrol Penuh Pengguna:</strong> Jika Anda memilih menyetujui penyimpanan, foto dan ringkasan hasil disimpan untuk menampilkan grafik progres dan perbandingan sebelum-sesudah.
            </p>
            <p>
              <strong>3. Hak Hapus Permanen:</strong> Anda dapat menghapus seluruh foto dan riwayat kapan saja melalui menu <em>Profil &amp; pengaturan &rarr; Hapus semua data</em>.
            </p>
            <button
              onClick={() => setPrivacyOpen(false)}
              className="w-full mt-2 bg-[#2563EB] text-white font-semibold py-2.5 rounded-xl"
            >
              Saya mengerti
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
