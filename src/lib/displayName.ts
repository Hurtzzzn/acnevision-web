/**
 * The name shown for a signed-in user: the full name, else the part of the email before "@", else "?".
 * `||` (not `??`) on purpose: an empty or blank full name must fall through to the next choice.
 */
export function displayNameOf(user: { full_name?: string | null; email?: string | null }): string {
  return user.full_name?.trim() || user.email?.split('@')[0] || '?';
}

/** First letter for an avatar circle. Never throws, whatever the name is. */
export function initialOf(name: string): string {
  return Array.from(name)[0]?.toUpperCase() ?? '?';
}
