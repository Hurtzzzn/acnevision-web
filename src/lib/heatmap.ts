import { DEMO_LESIONS } from './demoLesions';

/** Height over width of the original photo, so distances are measured in the same units on both axes. */
const PHOTO_RATIO = 1158 / 1145;

/** Spread of the sharp peak around each lesion, and of the wide halo that merges neighbours, as fractions of the photo width. */
const PEAK_SIGMA = 0.045;
const HALO_SIGMA = 0.11;
const HALO_WEIGHT = 0.3;

/**
 * Sample Grad-CAM style intensity (0 to 1) on a `width` x `height` grid covering the whole photo. Built only from
 * `DEMO_LESIONS`: one gaussian per lesion plus a wider halo, so the close lesions on the cheek merge into one warm cluster
 * and the isolated one stays weaker. Illustration only, not the output of any model.
 */
export function heatField(width: number, height: number): Float32Array {
  const out = new Float32Array(width * height);
  let max = 0;
  for (let j = 0; j < height; j++) {
    const y = (j + 0.5) / height;
    for (let i = 0; i < width; i++) {
      const x = (i + 0.5) / width;
      let v = 0;
      for (const l of DEMO_LESIONS) {
        const dx = x - l.x;
        const dy = (y - l.y) * PHOTO_RATIO;
        const d2 = dx * dx + dy * dy;
        v += Math.exp(-d2 / (2 * PEAK_SIGMA ** 2)) + HALO_WEIGHT * Math.exp(-d2 / (2 * HALO_SIGMA ** 2));
      }
      out[j * width + i] = v;
      if (v > max) max = v;
    }
  }
  // Normalize, then compress (power < 1) so an isolated lesion stays visible next to the strong cheek cluster
  if (max > 0) for (let k = 0; k < out.length; k++) out[k] = (out[k] / max) ** 0.7;
  return out;
}

const BLUE = [37, 99, 235] as const;
const YELLOW = [250, 204, 21] as const;
const RED = [220, 38, 38] as const;
const MAX_ALPHA = 0.55;

const mix = (a: readonly number[], b: readonly number[], t: number) => a.map((v, i) => v + (b[i] - v) * t);
const smoothstep = (lo: number, hi: number, t: number) => {
  const k = Math.min(1, Math.max(0, (t - lo) / (hi - lo)));
  return k * k * (3 - 2 * k);
};

/** Color ramp of the heat map key (blue, yellow, red). Low intensity fades out so only the influential area is tinted. */
export function heatColor(t: number): [number, number, number, number] {
  const rgb = t < 0.5 ? mix(BLUE, YELLOW, t / 0.5) : mix(YELLOW, RED, (t - 0.5) / 0.5);
  return [Math.round(rgb[0]), Math.round(rgb[1]), Math.round(rgb[2]), MAX_ALPHA * smoothstep(0.1, 0.45, t)];
}
