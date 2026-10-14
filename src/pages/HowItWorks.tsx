import { Link } from 'react-router-dom';
import { Camera, CheckCircle2, Lightbulb, ScanSearch, Search } from 'lucide-react';
import { SEVERITY_META, SEVERITY_ORDER, type Severity } from '@acnevision/shared';

const steps = [
  { icon: Camera, title: 'Buka Kamera', text: 'Izinkan akses kamera atau unggah foto wajah.' },
  { icon: Search, title: 'Deteksi Jerawat', text: 'AI mencari lokasi setiap lesi di wajah.' },
  { icon: ScanSearch, title: 'Ambil Foto', text: 'Ambil foto lalu tunggu proses analisis.' },
  { icon: CheckCircle2, title: 'Lihat Hasil', text: 'Lihat jumlah lesi, tingkat keparahan, dan tingkat keyakinan AI.' },
  { icon: Lightbulb, title: 'Dapatkan Rekomendasi', text: 'Chatbot memberi saran perawatan sesuai hasil.' },
];

const descriptions: Record<Severity, string> = {
  mild: 'Jerawat tidak banyak dan umumnya tidak terlalu meradang.',
  moderate: 'Jerawat lebih banyak dan mulai tampak tersebar di beberapa area.',
  severe: 'Jerawat banyak dan lebih sering terasa nyeri atau meradang.',
  very_severe: 'Jerawat sangat banyak atau meradang luas. Sebaiknya periksakan ke dokter kulit.',
};

export default function HowItWorks() {
  return (
    <div className="space-y-12">
      <header className="text-center"><h1>How It Works</h1><p className="mt-2">Lima langkah dari foto sampai rekomendasi.</p></header>
      <ol className="grid gap-4 md:grid-cols-5">
        {steps.map(({ icon: Icon, title, text }, i) => (
          <li key={title} className="card text-center">
            <span className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-primary-50 text-primary-600"><Icon className="h-6 w-6" aria-hidden /></span>
            <p className="text-xs font-semibold text-primary-600">Langkah {i + 1}</p>
            <h3 className="text-base">{title}</h3>
            <p className="mt-1 text-sm">{text}</p>
          </li>
        ))}
      </ol>

      <section>
        <h2 className="mb-2 text-center">Empat tingkat keparahan</h2>
        <p className="mx-auto mb-6 max-w-xl text-center">
          Setelah masuk, model AI menilai tingkat keparahan dari seluruh foto, bukan dari satu jerawat. Tanpa akun, kamu mendapat perkiraan dari jumlah lesi yang terdeteksi.
        </p>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {SEVERITY_ORDER.map((s) => (
            <div key={s} className="card">
              <div className="mb-3 h-16 rounded-btn" style={{ background: SEVERITY_META[s].tint, borderLeft: `4px solid ${SEVERITY_META[s].solid}` }} aria-hidden />
              <h3 className="text-base">{SEVERITY_META[s].label}</h3>
              <p className="mt-2 text-sm">{descriptions[s]}</p>
            </div>
          ))}
        </div>
      </section>

      <div className="text-center"><Link to="/scan" className="btn-primary">Mulai Analisis</Link></div>
    </div>
  );
}
