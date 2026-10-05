import { Link } from 'react-router-dom';
import { Check, Lock } from 'lucide-react';
import { COPY } from '@acnevision/shared';
import { authPath, NEW_ANALYSIS_PATH } from '../lib/redirect';
import { LockedPreview } from './LockedPreview';

const words = (s: string) => s.toLowerCase().match(/\p{L}+/gu) ?? [];

/** The API message is hidden when it only restates the card title (it shares the title's last two words). */
function repeatsTitle(message: string, title: string): boolean {
  const key = words(title).slice(-2).join(' ');
  return !!key && words(message).join(' ').includes(key);
}

/**
 * Locked-feature card for guests: explains what opens after login. Calm light-blue card, never an overlay.
 * Text, buttons, and the unlock list on the left; a static locked preview on the right from `lg` (hidden below).
 */
export function UpgradeCard({ message, unlocks, redirectTo = NEW_ANALYSIS_PATH }: { message?: string; unlocks: readonly string[]; redirectTo?: string }) {
  const lead = message && !repeatsTitle(message, COPY.upgrade.title) ? message : COPY.upgrade.lead;
  return (
    <section
      className="rounded-card border border-primary-200 bg-primary-50 p-4 md:p-6 lg:grid lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-center lg:gap-10"
      aria-labelledby="upgrade-title"
    >
      <div className="space-y-5">
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-btn bg-primary-600 text-white" aria-hidden>
            <Lock className="h-5 w-5" />
          </span>
          <div>
            <h3 id="upgrade-title">{COPY.upgrade.title}</h3>
            <p className="mt-1 text-body-md">{lead}</p>
          </div>
        </div>

        <div className="flex flex-wrap gap-3">
          <Link to={authPath('/login', redirectTo)} className="btn-primary px-6 py-3">{COPY.upgrade.login}</Link>
          <Link to={authPath('/register', redirectTo)} className="btn-outline px-6 py-3">{COPY.upgrade.register}</Link>
        </div>

        <ul className="grid gap-x-6 gap-y-2 sm:grid-cols-2">
          {unlocks.map((item) => (
            <li key={item} className="flex items-start gap-2 text-body-md text-ink-900">
              <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary-600" aria-hidden />
              {item}
            </li>
          ))}
        </ul>
      </div>

      <div className="hidden lg:block">
        <LockedPreview />
      </div>
    </section>
  );
}
