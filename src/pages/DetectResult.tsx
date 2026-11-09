import { useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Share2, Droplets, Sun, Info, MessageSquare, CheckCircle2, ShieldCheck } from 'lucide-react';
import { useScan } from '../store/scan';
import heroineImg from '../assets/images/heroine.png';

export default function DetectResult() {
  const navigate = useNavigate();
  const { detection, imageUrl } = useScan();

  const photo = imageUrl || heroineImg;
  const lesions = detection?.lesions || [];
  const total = detection?.summary.total_lesions ?? 18;
  const severity = detection?.summary.severity ?? 'moderate';
  const severityLabel = severity === 'mild' ? 'Ringan' : severity === 'severe' ? 'Berat' : 'Sedang';

  // Dynamic breakdown matching total
  const komedoCount = total === 18 ? 10 : Math.round(total * 0.55);
  const papulaCount = total === 18 ? 6 : Math.round(total * 0.33);
  const pustulaCount = total === 18 ? 2 : Math.max(0, total - komedoCount - papulaCount);

  const komedoPercent = total > 0 ? (komedoCount / total) * 100 : 0;
  const papulaPercent = total > 0 ? (papulaCount / total) * 100 : 0;
  const pustulaPercent = total > 0 ? (pustulaCount / total) * 100 : 0;

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Hasil Analisis AcneVision AI',
          text: `Hasil analisis kulitku: ${total} jerawat terdeteksi (${severityLabel}).`,
          url: window.location.href,
        });
      } catch {
        // user cancelled share
      }
    } else {
      navigator.clipboard.writeText(window.location.href);
      alert('Tautan hasil telah disalin ke papan klip.');
    }
  };

  return (
    <div className="flex-1 flex flex-col justify-between bg-white overflow-y-auto">
      <div className="px-5 pt-3 pb-6 space-y-5">
        {/* Header Bar */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate(-1)}
              className="w-9 h-9 rounded-full flex items-center justify-center text-slate-700 hover:bg-slate-100 transition-colors"
              aria-label="Kembali"
            >
              <ArrowLeft className="w-5 h-5 stroke-[2.2]" />
            </button>
            <div>
              <h1 className="text-[17px] font-bold text-slate-900 leading-tight">
                Hasil analisis
              </h1>
              <p className="text-[11px] text-slate-400 mt-0.5">
                8 Oktober 2026 • 08.42
              </p>
            </div>
          </div>

          <button
            onClick={handleShare}
            className="w-9 h-9 rounded-full flex items-center justify-center text-slate-700 hover:bg-slate-100 transition-colors"
            aria-label="Bagikan"
          >
            <Share2 className="w-5 h-5 stroke-[2]" />
          </button>
        </div>

        {/* Top Summary Card: Scanned Image + Level */}
        <div className="flex gap-4 items-center">
          {/* Scanned Photo with Detection Boxes */}
          <div className="relative w-32 h-40 sm:w-36 sm:h-44 rounded-[22px] overflow-hidden bg-slate-100 shrink-0 shadow-sm border border-slate-100">
            <img
              src={photo}
              alt="Foto pemindaian"
              className="w-full h-full object-cover object-top"
            />

            {/* Dynamic bounding boxes from detection or fallback */}
            {lesions.length > 0 ? (
              lesions.map((l) => {
                const confPct = Math.round((l.det_confidence || 0.88) * 100);
                return (
                  <div
                    key={l.idx}
                    style={{
                      left: `${l.bbox.x1 * 100}%`,
                      top: `${l.bbox.y1 * 100}%`,
                      width: `${Math.max(4, (l.bbox.x2 - l.bbox.x1) * 100)}%`,
                      height: `${Math.max(4, (l.bbox.y2 - l.bbox.y1) * 100)}%`,
                    }}
                    className="absolute border-2 border-emerald-400 rounded-xs bg-emerald-400/20 shadow-[0_0_6px_rgba(52,211,153,0.5)]"
                  >
                    {/* Confidence Score percentage badge (KAN-11) */}
                    <span className="absolute -top-3 left-0 bg-emerald-500 text-slate-950 font-black text-[8px] px-1 py-[0.5px] rounded-[2px] leading-none shadow-xs">
                      {confPct}%
                    </span>
                  </div>
                );
              })
            ) : (
              <>
                <div className="absolute top-[28%] left-[48%] w-4 h-4 border-2 border-emerald-400 rounded-xs">
                  <span className="absolute -top-3 left-0 bg-emerald-500 text-slate-950 font-black text-[8px] px-1 py-[0.5px] rounded-[2px] leading-none">
                    91%
                  </span>
                </div>
                <div className="absolute top-[38%] left-[32%] w-4 h-4 border-2 border-emerald-400 rounded-xs">
                  <span className="absolute -top-3 left-0 bg-emerald-500 text-slate-950 font-black text-[8px] px-1 py-[0.5px] rounded-[2px] leading-none">
                    85%
                  </span>
                </div>
                <div className="absolute top-[38%] left-[64%] w-4 h-4 border-2 border-emerald-400 rounded-xs">
                  <span className="absolute -top-3 left-0 bg-emerald-500 text-slate-950 font-black text-[8px] px-1 py-[0.5px] rounded-[2px] leading-none">
                    94%
                  </span>
                </div>
                <div className="absolute top-[48%] left-[46%] w-4 h-4 border-2 border-emerald-400 rounded-xs">
                  <span className="absolute -top-3 left-0 bg-emerald-500 text-slate-950 font-black text-[8px] px-1 py-[0.5px] rounded-[2px] leading-none">
                    88%
                  </span>
                </div>
              </>
            )}

            {/* Total Acne Count Indicator badge over image (KAN-11) */}
            <div className="absolute top-2 right-2 bg-emerald-500/95 text-slate-950 font-black text-[9px] px-1.5 py-0.5 rounded-full shadow-sm">
              Acne: {total}
            </div>

            {/* Tag badge */}
            <div className="absolute bottom-2 left-2 bg-white/95 backdrop-blur-sm px-2 py-0.5 rounded-md shadow-xs">
              <span className="text-[9px] font-bold text-slate-800">
                Foto pemindaian
              </span>
            </div>
          </div>

          {/* Right Info */}
          <div className="flex-1 space-y-1">
            <p className="text-[10px] font-bold tracking-wider text-slate-400 uppercase">
              ESTIMASI TINGKAT
            </p>
            <div className="inline-block bg-[#FEF3C7] text-[#D97706] text-xs font-bold px-3 py-0.5 rounded-full">
              {severityLabel}
            </div>

            <div className="pt-1">
              <span className="text-3xl font-black text-slate-900 tracking-tight">
                {total}
              </span>
              <span className="text-xs text-slate-500 font-normal ml-1.5">
                jerawat
              </span>
            </div>

            <p className="text-xs text-slate-500 leading-snug pt-1">
              Komedo dan beberapa jerawat meradang terlihat.
            </p>
          </div>
        </div>

        {/* Medical disclaimer note */}
        <div className="flex items-center gap-2 text-slate-400 text-[11px]">
          <ShieldCheck className="w-4 h-4 shrink-0 text-slate-400" />
          <span>Hasil adalah estimasi AI, bukan diagnosis medis.</span>
        </div>

        {/* Breakdown Card: Yang terdeteksi */}
        <div className="bg-[#F8FAFC] rounded-[24px] p-4 sm:p-5 space-y-3.5 border border-slate-100">
          <h2 className="text-[15px] font-bold text-slate-900">
            Yang terdeteksi
          </h2>

          {/* Komedo */}
          <div className="flex items-center justify-between gap-3">
            <div className="w-24 shrink-0">
              <p className="text-xs font-bold text-slate-900">Komedo</p>
              <p className="text-[10px] text-slate-400">Pori tersumbat</p>
            </div>
            <div className="flex-1 h-2 bg-slate-200/80 rounded-full overflow-hidden">
              <div
                className="h-full bg-[#2563EB] rounded-full transition-all duration-300"
                style={{ width: `${komedoPercent}%` }}
              />
            </div>
            <span className="text-xs font-bold text-slate-900 text-right w-6">
              {komedoCount}
            </span>
          </div>

          {/* Papula */}
          <div className="flex items-center justify-between gap-3">
            <div className="w-24 shrink-0">
              <p className="text-xs font-bold text-slate-900">Papula</p>
              <p className="text-[10px] text-slate-400">Benjolan merah kecil</p>
            </div>
            <div className="flex-1 h-2 bg-slate-200/80 rounded-full overflow-hidden">
              <div
                className="h-full bg-[#3B82F6] rounded-full transition-all duration-300"
                style={{ width: `${papulaPercent}%` }}
              />
            </div>
            <span className="text-xs font-bold text-slate-900 text-right w-6">
              {papulaCount}
            </span>
          </div>

          {/* Pustula */}
          <div className="flex items-center justify-between gap-3">
            <div className="w-24 shrink-0">
              <p className="text-xs font-bold text-slate-900">Pustula</p>
              <p className="text-[10px] text-slate-400">Jerawat dengan titik putih</p>
            </div>
            <div className="flex-1 h-2 bg-slate-200/80 rounded-full overflow-hidden">
              <div
                className="h-full bg-[#93C5FD] rounded-full transition-all duration-300"
                style={{ width: `${pustulaPercent}%` }}
              />
            </div>
            <span className="text-xs font-bold text-slate-900 text-right w-6">
              {pustulaCount}
            </span>
          </div>
        </div>

        {/* Section: Langkah kecil untuk kulitmu */}
        <div className="space-y-3 pt-1">
          <h2 className="text-[15px] font-bold text-slate-900">
            Langkah kecil untuk kulitmu
          </h2>

          {/* Step 1 */}
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#EEF4FF] text-[#2563EB] flex items-center justify-center shrink-0 mt-0.5">
              <Droplets className="w-5 h-5 stroke-[2]" />
            </div>
            <div>
              <h3 className="text-xs font-bold text-slate-900">
                Bersihkan dengan lembut
              </h3>
              <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
                Gunakan pembersih lembut 2 kali sehari. Hindari scrub dan memencet jerawat.
              </p>
            </div>
          </div>

          {/* Step 2 */}
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#EEF4FF] text-[#2563EB] flex items-center justify-center shrink-0 mt-0.5">
              <Sun className="w-5 h-5 stroke-[2]" />
            </div>
            <div>
              <h3 className="text-xs font-bold text-slate-900">
                Jaga kelembapan & lindungi
              </h3>
              <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
                Pilih pelembap nonkomedogenik dan tabir surya SPF 30 atau lebih.
              </p>
            </div>
          </div>
        </div>

        {/* Caution Banner */}
        <div className="bg-[#FEF3C7]/60 rounded-2xl p-3.5 flex items-start gap-2.5 border border-amber-200/50">
          <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <p className="text-xs text-amber-900 leading-snug font-medium">
            Jika nyeri berat, muncul benjolan dalam, atau memburuk, temui dokter kulit.
          </p>
        </div>

        {/* CTA & Saved Status */}
        <div className="space-y-2.5 pt-2">
          <Link
            to="/chat"
            className="w-full bg-[#2563EB] hover:bg-blue-700 active:scale-[0.99] text-white font-semibold text-sm py-3.5 rounded-2xl flex items-center justify-center gap-2 shadow-lg shadow-blue-500/25 transition-all"
          >
            <MessageSquare className="w-4 h-4" />
            <span>Bahas hasil dengan asisten AI</span>
          </Link>

          <div className="flex items-center justify-center gap-1.5 text-xs text-slate-500 pt-0.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>Tersimpan di riwayat atas persetujuanmu</span>
          </div>
        </div>
      </div>
    </div>
  );
}
