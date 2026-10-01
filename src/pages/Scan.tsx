import { useCallback, useRef, useState, type DragEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import Webcam from 'react-webcam';
import { Camera, ImageUp, Loader2 } from 'lucide-react';
import { ALLOWED_IMAGE_TYPES, COPY, MAX_UPLOAD_BYTES } from '@acnevision/shared';
import { api } from '../lib/runtime';
import { errMessage } from '../lib/errors';
import { useScan } from '../store/scan';
import { ErrorBox } from '../components/ui';

type Mode = 'camera' | 'upload';

export default function Scan() {
  const [mode, setMode] = useState<Mode>('camera');
  const [camError, setCamError] = useState(false);
  const [camReady, setCamReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [drag, setDrag] = useState(false);
  const cam = useRef<Webcam>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const setScan = useScan((s) => s.setScan);
  const navigate = useNavigate();

  const analyze = useCallback(async (file: File, method: Mode) => {
    setError(null);
    if (!(ALLOWED_IMAGE_TYPES as readonly string[]).includes(file.type)) {
      setError('File harus berupa gambar JPEG, PNG, atau WEBP.');
      return;
    }
    if (file.size > MAX_UPLOAD_BYTES) {
      setError('Ukuran file maksimal 10 MB.');
      return;
    }
    setBusy(true);
    try {
      const analysis = await api.analyze(file, { source: 'web', input_method: method });
      setScan(analysis, URL.createObjectURL(file));
      navigate('/result');
    } catch (e) {
      setError(errMessage(e, 'Analisis gagal. Coba lagi.'));
      setBusy(false);
    }
  }, [navigate, setScan]);

  async function capture() {
    const shot = cam.current?.getScreenshot();
    if (!shot) { setError('Gagal mengambil gambar dari kamera.'); return; }
    const blob = await (await fetch(shot)).blob();
    analyze(new File([blob], 'capture.jpg', { type: 'image/jpeg' }), 'camera');
  }

  function onDrop(e: DragEvent) {
    e.preventDefault(); setDrag(false);
    const f = e.dataTransfer.files[0];
    if (f) analyze(f, 'upload');
  }

  const showUpload = mode === 'upload' || camError;

  return (
    <div className="space-y-6">
      <header><h1>Live Detection</h1><p className="mt-1">Ambil foto langsung atau unggah dari galeri.</p></header>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="card relative lg:col-span-2">
          <div className="mb-4 flex gap-2" role="tablist">
            <button role="tab" aria-selected={!showUpload} className={!showUpload ? 'btn-primary' : 'btn-outline'} onClick={() => setMode('camera')} disabled={camError}>
              <Camera className="h-4 w-4" aria-hidden /> Kamera
            </button>
            <button role="tab" aria-selected={showUpload} className={showUpload ? 'btn-primary' : 'btn-outline'} onClick={() => setMode('upload')}>
              <ImageUp className="h-4 w-4" aria-hidden /> Upload Foto
            </button>
          </div>

          {camError && (
            <div className="mb-4"><ErrorBox message="Izin kamera ditolak atau kamera tidak tersedia. Gunakan Upload Foto sebagai gantinya." /></div>
          )}

          {!showUpload ? (
            <div className="relative overflow-hidden rounded-card bg-slate-900">
              <Webcam
                ref={cam} audio={false} mirrored screenshotFormat="image/jpeg" screenshotQuality={0.92}
                videoConstraints={{ facingMode: 'user', width: 1280, height: 960 }}
                onUserMedia={() => setCamReady(true)}
                onUserMediaError={() => setCamError(true)}
                className="block w-full"
              />
              <span className="badge absolute left-3 top-3 gap-1.5 bg-white/90 text-ink-900">
                <span className="h-2 w-2 animate-pulse rounded-full bg-danger" aria-hidden /> Live Preview
              </span>
            </div>
          ) : (
            <div
              onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
              onDragLeave={() => setDrag(false)}
              onDrop={onDrop}
              className={`flex h-72 flex-col items-center justify-center gap-3 rounded-card border-2 border-dashed text-center ${drag ? 'border-primary-600 bg-primary-50' : 'border-border'}`}
            >
              <ImageUp className="h-10 w-10 text-primary-600" aria-hidden />
              <p className="text-sm">Tarik foto ke sini, atau</p>
              <button className="btn-primary" onClick={() => fileInput.current?.click()}>Pilih Foto</button>
              <p className="text-xs text-ink-400">JPEG, PNG, atau WEBP. Maks 10 MB.</p>
              <input ref={fileInput} type="file" accept="image/jpeg,image/png,image/webp" hidden
                onChange={(e) => { const f = e.target.files?.[0]; if (f) analyze(f, 'upload'); e.target.value = ''; }} />
            </div>
          )}

          {!showUpload && (
            <button className="btn-primary mt-4 w-full py-3" onClick={capture} disabled={!camReady || busy}>
              Ambil &amp; Analisis
            </button>
          )}
          {error && <div className="mt-4"><ErrorBox message={error} /></div>}

          {busy && (
            <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 rounded-card bg-white/85" role="status">
              <Loader2 className="h-10 w-10 animate-spin text-primary-600" aria-hidden />
              <p className="font-semibold text-ink-900">{COPY.analyzing}</p>
            </div>
          )}
        </div>

        <aside className="card h-fit bg-primary-50">
          <h3 className="mb-3">Tips untuk hasil terbaik</h3>
          <ul className="space-y-2 text-sm">
            {COPY.photoTips.map((t) => (
              <li key={t} className="flex gap-2"><span className="text-success" aria-hidden>✓</span>{t}</li>
            ))}
          </ul>
        </aside>
      </div>
    </div>
  );
}
