import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Calendar,
  ScanFace,
  ChevronRight,
  ShieldCheck,
} from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

interface HistoryItem {
  id: string;
  date: string;
  month: 'Oktober' | 'September';
  lesions: number;
  time: string;
  delta: string;
  severity: 'Ringan' | 'Sedang' | 'Berat';
}

const HISTORY_DATA: HistoryItem[] = [
  {
    id: 'h1',
    date: '8 Oktober 2026',
    month: 'Oktober',
    lesions: 18,
    time: '08.42',
    delta: '↓ 3 dari sebelumnya',
    severity: 'Sedang',
  },
  {
    id: 'h2',
    date: '1 Oktober 2026',
    month: 'Oktober',
    lesions: 21,
    time: '08.30',
    delta: '↓ 3 dari sebelumnya',
    severity: 'Sedang',
  },
  {
    id: 'h3',
    date: '24 September 2026',
    month: 'September',
    lesions: 24,
    time: '08.15',
    delta: '↓ 2 dari sebelumnya',
    severity: 'Sedang',
  },
  {
    id: 'h4',
    date: '17 September 2026',
    month: 'September',
    lesions: 26,
    time: '08.10',
    delta: '↓ 2 dari sebelumnya',
    severity: 'Sedang',
  },
  {
    id: 'h5',
    date: '10 September 2026',
    month: 'September',
    lesions: 28,
    time: '08.20',
    delta: 'Mulai pemantauan',
    severity: 'Berat',
  },
];

const CHART_DATA = [
  { date: '3 Sep', lesions: 28 },
  { date: '24 Sep', lesions: 24 },
  { date: '8 Okt', lesions: 18 },
];

export default function HistoryPage() {
  const navigate = useNavigate();
  const [filter, setFilter] = useState<'Semua' | 'Oktober' | 'September'>('Semua');
  const [showAll, setShowAll] = useState(false);

  const filteredItems = HISTORY_DATA.filter((item) => {
    if (filter === 'Semua') return true;
    return item.month === filter;
  });

  const visibleItems = showAll ? filteredItems : filteredItems.slice(0, 3);

  return (
    <div className="flex-1 flex flex-col justify-between bg-white overflow-y-auto">
      <div className="px-5 pt-3 pb-6 space-y-5">
        {/* Top Header */}
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">
            Perjalanan kulitmu
          </h1>
          <button
            className="w-9 h-9 rounded-full flex items-center justify-center text-slate-600 hover:bg-slate-100 transition-colors"
            aria-label="Pilih rentang tanggal"
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
            <span className="text-xs font-bold text-slate-800">
              Estimasi jumlah jerawat
            </span>
            <span className="text-[11px] text-slate-400">6 minggu</span>
          </div>

          <div className="flex items-baseline justify-between">
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-black text-slate-900 tracking-tight">
                18
              </span>
              <span className="text-xs text-slate-600">jerawat terakhir</span>
            </div>
            <span className="bg-[#DCFCE7] text-[#16A34A] text-xs font-semibold px-2 py-0.5 rounded-full">
              ↓ 25%
            </span>
          </div>

          {/* Area Line Chart */}
          <div className="h-32 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={CHART_DATA} margin={{ top: 5, right: 10, left: -25, bottom: 0 }}>
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
                  ticks={[0, 10, 20, 30]}
                  domain={[0, 35]}
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

          <p className="text-[11px] text-slate-500 leading-snug pt-1">
            Turun 6 dari 24 jerawat pada 24 September. Kondisi kulit dapat berfluktuasi.
          </p>
        </div>

        {/* Section: Riwayat pemindaian */}
        <div className="space-y-3 pt-1">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900">
              Riwayat pemindaian
            </h3>
            <span className="text-xs font-semibold text-[#2563EB]">
              5 analisis
            </span>
          </div>

          {/* Filter Pills */}
          <div className="flex items-center gap-2">
            {(['Semua', 'Oktober', 'September'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setFilter(tab)}
                className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-all ${
                  filter === tab
                    ? 'bg-[#EBF2FE] text-[#2563EB]'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          {/* List Items */}
          <div className="space-y-2.5 pt-1">
            {visibleItems.map((item) => (
              <button
                key={item.id}
                onClick={() => navigate('/detect-result')}
                className="w-full bg-white hover:bg-slate-50 p-3 rounded-[20px] border border-slate-100 flex items-center justify-between transition-colors shadow-xs group text-left"
              >
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-2xl bg-[#EEF4FF] text-[#2563EB] flex items-center justify-center shrink-0">
                    <ScanFace className="w-5 h-5 stroke-[2]" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-900">
                      {item.date}
                    </h4>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      {item.lesions} jerawat • {item.time}
                    </p>
                    <p className="text-[10px] text-emerald-600 font-medium mt-0.5">
                      {item.delta}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="bg-[#FEF3C7] text-[#D97706] text-[11px] font-semibold px-2.5 py-0.5 rounded-full">
                    {item.severity}
                  </span>
                  <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-slate-700" />
                </div>
              </button>
            ))}
          </div>

          {/* Expand More Button */}
          {!showAll && filteredItems.length > 3 && (
            <button
              onClick={() => setShowAll(true)}
              className="w-full text-center text-xs font-semibold text-[#2563EB] hover:underline py-1.5"
            >
              Lihat {filteredItems.length - 3} analisis lainnya
            </button>
          )}

          {/* Disclaimer */}
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
