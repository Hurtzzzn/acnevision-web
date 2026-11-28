import { useState, useRef, useEffect } from 'react';
import {
  Sparkles,
  ScanLine,
  Droplets,
  Stethoscope,
  ArrowUpRight,
  MessageSquare,
  ShieldCheck,
  ArrowLeft,
  MoreVertical,
  ArrowUp,
  History,
  Trash2,
} from 'lucide-react';
import type { ChatMessage as ApiChatMessage, ConversationItem, ScanListItem, Severity } from '@acnevision/shared';
import heroineImg from '../assets/images/heroine.png';
import { useAuth } from '../store/auth';
import { useScan } from '../store/scan';
import { api } from '../lib/runtime';
import {
  formatChatDayHeader,
  formatIndonesianDate,
  formatTimeHHMM,
} from '../lib/dateTime';

interface UiMessage {
  id: string;
  sender: 'user' | 'ai';
  text: string;
  createdAt: string;
}

function severityLabelId(s: Severity | null | undefined, total: number): string {
  if (total === 0 || !s) return 'Bersih';
  if (s === 'mild') return 'Ringan';
  if (s === 'severe') return 'Berat';
  if (s === 'very_severe') return 'Sangat Berat';
  return 'Sedang';
}

export default function Chat() {
  const { user } = useAuth();
  const { analysis, detection, imageUrl, capturedAt, savedScanId } = useScan();

  const [inConversation, setInConversation] = useState(false);
  const [includeLatestScan, setIncludeLatestScan] = useState(true);
  const [latestScan, setLatestScan] = useState<ScanListItem | null>(null);
  const [conversations, setConversations] = useState<ConversationItem[]>([]);
  const [activeConvId, setActiveConvId] = useState<string | null>(null);
  const [messages, setMessages] = useState<UiMessage[]>([]);
  const [inputVal, setInputVal] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let active = true;
    if (!user) return;
    api
      .listScans(1, 1)
      .then((res) => {
        if (active) setLatestScan(res.items[0] ?? null);
      })
      .catch(() => {});
    api
      .listConversations(1)
      .then((res) => {
        if (active) setConversations(res.items);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [user, savedScanId]);

  useEffect(() => {
    if (inConversation) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, inConversation, isTyping]);

  // Resolve latest scan context dynamically (from in-memory scan or latest saved scan)
  const hasInMemory = !!(analysis || detection);
  const ctxTotal = analysis
    ? analysis.summary.total_lesions
    : detection
    ? detection.summary.total_lesions
    : latestScan?.total_lesions ?? null;

  const ctxSeverity = analysis
    ? analysis.classification?.severity ?? null
    : detection
    ? detection.summary.severity
    : latestScan?.severity ?? null;

  const ctxCreatedAt = hasInMemory
    ? capturedAt ?? new Date().toISOString()
    : latestScan?.created_at ?? null;

  const ctxPhoto = imageUrl || latestScan?.thumbnail_url || heroineImg;
  const ctxSeverityLabel = ctxTotal !== null ? severityLabelId(ctxSeverity, ctxTotal) : null;
  const ctxDateShort = ctxCreatedAt
    ? `${formatIndonesianDate(ctxCreatedAt, true)} • ${formatTimeHHMM(new Date(ctxCreatedAt))}`
    : null;

  const firstName = user?.full_name?.trim().split(/\s+/)[0] || 'Teman';

  const mapApiMessages = (apiMsgs: ApiChatMessage[]): UiMessage[] =>
    apiMsgs.map((m) => ({
      id: m.id,
      sender: m.role === 'user' ? 'user' : 'ai',
      text: m.content,
      createdAt: m.created_at,
    }));

  const buildWelcomeMessage = (): UiMessage => {
    const nowIso = new Date().toISOString();
    if (includeLatestScan && ctxTotal !== null) {
      return {
        id: 'welcome-ctx',
        sender: 'ai',
        text: `Halo ${firstName}! Aku siap membantumu membahas hasil pemindaian terakhirmu (${ctxTotal} jerawat terdeteksi, tingkat ${ctxSeverityLabel}). Ceritakan keluhan atau rutinitas skincare yang sedang kamu gunakan saat ini.`,
        createdAt: nowIso,
      };
    }
    return {
      id: 'welcome-plain',
      sender: 'ai',
      text: `Halo ${firstName}! Ada keluhan atau pertanyaan seputar kondisi kulit dan perawatan jerawat yang ingin kamu bahas hari ini?`,
      createdAt: nowIso,
    };
  };

  const openLatestConversation = async () => {
    const latestConv = conversations[0];
    if (user && latestConv) {
      setActiveConvId(latestConv.conversation_id);
      setInConversation(true);
      try {
        const res = await api.getMessages(latestConv.conversation_id);
        setMessages(mapApiMessages(res.messages));
      } catch {
        setMessages([buildWelcomeMessage()]);
      }
      return;
    }
    setActiveConvId(null);
    setMessages([buildWelcomeMessage()]);
    setInConversation(true);
  };

  const handleStartChat = async (initialPrompt?: string) => {
    setActiveConvId(null);
    setMessages([buildWelcomeMessage()]);
    setInConversation(true);
    if (initialPrompt) {
      await handleSendMessage(initialPrompt, true);
    }
  };

  const generateGuestReply = (text: string): string => {
    const lower = text.toLowerCase();
    if (lower.includes('pagi') || lower.includes('rutinitas') || lower.includes('lembut')) {
      return 'Untuk rutinitas yang ramah kulit berjerawat:\n• Gunakan pembersih wajah lembut non-SLS.\n• Pakai pelembap ringan nonkomedogenik.\n• Gunakan tabir surya minimal SPF 30 di pagi hari.\n• Hindari scrub kasar dan kebiasaan memencet jerawat.';
    }
    if (lower.includes('kapan') || lower.includes('dokter') || lower.includes('lagi')) {
      return 'Jika muncul nyeri berat, benjolan keras di dalam kulit, atau kondisi terus memburuk setelah 2–4 minggu perawatan lembut, sebaiknya segera periksa ke dokter kulit.\n\nUntuk memantau progres secara konsisten, beri jeda 7–14 hari sebelum memindai ulang.';
    }
    if (ctxTotal !== null) {
      return `Berdasarkan hasil pindai (${ctxTotal} jerawat, estimasi tingkat ${ctxSeverityLabel}), kondisi ini dapat dipantau secara berkala. Fokus utama tetap menjaga kebersihan kulit tanpa over-exfoliating. Ada produk tertentu yang baru kamu pakai akhir-akhir ini?`;
    }
    return 'Merawat kulit berjerawat membutuhkan konsistensi 2–4 minggu. Mulai dengan pembersih lembut, pelembap ringan, dan tabir surya setiap hari.';
  };

  const handleSendMessage = async (textToSend?: string, forceFreshConv = false) => {
    const text = (textToSend ?? inputVal).trim();
    if (!text) return;

    const nowIso = new Date().toISOString();
    const userMsg: UiMessage = {
      id: `u-${Date.now()}`,
      sender: 'user',
      text,
      createdAt: nowIso,
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputVal('');
    setIsTyping(true);

    if (user) {
      try {
        let convId = forceFreshConv ? null : activeConvId;
        if (!convId) {
          const scanRef = includeLatestScan
            ? savedScanId ?? latestScan?.scan_id ?? null
            : null;
          const created = await api.createConversation(scanRef, text.slice(0, 40));
          convId = created.conversation_id;
          setActiveConvId(convId);
        }
        const reply = await api.sendMessage(convId, text);
        setMessages((prev) => [
          ...prev.filter((m) => m.id !== userMsg.id),
          ...mapApiMessages([reply.user_message, reply.assistant_message]),
        ]);
        setIsTyping(false);
        return;
      } catch {
        // fallback cleanly to contextual client reply if offline
      }
    }

    setTimeout(() => {
      setMessages((prev) => [
        ...prev,
        {
          id: `ai-${Date.now()}`,
          sender: 'ai',
          text: generateGuestReply(text),
          createdAt: new Date().toISOString(),
        },
      ]);
      setIsTyping(false);
    }, 600);
  };

  const handleDeleteActiveConversation = async () => {
    setMenuOpen(false);
    if (user && activeConvId) {
      await api.deleteConversation(activeConvId).catch(() => {});
      setConversations((prev) => prev.filter((c) => c.conversation_id !== activeConvId));
    }
    setActiveConvId(null);
    setMessages([]);
    setInConversation(false);
  };

  // VIEW 1: INTRO / MULAI KONSULTASI AI (181040.png)
  if (!inConversation) {
    return (
      <div className="flex-1 flex flex-col justify-between bg-white overflow-y-auto">
        <div className="px-5 pt-4 pb-6 space-y-5">
          {/* Top Header Bar */}
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-bold text-slate-900">Konsultasi AI</h1>
            <button
              onClick={openLatestConversation}
              className="w-9 h-9 rounded-full flex items-center justify-center text-slate-600 hover:bg-slate-100 transition-colors"
              aria-label="Riwayat konsultasi"
              title="Buka percakapan terakhir"
            >
              <History className="w-5 h-5 stroke-[2]" />
            </button>
          </div>

          {/* Hero Sparkle + Title */}
          <div className="space-y-3 pt-1">
            <div className="w-12 h-12 rounded-2xl bg-[#EEF4FF] text-[#2563EB] flex items-center justify-center shadow-xs">
              <Sparkles className="w-6 h-6 stroke-[2]" />
            </div>

            <div className="space-y-1.5">
              <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight leading-tight">
                Cerita soal kulit,
                <br />
                tanpa rasa khawatir.
              </h2>
              <p className="text-xs text-slate-500 leading-relaxed max-w-sm">
                Aku asisten AcneVision AI. Yuk, pahami hasil pindaimu dan susun kebiasaan perawatan yang lebih ramah kulit.
              </p>
            </div>
          </div>

          {/* Dynamic Toggle Card: Sertakan hasil pindai terbaru */}
          <div className="bg-white rounded-[22px] p-4 border border-slate-100 shadow-[0_4px_16px_rgba(0,0,0,0.03)] space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-900">
                Sertakan hasil pindai terbaru
              </span>
              <button
                type="button"
                role="switch"
                aria-checked={includeLatestScan}
                onClick={() => setIncludeLatestScan(!includeLatestScan)}
                className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors duration-200 ease-in-out ${
                  includeLatestScan ? 'bg-[#2563EB]' : 'bg-slate-300'
                }`}
              >
                <div
                  className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform duration-200 ease-in-out ${
                    includeLatestScan ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {includeLatestScan && ctxTotal !== null && (
              <div className="flex items-center gap-3 pt-1">
                <div className="w-14 h-14 rounded-xl overflow-hidden bg-slate-100 shrink-0 border border-slate-100 shadow-xs">
                  <img
                    src={ctxPhoto}
                    alt="Pratinjau pindai terbaru"
                    className="w-full h-full object-cover object-top"
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] text-slate-400">{ctxDateShort}</p>
                  <p className="text-sm font-bold text-slate-900 mt-0.5">
                    {ctxTotal} jerawat terdeteksi
                  </p>
                </div>
                <span className="bg-[#FEF3C7] text-[#D97706] text-xs font-bold px-2.5 py-0.5 rounded-full shrink-0">
                  {ctxSeverityLabel}
                </span>
              </div>
            )}

            {includeLatestScan && ctxTotal === null && (
              <p className="text-[11px] text-slate-400">
                Belum ada pemindaian tersimpan. Kamu tetap bisa langsung memulai percakapan.
              </p>
            )}
          </div>

          {/* Prompt Suggestions */}
          <div className="space-y-2.5 pt-1">
            <h3 className="text-sm font-bold text-slate-900">Mulai dari yang kamu butuhkan</h3>

            <button
              onClick={() => handleStartChat('Apa arti hasil pindaiku?')}
              className="w-full bg-[#F8FAFC] hover:bg-blue-50/50 p-3.5 rounded-[18px] border border-slate-100 flex items-center justify-between transition-colors group text-left"
            >
              <div className="flex items-center gap-3">
                <ScanLine className="w-5 h-5 text-[#2563EB]" />
                <span className="text-xs font-semibold text-slate-800 group-hover:text-[#2563EB]">
                  Apa arti hasil pindaiku?
                </span>
              </div>
              <ArrowUpRight className="w-4 h-4 text-slate-400 group-hover:text-[#2563EB]" />
            </button>

            <button
              onClick={() => handleStartChat('Bagaimana rutinitas yang lembut?')}
              className="w-full bg-[#F8FAFC] hover:bg-blue-50/50 p-3.5 rounded-[18px] border border-slate-100 flex items-center justify-between transition-colors group text-left"
            >
              <div className="flex items-center gap-3">
                <Droplets className="w-5 h-5 text-[#2563EB]" />
                <span className="text-xs font-semibold text-slate-800 group-hover:text-[#2563EB]">
                  Bagaimana rutinitas yang lembut?
                </span>
              </div>
              <ArrowUpRight className="w-4 h-4 text-slate-400 group-hover:text-[#2563EB]" />
            </button>

            <button
              onClick={() => handleStartChat('Kapan perlu ke dokter kulit?')}
              className="w-full bg-[#F8FAFC] hover:bg-blue-50/50 p-3.5 rounded-[18px] border border-slate-100 flex items-center justify-between transition-colors group text-left"
            >
              <div className="flex items-center gap-3">
                <Stethoscope className="w-5 h-5 text-[#2563EB]" />
                <span className="text-xs font-semibold text-slate-800 group-hover:text-[#2563EB]">
                  Kapan perlu ke dokter kulit?
                </span>
              </div>
              <ArrowUpRight className="w-4 h-4 text-slate-400 group-hover:text-[#2563EB]" />
            </button>
          </div>

          {/* CTA */}
          <div className="pt-2 space-y-3">
            <button
              onClick={() => handleStartChat()}
              className="w-full bg-[#2563EB] hover:bg-blue-700 active:scale-[0.99] text-white font-semibold text-sm py-3.5 rounded-2xl flex items-center justify-center gap-2 shadow-lg shadow-blue-500/25 transition-all"
            >
              <MessageSquare className="w-4 h-4" />
              <span>Mulai percakapan</span>
            </button>

            <div className="flex items-start gap-2 pt-0.5 text-slate-400 text-[11px]">
              <ShieldCheck className="w-4 h-4 shrink-0 text-slate-400 mt-0.5" />
              <p className="leading-snug">
                Asisten AI bukan dokter. Informasi bersifat edukasi, bukan diagnosis atau pengganti konsultasi dokter kulit.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // VIEW 2: ACTIVE CONVERSATION (181223.png)
  const firstTimestamp = messages[0]?.createdAt ?? new Date().toISOString();

  return (
    <div className="flex-1 flex flex-col justify-between bg-white overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 bg-white z-20 relative">
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setInConversation(false)}
            className="w-8 h-8 rounded-full flex items-center justify-center text-slate-700 hover:bg-slate-100 transition-colors"
            aria-label="Kembali"
          >
            <ArrowLeft className="w-5 h-5 stroke-[2.2]" />
          </button>
          <div>
            <h1 className="text-sm font-bold text-slate-900 leading-tight">
              Asisten AcneVision
            </h1>
            <p className="text-[11px] text-slate-400 mt-0.5">Asisten AI • Bukan dokter</p>
          </div>
        </div>

        <button
          onClick={() => setMenuOpen((o) => !o)}
          className="w-8 h-8 rounded-full flex items-center justify-center text-slate-600 hover:bg-slate-100 transition-colors"
          aria-label="Menu"
        >
          <MoreVertical className="w-4 h-4 stroke-[2]" />
        </button>

        {menuOpen && (
          <div className="absolute right-4 top-12 w-44 bg-white rounded-2xl shadow-xl border border-slate-100 py-1.5 z-50 text-xs menu-pop">
            <button
              onClick={handleDeleteActiveConversation}
              className="w-full flex items-center gap-2 px-3.5 py-2 text-red-600 hover:bg-red-50 text-left"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Tutup / hapus sesi</span>
            </button>
          </div>
        )}
      </div>

      {/* Dynamic Blue Context Bar */}
      {includeLatestScan && ctxTotal !== null && (
        <div className="bg-[#EEF4FF] px-4 py-2 border-b border-blue-100 space-y-0.5 z-10">
          <div className="flex items-center gap-1.5 text-[#2563EB] font-bold text-[11px]">
            <ScanLine className="w-3.5 h-3.5 shrink-0" />
            <span>
              Hasil {ctxCreatedAt ? formatIndonesianDate(ctxCreatedAt, true) : ''} • {ctxTotal} jerawat • {ctxSeverityLabel}
            </span>
          </div>
          <p className="text-[10px] text-slate-500">
            Percakapan menggunakan estimasi dari pemindaianmu.
          </p>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3.5 text-xs sm:text-sm">
        <div className="text-center my-1">
          <span className="text-[10px] font-bold tracking-wider text-slate-400 uppercase">
            {formatChatDayHeader(firstTimestamp)}
          </span>
        </div>

        {messages.map((msg) => {
          if (msg.sender === 'user') {
            return (
              <div key={msg.id} className="flex justify-end msg-in">
                <div className="bg-[#2563EB] text-white rounded-[20px] rounded-tr-xs px-4 py-3 max-w-[84%] shadow-xs leading-relaxed text-xs sm:text-sm whitespace-pre-line">
                  {msg.text}
                </div>
              </div>
            );
          }

          return (
            <div key={msg.id} className="flex justify-start msg-in">
              <div className="bg-[#F8FAFC] border border-slate-100 text-slate-800 rounded-[22px] rounded-tl-xs p-4 max-w-[88%] shadow-xs space-y-2 leading-relaxed text-xs sm:text-sm">
                <div className="flex items-center gap-1.5 text-[#2563EB] font-bold text-[11px]">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>AcneVision AI</span>
                </div>
                <div className="whitespace-pre-line text-slate-700">{msg.text}</div>
              </div>
            </div>
          );
        })}

        {isTyping && (
          <div className="flex justify-start">
            <div className="bg-[#F8FAFC] border border-slate-100 text-slate-500 rounded-[20px] rounded-tl-xs px-4 py-2.5 flex items-center gap-1.5 text-xs">
              <Sparkles className="w-3.5 h-3.5 text-[#2563EB] animate-spin" />
              <span>Mengetik jawaban...</span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Composer */}
      <div className="p-3 border-t border-slate-100 bg-white space-y-2 z-20">
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          <button
            onClick={() => handleSendMessage('Urutan rutinitas pagi')}
            className="whitespace-nowrap bg-white border border-blue-200 text-[#2563EB] hover:bg-blue-50 text-[11px] font-semibold px-3 py-1.5 rounded-full shadow-xs transition-colors"
          >
            Urutan rutinitas pagi
          </button>
          <button
            onClick={() => handleSendMessage('Kapan pindai lagi?')}
            className="whitespace-nowrap bg-white border border-blue-200 text-[#2563EB] hover:bg-blue-50 text-[11px] font-semibold px-3 py-1.5 rounded-full shadow-xs transition-colors"
          >
            Kapan pindai lagi?
          </button>
        </div>

        <div className="flex items-center gap-2 bg-[#F1F5F9] rounded-full px-3 py-1.5 border border-slate-200/60 focus-within:ring-2 focus-within:ring-blue-500/20 focus-within:bg-white transition-all">
          <input
            type="text"
            value={inputVal}
            onChange={(e) => setInputVal(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSendMessage();
            }}
            placeholder="Tanyakan tentang kulitmu..."
            className="flex-1 bg-transparent border-none outline-none text-xs sm:text-sm text-slate-800 placeholder-slate-400 px-2 py-1"
          />
          <button
            onClick={() => handleSendMessage()}
            disabled={!inputVal.trim()}
            className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${
              inputVal.trim()
                ? 'bg-[#2563EB] text-white shadow-sm hover:bg-blue-700'
                : 'bg-slate-300 text-white cursor-not-allowed'
            }`}
            aria-label="Kirim"
          >
            <ArrowUp className="w-4 h-4 stroke-[2.5]" />
          </button>
        </div>

        <p className="text-[10px] text-slate-400 text-center pt-0.5">
          AI dapat keliru. Bukan pengganti dokter kulit.
        </p>
      </div>
    </div>
  );
}
