import { useCallback, useEffect, useRef, useState } from 'react';
import { ChevronDown, List, Plus, Trash2 } from 'lucide-react';
import { COPY, SEVERITY_META, type ChatMessage, type ConversationItem, type ScanListItem, type Severity } from '@acnevision/shared';
import { api } from '../lib/runtime';
import { errMessage, fmtDate } from '../lib/errors';
import { conversationTitle, groupByDay } from '../lib/chatList';
import { useUi } from '../store/ui';
import { Bubble, Composer, TypingDots } from '../components/ChatPanel';
import { ErrorBox, Spinner } from '../components/ui';

const T = COPY.chat.page;

/** A message as shown in this page: `key` stays stable when an optimistic message is replaced by the server's. */
type Msg = ChatMessage & { key: string; animate?: boolean; failed?: boolean };

interface ScanContext { date?: string; severity: Severity | null; total: number }

const fromServer = (m: ChatMessage): Msg => ({ ...m, key: m.id });
const tempId = () => `tmp-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
const prefersReducedMotion = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;

/** Height of the visible viewport, so the composer is not covered by the on-screen keyboard. */
function useViewportHeight() {
  const [h, setH] = useState(() => window.visualViewport?.height ?? window.innerHeight);
  useEffect(() => {
    const vv = window.visualViewport;
    const update = () => setH(vv?.height ?? window.innerHeight);
    (vv ?? window).addEventListener('resize', update);
    return () => (vv ?? window).removeEventListener('resize', update);
  }, []);
  return h;
}

function ScanChip({ ctx, scans, canChange, onPick }: {
  ctx: ScanContext | null; scans: ScanListItem[]; canChange: boolean; onPick: (scanId: string | null) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    const onDown = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('keydown', onKey);
    document.addEventListener('mousedown', onDown);
    return () => { document.removeEventListener('keydown', onKey); document.removeEventListener('mousedown', onDown); };
  }, [open]);

  const meta = ctx?.severity ? SEVERITY_META[ctx.severity] : null;
  return (
    <div className="relative min-w-0" ref={ref}>
      <div className="flex min-h-11 items-center gap-2 text-body-sm text-ink-700">
        <span className="inline-flex min-w-0 items-center gap-2 rounded-full bg-tint px-3 py-1.5">
          {ctx ? (
            <>
              <span className="truncate">{ctx.date ? T.chip.scanOn(ctx.date) : T.chip.none}</span>
              {ctx.total === 0 ? (
                <span className="shrink-0 text-ink-500">· {T.chip.noAcne}</span>
              ) : (
                <>
                  {meta && <span className="shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold" style={{ background: meta.bg, color: meta.text }}>{meta.label}</span>}
                  <span className="shrink-0 text-ink-500">{T.chip.lesions(ctx.total)}</span>
                </>
              )}
            </>
          ) : (
            <span className="truncate text-ink-500">{T.chip.none}</span>
          )}
        </span>
        {canChange && scans.length > 0 && (
          <button
            type="button" aria-haspopup="menu" aria-expanded={open} aria-label={T.chip.changeLabel}
            onClick={() => setOpen((o) => !o)}
            className="inline-flex min-h-11 shrink-0 items-center gap-1 rounded-btn px-2 text-label-md text-primary-600 hover:underline"
          >
            {T.chip.change} <ChevronDown className="h-4 w-4" aria-hidden />
          </button>
        )}
      </div>
      {open && (
        <div role="menu" aria-label={T.chip.menuTitle} className="menu-pop absolute left-0 z-30 mt-1 max-h-72 w-72 max-w-[calc(100vw-2rem)] overflow-y-auto rounded-btn border border-border bg-white py-1 shadow-float" style={{ transformOrigin: 'top left' }}>
          {scans.slice(0, 8).map((s) => (
            <button key={s.scan_id} role="menuitem" type="button" className="flex min-h-11 w-full items-center justify-between gap-3 px-4 text-left text-body-md text-ink-900 hover:bg-tint" onClick={() => { onPick(s.scan_id); setOpen(false); }}>
              <span>{fmtDate(s.created_at)}</span>
              <span className="text-body-sm text-ink-500">
                {s.total_lesions === 0 ? T.chip.noAcne : `${s.severity ? `${SEVERITY_META[s.severity].label} · ` : ''}${T.chip.lesions(s.total_lesions)}`}
              </span>
            </button>
          ))}
          <button role="menuitem" type="button" className="min-h-11 w-full border-t border-border px-4 text-left text-body-md text-ink-700 hover:bg-tint" onClick={() => { onPick(null); setOpen(false); }}>{T.chip.withoutScan}</button>
        </div>
      )}
    </div>
  );
}

export default function Chat() {
  const [list, setList] = useState<ConversationItem[] | null>(null);
  const [scans, setScans] = useState<ScanListItem[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [summary, setSummary] = useState<{ total_lesions: number; severity: Severity | null } | null>(null);
  const [loadingThread, setLoadingThread] = useState(false);
  const [draftScanId, setDraftScanId] = useState<string | null | undefined>(undefined);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const toast = useUi((s) => s.toast);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const justCreated = useRef<string | null>(null);
  const vh = useViewportHeight();

  const loadList = useCallback(() => {
    api.listConversations().then((r) => setList(r.items)).catch((e) => setError(errMessage(e)));
  }, []);
  useEffect(loadList, [loadList]);
  useEffect(() => { api.listScans(1, 20).then((r) => setScans(r.items)).catch(() => undefined); }, []);

  // Load the opened conversation (a conversation created by this page already has its messages locally).
  useEffect(() => {
    if (!activeId) return;
    if (justCreated.current === activeId) { justCreated.current = null; return; }
    let cancelled = false;
    setLoadingThread(true);
    api.getMessages(activeId)
      .then((t) => { if (!cancelled) { setMessages(t.messages.map(fromServer)); setSummary(t.scan_summary); } })
      .catch((e) => { if (!cancelled) setError(errMessage(e)); })
      .finally(() => { if (!cancelled) setLoadingThread(false); });
    return () => { cancelled = true; };
  }, [activeId]);

  // Keep the newest message in view, gently.
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: prefersReducedMotion() ? 'auto' : 'smooth' });
  }, [messages.length, sending]);

  useEffect(() => {
    if (!sheetOpen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setSheetOpen(false); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [sheetOpen]);

  const focusInput = () => { if (window.matchMedia?.('(pointer: fine)').matches) inputRef.current?.focus(); };

  function startNew() {
    setActiveId(null); setMessages([]); setSummary(null); setInput(''); setSheetOpen(false); setError(null);
    focusInput();
  }

  function open(id: string) {
    if (id === activeId) { setSheetOpen(false); return; }
    setMessages([]); setSummary(null); setActiveId(id); setSheetOpen(false);
    focusInput();
  }

  async function send(text: string, retryKey?: string) {
    const content = text.trim();
    if (!content || sending) return;
    const key = retryKey ?? tempId();
    setSending(true);
    if (retryKey) {
      setMessages((m) => m.map((x) => (x.key === key ? { ...x, failed: false } : x)));
    } else {
      setInput('');
      setMessages((m) => [...m, { key, id: key, role: 'user', content, created_at: new Date().toISOString(), animate: true }]);
    }
    try {
      let id = activeId;
      if (!id) {
        const scanId = draftScanId === undefined ? scans[0]?.scan_id ?? null : draftScanId;
        const created = await api.createConversation(scanId, conversationTitle(content));
        id = created.conversation_id;
        justCreated.current = id;
        setActiveId(id);
      }
      const res = await api.sendMessage(id, content);
      setMessages((m) => [
        ...m.map((x) => (x.key === key ? { ...fromServer(res.user_message), key, animate: x.animate } : x)),
        { ...fromServer(res.assistant_message), animate: true },
      ]);
      loadList();
    } catch {
      setMessages((m) => m.map((x) => (x.key === key ? { ...x, failed: true } : x)));
    } finally {
      setSending(false);
      focusInput();
    }
  }

  async function remove(id: string) {
    setConfirmId(null);
    try {
      await api.deleteConversation(id);
      if (activeId === id) startNew();
      loadList();
    } catch (e) { toast(errMessage(e), 'error'); }
  }

  // Which analysis the chip describes: the picked one for a new chat, the linked one for an existing chat.
  const activeConv = list?.find((c) => c.conversation_id === activeId) ?? null;
  const scanId = activeId ? activeConv?.scan_id ?? null : draftScanId === undefined ? scans[0]?.scan_id ?? null : draftScanId;
  const scan = scans.find((s) => s.scan_id === scanId);
  const ctx: ScanContext | null = scan
    ? { date: fmtDate(scan.created_at), severity: scan.severity, total: scan.total_lesions }
    : activeId && summary ? { severity: summary.severity, total: summary.total_lesions } : null;

  const groups = groupByDay(list ?? []);
  const isEmpty = !activeId && messages.length === 0;
  const showFreeze = loadingThread && messages.length === 0;

  const sheetCls = sheetOpen
    ? 'sheet-in fixed inset-x-0 bottom-0 z-50 flex max-h-[80dvh] flex-col rounded-t-2xl bg-surface p-3 shadow-float md:animate-none'
    : 'hidden';

  return (
    <div className="flex flex-col" style={{ height: `max(30rem, ${vh - 128}px)` }}>
      <h1 className="sr-only">{T.title}</h1>
      <div className="grid min-h-0 flex-1 gap-4 md:grid-cols-[272px_minmax(0,1fr)]">
        {sheetOpen && <div className="overlay-in fixed inset-0 z-40 bg-ink-900/40 md:hidden" onClick={() => setSheetOpen(false)} aria-hidden />}
        <aside
          aria-label={T.listTitle}
          className={`${sheetCls} md:static md:z-auto md:flex md:max-h-none md:flex-col md:rounded-card md:border md:border-border md:bg-surface md:shadow-card`}
        >
          <div className="flex items-center justify-between gap-2 px-1 pb-2 md:hidden">
            <h2 className="text-headline-sm">{T.listTitle}</h2>
            <button type="button" className="min-h-11 rounded-btn px-3 text-label-md text-primary-600" onClick={() => setSheetOpen(false)}>{T.closeList}</button>
          </div>
          <div className="md:p-3 md:pb-2">
            <button type="button" className="btn-outline min-h-11 w-full" onClick={startNew}><Plus className="h-4 w-4" aria-hidden /> {T.newChat}</button>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto px-1 pb-2 md:px-2">
            {!list && <div className="p-3"><Spinner label={T.loading} /></div>}
            {list?.length === 0 && <p className="p-3 text-body-sm text-ink-500">{T.listEmpty}</p>}
            {groups.map((g) => (
              <section key={g.key} className="mt-3 first:mt-1">
                <h3 className="px-3 pb-1 text-body-sm font-medium text-ink-500">{T.groups[g.key]}</h3>
                <ul className="space-y-0.5">
                  {g.items.map((c) => {
                    const active = c.conversation_id === activeId;
                    return (
                      <li key={c.conversation_id} className={`group relative flex items-center rounded-btn transition-colors ${active ? 'bg-primary-50' : 'hover:bg-tint'}`}>
                        {confirmId === c.conversation_id ? (
                          <div className="flex min-h-11 w-full items-center justify-between gap-2 px-3 text-body-sm text-ink-700">
                            <span>{T.del.confirm}</span>
                            <span className="flex shrink-0 gap-1">
                              <button type="button" autoFocus className="min-h-11 rounded-btn px-2 text-label-md text-ink-700 hover:bg-white" onClick={() => setConfirmId(null)}>{T.del.cancel}</button>
                              <button type="button" className="min-h-11 rounded-btn px-2 text-label-md text-danger hover:bg-red-50" onClick={() => remove(c.conversation_id)}>{T.del.yes}</button>
                            </span>
                          </div>
                        ) : (
                          <>
                            <button
                              type="button" aria-current={active ? 'true' : undefined}
                              className="min-h-11 min-w-0 flex-1 px-3 py-2 text-left"
                              onClick={() => open(c.conversation_id)}
                            >
                              <span className={`block truncate text-body-md ${active ? 'font-semibold text-ink-900' : 'text-ink-800'}`}>{c.title}</span>
                              {g.key === 'older' && <span className="block text-body-sm text-ink-400">{fmtDate(c.updated_at)}</span>}
                            </button>
                            <button
                              type="button" aria-label={`${T.del.label}: ${c.title}`}
                              onClick={() => setConfirmId(c.conversation_id)}
                              className="mr-1 flex h-11 w-11 shrink-0 items-center justify-center rounded-btn text-ink-500 opacity-0 transition-opacity hover:bg-red-50 hover:text-danger focus-visible:opacity-100 group-focus-within:opacity-100 group-hover:opacity-100 [@media(hover:none)]:opacity-100"
                            >
                              <Trash2 className="h-4 w-4" aria-hidden />
                            </button>
                          </>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </section>
            ))}
          </div>
        </aside>

        <section className="flex min-h-0 min-w-0 flex-col rounded-card border border-border bg-surface shadow-card">
          <header className="flex items-center gap-2 border-b border-border px-3 md:px-5">
            <button type="button" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-btn text-ink-700 hover:bg-tint md:hidden" aria-label={T.openList} onClick={() => setSheetOpen(true)}>
              <List className="h-5 w-5" aria-hidden />
            </button>
            <ScanChip ctx={ctx} scans={scans} canChange={!activeId && messages.length === 0} onPick={setDraftScanId} />
          </header>

          {error && <div className="px-4 pt-3 md:px-6"><ErrorBox message={error} /></div>}

          <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto px-4 md:px-6" aria-live="polite">
            <div className="mx-auto flex min-h-full w-full max-w-2xl flex-col justify-end gap-4 py-5">
              {showFreeze && <Spinner label={T.loading} />}
              {isEmpty && (
                <div className="my-auto py-6">
                  <h2 className="text-headline-md">{T.greeting}</h2>
                  <p className="mt-1 text-body-md text-ink-600">{T.greetingSub}</p>
                  <div className="mt-5 flex flex-col items-start gap-2">
                    {T.suggestions.map((q, i) => (
                      <button
                        key={q} type="button" disabled={sending}
                        onClick={() => send(q)}
                        style={{ ['--enter-delay' as string]: `${i * 40}ms` }}
                        className="enter-soft min-h-11 rounded-full border border-border bg-white px-4 py-2 text-left text-body-md text-ink-800 transition-colors hover:border-primary-200 hover:bg-primary-50 motion-safe:active:scale-[0.97] disabled:opacity-50"
                      >
                        {q}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {messages.map((m) => (
                <div key={m.key}>
                  <Bubble m={m} animate={m.animate} />
                  {m.failed && (
                    <p role="alert" className="mt-1.5 text-right text-body-sm text-ink-600">
                      {T.failed}{' '}
                      <button type="button" className="min-h-11 rounded px-1 font-medium text-primary-600 hover:underline" onClick={() => send(m.content, m.key)}>{T.retry}</button>
                    </p>
                  )}
                </div>
              ))}
              {sending && <TypingDots />}
            </div>
          </div>

          <div className="border-t border-border px-4 pb-3 pt-3 md:px-6">
            <div className="mx-auto w-full max-w-2xl">
              <Composer value={input} onChange={setInput} onSubmit={() => send(input)} busy={sending} placeholder={T.placeholder} inputRef={inputRef} autoFocus />
              <p role="note" className="mt-2 text-center text-body-sm text-ink-500">{COPY.disclaimer}</p>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
