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

/** "Tanya lebih lanjut" panel on the result page: quick-question chips, the follow-up thread, and the input. No disclaimer here (the page shows it once). */
export function ChatPanel({ conversationId, canFollowUp, loading = false }: { conversationId: string | null; canFollowUp: boolean; loading?: boolean }) {
  const [thread, setThread] = useState<ChatMessage[]>([]);
  const [pending, setPending] = useState<string | null>(null);
  const threadRef = useRef<HTMLDivElement>(null);
  const ready = canFollowUp && !!conversationId;
  // While the recommendation (and its conversation) is on the way, show the same controls disabled so the panel keeps its height.
  const showControls = ready || loading;

  useEffect(() => { setThread([]); }, [conversationId]);
  // Scroll only the message list (never the page), and only once messages exist.
  useEffect(() => {
    const el = threadRef.current;
    if (el && thread.length) el.scrollTop = el.scrollHeight;
  }, [thread.length]);

  return (
    <section className="card" aria-labelledby="chat-title">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-btn bg-primary-50 text-primary-600" aria-hidden><MessageSquareText className="h-5 w-5" /></span>
          <div>
            <h2 id="chat-title" className="text-headline-sm">{COPY.chat.title}</h2>
            <p className="text-body-md text-ink-600">{COPY.chat.subtitle}</p>
          </div>
        </div>
        {ready && <Link to="/chat" className="-my-2 rounded py-2 text-label-md text-primary-600 hover:underline">{COPY.chat.openChat}</Link>}
      </div>

      {showControls ? (
        <>
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <span className="text-body-sm text-ink-500">{COPY.chat.quickLabel}</span>
            {COPY.chat.quick.map((q) => (
              <button key={q} type="button" className="rounded-full border border-primary-200 bg-primary-50 px-3 py-2 text-label-md text-primary-700 transition-colors hover:bg-primary-100 disabled:cursor-not-allowed disabled:opacity-50" onClick={() => setPending(q)} disabled={!ready}>
                {q}
              </button>
            ))}
          </div>

          {thread.length > 0 && (
            <div ref={threadRef} className="mt-4 max-h-96 space-y-3 overflow-y-auto" aria-live="polite">
              {thread.map((m) => <Bubble key={m.id} m={m} />)}
            </div>
          )}

          <div className="mt-4">
            <ChatInput
              conversationId={conversationId ?? ''}
              disabled={!ready}
              onSent={(u, a) => setThread((t) => [...t, u, a])}
              pending={pending}
              placeholder={COPY.chat.placeholder}
              onPendingHandled={() => setPending(null)}
            />
          </div>
        </>
      ) : (
        <p className="mt-4 text-body-md text-ink-500">{COPY.chat.unavailable}</p>
      )}
    </section>
  );
}
