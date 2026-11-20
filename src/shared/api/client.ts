import axios, { AxiosError, type AxiosInstance } from 'axios';
import type { ApiError } from '../types/api';
import { ApiRequestError, type AcneApi } from './types';

export interface ApiClientOptions {
  baseURL: string;
  getToken: () => Promise<string | null> | string | null;
  /** Sees every failed request (already turned into an ApiRequestError) just before it is thrown to the caller. Must not throw. */
  onError?: (err: ApiRequestError) => void;
}

/** Drops params that are empty ('' / null / undefined), so a cleared filter is not sent as `?status=`. 0 and false are kept. */
export function compactParams<T extends object>(params: T | undefined): Partial<T> | undefined {
  if (!params) return undefined;
  const kept = Object.entries(params).filter(([, v]) => v !== '' && v !== null && v !== undefined);
  return Object.fromEntries(kept) as Partial<T>;
}

function toRequestError(err: unknown): ApiRequestError {
  if (err instanceof AxiosError) {
    const body = err.response?.data as ApiError | undefined;
    if (body?.error) {
      return new ApiRequestError(body.error.code, body.error.message, err.response?.status, body.error.details);
    }
    if (!err.response) return new ApiRequestError('NETWORK_ERROR', 'Tidak dapat terhubung ke server.', 0);
    return new ApiRequestError('INTERNAL_ERROR', 'Terjadi kesalahan pada server.', err.response.status);
  }
  return new ApiRequestError('INTERNAL_ERROR', 'Terjadi kesalahan tak terduga.');
}

export function createApiClient({ baseURL, getToken, onError }: ApiClientOptions): AcneApi {
  const http: AxiosInstance = axios.create({ baseURL, timeout: 60_000 });

  http.interceptors.request.use(async (config) => {
    const token = await getToken();
    if (token) config.headers.set('Authorization', `Bearer ${token}`);
    return config;
  });

  async function call<T>(fn: () => Promise<{ data: T }>): Promise<T> {
    try {
      return (await fn()).data;
    } catch (err) {
      const failure = toRequestError(err);
      onError?.(failure);
      throw failure;
    }
  }

  return {
    detect(image, opts = {}) {
      const form = new FormData();
      form.append('image', image);
      form.append('source', opts.source ?? 'web');
      form.append('input_method', opts.input_method ?? 'upload');
      form.append('mode', opts.mode ?? 'capture');
      return call(() => http.post('/detect', form));
    },
    analyze(image, opts = {}) {
      const form = new FormData();
      form.append('image', image);
      form.append('source', opts.source ?? 'web');
      form.append('input_method', opts.input_method ?? 'upload');
      form.append('include_gradcam', String(opts.include_gradcam ?? false));
      return call(() => http.post('/analyze', form, { signal: opts.signal }));
    },
    async getGradcam(analysisId) {
      const res = await call<{ gradcam_png_base64: string }>(() => http.get(`/analyze/${analysisId}/gradcam`));
      return res.gradcam_png_base64;
    },

    saveScan: (analysisId) => call(() => http.post('/scans', { analysis_id: analysisId })),
    listScans: (page = 1, pageSize = 10) => call(() => http.get('/scans', { params: { page, page_size: pageSize } })),
    getScan: (id) => call(() => http.get(`/scans/${id}`)),
    async deleteScan(id) { await call(() => http.delete(`/scans/${id}`)); },
    scanTrend: (limit = 20) => call(() => http.get('/scans/trend', { params: { limit } })),

    recommend: (analysisId) => call(() => http.post('/chat/recommendation', { analysis_id: analysisId })),
    listConversations: (page = 1) => call(() => http.get('/chat/conversations', { params: { page } })),
    createConversation: (scanId, title) => call(() => http.post('/chat/conversations', { scan_id: scanId, title })),
    getMessages: (id) => call(() => http.get(`/chat/conversations/${id}/messages`)),
    sendMessage: (id, content) => call(() => http.post(`/chat/conversations/${id}/messages`, { content })),
    async deleteConversation(id) { await call(() => http.delete(`/chat/conversations/${id}`)); },

    getMe: () => call(() => http.get('/me')),
    updateMe: (patch) => call(() => http.patch('/me', patch)),
    getMyStats: () => call(() => http.get('/me/stats')),

    adminUsage: (r) => call(() => http.get('/admin/stats/usage', { params: r })),
    adminModel: (r) => call(() => http.get('/admin/stats/model', { params: r })),
    adminUsers: (p) => call(() => http.get('/admin/users', { params: compactParams(p) })),
    adminUpdateUser: (id, patch) => call(() => http.patch(`/admin/users/${id}`, patch)),
    adminAudit: (page = 1) => call(() => http.get('/admin/audit-logs', { params: { page } })),
  };
}
