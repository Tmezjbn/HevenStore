import { useEffect, useRef, type RefObject } from 'react';

type TiltOpts = {
  enabled: boolean;
  maxTilt: number;
  lerpIn: number;
  lerpOut: number;
};

/**
 * Continuous pointer tilt (whole interactive surfaces).
 * daisyUI hover-3d zones sit above content and steal clicks — this does not.
 */
export function usePointerTilt(
  rootRef: RefObject<HTMLElement | null>,
  faceRef: RefObject<HTMLElement | null>,
  { enabled, maxTilt, lerpIn, lerpOut }: TiltOpts,
) {
  const target = useRef({ x: 0, y: 0 });
  const current = useRef({ x: 0, y: 0 });
  const raf = useRef(0);
  const hovering = useRef(false);

  useEffect(() => {
    const root = rootRef.current;
    const face = faceRef.current;
    if (!enabled || !root || !face) {
      if (face) {
        face.style.setProperty('--rx', '0deg');
        face.style.setProperty('--ry', '0deg');
      }
      return;
    }

    const tick = () => {
      const c = current.current;
      const t = target.current;
      const lerp = hovering.current ? lerpIn : lerpOut;
      c.x += (t.x - c.x) * lerp;
      c.y += (t.y - c.y) * lerp;
      if (Math.abs(t.x - c.x) < 0.01 && Math.abs(t.y - c.y) < 0.01) {
        c.x = t.x;
        c.y = t.y;
      }
      face.style.setProperty('--rx', `${c.x.toFixed(3)}deg`);
      face.style.setProperty('--ry', `${c.y.toFixed(3)}deg`);
      const moving = Math.abs(t.x - c.x) > 0.01 || Math.abs(t.y - c.y) > 0.01;
      raf.current = moving ? requestAnimationFrame(tick) : 0;
    };

    const kick = () => {
      if (!raf.current) raf.current = requestAnimationFrame(tick);
    };

    const onMove = (e: MouseEvent) => {
      hovering.current = true;
      const r = root.getBoundingClientRect();
      if (r.width < 1 || r.height < 1) return;
      const nx = (e.clientX - r.left) / r.width - 0.5;
      const ny = (e.clientY - r.top) / r.height - 0.5;
      target.current = {
        x: -(ny * 2) * maxTilt,
        y: nx * 2 * maxTilt,
      };
      kick();
    };

    const onLeave = () => {
      hovering.current = false;
      target.current = { x: 0, y: 0 };
      kick();
    };

    root.addEventListener('mousemove', onMove);
    root.addEventListener('mouseleave', onLeave);
    return () => {
      root.removeEventListener('mousemove', onMove);
      root.removeEventListener('mouseleave', onLeave);
      if (raf.current) cancelAnimationFrame(raf.current);
      raf.current = 0;
      face.style.setProperty('--rx', '0deg');
      face.style.setProperty('--ry', '0deg');
    };
  }, [enabled, maxTilt, lerpIn, lerpOut, rootRef, faceRef]);
}
