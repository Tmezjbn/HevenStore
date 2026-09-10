import { useState } from 'react';

interface UserAvatarProps {
  name?: string | null;
  email?: string | null;
  avatarUrl?: string | null;
  /** Tailwind size class for the circle, e.g. "w-10" or "w-28 h-28" */
  sizeClass?: string;
  className?: string;
}

function initialLetter(name?: string | null, email?: string | null): string {
  const raw = name?.trim() || email?.trim() || '';
  if (!raw) return '?';
  // First grapheme (emoji / combined marks) — not just [0] code unit
  const first = [...raw][0] ?? '?';
  return first.toLocaleUpperCase();
}

function letterScript(letter: string): 'ar' | 'lat' | 'sym' {
  if (/[\u0600-\u06FF]/.test(letter)) return 'ar';
  if (/[A-Za-zÀ-ÿ]/.test(letter)) return 'lat';
  return 'sym';
}

/**
 * Profile picture, or theme-synced initial disc (Daisy primary / base tokens).
 */
export default function UserAvatar({
  name,
  email,
  avatarUrl,
  sizeClass = 'w-10',
  className = '',
}: UserAvatarProps) {
  const [broken, setBroken] = useState(false);
  const letter = initialLetter(name, email);
  const script = letterScript(letter);
  const src = avatarUrl?.trim() || '';
  const label = name || email || '';

  if (src && !broken) {
    return (
      <div className={`avatar user-avatar ${className}`.trim()}>
        <div className={`user-avatar-photo aspect-square rounded-full ${sizeClass}`}>
          <img src={src} alt={label} onError={() => setBroken(true)} />
        </div>
      </div>
    );
  }

  return (
    <div className={`avatar placeholder user-avatar ${className}`.trim()} aria-hidden={!label}>
      <div
        className={`user-avatar-fallback aspect-square ${sizeClass}`}
        title={label || undefined}
      >
        <span
          className={`user-avatar-fallback__letter is-${script}`}
          lang={script === 'ar' ? 'ar' : undefined}
        >
          {letter}
        </span>
      </div>
    </div>
  );
}
