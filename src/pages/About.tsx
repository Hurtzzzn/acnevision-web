import { Disclaimer } from '../components/ui';

const tech = ['Python', 'YOLO', 'CNN MobileNetV4', 'FastAPI', 'React', 'React Native', 'Supabase'];

export default function About() {
  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <header className="text-center"><h1>About Project</h1></header>

      <section className="card">
        <h3 className="mb-2">Misi</h3>
        <p>
          AcneVision AI membantu masyarakat mengenali jenis dan sebaran jerawat dari foto wajah secara cepat,
          serta memberi rekomendasi awal perawatan kulit. Aplikasi ini adalah alat bantu edukasi, bukan pengganti dokter.
        </p>
      </section>

      <section className="card">
        <h3 className="mb-3">Teknologi</h3>
        <div className="flex flex-wrap gap-2">{tech.map((t) => <span key={t} className="badge bg-primary-50 text-primary-600">{t}</span>)}</div>
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        <div className="card"><h3 className="mb-1">Tim 1: Detection</h3><p className="text-sm">Model YOLO untuk mendeteksi lokasi lesi (bounding box).</p></div>
        <div className="card"><h3 className="mb-1">Tim 2: Classification</h3><p className="text-sm">Model CNN MobileNetV4-Hybrid-Medium untuk mengklasifikasi 5 jenis lesi.</p></div>
      </section>

      <section className="card">
        <h3 className="mb-1">Mitra</h3>
        <p>PT. Dutormasi Membangun Indonesia</p>
      </section>

      <Disclaimer variant="box" />
    </div>
  );
}
