import type { CSSProperties, ReactNode } from 'react';
import { COPY } from '@acnevision/shared';
import hero640 from '../../assets/images/heroine-640.webp';
import hero960 from '../../assets/images/heroine-960.webp';

/** Width over height of the source photo, used to map photo coordinates into a cropped frame. */
const PHOTO_RATIO = 1158 / 1145;

/**
 * Illustration only: hand-placed boxes on the cheek of the sample photo, as percentages of the photo so they stay put at any
 * size. They are not real detections. Positions follow the visible spots in `heroine.png`.
 */
export const SAMPLE_BOXES = [
  { n: 1, x: 57.5, y: 43 },
  { n: 2, x: 63, y: 48.5 },
  { n: 3, x: 58, y: 54.5 },
] as const;

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

/** Thin numbered detection boxes over `SamplePhoto`. Decorative. */
export function SampleBoxes({ animated = false, baseDelay = 0 }: { animated?: boolean; baseDelay?: number }) {
  return (
    <div className="absolute inset-0" aria-hidden>
      {SAMPLE_BOXES.map((b, i) => (
        <span
          key={b.n}
          className={`absolute block aspect-square w-[7%] -translate-x-1/2 -translate-y-1/2 rounded-[3px] border border-primary-600 bg-primary-600/10 ${animated ? 'enter-fade' : ''}`}
          style={{ left: `${b.x}%`, top: `${b.y}%`, ...(animated ? { animationDelay: `${baseDelay + i * 120}ms` } : null) }}
        >
          <BoxNumber n={b.n} />
        </span>
      ))}
    </div>
  );
}

function BoxNumber({ n }: { n: number }) {
  return (
    <span className="absolute -left-1 -top-4 rounded-[4px] bg-primary-600 px-1 text-xs font-semibold leading-4 text-white">{n}</span>
  );
}

/**
 * A crop of the sample photo: `scale` times larger, with photo point (cx, cy) in percent at the center of the frame.
 * `aspect` is the frame's width over height. Used for the close-up and Grad-CAM illustrations so the full portrait only
 * appears in the hero.
 */
export interface Zoom { scale: number; cx: number; cy: number; aspect: number }

/** Where a photo point (percent) lands inside a `ZoomPhoto` frame (percent of the frame). */
export function zoomPoint(z: Zoom, px: number, py: number) {
  return { x: 50 + (px - z.cx) * z.scale, y: 50 + (py - z.cy) * z.scale * z.aspect * PHOTO_RATIO };
}

export function ZoomPhoto({ zoom, className = '', children }: { zoom: Zoom; className?: string; children?: ReactNode }) {
  const left = 50 - zoom.cx * zoom.scale;
  const top = 50 - zoom.cy * zoom.scale * zoom.aspect * PHOTO_RATIO;
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
      {children}
    </div>
  );
}

/** The same three example boxes, placed inside a `ZoomPhoto`. `size` is the box width in percent of the frame. */
export function ZoomBoxes({ zoom, size }: { zoom: Zoom; size: number }) {
  return (
    <div className="absolute inset-0" aria-hidden>
      {SAMPLE_BOXES.map((b) => {
        const p = zoomPoint(zoom, b.x, b.y);
        return (
          <span
            key={b.n}
            className="absolute block aspect-square -translate-x-1/2 -translate-y-1/2 rounded-[4px] border-[1.5px] border-primary-600 bg-primary-600/10"
            style={{ left: `${p.x}%`, top: `${p.y}%`, width: `${size}%` }}
          >
            <BoxNumber n={b.n} />
          </span>
        );
      })}
    </div>
  );
}

/** Soft Grad-CAM style heat (same blue, yellow, red ramp as the heat map key) on the cheek of a `ZoomPhoto`. Decorative sample, not a result. */
export function ZoomHeat({ zoom }: { zoom: Zoom }) {
  const hot = zoomPoint(zoom, 60, 49);
  const warm = zoomPoint(zoom, 52, 30);
  return (
    <div
      className="absolute inset-0 mix-blend-multiply"
      style={{
        background: [
          `radial-gradient(circle at ${hot.x}% ${hot.y}%, rgba(220,38,38,0.6) 0, rgba(250,204,21,0.45) 12%, rgba(37,99,235,0.2) 26%, transparent 38%)`,
          `radial-gradient(circle at ${warm.x}% ${warm.y}%, rgba(250,204,21,0.4) 0, rgba(37,99,235,0.16) 14%, transparent 26%)`,
        ].join(', '),
      }}
      aria-hidden
    />
  );
}

export const SAMPLE_PHOTO_ALT = COPY.home.heroAlt;
