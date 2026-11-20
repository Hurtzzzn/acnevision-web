import { beforeEach, describe, expect, it, vi } from 'vitest';
import axios, { AxiosError, type AxiosInstance, type InternalAxiosRequestConfig } from 'axios';
import { createClient } from '@supabase/supabase-js';
import { compactParams, createApiClient } from './client';
import { ApiRequestError } from './types';

describe('compactParams', () => {
  it('drops empty strings, null and undefined', () => {
    expect(compactParams({ search: '', status: '', role: 'admin', page: 1, a: null, b: undefined })).toEqual({ role: 'admin', page: 1 });
  });

  it('keeps 0 and false, which are real values', () => {
    expect(compactParams({ page: 0, flag: false, text: '' })).toEqual({ page: 0, flag: false });
  });

  it('passes undefined through', () => expect(compactParams(undefined)).toBeUndefined());
});

/** Stands in for the axios instance, so a test sees exactly what the client hands to axios and can make it fail. */
function fakeHttp() {
  const http = { get: vi.fn(), interceptors: { request: { use: vi.fn() } } };
  vi.spyOn(axios, 'create').mockReturnValue(http as unknown as AxiosInstance);
  return http;
}

const page = { items: [], page: 1, page_size: 20, total: 0 };

describe('api client', () => {
  beforeEach(() => vi.restoreAllMocks());

  it('does not send empty admin user filters', async () => {
    const http = fakeHttp();
    http.get.mockResolvedValue({ data: page });
    await createApiClient({ baseURL: 'http://api', getToken: () => null }).adminUsers({ search: '', status: '', role: '', page: 1 });
    expect(http.get).toHaveBeenCalledWith('/admin/users', { params: { page: 1 } });
  });

  it('sends the filters that are set', async () => {
    const http = fakeHttp();
    http.get.mockResolvedValue({ data: page });
    await createApiClient({ baseURL: 'http://api', getToken: () => null }).adminUsers({ search: 'sari', status: 'suspended', role: '', page: 2 });
    expect(http.get).toHaveBeenCalledWith('/admin/users', { params: { search: 'sari', status: 'suspended', page: 2 } });
  });

  it('reports a failed request to onError, then still throws it to the caller', async () => {
    const http = fakeHttp();
    const response = {
      status: 403, statusText: 'Forbidden', headers: {}, config: {} as InternalAxiosRequestConfig,
      data: { error: { code: 'FORBIDDEN', message: 'Akun tidak aktif.' } },
    };
    http.get.mockRejectedValue(new AxiosError('Request failed', 'ERR_BAD_REQUEST', undefined, undefined, response));
    const reported: ApiRequestError[] = [];
    const api = createApiClient({ baseURL: 'http://api', getToken: () => null, onError: (e) => reported.push(e) });

    await expect(api.getMe()).rejects.toMatchObject({ status: 403, code: 'FORBIDDEN', message: 'Akun tidak aktif.' });
    expect(reported).toHaveLength(1);
    expect(reported[0]).toBeInstanceOf(ApiRequestError);
    expect(reported[0].status).toBe(403);
  });
});

const NGROK_HEADER = 'ngrok-skip-browser-warning';

/** Real axios instance (defaults, header merging and all) whose adapter records each request instead of hitting the network. */
function captureRequests() {
  const seen: InternalAxiosRequestConfig[] = [];
  const realCreate = axios.create.bind(axios);
  vi.spyOn(axios, 'create').mockImplementation((config) =>
    realCreate({
      ...config,
      adapter: async (cfg) => {
        seen.push(cfg);
        return { data: {}, status: 200, statusText: 'OK', headers: {}, config: cfg };
      },
    }),
  );
  return seen;
}

describe('ngrok-skip-browser-warning header', () => {
  beforeEach(() => vi.restoreAllMocks());

  const photo = new File(['x'], 'face.jpg', { type: 'image/jpeg' });

  it('is sent on JSON requests, with and without a token', async () => {
    const seen = captureRequests();
    await createApiClient({ baseURL: 'http://api', getToken: () => null }).getMe();
    await createApiClient({ baseURL: 'http://api', getToken: () => 'tok' }).saveScan('a1');

    expect(seen).toHaveLength(2);
    for (const cfg of seen) expect(cfg.headers.get(NGROK_HEADER)).toBe('true');
    expect(seen[0].headers.get('Authorization')).toBeFalsy();
    expect(seen[1].headers.get('Authorization')).toBe('Bearer tok');
  });

  it('is sent on multipart uploads (detect and analyze) next to the token', async () => {
    const seen = captureRequests();
    const api = createApiClient({ baseURL: 'http://api', getToken: async () => 'tok' });
    await api.detect(photo);
    await api.analyze(photo, { include_gradcam: true });

    expect(seen.map((c) => c.url)).toEqual(['/detect', '/analyze']);
    for (const cfg of seen) {
      expect(cfg.data).toBeInstanceOf(FormData);
      expect(cfg.headers.get(NGROK_HEADER)).toBe('true');
      expect(cfg.headers.get('Authorization')).toBe('Bearer tok');
    }
  });

  it('is sent on every kind of call (GET, POST, PATCH, DELETE)', async () => {
    const seen = captureRequests();
    const api = createApiClient({ baseURL: 'http://api', getToken: () => null });
    await api.listScans();
    await api.recommend('a1');
    await api.updateMe({ full_name: 'Sari' });
    await api.deleteScan('s1');

    expect(seen.map((c) => c.method)).toEqual(['get', 'post', 'patch', 'delete']);
    for (const cfg of seen) expect(cfg.headers.get(NGROK_HEADER)).toBe('true');
  });

  it('does not leak into global axios defaults, so other axios users never get it', () => {
    const before = JSON.stringify(axios.defaults.headers);
    createApiClient({ baseURL: 'http://api', getToken: () => null });
    expect(JSON.stringify(axios.defaults.headers)).toBe(before);
    expect(JSON.stringify(axios.defaults.headers).toLowerCase()).not.toContain(NGROK_HEADER);
  });

  it('is not sent by the Supabase client', async () => {
    createApiClient({ baseURL: 'http://api', getToken: () => null }); // creating the API client must not affect Supabase

    const requests: Request[] = [];
    const stubFetch: typeof fetch = async (input, init) => {
      requests.push(new Request(input, init));
      return new Response(JSON.stringify({ error: 'invalid_grant', error_description: 'stub' }), {
        status: 400,
        headers: { 'content-type': 'application/json' },
      });
    };
    const supabase = createClient('https://example.supabase.co', 'anon-key', {
      auth: { persistSession: false, autoRefreshToken: false },
      global: { fetch: stubFetch },
    });
    await supabase.auth.signInWithPassword({ email: 'a@b.co', password: 'secret123' });

    expect(requests.length).toBeGreaterThan(0);
    for (const req of requests) {
      expect(new URL(req.url).hostname).toBe('example.supabase.co');
      expect(req.headers.has(NGROK_HEADER)).toBe(false);
    }
  });
});
