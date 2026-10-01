import { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowLeft, Plus, Trash2 } from 'lucide-react';
import { CLASS_META, type ConversationItem, type ConversationMessages } from '@acnevision/shared';
import { api } from '../lib/runtime';
import { errMessage, fmtDate } from '../lib/errors';
import { useUi } from '../store/ui';
import { Bubble, ChatInput } from '../components/ChatPanel';
import { Disclaimer, EmptyState, ErrorBox, SeverityBadge, Spinner } from '../components/ui';

export default function Chat() {
  const [list, setList] = useState<ConversationItem[] | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [thread, setThread] = useState<ConversationMessages | null>(null);
  const [error, setError] = useState<string | null>(null);
  const toast = useUi((s) => s.toast);
  const endRef = useRef<HTMLDivElement>(null);

  const loadList = useCallback(() => {
    api.listConversations().then((r) => setList(r.items)).catch((e) => setError(errMessage(e)));
  }, []);
  useEffect(loadList, [loadList]);

  useEffect(() => {
    if (!activeId) { setThread(null); return; }
    api.getMessages(activeId).then(setThread).catch((e) => setError(errMessage(e)));
  }, [activeId]);
  useEffect(() => { endRef.current?.scrollIntoView({ block: 'nearest' }); }, [thread?.messages.length]);

  async function create() {
    try {
      const { conversation_id } = await api.createConversation(null, 'Tanya skincare');
      loadList();
      setActiveId(conversation_id);
    } catch (e) { toast(errMessage(e), 'error'); }
  }

  async function remove(id: string) {
    try {
      await api.deleteConversation(id);
      if (activeId === id) setActiveId(null);
      loadList();
    } catch (e) { toast(errMessage(e), 'error'); }
  }

  const summary = thread?.scan_summary;

  return (
    <div className="space-y-4">
      <h1>Konsultasi</h1>
      {error && <ErrorBox message={error} />}
      <div className="grid gap-4 md:grid-cols-[300px_1fr]">
        <aside className={`card space-y-2 p-3 md:p-3 ${activeId ? 'hidden md:block' : ''}`}>
          <button className="btn-primary w-full" onClick={create}><Plus className="h-4 w-4" /> Konsultasi Baru</button>
          {!list && <Spinner label="Memuat..." />}
          {list?.length === 0 && <p className="p-3 text-sm text-ink-400">Belum ada percakapan.</p>}
          <ul className="space-y-1">
            {list?.map((c) => (
              <li key={c.conversation_id} className={`group flex items-start gap-1 rounded-btn ${activeId === c.conversation_id ? 'bg-primary-50' : 'hover:bg-slate-50'}`}>
                <button className="flex-1 p-3 text-left" onClick={() => setActiveId(c.conversation_id)}>
                  <p className="text-sm font-semibold text-ink-900">{c.title}</p>
                  <p className="text-xs text-ink-400">{fmtDate(c.updated_at)}</p>
                  <p className="mt-1 line-clamp-2 text-xs">{c.last_message_preview}</p>
                </button>
                <button aria-label="Hapus percakapan" className="m-2 rounded p-1.5 text-danger opacity-60 hover:bg-red-50 hover:opacity-100" onClick={() => remove(c.conversation_id)}>
                  <Trash2 className="h-4 w-4" />
                </button>
              </li>
            ))}
          </ul>
        </aside>

        <section className={`card flex min-h-[28rem] flex-col ${activeId ? '' : 'hidden md:flex'}`}>
          {!activeId || !thread ? (
            activeId ? <Spinner label="Memuat..." /> : <EmptyState title="Pilih percakapan" text="Atau mulai konsultasi baru tentang perawatan kulit." />
          ) : (
            <>
              <button className="mb-3 flex items-center gap-1 text-sm font-medium text-primary-600 md:hidden" onClick={() => setActiveId(null)}>
                <ArrowLeft className="h-4 w-4" /> Daftar
              </button>
              {summary && (
                <div className="mb-3 flex flex-wrap items-center gap-3 rounded-btn bg-primary-50 p-3 text-sm">
                  <span>Scan terkait: <b>{summary.total_lesions}</b> lesi</span>
                  {summary.dominant_class && <span>Dominan: <b>{CLASS_META[summary.dominant_class].label}</b></span>}
                  <SeverityBadge severity={summary.severity} isEstimate={false} />
                </div>
              )}
              <div className="flex-1 space-y-3 overflow-y-auto pr-1" style={{ maxHeight: '55vh' }}>
                {thread.messages.length === 0 && <p className="text-sm text-ink-400">Tanyakan apa saja seputar jerawat dan perawatan kulit.</p>}
                {thread.messages.map((m) => <Bubble key={m.id} m={m} />)}
                <div ref={endRef} />
              </div>
              <div className="mt-4 space-y-3">
                <ChatInput
                  conversationId={thread.conversation_id}
                  onSent={(u, a) => { setThread((t) => (t ? { ...t, messages: [...t.messages, u, a] } : t)); loadList(); }}
                />
                <Disclaimer />
              </div>
            </>
          )}
        </section>
      </div>
    </div>
  );
}
