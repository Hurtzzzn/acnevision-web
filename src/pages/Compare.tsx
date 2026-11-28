import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowDown, ArrowLeft, ArrowUp, Check, ChevronDown, Images } from 'lucide-react';
import type { ScanListItem, Severity } from '@acnevision/shared';
import { api } from '../lib/runtime';
import { useAuth } from '../store/auth';
import { authPath } from '../lib/redirect';
import { formatCompareSpan, formatIndonesianDate, formatTimeHHMM } from '../lib/dateTime';
import { isValidAfterScan, resolveComparePair } from '../lib/compare';
import { Modal } from '../components/ui';

function severityLabelId(s: Severity | null | undefined, total: number): string {
  if (total === 0 || !s) return 'Bersih';
  if (s === 'mild') return 'Ringan';
  if (s === 'severe') return 'Berat';
  if (s === 'very_severe') return 'Sangat Berat';
  return 'Sedang';
}

export default function Compare() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { user } = useAuth();

  const [scans, setScans] = useState<ScanListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [beforeId, setBeforeId] = useState<string>('');
  const [afterId, setAfterId] = useState<string>('');
  const [pickerTab, setPickerTab] = useState<'before' | 'after' | null>(null);

  useEffect(() => {
    let active = true;
    if (!user) {
      setScans([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    api
      .listScans(1, 50)
      .then((res) => {
        if (!active) return;
        const items = res.items;
        setScans(items);
        const pair = resolveComparePair(items, undefined, params.get('after'));
        if (pair) {
          setBeforeId(pair.before.scan_id);
          setAfterId(pair.after.scan_id);
        }
      })
      .catch(() => {
        if (active) setScans([]);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [params, user]);

  const selection = useMemo(
    () => resolveComparePair(scans, beforeId, afterId),
    [scans, beforeId, afterId]
  );

  // Ordered newest -> oldest for visual gallery grid
  const scansNewestFirst = useMemo(
    () => [...scans].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()),
    [scans]
  );

  const handleSelectPhoto = (target: 'before' | 'after', scanId: string) => {
    const nextPair =
      target === 'before'
        ? resolveComparePair(scans, scanId, afterId)
        : resolveComparePair(scans, beforeId, scanId);
    if (nextPair) {
      setBeforeId(nextPair.before.scan_id);
      setAfterId(nextPair.after.scan_id);
    }
    setPickerTab(null);
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-white text-xs text-slate-500">
        Memuat data perbandingan...
      </div>
    );
  }

  if (!user || !selection) {
    return (
      <div className="flex-1 flex flex-col justify-between bg-white overflow-y-auto">
        <div className="px-5 pt-4 pb-6 space-y-5">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate(-1)}
              className="w-9 h-9 rounded-full flex items-center justify-center text-slate-700 hover:bg-slate-100 transition-colors"
              aria-label="Kembali"
            >
              <ArrowLeft className="w-5 h-5 stroke-[2.2]" />
            </button>
            <h1 className="text-[17px] font-bold text-slate-900">Sebelum &amp; sesudah</h1>
          </div>

          <div className="bg-[#EEF4FF]/70 rounded-[24px] p-5 space-y-2 border border-blue-100/60">
            <h2 className="text-lg font-extrabold text-slate-900">
              Butuh minimal 2 foto tersimpan
            </h2>
            <p className="text-xs text-slate-600 leading-relaxed">
              {user
                ? 'Simpan minimal dua hasil pemindaian wajah di riwayat untuk membandingkan perubahan kulitmu dari waktu ke waktu.'
                : 'Masuk dan simpan minimal dua hasil pemindaian untuk membandingkan progres kulitmu.'}
            </p>
          </div>
        </div>

        <div className="px-5 pb-6 space-y-2.5">
          <Link
            to={user ? '/scan' : authPath('/login', '/compare')}
            className="w-full bg-[#2563EB] text-white font-semibold text-sm py-3.5 rounded-2xl flex items-center justify-center"
          >
            {user ? 'Pindai wajah sekarang' : 'Masuk ke akun'}
          </Link>
          <button
            onClick={() => navigate(-1)}
            className="w-full bg-[#EEF4FF] text-[#2563EB] font-semibold text-sm py-3.5 rounded-2xl"
          >
            Kembali
          </button>
        </div>
      </div>
    );
  }

  const { before: beforeScan, after: afterScan, beforeOptions } = selection;
  const newestScanId = scansNewestFirst[0]?.scan_id;

  const diff = beforeScan.total_lesions - afterScan.total_lesions;
  const pct =
    beforeScan.total_lesions > 0
      ? Math.round((Math.abs(diff) / beforeScan.total_lesions) * 100)
      : 0;
  const spanLabel = formatCompareSpan(beforeScan.created_at, afterScan.created_at);

  const beforeSev = severityLabelId(beforeScan.severity, beforeScan.total_lesions);
  const afterSev = severityLabelId(afterScan.severity, afterScan.total_lesions);

  const isImproved = diff > 0;
  const isSame = diff === 0;

  return (
    <div className="flex-1 flex flex-col justify-between bg-white overflow-y-auto">
      <div className="px-5 pt-4 pb-6 space-y-5">
        {/* Header */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="w-9 h-9 rounded-full flex items-center justify-center text-slate-700 hover:bg-slate-100 transition-colors"
            aria-label="Kembali"
          >
            <ArrowLeft className="w-5 h-5 stroke-[2.2]" />
          </button>
          <h1 className="text-[17px] font-bold text-slate-900">Sebelum &amp; sesudah</h1>
        </div>

        {/* Title */}
        <div className="space-y-1.5">
          <h2 className="text-[22px] font-extrabold text-slate-900 leading-snug tracking-tight">
            Perubahan kecil,
            <br />
            langkah yang berarti.
          </h2>
          <p className="text-xs text-slate-500 leading-relaxed">
            Ketuk salah satu foto untuk mengganti pasangan pemindaian.
          </p>
        </div>

        {/* Side-by-side Interactive Photo Cards */}
        <div className="grid grid-cols-2 gap-3">
          {/* BEFORE */}
          <button
            type="button"
            onClick={() => setPickerTab('before')}
            className="space-y-1.5 text-left group"
          >
            <p className="text-[10px] font-bold tracking-wider text-[#2563EB] uppercase">SEBELUM</p>
            <div className="relative rounded-[20px] overflow-hidden aspect-[3/3.6] bg-slate-100 border border-slate-200/70 group-hover:border-[#2563EB] transition-colors">
              {beforeScan.thumbnail_url && (
                <img
                  src={beforeScan.thumbnail_url}
                  alt="Foto sebelum"
                  className="w-full h-full object-cover object-top"
                />
              )}
              <span className="absolute bottom-2 right-2 bg-black/60 backdrop-blur-xs text-white text-[10px] font-semibold px-2 py-0.5 rounded-full flex items-center gap-1">
                <Images className="w-3 h-3" />
                Ganti
              </span>
            </div>
            <div className="flex items-center gap-1 text-xs font-bold text-slate-900 group-hover:text-[#2563EB]">
              <span className="truncate">
                {formatIndonesianDate(beforeScan.created_at, true)} • {formatTimeHHMM(new Date(beforeScan.created_at))}
              </span>
              <ChevronDown className="w-3.5 h-3.5 text-slate-500 shrink-0" />
            </div>
            <p className="text-[11px] text-slate-500 tnum">{beforeScan.total_lesions} jerawat</p>
          </button>

          {/* AFTER */}
          <button
            type="button"
            onClick={() => setPickerTab('after')}
            className="space-y-1.5 text-left group"
          >
            <p className="text-[10px] font-bold tracking-wider text-[#2563EB] uppercase">SESUDAH</p>
            <div className="relative rounded-[20px] overflow-hidden aspect-[3/3.6] bg-slate-100 border border-slate-200/70 group-hover:border-[#2563EB] transition-colors">
              {afterScan.thumbnail_url && (
                <img
                  src={afterScan.thumbnail_url}
                  alt="Foto sesudah"
                  className="w-full h-full object-cover object-top"
                />
              )}
              <span className="absolute bottom-2 right-2 bg-black/60 backdrop-blur-xs text-white text-[10px] font-semibold px-2 py-0.5 rounded-full flex items-center gap-1">
                <Images className="w-3 h-3" />
                Ganti
              </span>
            </div>
            <div className="flex items-center gap-1 text-xs font-bold text-slate-900 group-hover:text-[#2563EB]">
              <span className="truncate">
                {formatIndonesianDate(afterScan.created_at, true)} • {formatTimeHHMM(new Date(afterScan.created_at))}
              </span>
              <ChevronDown className="w-3.5 h-3.5 text-slate-500 shrink-0" />
            </div>
            <p className="text-[11px] text-slate-500 tnum">{afterScan.total_lesions} jerawat</p>
          </button>
        </div>

        {/* Dynamic Percentage Card */}
        <div
          className={`rounded-[22px] p-4 space-y-1 border ${
            isImproved || isSame
              ? 'bg-[#DCFCE7]/50 border-emerald-200/60'
              : 'bg-amber-50/80 border-amber-200/60'
          }`}
        >
          <div
            className={`flex items-center gap-1.5 text-2xl font-black tracking-tight tnum ${
              isImproved || isSame ? 'text-[#15803D]' : 'text-amber-700'
            }`}
          >
            {isImproved ? <ArrowDown className="w-5 h-5 stroke-[2.8]" /> : !isSame && <ArrowUp className="w-5 h-5 stroke-[2.8]" />}
            <span>{isSame ? '0%' : `${pct}%`}</span>
          </div>
          <p
            className={`text-xs font-bold ${
              isImproved || isSame ? 'text-[#15803D]' : 'text-amber-800'
            }`}
          >
            {isSame
              ? `Jumlah jerawat stabil ${spanLabel}`
              : isImproved
              ? `${diff} jerawat lebih sedikit ${spanLabel}`
              : `${Math.abs(diff)} jerawat lebih banyak ${spanLabel}`}
          </p>
          <p className="text-[11px] text-slate-600">
            Dari {beforeScan.total_lesions} menjadi {afterScan.total_lesions} jerawat terdeteksi.
          </p>
        </div>

        {/* Severity Transition Card */}
        <div className="bg-[#EEF4FF]/60 rounded-[20px] p-4 space-y-1.5 border border-blue-100/60">
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-600 font-medium">Estimasi tingkat</span>
            <span className="font-bold text-slate-900">
              {beforeSev} &rarr; {afterSev}
            </span>
          </div>
          <p className="text-[11px] text-slate-500 leading-relaxed">
            {beforeSev === afterSev
              ? 'Kategori tingkat masih sama, terus pantau perubahan secara berkala.'
              : `Tingkat keparahan berubah dari ${beforeSev} menjadi ${afterSev}.`}
          </p>
        </div>

        <p className="text-[11px] text-slate-400 leading-snug">
          Perubahan foto bukan bukti efektivitas produk. Hasil AI dipengaruhi cahaya dan sudut wajah.
        </p>

        <button
          onClick={() => setPickerTab('before')}
          className="w-full bg-[#EEF4FF] hover:bg-blue-100/80 text-[#2563EB] font-semibold text-sm py-3.5 rounded-2xl transition-colors"
        >
          Pilih pasangan foto lain
        </button>
      </div>

      {/* Visual Photo Picker Modal (supports distinguishing multiple captures on the same day) */}
      {pickerTab && (
        <Modal
          title={pickerTab === 'before' ? 'Pilih Foto Sebelum' : 'Pilih Foto Sesudah'}
          onClose={() => setPickerTab(null)}
        >
          <div className="space-y-3">
            {/* Switch between Before / After picker tabs */}
            <div className="grid grid-cols-2 gap-1.5 bg-slate-100 p-1 rounded-xl">
              <button
                type="button"
                onClick={() => setPickerTab('before')}
                className={`py-1.5 rounded-lg text-xs font-bold transition-colors ${
                  pickerTab === 'before' ? 'bg-white text-[#2563EB] shadow-xs' : 'text-slate-500'
                }`}
              >
                Foto Sebelum
              </button>
              <button
                type="button"
                onClick={() => setPickerTab('after')}
                className={`py-1.5 rounded-lg text-xs font-bold transition-colors ${
                  pickerTab === 'after' ? 'bg-white text-[#2563EB] shadow-xs' : 'text-slate-500'
                }`}
              >
                Foto Sesudah
              </button>
            </div>

            {pickerTab === 'after' && (
              <p className="text-[11px] text-slate-500">
                Hanya foto pada atau setelah{' '}
                <strong className="text-slate-800">
                  {formatIndonesianDate(beforeScan.created_at, true)} ({formatTimeHHMM(new Date(beforeScan.created_at))})
                </strong>{' '}
                yang bisa dipilih sebagai foto Sesudah.
              </p>
            )}

            <div className="grid grid-cols-2 gap-2.5 max-h-[52vh] overflow-y-auto pr-0.5">
              {scansNewestFirst.map((item) => {
                const isSelected =
                  pickerTab === 'before'
                    ? item.scan_id === beforeScan.scan_id
                    : item.scan_id === afterScan.scan_id;

                const isAllowed =
                  pickerTab === 'before'
                    ? beforeOptions.some((b) => b.scan_id === item.scan_id) || item.scan_id !== newestScanId
                    : isValidAfterScan(item, beforeScan);

                const disabledReason =
                  pickerTab === 'before'
                    ? 'Foto paling baru'
                    : item.scan_id === beforeScan.scan_id
                    ? 'Dipilih sbg Sebelum'
                    : 'Lebih awal';

                return (
                  <button
                    key={item.scan_id}
                    type="button"
                    disabled={!isAllowed}
                    onClick={() => handleSelectPhoto(pickerTab, item.scan_id)}
                    className={`rounded-2xl overflow-hidden border text-left transition-all ${
                      isSelected
                        ? 'border-[#2563EB] ring-2 ring-blue-500/20 bg-blue-50/40'
                        : isAllowed
                        ? 'border-slate-200 hover:border-blue-300 bg-white'
                        : 'border-slate-100 bg-slate-50 opacity-45 cursor-not-allowed'
                    }`}
                  >
                    <div className="relative aspect-[4/3.6] bg-slate-100">
                      {item.thumbnail_url && (
                        <img
                          src={item.thumbnail_url}
                          alt={formatIndonesianDate(item.created_at, true)}
                          className="w-full h-full object-cover object-top"
                        />
                      )}
                      {isSelected && (
                        <span className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full bg-[#2563EB] text-white flex items-center justify-center shadow-xs">
                          <Check className="w-3 h-3 stroke-[3]" />
                        </span>
                      )}
                      {!isAllowed && (
                        <span className="absolute bottom-1.5 inset-x-1.5 bg-slate-900/75 text-white text-[9px] font-semibold px-1.5 py-0.5 rounded-md text-center truncate">
                          {disabledReason}
                        </span>
                      )}
                    </div>
                    <div className="p-2 space-y-0.5">
                      <p className="text-[11px] font-bold text-slate-900 truncate">
                        {formatIndonesianDate(item.created_at, true)} • {formatTimeHHMM(new Date(item.created_at))}
                      </p>
                      <p className="text-[10px] text-slate-500 tnum">
                        {item.total_lesions} jerawat · {severityLabelId(item.severity, item.total_lesions)}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
