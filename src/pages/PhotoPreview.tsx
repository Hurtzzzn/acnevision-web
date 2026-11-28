import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { useScan } from '../store/scan';

export default function PhotoPreview() {
  const navigate = useNavigate();
  const { pendingPhoto, setPendingPhoto } = useScan();
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!pendingPhoto) {
      navigate('/scan', { replace: true });
    }
  }, [pendingPhoto, navigate]);

  if (!pendingPhoto) return null;

  const isCamera = pendingPhoto.source === 'camera';

  const handlePickOtherGallery = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    const previewUrl = URL.createObjectURL(file);
    setPendingPhoto({ file, previewUrl, source: 'gallery', originalFile: file });
  };

  return (
    <div className="flex-1 flex flex-col justify-between bg-white overflow-y-auto">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handlePickOtherGallery}
        className="hidden"
      />

      <div className="px-5 pt-4 pb-6 space-y-4">
        {/* Top Bar */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/scan')}
            className="w-9 h-9 rounded-full flex items-center justify-center text-slate-700 hover:bg-slate-100 transition-colors"
            aria-label="Kembali"
          >
            <ArrowLeft className="w-5 h-5 stroke-[2.2]" />
          </button>
          <h1 className="text-[17px] font-bold text-slate-900">Pratinjau foto</h1>
        </div>

        {/* Source Badge */}
        <p className="text-[11px] font-bold tracking-wider text-[#2563EB] uppercase">
          SUMBER FOTO · {isCamera ? 'KAMERA' : 'GALERI'}
        </p>

        {/* Photo Card */}
        <div className="rounded-[24px] overflow-hidden aspect-[4/4.2] bg-slate-100 border border-slate-100 shadow-xs">
          <img
            src={pendingPhoto.previewUrl}
            alt="Pratinjau foto wajah"
            className="w-full h-full object-cover object-center"
          />
        </div>

        {/* Clarity Check Box */}
        <div className="bg-[#EEF4FF]/80 rounded-[20px] p-4 space-y-1 border border-blue-100/60">
          <h2 className="text-xs font-bold text-slate-900">Wajah terlihat jelas</h2>
          <p className="text-xs text-slate-600 leading-relaxed">
            Pastikan seluruh wajah terlihat, cahaya cukup, dan foto tanpa filter.
          </p>
        </div>

        {/* Context Prompt */}
        <p className="text-xs text-slate-500 leading-relaxed px-0.5">
          {isCamera
            ? 'Sudah sesuai? Lanjutkan dengan foto ini.'
            : 'Foto terpilih hanya dipakai setelah kamu mengonfirmasi.'}
        </p>
      </div>

      {/* Bottom Action Dock */}
      <div className="px-5 pb-6 space-y-2.5">
        <p className="text-[11px] text-slate-400 text-center pb-0.5">
          Foto belum dianalisis atau disimpan.
        </p>

        <button
          onClick={() => navigate('/scan/consent')}
          className="w-full bg-[#2563EB] hover:bg-blue-700 active:scale-[0.99] text-white font-semibold text-sm py-3.5 rounded-2xl shadow-lg shadow-blue-500/20 transition-all"
        >
          Pakai foto ini
        </button>

        <div className="grid grid-cols-2 gap-2.5">
          <button
            onClick={() => {
              if (isCamera) navigate('/scan');
              else fileInputRef.current?.click();
            }}
            className="w-full bg-[#EEF4FF] hover:bg-blue-100/80 text-[#2563EB] font-semibold text-sm py-3.5 rounded-2xl transition-colors"
          >
            {isCamera ? 'Ulangi' : 'Pilih foto lain'}
          </button>

          <button
            onClick={() => navigate('/scan/crop')}
            className="w-full bg-[#EEF4FF] hover:bg-blue-100/80 text-[#2563EB] font-semibold text-sm py-3.5 rounded-2xl transition-colors"
          >
            Crop
          </button>
        </div>
      </div>
    </div>
  );
}
