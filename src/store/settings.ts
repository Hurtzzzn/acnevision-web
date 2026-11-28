import { create } from 'zustand';

const SETTINGS_KEY = 'acnevision.userSettings';

export interface UserSettingsState {
  reminderEnabled: boolean;
  reminderDay: string;
  reminderTime: string;
  photoConsentMode: 'per_photo' | 'always_ask';
  cameraIntroSeen: boolean;
  setReminderEnabled: (enabled: boolean) => void;
  setReminderSchedule: (day: string, time: string) => void;
  setPhotoConsentMode: (mode: 'per_photo' | 'always_ask') => void;
  setCameraIntroSeen: (seen: boolean) => void;
}

interface PersistedSettings {
  reminderEnabled: boolean;
  reminderDay: string;
  reminderTime: string;
  photoConsentMode: 'per_photo' | 'always_ask';
  cameraIntroSeen: boolean;
}

const DEFAULTS: PersistedSettings = {
  reminderEnabled: true,
  reminderDay: 'Setiap Kamis',
  reminderTime: '08.00',
  photoConsentMode: 'per_photo',
  cameraIntroSeen: false,
};

function readSettings(): PersistedSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return DEFAULTS;
    return { ...DEFAULTS, ...(JSON.parse(raw) as Partial<PersistedSettings>) };
  } catch {
    return DEFAULTS;
  }
}

function writeSettings(s: PersistedSettings) {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(s));
  } catch {
    // ignore storage quota errors
  }
}

const initial = readSettings();

export const useSettings = create<UserSettingsState>((set, get) => ({
  ...initial,
  setReminderEnabled: (reminderEnabled) => {
    set({ reminderEnabled });
    const s = get();
    writeSettings({
      reminderEnabled,
      reminderDay: s.reminderDay,
      reminderTime: s.reminderTime,
      photoConsentMode: s.photoConsentMode,
      cameraIntroSeen: s.cameraIntroSeen,
    });
  },
  setReminderSchedule: (reminderDay, reminderTime) => {
    set({ reminderDay, reminderTime });
    const s = get();
    writeSettings({
      reminderEnabled: s.reminderEnabled,
      reminderDay,
      reminderTime,
      photoConsentMode: s.photoConsentMode,
      cameraIntroSeen: s.cameraIntroSeen,
    });
  },
  setPhotoConsentMode: (photoConsentMode) => {
    set({ photoConsentMode });
    const s = get();
    writeSettings({
      reminderEnabled: s.reminderEnabled,
      reminderDay: s.reminderDay,
      reminderTime: s.reminderTime,
      photoConsentMode,
      cameraIntroSeen: s.cameraIntroSeen,
    });
  },
  setCameraIntroSeen: (cameraIntroSeen) => {
    set({ cameraIntroSeen });
    const s = get();
    writeSettings({
      reminderEnabled: s.reminderEnabled,
      reminderDay: s.reminderDay,
      reminderTime: s.reminderTime,
      photoConsentMode: s.photoConsentMode,
      cameraIntroSeen,
    });
  },
}));
