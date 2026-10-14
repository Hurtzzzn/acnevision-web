import { create } from 'zustand';
import type { AnalyzeResponse, DetectResponse, RecommendationResponse } from '@acnevision/shared';
import { clearCache, patchCache, readCache, toStoredImage, writeCache } from '../lib/resultCache';

/**
 * State of the latest scan; consumed by /analysis/:id (full analysis, signed in) and /detect-result (guest detection).
 * A guest detection lives only in memory: guest photos are never stored. A signed-in analysis is also kept in
 * sessionStorage for the lifetime of the tab (see lib/resultCache.ts) and cleared on logout.
 */
interface ScanState {
  analysis: AnalyzeResponse | null;
  detection: DetectResponse | null;
  imageUrl: string | null;
  recommendation: RecommendationResponse | null;
  savedScanId: string | null;
  /** User id the cached analysis belongs to; a result of another user is never shown. */
  ownerId: string | null;
  setScan: (analysis: AnalyzeResponse, imageUrl: string) => void;
  /** Signed-in only: keep the analysis and a bounded copy of the photo across a refresh. */
  remember: (ownerId: string, file: File) => Promise<void>;
  setDetection: (detection: DetectResponse, imageUrl: string) => void;
  setRecommendation: (r: RecommendationResponse | null) => void;
  setSaved: (id: string | null) => void;
  reset: () => void;
}

const restored = readCache();

export const useScan = create<ScanState>((set, get) => ({
  analysis: restored?.analysis ?? null,
  detection: null,
  imageUrl: restored?.image ?? null,
  recommendation: restored?.recommendation ?? null,
  savedScanId: restored?.savedScanId ?? null,
  ownerId: restored?.ownerId ?? null,
  setScan: (analysis, imageUrl) => {
    const prev = get().imageUrl;
    if (prev && prev !== imageUrl) URL.revokeObjectURL(prev);
    clearCache();
    set({ analysis, detection: null, imageUrl, recommendation: null, savedScanId: null, ownerId: null });
  },
  remember: async (ownerId, file) => {
    const analysis = get().analysis;
    if (!ownerId || !analysis) return;
    set({ ownerId });
    try {
      const image = await toStoredImage(file);
      // Skip if a newer scan replaced this one while the photo was being re-encoded.
      if (get().analysis?.analysis_id !== analysis.analysis_id) return;
      const { recommendation, savedScanId } = get();
      writeCache({ ownerId, analysis, image, recommendation, savedScanId });
    } catch { /* not kept across a refresh; the on-screen result is unaffected */ }
  },
  setDetection: (detection, imageUrl) => {
    const prev = get().imageUrl;
    if (prev && prev !== imageUrl) URL.revokeObjectURL(prev);
    clearCache();
    set({ detection, analysis: null, imageUrl, recommendation: null, savedScanId: null, ownerId: null });
  },
  setRecommendation: (recommendation) => {
    set({ recommendation });
    patchCache({ recommendation });
  },
  setSaved: (savedScanId) => {
    set({ savedScanId });
    patchCache({ savedScanId });
  },
  reset: () => {
    const prev = get().imageUrl;
    if (prev) URL.revokeObjectURL(prev);
    clearCache();
    set({ analysis: null, detection: null, imageUrl: null, recommendation: null, savedScanId: null, ownerId: null });
  },
}));
