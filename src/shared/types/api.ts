export type AcneClass = 'Blackheads' | 'Cyst' | 'Papules' | 'Pustules' | 'Whiteheads';
export type Severity = 'clear' | 'mild' | 'moderate' | 'severe';

export interface BBox { x1: number; y1: number; x2: number; y2: number }

/** Detection only (guest path, POST /detect). Never carries class information (FR-SCAN-16). */
export interface DetectedLesion {
  idx: number;
  bbox: BBox;
  det_confidence: number;
  label: 'Jerawat';
}

export interface DetectSummary {
  total_lesions: number;
  severity: Severity;
  severity_is_estimate: boolean;
}

export interface DetectResponse {
  detection_id: string;
  is_guest: boolean;
  image: { width: number; height: number };
  lesions: DetectedLesion[];
  summary: DetectSummary;
  timing_ms: { detection: number };
  model_version: string;
  disclaimer: string;
  advice: string;
  upgrade: { message: string; unlocks: string[] } | null;
}

export interface Lesion {
  idx: number;
  bbox: BBox;
  det_confidence: number;
  predicted_class: AcneClass;
  class_confidence: number;
  probabilities: Record<AcneClass, number>;
  is_low_confidence: boolean;
  gradcam_png_base64?: string | null;
}

export interface AnalysisSummary {
  total_lesions: number;
  class_counts: Record<AcneClass, number>;
  dominant_class: AcneClass | null;
  avg_confidence: number | null;
  low_confidence_count: number;
  severity: Severity;
  severity_is_estimate: boolean;
}

export interface AnalyzeResponse {
  analysis_id: string;
  is_guest: boolean;
  image: { width: number; height: number };
  lesions: Lesion[];
  summary: AnalysisSummary;
  timing_ms: { detection: number; classification: number; total: number };
  model_versions: { detection: string; classification: string };
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
  dominant_class: AcneClass | null;
  severity: Severity;
  avg_confidence: number | null;
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
    most_detected_class: AcneClass | null;
    avg_confidence: number | null;
  };
  recent: Array<{
    scan_id: string;
    created_at: string;
    thumbnail_url: string;
    total_lesions: number;
    classes_present: AcneClass[];
    severity: Severity;
  }>;
}

export interface TrendPoint { created_at: string; total_lesions: number; severity: Severity }

export interface ConversationItem {
  conversation_id: string;
  title: string;
  scan_id: string | null;
  last_message_preview: string;
  updated_at: string;
}

export interface ConversationMessages {
  conversation_id: string;
  scan_summary: { total_lesions: number; dominant_class: AcneClass | null; severity: Severity } | null;
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
    detection: { name: string; version: string; metrics?: Record<string, number> };
    classification: { name: string; version: string; metrics?: Record<string, number> };
  };
  summary: {
    requests: number; avg_total_ms: number; p95_total_ms: number;
    error_rate: number; no_lesion_rate: number; low_confidence_rate: number;
  };
  class_distribution: { class: AcneClass; lesion_count: number; avg_confidence: number; low_conf_rate: number }[];
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
}
