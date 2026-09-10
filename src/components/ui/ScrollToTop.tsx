import { useLayoutEffect } from 'react';
import { useLocation } from 'react-router-dom';

function scrollBehavior(): ScrollBehavior {
  if (typeof window === 'undefined') return 'auto';
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth';
}

function jumpToTop() {
  const root = document.documentElement;
  const previous = root.style.scrollBehavior;
  root.style.scrollBehavior = 'auto';
  window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
  root.style.scrollBehavior = previous;
}

/** Reset / hash-scroll on route change — SPAs keep the previous scroll position otherwise. */
export default function ScrollToTop() {
  const { pathname, hash } = useLocation();

  useLayoutEffect(() => {
    const behavior = scrollBehavior();

    if (hash) {
      const id = decodeURIComponent(hash.slice(1));
      // Wait a frame so the target exists after route paint.
      const idFrame = window.requestAnimationFrame(() => {
        const el = document.getElementById(id);
        if (el) {
          el.scrollIntoView({ behavior, block: 'start' });
          return;
        }
        jumpToTop();
      });
      return () => window.cancelAnimationFrame(idFrame);
    }

    // Route commits must not paint once at the previous page's scroll offset.
    jumpToTop();
  }, [pathname, hash]);

  return null;
}
