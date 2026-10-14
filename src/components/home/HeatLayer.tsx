import { useEffect, useRef, type CSSProperties } from 'react';
import { heatColor, heatField } from '../../lib/heatmap';

/** Internal resolution of the heat layer; the browser scales it up smoothly, which keeps the gaussians soft. */
const HEAT_W = 230;
const HEAT_H = Math.round((HEAT_W * 1158) / 1145);

/**
 * Paints the sample Grad-CAM style heat map once, from the sample lesions (see `heatField`), the first time it scrolls into
 * view (the field is a few hundred thousand exp() calls, so it is not computed while off screen). It covers the whole sample
 * photo, so place it with the same position and width as the photo itself. Decorative.
 */
export function HeatLayer({ className = '', style }: { className?: string; style?: CSSProperties }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    const paint = () => {
      const field = heatField(HEAT_W, HEAT_H);
      const image = ctx.createImageData(HEAT_W, HEAT_H);
      field.forEach((t, k) => {
        const [r, g, b, a] = heatColor(t);
        image.data.set([r, g, b, Math.round(a * 255)], k * 4);
      });
      ctx.putImageData(image, 0, 0);
    };
    if (typeof IntersectionObserver === 'undefined') { paint(); return; }
    const io = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) { paint(); io.disconnect(); }
    }, { rootMargin: '200px' });
    io.observe(canvas);
    return () => io.disconnect();
  }, []);
  return <canvas ref={ref} width={HEAT_W} height={HEAT_H} aria-hidden className={`absolute max-w-none ${className}`} style={style} />;
}
