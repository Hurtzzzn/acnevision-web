import { Component, type ErrorInfo, type ReactNode } from 'react';
import { Info, RefreshCw } from 'lucide-react';
import { COPY } from '@acnevision/shared';

interface State { failed: boolean }

/**
 * App-level safety net: when any component throws while rendering, show a calm message with a reload button instead of a blank page.
 * It sits above the router on purpose, so it uses a plain reload (no router hooks or links) and also covers a crash in the navbar.
 */
export class ErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { failed: false };

  static getDerivedStateFromError(): State {
    return { failed: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Unhandled UI error', error, info.componentStack);
  }

  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <div role="alert" className="flex min-h-screen items-center justify-center bg-tint p-6">
        <div className="card flex w-full max-w-md flex-col items-center gap-4 text-center md:p-8">
          <Info className="h-9 w-9 text-primary-600" aria-hidden />
          <h1 className="text-headline-sm">{COPY.crash.title}</h1>
          <p className="text-body-md text-ink-600">{COPY.crash.body}</p>
          <button type="button" className="btn-primary min-h-11" onClick={() => window.location.reload()}>
            <RefreshCw className="h-4 w-4" aria-hidden /> {COPY.crash.reload}
          </button>
        </div>
      </div>
    );
  }
}
