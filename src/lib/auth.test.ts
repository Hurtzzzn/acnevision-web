import { describe, expect, it } from 'vitest';
import { authPath, safeRedirect } from './redirect';
import { validateEmail, validateLoginPassword, validateName, validateNewPassword } from './authForm';

describe('safeRedirect', () => {
  it('keeps internal paths with query and hash', () => {
    expect(safeRedirect('/scan')).toBe('/scan');
    expect(safeRedirect('/history?page=2#top')).toBe('/history?page=2#top');
  });

  it('rejects external, protocol-relative, and malformed targets', () => {
    for (const bad of [null, undefined, '', 'scan', 'https://evil.com', '//evil.com', '/\\evil.com', '/\t/evil.com', 'javascript:alert(1)']) {
      expect(safeRedirect(bad)).toBeNull();
    }
  });

  it('rejects auth pages so a login cannot loop', () => {
    expect(safeRedirect('/login')).toBeNull();
    expect(safeRedirect('/register?redirectTo=%2Fscan')).toBeNull();
  });
});

describe('authPath', () => {
  it('carries a safe destination and drops an unsafe one', () => {
    expect(authPath('/login', '/scan')).toBe('/login?redirectTo=%2Fscan');
    expect(authPath('/register', 'https://evil.com')).toBe('/register');
    expect(authPath('/login')).toBe('/login');
  });
});

describe('auth form validation', () => {
  it('validates email format', () => {
    expect(validateEmail('')).not.toBeNull();
    expect(validateEmail('kamu@')).not.toBeNull();
    expect(validateEmail('kamu@email.com')).toBeNull();
  });

  it('requires 8+ characters only for new passwords', () => {
    expect(validateNewPassword('1234567')).not.toBeNull();
    expect(validateNewPassword('12345678')).toBeNull();
    expect(validateLoginPassword('abc')).toBeNull();
    expect(validateLoginPassword('')).not.toBeNull();
  });

  it('requires a name', () => {
    expect(validateName('  ')).not.toBeNull();
    expect(validateName('Sari')).toBeNull();
  });
});
