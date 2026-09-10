import { useEffect, type RefObject } from 'react';

const AXIS = 8;
const CLOSE_PX = 72;
const OPEN_PX = 48;
const EDGE = 20;

/**
 * Mouse/touch drag for DaisyUI checkbox drawers:
 * - drag open panel left to close
 * - drag right from the left edge to open
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

      if (mode === 'open') {
        if (dx >= OPEN_PX && !toggle.checked) toggle.checked = true;
        return;
      }

      if (!panel) return;
      const x = Math.min(0, dx);
      panel.classList.add('is-dragging');
      panel.style.setProperty('--drawer-drag-x', `${x}px`);
    };

    const onUp = (e: PointerEvent) => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onUp);

      if (mode === 'close' && panel && dragging) {
        const dx = e.clientX - startX;
        if (dx < -CLOSE_PX) toggle.checked = false;
      }

      clearDrag();
    };

    const arm = () => {
      window.addEventListener('pointermove', onMove);
      window.addEventListener('pointerup', onUp);
      window.addEventListener('pointercancel', onUp);
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

      mode = 'close';
      panel = el;
      startX = e.clientX;
      startY = e.clientY;
      locked = null;
      dragging = false;
      arm();
    };

    const onEdgeDown = (e: PointerEvent) => {
      if (e.button !== 0 || toggle.checked) return;
      if (e.clientX > EDGE) return;
      // Ignore when clicking real UI on the left (menu button lives there).
      if ((e.target as HTMLElement | null)?.closest?.('a, button, label, input, select, textarea')) {
        return;
      }

      mode = 'open';
      panel = panelRef.current;
      startX = e.clientX;
      startY = e.clientY;
      locked = null;
      dragging = false;
      arm();
    };

    document.addEventListener('pointerdown', onPanelDown, true);
    document.addEventListener('pointerdown', onEdgeDown, true);

    return () => {
      document.removeEventListener('pointerdown', onPanelDown, true);
      document.removeEventListener('pointerdown', onEdgeDown, true);
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onUp);
      clearDrag();
    };
  }, [toggleId, panelRef]);
}
