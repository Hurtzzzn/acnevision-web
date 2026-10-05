import type {
  AdminUser, AnalyzeOptions, AnalyzeResponse, AuditLogItem, ConversationItem, ConversationMessages,
  DetectOptions, DetectResponse, Granularity, Me, ModelStats, Paginated, RecommendationResponse, ScanDetail, ScanListItem,
  SendMessageResponse, TrendPoint, UsageStats, UserRole, UserStats, UserStatus,
} from '../types/api';

export interface DateRange { from: string; to: string; granularity: Granularity }

/** Contract implemented by both the HTTP client and the offline mock (docs/05_API_SPEC.md). */
export interface AcneApi {
  /** Guest-safe detection: boxes and counts only, no class information. */
  detect(image: File, opts?: DetectOptions): Promise<DetectResponse>;
  analyze(image: File, opts?: AnalyzeOptions): Promise<AnalyzeResponse>;
  getGradcam(analysisId: string, lesionIdx: number): Promise<string>;

  saveScan(analysisId: string): Promise<{ scan_id: string; saved_at: string }>;
  listScans(page?: number, pageSize?: number): Promise<Paginated<ScanListItem>>;
  getScan(scanId: string): Promise<ScanDetail>;
  deleteScan(scanId: string): Promise<void>;
  scanTrend(limit?: number): Promise<{ points: TrendPoint[] }>;

  recommend(analysisId: string): Promise<RecommendationResponse>;
  listConversations(page?: number): Promise<Paginated<ConversationItem>>;
  createConversation(scanId: string | null, title?: string): Promise<{ conversation_id: string }>;
  getMessages(conversationId: string): Promise<ConversationMessages>;
  sendMessage(conversationId: string, content: string): Promise<SendMessageResponse>;
  deleteConversation(conversationId: string): Promise<void>;

  getMe(): Promise<Me>;
  updateMe(patch: { full_name: string }): Promise<Me>;
  getMyStats(): Promise<UserStats>;

  adminUsage(range: DateRange): Promise<UsageStats>;
  adminModel(range: DateRange): Promise<ModelStats>;
  adminUsers(params: { search?: string; status?: UserStatus | ''; role?: UserRole | ''; page?: number }): Promise<Paginated<AdminUser>>;
  adminUpdateUser(userId: string, patch: { status?: UserStatus; role?: UserRole }): Promise<AdminUser>;
  adminAudit(page?: number): Promise<Paginated<AuditLogItem>>;
}

export class ApiRequestError extends Error {
  constructor(public code: string, message: string, public status = 0, public details?: Record<string, unknown>) {
    super(message);
    this.name = 'ApiRequestError';
  }
}
