import { useEffect, useMemo, useState } from 'react';
import { CircleDashed } from 'lucide-react';
import { ACNE_CLASSES, CLASS_META, COPY, type AcneClass, type Lesion } from '@acnevision/shared';
import { sortByClassConfidence } from '../lib/detection';

const R = COPY.result;
const LIST_LIMIT = 6;

/** Indonesian label first, the model's own name small underneath (never in parentheses). */
export function ClassName({ cls, size = 'md' }: { cls: AcneClass; size?: 'sm' | 'md' }) {
  return (
    <span className="block min-w-0">
      <span className={`block truncate text-ink-900 ${size === 'sm' ? 'text-label-md' : 'text-body-md font-medium'}`}>{CLASS_META[cls].label}</span>
      <span className="block truncate text-body-sm text-ink-500">{cls}</span>
    </span>
  );
}

/** Five rows in the fixed class order: color dot, name, lesion count, thin bar relative to the total. */
export function ClassDistribution({ classCounts, total }: { classCounts: Record<AcneClass, number>; total: number }) {
  return (
    <ul className="space-y-4">
      {ACNE_CLASSES.map((c) => {
        const n = classCounts[c] ?? 0;
        return (
          <li key={c} className={n === 0 ? 'opacity-60' : undefined}>
            <div className="flex items-center gap-3">
              <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: CLASS_META[c].color }} aria-hidden />
              <div className="flex-1"><ClassName cls={c} size="sm" /></div>
              <span className="tnum shrink-0 text-body-md text-ink-900">{R.lesionCount(n)}</span>
            </div>
            <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-tint" aria-hidden>
              <div className="h-full rounded-full" style={{ width: total ? `${(n / total) * 100}%` : 0, background: CLASS_META[c].color }} />
            </div>
          </li>
        );
      })}
    </ul>
  );
}

/**
 * Numbered lesion list. Only the rows are tab stops (chips on the photo are tabIndex -1); hover and focus
 * mirror the box on the photo. On desktop it shows 6 rows with "Lihat semua"; below lg it flows in full.
 */
export function ClassLesionList({ lesions, activeIdx, selectedIdx, onHover, onSelect }: {
  lesions: Lesion[]; activeIdx: number | null; selectedIdx: number | null; onHover: (idx: number | null) => void; onSelect: (idx: number) => void;
}) {
  const rows = useMemo(() => sortByClassConfidence(lesions), [lesions]);
  const [expanded, setExpanded] = useState(false);

  // A lesion picked on the photo must not stay hidden behind "Lihat semua".
  useEffect(() => {
    if (selectedIdx != null && rows.findIndex((l) => l.idx === selectedIdx) >= LIST_LIMIT) setExpanded(true);
  }, [selectedIdx, rows]);

  return (
    <div>
      <ul className="space-y-0.5" id="lesion-list">
        {rows.map((l, rank) => {
          const active = activeIdx === l.idx;
          const pct = Math.round(l.class_confidence * 100);
          const meta = CLASS_META[l.predicted_class];
          return (
            <li key={l.idx} className={!expanded && rank >= LIST_LIMIT ? 'lg:hidden' : undefined}>
              <button
                type="button"
                aria-pressed={selectedIdx === l.idx}
                aria-label={`${R.lesionName} ${l.idx + 1}, ${meta.label}, ${R.confidenceWord} ${pct}%${l.is_low_confidence ? `, ${R.lowConfidence}` : ''}`}
                onMouseEnter={() => onHover(l.idx)}
                onMouseLeave={() => onHover(null)}
                onFocus={() => onHover(l.idx)}
                onBlur={() => onHover(null)}
                onClick={() => onSelect(l.idx)}
                className={`flex w-full items-center gap-3 rounded-control px-2 py-2 text-left transition-colors ${active ? 'bg-primary-50' : 'hover:bg-tint'}`}
              >
                <span
                  className="tnum flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 bg-white text-[12px] font-semibold text-ink-900"
                  style={{ borderColor: meta.color }}
                >
                  {l.idx + 1}
                </span>
                <span className="min-w-0 flex-1">
                  <ClassName cls={l.predicted_class} size="sm" />
                  <span className="mt-1 block h-1 overflow-hidden rounded-full bg-primary-100" aria-hidden>
                    <span className={`block h-full rounded-full ${l.is_low_confidence ? 'bg-primary-300' : 'bg-primary-600'}`} style={{ width: `${pct}%` }} />
                  </span>
                  {l.is_low_confidence && (
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
          className="mt-2 hidden rounded-control px-2 py-1 text-label-md text-primary-600 hover:underline lg:inline-block"
        >
          {expanded ? R.viewLess : R.viewAll(rows.length)}
        </button>
      )}
    </div>
  );
}
