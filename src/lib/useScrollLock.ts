import { useEffect } from 'react';

interface SavedBody { scrollY: number; path: string; position: string; top: string; left: string; right: string; width: string; paddingRight: string }

let locks = 0;
let saved: SavedBody | null = null;

/** Freezes the page behind an overlay. Counted, so stacked overlays release the lock only when the last one closes. */
export function lockScroll(): () => void {
  if (typeof document === 'undefined') return () => {};
  if (locks === 0) {
    const body = document.body;
    const scrollY = window.scrollY;
    // Measured before fixing: fixed positioning drops a classic scrollbar, so its width is added back as padding (no layout shift).
    const gutter = window.innerWidth - document.documentElement.clientWidth;
    const hasStableGutter = getComputedStyle(document.documentElement).scrollbarGutter.includes('stable');
    saved = { scrollY, path: window.location?.pathname ?? '', position: body.style.position, top: body.style.top, left: body.style.left, right: body.style.right, width: body.style.width, paddingRight: body.style.paddingRight };
    // position: fixed is the only reliable lock on iOS Safari, where overflow: hidden on body does not stop touch scrolling.
    body.style.position = 'fixed';
    body.style.top = `-${scrollY}px`;
    body.style.left = '0';
    body.style.right = '0';
    body.style.width = '100%';
    if (gutter > 0 && !hasStableGutter) body.style.paddingRight = `${gutter}px`;
  }
  locks += 1;

  let released = false;
  return () => {
    if (released) return;
    released = true;
    locks -= 1;
    if (locks > 0 || !saved) return;
    const body = document.body;
    const s = saved;
    saved = null;
    body.style.position = s.position;
    body.style.top = s.top;
    body.style.left = s.left;
    body.style.right = s.right;
    body.style.width = s.width;
    body.style.paddingRight = s.paddingRight;
    // Instant jump: the root's scroll-behavior must not animate the restore.
    // A route change while locked (drawer link) lands on a new page, which starts at the top.
    const moved = (window.location?.pathname ?? '') !== s.path;
    window.scrollTo({ top: moved ? 0 : s.scrollY, left: 0, behavior: 'instant' as ScrollBehavior });
  };
}

export function useScrollLock(active = true) {
  useEffect(() => {
    if (!active) return;
    return lockScroll();
  }, [active]);
}
