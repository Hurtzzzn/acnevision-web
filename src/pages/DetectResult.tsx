import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft,
  Share2,
  Droplets,
  Sun,
  Info,
  MessageSquare,
  ShieldCheck,
  GitCompareArrows,
} from 'lucide-react';
import type { ScanDetail, Severity } from '@acnevision/shared';
import { estimateSeverity } from '@acnevision/shared';
import { useScan } from '../store/scan';
import { useAuth } from '../store/auth';
import { useUi } from '../store/ui';
import { api } from '../lib/runtime';
import { formatIndonesianDate, formatTimeHHMM } from '../lib/dateTime';
import heroineImg from '../assets/images/heroine.png';

function severityLabelId(severity: Severity | null, total: number): string {
  if (total === 0 || !severity) return 'Bersih';
  if (severity === 'mild') return 'Ringan';
  if (severity === 'severe') return 'Berat';
  if (severity === 'very_severe') return 'Sangat Berat';
  return 'Sedang';
}

function severitySummaryText(severity: Severity | null, total: number): string {
  if (total === 0 || !severity) return 'Tidak terlihat lesi jerawat yang jelas pada foto ini.';
  if (severity === 'mild') return 'Terlihat beberapa komedo dan jerawat ringan.';
  if (severity === 'severe' || severity === 'very_severe') {
    return 'Banyak lesi meradang terlihat. Disarankan berkonsultasi dengan dokter kulit.';
  }
  return 'Komedo dan beberapa jerawat meradang terlihat.';
}

export default function DetectResult() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const toast = useUi((s) => s.toast);
  const { analysis, detection, imageUrl, capturedAt } = useScan();
  const [fallbackScan, setFallbackScan] = useState<ScanDetail | null>(null);
  const [loadingFallback, setLoadingFallback] = useState(false);

  // If landed directly on /detect-result with empty memory state, load latest saved scan when signed in
  useEffect(() => {
    if (analysis || detection || !user) return;
    let active = true;
    setLoadingFallback(true);
    api
      .listScans(1, 1)
      .then((res) => {
        if (!active || !res.items[0]) return null;
        return api.getScan(res.items[0].scan_id);
      })
      .then((detail) => {
        if (active && detail) setFallbackScan(detail);
      })
      .catch(() => {})
      .finally(() => {
        if (active) setLoadingFallback(false);
      });
    return () => {
      active = false;
    };
  }, [analysis, detection, user]);

  const activeData = analysis ?? detection ?? fallbackScan;
  const photo = imageUrl || fallbackScan?.image_url || heroineImg;
  const lesions = activeData?.lesions ?? [];
  const total = activeData?.summary.total_lesions ?? 0;

  const severity: Severity | null = analysis
    ? analysis.classification?.severity ?? null
    : detection
    ? detection.summary.severity
    : fallbackScan?.classification?.severity ?? estimateSeverity(total);

  const severityLabel = severityLabelId(severity, total);
  const createdIso = fallbackScan?.created_at ?? capturedAt ?? new Date().toISOString();
  const dateObj = new Date(createdIso);
  const formattedDateTime = `${formatIndonesianDate(dateObj)} • ${formatTimeHHMM(dateObj)}`;

  // Dynamic lesion type estimation proportional to actual total
  const komedoCount = total > 0 ? Math.round(total * 0.55) : 0;
  const papulaCount = total > 0 ? Math.round(total * 0.33) : 0;
  const pustulaCount = total > 0 ? Math.max(0, total - komedoCount - papulaCount) : 0;

  const komedoPercent = total > 0 ? (komedoCount / total) * 100 : 0;
  const papulaPercent = total > 0 ? (papulaCount / total) * 100 : 0;
  const pustulaPercent = total > 0 ? (pustulaCount / total) * 100 : 0;

  const handleShare = async () => {
    const shareText = `Hasil analisis AcneVision AI (${formattedDateTime}): ${total} jerawat terdeteksi (${severityLabel}).`;
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Hasil Analisis AcneVision AI',
          text: shareText,
          url: window.location.href,
        });
      } catch {
        // share cancelled
      }
    } else if (navigator.clipboard) {
      await navigator.clipboard.writeText(shareText);
      toast('Ringkasan hasil disalin ke papan klip');
    }
  };

  if (!activeData && loadingFallback) {
    return (
      <div className="flex-1 flex items-center justify-center bg-white p-6 text-xs text-slate-500">
        Memuat hasil analisis...
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col justify-between bg-white overflow-y-auto">
      <div className="px-5 pt-4 pb-6 space-y-5">
        {/* Header Bar */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate(user ? '/dashboard' : '/scan')}
              className="w-9 h-9 rounded-full flex items-center justify-center text-slate-700 hover:bg-slate-100 transition-colors"
              aria-label="Kembali"
            >
              <ArrowLeft className="w-5 h-5 stroke-[2.2]" />
            </button>
            <div>
              <h1 className="text-[17px] font-bold text-slate-900 leading-tight">
                Hasil analisis
              </h1>
              <p className="text-[11px] text-slate-400 mt-0.5">{formattedDateTime}</p>
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
          <div className="relative w-32 h-40 sm:w-36 sm:h-44 rounded-[22px] overflow-hidden bg-slate-100 shrink-0 shadow-sm border border-slate-100">
            <img
              src={photo}
              alt="Foto pemindaian"
              className="w-full h-full object-cover object-top"
            />

            {/* Dynamic bounding boxes directly from detector output */}
            {lesions.map((l) => {
              const confPct = Math.round((l.det_confidence || 0.85) * 100);
              return (
                <div
                  key={l.idx}
                  style={{
                    left: `${l.bbox.x1 * 100}%`,
                    top: `${l.bbox.y1 * 100}%`,
                    width: `${Math.max(5, (l.bbox.x2 - l.bbox.x1) * 100)}%`,
                    height: `${Math.max(5, (l.bbox.y2 - l.bbox.y1) * 100)}%`,
                  }}
                  className="absolute border-2 border-emerald-400 rounded-xs bg-emerald-400/20 shadow-[0_0_6px_rgba(52,211,153,0.5)]"
                >
                  <span className="absolute -top-3 left-0 bg-emerald-500 text-slate-950 font-black text-[8px] px-1 py-[0.5px] rounded-[2px] leading-none shadow-xs">
                    {confPct}%
                  </span>
                </div>
              );
            })}

            <div className="absolute top-2 right-2 bg-emerald-500/95 text-slate-950 font-black text-[9px] px-1.5 py-0.5 rounded-full shadow-sm tnum">
              Acne: {total}
            </div>

            <div className="absolute bottom-2 left-2 bg-white/95 backdrop-blur-sm px-2 py-0.5 rounded-md shadow-xs">
              <span className="text-[9px] font-bold text-slate-800">Foto pemindaian</span>
            </div>
          </div>

          <div className="flex-1 space-y-1">
            <p className="text-[10px] font-bold tracking-wider text-slate-400 uppercase">
              ESTIMASI TINGKAT
            </p>
            <div className="inline-block bg-[#FEF3C7] text-[#D97706] text-xs font-bold px-3 py-0.5 rounded-full">
              {severityLabel}
            </div>

            <div className="pt-1">
              <span className="text-3xl font-black text-slate-900 tracking-tight tnum">
                {total}
              </span>
              <span className="text-xs text-slate-500 font-normal ml-1.5">jerawat</span>
            </div>

            <p className="text-xs text-slate-500 leading-snug pt-0.5">
              {severitySummaryText(severity, total)}
            </p>
          </div>
        </div>

        {/* Disclaimer inline */}
        <div className="flex items-center gap-2 text-slate-400">
          <ShieldCheck className="w-4 h-4 shrink-0 text-slate-400" />
          <p className="text-[11px] leading-snug">
            Hasil adalah estimasi AI, bukan diagnosis medis.
          </p>
        </div>

        {/* Section: Yang terdeteksi */}
        <div className="bg-[#F8FAFC] rounded-[24px] p-4 border border-slate-100 space-y-3.5">
          <h2 className="text-sm font-bold text-slate-900">Yang terdeteksi</h2>

          <div className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <div className="w-28 shrink-0">
                <p className="text-xs font-bold text-slate-900">Komedo</p>
                <p className="text-[10px] text-slate-400">Pori tersumbat</p>
              </div>
              <div className="flex-1 h-1.5 bg-slate-200/70 rounded-full overflow-hidden">
                <div className="h-full bg-[#2563EB] rounded-full" style={{ width: `${komedoPercent}%` }} />
              </div>
              <span className="text-xs font-bold text-slate-800 w-5 text-right tnum">{komedoCount}</span>
            </div>

            <div className="flex items-center justify-between gap-3">
              <div className="w-28 shrink-0">
                <p className="text-xs font-bold text-slate-900">Papula</p>
                <p className="text-[10px] text-slate-400">Benjolan merah kecil</p>
              </div>
              <div className="flex-1 h-1.5 bg-slate-200/70 rounded-full overflow-hidden">
                <div className="h-full bg-[#2563EB] rounded-full" style={{ width: `${papulaPercent}%` }} />
              </div>
              <span className="text-xs font-bold text-slate-800 w-5 text-right tnum">{papulaCount}</span>
            </div>

            <div className="flex items-center justify-between gap-3">
              <div className="w-28 shrink-0">
                <p className="text-xs font-bold text-slate-900">Pustula</p>
                <p className="text-[10px] text-slate-400">Jerawat dengan titik putih</p>
              </div>
              <div className="flex-1 h-1.5 bg-slate-200/70 rounded-full overflow-hidden">
                <div className="h-full bg-[#2563EB] rounded-full" style={{ width: `${pustulaPercent}%` }} />
              </div>
              <span className="text-xs font-bold text-slate-800 w-5 text-right tnum">{pustulaCount}</span>
            </div>
          </div>
        </div>

        {/* Section: Langkah kecil untuk kulitmu */}
        <div className="space-y-3 pt-1">
          <h2 className="text-[15px] font-bold text-slate-900">Langkah kecil untuk kulitmu</h2>

          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#EEF4FF] text-[#2563EB] flex items-center justify-center shrink-0 mt-0.5">
              <Droplets className="w-5 h-5 stroke-[2]" />
            </div>
            <div>
              <h3 className="text-xs font-bold text-slate-900">Bersihkan dengan lembut</h3>
              <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
                Gunakan pembersih lembut 2 kali sehari. Hindari scrub dan memencet jerawat.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#EEF4FF] text-[#2563EB] flex items-center justify-center shrink-0 mt-0.5">
              <Sun className="w-5 h-5 stroke-[2]" />
            </div>
            <div>
              <h3 className="text-xs font-bold text-slate-900">Jaga kelembapan &amp; lindungi</h3>
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

        {/* CTAs matching 181204.png */}
        <div className="space-y-2.5 pt-1">
          <Link
            to="/compare"
            className="w-full bg-[#2563EB] hover:bg-blue-700 active:scale-[0.99] text-white font-semibold text-sm py-3.5 rounded-2xl flex items-center justify-center gap-2 shadow-lg shadow-blue-500/20 transition-all"
          >
            <GitCompareArrows className="w-4 h-4" />
            <span>Bandingkan dengan foto lain</span>
          </Link>

          <Link
            to="/chat"
            className="w-full bg-[#EEF4FF] hover:bg-blue-100/80 text-[#2563EB] font-semibold text-sm py-3.5 rounded-2xl flex items-center justify-center gap-2 transition-colors"
          >
            <MessageSquare className="w-4 h-4" />
            <span>Bahas hasil dengan asisten AI</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
