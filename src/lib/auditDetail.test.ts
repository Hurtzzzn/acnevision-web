import { describe, expect, it } from 'vitest';
import { formatAuditDetail } from './auditDetail';

describe('formatAuditDetail', () => {
  it('reads a role change as "Role: from → to"', () => {
    expect(formatAuditDetail('user.promote', { to: 'admin', from: 'user' })).toEqual({ text: 'Role: user → admin', raw: false });
    expect(formatAuditDetail('user.demote', { to: 'user', from: 'admin' })).toEqual({ text: 'Role: admin → user', raw: false });
  });

  it('reads a status change in Indonesian', () => {
    expect(formatAuditDetail('user.suspend', { from: 'active', to: 'suspended' }).text).toBe('Status: aktif → nonaktif');
    expect(formatAuditDetail('user.activate', { from: 'suspended', to: 'active' }).text).toBe('Status: nonaktif → aktif');
  });

  it('fills a missing side from what the action means', () => {
    expect(formatAuditDetail('user.suspend', {}).text).toBe('Status: aktif → nonaktif');
    expect(formatAuditDetail('user.promote', { to: 'admin' }).text).toBe('Role: user → admin');
    expect(formatAuditDetail('user.activate', null).text).toBe('Status: nonaktif → aktif');
  });

  it('falls back to the JSON for a shape it does not know', () => {
    expect(formatAuditDetail('user.promote', { reason: 'x' })).toEqual({ text: '{"reason":"x"}', raw: true });
    expect(formatAuditDetail('user.promote', { from: 'user', to: 'admin', extra: 1 }).raw).toBe(true);
    expect(formatAuditDetail('user.promote', { from: 1, to: 'admin' }).raw).toBe(true);
    expect(formatAuditDetail('user.delete', { to: 'admin', from: 'user' })).toEqual({ text: '{"to":"admin","from":"user"}', raw: true });
  });

  it('shows a dash when an unknown action has no details', () => {
    expect(formatAuditDetail('user.delete', {})).toEqual({ text: '-', raw: false });
    expect(formatAuditDetail('user.delete', undefined)).toEqual({ text: '-', raw: false });
  });

  it('does not mistake inherited object keys for known actions', () => {
    expect(formatAuditDetail('toString', { a: 1 }).raw).toBe(true);
    expect(formatAuditDetail('constructor', {}).text).toBe('-');
  });
});
