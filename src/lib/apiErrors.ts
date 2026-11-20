import type { ApiRequestError } from '@acnevision/shared';

type Listener = (err: ApiRequestError) => void;

let listener: Listener | null = null;

/**
 * A single place that hears about every failed API call. The api client reports here (see runtime.ts) and the auth store listens,
 * so the two never import each other.
 */
export function setApiErrorListener(fn: Listener | null): void {
  listener = fn;
}

export function reportApiError(err: ApiRequestError): void {
  try {
    listener?.(err);
  } catch {
    // A listener must never turn into a second failure for the request that is already failing.
  }
}
