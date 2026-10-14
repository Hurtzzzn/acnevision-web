import { useEffect, useMemo, useRef, useState } from 'react';
import { CircleDashed } from 'lucide-react';
import { COPY, type DetectedLesion } from '@acnevision/shared';
import { isLowConfidence, sortByConfidence } from '../lib/detection';

const CHIP = 24;
/** Distance (px) from a chip's center to its box beyond which a leader line is always drawn. */
const LEADER_GAP = 20;

type Pos = { x: number; y: number };

/** The fields the photo overlay needs. */
export type BoxLesion = Pick<DetectedLesion, 'idx' | 'bbox' | 'det_confidence'>;

/** One neutral color for every box, for guests and signed-in users alike. */
const BOX_COLOR = '#2563EB';

function overlaps(a: Pos, b: Pos) {
  return a.x < b.x + CHIP && b.x < a.x + CHIP && a.y < b.y + CHIP && b.y < a.y + CHIP;
}

/**
 * Place one numbered chip per lesion so no two chips overlap. Tries spots hugging the box first,
 * then widens the search ring by ring. Coordinates are px relative to the image box.
 */
function placeChips(lesions: BoxLesion[], W: number, H: number): Map<number, Pos> {
  const placed: Pos[] = [];
  const out = new Map<number, Pos>();
  const clamp = (p: Pos): Pos => ({ x: Math.max(0, Math.min(W - CHIP, p.x)), y: Math.max(0, Math.min(H - CHIP, p.y)) });
  for (const l of lesions) {
    const bx = l.bbox.x1 * W, by = l.bbox.y1 * H;
    const bw = (l.bbox.x2 - l.bbox.x1) * W, bh = (l.bbox.y2 - l.bbox.y1) * H;
    const tried: Pos[] = [
      { x: bx, y: by - CHIP - 2 },
      { x: bx + bw - CHIP, y: by - CHIP - 2 },
      { x: bx + bw + 2, y: by },
      { x: bx - CHIP - 2, y: by },
      { x: bx, y: by + bh + 2 },
      { x: bx + bw - CHIP, y: by + bh + 2 },
    ];
    for (let ring = 1; ring <= 6; ring++) {
      const d = ring * (CHIP + 4);
      const cx = bx + bw / 2 - CHIP / 2, cy = by + bh / 2 - CHIP / 2;
      for (let k = 0; k < 12; k++) {
        const a = (k / 12) * Math.PI * 2;
        tried.push({ x: cx + Math.cos(a) * d, y: cy + Math.sin(a) * d });
      }
    }
    const pick = tried.map(clamp).find((c) => !placed.some((p) => overlaps(c, p))) ?? clamp(tried[0]);
    placed.push(pick);
    out.set(l.idx, pick);
  }
  return out;
}

interface DetectedImageProps<T extends BoxLesion> {
  src: string;
  lesions: T[];
  alt: string;
  showBoxes?: boolean;
  /** Image width multiplier; the frame scrolls when > 1. */
  zoom?: number;
  activeIdx?: number | null;
  /** The lesion picked via click or the list; the zoomed frame scrolls to it. */
  selectedIdx?: number | null;
  /** Normalized point to center in the zoomed frame; a new `key` re-triggers the scroll. */
  focus?: { cx: number; cy: number; key: number } | null;
  onHover?: (idx: number | null) => void;
  onSelect?: (idx: number) => void;
  /** Grad-CAM PNG (base64): one heatmap laid over the whole photo, under the boxes. */
  heatmap?: string | null;
  /** Width / height of the photo when known up front (e.g. from the API), so the frame has its final height before the image loads. */
  aspect?: number;
}

/**
 * Result photo with numbered boxes 1..n, all in one neutral blue (no class color or name), optionally under a single Grad-CAM heatmap.
 * Keyboard path is the lesion list; chips here are mouse/touch targets (tabIndex -1) that keep an aria-label.
 */
export function DetectedImage<T extends BoxLesion>({
  src, lesions, alt, showBoxes = true, zoom = 1, activeIdx = null, selectedIdx = null, focus = null, onHover, onSelect,
  heatmap, aspect,
}: DetectedImageProps<T>) {
  const frameRef = useRef<HTMLDivElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const [size, setSize] = useState({ w: 0, h: 0 });
  // Natural ratio once the image has loaded; until then the frame reserves space (given aspect, else 4:3) and draws no overlay.
  const [natural, setNatural] = useState<number | null>(null);
  const loaded = natural != null;
  const ratio = natural ?? aspect ?? 4 / 3;

  useEffect(() => {
    setNatural(null);
    const img = imgRef.current;
    if (img?.complete && img.naturalWidth) setNatural(img.naturalWidth / img.naturalHeight);
  }, [src]);

  // When zoomed, bring the selected lesion to the middle of the scrollable frame (list selection is the keyboard path).
  useEffect(() => {
    const frame = frameRef.current;
    const l = selectedIdx == null ? null : lesions.find((x) => x.idx === selectedIdx);
    if (!frame || !l || zoom <= 1 || !size.w) return;
    frame.scrollTo({
      left: ((l.bbox.x1 + l.bbox.x2) / 2) * size.w - frame.clientWidth / 2,
      top: ((l.bbox.y1 + l.bbox.y2) / 2) * size.h - frame.clientHeight / 2,
    });
  }, [selectedIdx, zoom, lesions, size.w, size.h]);

  // Declared after the selection effect so an explicit "focus on lesions" wins when both apply.
  useEffect(() => {
    const frame = frameRef.current;
    if (!frame || !focus || zoom <= 1 || !size.w) return;
    frame.scrollTo({
      left: focus.cx * size.w - frame.clientWidth / 2,
      top: focus.cy * size.h - frame.clientHeight / 2,
    });
  }, [focus, zoom, size.w, size.h]);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    // Whole pixels only, and ignore changes under 1px, so fractional layouts (browser zoom, display scaling) can never feed back
    // into another measure. The size comes from the wrapper's content box, whose height is set by CSS aspect-ratio.
    const apply = (w: number, h: number) => setSize((cur) => (
      Math.abs(cur.w - w) >= 1 || Math.abs(cur.h - h) >= 1 ? { w: Math.round(w), h: Math.round(h) } : cur
    ));
    // ResizeObserver reports the initial size right after observe(), so one source (contentRect) feeds every update.
    const ro = new ResizeObserver((entries) => {
      const box = entries[0].contentRect;
      apply(box.width, box.height);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const chips = useMemo(
    () => (size.w && size.h ? placeChips(lesions, size.w, size.h) : new Map<number, Pos>()),
    [lesions, size.w, size.h],
  );

  return (
    <div
      ref={frameRef}
      // Scrollbars only when zoomed in. With overflow-auto at 100%, a fractional photo height can overflow by a sub-pixel, which
      // adds a scrollbar, narrows the photo, shrinks its height, removes the scrollbar, and repeats (the photo "shakes").
      // When zoomed, the gutter is reserved so a scrollbar appearing cannot resize the photo either.
      className={zoom > 1 ? 'overflow-auto bg-tint [scrollbar-gutter:stable]' : 'overflow-hidden bg-tint'}
      style={zoom > 1 ? { maxHeight: '75vh' } : undefined}
      tabIndex={zoom > 1 ? 0 : undefined}
      aria-label={zoom > 1 ? alt : undefined}
    >
      <div ref={wrapRef} className="relative" style={{ width: `${zoom * 100}%`, aspectRatio: String(ratio) }}>
        <img
          ref={imgRef} src={src} alt={alt} className="absolute inset-0 block h-full w-full"
          onLoad={(e) => setNatural(e.currentTarget.naturalWidth / e.currentTarget.naturalHeight)}
        />
        {/* Before the boxes in the DOM, so boxes and chips stay on top of the heatmap */}
        {loaded && heatmap && (
          <img src={`data:image/png;base64,${heatmap}`} alt="" className="pointer-events-none absolute inset-0 block h-full w-full opacity-80" />
        )}
        {loaded && showBoxes && lesions.map((l) => {
          const active = activeIdx === l.idx;
          return (
            <div
              key={l.idx}
              aria-hidden
              onMouseEnter={() => onHover?.(l.idx)}
              onMouseLeave={() => onHover?.(null)}
              onClick={() => onSelect?.(l.idx)}
              className={`absolute cursor-pointer rounded-[3px] transition-colors ${active ? 'z-20 border-[3px]' : 'border-[1.5px]'}`}
              style={{
                left: `${l.bbox.x1 * 100}%`, top: `${l.bbox.y1 * 100}%`,
                width: `${(l.bbox.x2 - l.bbox.x1) * 100}%`, height: `${(l.bbox.y2 - l.bbox.y1) * 100}%`,
                borderColor: BOX_COLOR, borderStyle: 'solid',
                background: active ? `${BOX_COLOR}33` : undefined,
              }}
            />
          );
        })}
        {loaded && showBoxes && size.w > 0 && (
          <svg width={size.w} height={size.h} className="pointer-events-none absolute left-0 top-0 z-10" aria-hidden>
            {lesions.map((l) => {
              const p = chips.get(l.idx);
              if (!p) return null;
              const bx = l.bbox.x1 * size.w, by = l.bbox.y1 * size.h;
              const bw = (l.bbox.x2 - l.bbox.x1) * size.w, bh = (l.bbox.y2 - l.bbox.y1) * size.h;
              const cx = p.x + CHIP / 2, cy = p.y + CHIP / 2;
              const px = Math.max(bx, Math.min(bx + bw, cx)), py = Math.max(by, Math.min(by + bh, cy));
              const gap = Math.hypot(cx - px, cy - py);
              const active = activeIdx === l.idx;
              // Chips hugging their box need no line; far chips always get one, and hover/focus reveals it.
              if (gap <= CHIP / 2 + 1 || (gap <= LEADER_GAP && !active)) return null;
              return (
                <line
                  key={l.idx} x1={cx} y1={cy} x2={px} y2={py}
                  stroke={BOX_COLOR} strokeWidth={active ? 1.75 : 1.25} strokeOpacity={active ? 1 : 0.8}
                />
              );
            })}
          </svg>
        )}
        {loaded && showBoxes && lesions.map((l) => {
          const p = chips.get(l.idx);
          if (!p) return null;
          const active = activeIdx === l.idx;
          return (
            <button
              key={`chip-${l.idx}`}
              type="button"
              aria-label={`${COPY.detectResult.lesionName} ${l.idx + 1}`}
              aria-pressed={active}
              tabIndex={-1}
              onMouseEnter={() => onHover?.(l.idx)}
              onMouseLeave={() => onHover?.(null)}
              onClick={() => onSelect?.(l.idx)}
              className={`tnum absolute z-30 flex items-center justify-center rounded-full text-[12px] after:absolute after:-inset-1.5 after:content-[''] font-semibold leading-none shadow-card transition-colors ${active ? 'bg-primary-600 text-white' : 'frosted text-primary-800'}`}
              style={{ left: p.x, top: p.y, width: CHIP, height: CHIP }}
            >
              {l.idx + 1}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/** Numbered lesion list with detection confidence. Hover or click mirrors the boxes on the photo. */
export function DetectionList({
  lesions, activeIdx, selectedIdx, onHover, onSelect,
}: {
  lesions: DetectedLesion[];
  activeIdx: number | null;
  selectedIdx: number | null;
  onHover: (idx: number | null) => void;
  onSelect: (idx: number) => void;
}) {
  const listRef = useRef<HTMLUListElement>(null);

  // Keep a lesion picked on the photo visible inside the scrollable list (scrolls the list only, not the page).
  useEffect(() => {
    const list = listRef.current;
    const item = selectedIdx == null ? null : list?.querySelector<HTMLElement>(`[data-idx="${selectedIdx}"]`);
    if (!list || !item) return;
    if (item.offsetTop < list.scrollTop) list.scrollTop = item.offsetTop;
    else if (item.offsetTop + item.offsetHeight > list.scrollTop + list.clientHeight) {
      list.scrollTop = item.offsetTop + item.offsetHeight - list.clientHeight;
    }
  }, [selectedIdx]);

  const R = COPY.detectResult;
  // Highest confidence first; each row keeps the number printed on its box in the photo.
  const rows = useMemo(() => sortByConfidence(lesions), [lesions]);

  return (
    <ul ref={listRef} className="relative grid gap-x-2 gap-y-0.5 sm:grid-cols-2 lg:max-h-96 lg:grid-cols-3 lg:overflow-y-auto">
      {rows.map((l) => {
        const active = activeIdx === l.idx;
        const pct = Math.round(l.det_confidence * 100);
        const low = isLowConfidence(l);
        return (
          <li key={l.idx} data-idx={l.idx}>
            <button
              type="button"
              aria-pressed={selectedIdx === l.idx}
              aria-label={`${R.lesionName} ${l.idx + 1}, ${R.confidenceLabel} ${pct}%${low ? `, ${R.lowConfidence}` : ''}`}
              onMouseEnter={() => onHover(l.idx)}
              onMouseLeave={() => onHover(null)}
              onFocus={() => onHover(l.idx)}
              onBlur={() => onHover(null)}
              onClick={() => onSelect(l.idx)}
              className={`flex w-full items-center gap-2.5 rounded-control px-2 py-1.5 text-left text-body-md transition-colors ${active ? 'bg-primary-50' : 'hover:bg-tint'}`}
            >
              <span className={`tnum flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[12px] font-semibold ${active ? 'bg-primary-600 text-white' : 'bg-primary-100 text-primary-800'}`}>
                {l.idx + 1}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block h-1 overflow-hidden rounded-full bg-primary-100" aria-hidden>
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
  );
}
