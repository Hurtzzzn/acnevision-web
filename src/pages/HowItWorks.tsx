import { Link } from 'react-router-dom';
import { Camera, CheckCircle2, Lightbulb, ScanSearch, Search } from 'lucide-react';
import { ACNE_CLASSES, CLASS_META } from '@acnevision/shared';

const steps = [
  { icon: Camera, title: 'Buka Kamera', text: 'Izinkan akses kamera atau unggah foto wajah.' },
  { icon: Search, title: 'Deteksi Jerawat', text: 'AI mencari lokasi setiap lesi di wajah.' },
  { icon: ScanSearch, title: 'Ambil Foto', text: 'Ambil foto lalu tunggu proses analisis.' },
  { icon: CheckCircle2, title: 'Lihat Hasil', text: 'Lihat jenis, jumlah, dan tingkat keyakinan AI.' },
  { icon: Lightbulb, title: 'Dapatkan Rekomendasi', text: 'Chatbot memberi saran perawatan sesuai hasil.' },
];

const descriptions: Record<string, string> = {
  Blackheads: 'Pori tersumbat yang terbuka dan teroksidasi sehingga tampak hitam.',
  Whiteheads: 'Pori tersumbat yang tertutup sehingga tampak sebagai bintik putih.',
  Papules: 'Benjolan merah kecil, meradang, tanpa nanah.',
  Pustules: 'Jerawat meradang dengan nanah di puncaknya.',
  Cyst: 'Benjolan dalam, besar, dan nyeri. Perlu perhatian dokter kulit.',
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
        <h2 className="mb-6 text-center">Apa yang bisa dideteksi?</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {ACNE_CLASSES.map((c) => (
            <div key={c} className="card">
              <div className="mb-3 h-16 rounded-btn" style={{ background: `${CLASS_META[c].color}22`, borderLeft: `4px solid ${CLASS_META[c].color}` }} aria-hidden />
              <h3 className="text-base">{CLASS_META[c].label}</h3>
              <p className="text-xs text-ink-400">{c}</p>
              <p className="mt-2 text-sm">{descriptions[c]}</p>
            </div>
          ))}
        </div>
      </section>

      <div className="text-center"><Link to="/scan" className="btn-primary">Mulai Analisis</Link></div>
    </div>
  );
}
