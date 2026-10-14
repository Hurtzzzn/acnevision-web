import type { AnalyzeResponse, RecommendationResponse } from '@acnevision/shared';

/**
 * Keeps the latest full analysis of a signed-in user for as long as the browser tab stays open (sessionStorage), so a
 * refresh still shows the result. Guest detection is never written here: guest photos are not stored at all.
 */
const KEY = 'acv.analysis-result';
/** Longest side of the stored photo. Boxes are normalized, so a smaller copy still lines up. Keeps the entry far below the ~5 MB quota. */
const MAX_SIDE = 1280;

export interface CachedResult {
  ownerId: string;
  analysis: AnalyzeResponse;
  /** Data URL (an object URL would not survive a refresh). */
  image: string;
  recommendation: RecommendationResponse | null;
  savedScanId: string | null;
}

type Store = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

function defaultStore(): Store | null {
  try { return typeof sessionStorage === 'undefined' ? null : sessionStorage; } catch { return null; }
}

function isCachedResult(v: unknown): v is CachedResult {
  const r = v as CachedResult | null;
  return !!r && typeof r.ownerId === 'string' && typeof r.image === 'string' && !!r.analysis && typeof r.analysis.analysis_id === 'string';
}

export function readCache(store: Store | null = defaultStore()): CachedResult | null {
  try {
    const raw = store?.getItem(KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    return isCachedResult(parsed) ? parsed : null;
  } catch { return null; }
}

/** Returns false when the browser refused (quota, private mode); the result then simply is not kept across a refresh. */
export function writeCache(result: CachedResult, store: Store | null = defaultStore()): boolean {
  try {
    if (!store || !result.ownerId) return false;
    store.setItem(KEY, JSON.stringify(result));
    return true;
  } catch { return false; }
}

export function patchCache(patch: Partial<Pick<CachedResult, 'recommendation' | 'savedScanId'>>, store: Store | null = defaultStore()): void {
  const cur = readCache(store);
  if (cur) writeCache({ ...cur, ...patch }, store);
}

export function clearCache(store: Store | null = defaultStore()): void {
  try { store?.removeItem(KEY); } catch { /* nothing to clear */ }
}

/** The result on screen belongs to this user and to this URL; anything else counts as "no longer available". */
export function isResultAvailable(
  state: { analysis: Pick<AnalyzeResponse, 'analysis_id'> | null; imageUrl: string | null; ownerId: string | null },
  userId: string | undefined,
  analysisId: string | undefined,
): boolean {
  return !!state.analysis && !!state.imageUrl && !!userId && state.ownerId === userId && state.analysis.analysis_id === analysisId;
}

/** Re-encodes the photo as a bounded JPEG data URL (browser only). */
export function toStoredImage(file: Blob, maxSide = MAX_SIDE, quality = 0.85): Promise<string> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, maxSide / Math.max(img.width, img.height));
      const c = document.createElement('canvas');
      c.width = Math.round(img.width * scale);
      c.height = Math.round(img.height * scale);
      const g = c.getContext('2d');
      if (!g) { URL.revokeObjectURL(url); reject(new Error('no canvas')); return; }
      g.fillStyle = '#fff'; g.fillRect(0, 0, c.width, c.height);
      g.drawImage(img, 0, 0, c.width, c.height);
      URL.revokeObjectURL(url);
      resolve(c.toDataURL('image/jpeg', quality));
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('image load failed')); };
    img.src = url;
  });
}
