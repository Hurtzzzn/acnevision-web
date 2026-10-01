import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import type { ScanDetail } from '@acnevision/shared';
import { api } from '../lib/runtime';
import { errMessage, fmtDate } from '../lib/errors';
import { useUi } from '../store/ui';
import { ResultView } from '../components/ResultView';
import { Disclaimer, ErrorBox, Modal, Spinner } from '../components/ui';

export default function HistoryDetail() {
  const { scanId } = useParams();
  const navigate = useNavigate();
  const toast = useUi((s) => s.toast);
  const [scan, setScan] = useState<ScanDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirm, setConfirm] = useState(false);

  useEffect(() => {
    if (!scanId) return;
    api.getScan(scanId).then(setScan).catch((e) => setError(errMessage(e)));
  }, [scanId]);

  async function remove() {
    if (!scan) return;
    try {
      await api.deleteScan(scan.scan_id);
      toast('Riwayat dihapus');
      navigate('/history');
    } catch (e) {
      toast(errMessage(e), 'error');
    }
  }

  if (error) return <div className="space-y-4"><ErrorBox message={error} /><Link to="/history" className="btn-outline">Kembali ke riwayat</Link></div>;
  if (!scan) return <Spinner label="Memuat..." />;

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link to="/history" className="text-sm font-medium text-primary-600 hover:underline">← Riwayat</Link>
          <h1>Detail Analisis</h1>
          <p className="text-sm">{fmtDate(scan.created_at, true)}</p>
        </div>
        <div className="flex gap-2">
          <Link to="/chat" className="btn-primary">Lanjutkan Konsultasi</Link>
          <button className="btn-outline text-danger" onClick={() => setConfirm(true)}>Hapus</button>
        </div>
      </header>

      <ResultView
        analysis={scan}
        imageUrl={scan.image_url}
        bottom={
          <>
            {scan.recommendation && (
              <section className="card"><h3 className="mb-2">Rekomendasi AI</h3><p className="whitespace-pre-line text-sm">{scan.recommendation}</p></section>
            )}
            <Disclaimer variant="box" />
          </>
        }
      />

      {confirm && (
        <Modal title="Hapus scan ini?" onClose={() => setConfirm(false)}>
          <p className="mb-5 text-sm">Scan dan foto akan dihapus permanen. Percakapan terkait tetap ada.</p>
          <div className="flex gap-3">
            <button className="btn-outline flex-1" onClick={() => setConfirm(false)}>Batal</button>
            <button className="btn-danger flex-1" onClick={remove}>Hapus</button>
          </div>
        </Modal>
      )}
    </div>
  );
}
