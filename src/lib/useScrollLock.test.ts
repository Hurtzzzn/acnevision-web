import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { lockScroll as rawLockScroll } from './useScrollLock';

// No DOM library is installed, so the few globals the lock touches are stubbed.
describe('lockScroll', () => {
  let body: Record<string, string>;
  let html: Record<string, string>;
  let scrollTo: ReturnType<typeof vi.fn>;
  let pathname: string;
  // The lock counts at module level, so every lock a test takes is released afterwards, or it would leak into the next test.
  const taken: Array<() => void> = [];
  const lockScroll = () => { const release = rawLockScroll(); taken.push(release); return release; };

  /** Sets up the page: a classic 15px scrollbar by default, a mouse, and a desktop browser. */
  function setup({ coarse = false, userAgent = 'Mozilla/5.0 (Windows NT 10.0)', platform = 'Win32', touchPoints = 0, scrollbar = 15, bodyPadding = '0px' } = {}) {
    // Like a real CSSStyleDeclaration: every property reads '' until something sets it.
    body = { position: '', top: '', left: '', right: '', width: '', paddingRight: '' };
    html = { overflow: '', scrollbarGutter: '' };
    scrollTo = vi.fn();
    pathname = '/admin/users';
    vi.stubGlobal('document', { body: { style: body }, documentElement: { clientWidth: 1000, style: html } });
    vi.stubGlobal('getComputedStyle', () => ({ paddingRight: bodyPadding }));
    vi.stubGlobal('navigator', { userAgent, platform, maxTouchPoints: touchPoints });
    vi.stubGlobal('window', {
      scrollY: 240, innerWidth: 1000 + scrollbar, scrollTo,
      matchMedia: (q: string) => ({ matches: coarse && q === '(pointer: coarse)' }),
      location: { get pathname() { return pathname; } },
    });
  }

  beforeEach(() => setup());
  afterEach(() => { taken.splice(0).forEach((release) => release()); vi.unstubAllGlobals(); });

  describe('on desktop (mouse)', () => {
    it('hides overflow on the root, and does not pin the body or move the page', () => {
      const release = lockScroll();
      expect(html.overflow).toBe('hidden');
      expect(body.position).toBe('');
      expect(body.top).toBe('');
      release();
      expect(html.overflow).toBe('');
      expect(scrollTo).not.toHaveBeenCalled();
    });

    it('releases the reserved scrollbar gutter, so no empty strip is left for a fixed overlay to stop short of', () => {
      const release = lockScroll();
      expect(html.scrollbarGutter).toBe('auto');
      release();
      expect(html.scrollbarGutter).toBe('');
    });

    it('stands in for the scrollbar with padding, so the page does not shift sideways', () => {
      const release = lockScroll();
      expect(body.paddingRight).toBe('15px');
      release();
      expect(body.paddingRight).toBe('');
    });

    it('adds to padding the body already has', () => {
      setup({ bodyPadding: '8px' });
      lockScroll();
      expect(body.paddingRight).toBe('23px');
    });

    it('adds no padding when there is no classic scrollbar (overlay scrollbars)', () => {
      setup({ scrollbar: 0 });
      lockScroll();
      expect(body.paddingRight).toBe('');
    });
  });

  describe('on touch devices and iOS', () => {
    it('pins the body at the current offset, and restores that offset on release', () => {
      setup({ coarse: true, scrollbar: 0 });
      const release = lockScroll();
      expect(body.position).toBe('fixed');
      expect(body.top).toBe('-240px');
      expect(html.overflow).toBe('hidden');
      release();
      expect(body.position).toBe('');
      expect(scrollTo).toHaveBeenCalledWith(expect.objectContaining({ top: 240 }));
    });

    it('starts the next page at the top when the route changed while locked', () => {
      setup({ coarse: true, scrollbar: 0 });
      const release = lockScroll();
      pathname = '/history';
      release();
      expect(scrollTo).toHaveBeenCalledWith(expect.objectContaining({ top: 0 }));
    });

    it('pins an iPhone even if it does not report a coarse pointer', () => {
      setup({ userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)', scrollbar: 0 });
      lockScroll();
      expect(body.position).toBe('fixed');
    });

    it('pins an iPad that presents itself as a Mac', () => {
      setup({ platform: 'MacIntel', touchPoints: 5, scrollbar: 0 });
      lockScroll();
      expect(body.position).toBe('fixed');
    });

    it('does not pin a real Mac without touch', () => {
      setup({ platform: 'MacIntel', touchPoints: 0 });
      lockScroll();
      expect(body.position).toBe('');
    });
  });

  it('keeps the lock until the last stacked overlay closes', () => {
    const a = lockScroll();
    const b = lockScroll();
    a();
    expect(html.overflow).toBe('hidden');
    b();
    expect(html.overflow).toBe('');
    expect(html.scrollbarGutter).toBe('');
  });

  it('ignores a repeated release of the same lock', () => {
    const a = lockScroll();
    const b = lockScroll();
    a();
    a();
    expect(html.overflow).toBe('hidden');
    b();
    expect(html.overflow).toBe('');
  });

  it('restores inline styles that existed before the lock', () => {
    body.paddingRight = '4px';
    html.overflow = 'scroll';
    html.scrollbarGutter = 'stable both-edges';
    const release = lockScroll();
    release();
    expect(body.paddingRight).toBe('4px');
    expect(html.overflow).toBe('scroll');
    expect(html.scrollbarGutter).toBe('stable both-edges');
  });
});
