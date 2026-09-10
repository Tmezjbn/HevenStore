import { Component, type ErrorInfo, type ReactNode } from 'react';
import { reportError } from '../lib/reportError';

type Props = { children: ReactNode };
type State = { broken: boolean };

/**
 * Catches render errors so the storefront doesn't white-screen.
 * Reports via Databuddy when analytics consent allows.
 */
export default class ErrorBoundary extends Component<Props, State> {
  state: State = { broken: false };

  static getDerivedStateFromError(): State {
    return { broken: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    reportError(error, {
      error_type: 'react',
      component_stack: info.componentStack?.slice(0, 2000) ?? null,
    });
  }

  private reset = () => {
    this.setState({ broken: false });
  };

  render() {
    if (!this.state.broken) return this.props.children;

    const ar = typeof document !== 'undefined' && document.documentElement.lang === 'ar';
    return (
      <div className="min-h-screen bg-base-100 flex items-center justify-center px-4">
        <div className="max-w-md text-center space-y-4" role="alert">
          <h1 className="text-2xl font-black">
            {ar ? 'حدث خطأ غير متوقع' : 'Something went wrong'}
          </h1>
          <p className="text-sm text-base-content/70">
            {ar
              ? 'أعد تحميل الصفحة أو ارجع للرئيسية. إن استمر الخطأ تواصل مع الدعم.'
              : 'Reload the page or go home. If it keeps happening, contact support.'}
          </p>
          <div className="flex flex-wrap gap-2 justify-center">
            <button type="button" className="btn btn-primary btn-sm" onClick={() => window.location.reload()}>
              {ar ? 'إعادة التحميل' : 'Reload'}
            </button>
            <button type="button" className="btn btn-ghost btn-sm" onClick={this.reset}>
              {ar ? 'حاول مجدداً' : 'Try again'}
            </button>
            <a href="/" className="btn btn-outline btn-sm">
              {ar ? 'الرئيسية' : 'Home'}
            </a>
          </div>
        </div>
      </div>
    );
  }
}
