import { useState, type ReactNode } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { ArrowLeft, ChevronDown, Download, Droplets, Eye, EyeOff, Focus, Hand, Stethoscope, Sun, ZoomIn, ZoomOut, type LucideIcon } from 'lucide-react';
import { COPY, type DetectedLesion, type Severity } from '@acnevision/shared';
import { downloadDetectionPng } from '../lib/export';
import { summarizeConfidence } from '../lib/detection';
import { errMessage } from '../lib/errors';
import { useScan } from '../store/scan';
import { useUi } from '../store/ui';
import { DetectedImage, DetectionList } from '../components/DetectedImage';
import { SeverityScale } from '../components/SeverityScale';
import { UpgradeCard } from '../components/UpgradeCard';
import { Disclaimer, EmptyState, SeverityBadge } from '../components/ui';

const ZOOM_STEPS = [1, 1.25, 1.5, 2, 3];
const TIP_ICONS: LucideIcon[] = [Droplets, Hand, Sun];

/** Largest zoom step that still keeps every lesion (plus a margin for number chips) in view, and the cluster center. */
function fitLesions(lesions: DetectedLesion[]) {
  const x1 = Math.min(...lesions.map((l) => l.bbox.x1)), x2 = Math.max(...lesions.map((l) => l.bbox.x2));
  const y1 = Math.min(...lesions.map((l) => l.bbox.y1)), y2 = Math.max(...lesions.map((l) => l.bbox.y2));
  const fit = Math.min(1 / (x2 - x1 + 0.08), 1 / (y2 - y1 + 0.08));
  const zoomIdx = ZOOM_STEPS.reduce((best, z, i) => (z <= fit ? i : best), 0);
  return { zoomIdx, cx: (x1 + x2) / 2, cy: (y1 + y2) / 2 };
}

function ToolButton({ label, onClick, disabled, pressed, children }: {
  label: string; onClick: () => void; disabled?: boolean; pressed?: boolean; children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      aria-pressed={pressed}
      disabled={disabled}
      onClick={onClick}
      className="inline-flex h-9 items-center justify-center gap-1.5 rounded-control border border-border bg-white px-2.5 text-label-md text-ink-900 transition-colors hover:bg-primary-50 disabled:cursor-not-allowed disabled:opacity-50 aria-pressed:border-primary-200 aria-pressed:bg-primary-50"
    >
      {children}
    </button>
  );
}

/** Count sentence plus estimated severity (badge, scale, note). One card below `lg` at the top, one in the right column from `lg`. */
function SummaryCard({ total, severity, isEstimate, className }: {
  total: number; severity: Severity; isEstimate: boolean; className: string;
}) {
  const R = COPY.detectResult;
  return (
    <section className={`card space-y-5 ${className}`} aria-label={R.severityTitle}>
      <h2 className="text-headline-lg lg:text-display-sm">
        <span className="tnum text-primary-600">{total}</span> {R.countUnit}
      </h2>
      <div className="space-y-3">
        <p className="text-label-md text-ink-600">{R.severityTitle}</p>
        <SeverityBadge severity={severity} isEstimate={false} large />
        <div className="pt-2">
          <SeverityScale severity={severity} total={total} />
        </div>
        {isEstimate && <p className="text-body-sm text-ink-500">{COPY.severityNote}</p>}
      </div>
    </section>
  );
}

/** Guest detection result (docs/06 section 4.4a). Receives DetectResponse only: no class names, Grad-CAM, or chat. */
export default function DetectResult() {
  const { detection, imageUrl } = useScan();
  const toast = useUi((s) => s.toast);
  const [showBoxes, setShowBoxes] = useState(true);
  const [zoomIdx, setZoomIdx] = useState(0);
  const [hovered, setHovered] = useState<number | null>(null);
  const [selected, setSelected] = useState<number | null>(null);
  const [focus, setFocus] = useState<{ cx: number; cy: number; key: number } | null>(null);
  const [listOpen, setListOpen] = useState(false);
  // Guest results live in memory only (photos are never stored), so a refresh lands back on /scan with a short note.
  if (!detection || !imageUrl) return <Navigate to="/scan" replace state={{ resultExpired: true }} />;

  const { total_lesions, severity, severity_is_estimate } = detection.summary;
  const R = COPY.detectResult;
  const zoom = ZOOM_STEPS[zoomIdx];
  const activeIdx = hovered ?? selected;
  const hasLesions = total_lesions > 0;
  const fit = hasLesions ? fitLesions(detection.lesions) : null;
  const confidence = summarizeConfidence(detection.lesions);
  const toggleSelect = (idx: number) => { setFocus(null); setSelected((cur) => (cur === idx ? null : idx)); };
  const stepZoom = (delta: number) => { setFocus(null); setZoomIdx((i) => i + delta); };
  const focusLesions = () => {
    if (!fit) return;
    setZoomIdx(fit.zoomIdx);
    setFocus({ cx: fit.cx, cy: fit.cy, key: Date.now() });
  };

  // For moderate or severe estimates the doctor note leads, right under the summary. Tone stays calm either way.
  const doctorFirst = severity === 'moderate' || severity === 'severe';
  const doctorBlock = (
    <div className="flex gap-3">
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-control bg-primary-50 text-primary-600" aria-hidden>
        <Stethoscope className="h-4 w-4" />
      </span>
      <div>
        <h3 className="text-headline-sm">{R.doctorTitle}</h3>
        <p className="mt-1 text-body-md">
          {doctorFirst && <>{R.doctorLead} </>}
          {detection.advice}
        </p>
      </div>
    </div>
  );

  // Skin-care tips only make sense next to detected lesions; the empty state shows photo tips instead.
  const tipsBlock = (
    <div className="space-y-4">
      <h3 className="text-headline-sm">{R.adviceTitle}</h3>
      <ul className="space-y-3">
        {R.tips.map((tip, i) => {
          const Icon = TIP_ICONS[i];
          return (
            <li key={tip} className="flex gap-3 text-body-md">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-control bg-primary-50 text-primary-600" aria-hidden>
                <Icon className="h-4 w-4" />
              </span>
              <span className="pt-1">{tip}</span>
            </li>
          );
        })}
      </ul>
    </div>
  );

  // One "Saran" card instead of two: tips and the doctor note split by a thin rule (side by side at md, stacked otherwise).
  // For moderate or severe estimates the doctor note comes first.
  const adviceCard = (
    <div className="card">
      <div className="space-y-5 md:grid md:grid-cols-2 md:gap-x-8 md:space-y-0 lg:block lg:space-y-5">
        {doctorFirst ? doctorBlock : tipsBlock}
        <hr className="border-border md:hidden lg:block" />
        {doctorFirst ? tipsBlock : doctorBlock}
      </div>
    </div>
  );

  async function download() {
    try {
      await downloadDetectionPng(imageUrl!, detection!);
    } catch (e) {
      toast(errMessage(e, R.downloadFailed), 'error');
    }
  }

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between gap-4">
        <h1 className="text-headline-md sm:text-headline-lg">{R.title}</h1>
        {/* With no lesions the empty state carries the single retry action */}
        {hasLesions && (
          <Link to="/scan" className="btn-outline shrink-0">
            <ArrowLeft className="h-4 w-4" aria-hidden />
            <span className="sm:hidden">{R.anotherShort}</span>
            <span className="hidden sm:inline">{R.another}</span>
          </Link>
        )}
      </header>

      {/* Below lg the full summary leads, so count and severity are not pushed under the photo and list */}
      {hasLesions && (
        <SummaryCard total={total_lesions} severity={severity} isEstimate={severity_is_estimate} className="lg:hidden" />
      )}

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
        {/* Photo runs edge to edge inside the card: padded toolbar above, padded list below */}
        <div className="card overflow-hidden !p-0">
          {hasLesions && (
            <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 md:px-6" role="toolbar" aria-label={R.toolbarLabel}>
              {/* What the photo shows (boxes, focus) on the left; size and export on the right. Both groups carry text, so no icon-only mystery */}
              <div className="flex items-center gap-2">
                <ToolButton label={R.boxesLabel} pressed={showBoxes} onClick={() => setShowBoxes((v) => !v)}>
                  {showBoxes ? <Eye className="h-4 w-4" aria-hidden /> : <EyeOff className="h-4 w-4" aria-hidden />}
                  {R.boxesLabel}
                </ToolButton>
                <ToolButton label={R.focus} disabled={!fit || (fit.zoomIdx === 0 && zoomIdx === 0)} onClick={focusLesions}>
                  <Focus className="h-4 w-4" aria-hidden /> {R.focusShort}
                </ToolButton>
              </div>
              <div className="flex items-center gap-2">
                <ToolButton label={R.zoomOut} disabled={zoomIdx === 0} onClick={() => stepZoom(-1)}>
                  <ZoomOut className="h-4 w-4" aria-hidden />
                </ToolButton>
                <span className="tnum w-11 text-center text-label-md text-ink-600" aria-live="polite">{Math.round(zoom * 100)}%</span>
                <ToolButton label={R.zoomIn} disabled={zoomIdx === ZOOM_STEPS.length - 1} onClick={() => stepZoom(1)}>
                  <ZoomIn className="h-4 w-4" aria-hidden />
                </ToolButton>
                <ToolButton label={R.download} onClick={download}>
                  <Download className="h-4 w-4" aria-hidden /> {R.download}
                </ToolButton>
              </div>
            </div>
          )}

          <DetectedImage
            src={imageUrl}
            lesions={detection.lesions}
            alt={R.imageAlt}
            showBoxes={showBoxes}
            zoom={zoom}
            activeIdx={activeIdx}
            selectedIdx={selected}
            focus={focus}
            onHover={setHovered}
            onSelect={toggleSelect}
          />

          {!hasLesions && (
            <div className="px-4 py-4 md:px-6 md:py-5">
              <h3 className="text-headline-sm">{COPY.scan.tipsTitle}</h3>
              <ul className="mt-3 space-y-2 text-body-md">
                {COPY.photoTips.map((t) => (
                  <li key={t} className="flex gap-2"><span className="text-success" aria-hidden>✓</span>{t}</li>
                ))}
              </ul>
            </div>
          )}

          {hasLesions && (
            <>
              <p className="px-4 pt-3 text-body-sm text-ink-500 md:px-6">{R.legend}</p>
              <div className="mx-4 mt-4 border-t border-border pb-4 pt-4 md:mx-6 md:pb-6">
                <div>
                  <h3 className="text-headline-sm">
                    {/* Below lg the list folds away (the chips on the photo already carry it); from lg it is always open */}
                    <button
                      type="button"
                      aria-expanded={listOpen}
                      aria-controls="lesion-list"
                      onClick={() => setListOpen((o) => !o)}
                      className="flex items-center gap-1.5 rounded-control lg:hidden"
                    >
                      {R.listTitle} ({total_lesions})
                      <ChevronDown className={`h-4 w-4 text-ink-500 transition-transform ${listOpen ? 'rotate-180' : ''}`} aria-hidden />
                    </button>
                    <span className="hidden lg:inline">{R.listTitle}</span>
                  </h3>
                  <p className="mt-1 text-body-sm text-ink-500">
                    {confidence.count} {R.lesionUnit}, {R.avgConfidence} {confidence.avgPct}%
                    {confidence.lowCount > 0 && <>, {confidence.lowCount} {R.lowConfidence}</>}
                  </p>
                  <p className="text-body-sm text-ink-500">{R.confidenceExplain}</p>
                </div>
                <div id="lesion-list" className={`mt-2 ${listOpen ? '' : 'hidden lg:block'}`}>
                  <DetectionList
                    lesions={detection.lesions}
                    activeIdx={activeIdx}
                    selectedIdx={selected}
                    onHover={setHovered}
                    onSelect={toggleSelect}
                  />
                </div>
              </div>
            </>
          )}
        </div>

        <div className="space-y-6">
          {hasLesions ? (
            <SummaryCard total={total_lesions} severity={severity} isEstimate={severity_is_estimate} className="hidden lg:block" />
          ) : (
            <EmptyState
              title={R.emptyTitle}
              text={R.emptyText}
              action={<Link to="/scan" className="btn-primary">{R.emptyAction}</Link>}
            />
          )}

          {hasLesions ? adviceCard : <div className="card">{doctorBlock}</div>}
        </div>
      </div>

      {/* Full-width row under both columns, so the left card never ends above an empty gap */}
      <Disclaimer variant="box" />

      {detection.upgrade && <UpgradeCard message={detection.upgrade.message} unlocks={detection.upgrade.unlocks} />}
    </div>
  );
}
