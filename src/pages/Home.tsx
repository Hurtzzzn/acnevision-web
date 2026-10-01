import { Link } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { Camera, MessageCircle, ScanFace, ShieldCheck, Sparkles, Zap } from 'lucide-react';
import { SEVERITY_META, type ScanListItem } from '@acnevision/shared';
import { useAuth } from '../store/auth';
import { api } from '../lib/runtime';
import { fmtDate } from '../lib/errors';

const highlights = [
  { icon: Zap, title: 'Deteksi Real-Time', text: 'Ambil foto dan dapatkan lokasi jerawat dalam hitungan detik.' },
  { icon: ScanFace, title: 'Klasifikasi AI', text: 'Setiap lesi dikelompokkan ke 5 jenis: komedo hitam, komedo putih, papula, pustula, dan kista.' },
  { icon: ShieldCheck, title: 'Privasi Terjaga', text: 'Foto guest tidak disimpan di server.' },
];

const features = [
  { icon: Camera, title: 'Live Detection', text: 'Gunakan kamera perangkat dengan panduan pengambilan foto.' },
  { icon: ScanFace, title: 'Capture & Analyze', text: 'Ambil foto atau unggah dari galeri, lalu lihat lesi bertanda warna per jenis.' },
  { icon: MessageCircle, title: 'Rekomendasi Chatbot', text: 'Dapatkan saran perawatan kulit dan tanya lebih lanjut ke asisten AI.' },
];

function LastScan() {
  const { user } = useAuth();
  const [last, setLast] = useState<ScanListItem | null>(null);
  useEffect(() => {
    if (!user) return;
    api.listScans(1, 1).then((r) => setLast(r.items[0] ?? null)).catch(() => setLast(null));
  }, [user]);
  if (!user) return null;
  return (
    <div className="card mb-8 flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
      <p className="text-ink-900">Halo, <b>{user.full_name ?? user.email}</b></p>
      {last && (
        <Link to="/history" className="flex items-center gap-3 rounded-btn bg-primary-50 px-4 py-2 text-sm hover:bg-blue-100">
          Scan terakhir: {fmtDate(last.created_at)}
          <span className="badge" style={{ background: SEVERITY_META[last.severity].bg, color: SEVERITY_META[last.severity].text }}>
            {SEVERITY_META[last.severity].label}
          </span>
        </Link>
      )}
    </div>
  );
}

export default function Home() {
  return (
    <div>
      <LastScan />
      <section className="grid items-center gap-10 md:grid-cols-2">
        <div>
          <span className="badge mb-4 gap-1 bg-primary-50 text-primary-600"><Sparkles className="h-3.5 w-3.5" aria-hidden /> AI Powered Skin Analysis</span>
          <h1>AcneVision AI</h1>
          <p className="mt-2 text-xl font-semibold text-ink-900">Deteksi dan Klasifikasi Jerawat dengan AI</p>
          <p className="mt-4 max-w-lg">
            Unggah atau ambil foto wajah, lihat lokasi dan jenis jerawat secara visual, lalu dapatkan rekomendasi perawatan kulit dari asisten AI.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link to="/scan" className="btn-primary">Mulai Analisis</Link>
            <Link to="/how-it-works" className="btn-outline">Cara Kerja</Link>
          </div>
        </div>
        <div className="relative mx-auto aspect-square w-full max-w-md rounded-[32px] bg-gradient-to-br from-primary-50 to-blue-200 p-8 shadow-card" aria-hidden>
          <div className="flex h-full w-full items-center justify-center rounded-[24px] bg-white/70">
            <div className="relative h-56 w-44 rounded-[50%] bg-amber-100 shadow-inner">
              {[['30%', '35%', '#F97316'], ['58%', '48%', '#EAB308'], ['42%', '68%', '#334155'], ['65%', '28%', '#0EA5E9']].map(([l, t, c], i) => (
                <span key={i} className="absolute h-7 w-7 rounded border-2" style={{ left: l, top: t, borderColor: c }} />
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="mt-14 grid gap-4 md:grid-cols-3" aria-label="Keunggulan">
        {highlights.map(({ icon: Icon, title, text }) => (
          <div key={title} className="card flex gap-4">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-btn bg-primary-50 text-primary-600"><Icon className="h-5 w-5" aria-hidden /></span>
            <div><h3 className="text-base">{title}</h3><p className="mt-1 text-sm">{text}</p></div>
          </div>
        ))}
      </section>

      <section className="mt-14">
        <h2 className="mb-6 text-center">Key Features</h2>
        <div className="grid gap-4 md:grid-cols-3">
          {features.map(({ icon: Icon, title, text }) => (
            <div key={title} className="card text-center">
              <span className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-primary-600 text-white"><Icon className="h-6 w-6" aria-hidden /></span>
              <h3>{title}</h3><p className="mt-2 text-sm">{text}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
