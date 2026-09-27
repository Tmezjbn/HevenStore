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
 * Theme switch: a circle of the NEW theme's base color expands from the toggle,
 * covers the screen, the theme flips underneath, then the veil fades out.
 * Full-document View Transitions snapshot the whole page — janky on Chromium
 * under this page's paint load (which is why Firefox felt smoother: it skipped
 * them entirely). A single composited scale() layer is cheap on every engine.
 */
async function runThemeCircleVeil(
  update: () => void,
  opts?: { origin?: ViewTransitionOrigin; theme?: string },
): Promise<void> {
  const root = document.documentElement;
  root.classList.add('theme-switching');

  const color = opts?.theme ? probeThemeColor(opts.theme) : null;
  if (!color) {
    update();
    requestAnimationFrame(() => root.classList.remove('theme-switching'));
    return;
  }

  const x = opts?.origin?.x ?? window.innerWidth / 2;
  const y = opts?.origin?.y ?? window.innerHeight / 2;
  const r = Math.ceil(
    Math.hypot(Math.max(x, window.innerWidth - x), Math.max(y, window.innerHeight - y)),
  );

  const veil = document.createElement('div');
  veil.className = 'theme-circle-veil';
  veil.setAttribute('aria-hidden', 'true');
  veil.style.width = veil.style.height = `${r * 2}px`;
  veil.style.left = `${x - r}px`;
  veil.style.top = `${y - r}px`;
  veil.style.background = color;
  root.appendChild(veil);
  // Force style flush so Blink doesn't skip the first keyframe (snap).
  void veil.offsetWidth;

  try {
    const grow = veil.animate(
      [{ transform: 'scale(0)' }, { transform: 'scale(1)' }],
      { duration: 460, easing: 'cubic-bezier(0.16, 1, 0.3, 1)', fill: 'forwards' },
    );
    await grow.finished;
    veil.style.transform = 'scale(1)';
    flushSync(update);
    // Let the new theme paint once under the opaque veil before fading.
    await waitForPaint();
    const fade = veil.animate([{ opacity: 1 }, { opacity: 0 }], {
      duration: 240,
      easing: 'ease-out',
      fill: 'forwards',
    });
    await fade.finished;
  } catch {
    flushSync(update);
  } finally {
    veil.remove();
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

  return runThemeCircleVeil(update, opts);
}
