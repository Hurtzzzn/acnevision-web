import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { ErrorBoundary } from './ErrorBoundary';

// The vitest environment is node (no DOM) and server rendering never runs error boundaries, so the boundary is driven by hand:
// React calls getDerivedStateFromError with the thrown error, merges the result into state, then calls render again.
describe('ErrorBoundary', () => {
  it('renders its children while nothing has crashed', () => {
    const boundary = new ErrorBoundary({ children: 'page content' });
    expect(boundary.render()).toBe('page content');
  });

  it('turns a crash into a friendly message with a reload button, not a blank page', () => {
    const boundary = new ErrorBoundary({ children: 'page content' });
    boundary.state = ErrorBoundary.getDerivedStateFromError();
    const html = renderToStaticMarkup(<>{boundary.render()}</>);
    expect(html).not.toContain('page content');
    expect(html).toContain('role="alert"');
    expect(html).toContain('Muat ulang');
    expect(html).toContain('<button');
  });
});
