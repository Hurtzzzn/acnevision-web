import { create } from 'zustand';
import { ApiRequestError, COPY, type Me } from '@acnevision/shared';
import { api, mock, supabase } from '../lib/runtime';
import { setApiErrorListener } from '../lib/apiErrors';
import { isInactiveAccountError } from '../lib/accountStatus';
import { useScan } from './scan';

interface AuthState {
  user: Me | null;
  ready: boolean;
  /** Why the user was signed out without asking (the account was deactivated). The login page shows it once, then clears it. */
  notice: string | null;
  init: () => Promise<void>;
  login: (email: string, password: string) => Promise<Me>;
  register: (email: string, password: string, fullName: string) => Promise<Me | null>;
  loginWithGoogle: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  logout: () => Promise<void>;
  /** An admin deactivated the signed-in account: end the session and leave the reason in `notice`. No-op when nobody is signed in. */
  endDeactivatedSession: () => void;
  clearNotice: () => void;
  setUser: (user: Me) => void;
}

function authError(message: string, code = 'UNAUTHORIZED') {
  return new ApiRequestError(code, message);
}

/** Ends the Supabase session. A failure is ignored: the caller clears its own state either way, and must keep its own error. */
async function endSupabaseSession() {
  try {
    await supabase?.auth.signOut();
  } catch {
    // nothing more can be done about it here
  }
}

export const useAuth = create<AuthState>((set, get) => ({
  user: null,
  ready: false,
  notice: null,

  async init() {
    try {
      if (mock) {
        set({ user: mock.auth.current() });
      } else if (supabase) {
        const { data } = await supabase.auth.getSession();
        set({ user: data.session ? await api.getMe() : null });
        supabase.auth.onAuthStateChange(async (_e, session) => {
          if (!session) useScan.getState().reset();
          set({ user: session ? await api.getMe().catch(() => null) : null });
        });
      }
    } catch (err) {
      if (isInactiveAccountError(err)) {
        // The saved session belongs to an account that has been deactivated: end it rather than leave it hanging.
        set({ notice: COPY.auth.errors.accountSuspended });
        void endSupabaseSession(); // not awaited: the app must not wait on it to become ready
      }
      set({ user: null });
    } finally {
      set({ ready: true });
    }
  },

  async login(email, password) {
    if (mock) {
      const me = await mock.auth.login(email, password);
      set({ user: me });
      return me;
    }
    if (!supabase) throw authError('Supabase belum dikonfigurasi.', 'INTERNAL_ERROR');
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw authError('Email atau password salah.');
    let me: Me;
    try {
      me = await api.getMe();
    } catch (err) {
      // The password was right but the app refused the account (for example it is deactivated): do not leave a session behind.
      await endSupabaseSession();
      throw err;
    }
    set({ user: me });
    return me;
  },

  async register(email, password, fullName) {
    if (mock) {
      const me = await mock.auth.register(email, password, fullName);
      set({ user: me });
      return me;
    }
    if (!supabase) throw authError('Supabase belum dikonfigurasi.', 'INTERNAL_ERROR');
    const { data, error } = await supabase.auth.signUp({ email, password, options: { data: { full_name: fullName } } });
    if (error) throw authError(error.message, 'VALIDATION_ERROR');
    if (!data.session) return null; // email confirmation required
    const me = await api.getMe();
    set({ user: me });
    return me;
  },

  async loginWithGoogle() {
    if (!supabase) throw authError('Login Google belum tersedia saat ini.', 'INTERNAL_ERROR');
    const { error } = await supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: window.location.origin } });
    if (error) throw authError(error.message, 'INTERNAL_ERROR');
  },

  async resetPassword(email) {
    if (mock) return; // demo: pretend an email was sent
    if (!supabase) throw authError('Supabase belum dikonfigurasi.', 'INTERNAL_ERROR');
    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${window.location.origin}/login` });
    if (error) throw authError(error.message, 'INTERNAL_ERROR');
  },

  async logout() {
    if (mock) mock.auth.logout();
    else await supabase?.auth.signOut();
    // The analysis and its photo belong to the signed-in user: drop them (memory and sessionStorage) on logout.
    useScan.getState().reset();
    set({ user: null });
  },

  endDeactivatedSession() {
    if (!get().user) return; // nobody signed in, or a login that is still being decided (it handles its own failure)
    useScan.getState().reset();
    // State first: the route guards then send the user to /login, where the notice explains why.
    set({ user: null, notice: COPY.auth.errors.accountSuspended });
    if (mock) mock.auth.logout();
    else void endSupabaseSession();
  },

  clearNotice: () => set({ notice: null }),

  setUser: (user) => set({ user }),
}));

// Any request answered with 403 "Akun tidak aktif." means the signed-in account was deactivated meanwhile. Other 403s
// (such as "Hanya admin yang boleh mengakses.") are not about the account's status and are left alone.
setApiErrorListener((err) => {
  if (isInactiveAccountError(err)) useAuth.getState().endDeactivatedSession();
});
