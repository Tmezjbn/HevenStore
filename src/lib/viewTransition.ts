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

function applyThemeRevealOrigin(origin: ViewTransitionOrigin): () => void {
  const root = document.documentElement;
  const x = origin.x;
  const y = origin.y;
  const r = Math.hypot(
    Math.max(x, window.innerWidth - x),
    Math.max(y, window.innerHeight - y),
  );
  root.style.setProperty('--theme-vt-x', `${x}px`);
  root.style.setProperty('--theme-vt-y', `${y}px`);
  root.style.setProperty('--theme-vt-r', `${Math.ceil(r)}px`);
  root.classList.add('theme-reveal');
  return () => {
    root.classList.remove('theme-reveal');
    root.style.removeProperty('--theme-vt-x');
    root.style.removeProperty('--theme-vt-y');
    root.style.removeProperty('--theme-vt-r');
  };
}

/** Shared Document.startViewTransition wrapper (theme + language). */
export function withViewTransition(
  update: () => void,
  className = 'theme-switching',
  opts?: { origin?: ViewTransitionOrigin },
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

  const root = document.documentElement;
  const clearReveal =
    opts?.origin && Number.isFinite(opts.origin.x) && Number.isFinite(opts.origin.y)
      ? applyThemeRevealOrigin(opts.origin)
      : null;

  const startVt = (
    document as Document & {
      startViewTransition?: (update: () => void) => { finished: Promise<void> };
    }
  ).startViewTransition;

  if (typeof startVt !== 'function') {
    root.classList.add(className);
    update();
    requestAnimationFrame(() => {
      root.classList.remove(className);
      clearReveal?.();
    });
    return Promise.resolve();
  }

  root.classList.add(className);
  // Blink can drop the VT update callback entirely (headless, occluded tab) —
  // without a fallback the toggle is dead and theme-switching never clears.
  let ran = false;
  const runUpdate = () => {
    if (ran) return;
    ran = true;
    flushSync(update);
  };
  const fallback = window.setTimeout(() => {
    runUpdate();
    root.classList.remove(className);
    clearReveal?.();
  }, 700);
  const transition = startVt(runUpdate);
  return transition.finished
    .catch(() => undefined)
    .finally(() => {
      window.clearTimeout(fallback);
      runUpdate();
      root.classList.remove(className);
      clearReveal?.();
    })
    .then(() => undefined);
}
