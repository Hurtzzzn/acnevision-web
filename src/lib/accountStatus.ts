import { ApiRequestError } from '@acnevision/shared';

/**
 * The backend answers HTTP 403 "Akun tidak aktif." for a suspended account. The very same 403 status also means "admins only"
 * ("Hanya admin yang boleh mengakses."), which must not sign anyone out, so the message is what tells them apart.
 */
const INACTIVE_ACCOUNT_MESSAGE = /^akun tidak aktif\.?$/i;

export function isInactiveAccountError(err: unknown): err is ApiRequestError {
  return err instanceof ApiRequestError && err.status === 403 && INACTIVE_ACCOUNT_MESSAGE.test(err.message.trim());
}
