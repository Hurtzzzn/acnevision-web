/** What an audit action changes, so a log entry can be read without the raw JSON. */
const ACTIONS = {
  'user.promote': { field: 'Role', from: 'user', to: 'admin' },
  'user.demote': { field: 'Role', from: 'admin', to: 'user' },
  'user.suspend': { field: 'Status', from: 'active', to: 'suspended' },
  'user.activate': { field: 'Status', from: 'suspended', to: 'active' },
} as const;

type KnownAction = keyof typeof ACTIONS;

const VALUE_LABEL: Record<string, string> = { active: 'aktif', suspended: 'nonaktif' };
const label = (value: string) => VALUE_LABEL[value] ?? value;

export interface AuditDetail {
  text: string;
  /** True when `text` is raw JSON (shown in a monospace font); false when it is a readable sentence. */
  raw: boolean;
}

const isKnownAction = (action: string): action is KnownAction => Object.prototype.hasOwnProperty.call(ACTIONS, action);

/**
 * "Role: user → admin" or "Status: aktif → nonaktif" for the four user actions. The values come from `details.from` / `details.to`
 * (the backend writes `{"from": "user", "to": "admin"}`); a missing side is implied by the action itself. Any other shape of details
 * (unknown action, extra keys, non-text values) falls back to the JSON as it is, so nothing is ever hidden.
 */
export function formatAuditDetail(action: string, details: Record<string, unknown> | null | undefined): AuditDetail {
  const entries = Object.entries(details ?? {});
  if (isKnownAction(action) && entries.every(([key, value]) => (key === 'from' || key === 'to') && typeof value === 'string')) {
    const meaning = ACTIONS[action];
    const from = typeof details?.from === 'string' ? details.from : meaning.from;
    const to = typeof details?.to === 'string' ? details.to : meaning.to;
    // Both sides are shown in the same wording, so a role shows as given and a status as aktif / nonaktif.
    const show = meaning.field === 'Status' ? label : (value: string) => value;
    return { text: `${meaning.field}: ${show(from)} → ${show(to)}`, raw: false };
  }
  if (entries.length === 0) return { text: '-', raw: false };
  return { text: JSON.stringify(details), raw: true };
}
