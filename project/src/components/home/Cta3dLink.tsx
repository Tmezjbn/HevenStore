import { useEffect, useRef, type CSSProperties, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { useMerchMotionCalm } from '../../hooks/useMerchMotionCalm';

const MAX_TILT = 9;
/** 0–1 per frame toward target. Lower = smoother / heavier. */
const LERP = 0.14;

/**
 * daisyUI hover-3d snaps across 8 zones with spring overshoot.
 * This keeps the same 3D look with continuous mouse lerp.
 * Respects site `merch_motion_mode` + prefers-reduced-motion (static when calmed).
 */
export default function Cta3dLink({
  to,
  className = '',
  children,
}: {
  to: string;
  className?: string;
  children: ReactNode;
}) {
  const rootRef = useRef<HTMLAnchorElement>(null);
  const faceRef = useRef<HTMLDivElement>(null);
  const target = useRef({ x: 0, y: 0 });
  const current = useRef({ x: 0, y: 0 });
  const raf = useRef(0);
  const merchCalm = useMerchMotionCalm();

  useEffect(() => {
    const face = faceRef.current;
    if (!face) return;

    if (merchCalm) {
      face.style.setProperty('--rx', '0deg');
      face.style.setProperty('--ry', '0deg');
      face.style.setProperty('--shine-x', '50%');
      face.style.setProperty('--shine-y', '50%');
      return;
    }

    const tick = () => {
      const c = current.current;
      const t = target.current;
      c.x += (t.x - c.x) * LERP;
      c.y += (t.y - c.y) * LERP;
      if (Math.abs(t.x - c.x) < 0.01 && Math.abs(t.y - c.y) < 0.01) {
        c.x = t.x;
        c.y = t.y;
      }
      face.style.setProperty('--rx', `${c.x.toFixed(3)}deg`);
      face.style.setProperty('--ry', `${c.y.toFixed(3)}deg`);
      face.style.setProperty('--shine-x', `${50 + c.y * 4}%`);
      face.style.setProperty('--shine-y', `${50 - c.x * 4}%`);
      const moving =
        Math.abs(t.x - c.x) > 0.01 || Math.abs(t.y - c.y) > 0.01;
      raf.current = moving ? requestAnimationFrame(tick) : 0;
    };

    const kick = () => {
      if (!raf.current) raf.current = requestAnimationFrame(tick);
    };

    const onMove = (e: MouseEvent) => {
      const el = rootRef.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      const nx = (e.clientX - r.left) / r.width - 0.5;
      const ny = (e.clientY - r.top) / r.height - 0.5;
      target.current = {
        x: -(ny * 2) * MAX_TILT,
        y: nx * 2 * MAX_TILT,
      };
      kick();
    };

    const onLeave = () => {
      target.current = { x: 0, y: 0 };
      kick();
    };

    const el = rootRef.current;
    el?.addEventListener('mousemove', onMove);
    el?.addEventListener('mouseleave', onLeave);
    return () => {
      el?.removeEventListener('mousemove', onMove);
      el?.removeEventListener('mouseleave', onLeave);
      if (raf.current) cancelAnimationFrame(raf.current);
      raf.current = 0;
    };
  }, [merchCalm]);

  return (
    <Link
      ref={rootRef}
      to={to}
      className={`cta-3d-tilt ${className}`.trim()}
      style={{ '--rx': '0deg', '--ry': '0deg', '--shine-x': '50%', '--shine-y': '50%' } as CSSProperties}
    >
      <div ref={faceRef} className="cta-3d-tilt__face">
        {children}
      </div>
    </Link>
  );
}
