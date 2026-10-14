import { useEffect, useLayoutEffect, useRef, useState, type KeyboardEvent, type RefObject } from 'react';
import { Link } from 'react-router-dom';
import { MessageSquareText, SendHorizontal } from 'lucide-react';
import { COPY, type ChatMessage } from '@acnevision/shared';
import { api } from '../lib/runtime';
import { Spinner } from './ui';

/** Assistant text is plain and unboxed; the user's message is a soft bubble. `animate` is only set for messages added in this session. */
export function Bubble({ m, animate = false }: { m: ChatMessage; animate?: boolean }) {
  const mine = m.role === 'user';
  const enter = animate ? 'msg-in' : '';
  if (mine) {
    return (
      <div className={`flex justify-end ${enter}`}>
        <div className="max-w-[85%] whitespace-pre-line break-words rounded-2xl rounded-br-md bg-primary-50 px-4 py-2.5 text-body-md text-ink-900">{m.content}</div>
      </div>
    );
  }
  return (
    <div className={`max-w-[92%] whitespace-pre-line break-words text-body-md leading-relaxed text-ink-900 ${enter}`}>
      {m.content}
      {m.is_fallback && <span className="mt-1 block text-body-sm text-ink-400">{COPY.chat.page.fallbackNote}</span>}
    </div>
  );
}

export function TypingDots() {
  return (
    <div role="status" className="msg-in flex items-center gap-1 py-2" aria-label={COPY.chat.page.typing}>
      {[0, 1, 2].map((i) => (
        <span key={i} className="typing-dot h-1.5 w-1.5 rounded-full bg-ink-400" style={{ animationDelay: `${i * 160}ms` }} />
      ))}
    </div>
  );
}

const canAutoFocus = () => typeof window !== 'undefined' && window.matchMedia?.('(pointer: fine)').matches;

/** Auto-growing textarea with a round send button. Enter sends, Shift+Enter adds a line. */
export function Composer({ value, onChange, onSubmit, busy = false, disabled = false, placeholder = COPY.chat.defaultPlaceholder, inputRef, autoFocus = false }: {
  value: string; onChange: (v: string) => void; onSubmit: () => void; busy?: boolean; disabled?: boolean;
  placeholder?: string; inputRef?: RefObject<HTMLTextAreaElement>; autoFocus?: boolean;
}) {
  const own = useRef<HTMLTextAreaElement>(null);
  const ref = inputRef ?? own;
  const empty = !value.trim();

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
  }, [value, ref]);
  useEffect(() => { if (autoFocus && canAutoFocus()) ref.current?.focus(); }, [autoFocus, ref]);

  function onKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key !== 'Enter' || e.shiftKey || e.nativeEvent.isComposing) return;
    e.preventDefault();
    if (!empty && !busy && !disabled) onSubmit();
  }

  return (
    <form
      onSubmit={(e) => { e.preventDefault(); if (!empty && !busy && !disabled) onSubmit(); }}
      className="flex items-end gap-2 rounded-2xl border border-border bg-white p-1.5 pl-4 transition-shadow focus-within:border-primary-600 focus-within:shadow-[0_0_0_3px_rgba(37,99,235,0.15)]"
    >
      <textarea
        ref={ref} rows={1} maxLength={1000} value={value} placeholder={placeholder} disabled={disabled}
        aria-label={COPY.chat.inputLabel}
        onChange={(e) => onChange(e.target.value)} onKeyDown={onKeyDown}
        className="max-h-40 min-h-11 flex-1 resize-none bg-transparent py-2.5 text-body-md text-ink-900 outline-none placeholder:text-ink-400 focus-visible:outline-none"
      />
      <button
        type="submit" aria-label={COPY.chat.send} disabled={empty || busy || disabled}
        className="btn-primary h-11 w-11 shrink-0 rounded-full p-0"
      >
        {busy ? <Spinner /> : <SendHorizontal className="h-5 w-5" aria-hidden />}
      </button>
    </form>
  );
}

/** Chat input for the result page. `pending` sends a quick question right away. A failed send shows a friendly retry. */
export function ChatInput({ conversationId, onSent, disabled, pending, onPendingHandled, placeholder = COPY.chat.defaultPlaceholder }: {
  conversationId: string; onSent: (u: ChatMessage, a: ChatMessage) => void; disabled?: boolean;
  pending?: string | null; onPendingHandled?: () => void; placeholder?: string;
}) {
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [failedText, setFailedText] = useState<string | null>(null);

  async function send(content: string, clearInput: boolean) {
    if (!content || busy) return;
    setBusy(true);
    setFailedText(null);
    try {
      const res = await api.sendMessage(conversationId, content);
      if (clearInput) setText('');
      onSent(res.user_message, res.assistant_message);
    } catch {
      setFailedText(content);
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

  return (
    <div className="space-y-2">
      {failedText && (
        <p role="alert" className="text-body-sm text-ink-600">
          {COPY.chat.page.failed}{' '}
          <button type="button" className="rounded font-medium text-primary-600 hover:underline" onClick={() => send(failedText, false)}>{COPY.chat.page.retry}</button>
        </p>
      )}
      <Composer value={text} onChange={setText} onSubmit={() => send(text.trim(), true)} busy={busy} disabled={disabled} placeholder={placeholder} />
    </div>
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
