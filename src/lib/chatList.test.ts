import { describe, expect, it } from 'vitest';
import type { ConversationItem } from '@acnevision/shared';
import { conversationTitle, groupByDay } from './chatList';

const item = (id: string, updated_at: string): ConversationItem => ({ conversation_id: id, title: id, scan_id: null, last_message_preview: '', updated_at });

describe('conversationTitle', () => {
  it('keeps short text and collapses whitespace', () => {
    expect(conversationTitle('  Apa arti\n hasilku? ')).toBe('Apa arti hasilku?');
  });
  it('shortens long text at a word boundary', () => {
    const t = conversationTitle('Bagaimana merawat kulit saya sehari-hari supaya jerawat tidak muncul lagi', 30);
    expect(t.endsWith('…')).toBe(true);
    expect(t.length).toBeLessThanOrEqual(31);
  });
});

describe('groupByDay', () => {
  it('groups into today, yesterday and older, skipping empty groups', () => {
    const now = new Date(2026, 9, 15, 14, 0);
    const groups = groupByDay([
      item('a', new Date(2026, 9, 15, 9, 0).toISOString()),
      item('b', new Date(2026, 9, 14, 23, 0).toISOString()),
      item('c', new Date(2026, 9, 1, 8, 0).toISOString()),
    ], now);
    expect(groups.map((g) => g.key)).toEqual(['today', 'yesterday', 'older']);
    expect(groupByDay([item('c', new Date(2026, 9, 1).toISOString())], now).map((g) => g.key)).toEqual(['older']);
  });
});
