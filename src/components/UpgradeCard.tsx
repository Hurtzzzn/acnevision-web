import { Link } from 'react-router-dom';
import { Check, Lock } from 'lucide-react';
import { COPY } from '@acnevision/shared';

const words = (s: string) => s.toLowerCase().match(/\p{L}+/gu) ?? [];

/** The API message is hidden when it only restates the card title (it shares the title's last two words). */
function repeatsTitle(message: string, title: string): boolean {
  const key = words(title).slice(-2).join(' ');
  return !!key && words(message).join(' ').includes(key);
}

/**
 * Locked-feature card for guests: explains what opens after login. Calm light-blue card, never an overlay.
 * Header and buttons share one row on wide screens; the unlocked features wrap as chips underneath.
 */
export function UpgradeCard({ message, unlocks }: { message?: string; unlocks: readonly string[] }) {
  const lead = message && !repeatsTitle(message, COPY.upgrade.title) ? message : COPY.upgrade.lead;
  return (
    <section
      className="flex flex-col gap-5 rounded-card border border-primary-200 bg-primary-50 p-4 md:grid md:grid-cols-[1fr_auto] md:items-center md:gap-x-10 md:p-6"
      aria-labelledby="upgrade-title"
    >
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-btn bg-primary-600 text-white" aria-hidden>
          <Lock className="h-5 w-5" />
        </span>
        <div>
          <h3 id="upgrade-title">{COPY.upgrade.title}</h3>
          <p className="mt-1 text-body-md">{lead}</p>
        </div>
      </div>

      <ul className="flex flex-wrap gap-2 md:col-span-2 md:row-start-2">
        {unlocks.map((item) => (
          <li key={item} className="flex items-center gap-2 rounded-full border border-primary-200 bg-white px-3 py-1.5 text-body-md text-ink-900">
            <Check className="h-4 w-4 shrink-0 text-primary-600" aria-hidden />
            {item}
          </li>
        ))}
      </ul>

      <div className="flex flex-wrap gap-3 md:col-start-2 md:row-start-1">
        <Link to="/login" className="btn-primary">{COPY.upgrade.login}</Link>
        <Link to="/register" className="btn-outline">{COPY.upgrade.register}</Link>
      </div>
    </section>
  );
}
