import { useEffect, useRef, useState } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import { Bookmark, Check, FileDown } from 'lucide-react';
import { COPY } from '@acnevision/shared';
import { api } from '../lib/runtime';
import { errMessage } from '../lib/errors';
import { downloadPdf } from '../lib/export';
import { NEW_ANALYSIS_PATH } from '../lib/redirect';
import { useScan } from '../store/scan';
import { useUi } from '../store/ui';
import { ChatPanel } from '../components/ChatPanel';
import { Recommendation } from '../components/Recommendation';
import { ResultView } from '../components/ResultView';
import { Disclaimer } from '../components/ui';

const R = COPY.result;

/** Full analysis result for a signed-in user (docs/06 section 4.4b). Lives in memory, so a refresh starts a new analysis. */
export default function Result() {
  const { analysisId } = useParams();
  const { analysis, imageUrl, recommendation, savedScanId, setRecommendation, setSaved } = useScan();
  const toast = useUi((s) => s.toast);
  // Starts true while the recommendation has not arrived, so the first paint already reserves its space.
  const [recLoading, setRecLoading] = useState(() => !useScan.getState().recommendation);
  const [saving, setSaving] = useState(false);
  const [exporting, setExporting] = useState(false);
  const fetchedFor = useRef<string | null>(null);

  useEffect(() => {
    if (!analysis || recommendation || fetchedFor.current === analysis.analysis_id) return;
    fetchedFor.current = analysis.analysis_id;
    setRecLoading(true);
    api.recommend(analysis.analysis_id)
      .then(setRecommendation)
      .catch((e) => toast(errMessage(e, COPY.recommendation.aiUnavailable), 'error'))
      .finally(() => setRecLoading(false));
  }, [analysis, recommendation, setRecommendation, toast]);

  // The result lives in memory only: after a refresh, or for a different id, send the user to start a new analysis.
  if (!analysis || !imageUrl || analysis.analysis_id !== analysisId) return <Navigate to={NEW_ANALYSIS_PATH} replace />;

  async function save() {
    setSaving(true);
    try {
      const r = await api.saveScan(analysis!.analysis_id);
      setSaved(r.scan_id);
      toast(R.savedToast);
    } catch (e) {
      toast(errMessage(e, R.saveFailed), 'error');
    } finally {
      setSaving(false);
    }
  }

  async function exportPdf() {
    setExporting(true);
    try {
      await downloadPdf(imageUrl!, analysis!);
    } catch (e) {
      toast(errMessage(e, R.downloadFailed), 'error');
    } finally {
      setExporting(false);
    }
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-2xl">
          <h1>{R.title}</h1>
          <p className="mt-1">{R.subtitle}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button className="btn-primary" onClick={save} disabled={saving || !!savedScanId}>
            {savedScanId
              ? <><Check className="h-4 w-4" aria-hidden /> {R.saved}</>
              : <><Bookmark className="h-4 w-4" aria-hidden /> {saving ? R.saving : R.save}</>}
          </button>
          <button className="btn-outline" onClick={exportPdf} disabled={exporting}>
            <FileDown className="h-4 w-4" aria-hidden /> {R.downloadPdf}
          </button>
          <Link to={NEW_ANALYSIS_PATH} className="btn-outline">{R.again}</Link>
          <Link to="/history" className="rounded px-2 py-1 text-label-md text-primary-600 hover:underline">{R.viewHistory}</Link>
        </div>
      </header>

      <ResultView
        analysis={analysis}
        imageUrl={imageUrl}
        bottom={
          <>
            <Recommendation
              text={recommendation?.recommendation ?? null}
              isFallback={recommendation?.is_fallback}
              loading={recLoading}
              severity={analysis.summary.severity}
            />
            <ChatPanel
              conversationId={recommendation?.conversation_id ?? null}
              canFollowUp={!!recommendation?.can_follow_up}
              loading={recLoading}
            />
            <Disclaimer variant="box" />
          </>
        }
      />
    </div>
  );
}
