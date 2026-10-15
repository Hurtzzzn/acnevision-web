import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { lockScroll } from './useScrollLock';

// No DOM library is installed, so the few globals the lock touches are stubbed.
describe('lockScroll', () => {
  let style: Record<string, string>;
  let scrollTo: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    style = {};
    scrollTo = vi.fn();
    vi.stubGlobal('document', { body: { style }, documentElement: { clientWidth: 1000 } });
    vi.stubGlobal('getComputedStyle', () => ({ scrollbarGutter: 'stable' }));
    vi.stubGlobal('window', { scrollY: 240, innerWidth: 1015, scrollTo });
  });
  afterEach(() => vi.unstubAllGlobals());

  it('fixes the body at the current offset and restores it on release', () => {
    const release = lockScroll();
    expect(style.position).toBe('fixed');
    expect(style.top).toBe('-240px');
    release();
    expect(style.position).toBeUndefined();
    expect(scrollTo).toHaveBeenCalledWith(expect.objectContaining({ top: 240 }));
  });

  it('keeps the lock until the last stacked overlay closes', () => {
    const a = lockScroll();
    const b = lockScroll();
    a();
    expect(style.position).toBe('fixed');
    expect(scrollTo).not.toHaveBeenCalled();
    b();
    expect(style.position).toBeUndefined();
    expect(scrollTo).toHaveBeenCalledTimes(1);
  });

  it('ignores a repeated release of the same lock', () => {
    const a = lockScroll();
    const b = lockScroll();
    a();
    a();
    expect(style.position).toBe('fixed');
    b();
    expect(style.position).toBeUndefined();
  });

  it('restores inline styles that existed before the lock', () => {
    style.paddingRight = '4px';
    const release = lockScroll();
    release();
    expect(style.paddingRight).toBe('4px');
  });
});
