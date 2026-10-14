import { Check } from 'lucide-react';
import { COPY } from '@acnevision/shared';

/** Photo tips card shared by the guest scan page and the signed-in analysis page (one source for the list and its look). */
export function PhotoTips({ title, items = COPY.photoTips, className = '', plain = false }: {
  title: string; items?: readonly string[]; className?: string;
  /** Bare text list with thin dividers instead of the tinted card with check marks. */
  plain?: boolean;
}) {
  if (plain) {
    return (
      <section className={className} aria-labelledby="photo-tips-title">
        <h2 id="photo-tips-title" className="text-base font-semibold text-ink-900">{title}</h2>
        <ul className="mt-3 divide-y divide-border border-y border-border text-body-md text-ink-700">
          {items.map((t) => (
            <li key={t} className="flex items-center gap-3 py-3">
              <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-ink-400" aria-hidden />
              {t}
            </li>
          ))}
        </ul>
      </section>
    );
  }
  return (
    <aside className={`card bg-primary-50 ${className}`}>
      <h3 className="mb-3">{title}</h3>
      <ul className="space-y-2 text-body-md">
        {items.map((t) => (
          <li key={t} className="flex gap-2"><Check className="mt-1 h-4 w-4 shrink-0 text-primary-600" aria-hidden />{t}</li>
        ))}
      </ul>
    </aside>
  );
}
