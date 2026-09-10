import React from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import BrandLogo from '../ui/BrandLogo';
import AuthBackButton from './AuthBackButton';
import { usePageMeta } from '../../hooks/usePageMeta';

interface AuthShellProps {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}

const EASE_OUT = [0.16, 1, 0.3, 1] as const;

/** Shared full-page shell for all auth screens: centered vault card with logo. */
export default function AuthShell({ title, subtitle, children, footer }: AuthShellProps) {
  const reduceMotion = useReducedMotion();
  const duration = reduceMotion ? 0.15 : 0.32;
  usePageMeta({ title, noindex: true });

  return (
    <div className="min-h-screen bg-base-100 flex items-center justify-center px-4 pt-20 pb-12 relative overflow-hidden">
      <AuthBackButton />

      {/* subtle vault glow — soft fade only */}
      <motion.div
        aria-hidden
        className="pointer-events-none absolute inset-0 flex items-center justify-center"
        initial={reduceMotion ? false : { opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: reduceMotion ? 0.1 : 0.5, ease: EASE_OUT }}
      >
        <div className="w-[38rem] h-[38rem] rounded-full bg-base-content/[0.04] blur-3xl" />
      </motion.div>

      <motion.div
        className="w-full max-w-md relative"
        initial={reduceMotion ? false : { opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration, ease: EASE_OUT }}
      >
        <div className="text-center mb-8">
          <div className="flex justify-center mb-6">
            <BrandLogo size="lg" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
          {subtitle && <p className="text-sm text-base-content/70 mt-1.5">{subtitle}</p>}
        </div>

        <div className="card bg-base-200 border border-base-300 shadow-xl shadow-base-content/5">
          <div className="card-body">{children}</div>
        </div>

        {footer && <div className="text-center text-sm opacity-70 mt-5">{footer}</div>}
      </motion.div>
    </div>
  );
}
