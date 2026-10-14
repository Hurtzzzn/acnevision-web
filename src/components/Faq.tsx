import { useId, useState } from 'react';
import { ChevronDown } from 'lucide-react';

/** Short accordion; several items can be open at once. Answers stay in the DOM and collapse with a grid-rows transition. */
export function Faq({ items }: { items: readonly { q: string; a: string }[] }) {
  const base = useId();
  const [open, setOpen] = useState<ReadonlySet<number>>(new Set());
  const toggle = (i: number) =>
    setOpen((prev) => {
      const next = new Set(prev);
      if (!next.delete(i)) next.add(i);
      return next;
    });

  return (
    <div className="divide-y divide-border rounded-card border border-border bg-white">
      {items.map((item, i) => {
        const isOpen = open.has(i);
        return (
          <div key={item.q}>
            <h3 className="text-base">
              <button
                type="button"
                id={`${base}-q${i}`}
                aria-expanded={isOpen}
                aria-controls={`${base}-a${i}`}
                onClick={() => toggle(i)}
                className="flex min-h-11 w-full items-center justify-between gap-4 rounded-card px-5 py-4 text-left font-semibold text-ink-900 transition-colors hover:bg-tint focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-primary-600"
              >
                {item.q}
                <ChevronDown className={`h-5 w-5 shrink-0 text-primary-600 transition-transform duration-200 ease-out ${isOpen ? 'rotate-180' : ''}`} aria-hidden />
              </button>
            </h3>
            <div
              id={`${base}-a${i}`}
              role="region"
              aria-labelledby={`${base}-q${i}`}
              className={`grid transition-[grid-template-rows] duration-200 ease-out ${isOpen ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}
            >
              <div className="overflow-hidden">
                <p className="px-5 pb-4 text-[1.0625rem]">{item.a}</p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
