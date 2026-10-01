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

/** Read a theme's base color without applying it (themes are [data-theme] var blocks). */
function probeThemeColor(theme: string): string | null {
  const probe = document.createElement('div');
  probe.setAttribute('data-theme', theme);
  probe.style.cssText = 'position:absolute;visibility:hidden;pointer-events:none;';
  document.documentElement.appendChild(probe);
  const color = getComputedStyle(probe).getPropertyValue('--color-base-100').trim();
  probe.remove();
  return color || null;
}

/**
 * Theme switch — clip-path reveal.
 * 1. Pin the OLD base-100 on <html> (visible outside the clip).
 * 2. Flip to the NEW theme via flushSync — new colors apply instantly.
 * 3. Clip <body> to a zero-radius circle, then animate it to full radius.
 *    Inside the circle = new theme (real content, patterns, everything).
 *    Outside the circle = old color (html background).
 * No overlay divs, no z-index tricks, no flash, no overflow.
 */
async function runThemeCircleReveal(
  update: () => void,
  theme?: string,
  origin?: ViewTransitionOrigin,
): Promise<void> {
  const root = document.documentElement;
  const body = document.body;

  const oldColor = getComputedStyle(root).getPropertyValue('--color-base-100').trim();
  const newColor = theme ? probeThemeColor(theme) : null;
  if (!newColor) {
    update();
    return;
  }

  const x = origin?.x ?? window.innerWidth / 2;
  const y = origin?.y ?? window.innerHeight / 2;
  const r = Math.ceil(
    Math.hypot(Math.max(x, window.innerWidth - x), Math.max(y, window.innerHeight - y)),
  );

  root.classList.add('theme-switching');
  if (oldColor) root.style.backgroundColor = `oklch(${oldColor})`;

  // Clip body to zero before flipping so the new theme is invisible initially.
  body.style.clipPath = `circle(0px at ${x}px ${y}px)`;
  void body.offsetWidth;

  // Flip to the new theme — content updates instantly but is hidden behind clip.
  flushSync(update);
  await waitOneFrame();

  try {
    const anim = body.animate(
      [
        { clipPath: `circle(0px at ${x}px ${y}px)` },
        { clipPath: `circle(${r}px at ${x}px ${y}px)` },
      ],
      { duration: 580, easing: 'cubic-bezier(0.22, 1, 0.36, 1)', fill: 'forwards' },
    );
    await anim.finished;
    anim.cancel();
  } catch {
    /* animation interrupted */
  } finally {
    body.style.removeProperty('clip-path');
    root.style.removeProperty('background-color');
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
