import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeftRight, ChevronDown, Loader2, Shield, UsersRound } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuthStore, PROFILE_COLS } from '../../stores/authStore';
import { useI18n } from '../../lib/i18n';
import { mapAuthError, passwordScore } from '../../lib/authErrors';
import {
  isValidUsername,
  normalizeUsername,
  isUsernameChangeLocked,
  usernameUnlockAt,
  USERNAME_CHANGE_COOLDOWN_DAYS,
} from '../../lib/username';
import {
  canAddSecondAccount,
  loadPark,
  subscribePark,
  type ParkedAccount,
} from '../../lib/accountSwitch';
import { parseMultiAccountRoles } from '../../lib/siteSettings';
import { useSiteSettings } from '../../hooks/useSiteSettings';
import { roleLabel } from '../../lib/roles';
import AvatarUploader from '../../components/ui/AvatarUploader';
import BadgeIcon from '../../components/ui/BadgeIcon';
import ProfileBadgeStrip, { type PublicBadgeRow } from '../../components/ui/ProfileBadgeStrip';
import type { Badge, UserBadge } from '../../types';
import { useQueryClient } from '@tanstack/react-query';

type Earned = UserBadge & { badge: Badge };
type Flash = { kind: 'ok' | 'err'; text: string } | null;

function FlashMsg({ flash }: { flash: Flash }) {
  if (!flash) return null;
  return (
    <p
      className={`text-sm ${flash.kind === 'ok' ? 'text-success' : 'text-error'}`}
      role={flash.kind === 'err' ? 'alert' : 'status'}
    >
      {flash.text}
    </p>
  );
}

export default function ProfilePage() {
  const { t, lang } = useI18n();
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const profile = useAuthStore((s) => s.profile);
  const setProfile = useAuthStore((s) => s.setProfile);
  const addSecondAccount = useAuthStore((s) => s.addSecondAccount);
  const switchAccount = useAuthStore((s) => s.switchAccount);
  const removeParkedAccount = useAuthStore((s) => s.removeParkedAccount);
  const queryClient = useQueryClient();
  const { settings } = useSiteSettings();
  const multiFlags = parseMultiAccountRoles(settings.multi_account_roles_json);
  const locale = lang === 'ar' ? 'ar' : 'en';

  const [park, setPark] = useState<ParkedAccount | null>(() => loadPark());
  const [acctBusy, setAcctBusy] = useState(false);
  const [acctMsg, setAcctMsg] = useState<Flash>(null);

  useEffect(() => subscribePark(() => setPark(loadPark())), []);

  const canAddAcct = canAddSecondAccount(profile?.role, multiFlags) && !park;
  const showAccounts = canAddAcct || !!park;

  const [fullName, setFullName] = useState(profile?.full_name ?? '');
  const [nameMsg, setNameMsg] = useState<Flash>(null);
  const [nameBusy, setNameBusy] = useState(false);

  const [username, setUsername] = useState(profile?.username ?? '');
  const [userMsg, setUserMsg] = useState<Flash>(null);
  const [userBusy, setUserBusy] = useState(false);

  const [currentPw, setCurrentPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [pwMsg, setPwMsg] = useState<Flash>(null);
  const [pwBusy, setPwBusy] = useState(false);

  const [delName, setDelName] = useState('');
  const [delPw, setDelPw] = useState('');
  const [delMsg, setDelMsg] = useState<Flash>(null);
  const [delBusy, setDelBusy] = useState(false);
  const [pendingDeletion, setPendingDeletion] = useState(false);

  const [badges, setBadges] = useState<Earned[]>([]);
  const [showBadges, setShowBadges] = useState(profile?.show_badges !== false);
  const [badgePrefBusy, setBadgePrefBusy] = useState(false);
  const [badgeMsg, setBadgeMsg] = useState<Flash>(null);

  useEffect(() => {
    setFullName(profile?.full_name ?? '');
  }, [profile?.full_name]);

  useEffect(() => {
    setUsername(profile?.username ?? '');
  }, [profile?.username]);

  useEffect(() => {
    setShowBadges(profile?.show_badges !== false);
  }, [profile?.show_badges]);

  useEffect(() => {
    if (!user) return;
    void (async () => {
      const [{ data: ub }, { data: req }] = await Promise.all([
        supabase
          .from('user_badges')
          .select('user_id, badge_id, awarded_at, badge:badges(*)')
          .eq('user_id', user.id)
          .order('awarded_at', { ascending: false }),
        supabase
          .from('account_deletion_requests')
          .select('id')
          .eq('user_id', user.id)
          .eq('status', 'pending')
          .maybeSingle(),
      ]);
      setBadges((ub as Earned[] | null) ?? []);
      setPendingDeletion(!!req);
    })();
  }, [user]);

  const pwScore = useMemo(() => passwordScore(newPw), [newPw]);
  const pwScoreLabel = [
    t('ضعيفة جداً', 'Very weak'),
    t('ضعيفة', 'Weak'),
    t('متوسطة', 'Fair'),
    t('جيدة', 'Good'),
    t('قوية', 'Strong'),
  ][pwScore];
  const pwScoreColor = ['bg-error', 'bg-error', 'bg-warning', 'bg-info', 'bg-success'][pwScore];
  const confirmMismatch = confirmPw.length > 0 && newPw !== confirmPw;
  const canUpdatePw =
    Boolean(currentPw && newPw && confirmPw) &&
    !confirmMismatch &&
    pwScore >= 2 &&
    !pwBusy;

  if (!user || !profile) return null;

  const profileName = (profile.full_name ?? '').trim();
  const nameMatches =
    delName.trim().toLowerCase() === profileName.toLowerCase() && profileName.length > 0;
  const canRequestDelete =
    nameMatches && delPw.length > 0 && !pendingDeletion && !profile.deletion_scheduled_at;

  const userDirty = normalizeUsername(username) !== (profile.username ?? '');
  const userLocked = isUsernameChangeLocked(profile.username_changed_at);
  const unlockAt = usernameUnlockAt(profile.username_changed_at);

  const saveName = async () => {
    setNameMsg(null);
    const next = fullName.trim();
    if (!next) {
      setNameMsg({ kind: 'err', text: t('الاسم مطلوب', 'Name is required') });
      return;
    }
    setNameBusy(true);
    const { error } = await supabase
      .from('profiles')
      .update({ full_name: next, updated_at: new Date().toISOString() })
      .eq('id', user.id);
    setNameBusy(false);
    if (error) {
      setNameMsg({ kind: 'err', text: t('تعذر حفظ الاسم', 'Could not save name') });
      return;
    }
    setProfile({ ...profile, full_name: next });
    setNameMsg({ kind: 'ok', text: t('تم الحفظ', 'Saved') });
  };

  const saveUsername = async () => {
    setUserMsg(null);
    const next = normalizeUsername(username);
    if (!isValidUsername(next)) {
      setUserMsg({
        kind: 'err',
        text: t('اسم المستخدم: 3–24 (a-z، أرقام، _)', 'Username: 3–24 (a-z, digits, _)'),
      });
      return;
    }
    if (next === (profile.username ?? '')) return;
    if (isUsernameChangeLocked(profile.username_changed_at)) {
      setUserMsg({
        kind: 'err',
        text: t(
          `يمكنك التغيير مرة أخرى في ${unlockAt?.toLocaleDateString(locale) ?? '…'}`,
          `You can change again on ${unlockAt?.toLocaleDateString('en') ?? '…'}`,
        ),
      });
      return;
    }
    setUserBusy(true);
    const { data: taken, error: takenErr } = await supabase.rpc('username_taken', { p_username: next });
    if (takenErr?.message?.includes('RATE_LIMITED')) {
      setUserBusy(false);
      setUserMsg({
        kind: 'err',
        text: t('محاولات كثيرة. انتظر دقيقة ثم حاول مجدداً.', 'Too many attempts. Wait a minute and try again.'),
      });
      return;
    }
    if (taken === true) {
      setUserBusy(false);
      setUserMsg({ kind: 'err', text: t('اسم المستخدم مستخدم مسبقاً', 'Username is already taken') });
      return;
    }
    const { data, error } = await supabase
      .from('profiles')
      .update({ username: next, updated_at: new Date().toISOString() })
      .eq('id', user.id)
      .select('username, username_changed_at')
      .maybeSingle();
    setUserBusy(false);
    if (error) {
      const m = error.message || '';
      if (m.includes('USERNAME_COOLDOWN')) {
        setUserMsg({
          kind: 'err',
          text:
            t(
              `انتظر ${USERNAME_CHANGE_COOLDOWN_DAYS} يوماً بين التغييرات`,
              `Wait ${USERNAME_CHANGE_COOLDOWN_DAYS} days between changes`,
            ) + (unlockAt ? ` · ${unlockAt.toLocaleDateString(locale)}` : ''),
        });
        return;
      }
      setUserMsg({
        kind: 'err',
        text:
          m.includes('profiles_username') || error.code === '23505'
            ? t('اسم المستخدم مستخدم مسبقاً', 'Username is already taken')
            : t('تعذر حفظ اسم المستخدم', 'Could not save username'),
      });
      return;
    }
    setProfile({
      ...profile,
      username: data?.username ?? next,
      username_changed_at: data?.username_changed_at ?? new Date().toISOString(),
    });
    setUserMsg({ kind: 'ok', text: t('تم الحفظ', 'Saved') });
  };

  const toggleShowBadges = async (next: boolean) => {
    setBadgeMsg(null);
    setShowBadges(next);
    setBadgePrefBusy(true);
    const { data, error } = await supabase
      .from('profiles')
      .update({ show_badges: next, updated_at: new Date().toISOString() })
      .eq('id', user.id)
      .select(PROFILE_COLS)
      .maybeSingle();
    setBadgePrefBusy(false);
    if (error || !data) {
      setShowBadges(profile.show_badges !== false);
      setBadgeMsg({
        kind: 'err',
        text: t('تعذر حفظ إعداد الشارات', 'Could not save badge preference'),
      });
      return;
    }
    setProfile(data as unknown as typeof profile);
    void queryClient.invalidateQueries({ queryKey: ['public-badges', user.id] });
    setBadgeMsg({
      kind: 'ok',
      text: next
        ? t('الشارات ظاهرة', 'Badges visible')
        : t('الشارات مخفية', 'Badges hidden'),
    });
  };

  const changePassword = async () => {
    setPwMsg(null);
    if (newPw !== confirmPw) {
      setPwMsg({ kind: 'err', text: t('كلمتا المرور غير متطابقتين', 'Passwords do not match') });
      return;
    }
    if (passwordScore(newPw) < 2) {
      setPwMsg({
        kind: 'err',
        text: t(
          'كلمة المرور ضعيفة. 8 أحرف على الأقل مع مزيج أقوى.',
          'Password is too weak. Use at least 8 characters with a stronger mix.',
        ),
      });
      return;
    }
    if (!user.email) return;
    setPwBusy(true);
    const { error: authErr } = await supabase.auth.signInWithPassword({
      email: user.email,
      password: currentPw,
    });
    if (authErr) {
      setPwBusy(false);
      setPwMsg({ kind: 'err', text: mapAuthError(authErr, t) });
      return;
    }
    const { error } = await supabase.auth.updateUser({ password: newPw });
    setPwBusy(false);
    if (error) {
      setPwMsg({ kind: 'err', text: mapAuthError(error, t) });
      return;
    }
    setCurrentPw('');
    setNewPw('');
    setConfirmPw('');
    setPwMsg({ kind: 'ok', text: t('تم تحديث كلمة المرور', 'Password updated') });
  };

  const requestDeletion = async () => {
    setDelMsg(null);
    if (!canRequestDelete || !user.email) return;
    setDelBusy(true);
    const { error: authErr } = await supabase.auth.signInWithPassword({
      email: user.email,
      password: delPw,
    });
    if (authErr) {
      setDelBusy(false);
      setDelMsg({ kind: 'err', text: mapAuthError(authErr, t) });
      return;
    }
    const { error } = await supabase.rpc('request_account_deletion', {
      p_confirm_name: delName.trim(),
    });
    setDelBusy(false);
    if (error) {
      const m = error.message || '';
      if (m.includes('NAME_MISMATCH')) {
        setDelMsg({ kind: 'err', text: t('الاسم غير مطابق', 'Name does not match') });
      } else if (m.includes('ALREADY_PENDING') || m.includes('ALREADY_SCHEDULED')) {
        setDelMsg({
          kind: 'err',
          text: t('طلب الحذف موجود مسبقاً', 'A deletion request already exists'),
        });
        setPendingDeletion(true);
      } else {
        setDelMsg({
          kind: 'err',
          text: t(
            'تعذر إرسال الطلب. حاول لاحقاً أو تواصل مع الدعم.',
            'Could not submit the request. Try again later or contact support.',
          ),
        });
      }
      return;
    }
    setPendingDeletion(true);
    setDelName('');
    setDelPw('');
    setDelMsg({
      kind: 'ok',
      text: t('تم إرسال طلب الحذف للمراجعة', 'Deletion request submitted for review'),
    });
  };

  return (
    <div className="max-w-xl mx-auto space-y-6 text-start">
      <header className="profile-identity rounded-xl border border-base-300 bg-base-200/80 px-4 py-6 sm:px-6">
        <div className="flex flex-col items-center gap-3">
          <AvatarUploader sizeClass="w-28" />
          <div className="text-center space-y-0.5">
            <p className="text-lg font-bold text-balance">
              {profile.full_name || t('بلا اسم', 'No name')}
            </p>
            {profile.username ? (
              <p className="text-sm text-base-content/70 font-mono">@{profile.username}</p>
            ) : null}
            <p className="text-sm text-base-content/60">{profile.email}</p>
          </div>
          {badges.length > 0 ? (
            <ProfileBadgeStrip
              userId={user.id}
              visible={showBadges}
              size={16}
              className="justify-center"
              badges={badges.map(
                (row): PublicBadgeRow => ({
                  badge_id: row.badge_id,
                  slug: row.badge?.slug ?? '',
                  name_ar: row.badge?.name_ar ?? '',
                  name_en: row.badge?.name_en ?? '',
                  description_ar: row.badge?.description_ar ?? '',
                  description_en: row.badge?.description_en ?? '',
                  icon: row.badge?.icon ?? '',
                  awarded_at: row.awarded_at,
                }),
              )}
            />
          ) : null}
        </div>
      </header>

      {(pendingDeletion || profile.deletion_scheduled_at) && (
        <div className="alert alert-warning text-sm">
          <span>
            {profile.deletion_scheduled_at
              ? t(
                  `حسابك مجدول للحذف في ${new Date(profile.deletion_scheduled_at).toLocaleDateString(locale)}`,
                  `Your account is scheduled for deletion on ${new Date(profile.deletion_scheduled_at).toLocaleDateString('en')}`,
                )
              : t('طلب حذف حسابك قيد المراجعة', 'Your account deletion request is pending review')}
          </span>
        </div>
      )}

      <section className="rounded-xl border border-primary/25 bg-base-200 p-4 sm:p-5 space-y-4">
        <h2 className="profile-section-title">{t('الهوية', 'Identity')}</h2>

        <form
          className="space-y-2"
          onSubmit={(e) => {
            e.preventDefault();
            void saveName();
          }}
        >
          <label className="form-control w-full">
            <span className="label py-1">
              <span className="label-text profile-field-label">{t('الاسم الكامل', 'Full name')}</span>
            </span>
            <input
              className="input input-bordered input-sm w-full"
              value={fullName}
              onChange={(e) => {
                setFullName(e.target.value);
                setNameMsg(null);
              }}
              autoComplete="name"
            />
          </label>
          <FlashMsg flash={nameMsg} />
          <button type="submit" className="btn btn-primary btn-sm" disabled={nameBusy}>
            {nameBusy ? <Loader2 size={14} className="animate-spin" aria-hidden /> : null}
            {t('حفظ الاسم', 'Save name')}
          </button>
        </form>

        <div className="divider my-1" />

        <form
          className="space-y-2"
          onSubmit={(e) => {
            e.preventDefault();
            void saveUsername();
          }}
        >
          <label className="form-control w-full">
            <span className="label py-1">
              <span className="label-text profile-field-label">{t('اسم المستخدم', 'Username')}</span>
            </span>
            <input
              className="input input-bordered input-sm w-full font-mono"
              value={username}
              onChange={(e) => {
                setUsername(normalizeUsername(e.target.value));
                setUserMsg(null);
              }}
              autoComplete="username"
              minLength={3}
              maxLength={24}
              pattern="[a-z0-9_]{3,24}"
              readOnly={userLocked}
              aria-disabled={userLocked}
            />
          </label>
          <div className="text-xs text-base-content/65 space-y-1">
            <p>
              {t(
                'تسجيل الدخول والرابط العام (@handle) · لاتيني فقط: 3–24 (a–z، أرقام، _)',
                'Sign-in & public @handle · Latin only: 3–24 (a–z, digits, _)',
              )}
            </p>
            <p>
              {userLocked && unlockAt
                ? t(
                    `التغيير مقفول حتى ${unlockAt.toLocaleDateString(locale)}`,
                    `Locked until ${unlockAt.toLocaleDateString('en')}`,
                  )
                : t(
                    `تغيير واحد كل ${USERNAME_CHANGE_COOLDOWN_DAYS} يوماً`,
                    `One change every ${USERNAME_CHANGE_COOLDOWN_DAYS} days`,
                  )}
            </p>
          </div>
          <FlashMsg flash={userMsg} />
          <button
            type="submit"
            className="btn btn-primary btn-sm"
            disabled={userBusy || userLocked || !userDirty || !isValidUsername(username)}
          >
            {userBusy ? <Loader2 size={14} className="animate-spin" aria-hidden /> : null}
            {t('حفظ اسم المستخدم', 'Save username')}
          </button>
        </form>
      </section>

      {showAccounts ? (
        <section className="rounded-xl border border-base-content/20 bg-base-200 p-4 sm:p-5 space-y-3">
          <h2 className="profile-section-title profile-section-title--with-icon">
            <span className="profile-section-title__icon" aria-hidden>
              <UsersRound />
            </span>
            {t('إضافة حسابات', 'Add accounts')}
          </h2>
          <p className="text-xs text-base-content/65 text-pretty">
            {t(
              'احفظ هذا الحساب على الجهاز وسجّل دخولاً بثانٍ، ثم بدّل بينهما من أيقونة التبديل بجانب اسمك.',
              'Park this account on the device, sign in as another, then switch from the icon beside your name.',
            )}
          </p>
          {park ? (
            <div className="rounded-lg border border-base-300 bg-base-100/50 px-3 py-2.5 space-y-1">
              <p className="text-xs text-base-content/55">{t('الحساب المحفوظ', 'Parked account')}</p>
              <p className="text-sm font-semibold truncate">
                {park.fullName?.trim() ||
                  (park.username ? `@${park.username}` : null) ||
                  park.email ||
                  t('حساب آخر', 'Other account')}
              </p>
              {park.role ? (
                <p className="text-xs text-base-content/55">{roleLabel(park.role, lang)}</p>
              ) : null}
            </div>
          ) : null}
          <FlashMsg flash={acctMsg} />
          <div className="flex flex-wrap gap-2">
            {park ? (
              <button
                type="button"
                className="btn btn-primary btn-sm gap-1.5"
                disabled={acctBusy}
                onClick={() => {
                  setAcctBusy(true);
                  setAcctMsg(null);
                  void (async () => {
                    const res = await switchAccount();
                    setAcctBusy(false);
                    if (!res.ok) {
                      setAcctMsg({
                        kind: 'err',
                        text: t(
                          'تعذر التبديل — جرّب مرة أخرى أو سجّل دخول الحساب الآخر مجدداً.',
                          'Could not switch — try again, or sign in to the other account again.',
                        ),
                      });
                      setPark(loadPark());
                      return;
                    }
                    navigate('/dashboard');
                  })();
                }}
              >
                {acctBusy ? (
                  <Loader2 size={14} className="animate-spin" aria-hidden />
                ) : (
                  <ArrowLeftRight size={14} aria-hidden />
                )}
                {t('تبديل الحساب', 'Switch account')}
              </button>
            ) : null}
            {canAddAcct ? (
              <button
                type="button"
                className="btn btn-primary btn-sm gap-1.5"
                disabled={acctBusy}
                onClick={() => {
                  setAcctBusy(true);
                  setAcctMsg(null);
                  void (async () => {
                    const ok = await addSecondAccount();
                    setAcctBusy(false);
                    if (!ok) {
                      setAcctMsg({
                        kind: 'err',
                        text: t('تعذر حفظ الحساب الحالي.', 'Could not park the current account.'),
                      });
                      return;
                    }
                    navigate('/auth/login?add=1&next=/dashboard/profile');
                  })();
                }}
              >
                {acctBusy ? <Loader2 size={14} className="animate-spin" aria-hidden /> : null}
                {t('إضافة حساب', 'Add account')}
              </button>
            ) : null}
            {park ? (
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                disabled={acctBusy}
                onClick={() => {
                  removeParkedAccount();
                  setPark(null);
                  setAcctMsg({
                    kind: 'ok',
                    text: t('أُزيل الحساب المحفوظ من هذا الجهاز.', 'Parked account removed from this device.'),
                  });
                }}
              >
                {t('إزالة المحفوظ', 'Remove parked')}
              </button>
            ) : null}
          </div>
        </section>
      ) : null}

      <section className="rounded-xl border border-base-content/20 bg-base-200 p-4 sm:p-5 space-y-3">
        <h2 className="profile-section-title profile-section-title--with-icon">
          <span className="profile-section-title__icon" aria-hidden>
            <Shield />
          </span>
          {t('الأمان', 'Security')}
        </h2>
        <p className="text-xs text-base-content/65">
          {t(
            '8 أحرف على الأقل. أضف أحرف كبيرة وصغيرة وأرقاماً ورموزاً لقوة أفضل.',
            'At least 8 characters. Mix upper/lowercase, numbers, and symbols for strength.',
          )}
        </p>
        <form
          className="space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            if (canUpdatePw) void changePassword();
          }}
        >
          <label className="form-control w-full">
            <span className="label py-1">
              <span className="label-text profile-field-label">
                {t('كلمة المرور الحالية', 'Current password')}
              </span>
            </span>
            <input
              type="password"
              autoComplete="current-password"
              className="input input-bordered input-sm w-full"
              value={currentPw}
              onChange={(e) => {
                setCurrentPw(e.target.value);
                setPwMsg(null);
              }}
            />
          </label>
          <label className="form-control w-full">
            <span className="label py-1">
              <span className="label-text profile-field-label">
                {t('كلمة المرور الجديدة', 'New password')}
              </span>
            </span>
            <input
              type="password"
              autoComplete="new-password"
              className="input input-bordered input-sm w-full"
              value={newPw}
              onChange={(e) => {
                setNewPw(e.target.value);
                setPwMsg(null);
              }}
            />
          </label>
          {newPw ? (
            <div className="flex items-center gap-2" aria-live="polite">
              <div className="flex flex-1 gap-1" role="meter" aria-valuenow={pwScore} aria-valuemin={0} aria-valuemax={4} aria-label={pwScoreLabel}>
                {[0, 1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className={`h-1 flex-1 rounded-full transition-colors ${i < pwScore ? pwScoreColor : 'bg-base-300'}`}
                  />
                ))}
              </div>
              <span className="text-xs text-base-content/65 w-16 text-end">{pwScoreLabel}</span>
            </div>
          ) : null}
          <label className="form-control w-full">
            <span className="label py-1">
              <span className="label-text profile-field-label">
                {t('تأكيد كلمة المرور', 'Confirm password')}
              </span>
            </span>
            <input
              type="password"
              autoComplete="new-password"
              className={`input input-bordered input-sm w-full ${confirmMismatch ? 'input-error' : ''}`}
              value={confirmPw}
              onChange={(e) => {
                setConfirmPw(e.target.value);
                setPwMsg(null);
              }}
            />
          </label>
          {confirmMismatch ? (
            <p className="text-error text-xs" role="alert">
              {t('كلمتا المرور غير متطابقتين', 'Passwords do not match')}
            </p>
          ) : null}
          <FlashMsg flash={pwMsg} />
          <button type="submit" className="btn btn-primary btn-sm" disabled={!canUpdatePw}>
            {pwBusy ? <Loader2 size={14} className="animate-spin" aria-hidden /> : null}
            {t('تحديث كلمة المرور', 'Update password')}
          </button>
        </form>
      </section>

      <section className="rounded-xl border border-dashed border-base-300 bg-base-100/40 p-4 space-y-3">
        <h2 className="profile-section-title profile-section-title--quiet">{t('شاراتك', 'Your badges')}</h2>
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
            disabled={badgePrefBusy}
            onChange={(e) => void toggleShowBadges(e.target.checked)}
            aria-label={t('إظهار الشارات تحت صورتي', 'Show badges under my photo')}
          />
        </label>
        <FlashMsg flash={badgeMsg} />
        {badges.length === 0 ? (
          <p className="text-sm text-base-content/60">{t('لا توجد شارات بعد', 'No badges yet')}</p>
        ) : (
          <ul className="space-y-2">
            {badges.map((row) => (
              <li key={row.badge_id} className="flex items-start gap-3 text-sm">
                <BadgeIcon
                  icon={row.badge?.icon}
                  size={16}
                  className="w-8 h-8 mt-0.5"
                  title={lang === 'ar' ? row.badge?.name_ar : row.badge?.name_en}
                />
                <div>
                  <p className="font-medium">
                    {lang === 'ar' ? row.badge?.name_ar : row.badge?.name_en}
                  </p>
                  <p className="text-xs text-base-content/60">
                    {lang === 'ar' ? row.badge?.description_ar : row.badge?.description_en}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <details className="group rounded-xl border border-error/40 bg-base-200 open:bg-base-200">
        <summary className="cursor-pointer list-none flex items-center justify-between gap-3 p-4 select-none [&::-webkit-details-marker]:hidden">
          <span className="profile-section-title profile-section-title--danger tracking-normal">
            {t('منطقة حساسة', 'Danger Zone')}
          </span>
          <ChevronDown
            size={18}
            className="text-error/80 shrink-0 transition-transform duration-200 group-open:rotate-180"
            aria-hidden
          />
        </summary>
        <div className="px-4 pb-4 space-y-3 border-t border-error/20 pt-3">
          <h2 className="profile-section-title profile-section-title--danger">{t('حذف الحساب', 'Delete account')}</h2>
          <p className="text-xs text-base-content/70 text-pretty">
            {t(
              'اكتب اسمك الكامل وكلمة المرور كما في الملف. الطلب يُراجع من المالك.',
              'Type your full name and password as on your profile. The owner reviews the request.',
            )}
          </p>
          {profileName ? (
            <p className="text-xs text-base-content/70">
              {t('الاسم المطلوب:', 'Required name:')}{' '}
              <span className="font-medium text-base-content">{profileName}</span>
            </p>
          ) : (
            <p className="text-xs text-warning">
              {t('احفظ اسماً كاملاً أولاً قبل طلب الحذف.', 'Save a full name before requesting deletion.')}
            </p>
          )}
          <label className="form-control w-full">
            <span className="label py-1">
              <span className="label-text profile-field-label">
                {t('أكّد الاسم الكامل', 'Confirm full name')}
              </span>
            </span>
            <input
              className="input input-bordered input-sm w-full"
              value={delName}
              onChange={(e) => setDelName(e.target.value)}
              disabled={!!profile.deletion_scheduled_at || pendingDeletion}
              autoComplete="off"
            />
          </label>
          <label className="form-control w-full">
            <span className="label py-1">
              <span className="label-text profile-field-label">{t('كلمة المرور', 'Password')}</span>
            </span>
            <input
              type="password"
              className="input input-bordered input-sm w-full"
              value={delPw}
              onChange={(e) => setDelPw(e.target.value)}
              disabled={!!profile.deletion_scheduled_at || pendingDeletion}
              autoComplete="current-password"
            />
          </label>
          <FlashMsg flash={delMsg} />
          <button
            type="button"
            className="btn btn-error btn-sm min-h-10"
            disabled={!canRequestDelete || delBusy}
            onClick={() => void requestDeletion()}
          >
            {delBusy ? <Loader2 size={14} className="animate-spin" aria-hidden /> : null}
            {t('طلب حذف الحساب', 'Request account deletion')}
          </button>
        </div>
      </details>
    </div>
  );
}
