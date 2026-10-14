import { useId, useState, type KeyboardEvent, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ChevronDown, Focus, ZoomIn, ZoomOut } from 'lucide-react';
import { COPY, severityMismatch, type AnalyzeResponse } from '@acnevision/shared';
import { api } from '../lib/runtime';
import { errMessage } from '../lib/errors';
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

/** Model name, version and timing: kept out of the main view, folded away by default. */
function TechDetails({ analysis }: { analysis: AnalyzeResponse }) {
  const model = analysis.model_info?.classification;
  return (
    <details className="group rounded-card border border-border px-4 py-1 text-body-sm text-ink-600">
      <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-2 text-label-md text-ink-600 [&::-webkit-details-marker]:hidden">
        {R.techTitle}
        <ChevronDown className="h-4 w-4 transition-transform group-open:rotate-180" aria-hidden />
      </summary>
      <dl className="space-y-2 pb-3">
        <div className="flex justify-between gap-3"><dt>{R.statTime}</dt><dd className="tnum text-ink-900">{R.timeValue(analysis.timing_ms.total)}</dd></div>
        {model?.name && (
          <div className="flex justify-between gap-3"><dt>{R.modelLabel}</dt><dd className="text-right text-ink-900">{R.modelValue(model.name, model.version)}</dd></div>
        )}
      </dl>
    </details>
  );
}

/**
 * Full-analysis layout shared by /analysis/:id and /history/:scanId (docs/06 section 4.4b).
 * Order on a phone: photo, summary, `recommendation`, lesion list, technical details, `bottom` (full width, actions last).
 */
export function ResultView({ analysis, imageUrl, recommendation, bottom }: {
  analysis: AnalyzeResponse; imageUrl: string; recommendation?: ReactNode; bottom?: ReactNode;
}) {
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
        {recommendation}
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

  // Summary + probabilities: under the photo below lg, in the sticky right column from lg.
  const summaryBlock = (className: string, idSuffix: string) => (
    <div className={`space-y-6 ${className}`}>
      <SeveritySummary {...summaryProps} className="" />
      {classification && (
        <section className="card" aria-labelledby={`${uid}-prob-${idSuffix}`}>
          <h2 id={`${uid}-prob-${idSuffix}`} className="mb-3 text-headline-sm">{R.probabilitiesTitle}</h2>
          <ProbabilityBars probabilities={classification.probabilities} selected={classification.severity} />
        </section>
      )}
    </div>
  );

  return (
    <div className="space-y-6">
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
                    className={`min-h-11 rounded-control px-3 text-label-md transition-colors md:min-h-9 ${tab === t.id ? 'bg-white text-primary-700 shadow-card' : 'text-ink-600 hover:text-ink-900'}`}
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
                    <div className="sm:hidden"><HeatmapKey compact /></div>
                    <div className="hidden sm:block"><HeatmapKey /></div>
                  </>
                )
              ) : tab === 'boxes' ? (
                <p>{R.legend}</p>
              ) : null}
            </div>
          </div>

          {summaryBlock('lg:hidden', 'm')}

          {recommendation}

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

          <TechDetails analysis={analysis} />
        </div>

        {/* From lg the summary stays in view while the photo and lesion list scroll; it scrolls inside itself if taller than the screen */}
        <aside className="hidden lg:sticky lg:top-20 lg:col-span-4 lg:block lg:max-h-[calc(100vh-6rem)] lg:-m-1 lg:self-start lg:overflow-y-auto lg:p-1 xl:col-span-1">
          {summaryBlock('', 'd')}
        </aside>
      </div>

      {bottom}
    </div>
  );
}
