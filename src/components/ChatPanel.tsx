import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Bot, Send } from 'lucide-react';
import { COPY, type ChatMessage } from '@acnevision/shared';
import { api } from '../lib/runtime';
import { useUi } from '../store/ui';
import { Disclaimer, Spinner } from './ui';

function useTypewriter(text: string | null, enabled: boolean) {
  const [shown, setShown] = useState('');
  useEffect(() => {
    if (!text) { setShown(''); return; }
    if (!enabled) { setShown(text); return; }
    let i = 0;
    setShown('');
    const t = setInterval(() => {
      i += 3;
      setShown(text.slice(0, i));
      if (i >= text.length) clearInterval(t);
    }, 16);
    return () => clearInterval(t);
  }, [text, enabled]);
  return shown;
}

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

/** Shared chat thread + input. Used by the result page (compact) and /chat. */
export function ChatInput({ conversationId, onSent, disabled }: {
  conversationId: string; onSent: (u: ChatMessage, a: ChatMessage) => void; disabled?: boolean;
}) {
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const toast = useUi((s) => s.toast);

  async function submit(e: FormEvent) {
    e.preventDefault();
    const content = text.trim();
    if (!content || busy) return;
    setBusy(true);
    try {
      const res = await api.sendMessage(conversationId, content);
      setText('');
      onSent(res.user_message, res.assistant_message);
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Gagal mengirim pesan.', 'error');
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="flex gap-2">
      <input
        className="input" placeholder="Tanya soal perawatan kulit..." maxLength={1000}
        value={text} onChange={(e) => setText(e.target.value)} disabled={disabled || busy}
        aria-label="Pesan untuk asisten AI"
      />
      <button className="btn-primary" disabled={disabled || busy || !text.trim()} aria-label="Kirim">
        {busy ? <Spinner /> : <Send className="h-4 w-4" />}
      </button>
    </form>
  );
}

export function ChatPanel({ conversationId, recommendation, isFallback, loading, canFollowUp }: {
  conversationId: string | null; recommendation: string | null; isFallback?: boolean; loading: boolean; canFollowUp: boolean;
}) {
  const [followUps, setFollowUps] = useState<ChatMessage[]>([]);
  const typed = useTypewriter(recommendation, true);
  const openLoginPrompt = useUi((s) => s.openLoginPrompt);
  const loc = useLocation();
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => { setFollowUps([]); }, [conversationId]);
  useEffect(() => { endRef.current?.scrollIntoView({ block: 'nearest' }); }, [followUps.length]);

  return (
    <section className="card" aria-label="Rekomendasi chatbot">
      <div className="mb-4 flex items-center justify-between">
        <h3>Rekomendasi AI</h3>
        {canFollowUp && conversationId && <Link to="/chat" className="text-sm font-medium text-primary-600 hover:underline">Buka di halaman Konsultasi</Link>}
      </div>

      <div className="max-h-96 space-y-3 overflow-y-auto pr-1">
        {loading && <Spinner label="Menyiapkan rekomendasi..." />}
        {recommendation && (
          <Bubble m={{ id: 'rec', role: 'assistant', content: typed, is_fallback: isFallback, created_at: '' }} />
        )}
        {followUps.map((m) => <Bubble key={m.id} m={m} />)}
        <div ref={endRef} />
      </div>

      <div className="relative mt-4">
        {canFollowUp && conversationId ? (
          <ChatInput conversationId={conversationId} onSent={(u, a) => setFollowUps((f) => [...f, u, a])} />
        ) : (
          <>
            <div className="pointer-events-none flex gap-2 opacity-40" aria-hidden>
              <input className="input" disabled placeholder="Tanya soal perawatan kulit..." />
              <button className="btn-primary" disabled><Send className="h-4 w-4" /></button>
            </div>
            <div className="absolute inset-0 flex items-center justify-between gap-3 rounded-btn bg-white/80 px-3 backdrop-blur-[1px]">
              <span className="text-sm font-medium text-ink-900">{COPY.loginGateChat}</span>
              <button
                className="btn-primary shrink-0"
                onClick={() => openLoginPrompt({ message: COPY.loginGateChat, redirectTo: loc.pathname })}
              >Masuk</button>
            </div>
          </>
        )}
      </div>
      <div className="mt-3"><Disclaimer /></div>
    </section>
  );
}
