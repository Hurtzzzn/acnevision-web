import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ScanFace, Sparkles, ArrowUpRight, ShieldCheck, Sun, CloudSun, Moon } from 'lucide-react';
import type { ScanListItem, Severity } from '@acnevision/shared';
import heroineImg from '../assets/images/heroine.png';
import { MobileHeader } from '../components/mobile/MobileHeader';
import { useAuth } from '../store/auth';
import { useScan } from '../store/scan';
import { api } from '../lib/runtime';
import {
  formatFullDateUpper,
  formatIndonesianDate,
  formatRelativeDateTime,
  getGreeting,
} from '../lib/dateTime';

function severityLabelId(severity: Severity | null | undefined, total: number): string {
  if (total === 0 || !severity) return 'Bersih';
  if (severity === 'mild') return 'Ringan';
  if (severity === 'severe') return 'Berat';
  if (severity === 'very_severe') return 'Sangat Berat';
  return 'Sedang';
}

function severityPillClass(severity: Severity | null | undefined, total: number): string {
  if (total === 0 || !severity) return 'bg-emerald-50 text-emerald-700';
  if (severity === 'mild') return 'bg-[#DCFCE7] text-[#16A34A]';
  if (severity === 'severe' || severity === 'very_severe') return 'bg-red-50 text-red-600';
  return 'bg-[#FEF3C7] text-[#D97706]';
}

export default function Dashboard() {
  const { user } = useAuth();
  const { analysis, detection, capturedAt, savedScanId } = useScan();
  const [scans, setScans] = useState<ScanListItem[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [now, setNow] = useState(() => new Date());

  // Keep greeting & relative date live when the screen remains open
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    let active = true;
    if (!user) {
      setScans([]);
      setLoaded(true);
      return;
    }
    api
      .listScans(1, 5)
      .then((res) => {
        if (active) setScans(res.items);
      })
      .catch(() => {
        if (active) setScans([]);
      })
      .finally(() => {
        if (active) setLoaded(true);
      });
    return () => {
      active = false;
    };
  }, [user, savedScanId]);

  const greeting = getGreeting(now);
  const displayName = user?.full_name?.trim().split(/\s+/)[0] || user?.email?.split('@')[0] || 'Teman';

  const GreetingIcon =
    greeting.period === 'malam' ? Moon : greeting.period === 'sore' ? CloudSun : Sun;
  const greetingIconColor =
    greeting.period === 'malam'
      ? 'text-indigo-500'
      : greeting.period === 'sore'
      ? 'text-amber-500'
      : 'text-amber-500';

  // Determine the latest scan from saved scans OR in-memory fresh detection/analysis
  const newestSaved = scans[0] ?? null;
  const previousSaved = scans[1] ?? null;

  const hasInMemoryScan = !!(analysis || detection);
  const latestTotal = analysis
    ? analysis.summary.total_lesions
    : detection
    ? detection.summary.total_lesions
    : newestSaved?.total_lesions ?? null;

  const latestSeverity: Severity | null = analysis
    ? analysis.classification?.severity ?? null
    : detection
    ? detection.summary.severity
    : newestSaved?.severity ?? null;

  const latestCreatedAt = hasInMemoryScan
    ? capturedAt ?? new Date().toISOString()
    : newestSaved?.created_at ?? null;

  const latestTargetLink = analysis
    ? `/analysis/${analysis.analysis_id}`
    : detection
    ? '/detect-result'
    : newestSaved
    ? `/history/${newestSaved.scan_id}`
    : '/scan';

  // Delta calculation against previous saved scan (if 2+ scans exist)
  let pctDelta: number | null = null;
  let comparisonNote: string | null = null;
  if (newestSaved && previousSaved && !hasInMemoryScan) {
    const diff = previousSaved.total_lesions - newestSaved.total_lesions;
    if (previousSaved.total_lesions > 0) {
      pctDelta = Math.round((diff / previousSaved.total_lesions) * 100);
    }
    const prevDate = formatIndonesianDate(previousSaved.created_at);
    if (diff > 0) {
      comparisonNote = `${diff} lebih sedikit dari pemindaian ${prevDate}.`;
    } else if (diff < 0) {
      comparisonNote = `${Math.abs(diff)} lebih banyak dari pemindaian ${prevDate}.`;
    } else {
      comparisonNote = `Sama dengan pemindaian ${prevDate}.`;
    }
  } else if (latestTotal !== null) {
    comparisonNote = hasInMemoryScan && !savedScanId
      ? 'Hasil pemindaian terbaru (belum disimpan ke riwayat).'
      : 'Pemindaian awal tersimpan di riwayat.';
  }

  return (
    <div className="flex-1 flex flex-col justify-between bg-white overflow-y-auto">
      <div>
        <MobileHeader />

        <div className="px-5 pt-1 pb-6 space-y-5">
          {/* Actual Date & Time-Aware Greeting */}
          <div>
            <p className="text-[11px] font-bold tracking-wider text-slate-400 uppercase">
              {formatFullDateUpper(now)}
            </p>
            <h1 className="text-[24px] font-black text-slate-900 tracking-tight mt-0.5 flex items-center gap-2">
              <span>
                {greeting.shortLabel}, {displayName}
              </span>
              <GreetingIcon className={`w-6 h-6 ${greetingIconColor} stroke-[2.2]`} aria-hidden />
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              Bagaimana kabar kulitmu hari ini?
            </p>
          </div>

          {/* Banner Hero Card (Matches Screenshot 2026-11-28 181045.png) */}
          <div className="bg-[#EFF5FF] rounded-[24px] p-4 sm:p-5 border border-blue-100/60 shadow-sm space-y-4">
            <div className="flex items-center justify-between gap-3">
              <div className="flex-1">
                <h2 className="text-[18px] font-extrabold text-slate-900 leading-snug">
                  Perawatan baik dimulai dari paham.
                </h2>
                <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
                  Kenali kondisi kulitmu lewat satu foto wajah.
                </p>
              </div>

              {/* Right Oval Portrait */}
              <div className="w-24 h-28 rounded-[48px] overflow-hidden shrink-0 border-2 border-white shadow-md bg-slate-200">
                <img
                  src={newestSaved?.thumbnail_url || heroineImg}
                  alt="Wajah"
                  className="w-full h-full object-cover object-top"
                />
              </div>
            </div>

            <Link
              to="/scan"
              className="w-full bg-[#2563EB] hover:bg-blue-700 active:scale-[0.99] text-white text-sm font-semibold py-3.5 px-4 rounded-2xl flex items-center justify-center gap-2 shadow-md shadow-blue-500/25 transition-all"
            >
              <ScanFace className="w-4 h-4 stroke-[2.2]" />
              <span>Pindai wajah sekarang</span>
            </Link>
          </div>

          {/* Section: Kondisi kulit terakhirmu */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <h2 className="text-[15px] font-bold text-slate-900">
                Kondisi kulit terakhirmu
              </h2>
              {latestTotal !== null && (
                <Link
                  to={latestTargetLink}
                  className="text-xs font-semibold text-[#2563EB] hover:underline"
                >
                  Lihat hasil
                </Link>
              )}
            </div>

            {!loaded ? (
              <div className="bg-slate-50 rounded-[22px] p-5 border border-slate-100 animate-pulse space-y-3">
                <div className="h-3 w-28 bg-slate-200 rounded" />
                <div className="h-8 w-36 bg-slate-200 rounded" />
              </div>
            ) : latestTotal !== null && latestCreatedAt ? (
              <Link
                to={latestTargetLink}
                className="block bg-white rounded-[22px] p-4 border border-slate-100 shadow-[0_4px_16px_rgba(0,0,0,0.03)] space-y-2 hover:border-blue-100 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-500">
                    {formatRelativeDateTime(latestCreatedAt, now)}
                  </span>
                  <span
                    className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full ${severityPillClass(
                      latestSeverity,
                      latestTotal
                    )}`}
                  >
                    {severityLabelId(latestSeverity, latestTotal)}
                  </span>
                </div>

                <div className="flex items-baseline justify-between pt-1">
                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-black text-slate-900 tracking-tight tnum">
                      {latestTotal}
                    </span>
                    <span className="text-xs font-medium text-slate-600">
                      jerawat terdeteksi
                    </span>
                  </div>
                  {pctDelta !== null && pctDelta !== 0 && (
                    <span
                      className={`text-xs font-semibold px-2 py-0.5 rounded-full flex items-center gap-0.5 ${
                        pctDelta > 0
                          ? 'bg-[#DCFCE7] text-[#16A34A]'
                          : 'bg-amber-50 text-amber-700'
                      }`}
                    >
                      {pctDelta > 0 ? `↓ ${pctDelta}%` : `↑ ${Math.abs(pctDelta)}%`}
                    </span>
                  )}
                </div>

                <p className="text-[11px] text-slate-400">Estimasi dari foto wajah</p>

                {comparisonNote && (
                  <div className="pt-1.5 border-t border-slate-50">
                    <p
                      className={`text-xs font-medium ${
                        pctDelta !== null && pctDelta < 0 ? 'text-amber-700' : 'text-[#16A34A]'
                      }`}
                    >
                      {comparisonNote}
                    </p>
                  </div>
                )}
              </Link>
            ) : (
              <div className="bg-[#F8FAFC] rounded-[22px] p-4 border border-slate-100 text-xs text-slate-500 space-y-2">
                <p className="font-semibold text-slate-800">Belum ada riwayat pemindaian</p>
                <p>Mulai pindai wajah pertamamu untuk melihat ringkasan dan perkembangan kondisi kulit.</p>
              </div>
            )}
          </div>

          {/* Assistant Banner Card */}
          <Link
            to="/chat"
            className="bg-[#F8FAFC] hover:bg-blue-50/50 rounded-[20px] p-3.5 border border-slate-100 flex items-center justify-between transition-colors group cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-white text-[#2563EB] flex items-center justify-center shadow-sm border border-slate-100">
                <Sparkles className="w-5 h-5 stroke-[2]" />
              </div>
              <div>
                <h3 className="font-bold text-sm text-slate-900 group-hover:text-[#2563EB] transition-colors">
                  Ada yang ingin ditanyakan?
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Asisten AI siap membantumu memahami hasil.
                </p>
              </div>
            </div>
            <ArrowUpRight className="w-5 h-5 text-[#2563EB] shrink-0" />
          </Link>

          {/* Disclaimer */}
          <div className="flex items-center gap-2 pt-1 text-slate-400">
            <ShieldCheck className="w-4 h-4 shrink-0 text-slate-400" />
            <p className="text-[11px] leading-snug">
              Hasil adalah estimasi AI, bukan diagnosis medis.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
