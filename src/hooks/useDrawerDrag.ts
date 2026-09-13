import { useEffect, type RefObject } from 'react';

const AXIS = 8;
const CLOSE_PX = 72;
const OPEN_PX = 48;
const EDGE = 20;
/** Window after release where a synthesized click on a dragged link is eaten. */
const CLICK_SUPPRESS_MS = 350;

const isRtl = () => document.documentElement.dir === 'rtl';

/**
 * Mouse/touch drag for DaisyUI checkbox drawers (direction-aware):
 * - drag the open panel toward its own screen edge to close
 * - drag inward from that same edge to open
 * RTL mirrors both (drawer sits on the right under dir=rtl).
 */
export function useDrawerDrag(
  toggleId: string,
  panelRef: RefObject<HTMLElement | null>,
) {
  useEffect(() => {
    const toggle = document.getElementById(toggleId) as HTMLInputElement | null;
    if (!toggle) return;

    let startX = 0;
    let startY = 0;
    let locked: 'h' | 'v' | null = null;
    let dragging = false;
    let mode: 'close' | 'open' | null = null;
    let panel: HTMLElement | null = null;
    /** +1 when dragging right moves the panel out (RTL), -1 in LTR. */
    let outSign = -1;
    let suppressClicksUntil = 0;

    const clearDrag = () => {
      const el = panel ?? panelRef.current;
      if (el) {
        el.classList.remove('is-dragging');
        el.style.removeProperty('--drawer-drag-x');
      }
      panel = null;
      locked = null;
      dragging = false;
      mode = null;
    };

    const onMove = (e: PointerEvent) => {
      if (!mode) return;
      const dx = e.clientX - startX;
      const dy = e.clientY - startY;

      if (!locked) {
        if (Math.abs(dx) < AXIS && Math.abs(dy) < AXIS) return;
        locked = Math.abs(dx) >= Math.abs(dy) ? 'h' : 'v';
        if (locked === 'v') return;
      }
      if (locked === 'v') return;

      dragging = true;
      // >0 = toward the screen edge the panel lives on (outward).
      const out = dx * outSign;

      if (mode === 'open') {
        if (out <= -OPEN_PX && !toggle.checked) toggle.checked = true;
        return;
      }

      if (!panel) return;
      const x = Math.max(0, out) * outSign;
      panel.classList.add('is-dragging');
      panel.style.setProperty('--drawer-drag-x', `${x}px`);
    };

    const onUp = (e: PointerEvent) => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onUp);

      if (dragging) {
        // Eat the click the browser synthesizes on the dragged element so a
        // swipe starting on a link doesn't navigate.
        suppressClicksUntil = performance.now() + CLICK_SUPPRESS_MS;
      }

      if (mode === 'close' && panel && dragging) {
        const out = (e.clientX - startX) * outSign;
        if (out > CLOSE_PX) toggle.checked = false;
      }

      clearDrag();
    };

    const onClickCapture = (e: MouseEvent) => {
      if (performance.now() > suppressClicksUntil) return;
      suppressClicksUntil = 0;
      e.preventDefault();
      e.stopPropagation();
    };

    const arm = () => {
      window.addEventListener('pointermove', onMove);
      window.addEventListener('pointerup', onUp);
      window.addEventListener('pointercancel', onUp);
    };

    const begin = (e: PointerEvent, next: 'close' | 'open') => {
      mode = next;
      panel = panelRef.current;
      startX = e.clientX;
      startY = e.clientY;
      locked = null;
      dragging = false;
      outSign = isRtl() ? 1 : -1;
      arm();
    };

    const onPanelDown = (e: PointerEvent) => {
      if (e.button !== 0 || !toggle.checked) return;
      const el = panelRef.current;
      if (!el || !el.contains(e.target as Node)) return;
      if (
        (e.target as HTMLElement | null)?.closest?.(
          'input, textarea, select, [contenteditable="true"]',
        )
      ) {
        return;
      }

      begin(e, 'close');
      panel = el;
    };

    const onEdgeDown = (e: PointerEvent) => {
      if (e.button !== 0 || toggle.checked) return;
      // Panel edge: left in LTR, right in RTL.
      const onEdge = isRtl()
        ? e.clientX >= window.innerWidth - EDGE
        : e.clientX <= EDGE;
      if (!onEdge) return;
      // Ignore when clicking real UI on that edge (menu button lives there).
      if ((e.target as HTMLElement | null)?.closest?.('a, button, label, input, select, textarea')) {
        return;
      }

      begin(e, 'open');
    };

    document.addEventListener('pointerdown', onPanelDown, true);
    document.addEventListener('pointerdown', onEdgeDown, true);
    document.addEventListener('click', onClickCapture, true);

    return () => {
      document.removeEventListener('pointerdown', onPanelDown, true);
      document.removeEventListener('pointerdown', onEdgeDown, true);
      document.removeEventListener('click', onClickCapture, true);
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onUp);
      clearDrag();
    };
  }, [toggleId, panelRef]);
}
