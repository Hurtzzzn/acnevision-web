import { Link } from 'react-router-dom';
import { Check, Lock } from 'lucide-react';
import { COPY } from '@acnevision/shared';

/** Locked-feature card for guests: explains what opens after login. Calm light-blue card, never an overlay. */
export function UpgradeCard({ message, unlocks }: { message?: string; unlocks: readonly string[] }) {
  return (
    <section className="rounded-card border border-primary-200 bg-primary-50 p-4 md:p-6" aria-labelledby="upgrade-title">
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-btn bg-primary-600 text-white" aria-hidden>
          <Lock className="h-5 w-5" />
        </span>
        <div>
          <h3 id="upgrade-title">{COPY.upgrade.title}</h3>
          {message && <p className="mt-1 text-body-md">{message}</p>}
        </div>
      </div>
      <ul className="mt-4 grid gap-x-8 gap-y-2 text-body-md text-ink-900 sm:grid-cols-2">
        {unlocks.map((item) => (
          <li key={item} className="flex gap-2.5">
            <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary-600" aria-hidden />
            {item}
          </li>
        ))}
      </ul>
      <div className="mt-5 flex flex-wrap gap-3">
        <Link to="/login" className="btn-primary">{COPY.upgrade.login}</Link>
        <Link to="/register" className="btn-outline">{COPY.upgrade.register}</Link>
      </div>
    </section>
  );
}
