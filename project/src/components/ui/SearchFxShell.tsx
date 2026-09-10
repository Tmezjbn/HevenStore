import type { ReactNode } from 'react';

type Props = {
  children: ReactNode;
  className?: string;
  /** Extra class on the inner main pane (input / select host). */
  mainClassName?: string;
};

/** Shared glow shell from nav search — reuse on catalog search/sort. */
export default function SearchFxShell({ children, className = '', mainClassName = '' }: Props) {
  return (
    <div className={`nav-search-fx${className ? ` ${className}` : ''}`}>
      <div className="nav-search-fx__shell">
        <div className="nav-search-fx__glow" aria-hidden />
        <div className="nav-search-fx__ring nav-search-fx__ring--dark" aria-hidden />
        <div className="nav-search-fx__ring nav-search-fx__ring--dark" aria-hidden />
        <div className="nav-search-fx__ring nav-search-fx__ring--dark" aria-hidden />
        <div className="nav-search-fx__ring nav-search-fx__ring--white" aria-hidden />
        <div className="nav-search-fx__ring nav-search-fx__ring--border" aria-hidden />
        <div className={`nav-search-fx__main${mainClassName ? ` ${mainClassName}` : ''}`}>
          {children}
        </div>
      </div>
    </div>
  );
}
