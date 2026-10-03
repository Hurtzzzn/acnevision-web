import { create } from 'zustand';
import type { AnalyzeResponse, DetectResponse, RecommendationResponse } from '@acnevision/shared';

/**
 * State of the latest scan; consumed by /result (full analysis) and /detect-result (guest detection).
 * Image is kept as an object URL (guest photos never leave memory).
 */
interface ScanState {
  analysis: AnalyzeResponse | null;
  detection: DetectResponse | null;
  imageUrl: string | null;
  recommendation: RecommendationResponse | null;
  savedScanId: string | null;
  setScan: (analysis: AnalyzeResponse, imageUrl: string) => void;
  setDetection: (detection: DetectResponse, imageUrl: string) => void;
  setRecommendation: (r: RecommendationResponse | null) => void;
  setSaved: (id: string | null) => void;
  reset: () => void;
}

export const useScan = create<ScanState>((set, get) => ({
  analysis: null,
  detection: null,
  imageUrl: null,
  recommendation: null,
  savedScanId: null,
  setScan: (analysis, imageUrl) => {
    const prev = get().imageUrl;
    if (prev && prev !== imageUrl) URL.revokeObjectURL(prev);
    set({ analysis, detection: null, imageUrl, recommendation: null, savedScanId: null });
  },
  setDetection: (detection, imageUrl) => {
    const prev = get().imageUrl;
    if (prev && prev !== imageUrl) URL.revokeObjectURL(prev);
    set({ detection, analysis: null, imageUrl, recommendation: null, savedScanId: null });
  },
  setRecommendation: (recommendation) => set({ recommendation }),
  setSaved: (savedScanId) => set({ savedScanId }),
  reset: () => {
    const prev = get().imageUrl;
    if (prev) URL.revokeObjectURL(prev);
    set({ analysis: null, detection: null, imageUrl: null, recommendation: null, savedScanId: null });
  },
}));
