import { useEffect, useId, useRef, useState, type ElementType, type ReactNode } from 'react';
import { useLocation } from 'react-router-dom';

interface RevealProps {
  children: ReactNode;
  as?: ElementType;
  className?: string;
  delay?: number;
  /** Stable id for session persistence — pass on home sections */
  id?: string;
}

function storageKey(pathname: string, id: string) {
  return `heven:reveal:${pathname}:${id}`;
}

// Scroll-reveal below hero: slow fade + rise once per session.
export default function Reveal({ children, as, className = '', delay = 0, id }: RevealProps) {
  const Tag = (as ?? 'div') as ElementType;
  const ref = useRef<HTMLElement | null>(null);
  const autoId = useId();
  const revealId = id ?? autoId;
  const { pathname } = useLocation();
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const key = storageKey(pathname, revealId);
    if (sessionStorage.getItem(key) === '1') {
      setShown(true);
      return;
    }

    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce || typeof IntersectionObserver === 'undefined') {
      setShown(true);
      sessionStorage.setItem(key, '1');
      return;
    }

    const markShown = () => {
      setShown(true);
      sessionStorage.setItem(key, '1');
    };

    const observer = new IntersectionObserver(
      (entries, obs) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            markShown();
            obs.unobserve(entry.target);
          }
        });
      },
      {
        threshold: 0.08,
        rootMargin: '0px 0px -12% 0px',
      }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [pathname, revealId]);

  return (
    <Tag
      ref={ref}
      className={`reveal ${shown ? 'reveal--in' : ''} ${className}`}
      style={delay ? { transitionDelay: `${delay}ms` } : undefined}
    >
      {children}
    </Tag>
  );
}
