import { useEffect, useRef, useState } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import { Check, Download, History, Save } from 'lucide-react';
import { COPY } from '@acnevision/shared';
import { api } from '../lib/runtime';
import { errMessage } from '../lib/errors';
import { NEW_ANALYSIS_PATH } from '../lib/redirect';
import { downloadPdf, downloadPng } from '../lib/export';
import { useAuth } from '../store/auth';
import { useScan } from '../store/scan';
import { useUi } from '../store/ui';
import { ChatPanel } from '../components/ChatPanel';
import { ResultView } from '../components/ResultView';
import { Disclaimer } from '../components/ui';

export default function Result() {
  const { analysisId } = useParams();
  const { analysis, imageUrl, recommendation, savedScanId, setRecommendation, setSaved } = useScan();
  const user = useAuth((s) => s.user);
  const { openLoginPrompt, toast } = useUi();
  const [recLoading, setRecLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [dlOpen, setDlOpen] = useState(false);
  const fetchedFor = useRef<string | null>(null);

  useEffect(() => {
    if (!analysis || recommendation || fetchedFor.current === analysis.analysis_id) return;
    fetchedFor.current = analysis.analysis_id;
    setRecLoading(true);
    api.recommend(analysis.analysis_id)
      .then(setRecommendation)
      .catch((e) => toast(errMessage(e, 'Rekomendasi tidak tersedia.'), 'error'))
      .finally(() => setRecLoading(false));
  }, [analysis, recommendation, setRecommendation, toast]);

  // The result lives in memory only: after a refresh, or for a different id, send the user to start a new analysis.
  if (!analysis || !imageUrl || analysis.analysis_id !== analysisId) return <Navigate to={NEW_ANALYSIS_PATH} replace />;

  async function save() {
    if (!user) {
      openLoginPrompt({ message: COPY.loginGateSave, redirectTo: '/scan' });
      return;
    }
    setSaving(true);
    try {
      const r = await api.saveScan(analysis!.analysis_id);
      setSaved(r.scan_id);
      toast('Tersimpan');
    } catch (e) {
      toast(errMessage(e, 'Gagal menyimpan hasil.'), 'error');
    } finally {
      setSaving(false);
    }
  }

  async function dl(kind: 'png' | 'pdf') {
    setDlOpen(false);
    try {
      await (kind === 'png' ? downloadPng(imageUrl!, analysis!) : downloadPdf(imageUrl!, analysis!));
    } catch (e) {
      toast(errMessage(e, 'Gagal membuat file unduhan.'), 'error');
    }
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <h1>Analysis Result</h1>
        <div className="flex flex-wrap gap-2">
          <Link to="/scan" className="btn-outline">Analisis Lagi</Link>
          <button className="btn-outline" onClick={save} disabled={saving || !!savedScanId}>
            {savedScanId ? <><Check className="h-4 w-4" /> Tersimpan</> : <><Save className="h-4 w-4" /> Simpan Hasil</>}
          </button>
          <div className="relative">
            <button className="btn-outline" onClick={() => setDlOpen((o) => !o)} aria-expanded={dlOpen}><Download className="h-4 w-4" /> Unduh</button>
            {dlOpen && (
              <div className="absolute right-0 z-20 mt-1 w-48 rounded-btn border border-border bg-white py-1 shadow-card">
                <button className="block w-full px-4 py-2 text-left text-sm hover:bg-primary-50" onClick={() => dl('png')}>Gambar (PNG)</button>
                <button className="block w-full px-4 py-2 text-left text-sm hover:bg-primary-50" onClick={() => dl('pdf')}>Ringkasan (PDF)</button>
              </div>
            )}
          </div>
          {user ? (
            <Link to="/history" className="btn-primary"><History className="h-4 w-4" /> Lihat Riwayat</Link>
          ) : (
            <button className="btn-primary" onClick={() => openLoginPrompt({ message: COPY.loginGateHistory, redirectTo: '/history' })}>
              <History className="h-4 w-4" /> Lihat Riwayat
            </button>
          )}
        </div>
      </header>

      <ResultView
        analysis={analysis}
        imageUrl={imageUrl}
        bottom={
          <>
            <ChatPanel
              conversationId={recommendation?.conversation_id ?? null}
              recommendation={recommendation?.recommendation ?? null}
              isFallback={recommendation?.is_fallback}
              loading={recLoading}
              canFollowUp={!!user && !!recommendation?.can_follow_up}
            />
            <Disclaimer variant="box" />
          </>
        }
      />
    </div>
  );
}
