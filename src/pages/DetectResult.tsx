import { useState, type ReactNode } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { ArrowLeft, Download, Droplets, Eye, EyeOff, Hand, Stethoscope, Sun, ZoomIn, ZoomOut, type LucideIcon } from 'lucide-react';
import { COPY } from '@acnevision/shared';
import { downloadDetectionPng } from '../lib/export';
import { errMessage } from '../lib/errors';
import { useScan } from '../store/scan';
import { useUi } from '../store/ui';
import { DetectedImage, DetectionList } from '../components/DetectedImage';
import { SeverityScale } from '../components/SeverityScale';
import { UpgradeCard } from '../components/UpgradeCard';
import { Disclaimer, EmptyState, SeverityBadge } from '../components/ui';

const ZOOM_STEPS = [1, 1.5, 2, 3];
const TIP_ICONS: LucideIcon[] = [Droplets, Hand, Sun];

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

/** Guest detection result (docs/06 section 4.4a). Receives DetectResponse only: no class names, Grad-CAM, or chat. */
export default function DetectResult() {
  const { detection, imageUrl } = useScan();
  const toast = useUi((s) => s.toast);
  const [showBoxes, setShowBoxes] = useState(true);
  const [zoomIdx, setZoomIdx] = useState(0);
  const [hovered, setHovered] = useState<number | null>(null);
  const [selected, setSelected] = useState<number | null>(null);
  if (!detection || !imageUrl) return <Navigate to="/scan" replace />;

  const { total_lesions, severity, severity_is_estimate } = detection.summary;
  const R = COPY.detectResult;
  const zoom = ZOOM_STEPS[zoomIdx];
  const activeIdx = hovered ?? selected;
  const hasLesions = total_lesions > 0;
  const toggleSelect = (idx: number) => setSelected((cur) => (cur === idx ? null : idx));

  async function download() {
    try {
      await downloadDetectionPng(imageUrl!, detection!);
    } catch (e) {
      toast(errMessage(e, R.downloadFailed), 'error');
    }
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <h1 className="text-headline-lg md:text-headline-lg">{R.title}</h1>
        <Link to="/scan" className="btn-outline"><ArrowLeft className="h-4 w-4" aria-hidden /> {R.another}</Link>
      </header>

      {/* Compact summary for small screens, so the result is not pushed below the photo */}
      {hasLesions && (
        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 rounded-card border border-border bg-tint px-4 py-3 lg:hidden">
          <h2 className="text-headline-lg">
            <span className="tnum text-primary-600">{total_lesions}</span> {R.countUnit}
          </h2>
          <SeverityBadge severity={severity} isEstimate={false} />
        </div>
      )}

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
        {/* Photo runs edge to edge inside the card: padded toolbar above, padded list below */}
        <div className="card overflow-hidden !p-0">
          {hasLesions && (
            <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 md:px-6" role="toolbar" aria-label={R.toolbarLabel}>
              <ToolButton label={R.boxesLabel} pressed={showBoxes} onClick={() => setShowBoxes((v) => !v)}>
                {showBoxes ? <Eye className="h-4 w-4" aria-hidden /> : <EyeOff className="h-4 w-4" aria-hidden />}
                {R.boxesLabel}
              </ToolButton>
              <div className="flex items-center gap-2">
                <ToolButton label={R.zoomOut} disabled={zoomIdx === 0} onClick={() => setZoomIdx((i) => i - 1)}>
                  <ZoomOut className="h-4 w-4" aria-hidden />
                </ToolButton>
                <span className="tnum w-11 text-center text-label-md text-ink-600" aria-live="polite">{Math.round(zoom * 100)}%</span>
                <ToolButton label={R.zoomIn} disabled={zoomIdx === ZOOM_STEPS.length - 1} onClick={() => setZoomIdx((i) => i + 1)}>
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
            onHover={setHovered}
            onSelect={toggleSelect}
          />

          {hasLesions && (
            <>
              <p className="px-4 pt-3 text-body-sm text-ink-500 md:px-6">{R.legend}</p>
              <div className="mx-4 mt-4 border-t border-border pb-4 pt-4 md:mx-6 md:pb-6">
                <div className="mb-2 flex items-baseline justify-between gap-3">
                  <h3 className="text-headline-sm">{R.listTitle}</h3>
                  <span className="text-body-sm text-ink-500">{R.confidenceLabel}</span>
                </div>
                <DetectionList
                  lesions={detection.lesions}
                  activeIdx={activeIdx}
                  selectedIdx={selected}
                  onHover={setHovered}
                  onSelect={toggleSelect}
                />
              </div>
            </>
          )}
        </div>

        <div className="space-y-6">
          {hasLesions ? (
            <div className="card space-y-5">
              <h2 className="hidden text-display-sm lg:block">
                <span className="tnum text-primary-600">{total_lesions}</span> {R.countUnit}
              </h2>
              <div className="space-y-3">
                <p className="text-label-md text-ink-600">{R.severityTitle}</p>
                <SeverityBadge severity={severity} isEstimate={severity_is_estimate} large />
                <div className="pt-2">
                  <SeverityScale severity={severity} total={total_lesions} />
                </div>
              </div>
            </div>
          ) : (
            <EmptyState
              title={R.emptyTitle}
              text={R.emptyText}
              action={<Link to="/scan" className="btn-primary">{R.emptyAction}</Link>}
            />
          )}

          <div className="card space-y-4">
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
            <div className="flex gap-3 rounded-btn bg-tint p-4">
              <Stethoscope className="mt-0.5 h-5 w-5 shrink-0 text-primary-600" aria-hidden />
              <div>
                <p className="font-semibold text-ink-900">{R.doctorTitle}</p>
                <p className="mt-1 text-body-md">{detection.advice}</p>
              </div>
            </div>
          </div>

          <Disclaimer variant="box" />
        </div>
      </div>

      {detection.upgrade && <UpgradeCard message={detection.upgrade.message} unlocks={detection.upgrade.unlocks} />}
    </div>
  );
}
