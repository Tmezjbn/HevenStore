/**
 * Storefront scroll polish.
 *
 * Wheel / trackpad scrolling is fully native on every engine. An earlier
 * Blink-only wheel lerp (preventDefault + per-frame scrollTo on the main
 * thread) lost to Chromium's compositor scrolling under heavy paint — Firefox
 * felt smoother precisely because it never intercepted wheel input.
 *
 * What remains: a short rAF ease for programmatic back-to-top — Blink animates
 * `behavior: 'smooth'` unevenly under heavy atmosphere paint, and
 * `scroll-behavior: smooth` still handles in-page anchors.
 */

export function prefersReducedMotion(): boolean {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
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
  // 'instant' overrides the CSS `scroll-behavior: smooth` on <html> — 'auto'
  // resolves to it and every lerp frame would restart a smooth animation.
  window.scrollTo({ top: y, left: 0, behavior: 'instant' });
}

let animRaf = 0;

export function cancelSmoothScroll() {
  if (animRaf) cancelAnimationFrame(animRaf);
  animRaf = 0;
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

  const frame = (now: number) => {
    const t = Math.min(1, (now - t0) / dur);
    scrollInstant(start + dist * easeInOutCubic(t));
    if (t < 1) {
      animRaf = requestAnimationFrame(frame);
      return;
    }
    animRaf = 0;
  };
  animRaf = requestAnimationFrame(frame);
}
