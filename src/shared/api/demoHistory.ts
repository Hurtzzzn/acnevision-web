/**
 * Sample saved analyses for the offline mock's demo account, so the dashboard chart has something to show.
 * Only the mock imports this. The numbers are invented and are NOT real AI output.
 */
import { COPY } from '../constants/copy';
import { LOW_CONFIDENCE_THRESHOLD, SEVERITY_ORDER } from '../constants/classes';
import type { DetectedLesion, ScanDetail, Severity } from '../types/api';

interface Sample {
  daysAgo: number;
  lesions: number;
  severity: Severity;
  confidence: number;
  tone: string;
}

/** Oldest to newest. Counts and severity move around on purpose (they are not always in step), like real photos do. */
const SAMPLES: readonly Sample[] = [
  { daysAgo: 38, lesions: 24, severity: 'severe', confidence: 0.78, tone: '#F3D9C8' },
  { daysAgo: 30, lesions: 18, severity: 'moderate', confidence: 0.71, tone: '#F1D5C2' },
  { daysAgo: 22, lesions: 21, severity: 'severe', confidence: 0.64, tone: '#F4DBCB' },
  { daysAgo: 14, lesions: 12, severity: 'moderate', confidence: 0.83, tone: '#F2D7C5' },
  { daysAgo: 8, lesions: 7, severity: 'moderate', confidence: 0.69, tone: '#F3D8C6' },
  { daysAgo: 3, lesions: 4, severity: 'mild', confidence: 0.88, tone: '#F2D9C9' },
];

/** Small deterministic generator so every reload seeds the same boxes. */
function rng(seed: number) {
  let s = seed >>> 0;
  return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
}

function lesionsFor(count: number, seed: number): DetectedLesion[] {
  const rand = rng(seed);
  return Array.from({ length: count }, (_, idx) => {
    const angle = rand() * Math.PI * 2, radius = Math.sqrt(rand());
    const cx = 0.5 + Math.cos(angle) * radius * 0.2, cy = 0.5 + Math.sin(angle) * radius * 0.27;
    const half = 0.02 + rand() * 0.02;
    return {
      idx,
      bbox: { x1: cx - half, y1: cy - half, x2: cx + half, y2: cy + half },
      det_confidence: 0.55 + rand() * 0.44,
      label: COPY.detect.lesionLabel,
    };
  });
}

/** Plain illustrated portrait placeholder, so the sample history never needs real photos. */
function portrait(tone: string): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 400"><rect width="300" height="400" fill="#E8EFFD"/>`
    + `<path d="M40 400c8-70 52-96 110-96s102 26 110 96z" fill="#BFD0F5"/>`
    + `<ellipse cx="150" cy="190" rx="78" ry="104" fill="${tone}"/>`
    + `<path d="M70 176c0-70 34-104 80-104s80 34 80 104c-18-34-44-50-80-50s-62 16-80 50z" fill="#5B4636"/></svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

export interface DemoScan { detail: ScanDetail; thumb: string }

export function buildDemoScans(now: Date = new Date()): DemoScan[] {
  return SAMPLES.map((sample, i) => {
    const id = `demo-sample-${i + 1}`;
    const created = new Date(now.getTime() - sample.daysAgo * 86_400_000);
    created.setHours(19, 30 - i * 4, 0, 0);
    const rest = (1 - sample.confidence) / (SEVERITY_ORDER.length - 1);
    const probabilities = Object.fromEntries(
      SEVERITY_ORDER.map((s) => [s, s === sample.severity ? sample.confidence : rest]),
    ) as Record<Severity, number>;
    const image = portrait(sample.tone);
    return {
      thumb: image,
      detail: {
        analysis_id: id, scan_id: id, is_guest: false,
        image: { width: 300, height: 400 },
        lesions: lesionsFor(sample.lesions, 1000 + i),
        summary: { total_lesions: sample.lesions },
        classification: {
          severity: sample.severity, confidence: sample.confidence, probabilities,
          is_low_confidence: sample.confidence < LOW_CONFIDENCE_THRESHOLD,
          gradcam_png_base64: null,
        },
        timing_ms: { detection: 180, classification: 240, total: 480 },
        model_info: {
          detection: { name: 'Model deteksi', version: 'mock-1.0.0' },
          classification: { name: 'Model klasifikasi', version: 'mock-1.0.0' },
        },
        disclaimer: COPY.disclaimer,
        image_url: image,
        created_at: created.toISOString(),
        recommendation: null,
        conversation_id: null,
      },
    };
  });
}
