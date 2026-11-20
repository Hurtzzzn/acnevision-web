import { useEffect } from 'react';

interface Saved {
  scrollY: number;
  path: string;
  /** True when the body was pinned with position: fixed (touch devices), which needs the scroll offset restored afterwards. */
  pinned: boolean;
  html: { overflow: string; scrollbarGutter: string };
  body: { position: string; top: string; left: string; right: string; width: string; paddingRight: string };
}

let locks = 0;
let saved: Saved | null = null;

/**
 * Touch devices keep the body pinned with position: fixed, because iOS Safari does not stop touch scrolling with
 * `overflow: hidden` alone. Everything else (desktop, with a mouse) locks with `overflow: hidden` on the root.
 */
function pinsBody(): boolean {
  if (typeof window.matchMedia === 'function' && window.matchMedia('(pointer: coarse)').matches) return true;
  if (typeof navigator === 'undefined') return false;
  return /iP(hone|ad|od)/.test(navigator.userAgent ?? '') || (navigator.platform === 'MacIntel' && (navigator.maxTouchPoints ?? 0) > 1);
}

/** Freezes the page behind an overlay. Counted, so stacked overlays release the lock only when the last one closes. */
export function lockScroll(): () => void {
  if (typeof document === 'undefined') return () => {};
  if (locks === 0) {
    const html = document.documentElement;
    const body = document.body;
    const scrollY = window.scrollY;
    // Width of a classic scrollbar (0 for overlay scrollbars, as on phones). Measured before anything changes.
    const gutter = window.innerWidth - html.clientWidth;
    const pinned = pinsBody();
    saved = {
      scrollY, pinned, path: window.location?.pathname ?? '',
      html: { overflow: html.style.overflow, scrollbarGutter: html.style.scrollbarGutter },
      body: { position: body.style.position, top: body.style.top, left: body.style.left, right: body.style.right, width: body.style.width, paddingRight: body.style.paddingRight },
    };
    html.style.overflow = 'hidden';
    // The base styles reserve the scrollbar's width with `scrollbar-gutter: stable`. Once the scrollbar is gone that space would stay
    // behind as an empty strip at the edge, which a fixed overlay cannot cover (it ends where the gutter starts). So release it, and
    // let padding stand in for the scrollbar so the page does not shift sideways.
    html.style.scrollbarGutter = 'auto';
    if (gutter > 0) body.style.paddingRight = `${(parseFloat(getComputedStyle(body).paddingRight) || 0) + gutter}px`;
    if (pinned) {
      body.style.position = 'fixed';
      body.style.top = `-${scrollY}px`;
      body.style.left = '0';
      body.style.right = '0';
      body.style.width = '100%';
    }
  }
  locks += 1;

  let released = false;
  return () => {
    if (released) return;
    released = true;
    locks -= 1;
    if (locks > 0 || !saved) return;
    const html = document.documentElement;
    const body = document.body;
    const s = saved;
    saved = null;
    html.style.overflow = s.html.overflow;
    html.style.scrollbarGutter = s.html.scrollbarGutter;
    body.style.position = s.body.position;
    body.style.top = s.body.top;
    body.style.left = s.body.left;
    body.style.right = s.body.right;
    body.style.width = s.body.width;
    body.style.paddingRight = s.body.paddingRight;
    // Only a pinned body lost its scroll offset. Instant jump: the root's scroll-behavior must not animate the restore.
    // A route change while locked (drawer link) lands on a new page, which starts at the top.
    if (!s.pinned) return;
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
