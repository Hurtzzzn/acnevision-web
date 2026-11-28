import { ArrowLeft, Info, ScanFace } from 'lucide-react';

interface CameraConsentViewProps {
  onBack: () => void;
  onAllowCamera: () => void;
  onPickGallery: () => void;
}

/** Pre-permission explanation screen matching "Izin kamera" design (181118). */
export function CameraConsentView({ onBack, onAllowCamera, onPickGallery }: CameraConsentViewProps) {
  return (
    <div className="flex-1 flex flex-col justify-between bg-white text-slate-900 overflow-y-auto">
      <div className="px-5 pt-4 pb-6 space-y-5">
        {/* Top Bar */}
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="w-9 h-9 rounded-full flex items-center justify-center text-slate-700 hover:bg-slate-100 transition-colors"
            aria-label="Kembali"
          >
            <ArrowLeft className="w-5 h-5 stroke-[2.2]" />
          </button>
          <h1 className="text-[17px] font-bold text-slate-900">Akses kamera</h1>
        </div>

        {/* Hero Card */}
        <div className="bg-[#EEF4FF] rounded-[24px] p-5 space-y-3 border border-blue-100/70">
          <div className="w-11 h-11 rounded-2xl bg-white text-[#2563EB] flex items-center justify-center shadow-xs">
            <ScanFace className="w-6 h-6 stroke-[2]" />
          </div>
          <h2 className="text-[22px] font-extrabold text-slate-900 leading-snug tracking-tight">
            Satu foto untuk memahami kulitmu.
          </h2>
          <p className="text-xs text-slate-600 leading-relaxed">
            Izinkan kamera agar kamu bisa mengambil foto wajah untuk dianalisis.
          </p>
        </div>

        {/* Privacy Guarantees */}
        <div className="space-y-4 px-1 pt-1">
          <div>
            <h3 className="text-xs font-bold text-slate-900">Hanya saat kamu memindai</h3>
            <p className="text-xs text-slate-500 mt-0.5">Kamera tidak berjalan di latar belakang.</p>
          </div>
          <div>
            <h3 className="text-xs font-bold text-slate-900">Tidak otomatis disimpan</h3>
            <p className="text-xs text-slate-500 mt-0.5">Persetujuan penyimpanan foto diminta terpisah.</p>
          </div>
          <div>
            <h3 className="text-xs font-bold text-slate-900">Tetap bisa lewat galeri</h3>
            <p className="text-xs text-slate-500 mt-0.5">Pilih satu foto tanpa membuka kamera.</p>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="px-5 pb-6 space-y-2.5">
        <p className="text-[11px] text-slate-400 text-center pb-1">
          Izin perangkat akan diminta setelah kamu melanjutkan.
        </p>
        <button
          onClick={onAllowCamera}
          className="w-full bg-[#2563EB] hover:bg-blue-700 active:scale-[0.99] text-white font-semibold text-sm py-3.5 rounded-2xl shadow-lg shadow-blue-500/20 transition-all"
        >
          Izinkan kamera
        </button>
        <button
          onClick={onPickGallery}
          className="w-full bg-[#EEF4FF] hover:bg-blue-100/80 text-[#2563EB] font-semibold text-sm py-3.5 rounded-2xl transition-colors"
        >
          Pilih dari galeri
        </button>
        <button
          onClick={onBack}
          className="w-full text-slate-500 hover:text-slate-800 text-xs font-medium py-2 transition-colors"
        >
          Nanti saja
        </button>
      </div>
    </div>
  );
}

interface CameraDeniedViewProps {
  onBack: () => void;
  onRetryCamera: () => void;
  onPickGallery: () => void;
  onGoHome: () => void;
}

/** Camera permission denied screen matching "Izin kamera ditolak" design (181111). */
export function CameraDeniedView({ onBack, onRetryCamera, onPickGallery, onGoHome }: CameraDeniedViewProps) {
  return (
    <div className="flex-1 flex flex-col justify-between bg-white text-slate-900 overflow-y-auto">
      <div className="px-5 pt-4 pb-6 space-y-5">
        {/* Top Bar */}
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="w-9 h-9 rounded-full flex items-center justify-center text-slate-700 hover:bg-slate-100 transition-colors"
            aria-label="Kembali"
          >
            <ArrowLeft className="w-5 h-5 stroke-[2.2]" />
          </button>
          <h1 className="text-[17px] font-bold text-slate-900">Akses kamera</h1>
        </div>

        {/* Amber Warning Card */}
        <div className="bg-[#FEF3C7]/70 rounded-[24px] p-5 space-y-2.5 border border-amber-200/60">
          <div className="w-9 h-9 rounded-full border border-amber-600/40 text-amber-700 flex items-center justify-center">
            <Info className="w-4 h-4" />
          </div>
          <h2 className="text-[22px] font-extrabold text-slate-900 leading-snug tracking-tight">
            Kamera belum bisa digunakan
          </h2>
          <p className="text-xs text-slate-600 leading-relaxed">
            Izin kamera tidak diberikan. Kamu tetap bisa menganalisis foto dari galeri.
          </p>
        </div>

        {/* Instructions */}
        <div className="space-y-2 px-1">
          <h3 className="text-sm font-bold text-slate-900">Aktifkan lewat pengaturan</h3>
          <ol className="text-xs text-slate-500 space-y-1.5 list-decimal list-inside">
            <li>Buka Pengaturan perangkat.</li>
            <li>Pilih AcneVision AI &rarr; Izin.</li>
            <li>Aktifkan izin Kamera.</li>
          </ol>
        </div>

        {/* Privacy Control Note */}
        <div className="bg-[#EEF4FF] rounded-[20px] p-4 space-y-1 border border-blue-100/60">
          <p className="text-xs font-bold text-[#2563EB]">Kamu tetap memegang kendali</p>
          <p className="text-xs text-slate-600 leading-relaxed">
            Memberi izin kamera bukan berarti menyetujui penyimpanan foto.
          </p>
        </div>
      </div>

      {/* Actions */}
      <div className="px-5 pb-6 space-y-2.5">
        <button
          onClick={onRetryCamera}
          className="w-full bg-[#2563EB] hover:bg-blue-700 active:scale-[0.99] text-white font-semibold text-sm py-3.5 rounded-2xl shadow-lg shadow-blue-500/20 transition-all"
        >
          Coba aktifkan kamera lagi
        </button>
        <button
          onClick={onPickGallery}
          className="w-full bg-[#EEF4FF] hover:bg-blue-100/80 text-[#2563EB] font-semibold text-sm py-3.5 rounded-2xl transition-colors"
        >
          Pilih dari galeri
        </button>
        <button
          onClick={onGoHome}
          className="w-full text-slate-500 hover:text-slate-800 text-xs font-medium py-2 transition-colors"
        >
          Kembali ke beranda
        </button>
      </div>
    </div>
  );
}
