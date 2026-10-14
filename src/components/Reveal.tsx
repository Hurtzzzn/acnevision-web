import { createElement, useEffect, useRef, useState, type HTMLAttributes, type ReactNode, type TransitionEvent } from 'react';

interface RevealProps extends HTMLAttributes<HTMLElement> {
  as?: 'div' | 'section' | 'li';
  /** Stagger offset in ms; keep to 40-80ms between siblings. */
  delay?: number;
  children: ReactNode;
}

/**
 * Fades and lifts its content once when it first scrolls into view. Opacity and transform only,
 * so the element always occupies its final space (no layout shift). See `.reveal` in index.css.
 */
export function Reveal({ as = 'div', delay = 0, className = '', style, children, onTransitionEnd, ...rest }: RevealProps) {
  const ref = useRef<HTMLElement>(null);
  const [shown, setShown] = useState(false);
  // Once the reveal finished, drop the stagger delay so later hover transitions on the same element are not held back.
  const [settled, setSettled] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (typeof IntersectionObserver === 'undefined') { setShown(true); return; }
    const io = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) { setShown(true); io.disconnect(); }
    }, { threshold: 0.12 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return createElement(
    as,
    {
      ref,
      className: `reveal ${className}`.trim(),
      'data-shown': shown ? '' : undefined,
      style: delay && !settled ? { ...style, transitionDelay: `${delay}ms` } : style,
      onTransitionEnd: (e: TransitionEvent<HTMLElement>) => {
        if (shown && e.target === e.currentTarget && e.propertyName === 'opacity') setSettled(true);
        onTransitionEnd?.(e);
      },
      ...rest,
    },
    children,
  );
}
