import { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Check } from 'lucide-react';
import { useScan } from '../store/scan';
import { useAuth } from '../store/auth';
import { api } from '../lib/runtime';
import { errMessage } from '../lib/errors';

const STEPS = [
  'Memeriksa jenis dan jumlah jerawat',
  'Mengenali kondisi kulit',
  'Menyusun ringkasan hasil',
] as const;

export default function Analyzing() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const shouldSave = params.get('save') === '1';

  const { pendingPhoto, setScan, setDetection, setSaved, remember } = useScan();
  const { user } = useAuth();

  const [step, setStep] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [retryKey, setRetryKey] = useState(0);

  // Snapshot initial photo & track completion so clearing pendingPhoto never redirects back to /scan
  const snapshotRef = useRef(pendingPhoto);
  if (pendingPhoto && !snapshotRef.current) {
    snapshotRef.current = pendingPhoto;
  }
  const completedRef = useRef(false);
  const abortRef = useRef<AbortController | null>(null);

  // Redirect back to /scan ONLY if entered directly with no photo at all
  useEffect(() => {
    if (!pendingPhoto && !snapshotRef.current && !completedRef.current) {
      navigate('/scan', { replace: true });
    }
  }, [pendingPhoto, navigate]);

  useEffect(() => {
    const photo = snapshotRef.current;
    if (!photo || completedRef.current) return;

    const controller = new AbortController();
    abortRef.current = controller;

    const t1 = setTimeout(() => setStep(1), 500);
    const t2 = setTimeout(() => setStep(2), 1100);

    const runAnalysis = async () => {
      try {
        const inputMethod = photo.source === 'camera' ? 'camera' : 'upload';

        if (user && shouldSave) {
          const res = await api.analyze(photo.file, {
            source: 'mobile',
            input_method: inputMethod,
            signal: controller.signal,
          });
          if (controller.signal.aborted) return;

          completedRef.current = true;
          const stableUrl = URL.createObjectURL(photo.file);
          const nowIso = new Date().toISOString();
          setScan(res, stableUrl, nowIso);
          await remember(user.id, photo.file);

          try {
            const saved = await api.saveScan(res.analysis_id);
            setSaved(saved.scan_id);
          } catch {
            // Even if saving history fails, still proceed to the analysis result
          }

          navigate(`/analysis/${res.analysis_id}`, { replace: true });
          return;
        }

        const detection = await api.detect(photo.file, {
          source: 'mobile',
          input_method: inputMethod,
          mode: 'capture',
        });
        if (controller.signal.aborted) return;

        completedRef.current = true;
        const stableUrl = URL.createObjectURL(photo.file);
        setDetection(detection, stableUrl, new Date().toISOString());
        navigate('/detect-result', { replace: true });
      } catch (err) {
        if (controller.signal.aborted) return;
        setError(errMessage(err) || 'Gagal menganalisis foto. Periksa koneksi Anda dan coba lagi.');
      } finally {
        clearTimeout(t1);
        clearTimeout(t2);
      }
    };

    runAnalysis();

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      controller.abort();
    };
  }, [navigate, remember, retryKey, setDetection, setSaved, setScan, shouldSave, user]);

  const activePhoto = pendingPhoto ?? snapshotRef.current;
  if (!activePhoto) return null;

  const progressPct = error ? 100 : step === 0 ? 38 : step === 1 ? 72 : 94;

  const handleCancel = () => {
    abortRef.current?.abort();
    navigate('/scan/preview', { replace: true });
  };

  return (
    <div className="flex-1 flex flex-col justify-between bg-white overflow-y-auto">
      <div className="px-5 pt-4 pb-6 space-y-5">
        {/* Header */}
        <div className="flex items-center gap-3">
          <button
            onClick={handleCancel}
            className="w-9 h-9 rounded-full flex items-center justify-center text-slate-700 hover:bg-slate-100 transition-colors"
            aria-label="Kembali"
          >
            <ArrowLeft className="w-5 h-5 stroke-[2.2]" />
          </button>
          <h1 className="text-[17px] font-bold text-slate-900">Analisis kulit</h1>
        </div>

        {/* Photo Preview */}
        <div className="rounded-[24px] overflow-hidden aspect-[4/3.6] bg-slate-100 border border-slate-100 shadow-xs">
          <img
            src={activePhoto.previewUrl}
            alt="Foto sedang dianalisis"
            className="w-full h-full object-cover object-center"
          />
        </div>

        {/* Headline */}
        <div className="space-y-1.5">
          <h2 className="text-[22px] font-extrabold text-slate-900 tracking-tight">
            {error ? 'Analisis terhenti' : 'Sedang menganalisis...'}
          </h2>
          <p className="text-xs text-slate-500 leading-relaxed">
            {error ? error : 'Sebentar ya, kami sedang mempelajari foto kulitmu.'}
          </p>
        </div>

        {/* Progress Card */}
        {!error ? (
          <div className="bg-[#EEF4FF]/70 rounded-[22px] p-4 space-y-3 border border-blue-100/60">
            <p className="text-xs font-bold text-slate-900">{STEPS[step]}</p>

            <div className="w-full h-2 bg-blue-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-[#2563EB] rounded-full transition-all duration-500 ease-out"
                style={{ width: `${progressPct}%` }}
              />
            </div>

            <ol className="space-y-1.5 text-xs pt-1">
              <li className="flex items-center gap-2 text-slate-600">
                <Check className="w-3.5 h-3.5 text-[#2563EB] shrink-0" />
                <span>Foto siap</span>
              </li>
              <li className={`flex items-center gap-2 ${step >= 1 ? 'text-slate-800 font-medium' : 'text-slate-400'}`}>
                {step >= 2 ? (
                  <Check className="w-3.5 h-3.5 text-[#2563EB] shrink-0" />
                ) : (
                  <span className="w-3.5 text-center font-semibold">2</span>
                )}
                <span>Mengenali kondisi kulit</span>
              </li>
              <li className={`flex items-center gap-2 ${step >= 2 ? 'text-slate-800 font-medium' : 'text-slate-400'}`}>
                <span className="w-3.5 text-center font-semibold">3</span>
                <span>Menyusun ringkasan hasil</span>
              </li>
            </ol>
          </div>
        ) : (
          <div className="bg-red-50 rounded-[20px] p-4 border border-red-100 text-xs text-red-700 space-y-2">
            <p className="font-bold">Terjadi kendala saat menghubungi layanan analisis.</p>
            <button
              onClick={() => {
                setError(null);
                setStep(0);
                setRetryKey((k) => k + 1);
              }}
              className="bg-red-600 text-white font-semibold px-4 py-2 rounded-xl"
            >
              Coba lagi
            </button>
          </div>
        )}
      </div>

      {/* Bottom Note & Cancel */}
      <div className="px-5 pb-6 space-y-3">
        <p className="text-[11px] text-slate-400 leading-snug">
          Estimasi AI, bukan diagnosis medis. Hasil dapat dipengaruhi cahaya dan sudut foto.
        </p>

        <button
          onClick={handleCancel}
          className="w-full bg-[#EEF4FF] hover:bg-blue-100/80 text-[#2563EB] font-semibold text-sm py-3.5 rounded-2xl transition-colors"
        >
          Batalkan analisis
        </button>
      </div>
    </div>
  );
}
