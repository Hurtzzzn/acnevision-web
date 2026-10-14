import { useState } from 'react';
import { COPY, SEVERITY_META, SEVERITY_ORDER, type Severity } from '@acnevision/shared';
import { SEVERITY_RANGE } from './SeverityScale';

/**
 * Four-segment severity scale where each segment is a button (44 px tall, reachable by keyboard). The chosen level shows its
 * meaning and lesion-count range below. Colors come from SEVERITY_META only.
 */
export function SeverityExplorer({ initial = 'moderate' }: { initial?: Severity }) {
  const c = COPY.howItWorks;
  const [selected, setSelected] = useState<Severity>(initial);
  const meta = SEVERITY_META[selected];

  return (
    <div>
      <div role="group" aria-label={c.severityGroupLabel} className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {SEVERITY_ORDER.map((s) => {
          const active = s === selected;
          const m = SEVERITY_META[s];
          return (
            <button
              key={s}
              type="button"
              aria-pressed={active}
              onClick={() => setSelected(s)}
              className="flex min-h-11 flex-col items-center justify-center rounded-btn border-2 px-3 py-3 text-label-md transition-[background-color,color,transform] duration-150 ease-out active:scale-[0.97] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-600"
              style={{
                background: active ? m.solid : m.tint,
                color: active ? '#FFFFFF' : '#0F172A',
                borderColor: m.solid,
              }}
            >
              <span className="font-semibold">{m.label}</span>
            </button>
          );
        })}
      </div>

      <div className="mt-4 rounded-card border border-border bg-white p-5 shadow-card sm:p-6">
        {/* Only this block is live, so a screen reader hears the level, range and meaning but not the long note on every change.
            Keyed so it fades in again for each level; short and opacity only. */}
        <div aria-live="polite">
        <div key={selected} className="enter-fade">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
            <h3 className="text-headline-md" style={{ color: meta.solid }}>{meta.label}</h3>
            <p className="tnum text-label-md text-ink-600">
              {c.severityRange(SEVERITY_RANGE[selected])}
            </p>
          </div>
          <p className="mt-2 text-[1.0625rem]">{c.severityText[selected]}</p>
        </div>
        </div>
        <p className="mt-4 border-t border-border pt-4 text-body-md text-ink-600">{c.severityNote}</p>
      </div>
    </div>
  );
}
