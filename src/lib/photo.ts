import { ALLOWED_IMAGE_TYPES, MAX_UPLOAD_BYTES } from '@acnevision/shared';

export type PhotoError = 'invalidType' | 'tooLarge';

/** Client-side check before a photo goes to the api client. The API still validates, this only gives a friendly message early. */
export function validatePhoto(file: Pick<File, 'type' | 'size'>): PhotoError | null {
  if (!(ALLOWED_IMAGE_TYPES as readonly string[]).includes(file.type)) return 'invalidType';
  if (file.size > MAX_UPLOAD_BYTES) return 'tooLarge';
  return null;
}
