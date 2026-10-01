import { useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { COPY, type AnalyzeResponse } from '@acnevision/shared';
import { api } from '../lib/runtime';
import { errMessage, pct } from '../lib/errors';
import { useUi } from '../store/ui';
import { AnnotatedImage, ClassDistributionBars, EmptyState, LesionList, SeverityBadge, Spinner } from './ui';

/** Three-column result layout shared by /result and /history/:scanId (docs/06 section 4.4). */
export function ResultView({ analysis, imageUrl, bottom }: { analysis: AnalyzeResponse; imageUrl: string; bottom?: ReactNode }) {
  const { summary, lesions } = analysis;
  const [selected, setSelected] = useState<number | null>(null);
  const [showCam, setShowCam] = useState(false);
  const [camLoading, setCamLoading] = useState(false);
  const [cams, setCams] = useState<Record<number, string>>({});
  const [listOpen, setListOpen] = useState(true);
  const toast = useUi((s) => s.toast);

  async function toggleCam(on: boolean) {
    setShowCam(on);
    if (!on || Object.keys(cams).length || !lesions.length) return;
    setCamLoading(true);
    try {
      const entries = await Promise.all(lesions.map(async (l) => [l.idx, await api.getGradcam(analysis.analysis_id, l.idx)] as const));
      setCams(Object.fromEntries(entries));
    } catch (e) {
      setShowCam(false);
      toast(errMessage(e, 'Grad-CAM tidak tersedia (mungkin sudah kedaluwarsa).'), 'error');
    } finally {
      setCamLoading(false);
    }
  }

  if (summary.total_lesions === 0) {
    return (
      <div className="space-y-6">
        <div className="mx-auto max-w-md"><AnnotatedImage src={imageUrl} lesions={[]} /></div>
        <EmptyState
          title="Tidak ada jerawat terdeteksi"
          text={COPY.noLesion}
          action={<Link to="/scan" className="btn-primary">Coba Lagi</Link>}
        />
        {bottom}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="card space-y-3">
          <AnnotatedImage src={imageUrl} lesions={lesions} showGradcam={showCam} gradcam={cams} selectedIdx={selected} onSelectLesion={setSelected} />
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={showCam} onChange={(e) => toggleCam(e.target.checked)} />
            Tampilkan Grad-CAM {camLoading && <Spinner />}
          </label>
          <p className="text-xs text-ink-400">Kotak putus-putus: AI kurang yakin dengan lesi tersebut.</p>
        </div>

        <div className="card space-y-5">
          <div>
            <h3 className="mb-2">Hasil Klasifikasi</h3>
            <SeverityBadge severity={summary.severity} isEstimate={summary.severity_is_estimate} large />
          </div>
          <ClassDistributionBars classCounts={summary.class_counts} />
          <div>
            <button className="flex w-full items-center justify-between text-sm font-semibold text-ink-900" onClick={() => setListOpen((o) => !o)} aria-expanded={listOpen}>
              Daftar lesi ({lesions.length})
              {listOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </button>
            {listOpen && <div className="mt-2 max-h-64 overflow-y-auto"><LesionList lesions={lesions} selectedIdx={selected} onSelect={setSelected} /></div>}
          </div>
        </div>

        <div className="card">
          <h3 className="mb-4">Detection Summary</h3>
          <dl className="space-y-4 text-sm">
            <Stat label="Total lesi terdeteksi" value={String(summary.total_lesions)} />
            <Stat label="Rata-rata confidence" value={pct(summary.avg_confidence, 1)} />
            <Stat label="Lesi kurang yakin" value={String(summary.low_confidence_count)} />
            <Stat label="Waktu analisis" value={`${(analysis.timing_ms.total / 1000).toFixed(2)} detik`} />
          </dl>
        </div>
      </div>
      {bottom}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-btn bg-primary-50 p-3">
      <dt className="text-xs text-ink-600">{label}</dt>
      <dd className="text-2xl font-bold text-ink-900">{value}</dd>
    </div>
  );
}
