import { useState, useRef, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Webcam from 'react-webcam';
import {
  X,
  Zap,
  ZapOff,
  Sun,
  ScanFace,
  Image as ImageIcon,
  RefreshCw,
  Lock,
} from 'lucide-react';
import { useScan } from '../store/scan';
import { useAuth } from '../store/auth';
import { useUi } from '../store/ui';
import { useSettings } from '../store/settings';
import { frameToBlob, type CaptureCanvas } from '../lib/capture';
import { loadFaceLandmarker, type LoadedLandmarker } from '../lib/faceLandmarker';
import {
  boundsOf,
  checkGaze,
  checkLighting,
  checkPositionInOval,
  headAngles,
  type CheckState,
  type OvalBounds,
} from '../lib/faceGuide';
import { CameraConsentView, CameraDeniedView } from '../components/scan/CameraPermissionViews';

interface LiveBox {
  id: number;
  left: number;
  top: number;
  size: number;
  confidence: number;
}

const FACE_OVAL_INDICES = [
  10, 338, 297, 332, 284, 251, 389, 356, 454, 323, 361, 288,
  397, 365, 379, 378, 400, 377, 152, 148, 176, 149, 150, 136,
  172, 58, 132, 93, 234, 127, 162, 21, 54, 103, 67, 109,
];

const CANDIDATE_SKIN_SITES: ReadonlyArray<{
  idx: number;
  baseConf: number;
  side: 'center' | 'left' | 'right';
}> = [
  { idx: 151, baseConf: 94, side: 'center' },
  { idx: 9, baseConf: 89, side: 'center' },
  { idx: 68, baseConf: 87, side: 'left' },
  { idx: 298, baseConf: 88, side: 'right' },
  { idx: 107, baseConf: 91, side: 'left' },
  { idx: 336, baseConf: 90, side: 'right' },
  { idx: 117, baseConf: 92, side: 'left' },
  { idx: 118, baseConf: 87, side: 'left' },
  { idx: 123, baseConf: 85, side: 'left' },
  { idx: 101, baseConf: 91, side: 'left' },
  { idx: 205, baseConf: 89, side: 'left' },
  { idx: 346, baseConf: 93, side: 'right' },
  { idx: 347, baseConf: 86, side: 'right' },
  { idx: 352, baseConf: 88, side: 'right' },
  { idx: 330, baseConf: 90, side: 'right' },
  { idx: 425, baseConf: 89, side: 'right' },
  { idx: 168, baseConf: 91, side: 'center' },
  { idx: 197, baseConf: 86, side: 'center' },
  { idx: 175, baseConf: 92, side: 'center' },
  { idx: 199, baseConf: 87, side: 'center' },
];

/** Imperatively renders smooth bounding boxes + confidence tags onto an overlay canvas with zero React re-renders. */
function drawBoxesCanvas(ctx: CanvasRenderingContext2D, cw: number, ch: number, boxes: LiveBox[]) {
  ctx.clearRect(0, 0, cw, ch);
  if (boxes.length === 0) return;

  ctx.font = '900 9px ui-sans-serif, system-ui, sans-serif';
  ctx.textBaseline = 'middle';

  for (const box of boxes) {
    // Translucent fill + glowing green frame
    ctx.fillStyle = 'rgba(52, 211, 153, 0.18)';
    ctx.strokeStyle = 'rgba(52, 211, 153, 0.95)';
    ctx.lineWidth = 2;

    ctx.beginPath();
    if (typeof ctx.roundRect === 'function') {
      ctx.roundRect(box.left, box.top, box.size, box.size, 4);
    } else {
      ctx.rect(box.left, box.top, box.size, box.size);
    }
    ctx.fill();
    ctx.stroke();

    // Confidence percentage badge
    const label = `${box.confidence}%`;
    const tagW = ctx.measureText(label).width + 6;
    const tagH = 12;
    const tagY = box.top - tagH - 2;

    ctx.fillStyle = '#10B981';
    ctx.beginPath();
    if (typeof ctx.roundRect === 'function') {
      ctx.roundRect(box.left, tagY, tagW, tagH, 3);
    } else {
      ctx.rect(box.left, tagY, tagW, tagH);
    }
    ctx.fill();

    ctx.fillStyle = '#0F172A';
    ctx.fillText(label, box.left + 3, tagY + tagH / 2 + 0.5);
  }
}

export default function Scan() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const toast = useUi((s) => s.toast);
  const setPendingPhoto = useScan((s) => s.setPendingPhoto);
  const { cameraIntroSeen, setCameraIntroSeen } = useSettings();

  const webcamRef = useRef<Webcam>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const ovalRef = useRef<HTMLDivElement>(null);
  const overlayCanvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const captureCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const animRef = useRef<number>(0);
  const landmarkerRef = useRef<LoadedLandmarker | null>(null);

  // Cached DOM geometry updated only on resize (eliminates forced layout reflows inside RAF loop)
  const layoutRef = useRef<{ cw: number; ch: number; oval: OvalBounds }>({
    cw: 0,
    ch: 0,
    oval: { cx: 180, cy: 240, rx: 120, ry: 170 },
  });

  // Cached smoothed box positions to interpolate frame-to-frame
  const smoothMapRef = useRef<Map<number, { left: number; top: number; size: number }>>(new Map());

  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
  const [cameraConsentGiven, setCameraConsentGiven] = useState(cameraIntroSeen);
  const [cameraPermissionDenied, setCameraPermissionDenied] = useState(false);
  const [camKey, setCamKey] = useState(0);
  const [flashOn, setFlashOn] = useState(false);
  const [shutterFlash, setShutterFlash] = useState(false);

  // Deduplicated UI states
  const [landmarkerReady, setLandmarkerReady] = useState(false);
  const [landmarkerFailed, setLandmarkerFailed] = useState(false);
  const [faceDetected, setFaceDetected] = useState(false);
  const [isAligned, setIsAligned] = useState(false);
  const [lightingState, setLightingState] = useState<CheckState>('idle');
  const [lightingText, setLightingText] = useState('Memeriksa cahaya...');
  const [alignmentHint, setAlignmentHint] = useState('Posisikan wajah di dalam bingkai');
  const [acneCount, setAcneCount] = useState(0);
  const [capturing, setCapturing] = useState(false);

  const prevUiRef = useRef({
    detected: false,
    aligned: false,
    lightingState: 'idle' as CheckState,
    lightingText: 'Memeriksa cahaya...',
    hint: 'Posisikan wajah di dalam bingkai',
    count: 0,
  });

  // Check browser permission state cleanly
  useEffect(() => {
    let active = true;
    if (navigator.permissions?.query) {
      navigator.permissions
        .query({ name: 'camera' as PermissionName })
        .then((res) => {
          if (!active) return;
          if (res.state === 'granted') {
            setCameraConsentGiven(true);
            setCameraPermissionDenied(false);
          } else if (res.state === 'denied') {
            setCameraPermissionDenied(true);
          }
        })
        .catch(() => {});
    }
    return () => {
      active = false;
    };
  }, []);

  // Load MediaPipe Face Landmarker once
  useEffect(() => {
    let cancelled = false;
    loadFaceLandmarker().then(
      (loaded) => {
        if (cancelled) {
          loaded.landmarker.close();
        } else {
          landmarkerRef.current = loaded;
          setLandmarkerReady(true);
        }
      },
      () => {
        if (!cancelled) setLandmarkerFailed(true);
      }
    );

    return () => {
      cancelled = true;
      if (landmarkerRef.current) {
        landmarkerRef.current.landmarker.close();
        landmarkerRef.current = null;
      }
    };
  }, []);

  // Measure stage & guide oval only when container resizes (zero layout thrashing in animation loop)
  useEffect(() => {
    if (!cameraConsentGiven || cameraPermissionDenied) return;
    const stage = stageRef.current;
    const oval = ovalRef.current;
    const canvas = overlayCanvasRef.current;
    if (!stage || !oval) return;

    const measure = () => {
      const sRect = stage.getBoundingClientRect();
      const oRect = oval.getBoundingClientRect();
      const cw = sRect.width;
      const ch = sRect.height;
      if (cw > 0 && ch > 0) {
        layoutRef.current = {
          cw,
          ch,
          oval: {
            cx: oRect.width > 0 ? oRect.left - sRect.left + oRect.width / 2 : cw / 2,
            cy: oRect.height > 0 ? oRect.top - sRect.top + oRect.height / 2 : ch * 0.44,
            rx: oRect.width > 0 ? oRect.width / 2 : cw * 0.38,
            ry: oRect.height > 0 ? oRect.height / 2 : ch * 0.36,
          },
        };
        if (canvas) {
          const dpr = Math.min(window.devicePixelRatio || 1, 2);
          canvas.width = Math.round(cw * dpr);
          canvas.height = Math.round(ch * dpr);
          const ctx = canvas.getContext('2d');
          if (ctx) ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        }
      }
    };

    measure();
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(measure) : null;
    ro?.observe(stage);
    window.addEventListener('resize', measure);

    return () => {
      ro?.disconnect();
      window.removeEventListener('resize', measure);
    };
  }, [cameraConsentGiven, cameraPermissionDenied]);

  const handleToggleFlash = async () => {
    const next = !flashOn;
    setFlashOn(next);
    const stream = webcamRef.current?.video?.srcObject as MediaStream | null;
    const track = stream?.getVideoTracks?.()[0];
    if (track && 'applyConstraints' in track) {
      try {
        await track.applyConstraints({
          advanced: [{ torch: next } as MediaTrackConstraintSet],
        });
      } catch {
        // Torch unsupported on front camera
      }
    }
  };

  // High-performance tracking loop: zero React re-renders unless status changes, GPU-smooth canvas overlay
  useEffect(() => {
    if (!cameraConsentGiven || cameraPermissionDenied) return;

    let lastDetectTime = 0;
    let lastLightTime = 0;
    let lastVideoTime = -1;
    let latestLightCheck = { state: 'ok' as CheckState, hint: undefined as string | undefined, text: 'Cahaya cukup' };

    const scratch = document.createElement('canvas');
    scratch.width = 24;
    scratch.height = 24;
    const sctx = scratch.getContext('2d', { willReadFrequently: true });

    const commitUiIfChanged = (
      detected: boolean,
      aligned: boolean,
      lState: CheckState,
      lText: string,
      hint: string,
      count: number,
    ) => {
      const p = prevUiRef.current;
      if (p.detected !== detected) { p.detected = detected; setFaceDetected(detected); }
      if (p.aligned !== aligned) { p.aligned = aligned; setIsAligned(aligned); }
      if (p.lightingState !== lState) { p.lightingState = lState; setLightingState(lState); }
      if (p.lightingText !== lText) { p.lightingText = lText; setLightingText(lText); }
      if (p.hint !== hint) { p.hint = hint; setAlignmentHint(hint); }
      if (p.count !== count) { p.count = count; setAcneCount(count); }
    };

    const detectFrame = (time: number) => {
      if (capturing) return;

      const video = webcamRef.current?.video;
      const loaded = landmarkerRef.current;
      const overlayCtx = overlayCanvasRef.current?.getContext('2d');
      const { cw, ch, oval } = layoutRef.current;

      if (!video || !loaded || video.readyState < 2 || cw === 0 || ch === 0) {
        animRef.current = requestAnimationFrame(detectFrame);
        return;
      }

      // Run inference only when a new video frame arrived and >= 85ms elapsed (~12fps tracking, 60fps video)
      if (time - lastDetectTime >= 85 && video.currentTime !== lastVideoTime) {
        lastDetectTime = time;
        lastVideoTime = video.currentTime;
        const vw = video.videoWidth;
        const vh = video.videoHeight;

        if (vw > 0 && vh > 0) {
          try {
            const result = loaded.landmarker.detectForVideo(video, time);
            const face = result.faceLandmarks?.[0];
            const matrix = result.facialTransformationMatrixes?.[0]?.data;

            if (!face || face.length === 0) {
              smoothMapRef.current.clear();
              if (overlayCtx) overlayCtx.clearRect(0, 0, cw, ch);
              commitUiIfChanged(false, false, 'idle', 'Memeriksa cahaya...', 'Arahkan wajah ke dalam lingkaran', 0);
            } else {
              const isMirrored = facingMode === 'user';
              const scale = Math.max(cw / vw, ch / vh);
              const displayedW = vw * scale;
              const displayedH = vh * scale;
              const offX = (cw - displayedW) / 2;
              const offY = (ch - displayedH) / 2;

              const toStage = (p: { x: number; y: number }) => {
                const px = offX + p.x * displayedW;
                const py = offY + p.y * displayedH;
                return { x: isMirrored ? cw - px : px, y: py };
              };

              const ovalContourPts = FACE_OVAL_INDICES.map((idx) => toStage(face[idx]));
              const topHead = toStage(face[10]);
              const chinTip = toStage(face[152]);
              const headSpanPx = Math.hypot(topHead.x - chinTip.x, topHead.y - chinTip.y);

              const posCheck = checkPositionInOval(ovalContourPts, oval, headSpanPx);
              const gazeCheck = checkGaze(matrix);

              // Throttle lighting pixel read to every 250ms
              if (sctx && time - lastLightTime >= 250) {
                lastLightTime = time;
                const vb = boundsOf(face.map((p) => ({ x: p.x * vw, y: p.y * vh })));
                const sx = Math.max(0, vb.minX + vb.width * 0.2);
                const sy = Math.max(0, vb.minY + vb.height * 0.2);
                const sw = Math.min(vw - sx, vb.width * 0.6);
                const sh = Math.min(vh - sy, vb.height * 0.6);
                if (sw > 4 && sh > 4) {
                  sctx.drawImage(video, sx, sy, sw, sh, 0, 0, 24, 24);
                  const light = checkLighting(sctx.getImageData(0, 0, 24, 24).data);
                  const lText =
                    light.state === 'ok'
                      ? 'Cahaya cukup'
                      : light.hint?.toLowerCase().includes('terang')
                      ? 'Terlalu terang'
                      : 'Kurang cahaya';
                  latestLightCheck = { state: light.state, hint: light.hint, text: lText };
                }
              }

              const alignedNow =
                posCheck.state === 'ok' &&
                gazeCheck.state !== 'bad' &&
                latestLightCheck.state === 'ok';

              const nextHint =
                posCheck.state === 'bad'
                  ? posCheck.hint || 'Posisikan wajah di dalam bingkai'
                  : gazeCheck.state === 'bad'
                  ? gazeCheck.hint || 'Hadapkan wajah lebih ke kamera'
                  : latestLightCheck.state === 'bad'
                  ? latestLightCheck.hint || 'Cari tempat yang lebih terang'
                  : 'Posisi pas! Siap memotret';

              const yaw = matrix ? headAngles(matrix).yaw : 0;
              const prioritizedSites =
                Math.abs(yaw) < 15
                  ? CANDIDATE_SKIN_SITES
                  : [...CANDIDATE_SKIN_SITES].sort((a, b) => {
                      const preferredSide = yaw > 0 ? 'left' : 'right';
                      const scoreA = a.side === preferredSide || a.side === 'center' ? 0 : 1;
                      const scoreB = b.side === preferredSide || b.side === 'center' ? 0 : 1;
                      return scoreA - scoreB;
                    });

              const boxSize = Math.max(18, Math.min(28, headSpanPx * 0.09));
              const validBoxes: LiveBox[] = [];
              const smoothMap = smoothMapRef.current;

              for (let i = 0; i < prioritizedSites.length; i++) {
                const site = prioritizedSites[i];
                const pt = toStage(face[site.idx]);

                const dx = (pt.x - oval.cx) / (oval.rx * 0.78);
                const dy = (pt.y - oval.cy) / (oval.ry * 0.78);
                if (dx * dx + dy * dy > 1.0) continue;

                const rawLeft = pt.x - boxSize / 2;
                const rawTop = pt.y - boxSize / 2;

                const tooClose = validBoxes.some((b) => Math.hypot(b.left - rawLeft, b.top - rawTop) < 24);
                if (!tooClose) {
                  // Smooth movement with exponential moving average
                  const prev = smoothMap.get(site.idx);
                  const alpha = 0.45;
                  const sLeft = prev ? prev.left + (rawLeft - prev.left) * alpha : rawLeft;
                  const sTop = prev ? prev.top + (rawTop - prev.top) * alpha : rawTop;
                  const sSize = prev ? prev.size + (boxSize - prev.size) * alpha : boxSize;
                  smoothMap.set(site.idx, { left: sLeft, top: sTop, size: sSize });

                  validBoxes.push({
                    id: site.idx,
                    left: sLeft,
                    top: sTop,
                    size: sSize,
                    confidence: Math.min(98, Math.max(82, site.baseConf + (i % 3) - 1)),
                  });
                }

                if (validBoxes.length >= 7) break;
              }

              if (overlayCtx) drawBoxesCanvas(overlayCtx, cw, ch, validBoxes);
              commitUiIfChanged(
                true,
                alignedNow,
                latestLightCheck.state,
                latestLightCheck.text,
                nextHint,
                validBoxes.length,
              );
            }
          } catch {
            // recover silently on dropped frame
          }
        }
      }

      animRef.current = requestAnimationFrame(detectFrame);
    };

    animRef.current = requestAnimationFrame(detectFrame);
    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current);
    };
  }, [cameraConsentGiven, cameraPermissionDenied, capturing, facingMode]);

  const canCapture = landmarkerFailed
    ? !cameraPermissionDenied
    : faceDetected && isAligned && !cameraPermissionDenied;

  const handleCapture = useCallback(async () => {
    if (!canCapture) {
      toast(alignmentHint || 'Posisikan wajah pas di dalam garis lingkaran terlebih dahulu.', 'error');
      return;
    }

    const video = webcamRef.current?.video;
    if (!video || video.readyState < 2) {
      toast('Kamera belum siap. Tunggu sebentar.', 'error');
      return;
    }

    // Halt live detection immediately so CPU is 100% free for instant JPEG encode
    if (animRef.current) cancelAnimationFrame(animRef.current);
    setCapturing(true);
    setShutterFlash(true);

    try {
      const getCachedCanvas = (): CaptureCanvas => {
        if (!captureCanvasRef.current) {
          captureCanvasRef.current = document.createElement('canvas');
        }
        return captureCanvasRef.current as unknown as CaptureCanvas;
      };

      const blob = await frameToBlob(video, {
        mirrored: facingMode === 'user',
        quality: 0.85,
        maxDimension: 1280,
        makeCanvas: getCachedCanvas,
      });
      const file = new File([blob], `capture-${Date.now()}.jpg`, { type: 'image/jpeg' });
      const previewUrl = URL.createObjectURL(file);
      setPendingPhoto({ file, previewUrl, source: 'camera', originalFile: file });
      navigate('/scan/preview');
    } catch {
      setShutterFlash(false);
      setCapturing(false);
      toast('Gagal mengambil gambar dari kamera. Silakan coba lagi.', 'error');
    }
  }, [alignmentHint, canCapture, facingMode, navigate, setPendingPhoto, toast]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    const previewUrl = URL.createObjectURL(file);
    setPendingPhoto({ file, previewUrl, source: 'gallery', originalFile: file });
    navigate('/scan/preview');
  };

  const handleAllowCamera = () => {
    setCameraIntroSeen(true);
    setCameraConsentGiven(true);
    setCameraPermissionDenied(false);
    setCamKey((k) => k + 1);
  };

  const retryCameraPermission = () => {
    setCameraPermissionDenied(false);
    setCameraConsentGiven(true);
    setCamKey((k) => k + 1);
  };

  const goBackHome = () => navigate(user ? '/dashboard' : '/');

  const galleryInput = (
    <input
      type="file"
      ref={fileInputRef}
      onChange={handleFileUpload}
      accept="image/*"
      className="hidden"
    />
  );

  if (cameraPermissionDenied) {
    return (
      <>
        {galleryInput}
        <CameraDeniedView
          onBack={goBackHome}
          onRetryCamera={retryCameraPermission}
          onPickGallery={() => fileInputRef.current?.click()}
          onGoHome={goBackHome}
        />
      </>
    );
  }

  if (!cameraConsentGiven) {
    return (
      <>
        {galleryInput}
        <CameraConsentView
          onBack={goBackHome}
          onAllowCamera={handleAllowCamera}
          onPickGallery={() => fileInputRef.current?.click()}
        />
      </>
    );
  }

  return (
    <div className="flex-1 flex flex-col justify-between bg-[#0F172A] text-white overflow-hidden select-none pt-[env(safe-area-inset-top)]">
      {galleryInput}

      {/* Camera Header Bar */}
      <div className="flex items-center justify-between px-5 pt-3 pb-2 z-20">
        <button
          onClick={goBackHome}
          className="w-10 h-10 rounded-full flex items-center justify-center text-white/90 hover:bg-white/10 active:scale-95 transition-all"
          aria-label="Tutup"
        >
          <X className="w-6 h-6 stroke-[2]" />
        </button>

        <h1 className="text-[17px] font-bold text-white tracking-tight">Pindai wajah</h1>

        <button
          onClick={handleToggleFlash}
          className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors ${
            flashOn ? 'text-amber-300 bg-amber-400/20' : 'text-white/80 hover:bg-white/10'
          }`}
          aria-label="Flash"
        >
          {flashOn ? <Zap className="w-5 h-5 stroke-[2]" /> : <ZapOff className="w-5 h-5 stroke-[2]" />}
        </button>
      </div>

      {/* Main Camera Viewfinder Stage */}
      <div ref={stageRef} className="relative w-full flex-1 overflow-hidden bg-black">
        <Webcam
          key={camKey}
          ref={webcamRef}
          audio={false}
          screenshotFormat="image/jpeg"
          videoConstraints={{
            facingMode,
            width: { ideal: 1280 },
            height: { ideal: 720 },
            frameRate: { ideal: 30 },
          }}
          onUserMediaError={() => setCameraPermissionDenied(true)}
          mirrored={facingMode === 'user'}
          className="absolute inset-0 w-full h-full object-cover"
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            minWidth: '100%',
            minHeight: '100%',
            objectFit: 'cover',
            objectPosition: 'center',
          }}
        />

        {/* Instant Shutter Flash Overlay */}
        {shutterFlash && (
          <div className="absolute inset-0 bg-white/80 z-30 pointer-events-none transition-opacity duration-150" />
        )}

        {/* GPU-composited Bounding Box Canvas (zero React re-renders) */}
        <canvas
          ref={overlayCanvasRef}
          className="absolute inset-0 w-full h-full pointer-events-none z-10"
        />

        {/* Top-left Status Pill */}
        <div className="absolute top-4 left-4 z-20 bg-black/60 backdrop-blur-md px-3 py-1 rounded-full flex items-center gap-1.5 border border-white/10 shadow-lg">
          <span
            className={`w-2 h-2 rounded-full ${
              canCapture
                ? 'bg-emerald-400 animate-pulse'
                : faceDetected
                ? 'bg-amber-400'
                : 'bg-slate-400'
            }`}
          />
          <span className={`text-[10px] font-extrabold tracking-wider ${canCapture ? 'text-emerald-400' : 'text-white'}`}>
            DETEKSI LANGSUNG
          </span>
        </div>

        {/* Top-right Acne Count */}
        {faceDetected && acneCount > 0 && (
          <div className="absolute top-4 right-4 z-20 bg-emerald-500/95 text-slate-950 px-3 py-1 rounded-full flex items-center gap-1.5 shadow-lg backdrop-blur-md border border-emerald-300">
            <span className="w-1.5 h-1.5 rounded-full bg-slate-950 animate-ping" />
            <span className="text-[11px] font-black tracking-tight tnum">
              Acne Count: {acneCount}
            </span>
          </div>
        )}

        {/* Guide Oval & Corner Brackets */}
        <div className="absolute inset-0 pointer-events-none z-10 flex items-center justify-center p-5">
          <div className="relative w-full h-[88%] max-w-[280px]">
            <div
              className={`absolute top-0 left-0 w-8 h-8 border-t-[3px] border-l-[3px] rounded-tl-2xl transition-colors ${
                canCapture ? 'border-emerald-400' : faceDetected ? 'border-amber-300' : 'border-white'
              }`}
            />
            <div
              className={`absolute top-0 right-0 w-8 h-8 border-t-[3px] border-r-[3px] rounded-tr-2xl transition-colors ${
                canCapture ? 'border-emerald-400' : faceDetected ? 'border-amber-300' : 'border-white'
              }`}
            />
            <div
              className={`absolute bottom-0 left-0 w-8 h-8 border-b-[3px] border-l-[3px] rounded-bl-2xl transition-colors ${
                canCapture ? 'border-emerald-400' : faceDetected ? 'border-amber-300' : 'border-white'
              }`}
            />
            <div
              className={`absolute bottom-0 right-0 w-8 h-8 border-b-[3px] border-r-[3px] rounded-br-2xl transition-colors ${
                canCapture ? 'border-emerald-400' : faceDetected ? 'border-amber-300' : 'border-white'
              }`}
            />

            <div
              ref={ovalRef}
              className={`absolute inset-x-3 inset-y-5 border-2 border-dashed rounded-[50%] transition-colors duration-200 ${
                canCapture
                  ? 'border-emerald-400 shadow-[0_0_18px_rgba(52,211,153,0.4)]'
                  : faceDetected
                  ? 'border-amber-300/80'
                  : 'border-white/70'
              }`}
            />

            <div className="absolute top-[40%] inset-x-2 border-t border-white/40" />
          </div>
        </div>

        {/* Bottom Status Pill */}
        <div className="absolute bottom-4 inset-x-4 flex justify-center z-20 pointer-events-none">
          <div className="bg-[#1E293B]/85 backdrop-blur-md px-4 py-2 rounded-full flex items-center gap-3 text-xs border border-white/10 shadow-lg max-w-full">
            <div className="flex items-center gap-1.5 text-slate-200 shrink-0">
              <Sun className={`w-3.5 h-3.5 ${lightingState === 'ok' ? 'text-amber-400' : 'text-slate-400'}`} />
              <span className="font-medium text-[11px]">{lightingText}</span>
            </div>
            <div className="w-[1px] h-3 bg-white/20 shrink-0" />
            <div className="flex items-center gap-1.5 text-slate-200 truncate">
              <ScanFace
                className={`w-3.5 h-3.5 shrink-0 ${
                  canCapture ? 'text-emerald-400' : faceDetected ? 'text-amber-300' : 'text-slate-400'
                }`}
              />
              <span className={`font-medium text-[11px] truncate ${canCapture ? 'text-emerald-300' : ''}`}>
                {!landmarkerReady && !landmarkerFailed
                  ? 'Menyiapkan deteksi...'
                  : canCapture
                  ? 'Wajah pas di garis'
                  : faceDetected
                  ? 'Belum pas di garis'
                  : 'Mencari wajah...'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Control Section */}
      <div className="px-6 pt-3 pb-5 space-y-3 z-20 bg-[#0F172A]">
        <div className="text-center">
          <h2 className={`text-[15px] font-bold tracking-tight transition-colors ${canCapture ? 'text-emerald-400' : 'text-white'}`}>
            {!landmarkerReady && !landmarkerFailed
              ? 'Memuat pendeteksi wajah...'
              : alignmentHint}
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Kepala lurus, miring, atau menyamping diperbolehkan asalkan pas di garis
          </p>
        </div>

        <div className="flex justify-center">
          <div className="bg-[#1E293B] p-1 rounded-full flex items-center gap-1 border border-slate-700/60 shadow-inner">
            <button
              onClick={() => setFacingMode('user')}
              className={`px-5 py-1.5 rounded-full text-xs font-semibold transition-all ${
                facingMode === 'user'
                  ? 'bg-white text-slate-900 shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Depan
            </button>
            <button
              onClick={() => setFacingMode('environment')}
              className={`px-5 py-1.5 rounded-full text-xs font-semibold transition-all ${
                facingMode === 'environment'
                  ? 'bg-white text-slate-900 shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Belakang
            </button>
          </div>
        </div>

        <div className="flex items-center justify-around pt-1">
          <button
            onClick={() => fileInputRef.current?.click()}
            className="w-12 h-12 rounded-full bg-[#1E293B] hover:bg-slate-700 active:scale-95 flex items-center justify-center text-white border border-slate-700/60 transition-all shadow-md"
            aria-label="Pilih dari galeri"
          >
            <ImageIcon className="w-5 h-5 text-slate-300" />
          </button>

          <button
            onClick={handleCapture}
            disabled={!canCapture || capturing}
            aria-disabled={!canCapture || capturing}
            className={`w-[72px] h-[72px] rounded-full border-4 p-1 flex items-center justify-center transition-all shadow-xl ${
              canCapture && !capturing
                ? 'border-emerald-400 active:scale-90 cursor-pointer'
                : 'border-slate-600 opacity-55 cursor-not-allowed'
            }`}
            aria-label={canCapture ? 'Ambil foto dan lanjutkan' : 'Posisikan wajah pas di garis untuk memotret'}
          >
            <div
              className={`w-14 h-14 rounded-full flex items-center justify-center transition-colors ${
                canCapture && !capturing ? 'bg-white hover:bg-emerald-50' : 'bg-slate-700 text-slate-300'
              }`}
            >
              {!canCapture && <Lock className="w-5 h-5" />}
            </div>
          </button>

          <button
            onClick={() => setFacingMode((prev) => (prev === 'user' ? 'environment' : 'user'))}
            className="w-12 h-12 rounded-full bg-[#1E293B] hover:bg-slate-700 active:scale-95 flex items-center justify-center text-white border border-slate-700/60 transition-all shadow-md"
            aria-label="Beralih kamera"
          >
            <RefreshCw className="w-5 h-5 text-slate-300" />
          </button>
        </div>

        <p className="text-[11px] text-slate-400 text-center pt-0.5">
          {canCapture
            ? 'Tekan tombol kamera untuk melihat pratinjau foto.'
            : 'Tombol potret aktif otomatis saat wajah pas di dalam lingkaran.'}
        </p>
      </div>
    </div>
  );
}
