import { useEffect, useMemo, useState } from 'react';
import { CircleDashed } from 'lucide-react';
import { COPY, SEVERITY_META, SEVERITY_ORDER, type Lesion, type Severity } from '@acnevision/shared';
import { isLowConfidence, orderLesions } from '../lib/detection';

const R = COPY.result;
const LIST_LIMIT = 6;

/**
 * One bar per severity level in the fixed order, each with a text label and a percentage (color is never the only cue).
 * The level the AI chose is bold and tagged; the others are drawn lighter.
 */
export function ProbabilityBars({ probabilities, selected }: { probabilities: Record<Severity, number>; selected: Severity }) {
  return (
    <ul className="space-y-3">
      {SEVERITY_ORDER.map((s) => {
        const meta = SEVERITY_META[s];
        const pct = Math.round((probabilities[s] ?? 0) * 100);
        const on = s === selected;
        return (
          <li key={s}>
            <div className="flex items-baseline justify-between gap-3">
              <span className={on ? 'text-label-lg text-ink-900' : 'text-body-md text-ink-600'}>
                {meta.label}
                {on && <span className="ml-2 text-body-sm font-normal text-ink-500">{R.probabilitySelected}</span>}
              </span>
              <span className={`tnum shrink-0 ${on ? 'text-label-lg text-ink-900' : 'text-body-md text-ink-600'}`}>{pct}%</span>
            </div>
            <div className="mt-1.5 h-2 overflow-hidden rounded-full" style={{ background: meta.tint }} aria-hidden>
              <div className="h-full rounded-full" style={{ width: `${pct}%`, background: meta.solid, opacity: on ? 1 : 0.5 }} />
            </div>
          </li>
        );
      })}
    </ul>
  );
}

/** Small color key for the Grad-CAM heatmap, same ramp the heatmap itself uses: low influence (blue) to high (red). */
export function HeatmapKey() {
  return (
    <div className="mt-2 flex items-center gap-2 text-body-sm text-ink-500" role="img" aria-label={`${R.gradcamKeyLabel}: ${R.gradcamKeyLow} sampai ${R.gradcamKeyHigh}`}>
      <span aria-hidden>{R.gradcamKeyLow}</span>
      <span className="h-2 w-24 rounded-full" style={{ background: 'linear-gradient(to right, #2563EB, #FACC15, #DC2626)' }} aria-hidden />
      <span aria-hidden>{R.gradcamKeyHigh}</span>
    </div>
  );
}

/**
 * Numbered lesion list: number, "Jerawat", detection confidence. No class. Only the rows are tab stops (chips on the photo are
 * tabIndex -1); hover and focus mirror the box on the photo. On desktop it shows 6 rows with "Lihat semua"; below lg it flows in full.
 */
export function LesionList({ lesions, activeIdx, selectedIdx, onHover, onSelect }: {
  lesions: Lesion[]; activeIdx: number | null; selectedIdx: number | null; onHover: (idx: number | null) => void; onSelect: (idx: number) => void;
}) {
  // Same numbers as the boxes on the photo by default; the user can switch to most confident first.
  const [byConfidence, setByConfidence] = useState(false);
  const rows = useMemo(() => orderLesions(lesions, byConfidence), [lesions, byConfidence]);
  const [expanded, setExpanded] = useState(false);

  // A lesion picked on the photo must not stay hidden behind "Lihat semua".
  useEffect(() => {
    if (selectedIdx != null && rows.findIndex((l) => l.idx === selectedIdx) >= LIST_LIMIT) setExpanded(true);
  }, [selectedIdx, rows]);

  return (
    <div>
      <button
        type="button" aria-pressed={byConfidence} onClick={() => setByConfidence((v) => !v)}
        className="-ml-2 mb-1 rounded-control px-2 py-2 text-label-md text-primary-600 hover:underline"
      >
        {byConfidence ? R.sortByNumber : R.sortByConfidence}
      </button>
      <ul className="-mx-2 space-y-0.5 lg:grid lg:grid-cols-2 lg:gap-x-4 lg:space-y-0" id="lesion-list">
        {rows.map((l, rank) => {
          const active = activeIdx === l.idx;
          const pct = Math.round(l.det_confidence * 100);
          const low = isLowConfidence(l);
          return (
            <li key={l.idx} className={!expanded && rank >= LIST_LIMIT ? 'lg:hidden' : undefined}>
              <button
                type="button"
                aria-pressed={selectedIdx === l.idx}
                aria-label={`${R.lesionName} ${l.idx + 1}, ${l.label}, ${R.confidenceWord} ${pct}%${low ? `, ${R.lowConfidence}` : ''}`}
                onMouseEnter={() => onHover(l.idx)}
                onMouseLeave={() => onHover(null)}
                onFocus={() => onHover(l.idx)}
                onBlur={() => onHover(null)}
                onClick={() => onSelect(l.idx)}
                className={`flex w-full items-center gap-3 rounded-control px-2 py-2 text-left transition-colors ${active ? 'bg-primary-50' : 'hover:bg-tint'}`}
              >
                <span className="tnum flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 border-primary-600 bg-white text-[12px] font-semibold text-ink-900">
                  {l.idx + 1}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-label-md text-ink-900">{l.label}</span>
                  <span className="mt-1 block h-1 overflow-hidden rounded-full bg-primary-100" aria-hidden>
                    <span className={`block h-full rounded-full ${low ? 'bg-primary-300' : 'bg-primary-600'}`} style={{ width: `${pct}%` }} />
                  </span>
                  {low && (
                    <span className="mt-1 flex items-center gap-1 text-body-sm text-ink-500">
                      <CircleDashed className="h-3 w-3 shrink-0" aria-hidden /> {R.lowConfidence}
                    </span>
                  )}
                </span>
                <span className="tnum w-10 shrink-0 text-right text-ink-900">{pct}%</span>
              </button>
            </li>
          );
        })}
      </ul>
      {rows.length > LIST_LIMIT && (
        <button
          type="button" aria-expanded={expanded} aria-controls="lesion-list"
          onClick={() => setExpanded((e) => !e)}
          className="-ml-2 mt-1 hidden rounded-control px-2 py-2 text-label-md text-primary-600 hover:underline lg:inline-block"
        >
          {expanded ? R.viewLess : R.viewAll(rows.length)}
        </button>
      )}
    </div>
  );
}
