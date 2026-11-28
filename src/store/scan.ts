import { create } from 'zustand';
import type { AnalyzeResponse, DetectResponse, RecommendationResponse } from '@acnevision/shared';
import { clearCache, patchCache, readCache, toStoredImage, writeCache } from '../lib/resultCache';

export interface PendingPhoto {
  file: File;
  previewUrl: string;
  source: 'camera' | 'gallery';
  /** Original uncropped file so "Batalkan" in Crop returns cleanly. */
  originalFile?: File;
}

/**
 * State of the latest scan and in-progress capture/upload pipeline.
 * A guest detection lives only in memory: guest photos are never stored. A signed-in analysis is also kept in
 * sessionStorage for the lifetime of the tab (see lib/resultCache.ts) and cleared on logout.
 */
interface ScanState {
  analysis: AnalyzeResponse | null;
  detection: DetectResponse | null;
  imageUrl: string | null;
  /** Actual ISO timestamp of the latest capture/detection when not returned by /detect. */
  capturedAt: string | null;
  recommendation: RecommendationResponse | null;
  savedScanId: string | null;
  /** User id the cached analysis belongs to; a result of another user is never shown. */
  ownerId: string | null;
  /** Active photo staged between Camera/Gallery -> Preview -> Crop -> Consent -> Analyzing. */
  pendingPhoto: PendingPhoto | null;
  setPendingPhoto: (photo: PendingPhoto) => void;
  clearPendingPhoto: () => void;
  setScan: (analysis: AnalyzeResponse, imageUrl: string, createdAt?: string) => void;
  /** Signed-in only: keep the analysis and a bounded copy of the photo across a refresh. */
  remember: (ownerId: string, file: File) => Promise<void>;
  setDetection: (detection: DetectResponse, imageUrl: string, createdAt?: string) => void;
  setRecommendation: (r: RecommendationResponse | null) => void;
  setSaved: (id: string | null) => void;
  reset: () => void;
}

const restored = readCache();

export const useScan = create<ScanState>((set, get) => ({
  analysis: restored?.analysis ?? null,
  detection: null,
  imageUrl: restored?.image ?? null,
  capturedAt: restored ? new Date().toISOString() : null,
  recommendation: restored?.recommendation ?? null,
  savedScanId: restored?.savedScanId ?? null,
  ownerId: restored?.ownerId ?? null,
  pendingPhoto: null,

  setPendingPhoto: (photo) => {
    const prev = get().pendingPhoto?.previewUrl;
    if (prev && prev !== photo.previewUrl && prev !== get().imageUrl) {
      URL.revokeObjectURL(prev);
    }
    set({ pendingPhoto: photo });
  },

  clearPendingPhoto: () => {
    const prev = get().pendingPhoto?.previewUrl;
    if (prev && prev !== get().imageUrl) {
      URL.revokeObjectURL(prev);
    }
    set({ pendingPhoto: null });
  },

  setScan: (analysis, imageUrl, createdAt) => {
    const prev = get().imageUrl;
    if (prev && prev !== imageUrl) URL.revokeObjectURL(prev);
    const pendingPrev = get().pendingPhoto?.previewUrl;
    if (pendingPrev && pendingPrev !== imageUrl) URL.revokeObjectURL(pendingPrev);
    clearCache();
    set({
      analysis,
      detection: null,
      imageUrl,
      capturedAt: createdAt ?? new Date().toISOString(),
      recommendation: null,
      savedScanId: null,
      ownerId: null,
      pendingPhoto: null,
    });
  },

  remember: async (ownerId, file) => {
    const analysis = get().analysis;
    if (!ownerId || !analysis) return;
    set({ ownerId });
    try {
      const image = await toStoredImage(file);
      if (get().analysis?.analysis_id !== analysis.analysis_id) return;
      const { recommendation, savedScanId } = get();
      writeCache({ ownerId, analysis, image, recommendation, savedScanId });
    } catch { /* not kept across a refresh; the on-screen result is unaffected */ }
  },

  setDetection: (detection, imageUrl, createdAt) => {
    const prev = get().imageUrl;
    if (prev && prev !== imageUrl) URL.revokeObjectURL(prev);
    const pendingPrev = get().pendingPhoto?.previewUrl;
    if (pendingPrev && pendingPrev !== imageUrl) URL.revokeObjectURL(pendingPrev);
    clearCache();
    set({
      detection,
      analysis: null,
      imageUrl,
      capturedAt: createdAt ?? new Date().toISOString(),
      recommendation: null,
      savedScanId: null,
      ownerId: null,
      pendingPhoto: null,
    });
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
    const pendingPrev = get().pendingPhoto?.previewUrl;
    if (pendingPrev && pendingPrev !== prev) URL.revokeObjectURL(pendingPrev);
    clearCache();
    set({
      analysis: null,
      detection: null,
      imageUrl: null,
      capturedAt: null,
      recommendation: null,
      savedScanId: null,
      ownerId: null,
      pendingPhoto: null,
    });
  },
}));
