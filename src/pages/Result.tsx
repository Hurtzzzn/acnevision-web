import { useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Bookmark, Check, FileDown } from 'lucide-react';
import { COPY } from '@acnevision/shared';
import { api } from '../lib/runtime';
import { errMessage } from '../lib/errors';
import { downloadPdf } from '../lib/export';
import { NEW_ANALYSIS_PATH } from '../lib/redirect';
import { isResultAvailable } from '../lib/resultCache';
import { useAuth } from '../store/auth';
import { useScan } from '../store/scan';
import { useUi } from '../store/ui';
import { ChatPanel } from '../components/ChatPanel';
import { Recommendation } from '../components/Recommendation';
import { ResultView } from '../components/ResultView';
import { Disclaimer, EmptyState } from '../components/ui';

const R = COPY.result;

/** Full analysis result for a signed-in user (docs/06 section 4.4b). Kept for the life of the tab (see lib/resultCache.ts). */
export default function Result() {
  const { analysisId } = useParams();
  const { analysis, imageUrl, recommendation, savedScanId, ownerId, setRecommendation, setSaved } = useScan();
  const userId = useAuth((s) => s.user?.id);
  const available = isResultAvailable({ analysis, imageUrl, ownerId }, userId, analysisId);
  const toast = useUi((s) => s.toast);
  // Starts true while the recommendation has not arrived, so the first paint already reserves its space.
  const [recLoading, setRecLoading] = useState(() => !useScan.getState().recommendation);
  const [saving, setSaving] = useState(false);
  const [exporting, setExporting] = useState(false);
  const fetchedFor = useRef<string | null>(null);

  useEffect(() => {
    if (!available || !analysis || recommendation || fetchedFor.current === analysis.analysis_id) return;
    fetchedFor.current = analysis.analysis_id;
    setRecLoading(true);
    api.recommend(analysis.analysis_id)
      .then(setRecommendation)
      .catch((e) => toast(errMessage(e, COPY.recommendation.aiUnavailable), 'error'))
      .finally(() => setRecLoading(false));
  }, [available, analysis, recommendation, setRecommendation, toast]);

  // When the result is gone (tab closed, logout, another user, or another id), say so instead of redirecting silently.
  if (!available || !analysis || !imageUrl) {
    return (
      <EmptyState
        title={R.goneTitle}
        text={R.goneText}
        action={
          <div className="flex flex-wrap items-center justify-center gap-3">
            <Link to={NEW_ANALYSIS_PATH} className="btn-primary">{R.again}</Link>
            <Link to="/history" className="-my-1 rounded px-2 py-2 text-label-md text-primary-600 hover:underline">{R.viewHistory}</Link>
          </div>
        }
      />
    );
  }

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
      <header className="max-w-2xl">
        <h1>{R.title}</h1>
        <p className="mt-1">{R.subtitle}</p>
      </header>

      <ResultView
        analysis={analysis}
        imageUrl={imageUrl}
        recommendation={
          <Recommendation
            text={recommendation?.recommendation ?? null}
            isFallback={recommendation?.is_fallback}
            loading={recLoading}
            severity={analysis.classification?.severity ?? null}
          />
        }
        bottom={
          <>
            <ChatPanel
              conversationId={recommendation?.conversation_id ?? null}
              canFollowUp={!!recommendation?.can_follow_up}
              loading={recLoading}
            />
            <Disclaimer variant="box" />
            {/* One main action: save first; once saved, starting a new analysis takes over */}
            <nav aria-label={R.nextLabel} className="flex flex-wrap items-center gap-3">
              <button className={savedScanId ? 'btn-outline' : 'btn-primary'} onClick={save} disabled={saving || !!savedScanId}>
                {savedScanId
                  ? <><Check className="h-4 w-4" aria-hidden /> {R.saved}</>
                  : <><Bookmark className="h-4 w-4" aria-hidden /> {saving ? R.saving : R.save}</>}
              </button>
              <Link to={NEW_ANALYSIS_PATH} className={savedScanId ? 'btn-primary' : 'btn-outline'}>{R.again}</Link>
              <button className="inline-flex min-h-11 items-center gap-2 rounded-control px-2 text-label-md text-primary-600 hover:underline disabled:opacity-50" onClick={exportPdf} disabled={exporting}>
                <FileDown className="h-4 w-4" aria-hidden /> {R.downloadPdf}
              </button>
              {savedScanId && <Link to="/history" className="inline-flex min-h-11 items-center rounded-control px-2 text-label-md text-primary-600 hover:underline">{R.viewHistory}</Link>}
            </nav>
            {!savedScanId && <p className="-mt-3 text-body-sm text-ink-500">{R.saveNote}</p>}
          </>
        }
      />
    </div>
  );
}
