/**
 * Offline mock of the AcneVision backend + auth, for developing the frontend without FastAPI/Supabase/model weights.
 * Data lives in localStorage. Detection results are simulated and NOT real AI output.
 */
import {
  ACNE_CLASSES, ALLOWED_IMAGE_TYPES, LOW_CONFIDENCE_THRESHOLD, MAX_UPLOAD_BYTES, computeSeverity,
} from '../constants/classes';
import { COPY } from '../constants/copy';
import type {
  AcneClass, AdminUser, AnalysisSummary, AnalyzeResponse, AuditLogItem, ChatMessage, ConversationItem,
  DetectedLesion, DetectResponse, Lesion, Me, ModelStats, Paginated, ScanDetail, ScanListItem, UsageStats, UserRole, UserStatus,
} from '../types/api';
import { ApiRequestError, type AcneApi, type DateRange } from './types';

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

function fakeAnalysis(file: File, w: number, h: number, isGuest: boolean): AnalyzeResponse {
  const rand = rng(file.size + w * 31 + h);
  const total = Math.floor(rand() * 16);
  const weights: [AcneClass, number][] = [['Papules', 4], ['Blackheads', 3], ['Whiteheads', 3], ['Pustules', 2], ['Cyst', 0.6]];
  const sum = weights.reduce((a, [, x]) => a + x, 0);
  const lesions: Lesion[] = [];
  for (let i = 0; i < total; i++) {
    let pick = rand() * sum;
    let cls: AcneClass = 'Papules';
    for (const [c, x] of weights) { if ((pick -= x) <= 0) { cls = c; break; } }
    const cx = 0.25 + rand() * 0.5, cy = 0.25 + rand() * 0.55, size = 0.03 + rand() * 0.035;
    const conf = 0.5 + rand() * 0.49;
    const rest = (1 - conf) / 4;
    const probabilities = Object.fromEntries(ACNE_CLASSES.map((c) => [c, c === cls ? conf : rest])) as Record<AcneClass, number>;
    lesions.push({
      idx: i,
      bbox: { x1: cx - size, y1: cy - size, x2: cx + size, y2: cy + size },
      det_confidence: 0.6 + rand() * 0.39,
      predicted_class: cls,
      class_confidence: conf,
      probabilities,
      is_low_confidence: conf < LOW_CONFIDENCE_THRESHOLD,
      gradcam_png_base64: null,
    });
  }
  return {
    analysis_id: uid(), is_guest: isGuest, image: { width: w, height: h }, lesions,
    summary: summarize(lesions),
    timing_ms: { detection: 150 + Math.floor(rand() * 80), classification: 200 + Math.floor(rand() * 100), total: 400 + Math.floor(rand() * 200) },
    model_versions: { detection: 'mock-1.0.0', classification: 'mock-1.0.0' },
    disclaimer: COPY.disclaimer,
  };
}

/** Guest path: boxes and counts only. Deliberately builds no class, probability, or Grad-CAM data. */
function fakeDetection(file: File, w: number, h: number, isGuest: boolean): DetectResponse {
  const rand = rng(file.size + w * 31 + h);
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
      det_confidence: 0.6 + rand() * 0.39,
      label: COPY.detect.lesionLabel,
    });
  }
  return {
    detection_id: uid(), is_guest: isGuest, image: { width: w, height: h }, lesions,
    summary: { total_lesions: total, severity: computeSeverity(total, false), severity_is_estimate: true },
    timing_ms: { detection: 150 + Math.floor(rand() * 80) },
    model_version: 'mock-1.0.0',
    disclaimer: COPY.disclaimer,
    advice: COPY.detect.advice,
    upgrade: { message: COPY.detect.upgradeMessage, unlocks: [...COPY.detect.upgradeUnlocks] },
  };
}

function summarize(lesions: Lesion[]): AnalysisSummary {
  const counts = Object.fromEntries(ACNE_CLASSES.map((c) => [c, 0])) as Record<AcneClass, number>;
  lesions.forEach((l) => { counts[l.predicted_class]++; });
  let dominant: AcneClass | null = null;
  ACNE_CLASSES.forEach((c) => { if (counts[c] > 0 && (dominant === null || counts[c] > counts[dominant])) dominant = c; });
  const hasCyst = lesions.some((l) => l.predicted_class === 'Cyst' && l.class_confidence >= LOW_CONFIDENCE_THRESHOLD);
  return {
    total_lesions: lesions.length,
    class_counts: counts,
    dominant_class: dominant,
    avg_confidence: lesions.length ? lesions.reduce((a, l) => a + l.class_confidence, 0) / lesions.length : null,
    low_confidence_count: lesions.filter((l) => l.is_low_confidence).length,
    severity: computeSeverity(lesions.length, hasCyst),
    severity_is_estimate: true,
  };
}

const TIPS: Record<AcneClass, string> = {
  Blackheads: 'Komedo hitam (Blackheads) terjadi saat pori tersumbat minyak dan teroksidasi. Bersihkan wajah 2x sehari dengan pembersih lembut, dan pertimbangkan produk berbahan salicylic acid (BHA) 2-3 kali seminggu.',
  Whiteheads: 'Komedo putih (Whiteheads) adalah pori tersumbat yang tertutup. Gunakan pelembap non-komedogenik dan eksfoliasi lembut. Hindari memencet agar tidak meradang.',
  Papules: 'Papula adalah benjolan merah kecil tanpa nanah. Jangan dipencet. Bahan seperti benzoyl peroxide konsentrasi rendah atau niacinamide dapat membantu menenangkan peradangan.',
  Pustules: 'Pustula adalah jerawat meradang berisi nanah. Jangan dipencet karena berisiko meninggalkan bekas. Gunakan spot treatment lembut dan jaga kebersihan sarung bantal.',
  Cyst: 'Kista adalah jerawat dalam dan nyeri yang berisiko meninggalkan bekas. Sebaiknya segera konsultasikan ke dokter kulit untuk penanganan yang tepat.',
};

function recommendationFor(s: AnalysisSummary): string {
  if (s.total_lesions === 0 || !s.dominant_class) {
    return 'Kulitmu terlihat bersih pada foto ini. Pertahankan rutinitas sederhana: pembersih lembut, pelembap, dan tabir surya setiap pagi.';
  }
  const extra = s.class_counts.Cyst > 0 || s.severity === 'severe'
    ? '\n\nKarena terdapat kista atau jumlah lesi yang cukup banyak, kami menyarankan konsultasi ke dokter kulit.'
    : '';
  return `Berdasarkan hasil analisis, terdeteksi ${s.total_lesions} lesi dengan jenis terbanyak ${s.dominant_class}. ${TIPS[s.dominant_class]}${extra}`;
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
  const dom = ctx?.detail.summary.dominant_class;
  return `Secara umum, jaga rutinitas sederhana: pembersih lembut, pelembap non-komedogenik, dan tabir surya.${dom ? ` Untuk ${dom} yang terdeteksi pada scan kamu, hindari memencet lesi.` : ''} Jika tidak membaik dalam 4-6 minggu, konsultasikan ke dokter kulit.`;
}

// ---------- backend ----------
export interface MockAuth {
  register(email: string, password: string, fullName: string): Promise<Me>;
  login(email: string, password: string): Promise<Me>;
  logout(): void;
  current(): Me | null;
}

export function createMockBackend(): { api: AcneApi; auth: MockAuth } {
  const analyses = new Map<string, { result: AnalyzeResponse; image: string; thumb: string }>();

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
    logout() { localStorage.removeItem(K.session); },
    current() { const u = session(); return u ? publicUser(u) : null; },
  };

  const asMe = (u: StoredUser) => publicUser(u);
  const scanItem = (s: StoredScan): ScanListItem => ({
    scan_id: s.detail.scan_id, created_at: s.detail.created_at, thumbnail_url: s.thumb,
    total_lesions: s.detail.summary.total_lesions, dominant_class: s.detail.summary.dominant_class,
    severity: s.detail.summary.severity, avg_confidence: s.detail.summary.avg_confidence,
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
      if (!(ALLOWED_IMAGE_TYPES as readonly string[]).includes(image.type)) throw new ApiRequestError('INVALID_IMAGE', 'File harus berupa gambar JPEG, PNG, atau WEBP.', 400);
      if (image.size > MAX_UPLOAD_BYTES) throw new ApiRequestError('FILE_TOO_LARGE', 'Ukuran file maksimal 10 MB.', 413);
      const [img] = await Promise.all([readImage(image), sleep(1200)]);
      const user = session();
      const result = fakeAnalysis(image, img.w, img.h, !user);
      analyses.set(result.analysis_id, { result, image: img.dataUrl, thumb: img.thumb });
      return result;
    },
    async getGradcam() {
      await sleep(300);
      const c = document.createElement('canvas');
      c.width = c.height = 64;
      const g = c.getContext('2d')!;
      const grad = g.createRadialGradient(32, 32, 2, 32, 32, 32);
      grad.addColorStop(0, 'rgba(220,38,38,0.85)'); grad.addColorStop(1, 'rgba(37,99,235,0)');
      g.fillStyle = grad; g.fillRect(0, 0, 64, 64);
      return c.toDataURL('image/png').split(',')[1];
    },

    async saveScan(analysisId) {
      const user = requireUser();
      const a = analyses.get(analysisId);
      if (!a) throw new ApiRequestError('NOT_FOUND', 'Analisis tidak ditemukan atau sudah kedaluwarsa.', 404);
      const all = scans();
      if (all.some((s) => s.detail.scan_id === analysisId)) throw new ApiRequestError('ALREADY_SAVED', 'Hasil sudah tersimpan.', 409);
      const saved_at = now();
      const detail: ScanDetail = { ...a.result, is_guest: false, scan_id: analysisId, image_url: a.image, created_at: saved_at, recommendation: recommendationFor(a.result.summary), conversation_id: null };
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
    async deleteScan(id) {
      const user = requireUser();
      save(K.scans, scans().filter((s) => !(s.detail.scan_id === id && s.user_id === user.id)));
      save(K.convs, convs().map((c) => (c.scan_id === id ? { ...c, scan_id: null } : c)));
    },
    async scanTrend(limit = 20) {
      const user = requireUser();
      const pts = scans().filter((s) => s.user_id === user.id).slice(0, limit).reverse()
        .map((s) => ({ created_at: s.detail.created_at, total_lesions: s.detail.summary.total_lesions, severity: s.detail.summary.severity }));
      return { points: pts };
    },

    async recommend(analysisId) {
      await sleep(600);
      const user = session();
      const a = analyses.get(analysisId);
      const saved = scans().find((s) => s.detail.scan_id === analysisId);
      const result = a?.result ?? saved?.detail;
      if (!result) throw new ApiRequestError('NOT_FOUND', 'Analisis tidak ditemukan atau sudah kedaluwarsa.', 404);
      const text = recommendationFor(result.summary);
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
        scan_summary: s ? { total_lesions: s.detail.summary.total_lesions, dominant_class: s.detail.summary.dominant_class, severity: s.detail.summary.severity } : null,
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
          detection: { name: 'YOLO (Tim 1) [mock]', version: 'mock-1.0.0' },
          classification: { name: 'MobileNetV4-Hybrid-Medium [mock]', version: 'mock-1.0.0', metrics: { test_accuracy: 0.9912 } },
        },
        summary: { requests: 1520, avg_total_ms: 540, p95_total_ms: 1100, error_rate: 0.004, no_lesion_rate: 0.12, low_confidence_rate: 0.07 },
        class_distribution: ACNE_CLASSES.map((c, i) => ({ class: c, lesion_count: [1800, 260, 4200, 1500, 2100][i], avg_confidence: [0.88, 0.81, 0.89, 0.86, 0.87][i], low_conf_rate: [0.05, 0.12, 0.05, 0.07, 0.06][i] })),
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
