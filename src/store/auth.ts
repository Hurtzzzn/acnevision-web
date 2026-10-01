import { create } from 'zustand';
import { ApiRequestError, type Me } from '@acnevision/shared';
import { api, mock, supabase } from '../lib/runtime';

interface AuthState {
  user: Me | null;
  ready: boolean;
  init: () => Promise<void>;
  login: (email: string, password: string) => Promise<Me>;
  register: (email: string, password: string, fullName: string) => Promise<Me | null>;
  loginWithGoogle: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  logout: () => Promise<void>;
  setUser: (user: Me) => void;
}

function authError(message: string, code = 'UNAUTHORIZED') {
  return new ApiRequestError(code, message);
}

export const useAuth = create<AuthState>((set) => ({
  user: null,
  ready: false,

  async init() {
    try {
      if (mock) {
        set({ user: mock.auth.current() });
      } else if (supabase) {
        const { data } = await supabase.auth.getSession();
        set({ user: data.session ? await api.getMe() : null });
        supabase.auth.onAuthStateChange(async (_e, session) => {
          set({ user: session ? await api.getMe().catch(() => null) : null });
        });
      }
    } catch {
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
    const me = await api.getMe();
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
    if (!supabase) throw authError('Login Google hanya tersedia dengan Supabase (bukan mode demo).', 'INTERNAL_ERROR');
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
    set({ user: null });
  },

  setUser: (user) => set({ user }),
}));
