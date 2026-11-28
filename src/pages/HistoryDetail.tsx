import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, GitCompareArrows, MessageSquare, Trash2 } from 'lucide-react';
import type { ScanDetail, Severity } from '@acnevision/shared';
import { api } from '../lib/runtime';
import { errMessage } from '../lib/errors';
import { formatIndonesianDate, formatTimeHHMM } from '../lib/dateTime';
import { useUi } from '../store/ui';
import { ErrorBox, Modal, Spinner } from '../components/ui';

function severityLabelId(s: Severity | null | undefined, total: number): string {
  if (total === 0 || !s) return 'Bersih';
  if (s === 'mild') return 'Ringan';
  if (s === 'severe') return 'Berat';
  if (s === 'very_severe') return 'Sangat Berat';
  return 'Sedang';
}

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

  if (error) {
    return (
      <div className="flex-1 p-5 space-y-4 bg-white">
        <ErrorBox message={error} />
        <Link to="/history" className="btn-outline">Kembali ke riwayat</Link>
      </div>
    );
  }
  if (!scan) {
    return (
      <div className="flex-1 flex items-center justify-center bg-white">
        <Spinner label="Memuat detail..." />
      </div>
    );
  }

  const total = scan.summary.total_lesions;
  const severity = scan.classification?.severity ?? null;
  const created = new Date(scan.created_at);

  return (
    <div className="flex-1 flex flex-col justify-between bg-white overflow-y-auto">
      <div className="px-5 pt-4 pb-6 space-y-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/history')}
              className="w-9 h-9 rounded-full flex items-center justify-center text-slate-700 hover:bg-slate-100 transition-colors"
              aria-label="Kembali"
            >
              <ArrowLeft className="w-5 h-5 stroke-[2.2]" />
            </button>
            <div>
              <h1 className="text-[17px] font-bold text-slate-900">Detail analisis</h1>
              <p className="text-[11px] text-slate-400">
                {formatIndonesianDate(created)} • {formatTimeHHMM(created)}
              </p>
            </div>
          </div>

          <button
            onClick={() => setConfirm(true)}
            className="w-9 h-9 rounded-full flex items-center justify-center text-red-500 hover:bg-red-50 transition-colors"
            aria-label="Hapus riwayat"
          >
            <Trash2 className="w-4 h-4 stroke-[2]" />
          </button>
        </div>

        {/* Photo + Lesions Overlay */}
        <div className="flex gap-4 items-center">
          <div className="relative w-32 h-40 rounded-[22px] overflow-hidden bg-slate-100 shrink-0 border border-slate-100">
            <img src={scan.image_url} alt="Foto riwayat" className="w-full h-full object-cover" />
            {scan.lesions.map((l) => (
              <div
                key={l.idx}
                style={{
                  left: `${l.bbox.x1 * 100}%`,
                  top: `${l.bbox.y1 * 100}%`,
                  width: `${Math.max(5, (l.bbox.x2 - l.bbox.x1) * 100)}%`,
                  height: `${Math.max(5, (l.bbox.y2 - l.bbox.y1) * 100)}%`,
                }}
                className="absolute border-2 border-emerald-400 rounded-xs bg-emerald-400/20"
              />
            ))}
          </div>

          <div className="space-y-1">
            <p className="text-[10px] font-bold tracking-wider text-slate-400 uppercase">
              ESTIMASI TINGKAT
            </p>
            <div className="inline-block bg-[#FEF3C7] text-[#D97706] text-xs font-bold px-3 py-0.5 rounded-full">
              {severityLabelId(severity, total)}
            </div>
            <div className="pt-1">
              <span className="text-3xl font-black text-slate-900 tnum">{total}</span>
              <span className="text-xs text-slate-500 ml-1.5">jerawat</span>
            </div>
          </div>
        </div>

        {scan.recommendation && (
          <div className="bg-[#F8FAFC] rounded-[22px] p-4 border border-slate-100 space-y-1.5">
            <h2 className="text-xs font-bold text-slate-900">Catatan asisten</h2>
            <p className="text-xs text-slate-600 leading-relaxed whitespace-pre-line">
              {scan.recommendation}
            </p>
          </div>
        )}

        <div className="space-y-2.5 pt-1">
          <Link
            to={`/compare?after=${scan.scan_id}`}
            className="w-full bg-[#2563EB] hover:bg-blue-700 text-white font-semibold text-sm py-3.5 rounded-2xl flex items-center justify-center gap-2 shadow-lg shadow-blue-500/20"
          >
            <GitCompareArrows className="w-4 h-4" />
            <span>Bandingkan dengan foto lain</span>
          </Link>
          <Link
            to="/chat"
            className="w-full bg-[#EEF4FF] hover:bg-blue-100/80 text-[#2563EB] font-semibold text-sm py-3.5 rounded-2xl flex items-center justify-center gap-2"
          >
            <MessageSquare className="w-4 h-4" />
            <span>Bahas hasil dengan asisten AI</span>
          </Link>
        </div>
      </div>

      {confirm && (
        <Modal title="Hapus scan ini?" onClose={() => setConfirm(false)}>
          <p className="mb-5 text-xs text-slate-600">
            Scan dan foto akan dihapus permanen dari riwayat akunmu.
          </p>
          <div className="flex gap-3">
            <button className="btn-outline flex-1" onClick={() => setConfirm(false)}>Batal</button>
            <button className="btn-danger flex-1" onClick={remove}>Hapus</button>
          </div>
        </Modal>
      )}
    </div>
  );
}
