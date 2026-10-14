import { useId, useState, type KeyboardEvent, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ChevronDown, Focus, ZoomIn, ZoomOut } from 'lucide-react';
import { COPY, severityMismatch, type AnalyzeResponse } from '@acnevision/shared';
import { api } from '../lib/runtime';
import { errMessage, pct } from '../lib/errors';
import { NEW_ANALYSIS_PATH } from '../lib/redirect';
import { useUi } from '../store/ui';
import { HeatmapKey, LesionList, ProbabilityBars } from './ClassParts';
import { DetectedImage } from './DetectedImage';
import { fitLesions, ToolButton, ZOOM_STEPS } from './PhotoTools';
import { SeveritySummary } from './SeveritySummary';
import { EmptyState, Spinner } from './ui';

const R = COPY.result;
type Tab = 'original' | 'boxes' | 'gradcam';
const TABS: { id: Tab; label: string }[] = [
  { id: 'original', label: R.tabOriginal },
  { id: 'boxes', label: R.tabBoxes },
  { id: 'gradcam', label: R.tabGradcam },
];

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1 px-3 py-3 lg:flex-row lg:items-baseline lg:justify-between lg:gap-3 lg:px-6">
      <dt className="text-body-sm text-ink-600 lg:text-body-md">{label}</dt>
      <dd className="tnum text-label-lg text-ink-900">{value}</dd>
    </div>
  );
}

/** Full-analysis layout shared by /analysis/:id and /history/:scanId (docs/06 section 4.4b). `bottom` renders full width below. */
export function ResultView({ analysis, imageUrl, bottom }: { analysis: AnalyzeResponse; imageUrl: string; bottom?: ReactNode }) {
  const { summary, lesions, classification } = analysis;
  const toast = useUi((s) => s.toast);
  const uid = useId();
  const [tab, setTab] = useState<Tab>('boxes');
  const [zoomIdx, setZoomIdx] = useState(0);
  const [focus, setFocus] = useState<{ cx: number; cy: number; key: number } | null>(null);
  const [hovered, setHovered] = useState<number | null>(null);
  const [selected, setSelected] = useState<number | null>(null);
  const [listOpen, setListOpen] = useState(false);
  const [camLoading, setCamLoading] = useState(false);
  const [cam, setCam] = useState<string | null>(null);

  const zoom = ZOOM_STEPS[zoomIdx];
  const activeIdx = hovered ?? selected;
  const fit = lesions.length ? fitLesions(lesions) : null;

  async function chooseTab(next: Tab) {
    setTab(next);
    if (next !== 'gradcam' || cam || !classification) return;
    setCamLoading(true);
    try {
      // One heatmap for the whole photo; it may already ride along with the classification.
      setCam(classification.gradcam_png_base64 || await api.getGradcam(analysis.analysis_id));
    } catch (e) {
      setTab('boxes');
      toast(errMessage(e, R.gradcamFailed), 'error');
    } finally {
      setCamLoading(false);
    }
  }

  function onTabKey(e: KeyboardEvent) {
    if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
    e.preventDefault();
    const i = TABS.findIndex((t) => t.id === tab);
    const next = TABS[(i + (e.key === 'ArrowRight' ? 1 : TABS.length - 1)) % TABS.length].id;
    chooseTab(next);
    document.getElementById(`${uid}-${next}`)?.focus();
  }

  const toggleSelect = (idx: number) => { setFocus(null); setSelected((cur) => (cur === idx ? null : idx)); };
  const stepZoom = (delta: number) => { setFocus(null); setZoomIdx((i) => i + delta); };
  const focusLesions = () => {
    if (!fit) return;
    setZoomIdx(fit.zoomIdx);
    setFocus({ cx: fit.cx, cy: fit.cy, key: Date.now() });
  };

  if (summary.total_lesions === 0) {
    return (
      <div className="space-y-6">
        <div className="card mx-auto max-w-md overflow-hidden !p-0">
          <DetectedImage src={imageUrl} lesions={[]} alt={R.imageAlt} aspect={analysis.image.width / analysis.image.height} />
        </div>
        <EmptyState
          title={R.emptyTitle}
          text={COPY.noLesion}
          action={<Link to={NEW_ANALYSIS_PATH} className="btn-primary">{R.emptyAction}</Link>}
        />
        {bottom}
      </div>
    );
  }

  // Signed-in users see the model's severity only. The count-based estimate is used just to decide on the mismatch note.
  const summaryProps = {
    total: summary.total_lesions,
    severity: classification?.severity ?? null,
    compact: true,
    model: classification
      ? {
        confidencePct: Math.round(classification.confidence * 100),
        isLowConfidence: classification.is_low_confidence,
        showMismatchNote: severityMismatch(summary.total_lesions, classification.severity),
      }
      : undefined,
  };

  return (
    <div className="space-y-6">
      {/* Below lg the result statement leads, so count and severity are not pushed under the photo */}
      <SeveritySummary {...summaryProps} className="lg:hidden" />

      <div className="grid items-start gap-6 lg:grid-cols-12 xl:grid-cols-[minmax(0,1fr)_20rem]">
        {/* Photo leads: 8 of 12 columns on desktop, all but a 20rem side column from xl, edge to edge on phones. The lesion list sits right under it. */}
        <div className="space-y-6 lg:col-span-8 xl:col-span-1">
          <div className="card overflow-hidden !p-0 max-md:-mx-gutter-sm max-md:rounded-none max-md:border-x-0">
            <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 md:px-6">
              <div role="tablist" aria-label={R.tabsLabel} onKeyDown={onTabKey} className="inline-flex rounded-control bg-tint p-1">
                {TABS.map((t) => (
                  <button
                    key={t.id} id={`${uid}-${t.id}`} type="button" role="tab"
                    aria-selected={tab === t.id} aria-controls={`${uid}-panel`} tabIndex={tab === t.id ? 0 : -1}
                    onClick={() => chooseTab(t.id)}
                    className={`rounded-control px-3 py-2.5 text-label-md transition-colors md:py-1.5 ${tab === t.id ? 'bg-white text-primary-700 shadow-card' : 'text-ink-600 hover:text-ink-900'}`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-2" role="toolbar" aria-label={COPY.detectResult.toolbarLabel}>
                <ToolButton label={COPY.detectResult.focus} disabled={!fit || (fit.zoomIdx === 0 && zoomIdx === 0)} onClick={focusLesions}>
                  <Focus className="h-4 w-4" aria-hidden /> {COPY.detectResult.focusShort}
                </ToolButton>
                <ToolButton label={COPY.detectResult.zoomOut} iconOnly disabled={zoomIdx === 0} onClick={() => stepZoom(-1)}>
                  <ZoomOut className="h-4 w-4" aria-hidden />
                </ToolButton>
                <span className="tnum w-11 text-center text-label-md text-ink-600" aria-live="polite">{Math.round(zoom * 100)}%</span>
                <ToolButton label={COPY.detectResult.zoomIn} iconOnly disabled={zoomIdx === ZOOM_STEPS.length - 1} onClick={() => stepZoom(1)}>
                  <ZoomIn className="h-4 w-4" aria-hidden />
                </ToolButton>
              </div>
            </div>

            <div id={`${uid}-panel`} role="tabpanel" aria-labelledby={`${uid}-${tab}`}>
              <DetectedImage
                src={imageUrl}
                lesions={lesions}
                alt={R.imageAlt}
                aspect={analysis.image.width / analysis.image.height}
                showBoxes={tab !== 'original'}
                heatmap={tab === 'gradcam' ? cam : null}
                zoom={zoom}
                activeIdx={activeIdx}
                selectedIdx={selected}
                focus={focus}
                onHover={setHovered}
                onSelect={toggleSelect}
              />
            </div>

            <div className="px-4 py-3 text-body-sm text-ink-500 md:px-6">
              {tab === 'gradcam' ? (
                camLoading ? <Spinner label={R.gradcamLoading} /> : (
                  <>
                    <p>{R.gradcamNote}</p>
                    <HeatmapKey />
                  </>
                )
              ) : tab === 'boxes' ? (
                <p>{R.legend}</p>
              ) : null}
            </div>
          </div>

            <section className="card" aria-labelledby={`${uid}-list`}>
              {/* Below lg the list is folded (the numbered boxes on the photo already carry it); from lg it is always open */}
              <h2 id={`${uid}-list`} className="text-headline-sm">
                <button
                  type="button" aria-expanded={listOpen} aria-controls={`${uid}-list-body`}
                  onClick={() => setListOpen((o) => !o)}
                  className="-my-2 flex w-full items-center justify-between gap-2 rounded-control py-2 text-left lg:hidden"
                >
                  {R.listTitle} ({lesions.length})
                  <ChevronDown className={`h-5 w-5 shrink-0 text-ink-500 transition-transform ${listOpen ? 'rotate-180' : ''}`} aria-hidden />
                </button>
                <span className="hidden lg:inline">{R.listTitle} ({lesions.length})</span>
              </h2>
              <div id={`${uid}-list-body`} className={listOpen ? 'mt-1' : 'hidden lg:mt-1 lg:block'}>
                <p className="mb-2 text-body-sm text-ink-500">{R.listExplain}</p>
                <LesionList lesions={lesions} activeIdx={activeIdx} selectedIdx={selected} onHover={setHovered} onSelect={toggleSelect} />
              </div>
            </section>
        </div>

        {/* The summary stays in view while the photo column scrolls, but only where the whole column fits the viewport height */}
        <div className="space-y-6 lg:top-20 lg:col-span-4 xl:col-span-1 lg:self-start lg:[@media(min-height:860px)]:sticky">
          <SeveritySummary {...summaryProps} className="hidden lg:block" />

          {classification && (
            <section className="card" aria-labelledby={`${uid}-prob`}>
              <h2 id={`${uid}-prob`} className="text-headline-sm">{R.probabilitiesTitle}</h2>
              <p className="mb-4 mt-1 text-body-sm text-ink-500">{R.probabilitiesNote}</p>
              <ProbabilityBars probabilities={classification.probabilities} selected={classification.severity} />
            </section>
          )}

          {/* One strip below lg; stacked rows in the narrow desktop column */}
          <dl className={`card grid divide-x divide-border !p-0 lg:grid-cols-1 lg:divide-x-0 lg:divide-y ${classification ? 'grid-cols-2' : 'grid-cols-1'}`}>
            {classification && <Stat label={R.statSeverityConfidence} value={pct(classification.confidence)} />}
            <Stat label={R.statTime} value={R.timeValue(analysis.timing_ms.total)} />
          </dl>

          {classification && analysis.model_info?.classification?.name && (
            <p className="px-1 text-body-sm text-ink-500">
              {R.modelLine(analysis.model_info.classification.name, analysis.model_info.classification.version)}
            </p>
          )}
        </div>
      </div>

      {bottom}
    </div>
  );
}
