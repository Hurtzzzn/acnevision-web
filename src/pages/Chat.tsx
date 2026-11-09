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
} from 'lucide-react';
import heroineImg from '../assets/images/heroine.png';

interface ChatMessage {
  id: string;
  sender: 'user' | 'ai';
  text: string;
  bullets?: string[];
  caveat?: string;
}

const INITIAL_MESSAGES: ChatMessage[] = [
  {
    id: 'm1',
    sender: 'user',
    text: 'Hasilku sedang. Apakah ini parah? Pipiku juga agak merah.',
  },
  {
    id: 'm2',
    sender: 'ai',
    text: 'Wajar kalau kamu khawatir, Nadia. Dari foto, AI memperkirakan 10 komedo, 6 papula, dan 2 pustula. Label "sedang" membantu memantau, bukan menentukan diagnosis.\n\nKemerahan bisa dipengaruhi iritasi atau cahaya foto. Apakah terasa nyeri berat, atau muncul setelah mencoba produk baru?',
  },
  {
    id: 'm3',
    sender: 'user',
    text: 'Tidak nyeri berat. Aku baru pakai scrub tiap hari. Harus bagaimana?',
  },
  {
    id: 'm4',
    sender: 'ai',
    text: 'Scrub setiap hari dapat mengiritasi kulit. Coba rutinitas yang lebih lembut dulu:',
    bullets: [
      'Hentikan scrub sementara.',
      'Bersihkan wajah dengan lembut.',
      'Pakai pelembap nonkomedogenik.',
      'Gunakan tabir surya SPF 30+.',
    ],
    caveat:
      'Jika merah menetap, memburuk, atau timbul nyeri berat dan benjolan dalam, temui dokter kulit. Aku bukan dokter dan tidak meresepkan obat.',
  },
];

export default function Chat() {
  // Mode: 'intro' (Screenshot 161335) or 'conversation' (Screenshot 161545)
  const [inConversation, setInConversation] = useState(false);
  const [includeLatestScan, setIncludeLatestScan] = useState(true);
  const [messages, setMessages] = useState<ChatMessage[]>(INITIAL_MESSAGES);
  const [inputVal, setInputVal] = useState('');
  const [isTyping, setIsTyping] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (inConversation) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, inConversation, isTyping]);

  const handleStartChat = (initialPrompt?: string) => {
    setInConversation(true);
    if (initialPrompt) {
      handleSendMessage(initialPrompt);
    }
  };

  const handleSendMessage = (textToSend?: string) => {
    const text = (textToSend ?? inputVal).trim();
    if (!text) return;

    const newMsg: ChatMessage = {
      id: `u-${Date.now()}`,
      sender: 'user',
      text,
    };

    setMessages((prev) => [...prev, newMsg]);
    setInputVal('');
    setIsTyping(true);

    setTimeout(() => {
      let replyText = 'Terima kasih atas ceritamu. ';
      let bullets: string[] | undefined;

      if (text.toLowerCase().includes('pagi') || text.toLowerCase().includes('rutinitas')) {
        replyText = 'Untuk rutinitas pagi yang ramah kulit jerawat:';
        bullets = [
          'Gunakan pembersih wajah berbusa lembut non-SLS.',
          'Gunakan pelembap gel ringan (non-comedogenic).',
          'Akhiri dengan tabir surya/sunscreen minimal SPF 30 PA+++.',
        ];
      } else if (text.toLowerCase().includes('kapan') || text.toLowerCase().includes('lagi')) {
        replyText = 'Beri jeda 7 hingga 14 hari untuk pemindaian berikutnya dengan pencahayaan yang sama agar perubahannya terpantau optimal.';
      } else if (text.toLowerCase().includes('arti') || text.toLowerCase().includes('hasil')) {
        replyText = 'Hasil "Sedang" dengan 18 jerawat menunjukkan sebagian besar berupa komedo (pori tersumbat) dengan beberapa papula meradang. Langkah awal terbaik adalah menjaga hidrasi dan kebersihan.';
      } else {
        replyText = 'Kulit butuh waktu 2-4 minggu untuk beradaptasi dengan perubahan perawatan. Tetap gunakan pembersih lembut dan pelembap yang aman tanpa memencet jerawat.';
      }

      setMessages((prev) => [
        ...prev,
        {
          id: `ai-${Date.now()}`,
          sender: 'ai',
          text: replyText,
          bullets,
        },
      ]);
      setIsTyping(false);
    }, 900);
  };

  // -------------------------------------------------------------
  // VIEW 1: INTRO / MULAI KONSULTASI AI (Screenshot 2026-11-05 161335)
  // -------------------------------------------------------------
  if (!inConversation) {
    return (
      <div className="flex-1 flex flex-col justify-between bg-white overflow-y-auto">
        <div className="px-5 pt-3 pb-6 space-y-5">
          {/* Top Header Bar */}
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-bold text-slate-900">
              Konsultasi AI
            </h1>
            <button
              onClick={() => setInConversation(true)}
              className="w-9 h-9 rounded-full flex items-center justify-center text-slate-600 hover:bg-slate-100 transition-colors"
              aria-label="Riwayat konsultasi"
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

          {/* Toggle Card: Sertakan hasil pindai terbaru */}
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

            {includeLatestScan && (
              <div className="flex items-center gap-3 pt-1">
                <div className="w-14 h-14 rounded-xl overflow-hidden bg-slate-100 shrink-0 border border-slate-100 shadow-xs">
                  <img
                    src={heroineImg}
                    alt="Scan preview"
                    className="w-full h-full object-cover object-top"
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] text-slate-400">8 Okt 2026 • 08.42</p>
                  <p className="text-sm font-bold text-slate-900 mt-0.5">
                    18 jerawat terdeteksi
                  </p>
                </div>
                <span className="bg-[#FEF3C7] text-[#D97706] text-xs font-bold px-2.5 py-0.5 rounded-full shrink-0">
                  Sedang
                </span>
              </div>
            )}
          </div>

          {/* Section: Mulai dari yang kamu butuhkan */}
          <div className="space-y-2.5 pt-1">
            <h3 className="text-sm font-bold text-slate-900">
              Mulai dari yang kamu butuhkan
            </h3>

            {/* Prompt 1 */}
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

            {/* Prompt 2 */}
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

            {/* Prompt 3 */}
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

          {/* Action CTA Button */}
          <div className="pt-2 space-y-3">
            <button
              onClick={() => handleStartChat()}
              className="w-full bg-[#2563EB] hover:bg-blue-700 active:scale-[0.99] text-white font-semibold text-sm py-3.5 rounded-2xl flex items-center justify-center gap-2 shadow-lg shadow-blue-500/25 transition-all"
            >
              <MessageSquare className="w-4 h-4" />
              <span>Mulai percakapan</span>
            </button>

            {/* Disclaimer */}
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

  // -------------------------------------------------------------
  // VIEW 2: ACTIVE CONVERSATION (Screenshot 2026-11-05 161545)
  // -------------------------------------------------------------
  return (
    <div className="flex-1 flex flex-col justify-between bg-white overflow-hidden">
      {/* Conversation Top Header */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-slate-100 bg-white z-20">
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
            <p className="text-[11px] text-slate-400 mt-0.5">
              Asisten AI • Bukan dokter
            </p>
          </div>
        </div>

        <button
          className="w-8 h-8 rounded-full flex items-center justify-center text-slate-600 hover:bg-slate-100 transition-colors"
          aria-label="Menu"
        >
          <MoreVertical className="w-4 h-4 stroke-[2]" />
        </button>
      </div>

      {/* Blue Context Bar */}
      <div className="bg-[#EEF4FF] px-4 py-2 border-b border-blue-100 flex items-center justify-between text-xs z-10">
        <div className="flex items-center gap-1.5 text-[#2563EB] font-bold text-[11px]">
          <ScanLine className="w-3.5 h-3.5" />
          <span>Hasil 8 Okt • 18 jerawat • Sedang</span>
        </div>
        <span className="text-[10px] text-slate-500">
          Percakapan menggunakan estimasi dari pemindaianmu.
        </span>
      </div>

      {/* Chat Messages Stream */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3.5 text-xs sm:text-sm">
        {/* Timestamp */}
        <div className="text-center my-1">
          <span className="text-[10px] font-bold tracking-wider text-slate-400 uppercase">
            HARI INI, 08.43
          </span>
        </div>

        {messages.map((msg) => {
          if (msg.sender === 'user') {
            return (
              <div key={msg.id} className="flex justify-end">
                <div className="bg-[#2563EB] text-white rounded-[20px] rounded-tr-xs px-4 py-3 max-w-[84%] shadow-xs leading-relaxed text-xs sm:text-sm">
                  {msg.text}
                </div>
              </div>
            );
          }

          return (
            <div key={msg.id} className="flex justify-start">
              <div className="bg-[#F8FAFC] border border-slate-100 text-slate-800 rounded-[22px] rounded-tl-xs p-4 max-w-[88%] shadow-xs space-y-2 leading-relaxed text-xs sm:text-sm">
                <div className="flex items-center gap-1.5 text-[#2563EB] font-bold text-[11px]">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>AcneVision AI</span>
                </div>

                <div className="whitespace-pre-line text-slate-700">
                  {msg.text}
                </div>

                {msg.bullets && (
                  <ul className="space-y-1 text-slate-700 pt-0.5">
                    {msg.bullets.map((b, idx) => (
                      <li key={idx} className="flex items-start gap-1.5">
                        <span className="text-slate-400 font-bold">•</span>
                        <span>{b}</span>
                      </li>
                    ))}
                  </ul>
                )}

                {msg.caveat && (
                  <p className="text-[11px] text-slate-500 pt-1 border-t border-slate-100 leading-snug">
                    {msg.caveat}
                  </p>
                )}
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

      {/* Bottom Composer & Quick Reply Chips */}
      <div className="p-3 border-t border-slate-100 bg-white space-y-2 z-20">
        {/* Quick Suggestion Chips */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
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

        {/* Input Pill Bar */}
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

        {/* Caption */}
        <p className="text-[10px] text-slate-400 text-center pt-0.5">
          AI dapat keliru. Bukan pengganti dokter kulit.
        </p>
      </div>
    </div>
  );
}
