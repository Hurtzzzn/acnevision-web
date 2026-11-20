import { beforeEach, describe, expect, it, vi } from 'vitest';
import axios, { AxiosError, type AxiosInstance, type InternalAxiosRequestConfig } from 'axios';
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
