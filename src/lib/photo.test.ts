import { describe, expect, it } from 'vitest';
import { MAX_UPLOAD_BYTES } from '@acnevision/shared';
import { validatePhoto } from './photo';

describe('validatePhoto', () => {
  it.each(['image/jpeg', 'image/png', 'image/webp'])('accepts %s', (type) => {
    expect(validatePhoto({ type, size: 1024 })).toBeNull();
  });

  it.each(['image/gif', 'application/pdf', 'text/plain', ''])('rejects type "%s"', (type) => {
    expect(validatePhoto({ type, size: 1024 })).toBe('invalidType');
  });

  it('accepts exactly the size limit and rejects one byte more', () => {
    expect(validatePhoto({ type: 'image/png', size: MAX_UPLOAD_BYTES })).toBeNull();
    expect(validatePhoto({ type: 'image/png', size: MAX_UPLOAD_BYTES + 1 })).toBe('tooLarge');
  });

  it('reports the type problem before the size problem', () => {
    expect(validatePhoto({ type: 'image/gif', size: MAX_UPLOAD_BYTES + 1 })).toBe('invalidType');
  });
});
