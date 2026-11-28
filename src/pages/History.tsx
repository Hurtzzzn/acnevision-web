import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, ScanFace, ChevronRight, ShieldCheck } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import type { ScanListItem, Severity } from '@acnevision/shared';
import { api } from '../lib/runtime';
import { useAuth } from '../store/auth';
import {
  diffDaysBetween,
  formatIndonesianDate,
  formatTimeHHMM,
  getMonthName,
} from '../lib/dateTime';

function severityLabelId(s: Severity | null, total: number): string {
  if (total === 0 || !s) return 'Bersih';
  if (s === 'mild') return 'Ringan';
  if (s === 'severe') return 'Berat';
  if (s === 'very_severe') return 'Sangat Berat';
  return 'Sedang';
}

export default function HistoryPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [scans, setScans] = useState<ScanListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('Semua');
  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    let active = true;
    if (!user) {
      setScans([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    api
      .listScans(1, 50)
      .then((res) => {
        if (active) setScans(res.items);
      })
      .catch(() => {
        if (active) setScans([]);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [user]);

  // Dynamic month filter chips built from actual scan timestamps
  const monthTabs = useMemo(() => {
    const months = Array.from(new Set(scans.map((s) => getMonthName(s.created_at)).filter(Boolean)));
    return ['Semua', ...months];
  }, [scans]);

  useEffect(() => {
    if (filter !== 'Semua' && !monthTabs.includes(filter)) {
      setFilter('Semua');
    }
  }, [filter, monthTabs]);

  // Chronological oldest -> newest for chart and delta calculation
  const chronological = useMemo(
    () => [...scans].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()),
    [scans]
  );

  const chartData = useMemo(
    () =>
      chronological.map((s) => {
        const d = new Date(s.created_at);
        return {
          date: `${d.getDate()} ${getMonthName(d).slice(0, 3)}`,
          lesions: s.total_lesions,
        };
      }),
    [chronological]
  );

  const latest = scans[0] ?? null;
  const oldest = chronological[0] ?? null;
  const previous = scans[1] ?? null;

  let pctChange: number | null = null;
  let spanText = 'Belum ada rentang';
  let summarySentence = 'Lakukan minimal 2 pemindaian untuk melihat tren perubahan kulitmu.';

  if (latest && oldest) {
    const days = diffDaysBetween(oldest.created_at, latest.created_at);
    const weeks = Math.max(1, Math.round(days / 7));
    spanText = days >= 7 ? `${weeks} minggu` : `${Math.max(1, days)} hari`;
  }

  if (latest && previous) {
    const diff = previous.total_lesions - latest.total_lesions;
    if (previous.total_lesions > 0) {
      pctChange = Math.round((diff / previous.total_lesions) * 100);
    }
    const prevDate = formatIndonesianDate(previous.created_at);
    if (diff > 0) {
      summarySentence = `Turun ${diff} dari ${previous.total_lesions} jerawat pada ${prevDate}. Kondisi kulit dapat berfluktuasi.`;
    } else if (diff < 0) {
      summarySentence = `Naik ${Math.abs(diff)} dari ${previous.total_lesions} jerawat pada ${prevDate}. Kondisi kulit dapat berfluktuasi.`;
    } else {
      summarySentence = `Stabil di ${latest.total_lesions} jerawat dibanding ${prevDate}.`;
    }
  } else if (latest) {
    summarySentence = 'Pemindaian pertamamu tersimpan. Pindai lagi dalam 7-14 hari untuk melihat tren.';
  }

  const enrichedItems = useMemo(() => {
    return scans.map((item, idx) => {
      const prevItem = scans[idx + 1];
      let delta = 'Mulai pemantauan';
      let isBetter = true;
      if (prevItem) {
        const diff = prevItem.total_lesions - item.total_lesions;
        if (diff > 0) {
          delta = `↓ ${diff} dari sebelumnya`;
          isBetter = true;
        } else if (diff < 0) {
          delta = `↑ ${Math.abs(diff)} dari sebelumnya`;
          isBetter = false;
        } else {
          delta = 'Sama seperti sebelumnya';
          isBetter = true;
        }
      }
      return {
        ...item,
        month: getMonthName(item.created_at),
        dateLabel: formatIndonesianDate(item.created_at),
        timeLabel: formatTimeHHMM(new Date(item.created_at)),
        severityLabel: severityLabelId(item.severity, item.total_lesions),
        delta,
        isBetter,
      };
    });
  }, [scans]);

  const filteredItems = enrichedItems.filter((item) =>
    filter === 'Semua' ? true : item.month === filter
  );
  const visibleItems = showAll ? filteredItems : filteredItems.slice(0, 3);

  return (
    <div className="flex-1 flex flex-col justify-between bg-white overflow-y-auto">
      <div className="px-5 pt-4 pb-6 space-y-5">
        {/* Top Header */}
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">
            Perjalanan kulitmu
          </h1>
          <button
            onClick={() => navigate('/compare')}
            className="w-9 h-9 rounded-full flex items-center justify-center text-slate-600 hover:bg-slate-100 transition-colors"
            aria-label="Bandingkan foto sebelum dan sesudah"
            title="Bandingkan foto"
          >
            <Calendar className="w-5 h-5 stroke-[2]" />
          </button>
        </div>

        {/* Hero Title */}
        <div className="space-y-1">
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">
            Progres, bukan sempurna.
          </h2>
          <p className="text-xs text-slate-500 leading-relaxed max-w-sm">
            Perubahan kecil tetap berarti. Pantau kulitmu dengan pencahayaan yang serupa.
          </p>
        </div>

        {/* Trend Chart Card */}
        <div className="bg-[#F8FAFC] rounded-[24px] p-4 border border-slate-100 shadow-[0_4px_16px_rgba(0,0,0,0.02)] space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-800">Estimasi jumlah jerawat</span>
            <span className="text-[11px] text-slate-400">{spanText}</span>
          </div>

          <div className="flex items-baseline justify-between">
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-black text-slate-900 tracking-tight tnum">
                {latest ? latest.total_lesions : 0}
              </span>
              <span className="text-xs text-slate-600">jerawat terakhir</span>
            </div>
            {pctChange !== null && pctChange !== 0 && (
              <span
                className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                  pctChange > 0
                    ? 'bg-[#DCFCE7] text-[#16A34A]'
                    : 'bg-amber-50 text-amber-700'
                }`}
              >
                {pctChange > 0 ? `↓ ${pctChange}%` : `↑ ${Math.abs(pctChange)}%`}
              </span>
            )}
          </div>

          {chartData.length > 0 ? (
            <div className="h-32 w-full pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 5, right: 10, left: -25, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorLesions" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#2563EB" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="#2563EB" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 10, fill: '#94A3B8' }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    allowDecimals={false}
                    tick={{ fontSize: 10, fill: '#94A3B8' }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip
                    formatter={(value: number) => [`${value} jerawat`, 'Jumlah']}
                    contentStyle={{
                      borderRadius: '12px',
                      border: '1px solid #E2E8F0',
                      fontSize: '12px',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="lesions"
                    stroke="#2563EB"
                    strokeWidth={2.5}
                    fillOpacity={1}
                    fill="url(#colorLesions)"
                    dot={{ r: 3, fill: '#2563EB', strokeWidth: 1, stroke: '#FFFFFF' }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-24 flex items-center justify-center text-xs text-slate-400">
              {loading ? 'Memuat grafik progres...' : 'Belum ada data pemindaian'}
            </div>
          )}

          <p className="text-[11px] text-slate-500 leading-snug pt-1">{summarySentence}</p>
        </div>

        {/* Section: Riwayat pemindaian */}
        <div className="space-y-3 pt-1">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900">Riwayat pemindaian</h3>
            <span className="text-xs font-semibold text-[#2563EB] tnum">
              {scans.length} analisis
            </span>
          </div>

          {monthTabs.length > 1 && (
            <div className="flex items-center gap-2 overflow-x-auto pb-1">
              {monthTabs.map((tab) => (
                <button
                  key={tab}
                  onClick={() => setFilter(tab)}
                  className={`px-4 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
                    filter === tab
                      ? 'bg-[#EBF2FE] text-[#2563EB]'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>
          )}

          {loading ? (
            <div className="space-y-2.5">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-16 bg-slate-50 rounded-[20px] animate-pulse" />
              ))}
            </div>
          ) : visibleItems.length === 0 ? (
            <div className="bg-slate-50 rounded-[20px] p-5 text-center space-y-3 border border-slate-100">
              <p className="text-xs text-slate-500">
                {user
                  ? 'Belum ada riwayat pemindaian tersimpan.'
                  : 'Masuk untuk melihat riwayat dan grafik perkembangan kulitmu.'}
              </p>
              <button
                onClick={() => navigate(user ? '/scan' : '/login?redirectTo=%2Fhistory')}
                className="bg-[#2563EB] text-white text-xs font-semibold px-4 py-2.5 rounded-xl"
              >
                {user ? 'Pindai sekarang' : 'Masuk ke akun'}
              </button>
            </div>
          ) : (
            <div className="space-y-2.5 pt-1">
              {visibleItems.map((item) => (
                <button
                  key={item.scan_id}
                  onClick={() => navigate(`/history/${item.scan_id}`)}
                  className="w-full bg-white hover:bg-slate-50 p-3 rounded-[20px] border border-slate-100 flex items-center justify-between transition-colors shadow-xs group text-left"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-2xl bg-[#EEF4FF] text-[#2563EB] flex items-center justify-center shrink-0 overflow-hidden">
                      {item.thumbnail_url ? (
                        <img
                          src={item.thumbnail_url}
                          alt={item.dateLabel}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <ScanFace className="w-5 h-5 stroke-[2]" />
                      )}
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-slate-900">{item.dateLabel}</h4>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        {item.total_lesions} jerawat • {item.timeLabel}
                      </p>
                      <p
                        className={`text-[10px] font-medium mt-0.5 ${
                          item.isBetter ? 'text-emerald-600' : 'text-amber-600'
                        }`}
                      >
                        {item.delta}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="bg-[#FEF3C7] text-[#D97706] text-[11px] font-semibold px-2.5 py-0.5 rounded-full">
                      {item.severityLabel}
                    </span>
                    <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-slate-700" />
                  </div>
                </button>
              ))}
            </div>
          )}

          {!showAll && filteredItems.length > 3 && (
            <button
              onClick={() => setShowAll(true)}
              className="w-full text-center text-xs font-semibold text-[#2563EB] hover:underline py-1.5"
            >
              Lihat {filteredItems.length - 3} analisis lainnya
            </button>
          )}

          <div className="flex items-start gap-2 pt-2 text-slate-400 text-[11px]">
            <ShieldCheck className="w-4 h-4 shrink-0 text-slate-400 mt-0.5" />
            <p className="leading-snug">
              Grafik menampilkan estimasi AI, bukan diagnosis. Hasil dipengaruhi cahaya dan sudut foto.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
