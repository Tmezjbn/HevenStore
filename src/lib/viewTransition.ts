import { flushSync } from 'react-dom';

export type ViewTransitionOrigin = { x: number; y: number };

/** Button/control center → theme circle reveal origin. */
export function originFromElement(el: Element): ViewTransitionOrigin {
  const r = el.getBoundingClientRect();
  return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
}

/** Two frames — Blink needs a paint after flushSync before veil fade-out or opacity fights layout. */
function waitForPaint(): Promise<void> {
  return new Promise((resolve) => {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => resolve());
    });
  });
}

function waitOneFrame(): Promise<void> {
  return new Promise((resolve) => {
    requestAnimationFrame(() => resolve());
  });
}

/**
 * Fonts + paints settle under full black.
 * Blink often keeps laying out contentDir / glyph flips after the first paint.
 */
async function settleAfterLangUpdate(): Promise<void> {
  if (document.fonts) {
    await document.fonts.ready.catch(() => undefined);
  }
  await waitForPaint();
  await waitForPaint();
}

function runLangBlackVeil(update: () => void): Promise<void> {
  const root = document.documentElement;
  const shell = document.querySelector('.lang-transition') as HTMLElement | null;
  const veil = document.createElement('div');
  veil.className = 'lang-black-veil';
  veil.setAttribute('aria-hidden', 'true');
  root.classList.add('lang-switching');
  root.appendChild(veil);
  // Force style flush so Chromium doesn't skip the first opacity keyframe (snap).
  void veil.offsetWidth;

  const easeOut = 'cubic-bezier(0.33, 0, 0.67, 1)';
  const easeIn = 'cubic-bezier(0.16, 1, 0.3, 1)';

  const showShell = () => {
    if (shell) shell.style.visibility = '';
  };

  return (async () => {
    // Composite veil at opacity 0 first; starting WAAPI same turn as append still snaps in Blink.
    await waitOneFrame();
    try {
      const fadeIn = veil.animate([{ opacity: 0 }, { opacity: 1 }], {
        duration: 220,
        fill: 'forwards',
        easing: easeOut,
      });
      await fadeIn.finished;
      // Lock solid black — Animation.finished can resolve before last composite in Blink.
      fadeIn.cancel();
      veil.style.opacity = '1';
      await waitOneFrame();

      // Skip painting the app tree while AR/EN + contentDir reflow (Firefox hides this better).
      if (shell) shell.style.visibility = 'hidden';
      flushSync(update);
      await settleAfterLangUpdate();
      showShell();
      // One more paint with shell visible under opaque veil before fade-out.
      await waitOneFrame();

      const fadeOut = veil.animate([{ opacity: 1 }, { opacity: 0 }], {
        duration: 400,
        fill: 'forwards',
        easing: easeIn,
      });
      await fadeOut.finished;
      await waitOneFrame();
    } catch {
      showShell();
      flushSync(update);
    } finally {
      showShell();
      veil.remove();
      root.classList.remove('lang-switching');
    }
  })();
}

/**
 * Theme switch — inverted clip-path on a lightweight overlay.
 *
 * 1. Create a single fixed-position div filled with the OLD base color,
 *    covering the entire viewport (z-index 2147483647 — above everything).
 * 2. Flip to the NEW theme via flushSync — the real page updates instantly
 *    but is hidden behind the overlay.
 * 3. Animate the overlay's clip-path from full-coverage down to a zero-radius
 *    circle at the click origin. The shrinking circle *removes* the old color,
 *    revealing the fully-rendered new theme underneath.
 *
 * Why this is fast: clip-path runs on ONE flat div (no children, no repaints
 * of the DOM tree). The browser composites the overlay as a single
 * GPU texture, so clip changes are nearly free.
 */
async function runThemeCircleReveal(
  update: () => void,
  theme?: string,
  origin?: ViewTransitionOrigin,
): Promise<void> {
  const root = document.documentElement;

  const oldColor = getComputedStyle(root).getPropertyValue('--color-base-100').trim();
  if (!oldColor && !theme) {
    update();
    return;
  }

  const x = origin?.x ?? window.innerWidth / 2;
  const y = origin?.y ?? window.innerHeight / 2;
  const r = Math.ceil(
    Math.hypot(Math.max(x, window.innerWidth - x), Math.max(y, window.innerHeight - y)),
  );

  // Overlay: one flat div, old-theme color, covers everything.
  const overlay = document.createElement('div');
  overlay.setAttribute('aria-hidden', 'true');
  overlay.style.cssText =
    `position:fixed;inset:0;z-index:2147483647;pointer-events:none;` +
    `background:oklch(${oldColor});will-change:clip-path;`;
  document.body.appendChild(overlay);
  void overlay.offsetWidth;

  root.classList.add('theme-switching');

  // Flip theme — page updates under the overlay, invisible to the user.
  flushSync(update);

  try {
    // Shrink overlay clip from full circle → zero, revealing new theme.
    const anim = overlay.animate(
      [
        { clipPath: `circle(${r}px at ${x}px ${y}px)` },
        { clipPath: `circle(0px at ${x}px ${y}px)` },
      ],
      { duration: 520, easing: 'cubic-bezier(0.4, 0, 0.2, 1)', fill: 'forwards' },
    );
    await anim.finished;
  } catch {
    /* animation interrupted */
  } finally {
    overlay.remove();
    root.classList.remove('theme-switching');
  }
}

/** Shared transition wrapper (theme circle + language veil). */
export function withViewTransition(
  update: () => void,
  className = 'theme-switching',
  opts?: { origin?: ViewTransitionOrigin; theme?: string },
): Promise<void> {
  if (typeof document === 'undefined') {
    update();
    return Promise.resolve();
  }

  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduced) {
    update();
    return Promise.resolve();
  }

  // Lang: always black veil — full-document View Transitions often hang/skip on
  // Chromium SPAs and left setLang's busy lock stuck ("button sometimes dead").
  if (className === 'lang-switching') return runLangBlackVeil(update);

  return runThemeCircleReveal(update, opts?.theme, opts?.origin);
}
