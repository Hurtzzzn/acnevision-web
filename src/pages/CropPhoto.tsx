import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { useScan } from '../store/scan';
import { useUi } from '../store/ui';

interface CropBox {
  x: number;
  y: number;
  w: number;
  h: number;
}

type DragMode = 'move' | 'nw' | 'ne' | 'sw' | 'se' | null;

const MIN_SIZE = 0.25;

export default function CropPhoto() {
  const navigate = useNavigate();
  const { pendingPhoto, setPendingPhoto } = useScan();
  const toast = useUi((s) => s.toast);

  const containerRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const [crop, setCrop] = useState<CropBox>({ x: 0.08, y: 0.08, w: 0.84, h: 0.84 });
  const [saving, setSaving] = useState(false);

  const dragRef = useRef<{
    mode: DragMode;
    startX: number;
    startY: number;
    startCrop: CropBox;
  }>({ mode: null, startX: 0, startY: 0, startCrop: { x: 0.08, y: 0.08, w: 0.84, h: 0.84 } });

  useEffect(() => {
    if (!pendingPhoto) {
      navigate('/scan', { replace: true });
    }
  }, [pendingPhoto, navigate]);

  if (!pendingPhoto) return null;

  const beginDrag = (mode: DragMode) => (e: React.PointerEvent) => {
    e.stopPropagation();
    e.preventDefault();
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    dragRef.current = {
      mode,
      startX: e.clientX,
      startY: e.clientY,
      startCrop: { ...crop },
    };
  };

  const onPointerMove = (e: React.PointerEvent) => {
    const { mode, startX, startY, startCrop } = dragRef.current;
    const rect = containerRef.current?.getBoundingClientRect();
    if (!mode || !rect || rect.width === 0 || rect.height === 0) return;

    const dx = (e.clientX - startX) / rect.width;
    const dy = (e.clientY - startY) / rect.height;

    if (mode === 'move') {
      const nx = Math.max(0, Math.min(1 - startCrop.w, startCrop.x + dx));
      const ny = Math.max(0, Math.min(1 - startCrop.h, startCrop.y + dy));
      setCrop({ ...startCrop, x: nx, y: ny });
      return;
    }

    let { x, y, w, h } = startCrop;
    if (mode.includes('w')) {
      const nextX = Math.max(0, Math.min(startCrop.x + startCrop.w - MIN_SIZE, startCrop.x + dx));
      w = startCrop.x + startCrop.w - nextX;
      x = nextX;
    }
    if (mode.includes('e')) {
      w = Math.max(MIN_SIZE, Math.min(1 - startCrop.x, startCrop.w + dx));
    }
    if (mode.includes('n')) {
      const nextY = Math.max(0, Math.min(startCrop.y + startCrop.h - MIN_SIZE, startCrop.y + dy));
      h = startCrop.y + startCrop.h - nextY;
      y = nextY;
    }
    if (mode.includes('s')) {
      h = Math.max(MIN_SIZE, Math.min(1 - startCrop.y, startCrop.h + dy));
    }
    setCrop({ x, y, w, h });
  };

  const endDrag = () => {
    dragRef.current.mode = null;
  };

  const handleFinishCrop = async () => {
    const img = imgRef.current;
    if (!img || !img.naturalWidth || !img.naturalHeight) {
      navigate('/scan/preview');
      return;
    }
    setSaving(true);
    try {
      const sx = Math.round(crop.x * img.naturalWidth);
      const sy = Math.round(crop.y * img.naturalHeight);
      const sw = Math.max(1, Math.round(crop.w * img.naturalWidth));
      const sh = Math.max(1, Math.round(crop.h * img.naturalHeight));

      const canvas = document.createElement('canvas');
      canvas.width = sw;
      canvas.height = sh;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Canvas unavailable');
      ctx.drawImage(img, sx, sy, sw, sh, 0, 0, sw, sh);

      const blob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Export failed'))), 'image/jpeg', 0.92);
      });
      const croppedFile = new File([blob], `crop-${Date.now()}.jpg`, { type: 'image/jpeg' });
      const croppedUrl = URL.createObjectURL(croppedFile);

      setPendingPhoto({
        file: croppedFile,
        previewUrl: croppedUrl,
        source: pendingPhoto.source,
        originalFile: pendingPhoto.originalFile ?? pendingPhoto.file,
      });
      navigate('/scan/preview');
    } catch {
      toast('Gagal memotong foto. Silakan coba lagi.', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col justify-between bg-white overflow-y-auto select-none">
      <div className="px-5 pt-4 pb-4 space-y-4">
        {/* Top Bar */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/scan/preview')}
            className="w-9 h-9 rounded-full flex items-center justify-center text-slate-700 hover:bg-slate-100 transition-colors"
            aria-label="Kembali"
          >
            <ArrowLeft className="w-5 h-5 stroke-[2.2]" />
          </button>
          <h1 className="text-[17px] font-bold text-slate-900">Crop foto</h1>
        </div>

        {/* Instruction */}
        <div className="space-y-1">
          <h2 className="text-[20px] font-extrabold text-slate-900 tracking-tight">
            Fokuskan pada seluruh wajah
          </h2>
          <p className="text-xs text-slate-500 leading-relaxed">
            Geser dan sesuaikan bingkai. Pastikan dahi hingga dagu tetap terlihat.
          </p>
        </div>

        {/* Interactive 3x3 Crop Canvas */}
        <div
          ref={containerRef}
          onPointerMove={onPointerMove}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
          className="relative w-full aspect-[4/4.4] rounded-[24px] overflow-hidden bg-slate-900 touch-none shadow-sm"
        >
          <img
            ref={imgRef}
            src={pendingPhoto.previewUrl}
            alt="Foto yang akan dicrop"
            className="w-full h-full object-fill pointer-events-none"
          />

          {/* Dimmed backdrop via box-shadow around active crop window */}
          <div
            onPointerDown={beginDrag('move')}
            style={{
              left: `${crop.x * 100}%`,
              top: `${crop.y * 100}%`,
              width: `${crop.w * 100}%`,
              height: `${crop.h * 100}%`,
              boxShadow: '0 0 0 9999px rgba(15, 23, 42, 0.55)',
            }}
            className="absolute border-2 border-white cursor-move"
          >
            {/* 3x3 Grid Lines */}
            <div className="absolute inset-y-0 left-1/3 w-px bg-white/60 pointer-events-none" />
            <div className="absolute inset-y-0 left-2/3 w-px bg-white/60 pointer-events-none" />
            <div className="absolute inset-x-0 top-1/3 h-px bg-white/60 pointer-events-none" />
            <div className="absolute inset-x-0 top-2/3 h-px bg-white/60 pointer-events-none" />

            {/* 4 Corner Drag Handles */}
            <div
              onPointerDown={beginDrag('nw')}
              className="absolute -top-2 -left-2 w-6 h-6 cursor-nwse-resize flex items-center justify-center"
            >
              <span className="w-3.5 h-3.5 border-t-[3px] border-l-[3px] border-white rounded-tl-xs" />
            </div>
            <div
              onPointerDown={beginDrag('ne')}
              className="absolute -top-2 -right-2 w-6 h-6 cursor-nesw-resize flex items-center justify-center"
            >
              <span className="w-3.5 h-3.5 border-t-[3px] border-r-[3px] border-white rounded-tr-xs" />
            </div>
            <div
              onPointerDown={beginDrag('sw')}
              className="absolute -bottom-2 -left-2 w-6 h-6 cursor-nesw-resize flex items-center justify-center"
            >
              <span className="w-3.5 h-3.5 border-b-[3px] border-l-[3px] border-white rounded-bl-xs" />
            </div>
            <div
              onPointerDown={beginDrag('se')}
              className="absolute -bottom-2 -right-2 w-6 h-6 cursor-nwse-resize flex items-center justify-center"
            >
              <span className="w-3.5 h-3.5 border-b-[3px] border-r-[3px] border-white rounded-br-xs" />
            </div>
          </div>
        </div>

        <p className="text-[11px] text-slate-400 text-center">
          Rasio bebas · Wajah tetap utuh
        </p>
      </div>

      {/* Bottom Buttons */}
      <div className="px-5 pb-6 space-y-2.5">
        <button
          onClick={handleFinishCrop}
          disabled={saving}
          className="w-full bg-[#2563EB] hover:bg-blue-700 active:scale-[0.99] text-white font-semibold text-sm py-3.5 rounded-2xl shadow-lg shadow-blue-500/20 transition-all disabled:opacity-60"
        >
          {saving ? 'Menyimpan potongan...' : 'Selesai crop'}
        </button>

        <button
          onClick={() => navigate('/scan/preview')}
          className="w-full bg-[#EEF4FF] hover:bg-blue-100/80 text-[#2563EB] font-semibold text-sm py-3.5 rounded-2xl transition-colors"
        >
          Batalkan
        </button>
      </div>
    </div>
  );
}
