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
 * Theme switch: a circle of the NEW theme's base color expands from the toggle
 * UNDER the page content — html keeps the old base color outside the circle,
 * body/app-shell backgrounds go transparent so the circle shows in the gaps,
 * content stays visible the whole time, theme flips at full coverage.
 * Full-document View Transitions snapshot the whole page — janky on Chromium
 * under this page's paint load (why Firefox felt smoother: it skipped them).
 * A single composited scale() layer is cheap on every engine.
 */
async function runThemeCircleReveal(
  update: () => void,
  theme?: string,
  origin?: ViewTransitionOrigin,
): Promise<void> {
  const root = document.documentElement;
  root.classList.add('theme-switching');

  const color = theme ? probeThemeColor(theme) : null;
  if (!color) {
    update();
    requestAnimationFrame(() => root.classList.remove('theme-switching'));
    return;
  }

  // Pin the OLD base color on <html> so the area outside the circle matches
  // the pre-flip theme while body/app backgrounds are transparent.
  const oldColor = getComputedStyle(root).getPropertyValue('--color-base-100').trim();
  if (oldColor) root.style.backgroundColor = oldColor;

  const x = origin?.x ?? window.innerWidth / 2;
  const y = origin?.y ?? window.innerHeight / 2;
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
  // z-index -1 inside body: under the content, above the <html> canvas bg.
  document.body.appendChild(veil);
  // Force style flush so Blink doesn't skip the first keyframe (snap).
  void veil.offsetWidth;

  try {
    const dur = 680;
    const spring = 'cubic-bezier(0.175, 0.885, 0.32, 1.04)';

    // Trailing ring: expands slightly ahead of the fill circle with a fade.
    const ring = veil.querySelector('::before') ? null : veil;
    ring?.animate?.call(
      veil,
      [
        { opacity: 0 },
        { opacity: 0 },
      ],
      { duration: 1 },
    );
    // Animate the ::before ring via class toggle — WAAPI can't target pseudos
    // prior to Chrome 130, so we drive it with a CSS keyframe instead.
    veil.style.setProperty('--reveal-dur', `${dur}ms`);
    veil.classList.add('is-expanding');

    const grow = veil.animate(
      [
        { transform: 'scale(0)', opacity: 0.7 },
        { transform: 'scale(0.15)', opacity: 1, offset: 0.08 },
        { transform: 'scale(1)', opacity: 1 },
      ],
      { duration: dur, easing: spring, fill: 'forwards' },
    );

    // Edge glow: the ::after pseudo fades in then out as the circle expands.
    const afterGlow = veil.animate(
      [
        { opacity: 0 },
        { opacity: 0.55, offset: 0.15 },
        { opacity: 0.7, offset: 0.4 },
        { opacity: 0 },
      ],
      { duration: dur, easing: 'ease-out', pseudoElement: '::after' },
    ).finished.catch(() => {});

    // Ring pulse: a border ring scales out slightly ahead of the fill.
    const ringPulse = veil.animate(
      [
        { opacity: 0, transform: 'scale(0)' },
        { opacity: 0.45, transform: 'scale(0.2)', offset: 0.1 },
        { opacity: 0.3, transform: 'scale(0.7)', offset: 0.5 },
        { opacity: 0, transform: 'scale(1.08)' },
      ],
      { duration: dur * 1.1, easing: spring, pseudoElement: '::before' },
    ).finished.catch(() => {});

    void afterGlow;
    void ringPulse;
    await grow.finished;

    veil.style.transform = 'scale(1)';
    veil.style.opacity = '1';
    flushSync(update);
    await waitForPaint();
    veil.remove();
    await waitOneFrame();
  } catch {
    flushSync(update);
  } finally {
    veil.remove();
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
