import { useRef, useState, type FormEvent, type ReactNode, type RefObject } from 'react';
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { Eye, EyeOff, Loader2, Lock, Mail, User, type LucideIcon } from 'lucide-react';
import { ApiRequestError, COPY } from '@acnevision/shared';
import { useAuth } from '../store/auth';
import { USE_MOCK } from '../lib/runtime';
import { authPath, DEFAULT_AFTER_LOGIN, safeRedirect } from '../lib/redirect';
import {
  validateEmail, validateLoginPassword, validateName, validateNewPassword,
} from '../lib/authForm';
import { ErrorBox } from '../components/ui';

type Mode = 'login' | 'register';
type FieldName = 'name' | 'email' | 'password';
type FieldErrors = Partial<Record<FieldName, string>>;

const c = COPY.auth;

/** A requested destination wins for everyone; otherwise admins land on /admin and users on the default page. */
function destinationFor(role: string | undefined, redirectTo: string | null): string {
  return redirectTo ?? (role === 'admin' ? '/admin' : DEFAULT_AFTER_LOGIN);
}

function useRedirectTo(): string | null {
  const [params] = useSearchParams();
  return safeRedirect(params.get('redirectTo'));
}

function AuthCard({ children }: { children: ReactNode }) {
  return (
    <div className="mx-auto w-full max-w-[30rem] py-2 md:py-8">
      <div className="card space-y-6 p-6 md:p-8">{children}</div>
    </div>
  );
}

interface FieldProps {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  error?: string;
  hint?: string;
  icon: LucideIcon;
  inputRef: RefObject<HTMLInputElement>;
  type?: string;
  autoComplete?: string;
  placeholder?: string;
  /** Right side of the label row, e.g. a "forgot password" link. */
  labelAside?: ReactNode;
  /** Inside the input, right edge, e.g. the show/hide button. */
  trailing?: ReactNode;
}

/** Label tied to its input; the message line is always mounted so screen readers announce changes (aria-live). */
function Field({
  id, label, value, onChange, onBlur, error, hint, icon: Icon, inputRef, type = 'text', autoComplete, placeholder, labelAside, trailing,
}: FieldProps) {
  const msgId = `${id}-msg`;
  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between gap-3">
        <label htmlFor={id} className="text-label-md text-ink-900">{label}</label>
        {labelAside}
      </div>
      <div className="relative">
        <Icon className="pointer-events-none absolute left-3.5 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-ink-500" aria-hidden />
        <input
          ref={inputRef}
          id={id}
          type={type}
          value={value}
          autoComplete={autoComplete}
          placeholder={placeholder}
          onChange={(e) => onChange(e.target.value)}
          onBlur={onBlur}
          aria-invalid={error ? true : undefined}
          aria-describedby={msgId}
          className={`input py-3 pl-11 text-base ${trailing ? 'pr-12' : 'pr-3'} ${error ? 'border-danger' : ''}`}
        />
        {trailing}
      </div>
      <p id={msgId} aria-live="polite" className={`mt-1.5 min-h-[1.125rem] text-body-sm ${error ? 'text-danger' : 'text-ink-500'}`}>
        {error ?? hint}
      </p>
    </div>
  );
}

function DemoHint() {
  if (!USE_MOCK) return null;
  return (
    <p className="rounded-btn bg-tint p-3 text-body-sm text-ink-600">
      {c.demoNote} <b>demo@acnevision.test</b> / demo12345, admin: <b>admin@acnevision.test</b> / admin12345.
    </p>
  );
}

function SubmitLabel({ busy, label, busyLabel }: { busy: boolean; label: string; busyLabel: string }) {
  return busy ? (
    <>
      <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
      {busyLabel}
    </>
  ) : (
    <>{label}</>
  );
}

function ModeTabs({ mode, redirectTo }: { mode: Mode; redirectTo: string | null }) {
  const tab = (target: Mode) => {
    const active = target === mode;
    return (
      <Link
        to={authPath(target === 'login' ? '/login' : '/register', redirectTo)}
        replace
        aria-current={active ? 'page' : undefined}
        className={`rounded-[10px] px-4 py-2.5 text-center text-label-md transition-colors ${
          active ? 'bg-white text-primary-600 shadow-card' : 'text-ink-600 hover:text-ink-900'
        }`}
      >
        {c[target].tab}
      </Link>
    );
  };
  return (
    <nav aria-label={c.tabsLabel} className="grid grid-cols-2 gap-1 rounded-btn bg-tint p-1">
      {tab('login')}
      {tab('register')}
    </nav>
  );
}

function AuthForm({ mode, redirectTo }: { mode: Mode; redirectTo: string | null }) {
  const { login, register } = useAuth();
  const navigate = useNavigate();
  const isRegister = mode === 'register';
  const copy = c[mode];

  const [values, setValues] = useState<Record<FieldName, string>>({ name: '', email: '', password: '' });
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [confirmEmail, setConfirmEmail] = useState<string | null>(null);

  const refs: Record<FieldName, RefObject<HTMLInputElement>> = {
    name: useRef<HTMLInputElement>(null),
    email: useRef<HTMLInputElement>(null),
    password: useRef<HTMLInputElement>(null),
  };
  const fields: FieldName[] = isRegister ? ['name', 'email', 'password'] : ['email', 'password'];
  const validators: Record<FieldName, (v: string) => string | null> = {
    name: validateName,
    email: validateEmail,
    password: isRegister ? validateNewPassword : validateLoginPassword,
  };

  const setError = (f: FieldName, message: string | null) =>
    setErrors((prev) => ({ ...prev, [f]: message ?? undefined }));

  function change(f: FieldName, value: string) {
    setValues((prev) => ({ ...prev, [f]: value }));
    setFormError(null);
    // Once a field showed an error, re-check while typing so the message disappears as soon as it is fixed.
    if (errors[f]) setError(f, validators[f](value));
  }

  // Do not scold untouched fields: only check on blur when there is something to check.
  function blur(f: FieldName) {
    if (values[f]) setError(f, validators[f](values[f]));
  }

  function fail(err: unknown) {
    if (!(err instanceof ApiRequestError)) {
      setFormError(c.errors.generic);
    } else if (!isRegister && (err.status === 401 || err.code === 'UNAUTHORIZED')) {
      setFormError(c.errors.invalidCredentials);
      refs.password.current?.focus();
    } else if (isRegister && /terdaftar/i.test(err.message)) {
      setError('email', c.errors.emailTaken);
      refs.email.current?.focus();
    } else {
      setFormError(err.message || c.errors.generic);
    }
    setBusy(false);
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (busy) return;
    setFormError(null);

    const next: FieldErrors = {};
    for (const f of fields) {
      const message = validators[f](values[f]);
      if (message) next[f] = message;
    }
    setErrors(next);
    const firstInvalid = fields.find((f) => next[f]);
    if (firstInvalid) {
      refs[firstInvalid].current?.focus();
      return;
    }

    setBusy(true);
    const email = values.email.trim();
    try {
      if (isRegister) {
        const me = await register(email, values.password, values.name.trim());
        if (me) navigate(destinationFor(me.role, redirectTo), { replace: true });
        else { setConfirmEmail(email); setBusy(false); }
      } else {
        const me = await login(email, values.password);
        navigate(destinationFor(me.role, redirectTo), { replace: true });
      }
    } catch (err) {
      fail(err);
    }
  }

  if (confirmEmail) {
    return (
      <AuthCard>
        <div className="space-y-2 text-center">
          <h1>{c.confirmTitle}</h1>
          <p>{c.confirmText} <b className="break-all text-ink-900">{confirmEmail}</b>.</p>
        </div>
        <Link to={authPath('/login', redirectTo)} className="btn-primary w-full py-3">{c.confirmAction}</Link>
      </AuthCard>
    );
  }

  const otherPath = authPath(isRegister ? '/login' : '/register', redirectTo);
  return (
    <AuthCard>
      <ModeTabs mode={mode} redirectTo={redirectTo} />

      <header className="space-y-2">
        <p className="text-label-sm uppercase text-primary-600">{copy.eyebrow}</p>
        <h1>{copy.title}</h1>
        <p>{copy.lead}</p>
      </header>

      <form onSubmit={submit} noValidate className="space-y-2">
        {isRegister && (
          <Field
            id="name" label={c.fields.name} icon={User} inputRef={refs.name} autoComplete="name"
            placeholder={c.fields.namePlaceholder} value={values.name} error={errors.name}
            onChange={(v) => change('name', v)} onBlur={() => blur('name')}
          />
        )}
        <Field
          id="email" label={c.fields.email} icon={Mail} inputRef={refs.email} type="email" autoComplete="email"
          placeholder={c.fields.emailPlaceholder} value={values.email} error={errors.email}
          onChange={(v) => change('email', v)} onBlur={() => blur('email')}
        />
        <Field
          id="password" label={c.fields.password} icon={Lock} inputRef={refs.password}
          type={showPassword ? 'text' : 'password'} autoComplete={isRegister ? 'new-password' : 'current-password'}
          placeholder={c.fields.passwordPlaceholder} value={values.password} error={errors.password}
          hint={isRegister ? c.fields.newPasswordHint : undefined}
          onChange={(v) => change('password', v)} onBlur={() => blur('password')}
          labelAside={!isRegister && (
            <Link to="/reset-password" className="rounded text-label-sm text-primary-600 hover:text-primary-700 hover:underline">
              {c.fields.forgot}
            </Link>
          )}
          trailing={(
            <button
              type="button"
              onClick={() => setShowPassword((s) => !s)}
              aria-label={showPassword ? c.fields.hide : c.fields.show}
              className="absolute right-1.5 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-control text-ink-500 transition-colors hover:bg-tint hover:text-ink-900"
            >
              {showPassword ? <EyeOff className="h-[18px] w-[18px]" aria-hidden /> : <Eye className="h-[18px] w-[18px]" aria-hidden />}
            </button>
          )}
        />

        {formError && <ErrorBox message={formError} />}

        <button type="submit" className="btn-primary w-full py-3 text-base" disabled={busy} aria-busy={busy}>
          <SubmitLabel busy={busy} label={copy.submit} busyLabel={copy.submitting} />
        </button>
      </form>

      <p className="text-center">
        {copy.switchPrompt}{' '}
        <Link to={otherPath} replace className="font-semibold text-primary-600 hover:text-primary-700 hover:underline">{copy.switchAction}</Link>
      </p>

      <div className="space-y-3 border-t border-border pt-5">
        <p className="text-center text-body-md text-ink-500">{c.accountNote}</p>
        <DemoHint />
      </div>
    </AuthCard>
  );
}

function AuthPage({ mode }: { mode: Mode }) {
  const { user } = useAuth();
  const redirectTo = useRedirectTo();
  // Already signed in: skip the form. A carried destination still wins over the default page.
  if (user) return <Navigate to={destinationFor(user.role, redirectTo)} replace />;
  return <AuthForm key={mode} mode={mode} redirectTo={redirectTo} />;
}

export function Login() { return <AuthPage mode="login" />; }
export function Register() { return <AuthPage mode="register" />; }

export function ResetPassword() {
  const { resetPassword } = useAuth();
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | undefined>();
  const [formError, setFormError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const emailRef = useRef<HTMLInputElement>(null);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (busy) return;
    setFormError(null);
    const message = validateEmail(email);
    setError(message ?? undefined);
    if (message) { emailRef.current?.focus(); return; }
    setBusy(true);
    try { await resetPassword(email.trim()); setSent(true); }
    catch (err) { setFormError(err instanceof ApiRequestError && err.message ? err.message : c.errors.generic); }
    finally { setBusy(false); }
  }

  return (
    <AuthCard>
      <header className="space-y-2">
        <h1>{c.reset.title}</h1>
        {!sent && <p>{c.reset.lead}</p>}
      </header>

      {sent ? (
        <p role="status">{c.reset.sent}</p>
      ) : (
        <form onSubmit={submit} noValidate className="space-y-2">
          <Field
            id="email" label={c.fields.email} icon={Mail} inputRef={emailRef} type="email" autoComplete="email"
            placeholder={c.fields.emailPlaceholder} value={email} error={error}
            onChange={(v) => { setEmail(v); setFormError(null); if (error) setError(validateEmail(v) ?? undefined); }}
            onBlur={() => { if (email) setError(validateEmail(email) ?? undefined); }}
          />
          {formError && <ErrorBox message={formError} />}
          <button type="submit" className="btn-primary w-full py-3 text-base" disabled={busy} aria-busy={busy}>
            <SubmitLabel busy={busy} label={c.reset.submit} busyLabel={c.reset.submitting} />
          </button>
        </form>
      )}

      <p className="text-center">
        <Link to="/login" className="font-semibold text-primary-600 hover:text-primary-700 hover:underline">{c.reset.back}</Link>
      </p>
    </AuthCard>
  );
}
