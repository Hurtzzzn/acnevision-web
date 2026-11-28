import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, ChevronRight, LogOut, Shield } from 'lucide-react';
import { api } from '../lib/runtime';
import { errMessage } from '../lib/errors';
import { useAuth } from '../store/auth';
import { useUi } from '../store/ui';
import { useSettings } from '../store/settings';
import { Modal } from '../components/ui';

export default function Profile() {
  const { user, setUser, logout } = useAuth();
  const toast = useUi((s) => s.toast);
  const navigate = useNavigate();

  const {
    reminderEnabled,
    reminderDay,
    reminderTime,
    photoConsentMode,
    setReminderEnabled,
    setReminderSchedule,
    setPhotoConsentMode,
    setCameraIntroSeen,
  } = useSettings();

  const [accountModalOpen, setAccountModalOpen] = useState(false);
  const [privacyModalOpen, setPrivacyModalOpen] = useState(false);
  const [scheduleModalOpen, setScheduleModalOpen] = useState(false);

  const [nameInput, setNameInput] = useState(user?.full_name ?? '');
  const [dayInput, setDayInput] = useState(reminderDay);
  const [timeInput, setTimeInput] = useState(reminderTime);
  const [busy, setBusy] = useState(false);

  const displayName = user?.full_name?.trim() || user?.email?.split('@')[0] || 'Tamu';
  const initial = displayName[0]?.toUpperCase() || 'U';

  const handleSaveAccount = async (e: FormEvent) => {
    e.preventDefault();
    if (!nameInput.trim()) return toast('Nama tidak boleh kosong.', 'error');
    setBusy(true);
    try {
      setUser(await api.updateMe({ full_name: nameInput.trim() }));
      toast('Profil diperbarui');
      setAccountModalOpen(false);
    } catch (err) {
      toast(errMessage(err), 'error');
    } finally {
      setBusy(false);
    }
  };

  const handleSaveSchedule = (e: FormEvent) => {
    e.preventDefault();
    setReminderSchedule(dayInput, timeInput);
    setScheduleModalOpen(false);
    toast('Jadwal pengingat diperbarui');
  };

  const handleManageCamera = () => {
    setCameraIntroSeen(false);
    navigate('/scan');
  };

  return (
    <div className="flex-1 flex flex-col justify-between bg-white overflow-y-auto">
      <div className="px-5 pt-4 pb-6 space-y-4">
        {/* Header */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(user ? '/dashboard' : '/')}
            className="w-9 h-9 rounded-full flex items-center justify-center text-slate-700 hover:bg-slate-100 transition-colors"
            aria-label="Kembali"
          >
            <ArrowLeft className="w-5 h-5 stroke-[2.2]" />
          </button>
          <h1 className="text-[17px] font-bold text-slate-900">Profil &amp; pengaturan</h1>
        </div>

        {/* Account Summary Card */}
        <div className="bg-[#EEF4FF]/70 rounded-[24px] p-4 space-y-3 border border-blue-100/60">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-full bg-white text-[#2563EB] font-bold text-lg flex items-center justify-center shadow-xs">
              {initial}
            </div>
            <div className="min-w-0">
              <p className="text-base font-extrabold text-slate-900 truncate">{displayName}</p>
              <p className="text-xs text-slate-500">
                {user ? (user.role === 'admin' ? 'Akun Admin' : 'Akun pribadi') : 'Mode Tamu'}
              </p>
            </div>
          </div>

          <button
            onClick={() => {
              if (!user) navigate('/login?redirectTo=%2Fprofile');
              else {
                setNameInput(user.full_name ?? '');
                setAccountModalOpen(true);
              }
            }}
            className="w-full flex items-center justify-between pt-2 border-t border-blue-200/50 text-xs font-semibold text-[#2563EB]"
          >
            <span>{user ? 'Kelola akun' : 'Masuk ke akun'}</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* Reminder Card */}
        <div className="bg-[#F8FAFC] rounded-[24px] p-4 space-y-2.5 border border-slate-100">
          <div className="flex items-center justify-between">
            <span className="text-sm font-bold text-slate-900">Pengingat pindai</span>
            <button
              type="button"
              role="switch"
              aria-checked={reminderEnabled}
              onClick={() => setReminderEnabled(!reminderEnabled)}
              className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors ${
                reminderEnabled ? 'bg-[#2563EB]' : 'bg-slate-300'
              }`}
            >
              <div
                className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                  reminderEnabled ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          <button
            type="button"
            onClick={() => setScheduleModalOpen(true)}
            className="w-full flex items-center justify-between text-xs text-slate-700 hover:text-[#2563EB] transition-colors"
          >
            <span>{reminderDay}</span>
            <span className="font-bold text-slate-900">{reminderTime}</span>
          </button>

          <p className="text-[11px] text-slate-400">
            Jaga jarak antar-pindai dan gunakan cahaya yang serupa.
          </p>
        </div>

        {/* Privacy & Data Card */}
        <div className="bg-[#F8FAFC] rounded-[24px] p-4 space-y-3 border border-slate-100">
          <h2 className="text-sm font-bold text-slate-900">Privasi &amp; data</h2>

          <button
            type="button"
            onClick={() =>
              setPhotoConsentMode(photoConsentMode === 'per_photo' ? 'always_ask' : 'per_photo')
            }
            className="w-full flex items-center justify-between text-xs py-1"
          >
            <span className="text-slate-700">Persetujuan foto</span>
            <span className="font-bold text-slate-900">
              {photoConsentMode === 'per_photo' ? 'Per foto' : 'Selalu tanya'}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setPrivacyModalOpen(true)}
            className="w-full flex items-center justify-between text-xs py-1 text-[#2563EB] font-medium"
          >
            <span>Kebijakan privasi</span>
            <ChevronRight className="w-4 h-4 text-slate-400" />
          </button>

          <button
            type="button"
            onClick={handleManageCamera}
            className="w-full flex items-center justify-between text-xs py-1 text-[#2563EB] font-medium"
          >
            <span>Izin kamera</span>
            <span className="font-semibold">Kelola</span>
          </button>

          <Link
            to="/profile/delete-data"
            className="w-full flex items-center justify-between text-xs py-1 text-red-600 font-semibold"
          >
            <span>Hapus semua data</span>
            <ChevronRight className="w-4 h-4 text-red-400" />
          </Link>

          <p className="text-[11px] text-slate-400 pt-1 leading-relaxed">
            Foto tidak disimpan tanpa persetujuanmu. Kamu bisa menghapusnya kapan saja.
          </p>
        </div>
      </div>

      {/* Footer */}
      <div className="px-5 pb-6 space-y-3">
        <div className="text-center text-[11px] text-slate-400 space-y-0.5">
          <p>AcneVision AI · Versi 1.0</p>
          <p>Teman memahami kulit, bukan pengganti dokter.</p>
        </div>

        <button
          onClick={() => navigate(user ? '/dashboard' : '/')}
          className="w-full bg-[#EEF4FF] hover:bg-blue-100/80 text-[#2563EB] font-semibold text-sm py-3.5 rounded-2xl transition-colors"
        >
          Kembali ke beranda
        </button>
      </div>

      {/* Modal: Kelola Akun */}
      {accountModalOpen && user && (
        <Modal title="Kelola Akun" onClose={() => setAccountModalOpen(false)}>
          <form onSubmit={handleSaveAccount} className="space-y-4">
            <div>
              <label htmlFor="profile-name" className="mb-1 block text-xs font-semibold text-slate-700">
                Nama lengkap
              </label>
              <input
                id="profile-name"
                className="input"
                value={nameInput}
                onChange={(e) => setNameInput(e.target.value)}
              />
            </div>
            <div>
              <label htmlFor="profile-email" className="mb-1 block text-xs font-semibold text-slate-700">
                Email
              </label>
              <input id="profile-email" className="input bg-slate-50" value={user.email} readOnly />
            </div>
            <button
              type="submit"
              disabled={busy}
              className="w-full bg-[#2563EB] text-white font-semibold text-sm py-2.5 rounded-xl"
            >
              {busy ? 'Menyimpan...' : 'Simpan perubahan'}
            </button>
          </form>

          {user.role === 'admin' && (
            <Link
              to="/admin"
              onClick={() => setAccountModalOpen(false)}
              className="mt-3 w-full border border-slate-200 text-slate-700 font-semibold text-xs py-2.5 rounded-xl flex items-center justify-center gap-2 hover:bg-slate-50"
            >
              <Shield className="w-4 h-4" />
              <span>Buka Panel Admin</span>
            </Link>
          )}

          <button
            type="button"
            onClick={async () => {
              await logout();
              setAccountModalOpen(false);
              navigate('/');
            }}
            className="mt-3 w-full border border-red-200 text-red-600 font-semibold text-xs py-2.5 rounded-xl flex items-center justify-center gap-2 hover:bg-red-50"
          >
            <LogOut className="w-4 h-4" />
            <span>Keluar dari akun</span>
          </button>
        </Modal>
      )}

      {/* Modal: Jadwal Pengingat */}
      {scheduleModalOpen && (
        <Modal title="Atur Pengingat Pindai" onClose={() => setScheduleModalOpen(false)}>
          <form onSubmit={handleSaveSchedule} className="space-y-4">
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-700">Hari</label>
              <select className="input" value={dayInput} onChange={(e) => setDayInput(e.target.value)}>
                {['Setiap Senin', 'Setiap Selasa', 'Setiap Rabu', 'Setiap Kamis', 'Setiap Jumat', 'Setiap Sabtu', 'Setiap Minggu'].map((d) => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-700">Jam</label>
              <input
                type="text"
                className="input"
                value={timeInput}
                onChange={(e) => setTimeInput(e.target.value)}
                placeholder="08.00"
              />
            </div>
            <button type="submit" className="w-full bg-[#2563EB] text-white font-semibold text-sm py-2.5 rounded-xl">
              Simpan jadwal
            </button>
          </form>
        </Modal>
      )}

      {/* Modal: Kebijakan Privasi */}
      {privacyModalOpen && (
        <Modal title="Kebijakan Privasi" onClose={() => setPrivacyModalOpen(false)}>
          <div className="space-y-2.5 text-xs text-slate-600 leading-relaxed">
            <p>
              AcneVision AI memproses foto wajah secara aman. Foto tidak pernah disimpan otomatis tanpa persetujuan per foto yang kamu berikan.
            </p>
            <p>
              Kamu dapat menghapus seluruh data foto, riwayat analisis, dan percakapan kapan saja melalui halaman Hapus Data.
            </p>
            <button
              onClick={() => setPrivacyModalOpen(false)}
              className="w-full mt-2 bg-[#2563EB] text-white font-semibold py-2.5 rounded-xl"
            >
              Tutup
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
