import { describe, expect, it } from 'vitest';
import type { AnalyzeResponse, RecommendationResponse } from '@acnevision/shared';
import { clearCache, isResultAvailable, patchCache, readCache, writeCache, type CachedResult } from './resultCache';

function fakeStore(opts: { failWrites?: boolean } = {}) {
  const m = new Map<string, string>();
  return {
    getItem: (k: string) => m.get(k) ?? null,
    setItem: (k: string, v: string) => { if (opts.failWrites) throw new Error('QuotaExceededError'); m.set(k, v); },
    removeItem: (k: string) => { m.delete(k); },
    raw: m,
  };
}

const analysis = { analysis_id: 'a-1', summary: { total_lesions: 3 }, lesions: [] } as unknown as AnalyzeResponse;
const entry = (over: Partial<CachedResult> = {}): CachedResult => ({
  ownerId: 'u-1', analysis, image: 'data:image/jpeg;base64,AAAA', recommendation: null, savedScanId: null, ...over,
});

describe('result cache (sessionStorage)', () => {
  it('round-trips a result for a signed-in user', () => {
    const s = fakeStore();
    expect(writeCache(entry(), s)).toBe(true);
    expect(readCache(s)).toEqual(entry());
  });

  it('never stores without an owner (guests have no owner)', () => {
    const s = fakeStore();
    expect(writeCache(entry({ ownerId: '' }), s)).toBe(false);
    expect(s.raw.size).toBe(0);
  });

  it('treats corrupted or foreign data as empty', () => {
    const s = fakeStore();
    s.setItem('acv.analysis-result', '{not json');
    expect(readCache(s)).toBeNull();
    s.setItem('acv.analysis-result', JSON.stringify({ ownerId: 'u-1' }));
    expect(readCache(s)).toBeNull();
  });

  it('reports a refused write (quota) instead of throwing', () => {
    expect(writeCache(entry(), fakeStore({ failWrites: true }))).toBe(false);
  });

  it('works without any storage at all', () => {
    expect(readCache(null)).toBeNull();
    expect(writeCache(entry(), null)).toBe(false);
    expect(() => clearCache(null)).not.toThrow();
  });

  it('patches the recommendation and saved id without touching the rest', () => {
    const s = fakeStore();
    writeCache(entry(), s);
    const rec = { recommendation: 'Cuci wajah', is_fallback: false, conversation_id: 'c-1', can_follow_up: true, disclaimer: '' } as RecommendationResponse;
    patchCache({ recommendation: rec }, s);
    patchCache({ savedScanId: 'scan-9' }, s);
    const cur = readCache(s)!;
    expect(cur.recommendation).toEqual(rec);
    expect(cur.savedScanId).toBe('scan-9');
    expect(cur.image).toBe(entry().image);
  });

  it('does nothing when patching an empty cache', () => {
    const s = fakeStore();
    patchCache({ savedScanId: 'x' }, s);
    expect(s.raw.size).toBe(0);
  });

  it('clears everything (logout)', () => {
    const s = fakeStore();
    writeCache(entry(), s);
    clearCache(s);
    expect(readCache(s)).toBeNull();
  });
});

describe('isResultAvailable', () => {
  const state = { analysis, imageUrl: 'data:image/jpeg;base64,AAAA', ownerId: 'u-1' };

  it('shows the result only for its owner and its own id', () => {
    expect(isResultAvailable(state, 'u-1', 'a-1')).toBe(true);
    expect(isResultAvailable(state, 'u-2', 'a-1')).toBe(false);
    expect(isResultAvailable(state, 'u-1', 'a-2')).toBe(false);
  });

  it('is unavailable when anything is missing', () => {
    expect(isResultAvailable({ ...state, analysis: null }, 'u-1', 'a-1')).toBe(false);
    expect(isResultAvailable({ ...state, imageUrl: null }, 'u-1', 'a-1')).toBe(false);
    expect(isResultAvailable({ ...state, ownerId: null }, 'u-1', 'a-1')).toBe(false);
    expect(isResultAvailable(state, undefined, 'a-1')).toBe(false);
  });
});
