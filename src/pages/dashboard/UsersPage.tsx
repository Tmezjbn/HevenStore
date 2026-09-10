import { useState, useEffect, useRef, type CSSProperties } from 'react';
import { Link } from 'react-router-dom';
// PERF-2: defer owner/admin roster CSS off storefront main chunk (loads with UsersPage).
void import('../../styles/dashboard-owner-surfaces.css');
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../stores/authStore';
import { useI18n } from '../../lib/i18n';
import { useSiteSettings } from '../../hooks/useSiteSettings';
import { ROLE_INFO, roleLabel } from '../../lib/roles';
import { normalizeUsername } from '../../lib/username';
import {
  Search,
  CircleHelp,
  Check,
  X,
  ShieldAlert,
  Ban,
  Trash2,
  RotateCcw,
  Loader2,
  ChevronDown,
} from 'lucide-react';
import UserAvatar from '../../components/ui/UserAvatar';
import Modal from '../../components/ui/Modal';
import ConfirmDialog from '../../components/dashboard/ConfirmDialog';
import PageBar from '../../components/dashboard/PageBar';
import { DASHBOARD_PAGE_SIZE, pageRange } from '../../lib/dashboardPage';
import type { Profile, Role } from '../../types';
import { PROFILE_ADMIN_COLS } from '../../lib/dbCols';

type RolePending = {
  userId: string;
  from: Role;
  to: Role;
  label: string;
};

/** Role = categorical chip. Status uses outline+dot (see statusBadgeClass) — never same solid as Buyer. */
const ROLE_BADGE: Record<string, string> = {
  owner: 'badge-primary',
  admin: 'badge-error badge-outline',
  moderator: 'badge-warning badge-outline',
  support: 'badge-success badge-outline',
  seller: 'badge-info badge-outline',
  buyer: 'badge-accent badge-outline',
  member: 'badge-ghost badge-outline',
};

const CHIP =
  'badge badge-sm font-semibold tracking-wider leading-none';

function statusBadgeClass(u: { is_active: boolean; deletion_scheduled_at?: string | null }): {
  chip: string;
  dot: string;
} {
  if (u.deletion_scheduled_at) {
    return { chip: `${CHIP} badge-outline badge-error gap-1.5`, dot: 'bg-error' };
  }
  if (u.is_active) {
    return { chip: `${CHIP} badge-outline badge-success gap-1.5`, dot: 'bg-success' };
  }
  return { chip: `${CHIP} badge-outline badge-warning gap-1.5`, dot: 'bg-warning' };
}

const DISABLE_PRESETS: { hours: number; ar: string; en: string }[] = [
  { hours: 1, ar: 'ساعة', en: '1 hour' },
  { hours: 6, ar: '6 ساعات', en: '6 hours' },
  { hours: 24, ar: 'يوم', en: '1 day' },
  { hours: 72, ar: '3 أيام', en: '3 days' },
  { hours: 168, ar: 'أسبوع', en: '1 week' },
  { hours: 720, ar: '30 يوم', en: '30 days' },
];

type StatusFilter = 'all' | 'active' | 'disabled';

export default function UsersPage() {
  const { t, lang } = useI18n();
  const profile = useAuthStore((s) => s.profile);
  const { settings } = useSiteSettings();
  const graceDays = Math.max(1, Math.min(3650, Number.parseInt(settings.account_deletion_grace_days, 10) || 30));
  const locale = lang === 'ar' ? 'ar' : 'en';

  const [guideOpen, setGuideOpen] = useState(false);
  const [users, setUsers] = useState<Profile[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [roleFilter, setRoleFilter] = useState<Role | 'all'>('all');
  const [error, setError] = useState('');
  const [dangerOpen, setDangerOpen] = useState(false);
  const [dangerSearch, setDangerSearch] = useState('');
  const [dangerCandidates, setDangerCandidates] = useState<Profile[]>([]);
  const [dangerLoading, setDangerLoading] = useState(false);
  const [dangerTarget, setDangerTarget] = useState<Profile | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const pickerRef = useRef<HTMLDivElement>(null);
  const [disableHours, setDisableHours] = useState(24);
  const [customHours, setCustomHours] = useState('');
  const [busy, setBusy] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState('');
  const [rolePending, setRolePending] = useState<RolePending | null>(null);
  const [roleBusy, setRoleBusy] = useState(false);

  const isOwner = profile?.role === 'owner';
  const focusRing = 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50';
  const selected = dangerTarget;

  useEffect(() => {
    if (!pickerOpen) return;
    const onDoc = (e: MouseEvent) => {
      if (!pickerRef.current?.contains(e.target as Node)) setPickerOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setPickerOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, [pickerOpen]);

  useEffect(() => {
    if (!dangerOpen) setPickerOpen(false);
  }, [dangerOpen]);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      const { from, to } = pageRange(page);
      let q = supabase
        .from('profiles')
        .select('*', { count: 'exact' })
        .neq('full_name', 'deleted')
        .order('created_at', { ascending: false })
        .range(from, to);
      const term = search.trim();
      if (term) {
        const safe = term.replace(/[%_,]/g, '');
        if (safe) {
          q = q.or(`full_name.ilike.%${safe}%,email.ilike.%${safe}%`);
        }
      }
      if (statusFilter === 'active') q = q.eq('is_active', true);
      if (statusFilter === 'disabled') q = q.eq('is_active', false);
      if (roleFilter !== 'all') q = q.eq('role', roleFilter);

      const { data, count, error: err } = await q;
      if (cancelled) return;
      if (err) {
        setError(t('تعذر التحميل', 'Could not load'));
        setUsers([]);
        setTotal(0);
      } else {
        setError('');
        setUsers((data as Profile[]) || []);
        setTotal(count ?? 0);
      }
      setLoading(false);
    };
    const tmr = window.setTimeout(load, search.trim() ? 200 : 0);
    return () => {
      cancelled = true;
      window.clearTimeout(tmr);
    };
  }, [page, search, statusFilter, roleFilter, t]);

  const canDanger = (u: Profile | null) => {
    if (!u || !profile) return false;
    if (u.id === profile.id) return false;
    if (u.role === 'owner') return false;
    if (profile.role === 'admin' && u.role === 'admin') return false;
    return true;
  };

  useEffect(() => {
    if (!dangerOpen) return;
    let cancelled = false;
    const load = async () => {
      setDangerLoading(true);
      let q = supabase
        .from('profiles')
        .select(PROFILE_ADMIN_COLS)
        .neq('full_name', 'deleted')
        .order('created_at', { ascending: false })
        .limit(40);
      const term = dangerSearch.trim();
      if (term) {
        const safe = term.replace(/[%_,]/g, '');
        if (safe) {
          q = q.or(`full_name.ilike.%${safe}%,email.ilike.%${safe}%`);
        }
      }
      const { data } = await q;
      if (cancelled) return;
      setDangerCandidates(((data as unknown as Profile[]) || []).filter((u) => canDanger(u)));
      setDangerLoading(false);
    };
    const tmr = window.setTimeout(load, dangerSearch.trim() ? 200 : 0);
    return () => {
      cancelled = true;
      window.clearTimeout(tmr);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dangerOpen, dangerSearch, profile?.id, profile?.role]);

  const effectiveHours = (() => {
    const custom = Number.parseInt(customHours, 10);
    if (customHours.trim() && Number.isFinite(custom) && custom > 0) {
      return Math.min(8760, custom);
    }
    return disableHours;
  })();

  const patchUser = (userId: string, patch: Partial<Profile>) => {
    setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, ...patch } : u)));
    setDangerCandidates((prev) => prev.map((u) => (u.id === userId ? { ...u, ...patch } : u)));
    setDangerTarget((prev) => (prev?.id === userId ? { ...prev, ...patch } : prev));
  };

  const changeRole = async (userId: string, newRole: string) => {
    setError('');
    const { error: err } = await supabase.rpc('set_user_role', {
      target_user: userId,
      new_role: newRole,
    });
    if (err) {
      setError(
        err.message.includes('Only an owner')
          ? t('فقط المالك يمكنه تغيير الرتب', 'Only an owner can change roles')
          : t('تعذر تغيير الرتبة. شغّل آخر ترحيل SQL ثم أعد المحاولة.', 'Could not change the role. Run the latest SQL migration and try again.'),
      );
      return false;
    }
    patchUser(userId, { role: newRole as Profile['role'] });
    return true;
  };

  const confirmRoleChange = async () => {
    if (!rolePending || roleBusy) return;
    setRoleBusy(true);
    const ok = await changeRole(rolePending.userId, rolePending.to);
    setRoleBusy(false);
    if (ok) setRolePending(null);
  };

  const disableSelected = async (indefinite: boolean) => {
    if (!selected || !canDanger(selected)) return;
    setBusy(true);
    setError('');
    const { error: err } = await supabase.rpc('admin_disable_user', {
      p_user_id: selected.id,
      p_hours: indefinite ? null : effectiveHours,
    });
    setBusy(false);
    if (err) {
      setError(
        err.message.includes('migration') || err.message.includes('function')
          ? t('تعذر التعطيل. شغّل ترحيل SQL للإدارة ثم أعد المحاولة.', 'Could not disable. Apply the admin SQL migration and try again.')
          : t('تعذر تعطيل الحساب', 'Could not disable account'),
      );
      return;
    }
    const until = indefinite
      ? null
      : new Date(Date.now() + effectiveHours * 3600_000).toISOString();
    patchUser(selected.id, { is_active: false, disabled_until: until });
  };

  const enableSelected = async () => {
    if (!selected || !canDanger(selected)) return;
    setBusy(true);
    setError('');
    const { error: err } = await supabase.rpc('admin_enable_user', { p_user_id: selected.id });
    setBusy(false);
    if (err) {
      setError(
        err.message.includes('SCHEDULED')
          ? t('الحساب مجدول للحذف — استعده من طلبات الحذف', 'Account is scheduled for deletion — restore from Deletion requests')
          : t('تعذر تفعيل الحساب', 'Could not enable account'),
      );
      return;
    }
    patchUser(selected.id, { is_active: true, disabled_until: null });
  };

  const scheduleDelete = async () => {
    if (!selected || !canDanger(selected) || !isOwner) return;
    const handle = selected.username?.trim();
    if (!handle) {
      setError(t('لا يوجد اسم مستخدم لهذا الحساب', 'This account has no username'));
      return;
    }
    if (normalizeUsername(deleteConfirm.replace(/^@+/, '')) !== normalizeUsername(handle)) {
      setError(t('اكتب اسم المستخدم للتأكيد', 'Type the username to confirm'));
      return;
    }
    setBusy(true);
    setError('');
    const { error: err } = await supabase.rpc('admin_schedule_user_deletion', {
      p_user_id: selected.id,
    });
    setBusy(false);
    if (err) {
      setError(
        t('تعذر جدولة الحذف. شغّل ترحيل SQL ثم أعد المحاولة.', 'Could not schedule deletion. Apply the SQL migration and try again.'),
      );
      return;
    }
    const at = new Date(Date.now() + graceDays * 86400_000).toISOString();
    patchUser(selected.id, {
      is_active: false,
      disabled_until: null,
      deletion_scheduled_at: at,
    });
    setDeleteOpen(false);
    setDeleteConfirm('');
  };

  const statusLabel = (u: Profile) => {
    if (u.deletion_scheduled_at) return t('مجدول للحذف', 'Deletion scheduled');
    if (!u.is_active && u.disabled_until) {
      return t(
        `معطّل حتى ${new Date(u.disabled_until).toLocaleString(locale)}`,
        `Disabled until ${new Date(u.disabled_until).toLocaleString('en')}`,
      );
    }
    if (!u.is_active) return t('معطّل', 'Disabled');
    return t('نشط', 'Active');
  };

  const countLabel = total === 1 ? t('مستخدم', 'user') : t('مستخدمون', 'users');

  const statusChips = [
    { id: 'all' as const, ar: 'الكل', en: 'All' },
    { id: 'active' as const, ar: 'نشط', en: 'Active' },
    { id: 'disabled' as const, ar: 'معطّل', en: 'Disabled' },
  ];

  const ROLES = ['owner', 'admin', 'moderator', 'support', 'seller', 'buyer', 'member'] as const;

  const pickRole = (user: Profile, to: Role) => {
    if (to === user.role) return;
    setRolePending({
      userId: user.id,
      from: user.role,
      to,
      label: user.full_name?.trim() || user.email || user.id,
    });
  };

  const roleSelect = (user: Profile) => {
    // Literal BEM prefixes kept for check-owner-users / admin-roster pins.
    // Popover (not details+absolute): escapes dashboard main overflow-auto on deploy.
    const dd = isOwner ? 'owner-roster__role-dd' : 'admin-roster__role-dd';
    const wrap = isOwner
      ? `owner-roster__role-wrap--${user.role}`
      : `admin-roster__role-wrap--${user.role}`;
    const btn = isOwner ? 'owner-roster__role-btn' : 'admin-roster__role-btn';
    const chev = isOwner ? 'owner-roster__role-chev' : 'admin-roster__role-chev';
    const menu = isOwner ? 'owner-roster__role-menu' : 'admin-roster__role-menu';
    const swatch = isOwner ? 'owner-roster__role-swatch' : 'admin-roster__role-swatch';
    const menuId = `heven-role-menu-${user.id}`;
    const anchor = `--heven-role-${user.id}`;
    const closeMenu = () => {
      const el = document.getElementById(menuId);
      if (el && 'hidePopover' in el) {
        (el as HTMLElement & { hidePopover: () => void }).hidePopover();
      }
    };
    return (
      <div className={`dropdown dropdown-end ${dd} ${wrap}`}>
        <button
          type="button"
          className={btn}
          // Popover API — React 18 DOM types lag; lowercase attrs still land on the node.
          {...({ popovertarget: menuId } as object)}
          style={{ anchorName: anchor } as CSSProperties}
          aria-label={t('تغيير الرتبة', 'Change Role')}
          aria-haspopup="listbox"
          disabled={roleBusy}
        >
          <span>{roleLabel(user.role, lang)}</span>
          <ChevronDown size={14} className={chev} aria-hidden />
        </button>
        <ul
          id={menuId}
          {...({ popover: 'auto' } as object)}
          className={`dropdown menu dropdown-content ${menu} bg-base-200 rounded-box w-44 p-1 shadow-md border border-base-300`}
          style={{ positionAnchor: anchor } as CSSProperties}
          role="listbox"
          aria-label={t('الرتب', 'Roles')}
        >
          {ROLES.map((r) => {
            const on = r === user.role;
            return (
              <li key={r} role="option" aria-selected={on}>
                <button
                  type="button"
                  className={
                    isOwner
                      ? `owner-roster__role-opt owner-roster__role-opt--${r}${on ? ' is-on' : ''}`
                      : `admin-roster__role-opt admin-roster__role-opt--${r}${on ? ' is-on' : ''}`
                  }
                  disabled={roleBusy || on}
                  onClick={() => {
                    closeMenu();
                    pickRole(user, r);
                  }}
                >
                  <span className={swatch} aria-hidden />
                  {roleLabel(r, lang)}
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    );
  };

  const pageActive = users.filter((u) => u.is_active && !u.deletion_scheduled_at).length;
  const pageDisabled = users.filter((u) => !u.is_active || u.deletion_scheduled_at).length;

  return (
    <div
      className={
        isOwner
          ? 'owner-roster mx-auto w-full max-w-6xl text-start'
          : 'admin-roster mx-auto w-full max-w-6xl text-start'
      }
    >
      {isOwner ? (
        <header className="owner-roster__hero">
          <div className="min-w-0">
            <p className="owner-roster__kicker">{t('سجل الحسابات', 'Account roster')}</p>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="owner-roster__title text-balance">{t('المستخدمون', 'Users')}</h2>
              <button
                type="button"
                onClick={() => setGuideOpen(true)}
                className={`owner-roster__help ${focusRing}`}
                aria-label={t('دليل الرتب', 'Role guide')}
                title={t('ما معنى كل رتبة؟', 'What does each role mean?')}
              >
                <CircleHelp size={16} aria-hidden />
              </button>
            </div>
            <p className="owner-roster__lede text-pretty">
              {t(
                'ابحث، صفّ، وغيّر الرتب. التعطيل والحذف من المنطقة الحساسة بالأسفل.',
                'Search, filter, and change roles. Disable and delete live in the danger zone below.',
              )}
            </p>
          </div>
          <p className="owner-roster__count" aria-live="polite">
            <strong className="tabular-nums">{loading ? '—' : total}</strong>
            <span>{countLabel}</span>
          </p>
        </header>
      ) : (
        <header className="admin-roster__mast">
          <div className="min-w-0">
            <div className="admin-roster__mast-row">
              <span className="admin-roster__badge">{t('مشرف', 'Admin')}</span>
              <span className="admin-roster__mast-meta">{t('أرضية الحسابات', 'Account floor')}</span>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="admin-roster__title text-balance">{t('المستخدمون', 'Users')}</h2>
              <button
                type="button"
                onClick={() => setGuideOpen(true)}
                className={`admin-roster__help ${focusRing}`}
                aria-label={t('دليل الرتب', 'Role guide')}
                title={t('ما معنى كل رتبة؟', 'What does each role mean?')}
              >
                <CircleHelp size={16} aria-hidden />
              </button>
            </div>
            <p className="admin-roster__lede text-pretty">
              {t(
                'ابحث، صفّ، وغيّر الرتب. التعطيل والحذف من المنطقة الحساسة.',
                'Search, filter, and change roles. Disable and delete live in the danger zone.',
              )}
            </p>
          </div>
          <p className="admin-roster__count" aria-live="polite">
            <strong className="tabular-nums">{loading ? '—' : total}</strong>
            <span>{countLabel}</span>
          </p>
        </header>
      )}

      {!isOwner ? (
        <section className="admin-roster__meters" aria-label={t('ملخص الصفحة', 'Page summary')}>
          <article className="admin-roster__meter">
            <p className="admin-roster__meter-label">{t('إجمالي', 'Total')}</p>
            <p className="admin-roster__meter-value tabular-nums">{loading ? '—' : total}</p>
          </article>
          <article className="admin-roster__meter">
            <p className="admin-roster__meter-label">{t('نشط هنا', 'Active here')}</p>
            <p className="admin-roster__meter-value tabular-nums">{loading ? '—' : pageActive}</p>
          </article>
          <article className={`admin-roster__meter${pageDisabled > 0 ? ' is-warn' : ''}`}>
            <p className="admin-roster__meter-label">{t('معطّل هنا', 'Disabled here')}</p>
            <p className="admin-roster__meter-value tabular-nums">{loading ? '—' : pageDisabled}</p>
          </article>
        </section>
      ) : null}

      {error && (
        <div role="alert" className="alert alert-error text-sm py-2">
          <span>{error}</span>
          <button type="button" className="btn btn-ghost btn-xs" onClick={() => setError('')} aria-label={t('إغلاق', 'Dismiss')}>
            <X size={14} />
          </button>
        </div>
      )}

      <div className={isOwner ? 'owner-roster__toolbar' : 'admin-roster__toolbar'}>
        <label className={isOwner ? 'owner-roster__search' : 'admin-roster__search'}>
          <Search size={14} className="opacity-50 shrink-0" aria-hidden />
          <input
            type="search"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(0);
            }}
            placeholder={t('ابحث عن مستخدم...', 'Search users...')}
            aria-label={t('بحث المستخدمين', 'Search users')}
          />
          {search ? (
            <button
              type="button"
              onClick={() => {
                setSearch('');
                setPage(0);
              }}
              className={`${isOwner ? 'owner-roster__search-clear' : 'admin-roster__search-clear'} ${focusRing}`}
              aria-label={t('مسح', 'Clear')}
            >
              <X size={14} />
            </button>
          ) : null}
        </label>

        <div
          className={isOwner ? 'owner-roster__filters' : 'admin-roster__filters'}
          role="group"
          aria-label={t('تصفية', 'Filters')}
        >
          {statusChips.map((chip) => (
            <button
              key={chip.id}
              type="button"
              className={`${isOwner ? 'owner-roster__chip' : 'admin-roster__chip'} ${statusFilter === chip.id ? 'is-on' : ''} ${focusRing}`}
              aria-pressed={statusFilter === chip.id}
              onClick={() => {
                setStatusFilter(chip.id);
                setPage(0);
              }}
            >
              {t(chip.ar, chip.en)}
            </button>
          ))}
          <select
            className={isOwner ? 'owner-roster__role-filter' : 'admin-roster__role-filter'}
            value={roleFilter}
            onChange={(e) => {
              setRoleFilter(e.target.value as Role | 'all');
              setPage(0);
            }}
            aria-label={t('الرتبة', 'Role')}
          >
            <option value="all">{t('كل الرتب', 'All roles')}</option>
            {ROLE_INFO.map((r) => (
              <option key={r.id} value={r.id}>
                {lang === 'ar' ? r.labelAr : r.labelEn}
              </option>
            ))}
          </select>
        </div>
      </div>

      {loading ? (
        <div className={isOwner ? 'owner-roster__list' : 'admin-roster__list'} aria-busy="true">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className={
                isOwner
                  ? 'owner-roster__card owner-roster__card--skeleton'
                  : 'admin-roster__card admin-roster__card--skeleton'
              }
            />
          ))}
        </div>
      ) : users.length === 0 ? (
        <div className={isOwner ? 'owner-roster__empty' : 'admin-roster__empty'}>
          <p>
            {search.trim()
              ? t('لا نتائج لهذا البحث', 'No results for this search')
              : t('لا يوجد مستخدمون', 'No users yet')}
          </p>
        </div>
      ) : (
        <ul className={isOwner ? 'owner-roster__list' : 'admin-roster__list'} role="list">
          {users.map((user, i) => {
            const st = statusBadgeClass(user);
            const statusShort = user.deletion_scheduled_at
              ? t('حذف', 'Purge')
              : user.is_active
                ? t('نشط', 'Active')
                : t('معطّل', 'Disabled');
            const prefix = isOwner ? 'owner-roster' : 'admin-roster';
            return (
              <li
                key={user.id}
                className={`${prefix}__card-wrap`}
                style={{ [isOwner ? '--owner-i' : '--admin-i']: String(i) } as CSSProperties}
              >
                <article className={`${prefix}__card`}>
                  <div className={`${prefix}__who min-w-0`}>
                    <UserAvatar
                      name={user.full_name}
                      email={user.email}
                      avatarUrl={user.avatar_url}
                      sizeClass="w-11"
                      className={`${prefix}__avatar`}
                    />
                    <div className="min-w-0">
                      <p className={`${prefix}__name truncate`}>
                        {user.full_name || t('بلا اسم', 'No name')}
                      </p>
                      <p className={`${prefix}__email truncate font-mono`} dir="ltr">
                        {user.email}
                      </p>
                      {user.username ? (
                        <p className={`${prefix}__handle truncate`} dir="ltr">
                          @{user.username}
                        </p>
                      ) : null}
                    </div>
                  </div>
                  <div className={`${prefix}__meta`}>
                    <span className={`${prefix}__role ${prefix}__role--${user.role}`}>
                      {roleLabel(user.role, lang)}
                    </span>
                    <span className={`${prefix}__status`} title={statusLabel(user)}>
                      <span className={`${prefix}__dot ${st.dot}`} aria-hidden />
                      {statusShort}
                    </span>
                    <time className={`${prefix}__joined tabular-nums`} dateTime={user.created_at}>
                      {new Date(user.created_at).toLocaleDateString(locale)}
                    </time>
                  </div>
                  <div className={`${prefix}__change`}>{roleSelect(user)}</div>
                </article>
              </li>
            );
          })}
        </ul>
      )}

      <PageBar
        page={page}
        total={total}
        pageSize={DASHBOARD_PAGE_SIZE}
        onPage={setPage}
        t={t}
      />

      <details
        className={
          isOwner
            ? 'owner-roster__danger group'
            : 'admin-roster__danger group'
        }
        onToggle={(e) => setDangerOpen((e.currentTarget as HTMLDetailsElement).open)}
      >
        <summary
          id="users-danger-title"
          className={
            isOwner
              ? `owner-roster__danger-sum ${focusRing}`
              : `admin-roster__danger-sum ${focusRing}`
          }
        >
          <ShieldAlert size={18} className="shrink-0" aria-hidden />
          <span className={isOwner ? 'owner-roster__danger-title' : 'admin-roster__danger-title'}>
            {t('منطقة حساسة', 'Danger zone')}
          </span>
          <ChevronDown
            size={16}
            className="shrink-0 motion-safe:transition-transform group-open:rotate-180"
            aria-hidden
          />
        </summary>

        <div className="space-y-4 border-t border-error/20 px-4 py-4">
          <p className="text-sm text-base-content/65">
            {t(
              'اختر مستخدماً هنا لتعطيله أو حذفه نهائياً.',
              'Pick a user here to disable or permanently delete.',
            )}
          </p>

          <div className="form-control w-full max-w-xl">
            <span className="label-text text-xs text-base-content/55 mb-1">
              {t('المستخدم', 'User')}
            </span>
            <div ref={pickerRef} className="relative">
              <button
                type="button"
                className={`btn btn-sm w-full justify-between gap-2 border border-base-300 bg-base-100 font-normal h-auto min-h-10 py-1.5 ${focusRing}`}
                aria-haspopup="listbox"
                aria-expanded={pickerOpen}
                aria-label={t('اختر مستخدماً', 'Select user')}
                onClick={() => setPickerOpen((v) => !v)}
              >
                {selected ? (
                  <span className="flex items-center gap-2 min-w-0 flex-1">
                    <UserAvatar
                      name={selected.full_name}
                      email={selected.email}
                      avatarUrl={selected.avatar_url}
                      sizeClass="w-7"
                    />
                    <span className="min-w-0 text-start">
                      <span className="block text-sm font-semibold tracking-tight truncate">
                        {selected.full_name || t('بلا اسم', 'No name')}
                      </span>
                      <span className="block text-xs text-base-content/55 font-mono truncate" dir="ltr">
                        {selected.email}
                      </span>
                    </span>
                    <span className={`${CHIP} shrink-0 ${ROLE_BADGE[selected.role] || 'badge-ghost badge-outline'}`}>
                      {roleLabel(selected.role, lang)}
                    </span>
                  </span>
                ) : (
                  <span className="text-sm text-base-content/55">
                    {t('اختر مستخدماً…', 'Select a user…')}
                  </span>
                )}
                <ChevronDown
                  size={16}
                  className={`shrink-0 opacity-60 motion-safe:transition-transform ${pickerOpen ? 'rotate-180' : ''}`}
                  aria-hidden
                />
              </button>

              {pickerOpen ? (
                <div
                  className="absolute top-full start-0 end-0 z-40 mt-1 rounded-lg border border-base-300 bg-base-200 shadow-md overflow-hidden"
                  role="listbox"
                  aria-label={t('قائمة المستخدمين', 'User list')}
                >
                  <label className="flex items-center gap-2 px-2.5 py-2 border-b border-base-300">
                    <Search size={14} className="opacity-50 shrink-0" aria-hidden />
                    <input
                      type="search"
                      autoFocus
                      className="grow bg-transparent text-sm outline-none focus:outline-none"
                      value={dangerSearch}
                      onChange={(e) => setDangerSearch(e.target.value)}
                      placeholder={t('اسم أو بريد…', 'Name or email…')}
                      aria-label={t('بحث', 'Search')}
                    />
                  </label>
                  <ul className="max-h-56 overflow-y-auto overscroll-contain py-1">
                    {dangerLoading ? (
                      <li className="px-3 py-6 text-center">
                        <span className="loading loading-spinner loading-sm text-primary" />
                      </li>
                    ) : dangerCandidates.length === 0 ? (
                      <li className="px-3 py-4 text-sm text-base-content/55 text-center">
                        {t('لا نتائج', 'No results')}
                      </li>
                    ) : (
                      dangerCandidates.map((u) => {
                        const active = selected?.id === u.id;
                        return (
                          <li key={u.id}>
                            <button
                              type="button"
                              role="option"
                              aria-selected={active}
                              className={`flex w-full items-center gap-2.5 px-2.5 py-2 text-start motion-safe:transition-colors ${
                                active ? 'bg-primary/15' : 'hover:bg-base-300/50'
                              }`}
                              onClick={() => {
                                setDangerTarget(u);
                                setPickerOpen(false);
                              }}
                            >
                              <UserAvatar
                                name={u.full_name}
                                email={u.email}
                                avatarUrl={u.avatar_url}
                                sizeClass="w-8"
                              />
                              <span className="min-w-0 flex-1">
                                <span className="block text-sm font-semibold tracking-tight truncate">
                                  {u.full_name || t('بلا اسم', 'No name')}
                                </span>
                                <span className="block text-xs text-base-content/55 font-mono truncate" dir="ltr">
                                  {u.email}
                                </span>
                              </span>
                              <span className={`${CHIP} shrink-0 ${ROLE_BADGE[u.role] || 'badge-ghost badge-outline'}`}>
                                {roleLabel(u.role, lang)}
                              </span>
                            </button>
                          </li>
                        );
                      })
                    )}
                  </ul>
                </div>
              ) : null}
            </div>
          </div>

          {!selected ? (
            <p className="text-sm text-base-content/55">{t('اختر مستخدماً للمتابعة', 'Select a user to continue')}</p>
          ) : selected.deletion_scheduled_at ? (
            <p className="text-sm text-base-content/70">
              {t('مجدول للحذف.', 'Scheduled for deletion.')}{' '}
              {isOwner ? (
                <Link to="/dashboard/deletion-requests" className="link link-primary font-medium">
                  {t('استعادة من طلبات الحذف', 'Restore from Deletion requests')}
                </Link>
              ) : null}
            </p>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-3 rounded-lg border border-base-300 bg-base-100/40 p-3">
                <div className="flex items-center gap-2 min-w-0">
                  <UserAvatar
                    name={selected.full_name}
                    email={selected.email}
                    avatarUrl={selected.avatar_url}
                    sizeClass="w-8"
                  />
                  <div className="min-w-0">
                    <p className="text-sm font-semibold tracking-tight truncate">
                      {selected.full_name || t('بلا اسم', 'No name')}
                    </p>
                    <p className="text-xs text-base-content/55 truncate">{statusLabel(selected)}</p>
                  </div>
                </div>
                <label className="form-control w-full">
                  <span className="label-text text-xs text-base-content/55 mb-1">
                    {t('ملاحظات الفريق', 'Staff notes')}
                  </span>
                  <textarea
                    className="textarea textarea-bordered textarea-sm min-h-16"
                    defaultValue={selected.staff_notes ?? ''}
                    key={`notes-${selected.id}-${selected.staff_notes ?? ''}`}
                    onBlur={(e) => {
                      const next = e.target.value;
                      if ((selected.staff_notes ?? '') === next) return;
                      void supabase
                        .rpc('set_staff_notes', { p_user_id: selected.id, p_notes: next })
                        .then(({ error: err }) => {
                          if (!err) patchUser(selected.id, { staff_notes: next || null });
                        });
                    }}
                    placeholder={t('ملاحظات داخلية للمشرفين…', 'Internal notes for moderators…')}
                  />
                </label>
                {selected.role === 'support' ? (
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <span className="badge badge-ghost badge-sm">
                      {t('تقييم الدعم', 'Support standing')}: {selected.support_standing ?? 100}
                    </span>
                    <button
                      type="button"
                      className="btn btn-ghost btn-xs border border-base-300"
                      disabled={busy}
                      onClick={() => {
                        void supabase.rpc('reset_support_standing', { p_agent_id: selected.id }).then(({ error: err }) => {
                          if (!err) patchUser(selected.id, { support_standing: 100 });
                        });
                      }}
                    >
                      {t('إعادة ضبط التقييم', 'Reset standing')}
                    </button>
                  </div>
                ) : null}
                <p className="text-sm font-semibold tracking-tight flex items-center gap-1.5">
                  <Ban size={14} aria-hidden />
                  {t('تعطيل مؤقت', 'Disable temporarily')}
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {DISABLE_PRESETS.map((p) => (
                    <button
                      key={p.hours}
                      type="button"
                      className={`btn btn-xs ${disableHours === p.hours && !customHours.trim() ? 'btn-warning' : 'btn-ghost border border-base-300'}`}
                      onClick={() => {
                        setDisableHours(p.hours);
                        setCustomHours('');
                      }}
                    >
                      {t(p.ar, p.en)}
                    </button>
                  ))}
                </div>
                <label className="form-control w-full max-w-[10rem]">
                  <span className="label-text text-xs text-base-content/55 mb-1">
                    {t('ساعات مخصصة', 'Custom hours')}
                  </span>
                  <input
                    type="number"
                    min={1}
                    max={8760}
                    inputMode="numeric"
                    className="input input-bordered input-sm"
                    value={customHours}
                    onChange={(e) => setCustomHours(e.target.value)}
                    placeholder={String(disableHours)}
                    dir="ltr"
                  />
                </label>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    className="btn btn-warning btn-sm gap-1"
                    disabled={busy}
                    onClick={() => void disableSelected(false)}
                  >
                    {busy ? <Loader2 size={14} className="animate-spin" /> : <Ban size={14} />}
                    {t(`تعطيل ${effectiveHours}س`, `Disable ${effectiveHours}h`)}
                  </button>
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm border border-warning/40"
                    disabled={busy}
                    onClick={() => void disableSelected(true)}
                  >
                    {t('تعطيل بلا نهاية', 'Disable indefinitely')}
                  </button>
                  {!selected.is_active ? (
                    <button
                      type="button"
                      className="btn btn-primary btn-sm gap-1"
                      disabled={busy}
                      onClick={() => void enableSelected()}
                    >
                      {busy ? <Loader2 size={14} className="animate-spin" /> : <RotateCcw size={14} />}
                      {t('إعادة التفعيل', 'Re-enable')}
                    </button>
                  ) : null}
                </div>
              </div>

              <div className="space-y-3 rounded-lg border border-error/40 bg-error/5 p-3">
                <p className="text-sm font-semibold tracking-tight text-error flex items-center gap-1.5">
                  <Trash2 size={14} aria-hidden />
                  {t('حذف نهائي', 'Delete permanently')}
                </p>
                <p className="text-xs text-base-content/65 leading-relaxed">
                  {t(
                    `يعطّل الحساب فوراً ويجدوله للحذف النهائي بعد ${graceDays} يوماً (من الإعدادات).`,
                    `Disables the account now and schedules final purge in ${graceDays} days (from Settings).`,
                  )}
                </p>
                {isOwner ? (
                  <button
                    type="button"
                    className="btn btn-error btn-sm gap-1"
                    disabled={busy}
                    onClick={() => {
                      setDeleteConfirm('');
                      setDeleteOpen(true);
                    }}
                  >
                    <Trash2 size={14} />
                    {t('حذف نهائي…', 'Delete permanently…')}
                  </button>
                ) : (
                  <p className="text-xs text-base-content/55">
                    {t('الحذف النهائي للمالك فقط', 'Permanent delete is owner-only')}
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      </details>

      <Modal
        open={deleteOpen}
        onClose={() => {
          if (!busy) {
            setDeleteOpen(false);
            setDeleteConfirm('');
          }
        }}
        labelledBy="users-delete-title"
        boxClassName="max-w-md text-start"
        closeLabel={t('إغلاق', 'Close')}
      >
        <h3 id="users-delete-title" className="font-semibold text-lg tracking-tight text-error mb-2">
          {t('تأكيد الحذف النهائي', 'Confirm permanent deletion')}
        </h3>
        <p className="text-sm text-base-content/70 mb-4 leading-relaxed">
          {t(
            `سيتم تعطيل الحساب وجدولة الحذف بعد ${graceDays} يوماً. اكتب اسم المستخدم للتأكيد:`,
            `The account will be disabled and scheduled for purge in ${graceDays} days. Type the username to confirm:`,
          )}
        </p>
        <p className="text-sm font-semibold mb-2 font-mono" dir="ltr">
          {selected?.username ? `@${selected.username}` : '—'}
        </p>
        <input
          className="input input-bordered input-sm w-full mb-4 focus:outline-none focus:ring-0 focus:border-base-content/40 focus:shadow-none"
          value={deleteConfirm}
          onChange={(e) => setDeleteConfirm(e.target.value)}
          placeholder={t('اكتب اسم المستخدم هنا', 'Type the username here')}
          autoComplete="off"
          dir="ltr"
          spellCheck={false}
        />
        <div className="flex justify-end gap-2">
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            disabled={busy}
            onClick={() => {
              setDeleteOpen(false);
              setDeleteConfirm('');
            }}
          >
            {t('إلغاء', 'Cancel')}
          </button>
          <button
            type="button"
            className="btn btn-error btn-sm gap-1"
            disabled={busy || !deleteConfirm.trim()}
            onClick={() => void scheduleDelete()}
          >
            {busy ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
            {t('تأكيد الحذف', 'Confirm delete')}
          </button>
        </div>
      </Modal>

      <ConfirmDialog
        open={!!rolePending}
        onClose={() => !roleBusy && setRolePending(null)}
        onConfirm={confirmRoleChange}
        busy={roleBusy}
        danger={rolePending?.to === 'owner' || rolePending?.from === 'owner'}
        title={t('تأكيد تغيير الرتبة؟', 'Confirm role change?')}
        body={
          rolePending
            ? t(
                `تغيير رتبة «${rolePending.label}» من ${roleLabel(rolePending.from, lang)} إلى ${roleLabel(rolePending.to, lang)}؟`,
                `Change “${rolePending.label}” from ${roleLabel(rolePending.from, lang)} to ${roleLabel(rolePending.to, lang)}?`,
              )
            : undefined
        }
        confirmLabel={t('تأكيد', 'Confirm')}
        cancelLabel={t('إلغاء', 'Cancel')}
      />

      <Modal
        open={guideOpen}
        onClose={() => setGuideOpen(false)}
        labelledBy="role-guide-title"
        boxClassName="max-w-2xl text-start"
        closeLabel={t('إغلاق', 'Close')}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 id="role-guide-title" className="font-semibold text-lg tracking-tight">
            {t('دليل الرتب', 'Role Guide')}
          </h3>
          <button
            type="button"
            onClick={() => setGuideOpen(false)}
            className={`btn btn-ghost btn-sm btn-circle ${focusRing}`}
            aria-label={t('إغلاق', 'Close')}
          >
            <X size={16} />
          </button>
        </div>
        <div className="space-y-5 max-h-[65vh] overflow-y-auto pe-1">
          {ROLE_INFO.map((r) => (
            <div key={r.id} className="border border-base-300 rounded-lg p-4 bg-base-200/50">
              <div className="flex items-center gap-2 mb-1.5">
                <span className={`${CHIP} ${ROLE_BADGE[r.id] || 'badge-ghost badge-outline'}`}>
                  {lang === 'ar' ? r.labelAr : r.labelEn}
                </span>
                <span className="text-xs text-base-content/55 font-mono" dir="ltr">{r.id}</span>
              </div>
              <p className="text-sm text-base-content/75 mb-2 leading-relaxed">
                {lang === 'ar' ? r.descAr : r.descEn}
              </p>
              <ul className="space-y-1 text-sm">
                {(lang === 'ar' ? r.canAr : r.canEn).map((item) => (
                  <li key={item} className="flex items-start gap-2">
                    <Check size={14} className="text-success mt-0.5 shrink-0" />
                    <span>{item}</span>
                  </li>
                ))}
                {(lang === 'ar' ? r.cannotAr : r.cannotEn).map((item) => (
                  <li key={item} className="flex items-start gap-2 text-base-content/75">
                    <X size={14} className="text-error mt-0.5 shrink-0" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </Modal>
    </div>
  );
}
