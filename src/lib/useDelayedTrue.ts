import { useEffect, useState } from 'react';

/**
 * `true` only once `value` has been true for `delay` ms in a row; `false` again at once. Used so a button is not switched off by a
 * single missed face detection, while it still comes back the moment the problem is gone.
 */
export function useDelayedTrue(value: boolean, delay: number): boolean {
  const [held, setHeld] = useState(false);
  useEffect(() => {
    if (!value) { setHeld(false); return; }
    const id = setTimeout(() => setHeld(true), delay);
    return () => clearTimeout(id);
  }, [value, delay]);
  return value && held;
}
