/**
 * Storefront scroll polish.
 *
 * CSS `scroll-behavior: smooth` covers anchors / scrollTo in supporting engines, but
 * Chromium does not apply it to mouse-wheel / trackpad scrolling (Firefox does via its
 * own smoothScroll). Blink also animates `behavior: 'smooth'` less evenly under heavy
 * atmosphere paint — so back-to-top uses a short rAF ease instead.
 *
 * Wheel lerp installs only on Blink (`window.chrome`) and only on the document
 * scrollport — nested overflow panes (drawers, dashboard main) stay native.
 */

export function prefersReducedMotion(): boolean {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/** Blink / Chromium family (Chrome, Brave, Edge). Firefox + Safari keep native wheel. */
export function needsWheelSmoothPatch(): boolean {
  return typeof window !== 'undefined' && 'chrome' in window;
}

export function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2;
}

export function clampScrollTop(y: number, maxY: number): number {
  return Math.max(0, Math.min(maxY, y));
}

function maxScrollY(): number {
  return Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
}

function scrollInstant(y: number) {
  window.scrollTo({ top: y, left: 0, behavior: 'auto' });
}

let animRaf = 0;
let wheelRaf = 0;
let driving = false;
let wheelY = 0;
let wheelTarget = 0;

export function cancelSmoothScroll() {
  if (animRaf) cancelAnimationFrame(animRaf);
  if (wheelRaf) cancelAnimationFrame(wheelRaf);
  animRaf = 0;
  wheelRaf = 0;
  driving = false;
  wheelY = window.scrollY;
  wheelTarget = wheelY;
}

/** Programmatic window scroll (back-to-top). Reduced-motion → instant. */
export function smoothScrollWindowTo(top: number) {
  cancelSmoothScroll();
  const end = clampScrollTop(top, maxScrollY());
  if (prefersReducedMotion() || Math.abs(window.scrollY - end) < 1) {
    scrollInstant(end);
    return;
  }

  const start = window.scrollY;
  const dist = end - start;
  const dur = Math.min(850, Math.max(380, Math.abs(dist) * 0.45));
  const t0 = performance.now();
  driving = true;

  const frame = (now: number) => {
    const t = Math.min(1, (now - t0) / dur);
    scrollInstant(start + dist * easeInOutCubic(t));
    if (t < 1) {
      animRaf = requestAnimationFrame(frame);
      return;
    }
    animRaf = 0;
    driving = false;
    wheelY = end;
    wheelTarget = end;
  };
  animRaf = requestAnimationFrame(frame);
}

function overflowCanScroll(el: Element, deltaY: number): boolean {
  const style = getComputedStyle(el);
  const oy = style.overflowY;
  if (oy !== 'auto' && oy !== 'scroll' && oy !== 'overlay') return false;
  const node = el as HTMLElement;
  if (node.scrollHeight <= node.clientHeight + 1) return false;
  if (deltaY < 0) return node.scrollTop > 0;
  return node.scrollTop + node.clientHeight < node.scrollHeight - 1;
}

/** True when the wheel should stay with a nested scroller (drawer, modal, etc.). */
export function wheelTargetsNestedScroller(
  target: EventTarget | null,
  deltaY: number,
): boolean {
  let el = target instanceof Element ? target : null;
  while (el && el !== document.documentElement && el !== document.body) {
    if (overflowCanScroll(el, deltaY)) return true;
    el = el.parentElement;
  }
  return false;
}

/** Modal/drawer scroll lock — body+html overflow:hidden (see useFocusTrap). */
export function documentScrollLocked(): boolean {
  const body = document.body.style.overflow;
  const html = document.documentElement.style.overflow;
  return body === 'hidden' || html === 'hidden';
}

function wheelDeltaY(e: WheelEvent): number {
  let dy = e.deltaY;
  if (e.deltaMode === 1) dy *= 16;
  else if (e.deltaMode === 2) dy *= window.innerHeight;
  return dy;
}

/**
 * Chromium-only document wheel lerp. No-op on Firefox/Safari / reduced-motion.
 * Call from storefront layout only.
 */
export function installStorefrontWheelSmooth(): () => void {
  if (!needsWheelSmoothPatch()) return () => {};

  const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
  let listening = false;

  const tick = () => {
    const max = maxScrollY();
    wheelTarget = clampScrollTop(wheelTarget, max);
    const diff = wheelTarget - wheelY;
    if (Math.abs(diff) < 0.4) {
      wheelY = wheelTarget;
      scrollInstant(wheelY);
      wheelRaf = 0;
      driving = false;
      return;
    }
    // Soft settle — close to Firefox's default wheel feel without a scroll lib.
    wheelY += diff * 0.16;
    driving = true;
    scrollInstant(wheelY);
    wheelRaf = requestAnimationFrame(tick);
  };

  const onWheel = (e: WheelEvent) => {
    if (mq.matches || e.ctrlKey || e.defaultPrevented) return;
    if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) return;
    // Blink wheel lerp would still scrollTo behind locked modals/drawers.
    if (documentScrollLocked()) return;
    if (wheelTargetsNestedScroller(e.target, e.deltaY)) return;

    e.preventDefault();
    if (animRaf) {
      cancelAnimationFrame(animRaf);
      animRaf = 0;
    }
    if (!wheelRaf) {
      wheelY = window.scrollY;
      wheelTarget = wheelY;
    }
    wheelTarget = clampScrollTop(wheelTarget + wheelDeltaY(e), maxScrollY());
    if (!wheelRaf) wheelRaf = requestAnimationFrame(tick);
  };

  const onScroll = () => {
    if (driving || wheelRaf || animRaf) return;
    wheelY = window.scrollY;
    wheelTarget = wheelY;
  };

  const bind = () => {
    if (listening || mq.matches) return;
    listening = true;
    wheelY = window.scrollY;
    wheelTarget = wheelY;
    window.addEventListener('wheel', onWheel, { passive: false });
    window.addEventListener('scroll', onScroll, { passive: true });
  };

  const unbind = () => {
    if (!listening) return;
    listening = false;
    window.removeEventListener('wheel', onWheel);
    window.removeEventListener('scroll', onScroll);
    cancelSmoothScroll();
  };

  const onMq = () => {
    if (mq.matches) unbind();
    else bind();
  };

  bind();
  mq.addEventListener('change', onMq);
  return () => {
    mq.removeEventListener('change', onMq);
    unbind();
  };
}
