import { useEffect, useId, useRef, type CSSProperties, type ReactNode } from 'react';
import { MoreHorizontal } from 'lucide-react';

type Props = {
  /** Whether this row's menu is open (sync from popover `toggle`). */
  open: boolean;
  onOpenChange: (open: boolean) => void;
  ariaLabel: string;
  /** Wrapper class (e.g. owner-catalog__menu). Gets `is-open` when open. */
  className: string;
  /** Trigger button class (e.g. owner-catalog__more). */
  buttonClassName: string;
  /** Panel class (e.g. owner-catalog__menu-panel). */
  panelClassName: string;
  children: ReactNode;
};

/**
 * Meatball action menu via Popover API — escapes dashboard `main.overflow-auto`
 * (absolute panels get clipped on deploy viewports / lower rows).
 */
export default function DashboardOverflowMenu({
  open,
  onOpenChange,
  ariaLabel,
  className,
  buttonClassName,
  panelClassName,
  children,
}: Props) {
  const reactId = useId().replace(/:/g, '');
  const menuId = `heven-overflow-menu-${reactId}`;
  const anchor = `--heven-overflow-${reactId}`;
  const panelRef = useRef<HTMLUListElement>(null);

  useEffect(() => {
    const el = panelRef.current;
    if (!el) return;
    const placeFallback = () => {
      // CSS anchor() unsupported → fixed popover would sit at 0,0.
      if (typeof CSS !== 'undefined' && CSS.supports?.('top', 'anchor(bottom)')) return;
      const trigger = el.parentElement?.querySelector('button');
      if (!trigger) return;
      const r = trigger.getBoundingClientRect();
      el.style.top = `${Math.round(r.bottom + 4)}px`;
      el.style.left = 'auto';
      el.style.right = `${Math.round(window.innerWidth - r.right)}px`;
    };
    const anchorSupported =
      typeof CSS !== 'undefined' && CSS.supports?.('top', 'anchor(bottom)');
    const onToggle = (e: Event) => {
      const te = e as ToggleEvent;
      const isOpen = te.newState === 'open';
      onOpenChange(isOpen);
      if (isOpen) placeFallback();
    };
    // Fallback fixed coords go stale on scroll — close instead of misplacing.
    const onScroll = () => {
      if (!anchorSupported && typeof el.hidePopover === 'function' && el.matches(':popover-open')) {
        try {
          el.hidePopover();
        } catch {
          /* ignore */
        }
      }
    };
    el.addEventListener('toggle', onToggle);
    window.addEventListener('scroll', onScroll, true);
    return () => {
      el.removeEventListener('toggle', onToggle);
      window.removeEventListener('scroll', onScroll, true);
    };
  }, [onOpenChange]);

  // Parent closed menu (chose an item) → hide popover if still open.
  useEffect(() => {
    const el = panelRef.current;
    if (!el || typeof el.hidePopover !== 'function') return;
    if (!open && el.matches(':popover-open')) {
      try {
        el.hidePopover();
      } catch {
        /* ignore */
      }
    }
  }, [open]);

  return (
    <div className={`${className}${open ? ' is-open' : ''}`}>
      <button
        type="button"
        className={buttonClassName}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-controls={menuId}
        aria-label={ariaLabel}
        {...({ popovertarget: menuId } as object)}
        style={{ anchorName: anchor } as CSSProperties}
      >
        <MoreHorizontal size={16} aria-hidden />
      </button>
      <ul
        ref={panelRef}
        id={menuId}
        {...({ popover: 'auto' } as object)}
        className={panelClassName}
        style={{ positionAnchor: anchor } as CSSProperties}
        role="menu"
      >
        {children}
      </ul>
    </div>
  );
}
