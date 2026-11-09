import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, Sparkles, ScanFace, TrendingUp, MessageSquare, ShieldCheck } from 'lucide-react';
import heroineImg from '../assets/images/heroine.png';
import { MobileHeader } from '../components/mobile/MobileHeader';
import { useAuth } from '../store/auth';

export default function Home() {
  const navigate = useNavigate();
  const { login } = useAuth();

  const handleQuickLogin = async () => {
    try {
      await login('demo@acnevision.test', 'demo12345');
      navigate('/dashboard');
    } catch {
      navigate('/login');
    }
  };

  return (
    <div className="flex-1 flex flex-col justify-between bg-white overflow-y-auto">
      <div>
        {/* Top Header */}
        <MobileHeader onLoginClick={handleQuickLogin} />

        <div className="px-5 pt-2 pb-6 space-y-6">
          {/* Hero Visual Card */}
          <div className="relative rounded-[28px] overflow-hidden aspect-[4/3] bg-slate-100 shadow-sm border border-slate-100">
            <img
              src={heroineImg}
              alt="Model AcneVision AI"
              className="w-full h-full object-cover object-top"
            />

            {/* Top-left AI badge */}
            <div className="absolute top-3.5 left-3.5 bg-white/95 backdrop-blur-md px-3 py-1.5 rounded-full flex items-center gap-1.5 shadow-sm border border-white/50">
              <Sparkles className="w-3.5 h-3.5 text-[#2563EB]" />
              <span className="text-[11px] font-semibold text-[#2563EB] tracking-tight">
                TEKNOLOGI AI, AcneVision
              </span>
            </div>

            {/* Bottom-left pill */}
            <div className="absolute bottom-3.5 left-3.5 bg-white/95 backdrop-blur-md px-3.5 py-1.5 rounded-full shadow-sm border border-white/50">
              <span className="text-xs font-medium text-slate-800">
                Kulit nyata. Perawatan lebih terarah.
              </span>
            </div>
          </div>

          {/* Heading */}
          <div className="space-y-2 pt-1">
            <h1 className="text-[28px] font-extrabold leading-[1.2] text-slate-900 tracking-tight">
              Kenali kulitmu,
              <br />
              <span className="text-[#2563EB]">selangkah lebih baik.</span>
            </h1>
            <p className="text-sm text-slate-500 leading-relaxed max-w-sm">
              Pahami kondisi jerawat dan temukan langkah perawatan awal yang lebih terarah.
            </p>
          </div>

          {/* 3 Step List Items */}
          <div className="space-y-3.5 pt-1">
            {/* Step 1 */}
            <div className="flex items-center gap-3.5">
              <div className="w-11 h-11 rounded-2xl bg-[#EEF4FF] text-[#2563EB] flex items-center justify-center shrink-0">
                <ScanFace className="w-5 h-5 stroke-[2]" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-slate-900 leading-tight">Pindai wajah</h2>
                <p className="text-xs text-slate-500 mt-0.5">Ambil foto dalam cahaya yang cukup.</p>
              </div>
            </div>

            {/* Step 2 */}
            <div className="flex items-center gap-3.5">
              <div className="w-11 h-11 rounded-2xl bg-[#EEF4FF] text-[#2563EB] flex items-center justify-center shrink-0">
                <TrendingUp className="w-5 h-5 stroke-[2]" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-slate-900 leading-tight">Pahami hasilnya</h2>
                <p className="text-xs text-slate-500 mt-0.5">Lihat estimasi jenis dan jumlah jerawat.</p>
              </div>
            </div>

            {/* Step 3 */}
            <div className="flex items-center gap-3.5">
              <div className="w-11 h-11 rounded-2xl bg-[#EEF4FF] text-[#2563EB] flex items-center justify-center shrink-0">
                <MessageSquare className="w-5 h-5 stroke-[2]" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-slate-900 leading-tight">Tanyakan ke asisten AI</h2>
                <p className="text-xs text-slate-500 mt-0.5">Diskusikan hasil dan pantau perubahan.</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom CTA & Disclaimer */}
      <div className="px-5 pb-4 space-y-3 pt-2">
        <Link
          to="/scan"
          className="w-full bg-[#2563EB] hover:bg-blue-700 active:scale-[0.99] text-white font-semibold text-[15px] py-3.5 rounded-2xl flex items-center justify-center gap-2 shadow-lg shadow-blue-500/25 transition-all"
        >
          <ArrowRight className="w-4 h-4" />
          <span>Mulai kenali kulitmu</span>
        </Link>

        <div className="flex items-start gap-2 pt-1 px-1 text-slate-400">
          <ShieldCheck className="w-4 h-4 shrink-0 text-slate-400 mt-0.5" />
          <p className="text-[11px] leading-snug">
            Estimasi AI, bukan diagnosis medis. Foto hanya disimpan setelah kamu menyetujuinya.
          </p>
        </div>

        {/* Home bar for guest */}
        <div className="w-36 h-1 bg-slate-900 rounded-full mx-auto mt-4 mb-1" />
      </div>
    </div>
  );
}
