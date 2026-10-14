import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { Bot, MessageSquareText, Send } from 'lucide-react';
import { COPY, type ChatMessage } from '@acnevision/shared';
import { api } from '../lib/runtime';
import { useUi } from '../store/ui';
import { Spinner } from './ui';

export function Bubble({ m }: { m: ChatMessage }) {
  const mine = m.role === 'user';
  return (
    <div className={`flex gap-2 ${mine ? 'justify-end' : ''}`}>
      {!mine && <span className="mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary-50 text-primary-600"><Bot className="h-4 w-4" aria-label="AI" /></span>}
      <div className={`max-w-[85%] whitespace-pre-line rounded-2xl px-4 py-2.5 text-sm ${mine ? 'bg-primary-600 text-white' : 'bg-slate-100 text-ink-900'}`}>
        {m.content}
        {m.is_fallback && <span className="mt-1 block text-[11px] text-ink-400">rekomendasi standar</span>}
      </div>
    </div>
  );
}

/** Shared chat input. `pending` sends a quick question right away (used by the suggestion chips on the result page). */
export function ChatInput({ conversationId, onSent, disabled, pending, onPendingHandled, placeholder = COPY.chat.defaultPlaceholder }: {
  conversationId: string; onSent: (u: ChatMessage, a: ChatMessage) => void; disabled?: boolean;
  pending?: string | null; onPendingHandled?: () => void; placeholder?: string;
}) {
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const toast = useUi((s) => s.toast);

  async function send(content: string, clearInput: boolean) {
    if (!content || busy) return;
    setBusy(true);
    try {
      const res = await api.sendMessage(conversationId, content);
      if (clearInput) setText('');
      onSent(res.user_message, res.assistant_message);
    } catch (err) {
      toast(err instanceof Error ? err.message : COPY.chat.sendFailed, 'error');
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    if (!pending) return;
    onPendingHandled?.();
    send(pending, false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pending]);

  function submit(e: FormEvent) {
    e.preventDefault();
    send(text.trim(), true);
  }

  return (
    <form onSubmit={submit} className="flex gap-2">
      <input
        className="input" placeholder={placeholder} maxLength={1000}
        value={text} onChange={(e) => setText(e.target.value)} disabled={disabled || busy}
        aria-label={COPY.chat.inputLabel}
      />
      <button className="btn-primary" disabled={disabled || busy || !text.trim()} aria-label={COPY.chat.send}>
        {busy ? <Spinner /> : <Send className="h-4 w-4" />}
      </button>
    </form>
  );
}

/**
 * "Tanya lebih lanjut" on the result page. Collapsed it is one prompt row with three question chips, so the page stays short;
 * the thread and input open when a chip or the toggle is tapped. The full chat is one link away. No disclaimer here (the page shows it once).
 */
export function ChatPanel({ conversationId, canFollowUp, loading = false }: { conversationId: string | null; canFollowUp: boolean; loading?: boolean }) {
  const [thread, setThread] = useState<ChatMessage[]>([]);
  const [pending, setPending] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const threadRef = useRef<HTMLDivElement>(null);
  const ready = canFollowUp && !!conversationId;
  const showControls = ready || loading;

  useEffect(() => { setThread([]); setOpen(false); }, [conversationId]);
  // Scroll only the message list (never the page), and only once messages exist.
  useEffect(() => {
    const el = threadRef.current;
    if (el && thread.length) el.scrollTop = el.scrollHeight;
  }, [thread.length, open]);

  return (
    <section className="card" aria-labelledby="chat-title">
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
        <div className="flex items-center gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-btn bg-primary-50 text-primary-600" aria-hidden><MessageSquareText className="h-5 w-5" /></span>
          <h2 id="chat-title" className="text-headline-sm">{COPY.chat.title}</h2>
        </div>
        {ready && (
          <div className="flex items-center gap-1">
            <button type="button" aria-expanded={open} onClick={() => setOpen((o) => !o)} className="min-h-11 rounded-control px-2 text-label-md text-primary-600 hover:underline">
              {open ? COPY.chat.collapse : COPY.chat.write}
            </button>
            <Link to="/chat" className="inline-flex min-h-11 items-center rounded-control px-2 text-label-md text-primary-600 hover:underline">{COPY.chat.openChat}</Link>
          </div>
        )}
      </div>

      {showControls ? (
        <>
          <div className="mt-3 flex flex-wrap gap-2">
            {COPY.chat.quickShort.map((label, i) => (
              <button
                key={label} type="button" disabled={!ready}
                className="min-h-11 rounded-full border border-primary-200 bg-primary-50 px-4 text-label-md text-primary-700 transition-colors hover:bg-primary-100 disabled:cursor-not-allowed disabled:opacity-50"
                onClick={() => { setOpen(true); setPending(COPY.chat.quick[i]); }}
              >
                {label}
              </button>
            ))}
          </div>

          {open && ready && (
            <>
              {thread.length > 0 && (
                <div ref={threadRef} className="mt-4 max-h-80 space-y-3 overflow-y-auto" aria-live="polite">
                  {thread.map((m) => <Bubble key={m.id} m={m} />)}
                </div>
              )}
              <div className="mt-4">
                <ChatInput
                  conversationId={conversationId ?? ''}
                  onSent={(u, a) => setThread((t) => [...t, u, a])}
                  pending={pending}
                  placeholder={COPY.chat.placeholder}
                  onPendingHandled={() => setPending(null)}
                />
              </div>
            </>
          )}
        </>
      ) : (
        <p className="mt-3 text-body-md text-ink-500">{COPY.chat.unavailable}</p>
      )}
    </section>
  );
}
