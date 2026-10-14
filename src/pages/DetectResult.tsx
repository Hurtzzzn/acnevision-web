import { useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { ArrowLeft, Check, ChevronDown, Download, Droplets, Eye, EyeOff, Focus, Hand, Lightbulb, Stethoscope, Sun, type LucideIcon } from 'lucide-react';
import { COPY, leadsWithDoctor } from '@acnevision/shared';
import { downloadDetectionPng } from '../lib/export';
import { isLowConfidence, summarizeConfidence } from '../lib/detection';
import { errMessage } from '../lib/errors';
import { useAuth } from '../store/auth';
import { useScan } from '../store/scan';
import { useUi } from '../store/ui';
import { DetectedImage, DetectionList } from '../components/DetectedImage';
import { fitLesions, ToolButton, ZoomControl, ZOOM_STEPS } from '../components/PhotoTools';
import { SeveritySummary } from '../components/SeveritySummary';
import { UpgradeCard } from '../components/UpgradeCard';
import { Disclaimer, EmptyState } from '../components/ui';

const TIP_ICONS: LucideIcon[] = [Droplets, Hand, Sun];

/** Guest detection result (docs/06 section 4.4a). Receives DetectResponse only: no class names, Grad-CAM, or chat. */
export default function DetectResult() {
  const { detection, imageUrl } = useScan();
  const toast = useUi((s) => s.toast);
  const user = useAuth((s) => s.user);
  const [showBoxes, setShowBoxes] = useState(true);
  const [zoomIdx, setZoomIdx] = useState(0);
  const [hovered, setHovered] = useState<number | null>(null);
  const [selected, setSelected] = useState<number | null>(null);
  const [focus, setFocus] = useState<{ cx: number; cy: number; key: number } | null>(null);
  const [listOpen, setListOpen] = useState(false);
  // Guest results live in memory only (photos are never stored), so a refresh lands back on /scan with a short note.
  if (!detection || !imageUrl) return <Navigate to="/scan" replace state={{ resultExpired: true }} />;

  const { total_lesions, severity } = detection.summary;
  const R = COPY.detectResult;
  const zoom = ZOOM_STEPS[zoomIdx];
  const activeIdx = hovered ?? selected;
  const hasLesions = total_lesions > 0;
  const fit = hasLesions ? fitLesions(detection.lesions) : null;
  const confidence = summarizeConfidence(detection.lesions);
  const toggleSelect = (idx: number) => { setFocus(null); setSelected((cur) => (cur === idx ? null : idx)); };
  const stepZoom = (delta: number) => { setFocus(null); setZoomIdx((i) => Math.min(ZOOM_STEPS.length - 1, Math.max(0, i + delta))); };
  // Polite announcement for screen readers when a row or chip is picked; visually it is only a highlight and a scroll.
  const selectedLesion = selected == null ? null : detection.lesions.find((l) => l.idx === selected);
  const selectionNote = selectedLesion
    ? R.selectedAnnounce(selectedLesion.idx + 1, Math.round(selectedLesion.det_confidence * 100), isLowConfidence(selectedLesion))
    : '';
  const focusLesions = () => {
    if (!fit) return;
    setZoomIdx(fit.zoomIdx);
    setFocus({ cx: fit.cx, cy: fit.cy, key: Date.now() });
  };

  // For moderate or higher estimates the doctor note leads, right under the summary. Tone stays calm either way.
  const doctorFirst = leadsWithDoctor(severity);
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
        {doctorFirst && <p className="mt-2 text-body-md">{R.doctorFirstStep}</p>}
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
  // For moderate or higher estimates the doctor note comes first.
  const adviceCard = (
    <div className="card">
      <div className="space-y-5 md:grid md:grid-cols-2 md:gap-x-8 md:space-y-0 lg:block lg:space-y-5">
        {doctorFirst ? doctorBlock : tipsBlock}
        <hr className="border-border md:hidden lg:block" />
        {doctorFirst ? tipsBlock : doctorBlock}
      </div>
    </div>
  );

  // Without lesions there is nothing for a doctor note to explain: one light, useful step instead.
  const lightStep = (
    <div className="card flex gap-3">
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-control bg-primary-50 text-primary-600" aria-hidden>
        <Lightbulb className="h-4 w-4" />
      </span>
      <div>
        <h3 className="text-headline-sm">{R.emptyStepTitle}</h3>
        <p className="mt-1 text-body-md">{R.emptyStep}</p>
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
          <Link to="/scan" className="btn-outline min-h-11 shrink-0">
            <ArrowLeft className="h-4 w-4" aria-hidden />
            <span className="sm:hidden">{R.anotherShort}</span>
            <span className="hidden sm:inline">{R.another}</span>
          </Link>
        )}
      </header>

      {/* Below lg the full summary leads, so count and severity are not pushed under the photo and list */}
      {hasLesions && <SeveritySummary total={total_lesions} severity={severity} className="lg:hidden" />}

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
        {/* Photo runs edge to edge inside the card: padded toolbar above, padded list below */}
        <div className="card overflow-hidden !p-0">
          {hasLesions && (
            <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 md:px-6" role="toolbar" aria-label={R.toolbarLabel}>
              {/* Three controls: boxes on/off, one compact zoom control (pinch on the photo does the same), and export. */}
              <ToolButton label={R.boxesLabel} pressed={showBoxes} onClick={() => setShowBoxes((v) => !v)}>
                {showBoxes ? <Eye className="h-4 w-4" aria-hidden /> : <EyeOff className="h-4 w-4" aria-hidden />}
                {R.boxesLabel}
              </ToolButton>
              <div className="flex flex-wrap items-center gap-2">
                <ZoomControl zoomIdx={zoomIdx} onStep={stepZoom} />
                <ToolButton label={R.download} onClick={download}>
                  <Download className="h-4 w-4" aria-hidden /> {R.download}
                </ToolButton>
              </div>
            </div>
          )}

          <DetectedImage
            src={imageUrl}
            lesions={detection.lesions}
            alt={R.imageAlt(total_lesions)}
            frameLabel={R.zoomFrameLabel}
            onPinch={stepZoom}
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
                  <li key={t} className="flex gap-2"><Check className="mt-0.5 h-4 w-4 shrink-0 text-success" aria-hidden />{t}</li>
                ))}
              </ul>
            </div>
          )}

          {hasLesions && (
            <>
              <p className="px-4 pt-2 text-body-sm text-ink-600 md:px-6">{R.legend}</p>
              <div className="mx-4 mt-4 border-t border-border pb-4 pt-4 md:mx-6 md:pb-6">
                <div>
                  <h3 className="text-headline-sm">
                    {/* Below lg the list folds away (the chips on the photo already carry it); from lg it is always open */}
                    <button
                      type="button"
                      aria-expanded={listOpen}
                      aria-controls="lesion-list"
                      onClick={() => setListOpen((o) => !o)}
                      className="flex min-h-11 items-center gap-1.5 rounded-control lg:hidden"
                    >
                      {R.listTitle} ({total_lesions})
                      <ChevronDown className={`h-4 w-4 text-ink-500 motion-safe:transition-transform ${listOpen ? 'rotate-180' : ''}`} aria-hidden />
                    </button>
                    <span className="hidden lg:inline">{R.listTitle}</span>
                  </h3>
                  <p className="mt-1 text-body-md text-ink-600">
                    {R.listSummary(confidence.avgPct, confidence.lowCount)}
                  </p>
                  <p className="mt-1 text-body-md text-ink-600">{R.listNote}</p>
                  {/* Folded in from the toolbar: zooms to the cluster of lesions. Disabled with a stated reason when it would do nothing. */}
                  <div className="mt-3">
                    <ToolButton label={R.focusHint} disabled={!fit || (fit.zoomIdx === 0 && zoomIdx === 0)} disabledReason={R.focusDisabledReason} onClick={focusLesions}>
                      <Focus className="h-4 w-4" aria-hidden /> {R.focus}
                    </ToolButton>
                  </div>
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
            <SeveritySummary total={total_lesions} severity={severity} className="hidden lg:block" />
          ) : (
            <EmptyState
              title={R.emptyTitle}
              text={R.emptyText}
              action={<Link to="/scan" className="btn-primary min-h-11">{R.emptyAction}</Link>}
            />
          )}

          {hasLesions ? adviceCard : lightStep}

          {/* Right under the advice, once per page */}
          <Disclaimer variant="box" />
        </div>
      </div>

      <p className="sr-only" aria-live="polite">{selectionNote}</p>

      {/* Shown by session state, not by the API field: a guest always sees it, a signed-in user never does. The API text is optional. */}
      {!user && (
        <UpgradeCard
          message={detection.upgrade?.message ?? COPY.detect.upgradeMessage}
          unlocks={detection.upgrade?.unlocks ?? COPY.detect.upgradeUnlocks}
        />
      )}
    </div>
  );
}
