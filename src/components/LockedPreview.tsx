import { Lock } from 'lucide-react';
import { ACNE_CLASSES, COPY } from '@acnevision/shared';

/**
 * Static teaser of what opens after login. Everything here is generic: the heat map is a hand-drawn SVG (never
 * derived from the guest's photo) and the five type names are the fixed class list, not results for this photo.
 * Decorative only, so it is hidden from assistive tech; the unlock list next to it carries the same information.
 */
export function LockedPreview() {
  return (
    <div className="rounded-card border border-primary-100 bg-white/60 p-4" aria-hidden>
      <p className="text-label-sm text-ink-500">{COPY.upgrade.previewLabel}</p>

      <div className="relative mt-3 overflow-hidden rounded-btn bg-tint">
        <svg viewBox="0 0 240 150" className="block w-full">
          <defs>
            <filter id="locked-heat-blur" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="7" />
            </filter>
          </defs>
          <ellipse cx="120" cy="76" rx="48" ry="62" fill="#E2E8F0" stroke="#CBD5E1" strokeDasharray="4 4" />
          <g filter="url(#locked-heat-blur)" opacity="0.85">
            <circle cx="100" cy="66" r="24" fill="#EF4444" />
            <circle cx="140" cy="86" r="20" fill="#F97316" />
            <circle cx="116" cy="108" r="18" fill="#FACC15" />
          </g>
        </svg>
        <div className="absolute inset-0 flex items-center justify-center bg-white/35 backdrop-blur-[2px]">
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-ink-500 shadow-card">
            <Lock className="h-5 w-5" />
          </span>
        </div>
        <span className="absolute left-2 top-2 rounded-full bg-white/90 px-2 py-0.5 text-label-sm text-ink-600">
          {COPY.upgrade.gradcamLabel}
        </span>
      </div>

      <ul className="mt-3 flex flex-wrap gap-1.5">
        {ACNE_CLASSES.map((c) => (
          <li key={c} className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-label-sm text-ink-500">
            <Lock className="h-3 w-3" /> {c}
          </li>
        ))}
      </ul>

      <p className="mt-3 text-body-sm text-ink-500">{COPY.upgrade.previewCaption}</p>
    </div>
  );
}
