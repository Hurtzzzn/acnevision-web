import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiRequestError, COPY, type Me } from '@acnevision/shared';

const h = vi.hoisted(() => ({
  signIn: vi.fn(),
  signOut: vi.fn(),
  getSession: vi.fn(),
  getMe: vi.fn(),
  resetScan: vi.fn(),
}));

vi.mock('../lib/runtime', () => ({
  mock: null,
  supabase: { auth: { signInWithPassword: h.signIn, signOut: h.signOut, getSession: h.getSession, onAuthStateChange: vi.fn() } },
  api: { getMe: h.getMe },
}));
vi.mock('./scan', () => ({ useScan: { getState: () => ({ reset: h.resetScan }) } }));

import { useAuth } from './auth';
import { reportApiError } from '../lib/apiErrors';

const me: Me = { id: 'u1', email: 'sari@mail.com', full_name: 'Sari', avatar_url: null, role: 'user', status: 'active', created_at: '2026-01-01T00:00:00Z' };
const inactive = () => new ApiRequestError('FORBIDDEN', 'Akun tidak aktif.', 403);
const adminOnly = () => new ApiRequestError('FORBIDDEN', 'Hanya admin yang boleh mengakses.', 403);
const SUSPENDED = COPY.auth.errors.accountSuspended;

beforeEach(() => {
  vi.resetAllMocks();
  h.signOut.mockResolvedValue({ error: null });
  h.signIn.mockResolvedValue({ error: null });
  useAuth.setState({ user: null, ready: false, notice: null });
});

describe('login', () => {
  it('signs the session out and rethrows the original error when getMe fails after a correct password', async () => {
    const original = inactive();
    h.getMe.mockRejectedValue(original);
    await expect(useAuth.getState().login('sari@mail.com', 'secret123')).rejects.toBe(original);
    expect(h.signOut).toHaveBeenCalledTimes(1);
    expect(useAuth.getState().user).toBeNull();
  });

  it('still rethrows the original error when signing out fails too', async () => {
    const original = new ApiRequestError('NETWORK_ERROR', 'Tidak dapat terhubung ke server.', 0);
    h.getMe.mockRejectedValue(original);
    h.signOut.mockRejectedValue(new Error('signOut broke'));
    await expect(useAuth.getState().login('sari@mail.com', 'secret123')).rejects.toBe(original);
  });

  it('keeps the session when everything works', async () => {
    h.getMe.mockResolvedValue(me);
    await expect(useAuth.getState().login('sari@mail.com', 'secret123')).resolves.toBe(me);
    expect(h.signOut).not.toHaveBeenCalled();
    expect(useAuth.getState().user).toBe(me);
  });

  it('does not call the API or sign out when the password is wrong', async () => {
    h.signIn.mockResolvedValue({ error: { message: 'Invalid login credentials' } });
    await expect(useAuth.getState().login('sari@mail.com', 'nope')).rejects.toMatchObject({ code: 'UNAUTHORIZED' });
    expect(h.getMe).not.toHaveBeenCalled();
    expect(h.signOut).not.toHaveBeenCalled();
  });
});

describe('a signed-in account that gets deactivated', () => {
  beforeEach(() => useAuth.setState({ user: me }));

  it('is signed out, with the reason left for the login page', () => {
    reportApiError(inactive());
    const s = useAuth.getState();
    expect(s.user).toBeNull();
    expect(s.notice).toBe(SUSPENDED);
    expect(h.signOut).toHaveBeenCalledTimes(1);
    expect(h.resetScan).toHaveBeenCalledTimes(1);
  });

  it('is NOT signed out by the 403 for "admins only"', () => {
    reportApiError(adminOnly());
    expect(useAuth.getState().user).toBe(me);
    expect(h.signOut).not.toHaveBeenCalled();
    expect(useAuth.getState().notice).toBeNull();
  });

  it('is not signed out by other failures', () => {
    reportApiError(new ApiRequestError('UNAUTHORIZED', 'Silakan masuk terlebih dahulu.', 401));
    reportApiError(new ApiRequestError('FORBIDDEN', 'Akun tidak aktif.', 500));
    reportApiError(new ApiRequestError('NETWORK_ERROR', 'Tidak dapat terhubung ke server.', 0));
    expect(useAuth.getState().user).toBe(me);
    expect(h.signOut).not.toHaveBeenCalled();
  });
});

describe('when nobody is signed in', () => {
  it('ignores a deactivated-account answer (a login in progress handles its own failure)', () => {
    reportApiError(inactive());
    expect(useAuth.getState().notice).toBeNull();
    expect(h.signOut).not.toHaveBeenCalled();
  });

  it('clearNotice removes the notice', () => {
    useAuth.setState({ notice: SUSPENDED });
    useAuth.getState().clearNotice();
    expect(useAuth.getState().notice).toBeNull();
  });
});

describe('init with a saved session of a deactivated account', () => {
  it('ends the session instead of leaving it hanging, and leaves the reason for the login page', async () => {
    h.getSession.mockResolvedValue({ data: { session: { access_token: 't' } } });
    h.getMe.mockRejectedValue(inactive());
    await useAuth.getState().init();
    const s = useAuth.getState();
    expect(s.user).toBeNull();
    expect(s.ready).toBe(true);
    expect(s.notice).toBe(SUSPENDED);
    expect(h.signOut).toHaveBeenCalledTimes(1);
  });

  it('does not touch the session when getMe fails for another reason', async () => {
    h.getSession.mockResolvedValue({ data: { session: { access_token: 't' } } });
    h.getMe.mockRejectedValue(new ApiRequestError('NETWORK_ERROR', 'Tidak dapat terhubung ke server.', 0));
    await useAuth.getState().init();
    expect(useAuth.getState().user).toBeNull();
    expect(useAuth.getState().notice).toBeNull();
    expect(h.signOut).not.toHaveBeenCalled();
  });
});
