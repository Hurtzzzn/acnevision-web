/**
 * Offline mock of the AcneVision backend + auth, for developing the frontend without FastAPI/Supabase/model weights.
 * Data lives in localStorage. Detection results are simulated and NOT real AI output.
 */
import {
  ALLOWED_IMAGE_TYPES, LOW_CONFIDENCE_THRESHOLD, MAX_UPLOAD_BYTES, SEVERITY_META, SEVERITY_ORDER, estimateSeverity,
} from '../constants/classes';
import { COPY } from '../constants/copy';
import type {
  AdminUser, AnalyzeResponse, AuditLogItem, ChatMessage, Classification, ConversationItem,
  DetectedLesion, DetectResponse, Me, ModelStats, Paginated, ScanDetail, ScanListItem, Severity, UsageStats, UserRole, UserStatus,
} from '../types/api';
import { ApiRequestError, type AcneApi, type DateRange } from './types';
import { buildUserStats } from './stats';

interface StoredUser extends Me { password: string; last_seen_at: string | null }
interface StoredScan { detail: ScanDetail; thumb: string; user_id: string }
interface StoredConversation {
  id: string; user_id: string; scan_id: string | null; title: string; updated_at: string; messages: ChatMessage[];
}

const K = { users: 'acv.mock.users', scans: 'acv.mock.scans', convs: 'acv.mock.convs', audit: 'acv.mock.audit', session: 'acv.mock.session' };

function load<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch { return fallback; }
}
function save(key: string, value: unknown) {
  try { localStorage.setItem(key, JSON.stringify(value)); }
  catch { throw new ApiRequestError('INTERNAL_ERROR', 'Penyimpanan lokal penuh. Hapus beberapa riwayat.'); }
}
const uid = () => (crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`);
const now = () => new Date().toISOString();
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function seedUsers(): StoredUser[] {
  const t = now();
  return [
    { id: 'u-admin', email: 'admin@acnevision.test', password: 'admin12345', full_name: 'Admin AcneVision', avatar_url: null, role: 'admin', status: 'active', created_at: t, last_seen_at: t },
    { id: 'u-demo', email: 'demo@acnevision.test', password: 'demo12345', full_name: 'Pengguna Demo', avatar_url: null, role: 'user', status: 'active', created_at: t, last_seen_at: t },
  ];
}
const getUsers = () => {
  const users = load<StoredUser[] | null>(K.users, null);
  if (users) return users;
  const seeded = seedUsers();
  save(K.users, seeded);
  return seeded;
};
const publicUser = ({ password: _p, last_seen_at: _l, ...me }: StoredUser): Me => me;

// ---------- image helpers ----------
function readImage(file: File): Promise<{ w: number; h: number; dataUrl: string; thumb: string }> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const scale = (max: number) => Math.min(1, max / Math.max(img.width, img.height));
      const draw = (max: number, q: number) => {
        const s = scale(max);
        const c = document.createElement('canvas');
        c.width = Math.round(img.width * s); c.height = Math.round(img.height * s);
        c.getContext('2d')!.drawImage(img, 0, 0, c.width, c.height);
        return c.toDataURL('image/jpeg', q);
      };
      const out = { w: img.width, h: img.height, dataUrl: draw(640, 0.8), thumb: draw(120, 0.7) };
      URL.revokeObjectURL(url);
      resolve(out);
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new ApiRequestError('INVALID_IMAGE', 'File harus berupa gambar JPEG, PNG, atau WEBP.', 400)); };
    img.src = url;
  });
}

// ---------- fake inference ----------
function rng(seed: number) {
  let s = seed >>> 0;
  return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
}

// Generic names on purpose: the mock must never claim a real model. The real backend sends its own `model_info`.
const MOCK_MODEL_INFO = {
  detection: { name: 'Model deteksi (mode demo)', version: 'mock-1.0.0' },
  classification: { name: 'Model klasifikasi (mode demo)', version: 'mock-1.0.0' },
};

/** Simulated detector: the same photo always gives the same boxes, so guests and signed-in users see the same count. */
function fakeLesions(w: number, h: number, rand: () => number): DetectedLesion[] {
  const total = Math.floor(rand() * 16);
  const lesions: DetectedLesion[] = [];
  // Simulated face area: an ellipse in the middle of the frame (not the whole image).
  const FACE = { cx: 0.5, cy: 0.5, rx: 0.2, ry: 0.27 };
  // Boxes are square in pixels, so convert the half-size into per-axis normalized units.
  const short = Math.min(w, h);
  for (let i = 0; i < total; i++) {
    const angle = rand() * Math.PI * 2, radius = Math.sqrt(rand());
    const cx = FACE.cx + Math.cos(angle) * radius * FACE.rx, cy = FACE.cy + Math.sin(angle) * radius * FACE.ry;
    const half = 0.018 + rand() * 0.022;
    const hx = (half * short) / w, hy = (half * short) / h;
    lesions.push({
      idx: i,
      bbox: { x1: cx - hx, y1: cy - hy, x2: cx + hx, y2: cy + hy },
      // 0.45-0.99, so some simulated lesions fall below LOW_CONFIDENCE_THRESHOLD and the "kurang yakin" state is exercised
      det_confidence: 0.45 + rand() * 0.54,
      label: COPY.detect.lesionLabel,
    });
  }
  return lesions;
}

/**
 * Simulated classifier for the whole photo. It leans on the lesion count but sometimes lands a few levels away, so the
 * "count and severity do not line up" note can be seen in demo mode. Not real AI output.
 */
function fakeClassification(total: number, rand: () => number): Classification {
  const base = SEVERITY_ORDER.indexOf(estimateSeverity(total) ?? 'mild');
  const roll = rand();
  const shift = roll < 0.55 ? 0 : roll < 0.75 ? 1 : roll < 0.9 ? 2 : -1;
  const picked = Math.min(SEVERITY_ORDER.length - 1, Math.max(0, base + shift));
  const confidence = 0.45 + rand() * 0.5;
  // The rest of the probability mass favors levels next to the picked one.
  const others = SEVERITY_ORDER.map((_, i) => (i === picked ? 0 : 1 / (1 + Math.abs(i - picked))));
  const othersSum = others.reduce((a, x) => a + x, 0);
  const probabilities = Object.fromEntries(
    SEVERITY_ORDER.map((s, i) => [s, i === picked ? confidence : ((1 - confidence) * others[i]) / othersSum]),
  ) as Record<Severity, number>;
  return {
    severity: SEVERITY_ORDER[picked], confidence, probabilities,
    is_low_confidence: confidence < LOW_CONFIDENCE_THRESHOLD,
    gradcam_png_base64: null,
  };
}

function fakeAnalysis(file: File, w: number, h: number): AnalyzeResponse {
  const rand = rng(file.size + w * 31 + h);
  const lesions = fakeLesions(w, h, rand);
  const total = lesions.length;
  return {
    analysis_id: uid(), is_guest: false, image: { width: w, height: h }, lesions,
    summary: { total_lesions: total },
    // No lesions: the classifier is not run, so there is no severity at all.
    classification: total === 0 ? null : fakeClassification(total, rand),
    timing_ms: {
      detection: 150 + Math.floor(rand() * 80),
      classification: total === 0 ? 0 : 200 + Math.floor(rand() * 100),
      total: 400 + Math.floor(rand() * 200),
    },
    model_info: MOCK_MODEL_INFO,
    disclaimer: COPY.disclaimer,
  };
}

/** Guest path: boxes, counts, and the Hayashi estimate only. Deliberately builds no classification, probability, or Grad-CAM data. */
function fakeDetection(file: File, w: number, h: number, isGuest: boolean): DetectResponse {
  const rand = rng(file.size + w * 31 + h);
  const lesions = fakeLesions(w, h, rand);
  const total = lesions.length;
  return {
    detection_id: uid(), is_guest: isGuest, image: { width: w, height: h }, lesions,
    summary: { total_lesions: total, severity: estimateSeverity(total), severity_is_estimate: true },
    timing_ms: { detection: 150 + Math.floor(rand() * 80) },
    model_info: { detection: MOCK_MODEL_INFO.detection },
    disclaimer: COPY.disclaimer,
    advice: COPY.detect.advice,
    upgrade: { message: COPY.detect.upgradeMessage, unlocks: [...COPY.detect.upgradeUnlocks] },
  };
}

const TIPS: Record<Severity, string> = {
  mild: 'Rutinitas sederhana biasanya sudah cukup: bersihkan wajah dua kali sehari dengan pembersih lembut, pakai pelembap non-komedogenik, dan tabir surya setiap pagi. Hindari memencet jerawat agar tidak meradang.',
  moderate: 'Selain rutinitas dasar (pembersih lembut, pelembap non-komedogenik, tabir surya), bahan seperti salicylic acid atau benzoyl peroxide konsentrasi rendah sering dipakai. Mulai pelan-pelan, dan jangan memencet jerawat. Bila tidak membaik setelah beberapa minggu, konsultasikan ke dokter kulit.',
  severe: 'Sebaiknya konsultasikan ke dokter kulit supaya langkah perawatannya sesuai dengan kondisi kulitmu. Sambil menunggu, jaga rutinitas yang lembut, hindari scrub kasar, dan jangan memencet jerawat.',
  very_severe: 'Kami menyarankan kamu berkonsultasi dengan dokter kulit dalam waktu dekat untuk penanganan yang tepat. Sambil menunggu, jaga rutinitas yang lembut dan jangan memencet jerawat.',
};

function recommendationFor(result: AnalyzeResponse): string {
  const cls = result.classification;
  if (result.summary.total_lesions === 0 || !cls) {
    return 'AI tidak menemukan jerawat pada foto ini. Hasil bisa meleset bila cahaya atau sudut foto kurang pas, jadi coba foto ulang dengan pencahayaan lebih terang bila kamu masih ragu. Tetap jaga rutinitas sederhana: pembersih lembut, pelembap, dan tabir surya setiap pagi.';
  }
  const level = SEVERITY_META[cls.severity].label.toLowerCase();
  return `Berdasarkan hasil analisis AI, tingkat keparahan jerawat kamu diperkirakan ${level}, dengan ${result.summary.total_lesions} jerawat terdeteksi. ${TIPS[cls.severity]}`;
}

function chatReply(question: string, ctx: StoredScan | null): string {
  const q = question.toLowerCase();
  if (!/(jerawat|kulit|skincare|wajah|acne|salicylic|niacinamide|benzoyl|retinol|sunscreen|tabir|pelembap|moisturizer|bekas|komedo|sabun|cuci|makeup|minyak|pori)/.test(q)) {
    return 'Maaf, saya hanya dapat membantu pertanyaan seputar kulit, jerawat, dan perawatan kulit.';
  }
  if (/(dosis|resep|antibiotik|isotretinoin|roaccutane)/.test(q)) {
    return 'Untuk obat resep seperti antibiotik atau isotretinoin, dosis dan penggunaannya harus ditentukan dokter kulit. Silakan buat janji konsultasi.';
  }
  if (q.includes('salicylic')) return 'Salicylic acid (BHA) membantu membersihkan pori tersumbat. Mulai 2-3 kali seminggu, lalu tingkatkan bertahap bila kulit tidak iritasi. Selalu gunakan tabir surya di pagi hari.';
  if (q.includes('niacinamide')) return 'Niacinamide 2-5% membantu mengontrol minyak dan menenangkan kemerahan, aman dikombinasikan dengan banyak bahan lain.';
  if (/(sunscreen|tabir)/.test(q)) return 'Tabir surya non-komedogenik SPF 30+ dianjurkan setiap pagi, termasuk saat berjerawat, karena sinar UV dapat memperburuk bekas jerawat.';
  if (/(bekas)/.test(q)) return 'Bekas jerawat biasanya membaik dengan perlindungan matahari dan bahan seperti niacinamide atau azelaic acid. Bekas yang dalam sebaiknya dikonsultasikan ke dokter kulit.';
  const severity = ctx?.detail.classification?.severity;
  return `Secara umum, jaga rutinitas sederhana: pembersih lembut, pelembap non-komedogenik, dan tabir surya.${severity ? ` Untuk tingkat keparahan ${SEVERITY_META[severity].label.toLowerCase()} pada scan kamu, hindari memencet jerawat.` : ''} Jika tidak membaik dalam 4-6 minggu, konsultasikan ke dokter kulit.`;
}

// ---------- backend ----------
export interface MockAuth {
  register(email: string, password: string, fullName: string): Promise<Me>;
  login(email: string, password: string): Promise<Me>;
  logout(): void;
  current(): Me | null;
}

export function createMockBackend(): { api: AcneApi; auth: MockAuth } {
  type PendingAnalysis = { result: AnalyzeResponse; image: string; thumb: string };
  const analyses = new Map<string, PendingAnalysis>();
  // A real backend keeps an analysis for a while, so saving still works after a refresh. The mock mirrors that for the last
  // few analyses of signed-in users, in sessionStorage (tab lifetime). Guest analyses are never written.
  const PENDING_KEY = 'acv.mock.pending';
  const readPending = (): Array<PendingAnalysis & { id: string }> => {
    try { return JSON.parse(sessionStorage.getItem(PENDING_KEY) ?? '[]'); } catch { return []; }
  };
  const rememberPending = (id: string, a: PendingAnalysis) => {
    try { sessionStorage.setItem(PENDING_KEY, JSON.stringify([{ id, ...a }, ...readPending().filter((p) => p.id !== id)].slice(0, 3))); } catch { /* optional */ }
  };
  const findPending = (id: string): PendingAnalysis | undefined => analyses.get(id) ?? readPending().find((p) => p.id === id);

  const session = (): StoredUser | null => {
    const id = load<string | null>(K.session, null);
    return id ? getUsers().find((u) => u.id === id) ?? null : null;
  };
  const requireUser = () => {
    const u = session();
    if (!u) throw new ApiRequestError('UNAUTHORIZED', 'Silakan masuk terlebih dahulu.', 401);
    if (u.status === 'suspended') throw new ApiRequestError('FORBIDDEN', 'Akun kamu dinonaktifkan.', 403);
    return u;
  };
  const requireAdmin = () => {
    const u = requireUser();
    if (u.role !== 'admin') throw new ApiRequestError('FORBIDDEN', 'Hanya admin yang dapat mengakses ini.', 403);
    return u;
  };
  const scans = () => load<StoredScan[]>(K.scans, []);
  const convs = () => load<StoredConversation[]>(K.convs, []);
  const paginate = <T,>(items: T[], page: number, size: number): Paginated<T> =>
    ({ items: items.slice((page - 1) * size, page * size), page, page_size: size, total: items.length });
  const audit = (admin: StoredUser, action: string, target: StoredUser, details: Record<string, unknown>) => {
    const logs = load<AuditLogItem[]>(K.audit, []);
    logs.unshift({ id: logs.length + 1, admin_email: admin.email, action, target_email: target.email, details, created_at: now() });
    save(K.audit, logs);
  };

  const auth: MockAuth = {
    async register(email, password, fullName) {
      await sleep(300);
      const users = getUsers();
      if (users.some((u) => u.email.toLowerCase() === email.toLowerCase())) {
        throw new ApiRequestError('VALIDATION_ERROR', 'Email sudah terdaftar.', 400);
      }
      const u: StoredUser = { id: uid(), email, password, full_name: fullName, avatar_url: null, role: 'user', status: 'active', created_at: now(), last_seen_at: now() };
      save(K.users, [...users, u]);
      save(K.session, u.id);
      return publicUser(u);
    },
    async login(email, password) {
      await sleep(300);
      const users = getUsers();
      const u = users.find((x) => x.email.toLowerCase() === email.toLowerCase() && x.password === password);
      if (!u) throw new ApiRequestError('UNAUTHORIZED', 'Email atau password salah.', 401);
      if (u.status === 'suspended') throw new ApiRequestError('FORBIDDEN', 'Akun kamu dinonaktifkan.', 403);
      u.last_seen_at = now();
      save(K.users, users);
      save(K.session, u.id);
      return publicUser(u);
    },
    logout() {
      localStorage.removeItem(K.session);
      try { sessionStorage.removeItem(PENDING_KEY); } catch { /* nothing to clear */ }
    },
    current() { const u = session(); return u ? publicUser(u) : null; },
  };

  const asMe = (u: StoredUser) => publicUser(u);
  const scanItem = (s: StoredScan): ScanListItem => ({
    scan_id: s.detail.scan_id, created_at: s.detail.created_at, thumbnail_url: s.thumb,
    total_lesions: s.detail.summary.total_lesions,
    severity: s.detail.classification?.severity ?? null,
    severity_confidence: s.detail.classification?.confidence ?? null,
  });

  function series(range: DateRange, fn: (i: number, r: () => number, period: string) => object) {
    const from = new Date(range.from), to = new Date(range.to);
    const step = range.granularity === 'day' ? 1 : range.granularity === 'week' ? 7 : 30;
    const out: object[] = [];
    const r = rng(from.getTime() / 86400000);
    for (let d = new Date(from), i = 0; d <= to && i < 120; d = new Date(d.getTime() + step * 86400000), i++) {
      out.push(fn(i, r, d.toISOString().slice(0, 10)));
    }
    return out;
  }

  const api: AcneApi = {
    async detect(image) {
      if (!(ALLOWED_IMAGE_TYPES as readonly string[]).includes(image.type)) throw new ApiRequestError('INVALID_IMAGE', 'File harus berupa gambar JPEG, PNG, atau WEBP.', 400);
      if (image.size > MAX_UPLOAD_BYTES) throw new ApiRequestError('FILE_TOO_LARGE', 'Ukuran file maksimal 10 MB.', 413);
      const [img] = await Promise.all([readImage(image), sleep(900)]);
      // Guest photos are not stored: nothing is kept in `analyses` or localStorage.
      return fakeDetection(image, img.w, img.h, !session());
    },
    async analyze(image) {
      // The real /analyze answers 401 without a token, so the mock does too (docs/05).
      requireUser();
      if (!(ALLOWED_IMAGE_TYPES as readonly string[]).includes(image.type)) throw new ApiRequestError('INVALID_IMAGE', 'File harus berupa gambar JPEG, PNG, atau WEBP.', 400);
      if (image.size > MAX_UPLOAD_BYTES) throw new ApiRequestError('FILE_TOO_LARGE', 'Ukuran file maksimal 10 MB.', 413);
      const [img] = await Promise.all([readImage(image), sleep(1200)]);
      const result = fakeAnalysis(image, img.w, img.h);
      analyses.set(result.analysis_id, { result, image: img.dataUrl, thumb: img.thumb });
      rememberPending(result.analysis_id, { result, image: img.dataUrl, thumb: img.thumb });
      return result;
    },
    async getGradcam(analysisId) {
      await sleep(300);
      // One simulated heatmap for the whole photo: a wide blob on the face plus a soft one over each detected lesion.
      // Colors run from low influence (blue, transparent) to high (red), the same ramp as the key under the photo.
      const known = findPending(analysisId)?.result ?? scans().find((s) => s.detail.analysis_id === analysisId)?.detail;
      const SIZE = 256;
      const c = document.createElement('canvas');
      c.width = c.height = SIZE;
      const g = c.getContext('2d')!;
      const blob = (cx: number, cy: number, r: number, strength: number) => {
        const grad = g.createRadialGradient(cx, cy, 0, cx, cy, r);
        grad.addColorStop(0, `rgba(220,38,38,${0.85 * strength})`);
        grad.addColorStop(0.5, `rgba(250,204,21,${0.55 * strength})`);
        grad.addColorStop(1, 'rgba(37,99,235,0)');
        g.fillStyle = grad; g.fillRect(0, 0, SIZE, SIZE);
      };
      blob(0.5 * SIZE, 0.5 * SIZE, 0.34 * SIZE, 0.6);
      (known?.lesions ?? []).slice(0, 8).forEach((l) => {
        blob(((l.bbox.x1 + l.bbox.x2) / 2) * SIZE, ((l.bbox.y1 + l.bbox.y2) / 2) * SIZE, 0.12 * SIZE, 1);
      });
      return c.toDataURL('image/png').split(',')[1];
    },

    async saveScan(analysisId) {
      const user = requireUser();
      const a = findPending(analysisId);
      if (!a) throw new ApiRequestError('NOT_FOUND', 'Analisis tidak ditemukan atau sudah kedaluwarsa.', 404);
      const all = scans();
      if (all.some((s) => s.detail.scan_id === analysisId)) throw new ApiRequestError('ALREADY_SAVED', 'Hasil sudah tersimpan.', 409);
      const saved_at = now();
      const detail: ScanDetail = { ...a.result, is_guest: false, scan_id: analysisId, image_url: a.image, created_at: saved_at, recommendation: recommendationFor(a.result), conversation_id: null };
      save(K.scans, [{ detail, thumb: a.thumb, user_id: user.id }, ...all]);
      return { scan_id: analysisId, saved_at };
    },
    async listScans(page = 1, pageSize = 10) {
      const user = requireUser();
      return paginate(scans().filter((s) => s.user_id === user.id).map(scanItem), page, pageSize);
    },
    async getScan(id) {
      const user = requireUser();
      const s = scans().find((x) => x.detail.scan_id === id && x.user_id === user.id);
      if (!s) throw new ApiRequestError('NOT_FOUND', 'Scan tidak ditemukan.', 404);
      return s.detail;
    },
    async getMyStats() {
      const user = requireUser();
      const mine = scans().filter((s) => s.user_id === user.id);
      return buildUserStats(mine.map((s) => ({
        scan_id: s.detail.scan_id, created_at: s.detail.created_at, thumbnail_url: s.thumb,
        total_lesions: s.detail.summary.total_lesions, severity: s.detail.classification?.severity ?? null,
      })));
    },
    async deleteScan(id) {
      const user = requireUser();
      save(K.scans, scans().filter((s) => !(s.detail.scan_id === id && s.user_id === user.id)));
      save(K.convs, convs().map((c) => (c.scan_id === id ? { ...c, scan_id: null } : c)));
    },
    async scanTrend(limit = 20) {
      const user = requireUser();
      const pts = scans().filter((s) => s.user_id === user.id).slice(0, limit).reverse()
        .map((s) => ({ created_at: s.detail.created_at, total_lesions: s.detail.summary.total_lesions, severity: s.detail.classification?.severity ?? null }));
      return { points: pts };
    },

    async recommend(analysisId) {
      await sleep(600);
      const user = session();
      const a = findPending(analysisId);
      const saved = scans().find((s) => s.detail.scan_id === analysisId);
      const result = a?.result ?? saved?.detail;
      if (!result) throw new ApiRequestError('NOT_FOUND', 'Analisis tidak ditemukan atau sudah kedaluwarsa.', 404);
      const text = recommendationFor(result);
      let conversation_id: string | null = null;
      if (user) {
        const all = convs();
        const existing = all.find((c) => c.scan_id === analysisId && c.user_id === user.id);
        if (existing) conversation_id = existing.id;
        else {
          conversation_id = uid();
          const t = now();
          all.unshift({
            id: conversation_id, user_id: user.id, scan_id: saved ? analysisId : null,
            title: `Konsultasi ${new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}`,
            updated_at: t, messages: [{ id: uid(), role: 'assistant', content: text, is_fallback: false, created_at: t }],
          });
          save(K.convs, all);
        }
      }
      return { recommendation: text, is_fallback: false, conversation_id, can_follow_up: !!user, disclaimer: COPY.disclaimer };
    },
    async listConversations(page = 1) {
      const user = requireUser();
      const items: ConversationItem[] = convs().filter((c) => c.user_id === user.id).map((c) => ({
        conversation_id: c.id, title: c.title, scan_id: c.scan_id, updated_at: c.updated_at,
        last_message_preview: c.messages[c.messages.length - 1]?.content.slice(0, 80) ?? '',
      }));
      return paginate(items, page, 50);
    },
    async createConversation(scanId, title) {
      const user = requireUser();
      const id = uid();
      save(K.convs, [{ id, user_id: user.id, scan_id: scanId, title: title || 'Konsultasi baru', updated_at: now(), messages: [] }, ...convs()]);
      return { conversation_id: id };
    },
    async getMessages(id) {
      const user = requireUser();
      const c = convs().find((x) => x.id === id && x.user_id === user.id);
      if (!c) throw new ApiRequestError('NOT_FOUND', 'Percakapan tidak ditemukan.', 404);
      const s = c.scan_id ? scans().find((x) => x.detail.scan_id === c.scan_id) : null;
      return {
        conversation_id: id,
        scan_summary: s ? { total_lesions: s.detail.summary.total_lesions, severity: s.detail.classification?.severity ?? null } : null,
        messages: c.messages,
      };
    },
    async sendMessage(id, content) {
      const user = requireUser();
      if (content.length < 1 || content.length > 1000) throw new ApiRequestError('VALIDATION_ERROR', 'Pesan harus 1-1000 karakter.', 400);
      await sleep(700);
      const all = convs();
      const c = all.find((x) => x.id === id && x.user_id === user.id);
      if (!c) throw new ApiRequestError('NOT_FOUND', 'Percakapan tidak ditemukan.', 404);
      const scan = c.scan_id ? scans().find((x) => x.detail.scan_id === c.scan_id) ?? null : null;
      const t = now();
      const user_message: ChatMessage = { id: uid(), role: 'user', content, created_at: t };
      const assistant_message: ChatMessage = { id: uid(), role: 'assistant', content: chatReply(content, scan), is_fallback: false, created_at: now() };
      c.messages.push(user_message, assistant_message);
      c.updated_at = assistant_message.created_at;
      save(K.convs, all);
      return { user_message, assistant_message, disclaimer: COPY.disclaimer };
    },
    async deleteConversation(id) {
      const user = requireUser();
      save(K.convs, convs().filter((c) => !(c.id === id && c.user_id === user.id)));
    },

    async getMe() { return asMe(requireUser()); },
    async updateMe(patch) {
      const user = requireUser();
      const users = getUsers();
      const u = users.find((x) => x.id === user.id)!;
      u.full_name = patch.full_name;
      save(K.users, users);
      return asMe(u);
    },

    async adminUsage(range) {
      requireAdmin();
      await sleep(250);
      const s = series(range, (i, r, period) => {
        const guest = Math.floor(20 + r() * 40), usr = Math.floor(10 + r() * 25);
        return { period, guest_scans: guest, user_scans: usr, total_scans: guest + usr, new_users: Math.floor(r() * 9) + (i % 3) };
      }) as UsageStats['series'];
      const sum = (k: 'guest_scans' | 'user_scans' | 'total_scans' | 'new_users') => s.reduce((a, x) => a + x[k], 0);
      return {
        totals: { scans: sum('total_scans'), guest_scans: sum('guest_scans'), user_scans: sum('user_scans'), registered_users: getUsers().length + 200, new_users: sum('new_users'), active_users: Math.round(sum('user_scans') / 4) },
        series: s,
      };
    },
    async adminModel(range) {
      requireAdmin();
      await sleep(250);
      const s = series(range, (_i, r, period) => {
        const det = 150 + r() * 60, cls = 200 + r() * 80;
        return { period, avg_detection_ms: det, avg_classification_ms: cls, avg_total_ms: det + cls + 40, error_rate: r() * 0.01, low_confidence_rate: 0.04 + r() * 0.2, avg_confidence: 0.82 + r() * 0.1 };
      }) as ModelStats['series'];
      return {
        active_models: {
          detection: { ...MOCK_MODEL_INFO.detection },
          // Placeholder numbers so the metric row can be seen in demo mode. They describe no real model.
          classification: { ...MOCK_MODEL_INFO.classification, metrics: { macro_f1: 0.78, accuracy: 0.8 } },
        },
        summary: { requests: 1520, avg_total_ms: 540, p95_total_ms: 1100, error_rate: 0.004, no_lesion_rate: 0.12, low_confidence_rate: 0.07 },
        severity_distribution: SEVERITY_ORDER.map((severity, i) => ({ severity, scan_count: [610, 540, 260, 50][i], avg_confidence: [0.86, 0.8, 0.77, 0.7][i], low_conf_rate: [0.04, 0.07, 0.1, 0.18][i] })),
        series: s,
      };
    },
    async adminUsers({ search, status, role, page = 1 }) {
      requireAdmin();
      const q = (search ?? '').toLowerCase();
      const items: AdminUser[] = getUsers()
        .filter((u) => (!q || u.email.toLowerCase().includes(q) || (u.full_name ?? '').toLowerCase().includes(q)) && (!status || u.status === status) && (!role || u.role === role))
        .map((u) => ({ id: u.id, email: u.email, full_name: u.full_name, role: u.role, status: u.status, created_at: u.created_at, last_seen_at: u.last_seen_at, saved_scans: scans().filter((s) => s.user_id === u.id).length }));
      return paginate(items, page, 20);
    },
    async adminUpdateUser(userId, patch) {
      const admin = requireAdmin();
      if (userId === admin.id) throw new ApiRequestError('FORBIDDEN', 'Admin tidak dapat mengubah akunnya sendiri.', 403);
      const users = getUsers();
      const u = users.find((x) => x.id === userId);
      if (!u) throw new ApiRequestError('NOT_FOUND', 'User tidak ditemukan.', 404);
      if (patch.status) { u.status = patch.status as UserStatus; audit(admin, patch.status === 'suspended' ? 'user.suspend' : 'user.activate', u, patch); }
      if (patch.role) { u.role = patch.role as UserRole; audit(admin, 'user.change_role', u, patch); }
      save(K.users, users);
      return { id: u.id, email: u.email, full_name: u.full_name, role: u.role, status: u.status, created_at: u.created_at, last_seen_at: u.last_seen_at, saved_scans: 0 };
    },
    async adminAudit(page = 1) {
      requireAdmin();
      return paginate(load<AuditLogItem[]>(K.audit, []), page, 20);
    },
  };

  return { api, auth };
}
