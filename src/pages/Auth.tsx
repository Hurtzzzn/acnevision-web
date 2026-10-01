import { useState, type FormEvent, type ReactNode } from 'react';
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../store/auth';
import { USE_MOCK } from '../lib/runtime';
import { errMessage } from '../lib/errors';
import { ErrorBox, Logo, Spinner } from '../components/ui';

/** Only same-site paths, to avoid open redirects. */
function safeRedirect(raw: string | null): string | null {
  return raw && raw.startsWith('/') && !raw.startsWith('//') ? raw : null;
}

function Shell({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="mx-auto max-w-md">
      <div className="card space-y-5">
        <div className="text-center"><Logo className="justify-center" /><h2 className="mt-4 text-2xl">{title}</h2></div>
        {children}
      </div>
    </div>
  );
}

function useAfterAuth() {
  const [params] = useSearchParams();
  const redirectTo = safeRedirect(params.get('redirectTo'));
  return { redirectTo, target: (role?: string) => (role === 'admin' ? '/admin' : redirectTo ?? '/') };
}

function DemoHint() {
  if (!USE_MOCK) return null;
  return (
    <p className="rounded-btn bg-primary-50 p-3 text-xs">
      Mode demo. Akun contoh: <b>demo@acnevision.test</b> / demo12345, admin: <b>admin@acnevision.test</b> / admin12345.
    </p>
  );
}

export function Login() {
  const { user, login, loginWithGoogle } = useAuth();
  const { target, redirectTo } = useAfterAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (user) return <Navigate to={target(user.role)} replace />;

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (!/^\S+@\S+\.\S+$/.test(email)) return setError('Format email tidak valid.');
    if (password.length < 8) return setError('Password minimal 8 karakter.');
    setBusy(true);
    try {
      const me = await login(email, password);
      navigate(target(me.role), { replace: true });
    } catch (err) {
      setError(errMessage(err));
      setBusy(false);
    }
  }

  const q = redirectTo ? `?redirectTo=${encodeURIComponent(redirectTo)}` : '';
  return (
    <Shell title="Masuk">
      <form onSubmit={submit} className="space-y-4" noValidate>
        <div><label htmlFor="email" className="mb-1 block text-sm font-medium">Email</label>
          <input id="email" type="email" autoComplete="email" className="input" value={email} onChange={(e) => setEmail(e.target.value)} /></div>
        <div><label htmlFor="password" className="mb-1 block text-sm font-medium">Password</label>
          <input id="password" type="password" autoComplete="current-password" className="input" value={password} onChange={(e) => setPassword(e.target.value)} /></div>
        {error && <ErrorBox message={error} />}
        <button className="btn-primary w-full" disabled={busy}>{busy ? <Spinner /> : 'Masuk'}</button>
      </form>
      <button className="btn-outline w-full" onClick={() => loginWithGoogle().catch((e) => setError(errMessage(e)))}>Lanjut dengan Google</button>
      <div className="flex justify-between text-sm">
        <Link to="/reset-password" className="text-primary-600 hover:underline">Lupa password?</Link>
        <span>Belum punya akun? <Link to={`/register${q}`} className="font-semibold text-primary-600 hover:underline">Daftar</Link></span>
      </div>
      <DemoHint />
    </Shell>
  );
}

export function Register() {
  const { user, register } = useAuth();
  const { target, redirectTo } = useAfterAuth();
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [needConfirm, setNeedConfirm] = useState(false);

  if (user) return <Navigate to={target(user.role)} replace />;

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (!name.trim()) return setError('Nama lengkap wajib diisi.');
    if (!/^\S+@\S+\.\S+$/.test(email)) return setError('Format email tidak valid.');
    if (password.length < 8) return setError('Password minimal 8 karakter.');
    setBusy(true);
    try {
      const me = await register(email, password, name.trim());
      if (me) navigate(target(me.role), { replace: true });
      else { setNeedConfirm(true); setBusy(false); }
    } catch (err) {
      setError(errMessage(err));
      setBusy(false);
    }
  }

  if (needConfirm) {
    return <Shell title="Cek email kamu"><p className="text-center text-sm">Kami mengirim tautan konfirmasi ke <b>{email}</b>. Klik tautan itu lalu masuk.</p><Link to="/login" className="btn-primary w-full">Ke halaman masuk</Link></Shell>;
  }

  const q = redirectTo ? `?redirectTo=${encodeURIComponent(redirectTo)}` : '';
  return (
    <Shell title="Daftar">
      <form onSubmit={submit} className="space-y-4" noValidate>
        <div><label htmlFor="name" className="mb-1 block text-sm font-medium">Nama lengkap</label>
          <input id="name" autoComplete="name" className="input" value={name} onChange={(e) => setName(e.target.value)} /></div>
        <div><label htmlFor="email" className="mb-1 block text-sm font-medium">Email</label>
          <input id="email" type="email" autoComplete="email" className="input" value={email} onChange={(e) => setEmail(e.target.value)} /></div>
        <div><label htmlFor="password" className="mb-1 block text-sm font-medium">Password</label>
          <input id="password" type="password" autoComplete="new-password" className="input" value={password} onChange={(e) => setPassword(e.target.value)} /></div>
        {error && <ErrorBox message={error} />}
        <button className="btn-primary w-full" disabled={busy}>{busy ? <Spinner /> : 'Daftar'}</button>
      </form>
      <p className="text-center text-sm">Sudah punya akun? <Link to={`/login${q}`} className="font-semibold text-primary-600 hover:underline">Masuk</Link></p>
    </Shell>
  );
}

export function ResetPassword() {
  const { resetPassword } = useAuth();
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (!/^\S+@\S+\.\S+$/.test(email)) return setError('Format email tidak valid.');
    setBusy(true);
    try { await resetPassword(email); setSent(true); }
    catch (err) { setError(errMessage(err)); }
    finally { setBusy(false); }
  }

  return (
    <Shell title="Reset password">
      {sent ? (
        <p className="text-center text-sm">Jika email terdaftar, tautan reset password sudah dikirim.</p>
      ) : (
        <form onSubmit={submit} className="space-y-4" noValidate>
          <div><label htmlFor="email" className="mb-1 block text-sm font-medium">Email</label>
            <input id="email" type="email" className="input" value={email} onChange={(e) => setEmail(e.target.value)} /></div>
          {error && <ErrorBox message={error} />}
          <button className="btn-primary w-full" disabled={busy}>{busy ? <Spinner /> : 'Kirim tautan reset'}</button>
        </form>
      )}
      <p className="text-center text-sm"><Link to="/login" className="text-primary-600 hover:underline">Kembali ke masuk</Link></p>
    </Shell>
  );
}
