import { describe, expect, it } from 'vitest';
import { authPath, DEFAULT_AFTER_LOGIN, NEW_ANALYSIS_PATH, safeRedirect } from './redirect';

describe('redirect destinations', () => {
  it('sends users to the dashboard by default and to /analyze for a new analysis', () => {
    expect(DEFAULT_AFTER_LOGIN).toBe('/dashboard');
    expect(NEW_ANALYSIS_PATH).toBe('/analyze');
  });

  it('lets a guest opening /analyze come back to it after login or register', () => {
    expect(safeRedirect(NEW_ANALYSIS_PATH)).toBe('/analyze');
    expect(authPath('/login', NEW_ANALYSIS_PATH)).toBe('/login?redirectTo=%2Fanalyze');
    expect(authPath('/register', NEW_ANALYSIS_PATH)).toBe('/register?redirectTo=%2Fanalyze');
  });

  it('drops unsafe or looping destinations', () => {
    expect(authPath('/login', '//evil.example')).toBe('/login');
    expect(authPath('/login', 'https://evil.example')).toBe('/login');
    expect(authPath('/login', '/login')).toBe('/login');
    expect(authPath('/login', null)).toBe('/login');
  });
});
