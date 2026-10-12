import type { CSSProperties, ReactNode } from 'react';
import type { useI18n } from '../../../lib/i18n';

type Translate = ReturnType<typeof useI18n>['t'];

export function createPanelHelpers(t: Translate) {
  const field = (labelAr: string, labelEn: string, node: ReactNode, hint?: [string, string]) => (
    <label className="pe-field">
      <span className="pe-field__label">{t(labelAr, labelEn)}</span>
      {node}
      {hint ? <span className="pe-field__hint text-pretty">{t(hint[0], hint[1])}</span> : null}
    </label>
  );

  const primarySection = (
    titleAr: string,
    titleEn: string,
    children: ReactNode,
    opts?: {
      id?: string;
      icon?: ReactNode;
      hintAr?: string;
      hintEn?: string;
      accent?: 'default' | 'commerce' | 'fulfill' | 'basics' | 'copy';
      i?: number;
      /** Native <details> — click header to collapse/expand. */
      collapsible?: boolean;
      /** Right-side summary when collapsed (stock count, etc.). */
      summary?: string;
      /** Start open (default true when collapsible). */
      defaultOpen?: boolean;
    },
  ) => {
    const accent = opts?.accent ? ` pe-panel--${opts.accent}` : '';
    const style = opts?.i != null ? ({ ['--i']: opts.i } as CSSProperties) : undefined;
    const title = (
      <>
        {opts?.icon ? <span className="pe-panel__icon" aria-hidden>{opts.icon}</span> : null}
        {t(titleAr, titleEn)}
      </>
    );
    const hint =
      opts?.hintAr && opts.hintEn ? (
        <p className="pe-panel__hint text-pretty">{t(opts.hintAr, opts.hintEn)}</p>
      ) : null;
    const body = <div className="pe-panel__body">{children}</div>;

    if (opts?.collapsible) {
      return (
        <details
          id={opts.id}
          className={`pe-panel pe-panel--collapse${accent}`}
          style={style}
          open={opts.defaultOpen !== false}
        >
          <summary className="pe-panel__summary">
            <span className="pe-panel__summary-main pe-panel__title">{title}</span>
            {opts.summary ? (
              <span className="pe-panel__summary-meta">{opts.summary}</span>
            ) : null}
          </summary>
          {hint}
          {body}
        </details>
      );
    }

    return (
      <section
        id={opts?.id}
        className={`pe-panel${accent}`}
        style={style}
      >
        <header className="pe-panel__head">
          <h2 className="pe-panel__title">{title}</h2>
          {hint}
        </header>
        {body}
      </section>
    );
  };

  const jumpToSection = (id: string) => {
    const el = document.getElementById(id);
    if (!el) return;
    let node: HTMLElement | null = el;
    while (node) {
      if (node instanceof HTMLDetailsElement) node.open = true;
      node = node.parentElement;
    }
    el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const tocLink = (id: string, labelAr: string, labelEn: string) => (
    <a
      key={id}
      className="pe-toc__link"
      href={`#${id}`}
      onClick={(e) => {
        e.preventDefault();
        jumpToSection(id);
      }}
    >
      {t(labelAr, labelEn)}
    </a>
  );

  return { field, primarySection, tocLink };
}
