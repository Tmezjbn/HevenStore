import type { CSSProperties } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useI18n } from '../../lib/i18n';
import { supabase } from '../../lib/supabase';
import BadgeIcon from './BadgeIcon';

export type PublicBadgeRow = {
  badge_id: string;
  slug: string;
  name_ar: string;
  name_en: string;
  description_ar: string;
  description_en: string;
  icon: string;
  awarded_at: string;
};

export function usePublicBadges(userId: string | null | undefined, enabled = true) {
  return useQuery({
    queryKey: ['public-badges', userId],
    enabled: Boolean(userId) && enabled,
    queryFn: async (): Promise<PublicBadgeRow[]> => {
      const { data, error } = await supabase.rpc('get_profile_public_badges', { p_id: userId });
      if (error) throw error;
      return (data as PublicBadgeRow[]) ?? [];
    },
    staleTime: 60_000,
  });
}

type Props = {
  userId: string | null | undefined;
  /** Visual show/hide — animates via CSS. Default true. */
  visible?: boolean;
  size?: number;
  className?: string;
  /** Sit on a text row (sidebar meta line). */
  inline?: boolean;
  /** Local rows (profile preview) — skips network when provided. */
  badges?: PublicBadgeRow[];
};

function chipBox(size: number): string {
  if (size <= 9) return 'w-4 h-4';
  if (size <= 10) return 'w-5 h-5';
  if (size <= 12) return 'w-6 h-6';
  if (size <= 14) return 'w-7 h-7';
  return 'w-8 h-8';
}

/** Badge strip under a profile / seller header. Empty when none. */
export default function ProfileBadgeStrip({
  userId,
  visible = true,
  size = 14,
  className = '',
  inline = false,
  badges: localBadges,
}: Props) {
  const { lang } = useI18n();
  const useLocal = localBadges != null;
  // Keep query enabled while visible so cache stays warm; disable on hide so
  // RPC (which returns [] when show_badges=false) does not wipe icons mid-exit.
  const q = usePublicBadges(userId, !useLocal && visible);
  const rows = useLocal ? localBadges : (q.data ?? []);

  if (rows.length === 0) return null;

  const label = lang === 'ar' ? 'الشارات' : 'Badges';
  const n = rows.length;
  const open = visible;
  const box = chipBox(size);

  return (
    <div
      className={`badge-strip-motion${open ? ' is-open' : ''}${inline ? ' badge-strip-motion--inline' : ''}`}
      aria-hidden={!open}
    >
      <div className="badge-strip-motion__clip">
        <ul
          className={`flex flex-wrap items-center gap-1${className ? ` ${className}` : ''}`}
          aria-label={open ? label : undefined}
          style={{ '--n': n } as CSSProperties}
        >
          {rows.map((b, i) => {
            const name = lang === 'ar' ? b.name_ar || b.name_en : b.name_en || b.name_ar;
            return (
              <li
                key={b.badge_id}
                className="badge-strip-motion__item"
                style={{ '--i': i } as CSSProperties}
              >
                <BadgeIcon icon={b.icon} size={size} className={box} title={name} />
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
