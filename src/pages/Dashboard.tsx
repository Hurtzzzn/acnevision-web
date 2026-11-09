import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ScanFace, Sparkles, ArrowUpRight, ShieldCheck } from 'lucide-react';
import heroineImg from '../assets/images/heroine.png';
import { MobileHeader } from '../components/mobile/MobileHeader';
import { useAuth } from '../store/auth';
import { api } from '../lib/runtime';
import type { UserStats } from '@acnevision/shared';

export default function Dashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState<UserStats | null>(null);

  useEffect(() => {
    api.getMyStats().then(setStats).catch(() => {});
  }, []);

  const displayName = user?.full_name?.split(' ')[0] || 'Tia';
  const latestScan = stats?.recent?.[0];

  const totalJerawat = latestScan?.total_lesions ?? 18;
  const severityLabel = latestScan?.severity === 'mild' ? 'Ringan' : latestScan?.severity === 'severe' ? 'Berat' : 'Sedang';

  return (
    <div className="flex-1 flex flex-col justify-between bg-white overflow-y-auto">
      <div>
        {/* Header */}
        <MobileHeader />

        <div className="px-5 pt-1 pb-6 space-y-5">
          {/* Greeting Section */}
          <div>
            <p className="text-[11px] font-bold tracking-wider text-slate-400 uppercase">
              KAMIS, 8 OKTOBER 2026
            </p>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight mt-0.5 flex items-center gap-1.5">
              Pagi, {displayName} <span>☀️</span>
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              Bagaimana kabar kulitmu hari ini?
            </p>
          </div>

          {/* Banner Hero Card */}
          <div className="bg-[#EFF5FF] rounded-[24px] p-4 sm:p-5 flex items-center justify-between border border-blue-100/60 shadow-sm relative overflow-hidden">
            <div className="flex-1 pr-3 z-10">
              <h2 className="text-[17px] font-extrabold text-slate-900 leading-snug">
                Perawatan baik dimulai dari paham.
              </h2>
              <p className="text-xs text-slate-500 mt-1.5 mb-3.5 leading-relaxed">
                Kenali kondisi kulitmu lewat satu foto wajah.
              </p>
              <Link
                to="/scan"
                className="bg-[#2563EB] hover:bg-blue-700 active:scale-95 text-white text-xs font-semibold px-4 py-2.5 rounded-xl inline-flex items-center gap-2 shadow-sm shadow-blue-500/25 transition-all"
              >
                <ScanFace className="w-4 h-4 stroke-[2.2]" />
                <span>Pindai wajah sekarang</span>
              </Link>
            </div>

            {/* Right Face Image */}
            <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full overflow-hidden shrink-0 border-2 border-white shadow-md">
              <img
                src={heroineImg}
                alt="Wajah"
                className="w-full h-full object-cover object-top"
              />
            </div>
          </div>

          {/* Section: Kondisi kulit terakhirmu */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <h2 className="text-[15px] font-bold text-slate-900">
                Kondisi kulit terakhirmu
              </h2>
              <Link
                to="/detect-result"
                className="text-xs font-semibold text-[#2563EB] hover:underline"
              >
                Lihat hasil
              </Link>
            </div>

            <div className="bg-white rounded-[22px] p-4 border border-slate-100 shadow-[0_4px_16px_rgba(0,0,0,0.03)] space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-500">Hari ini, 08.42</span>
                <span className="bg-[#FEF3C7] text-[#D97706] text-[11px] font-semibold px-2.5 py-0.5 rounded-full">
                  {severityLabel}
                </span>
              </div>

              <div className="flex items-baseline justify-between pt-1">
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-black text-slate-900 tracking-tight">
                    {totalJerawat}
                  </span>
                  <span className="text-xs font-medium text-slate-600">
                    jerawat terdeteksi
                  </span>
                </div>
                <span className="bg-[#DCFCE7] text-[#16A34A] text-xs font-semibold px-2 py-0.5 rounded-full flex items-center gap-0.5">
                  ↓ 25%
                </span>
              </div>

              <p className="text-[11px] text-slate-400">
                Estimasi dari foto wajah
              </p>

              <div className="pt-1.5 border-t border-slate-50">
                <p className="text-xs font-medium text-[#16A34A]">
                  6 lebih sedikit dari pemindaian 24 September.
                </p>
              </div>
            </div>
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
