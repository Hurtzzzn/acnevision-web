import { COPY } from '@acnevision/shared';

export const PASSWORD_MIN_LENGTH = 8; // FR-AUTH-01

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Each validator returns an error message, or null when the value is fine. */
export function validateName(value: string): string | null {
  return value.trim() ? null : COPY.auth.errors.nameRequired;
}

export function validateEmail(value: string): string | null {
  const v = value.trim();
  if (!v) return COPY.auth.errors.emailRequired;
  return EMAIL_RE.test(v) ? null : COPY.auth.errors.emailInvalid;
}

/** Login only checks presence: the length rule applies to new passwords, not to existing accounts. */
export function validateLoginPassword(value: string): string | null {
  return value ? null : COPY.auth.errors.passwordRequired;
}

export function validateNewPassword(value: string): string | null {
  if (!value) return COPY.auth.errors.passwordRequired;
  return value.length >= PASSWORD_MIN_LENGTH ? null : COPY.auth.errors.passwordShort;
}
