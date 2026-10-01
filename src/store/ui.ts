import { create } from 'zustand';

export interface LoginPrompt { message: string; redirectTo: string }
export interface Toast { id: number; text: string; kind: 'success' | 'error' }

interface UiState {
  loginPrompt: LoginPrompt | null;
  toasts: Toast[];
  openLoginPrompt: (p: LoginPrompt) => void;
  closeLoginPrompt: () => void;
  toast: (text: string, kind?: Toast['kind']) => void;
}

let nextId = 1;

export const useUi = create<UiState>((set) => ({
  loginPrompt: null,
  toasts: [],
  openLoginPrompt: (loginPrompt) => set({ loginPrompt }),
  closeLoginPrompt: () => set({ loginPrompt: null }),
  toast: (text, kind = 'success') => {
    const id = nextId++;
    set((s) => ({ toasts: [...s.toasts, { id, text, kind }] }));
    setTimeout(() => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })), 3500);
  },
}));
