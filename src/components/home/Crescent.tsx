import { useId } from 'react';

/**
 * The blue crescent that echoes the logo's curve. Colors come from the Tailwind primary tokens (400 to 600 gradient, 300 ring),
 * ids are unique per instance so it can appear more than once on a page. Decorative.
 */
export function Crescent({ className = 'enter-hero-img absolute -inset-[4%] h-[108%] w-[108%]' }: { className?: string }) {
  const uid = useId().replace(/:/g, '');
  const gradient = `crescent-fill-${uid}`;
  const cut = `crescent-cut-${uid}`;
  return (
    <svg viewBox="0 0 400 400" className={className} aria-hidden>
      <defs>
        <linearGradient id={gradient} x1="0.1" y1="0.1" x2="0.9" y2="0.9">
          <stop offset="0" className="[stop-color:theme(colors.primary.400)]" />
          <stop offset="1" className="[stop-color:theme(colors.primary.600)]" />
        </linearGradient>
        <mask id={cut}>
          <rect width="400" height="400" fill="#fff" />
          <circle cx="246" cy="204" r="146" fill="#000" />
        </mask>
      </defs>
      <circle cx="190" cy="200" r="172" fill={`url(#${gradient})`} mask={`url(#${cut})`} opacity="0.9" />
      <circle cx="200" cy="200" r="190" fill="none" className="stroke-primary-300" strokeWidth="1.5" opacity="0.7" />
    </svg>
  );
}
