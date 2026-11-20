import { describe, expect, it } from 'vitest';
import { usesPeriod } from './adminPeriod';

describe('usesPeriod', () => {
  it('is true for Dashboard and Monitoring Model', () => {
    expect(usesPeriod('/admin')).toBe(true);
    expect(usesPeriod('/admin/')).toBe(true);
    expect(usesPeriod('/admin/model')).toBe(true);
  });

  it('is false for Kelola User and Audit Log', () => {
    expect(usesPeriod('/admin/users')).toBe(false);
    expect(usesPeriod('/admin/audit')).toBe(false);
    expect(usesPeriod('/admin/audit/')).toBe(false);
  });

  it('is false for anything else', () => {
    expect(usesPeriod('/')).toBe(false);
    expect(usesPeriod('/admin/models')).toBe(false);
  });
});
