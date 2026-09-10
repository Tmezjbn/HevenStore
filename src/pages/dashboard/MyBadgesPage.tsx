import { useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';
import { useAuthStore, PROFILE_COLS } from '../../stores/authStore';
import { useI18n } from '../../lib/i18n';
import BadgeIcon from '../../components/ui/BadgeIcon';
import type { Badge, UserBadge } from '../../types';

type Earned = UserBadge & { badge: Badge };

export default function MyBadgesPage() {
  const { t, lang } = useI18n();
  const user = useAuthStore((s) => s.user);
  const profile = useAuthStore((s) => s.profile);
  const setProfile = useAuthStore((s) => s.setProfile);
  const queryClient = useQueryClient();

  const [badges, setBadges] = useState<Earned[]>([]);
  const [loading, setLoading] = useState(true);
  const [showBadges, setShowBadges] = useState(profile?.show_badges !== false);
  const [prefBusy, setPrefBusy] = useState(false);
  const [msg, setMsg] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null);

  useEffect(() => {
    setShowBadges(profile?.show_badges !== false);
  }, [profile?.show_badges]);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    void (async () => {
      setLoading(true);
      const { data } = await supabase
        .from('user_badges')
        .select('user_id, badge_id, awarded_at, badge:badges(*)')
        .eq('user_id', user.id)
        .order('awarded_at', { ascending: false });
      if (cancelled) return;
      setBadges((data as Earned[] | null) ?? []);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [user]);

  const toggleShow = async (next: boolean) => {
    if (!user || !profile || prefBusy) return;
    setPrefBusy(true);
    setMsg(null);
    setShowBadges(next);
    const { data, error } = await supabase
      .from('profiles')
      .update({ show_badges: next, updated_at: new Date().toISOString() })
      .eq('id', user.id)
      .select(PROFILE_COLS)
      .maybeSingle();
    setPrefBusy(false);
    if (error || !data) {
      setShowBadges(profile.show_badges !== false);
      setMsg({ kind: 'err', text: t('تعذر حفظ إعداد الشارات', 'Could not save badge preference') });
      return;
    }
    setProfile(data as unknown as typeof profile);
    void queryClient.invalidateQueries({ queryKey: ['public-badges', user.id] });
    setMsg({ kind: 'ok', text: t('تم الحفظ', 'Saved') });
  };

  return (
    <div className="max-w-2xl mx-auto text-start space-y-5">
      <header className="space-y-1">
        <h2 className="text-xl font-semibold tracking-tight text-balance">
          {t('شاراتي', 'My Badges')}
        </h2>
        <p className="text-sm text-base-content/70 text-pretty">
          {t(
            'الشارات اللي كسبتها — وبعض أكواد الخصم تحتاج شارة معيّنة.',
            'Badges you’ve earned — some coupon codes need a specific badge.',
          )}
        </p>
      </header>

      <section className="rounded-xl border border-base-300 bg-base-200/60 p-4 space-y-3">
        <label className="flex items-center justify-between gap-3 cursor-pointer">
          <span className="text-sm text-pretty text-base-content/80">
            {t(
              'إظهار الشارات تحت صورتي (ملفي الشخصي وصفحة البائع)',
              'Show badges under my photo (My Profile & seller page)',
            )}
          </span>
          <input
            type="checkbox"
            className="toggle toggle-primary shrink-0"
            checked={showBadges}
            disabled={prefBusy}
            onChange={(e) => void toggleShow(e.target.checked)}
            aria-label={t('إظهار الشارات تحت صورتي', 'Show badges under my photo')}
          />
        </label>
        {msg ? (
          <p
            className={`text-sm ${msg.kind === 'ok' ? 'text-success' : 'text-error'}`}
            role={msg.kind === 'err' ? 'alert' : 'status'}
          >
            {msg.text}
          </p>
        ) : null}
      </section>

      {loading ? (
        <div className="flex justify-center py-14" role="status">
          <span className="loading loading-spinner loading-md text-primary" />
        </div>
      ) : badges.length === 0 ? (
        <div className="rounded-xl border border-dashed border-base-300 px-4 py-12 text-center">
          <p className="text-sm text-base-content/60">{t('لا توجد شارات بعد', 'No badges yet')}</p>
        </div>
      ) : (
        <ul className="space-y-2" role="list">
          {badges.map((row) => (
            <li
              key={row.badge_id}
              className="flex items-start gap-3 rounded-xl border border-base-300 bg-base-200/50 p-3.5"
            >
              <BadgeIcon
                icon={row.badge?.icon}
                size={18}
                className="w-10 h-10 mt-0.5 shrink-0"
                title={lang === 'ar' ? row.badge?.name_ar : row.badge?.name_en}
              />
              <div className="min-w-0 space-y-0.5">
                <p className="font-semibold tracking-tight">
                  {lang === 'ar' ? row.badge?.name_ar : row.badge?.name_en}
                </p>
                <p className="text-sm text-base-content/65 text-pretty">
                  {lang === 'ar' ? row.badge?.description_ar : row.badge?.description_en}
                </p>
                {row.awarded_at ? (
                  <p className="text-xs text-base-content/45 tabular-nums">
                    {new Date(row.awarded_at).toLocaleDateString(lang === 'ar' ? 'ar-SA' : 'en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </p>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
