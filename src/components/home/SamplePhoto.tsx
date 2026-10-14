import type { CSSProperties, ReactNode } from 'react';
import { COPY } from '@acnevision/shared';
import { DEMO_BOX_SIZE, DEMO_LESIONS, lesionsInZoom, zoomPoint, type LabelSide, type Zoom } from '../../lib/demoLesions';
import { HeatLayer } from './HeatLayer';
import hero640 from '../../assets/images/heroine-640.webp';
import hero960 from '../../assets/images/heroine-960.webp';

/** Width over height of the source photo, used to size crops. */
const PHOTO_RATIO = 1158 / 1145;

/** The sample photo, square, with soft side and bottom edges. Overlays go in as children and share the photo's coordinates. */
export function SamplePhoto({ alt = '', className = '', imgClassName = '', imgStyle, children }: {
  alt?: string;
  className?: string;
  imgClassName?: string;
  imgStyle?: CSSProperties;
  children?: ReactNode;
}) {
  return (
    <div className={`relative aspect-[1145/1158] ${className}`}>
      <img
        src={hero640}
        srcSet={`${hero640} 640w, ${hero960} 960w`}
        sizes="(min-width: 768px) 28rem, 90vw"
        alt={alt}
        width={640}
        height={647}
        loading="eager"
        decoding="async"
        className={`photo-fade absolute inset-0 h-full w-full ${imgClassName}`}
        style={imgStyle}
      />
      {children}
    </div>
  );
}

const LABEL_POSITION: Record<LabelSide, string> = {
  'top-left': '-left-1 -top-4',
  top: 'left-1/2 -top-[1.1rem] -translate-x-1/2',
  left: 'right-full top-1/2 mr-0.5 -translate-y-1/2',
  right: 'left-full top-1/2 ml-0.5 -translate-y-1/2',
  'bottom-left': 'right-1/2 top-full mt-0.5',
};

function BoxNumber({ n, side }: { n: number; side: LabelSide }) {
  return (
    <span className={`absolute rounded-[4px] bg-primary-600 px-1 text-xs font-semibold leading-4 text-white ${LABEL_POSITION[side]}`}>{n}</span>
  );
}

/** Thin numbered boxes for every sample lesion, over the full portrait (`SamplePhoto`). Decorative. */
export function SampleBoxes({ animated = false, baseDelay = 0 }: { animated?: boolean; baseDelay?: number }) {
  return (
    <div className="absolute inset-0" aria-hidden>
      {DEMO_LESIONS.map((b, i) => (
        <span
          key={b.n}
          data-lesion-box
          className={`absolute block aspect-square -translate-x-1/2 -translate-y-1/2 rounded-[3px] border border-primary-600 bg-primary-600/10 ${animated ? 'enter-fade' : ''}`}
          style={{ left: `${b.x * 100}%`, top: `${b.y * 100}%`, width: `${DEMO_BOX_SIZE * 100}%`, ...(animated ? { animationDelay: `${baseDelay + i * 90}ms` } : null) }}
        >
          <BoxNumber n={b.n} side={b.label} />
        </span>
      ))}
    </div>
  );
}

/** A crop of the sample photo (see `Zoom`). Used for the close-up and preview illustrations so the full portrait is not repeated. */
export function ZoomPhoto({ zoom, heat = false, className = '', children }: { zoom: Zoom; heat?: boolean; className?: string; children?: ReactNode }) {
  const left = 50 - zoom.cx * zoom.scale * 100;
  const top = 50 - zoom.cy * zoom.scale * zoom.aspect * PHOTO_RATIO * 100;
  return (
    <div className={`relative overflow-hidden ${className}`} style={{ aspectRatio: String(zoom.aspect) }}>
      <img
        src={hero960}
        alt=""
        width={960}
        height={971}
        loading="lazy"
        decoding="async"
        className="absolute max-w-none"
        style={{ left: `${left}%`, top: `${top}%`, width: `${zoom.scale * 100}%` }}
      />
      {/* The heat layer covers the whole photo, so it gets the photo's exact position and width */}
      {heat && <HeatLayer style={{ left: `${left}%`, top: `${top}%`, width: `${zoom.scale * 100}%`, height: 'auto' }} />}
      {children}
    </div>
  );
}

/** The sample lesions that fall inside a `ZoomPhoto`, drawn as boxes at the same size relative to the photo as in the hero. */
/** `uncertain` is the number of one lesion to draw with a dashed outline, the "AI is less sure" style of the real result. */
export function ZoomBoxes({ zoom, uncertain }: { zoom: Zoom; uncertain?: number }) {
  return (
    <div className="absolute inset-0" aria-hidden>
      {lesionsInZoom(zoom).map((b) => {
        const p = zoomPoint(zoom, b.x, b.y);
        return (
          <span
            key={b.n}
            data-lesion-box
            className="absolute block aspect-square -translate-x-1/2 -translate-y-1/2 rounded-[4px] border-[1.5px] border-primary-600 bg-primary-600/10"
            style={{ left: `${p.x}%`, top: `${p.y}%`, width: `${DEMO_BOX_SIZE * zoom.scale * 100}%`, ...(b.n === uncertain ? { borderStyle: 'dashed' } : null) }}
          >
            <BoxNumber n={b.n} side={b.label} />
          </span>
        );
      })}
    </div>
  );
}

export const SAMPLE_PHOTO_ALT = COPY.home.heroAlt;
