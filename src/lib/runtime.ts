import { createClient } from '@supabase/supabase-js';
import { createApiClient, createMockBackend, type AcneApi } from '@acnevision/shared';

const env = import.meta.env;

export const USE_MOCK = env.VITE_USE_MOCK === 'true';

/** Offline backend + auth (only when VITE_USE_MOCK=true). */
export const mock = USE_MOCK ? createMockBackend() : null;

export const supabase =
  !USE_MOCK && env.VITE_SUPABASE_URL && env.VITE_SUPABASE_ANON_KEY
    ? createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY)
    : null;

export const api: AcneApi = mock
  ? mock.api
  : createApiClient({
      baseURL: env.VITE_API_BASE_URL ?? 'http://localhost:8000/api/v1',
      getToken: async () => (await supabase?.auth.getSession())?.data.session?.access_token ?? null,
    });
