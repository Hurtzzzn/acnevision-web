import { useId, useRef, useState, type KeyboardEvent } from 'react';
import { Link } from 'react-router-dom';
import { Check } from 'lucide-react';
import { COPY } from '@acnevision/shared';
import { GuestPreview } from './GuestPreview';
import { MemberPreview } from './MemberPreview';

type Mode = 'quick' | 'full';
const MODES: readonly Mode[] = ['quick', 'full'];

/**
 * Two tabs straight on the page background: what you can try right away (the default, so the free path leads) and what
 * the full analysis adds. Only the preview is a card. Both panels sit in the same grid cell, so the section is always as
 * tall as the taller one and switching tabs never moves anything; the inactive panel is only hidden (visibility), which
 * also removes it from the tab order and the accessibility tree. On desktop each text column stretches to its preview and
 * keeps its buttons at the bottom. The switch is a short fade, which reduced motion makes instant.
 */
export function FeatureTabs() {
  const m = COPY.home.modes;
  const uid = useId();
  const [active, setActive] = useState<Mode>('quick');
  const tabs = useRef<Partial<Record<Mode, HTMLButtonElement | null>>>({});

  const select = (mode: Mode, focus = false) => {
    setActive(mode);
    if (focus) tabs.current[mode]?.focus();
  };
  const onKeyDown = (e: KeyboardEvent<HTMLButtonElement>) => {
    const i = MODES.indexOf(active);
    const next =
      e.key === 'ArrowRight' ? MODES[(i + 1) % MODES.length]
      : e.key === 'ArrowLeft' ? MODES[(i - 1 + MODES.length) % MODES.length]
      : e.key === 'Home' ? MODES[0]
      : e.key === 'End' ? MODES[MODES.length - 1]
      : null;
    if (next) { e.preventDefault(); select(next, true); }
  };

  return (
    <div>
      <div role="tablist" aria-label={m.label} className="inline-flex rounded-full border border-primary-200 bg-primary-50 p-1">
        {MODES.map((mode) => {
          const on = mode === active;
          return (
            <button
              key={mode}
              ref={(el) => { tabs.current[mode] = el; }}
              id={`${uid}-tab-${mode}`}
              type="button"
              role="tab"
              aria-selected={on}
              aria-controls={`${uid}-panel-${mode}`}
              tabIndex={on ? 0 : -1}
              onClick={() => select(mode)}
              onKeyDown={onKeyDown}
              className={`inline-flex min-h-11 items-center rounded-full px-5 text-label-md transition motion-safe:active:scale-[0.97] ${on ? 'bg-primary-600 text-white' : 'text-ink-700 hover:bg-white'}`}
            >
              {m[mode].tab}
            </button>
          );
        })}
      </div>

      <div className="mt-6 grid">
        {MODES.map((mode) => {
          const on = mode === active;
          const copy = m[mode];
          return (
            <div
              key={mode}
              id={`${uid}-panel-${mode}`}
              role="tabpanel"
              aria-labelledby={`${uid}-tab-${mode}`}
              className={`col-start-1 row-start-1 grid gap-6 transition-opacity duration-200 max-lg:content-start lg:grid-cols-[minmax(0,1fr)_minmax(0,36rem)] lg:gap-12 ${on ? 'visible opacity-100' : 'invisible opacity-0'}`}
            >
              <div className="flex flex-col">
                <h3 className="text-headline-lg">{copy.tab}</h3>
                <p className="mt-2 text-[1.0625rem]">{copy.text}</p>
                <ul className="mt-5 space-y-3">
                  {copy.items.map((item) => (
                    <li key={item} className="flex items-start gap-2.5 text-base text-ink-900">
                      <Check className="mt-1 h-4 w-4 shrink-0 text-primary-600" aria-hidden />
                      {item}
                    </li>
                  ))}
                </ul>
                <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-1">
                  <Link to={mode === 'quick' ? '/scan' : '/register'} className="btn-primary rounded-full px-6 py-3">{copy.cta}</Link>
                  {mode === 'full' && (
                    <Link to="/login" className="inline-flex min-h-11 items-center rounded-btn text-label-md text-primary-700 underline-offset-4 hover:underline">{COPY.home.login}</Link>
                  )}
                </div>
              </div>
              {/* On phones the preview comes first, then the list and buttons */}
              <div className="order-first lg:order-none">{mode === 'quick' ? <GuestPreview /> : <MemberPreview />}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
