/** Fixed order, never re-sort. Without lesions there is no severity (null), never a "clear" level. */
export type Severity = 'mild' | 'moderate' | 'severe' | 'very_severe';

export interface ModelInfoEntry { name: string; version: string }

export interface BBox { x1: number; y1: number; x2: number; y2: number }

/** Detector output only. A lesion never carries class information. */
export interface DetectedLesion {
  idx: number;
  bbox: BBox;
  det_confidence: number;
  label: 'Jerawat';
}

/** Lesions come from the detector alone (boxes and count); the classifier never contributes to them. */
export type Lesion = DetectedLesion;

export interface DetectSummary {
  total_lesions: number;
  /** Estimate from the lesion count (Hayashi). null when total_lesions is 0. */
  severity: Severity | null;
  severity_is_estimate: true;
}

/** Guest path, POST /detect. Never carries classification, probabilities, or Grad-CAM (FR-SCAN-16). */
export interface DetectResponse {
  detection_id: string;
  is_guest: boolean;
  image: { width: number; height: number };
  lesions: DetectedLesion[];
  summary: DetectSummary;
  timing_ms: { detection: number };
  model_info: { detection: ModelInfoEntry };
  disclaimer: string;
  advice: string;
  upgrade: { message: string; unlocks: string[] } | null;
}

/** Severity of the whole photo from the AI model (signed-in users only). */
export interface Classification {
  severity: Severity;
  confidence: number;
  probabilities: Record<Severity, number>;
  is_low_confidence: boolean;
  /** One heatmap for the whole photo. */
  gradcam_png_base64?: string | null;
}

export interface AnalyzeResponse {
  analysis_id: string;
  is_guest: false;
  image: { width: number; height: number };
  lesions: Lesion[];
  summary: { total_lesions: number };
  /** null when there are no lesions: the classifier is not run. */
  classification: Classification | null;
  timing_ms: { detection: number; classification: number; total: number };
  model_info: { detection: ModelInfoEntry; classification: ModelInfoEntry };
  disclaimer: string;
}

export interface RecommendationResponse {
  recommendation: string;
  is_fallback: boolean;
  conversation_id: string | null;
  can_follow_up: boolean;
  disclaimer: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  is_fallback?: boolean;
  created_at: string;
}

export interface Paginated<T> { items: T[]; page: number; page_size: number; total: number }

export interface ApiError { error: { code: string; message: string; details?: Record<string, unknown> } }

export type UserRole = 'user' | 'admin';
export type UserStatus = 'active' | 'suspended';

export interface Me {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  role: UserRole;
  status: UserStatus;
  created_at: string;
}

export interface ScanListItem {
  scan_id: string;
  created_at: string;
  thumbnail_url: string | null;
  total_lesions: number;
  /** Severity from the AI model. null for a scan without lesions. */
  severity: Severity | null;
  severity_confidence: number | null;
}

export interface ScanDetail extends AnalyzeResponse {
  scan_id: string;
  image_url: string;
  created_at: string;
  recommendation: string | null;
  conversation_id: string | null;
}

export interface UserStats {
  totals: {
    analyses: number;
    total_lesions: number;
    latest_severity: Severity | null;
  };
  recent: Array<{
    scan_id: string;
    created_at: string;
    thumbnail_url: string;
    total_lesions: number;
    severity: Severity | null;
  }>;
}

export interface TrendPoint { created_at: string; total_lesions: number; severity: Severity | null }

export interface ConversationItem {
  conversation_id: string;
  title: string;
  scan_id: string | null;
  last_message_preview: string;
  updated_at: string;
}

export interface ConversationMessages {
  conversation_id: string;
  scan_summary: { total_lesions: number; severity: Severity | null } | null;
  messages: ChatMessage[];
}

export interface SendMessageResponse {
  user_message: ChatMessage;
  assistant_message: ChatMessage;
  disclaimer: string;
}

export type Granularity = 'day' | 'week' | 'month';

export interface UsageStats {
  totals: {
    scans: number; guest_scans: number; user_scans: number;
    registered_users: number; new_users: number; active_users: number;
  };
  series: { period: string; guest_scans: number; user_scans: number; total_scans: number; new_users: number }[];
}

export interface ModelStats {
  active_models: {
    detection: ModelInfoEntry & { metrics?: Record<string, number> };
    /** `metrics` may carry `macro_f1` and `accuracy` (4 classes), both as 0..1 fractions. */
    classification: ModelInfoEntry & { metrics?: Record<string, number> };
  };
  summary: {
    requests: number; avg_total_ms: number; p95_total_ms: number;
    error_rate: number; no_lesion_rate: number; low_confidence_rate: number;
  };
  severity_distribution: { severity: Severity; scan_count: number; avg_confidence: number; low_conf_rate: number }[];
  series: {
    period: string; avg_detection_ms: number; avg_classification_ms: number; avg_total_ms: number;
    error_rate: number; low_confidence_rate: number; avg_confidence: number;
  }[];
}

export interface AdminUser {
  id: string; email: string; full_name: string | null; role: UserRole; status: UserStatus;
  created_at: string; last_seen_at: string | null; saved_scans: number;
}

export interface AuditLogItem {
  id: number; admin_email: string; action: string; target_email: string | null;
  details: Record<string, unknown>; created_at: string;
}

export interface DetectOptions {
  source?: 'web' | 'mobile';
  input_method?: 'camera' | 'upload';
  mode?: 'capture' | 'preview';
}

export interface AnalyzeOptions {
  source?: 'web' | 'mobile';
  input_method?: 'camera' | 'upload';
  include_gradcam?: boolean;
  /** Lets the caller cancel the request (the Cancel button on the analysis page). */
  signal?: AbortSignal;
}
