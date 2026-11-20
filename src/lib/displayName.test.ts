import { describe, expect, it } from 'vitest';
import { displayNameOf, initialOf } from './displayName';

describe('displayNameOf', () => {
  it('prefers the full name', () => expect(displayNameOf({ full_name: 'Sari Dewi', email: 'sari@mail.com' })).toBe('Sari Dewi'));

  it('falls back to the email prefix when the full name is null, empty, or blank', () => {
    expect(displayNameOf({ full_name: null, email: 'sari@mail.com' })).toBe('sari');
    expect(displayNameOf({ full_name: '', email: 'sari@mail.com' })).toBe('sari');
    expect(displayNameOf({ full_name: '   ', email: 'sari@mail.com' })).toBe('sari');
  });

  it('falls back to "?" when there is nothing usable', () => {
    expect(displayNameOf({ full_name: '', email: '' })).toBe('?');
    expect(displayNameOf({ full_name: null, email: '@mail.com' })).toBe('?');
    expect(displayNameOf({})).toBe('?');
  });
});

describe('initialOf', () => {
  it('uppercases the first letter', () => expect(initialOf('sari')).toBe('S'));
  it('does not crash on an empty string', () => expect(initialOf('')).toBe('?'));
  it('keeps a whole emoji', () => expect(initialOf('😀 x')).toBe('😀'));
});
