import type { ConversationItem } from '@acnevision/shared';

/** Conversation title taken from the first message, shortened at a word boundary. */
export function conversationTitle(text: string, max = 48): string {
  const flat = text.replace(/\s+/g, ' ').trim();
  if (flat.length <= max) return flat;
  const cut = flat.slice(0, max);
  const lastSpace = cut.lastIndexOf(' ');
  return `${(lastSpace > max * 0.6 ? cut.slice(0, lastSpace) : cut).trimEnd()}…`;
}

export type DayGroupKey = 'today' | 'yesterday' | 'older';

const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();

/** Groups conversations by local day (newest first); empty groups are left out. */
export function groupByDay(items: ConversationItem[], now = new Date()): { key: DayGroupKey; items: ConversationItem[] }[] {
  const today = startOfDay(now);
  const day = 24 * 60 * 60 * 1000;
  const groups: Record<DayGroupKey, ConversationItem[]> = { today: [], yesterday: [], older: [] };
  const sorted = [...items].sort((a, b) => +new Date(b.updated_at) - +new Date(a.updated_at));
  for (const c of sorted) {
    const t = startOfDay(new Date(c.updated_at));
    groups[t >= today ? 'today' : t >= today - day ? 'yesterday' : 'older'].push(c);
  }
  return (['today', 'yesterday', 'older'] as const).filter((k) => groups[k].length).map((key) => ({ key, items: groups[key] }));
}
