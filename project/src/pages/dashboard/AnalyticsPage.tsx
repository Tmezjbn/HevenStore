import { useCallback, useEffect, useId, useState, type ComponentType, type ReactNode, type SVGProps } from 'react';
import { Link } from 'react-router-dom';
// PERF-2: defer analytics CSS off storefront main chunk (loads with AnalyticsPage).
void import('../../styles/analytics-page.css');
import {
  Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import {
  Activity, Eye, Gauge, Globe, LayoutDashboard, MapPin, Monitor, Radio,
  RefreshCw, ShoppingBag, Users, Wallet,
} from 'lucide-react';
import { useI18n } from '../../lib/i18n';
import { supabase } from '../../lib/supabase';
import StatsResetControl from '../../components/dashboard/StatsResetControl';
import { dashboardStatsSinceIso, parseDashboardStatsResetAt } from '../../lib/siteSettings';

type IconComp = ComponentType<SVGProps<SVGSVGElement> & { size?: number | string }>;

type Preset = 'today' | 'last_7d' | 'last_30d' | 'last_90d';
type Tab = 'overview' | 'live' | 'health' | 'events';
type NamedStat = { name: string; views: number; pct?: number };
type DayPoint = { date: string; label: string; visitors: number; pageviews: number };

type VitalRow = { metric: string; p75: number; p95: number; samples: number };
type ErrorRow = { message: string; path: string; type: string; when: string };
type LiveSession = { id: string; page: string; country: string; device: string; pages: number; lastSeen: string };
type LiveEvent = { name: string; path: string; country: string; browser: string; when: string };
type CustomEvent = { name: string; count: number };

type TrafficOk = {
  status: 'ok';
  summary: {
    pageviews: number;
    visitors: number;
    sessions: number;
    bounce_rate: number;
    duration_s: number;
  };
  series: DayPoint[];
  pages: NamedStat[];
  referrers: NamedStat[];
  devices: NamedStat[];
  platforms: NamedStat[];
  countries: NamedStat[];
  vitals: VitalRow[];
  errorSummary: Record<string, number>;
  recentErrors: ErrorRow[];
  liveSessions: LiveSession[];
  livePages: NamedStat[];
  liveFeed: LiveEvent[];
  customEvents: CustomEvent[];
};

type TrafficState =
  | { status: 'loading' }
  | TrafficOk
  | { status: 'need_setup' }
  | { status: 'error'; message: string };

const PRESETS: { id: Preset; ar: string; en: string }[] = [
  { id: 'today', ar: 'اليوم', en: 'Today' },
  { id: 'last_7d', ar: '7 أيام', en: '7d' },
  { id: 'last_30d', ar: '30 يوم', en: '30d' },
  { id: 'last_90d', ar: '90 يوم', en: '90d' },
];

const TABS: { id: Tab; ar: string; en: string; icon: IconComp }[] = [
  { id: 'overview', ar: 'نظرة عامة', en: 'Overview', icon: LayoutDashboard },
  { id: 'live', ar: 'مباشر', en: 'Live', icon: Radio },
  { id: 'health', ar: 'سرعة الموقع', en: 'Site speed', icon: Gauge },
  { id: 'events', ar: 'أحداث المتجر', en: 'Store events', icon: ShoppingBag },
];

const LOW_SAMPLE_VISITORS = 10;

const focusRing =
  'outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary';

function rangeStart(preset: Preset): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  if (preset === 'today') return d;
  if (preset === 'last_7d') {
    d.setDate(d.getDate() - 6);
    return d;
  }
  if (preset === 'last_30d') {
    d.setDate(d.getDate() - 29);
    return d;
  }
  d.setDate(d.getDate() - 89);
  return d;
}

function presetLabel(preset: Preset, lang: 'ar' | 'en'): string {
  const hit = PRESETS.find((p) => p.id === preset);
  return lang === 'ar' ? (hit?.ar ?? preset) : (hit?.en ?? preset);
}

function pickNum(obj: Record<string, unknown> | undefined, keys: string[]): number {
  if (!obj) return 0;
  for (const k of keys) {
    const v = obj[k];
    if (typeof v === 'number' && Number.isFinite(v)) return v;
    if (typeof v === 'string' && v.trim() && !Number.isNaN(Number(v))) return Number(v);
  }
  return 0;
}

function pickStr(obj: Record<string, unknown> | undefined, keys: string[], fallback = ''): string {
  if (!obj) return fallback;
  for (const k of keys) {
    const v = obj[k];
    if (typeof v === 'string' && v.trim()) return v;
  }
  return fallback;
}

function unwrapRows(payload: unknown, param: string): Record<string, unknown>[] {
  if (!payload || typeof payload !== 'object') return [];
  const root = payload as Record<string, unknown>;

  const bags = [root.results, root.data, root.queries, root.queryResults];
  for (const results of bags) {
    if (Array.isArray(results)) {
      const hit = results.find((r) => {
        if (!r || typeof r !== 'object') return false;
        const row = r as Record<string, unknown>;
        return (
          row.parameter === param ||
          row.query === param ||
          row.type === param ||
          row.name === param ||
          row.id === param
        );
      }) as Record<string, unknown> | undefined;
      if (hit) {
        const d = hit.data ?? hit.result ?? hit.rows ?? hit.values;
        if (Array.isArray(d)) return d as Record<string, unknown>[];
        if (d && typeof d === 'object') return [d as Record<string, unknown>];
      }
    } else if (results && typeof results === 'object') {
      const keyed = (results as Record<string, unknown>)[param];
      if (Array.isArray(keyed)) return keyed as Record<string, unknown>[];
      if (keyed && typeof keyed === 'object') {
        const inner = keyed as Record<string, unknown>;
        const d = inner.data ?? inner.result ?? keyed;
        if (Array.isArray(d)) return d as Record<string, unknown>[];
        if (d && typeof d === 'object') return [d as Record<string, unknown>];
      }
    }
  }

  const direct = root[param];
  if (Array.isArray(direct)) return direct as Record<string, unknown>[];
  if (direct && typeof direct === 'object') return [direct as Record<string, unknown>];
  return [];
}

function namedList(rows: Record<string, unknown>[], nameKeys: string[]): NamedStat[] {
  return rows
    .map((r) => ({
      name: pickStr(r, nameKeys, '/'),
      views: pickNum(r, ['pageviews', 'visitors', 'views', 'count', 'sessions']),
      pct: pickNum(r, ['percentage']),
    }))
    .filter((p) => p.views > 0)
    .slice(0, 8);
}

/** ISO-3166 alpha-2 → localized name; leave non-codes as-is. */
function countryLabel(raw: string, lang: 'ar' | 'en'): string {
  const code = raw.trim().toUpperCase();
  if (!/^[A-Z]{2}$/.test(code)) return raw.trim() || raw;
  try {
    return new Intl.DisplayNames([lang === 'ar' ? 'ar' : 'en'], { type: 'region' }).of(code) ?? raw;
  } catch {
    return raw;
  }
}

type DeviceBucket = 'desktop' | 'mobile' | 'tablet' | 'other';

function deviceBucket(name: string): DeviceBucket {
  const s = name.toLowerCase();
  if (/mobile|phone|هاتف|جوال/.test(s)) return 'mobile';
  if (/tablet|ipad|لوحي/.test(s)) return 'tablet';
  if (/desktop|pc|laptop|سطح|مكتب/.test(s)) return 'desktop';
  return 'other';
}

function osBucket(name: string): DeviceBucket {
  const s = name.toLowerCase();
  if (/ipad/.test(s)) return 'tablet';
  if (/android|ios|iphone|ipod/.test(s)) return 'mobile';
  if (/windows|mac|linux|chrome|ubuntu|debian|fedora|unix|freebsd|cros|darwin/.test(s)) {
    return 'desktop';
  }
  return 'other';
}

function prettyOs(name: string): string {
  const s = name.trim();
  const lower = s.toLowerCase();
  if (lower === 'mac' || lower === 'macos' || lower === 'mac os' || lower === 'mac os x') return 'macOS';
  if (lower === 'ios') return 'iOS';
  if (lower === 'ipados') return 'iPadOS';
  if (lower.startsWith('windows')) return s.replace(/^windows/i, 'Windows');
  if (lower === 'linux') return 'Linux';
  if (lower === 'android') return 'Android';
  if (!s) return s;
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function formatDay(raw: string, lang: 'ar' | 'en'): string {
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return raw.slice(5, 10) || raw;
  return d.toLocaleDateString(lang === 'ar' ? 'ar' : 'en', { month: 'short', day: 'numeric' });
}

function formatDuration(sec: number): string {
  if (!sec) return '—';
  if (sec < 60) return `${Math.round(sec)}s`;
  return `${Math.floor(sec / 60)}m ${Math.round(sec % 60)}s`;
}

function formatWhen(raw: string, lang: 'ar' | 'en'): string {
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return raw;
  return d.toLocaleString(lang === 'ar' ? 'ar' : 'en', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function bounceDisplay(
  rate: number,
  visitors: number,
  t: (ar: string, en: string) => string,
): { value: string; hint?: string } {
  if (visitors < LOW_SAMPLE_VISITORS) {
    return {
      value: t('عيّنة قليلة', 'Low sample'),
      hint: t('يحتاج المزيد من الزيارات', 'Needs more visits to be reliable'),
    };
  }
  if (!rate) return { value: '—' };
  return { value: `${(rate <= 1 ? rate * 100 : rate).toFixed(0)}%` };
}

function vitalTone(metric: string, p75: number): string {
  const m = metric.toUpperCase();
  if (m.includes('LCP')) return p75 <= 2500 ? 'text-success' : p75 <= 4000 ? 'text-warning' : 'text-error';
  if (m.includes('CLS')) return p75 <= 0.1 ? 'text-success' : p75 <= 0.25 ? 'text-warning' : 'text-error';
  if (m.includes('INP') || m.includes('FID')) return p75 <= 200 ? 'text-success' : p75 <= 500 ? 'text-warning' : 'text-error';
  if (m.includes('TTFB')) return p75 <= 800 ? 'text-success' : p75 <= 1800 ? 'text-warning' : 'text-error';
  return 'text-base-content';
}

function vitalStatusLabel(
  metric: string,
  p75: number,
  t: (ar: string, en: string) => string,
): string {
  const m = metric.toUpperCase();
  let good = false;
  let ok = false;
  if (m.includes('LCP')) {
    good = p75 <= 2500;
    ok = p75 <= 4000;
  } else if (m.includes('CLS')) {
    good = p75 <= 0.1;
    ok = p75 <= 0.25;
  } else if (m.includes('INP') || m.includes('FID')) {
    good = p75 <= 200;
    ok = p75 <= 500;
  } else if (m.includes('TTFB')) {
    good = p75 <= 800;
    ok = p75 <= 1800;
  } else {
    return '';
  }
  if (good) return t('جيد', 'Good');
  if (ok) return t('يحتاج تحسين', 'Needs work');
  return t('ضعيف', 'Poor');
}

function formatVital(metric: string, value: number): string {
  if (!value && value !== 0) return '—';
  if (metric.toUpperCase().includes('CLS')) return value.toFixed(3);
  if (value >= 1000) return `${(value / 1000).toFixed(2)}s`;
  return `${Math.round(value)}ms`;
}

function parseTraffic(payload: unknown, lang: 'ar' | 'en'): TrafficOk {
  const summaryObj = unwrapRows(payload, 'summary_metrics')[0] ?? {};
  const errSum = unwrapRows(payload, 'error_summary')[0] ?? {};

  return {
    status: 'ok',
    summary: {
      pageviews: pickNum(summaryObj, ['pageviews']),
      visitors: pickNum(summaryObj, ['unique_visitors', 'visitors']),
      sessions: pickNum(summaryObj, ['sessions']),
      bounce_rate: pickNum(summaryObj, ['bounce_rate']),
      duration_s: pickNum(summaryObj, ['median_session_duration']),
    },
    series: unwrapRows(payload, 'events_by_date')
      .map((r) => {
        const date = pickStr(r, ['date', 'day']);
        return {
          date,
          label: formatDay(date, lang),
          visitors: pickNum(r, ['visitors', 'unique_visitors']),
          pageviews: pickNum(r, ['pageviews']),
        };
      })
      .filter((d) => d.date),
    pages: namedList(unwrapRows(payload, 'top_pages'), ['name', 'path', 'page']),
    referrers: namedList(unwrapRows(payload, 'top_referrers'), ['name', 'referrer', 'source']),
    devices: namedList(unwrapRows(payload, 'device_types'), ['name', 'device_type']),
    platforms: namedList(unwrapRows(payload, 'os_name'), ['name', 'os_name', 'os', 'operating_system']).map((r) => ({
      ...r,
      name: prettyOs(r.name),
    })),
    countries: namedList(unwrapRows(payload, 'country'), ['name', 'country', 'country_code']).map((r) => ({
      ...r,
      name: countryLabel(r.name, lang),
    })),
    vitals: unwrapRows(payload, 'vitals_overview').map((r) => ({
      metric: pickStr(r, ['metric_name', 'metric', 'name'], '—'),
      p75: pickNum(r, ['p75']),
      p95: pickNum(r, ['p95']),
      samples: pickNum(r, ['samples']),
    })),
    errorSummary: {
      total: pickNum(errSum, ['total_errors', 'errors', 'count', 'total']),
      users: pickNum(errSum, ['affected_users', 'users', 'unique_users']),
      rate: pickNum(errSum, ['error_rate', 'rate']),
    },
    recentErrors: unwrapRows(payload, 'recent_errors').slice(0, 8).map((r) => ({
      message: pickStr(r, ['message', 'error_message', 'name'], 'Error'),
      path: pickStr(r, ['path', 'page', 'url'], '—'),
      type: pickStr(r, ['error_type', 'type'], 'Error'),
      when: pickStr(r, ['timestamp', 'created_at', 'last_seen', 'time']),
    })),
    liveSessions: unwrapRows(payload, 'realtime_sessions').slice(0, 12).map((r) => ({
      id: pickStr(r, ['session_id', 'id'], '—'),
      page: pickStr(r, ['current_page', 'path', 'page'], '/'),
      country: countryLabel(pickStr(r, ['country', 'country_code'], '—'), lang),
      device: pickStr(r, ['device_type', 'device'], '—'),
      pages: pickNum(r, ['pages_viewed', 'pageviews']),
      lastSeen: pickStr(r, ['last_seen', 'timestamp']),
    })),
    livePages: namedList(unwrapRows(payload, 'realtime_pages'), ['path', 'name', 'page']),
    liveFeed: unwrapRows(payload, 'realtime_feed').slice(0, 16).map((r) => ({
      name: pickStr(r, ['event_name', 'name'], 'event'),
      path: pickStr(r, ['path', 'page'], '/'),
      country: countryLabel(pickStr(r, ['country', 'country_code'], '—'), lang),
      browser: pickStr(r, ['browser_name', 'browser'], '—'),
      when: pickStr(r, ['timestamp', 'time']),
    })),
    customEvents: unwrapRows(payload, 'custom_events')
      .map((r) => ({
        name: pickStr(r, ['name', 'event_name', 'event'], 'event'),
        count: pickNum(r, ['count', 'pageviews', 'occurrences', 'total']),
      }))
      .filter((e) => e.count > 0)
      .slice(0, 12),
  };
}

function Panel({
  title,
  headingId,
  children,
  action,
  icon: Icon,
  emphasis,
  tone = 'default',
}: {
  title: string;
  headingId?: string;
  children: ReactNode;
  action?: ReactNode;
  icon?: IconComp;
  emphasis?: boolean;
  /** Category color for overview breakdown panels. */
  tone?: 'default' | 'pages' | 'refs' | 'devices' | 'countries';
}) {
  return (
    <section
      className={`analytics-panel analytics-panel--${tone} rounded-xl border overflow-hidden ${
        emphasis
          ? 'analytics-panel--emphasis border-primary/35 bg-base-200/90'
          : 'border-base-300 bg-base-200/80'
      }`}
      aria-labelledby={headingId}
      data-tone={tone}
    >
      <div className="analytics-panel__head flex items-center justify-between gap-3 px-4 sm:px-5 py-3.5 border-b border-base-300/70">
        <h2 id={headingId} className="text-sm font-semibold text-balance flex items-center gap-2 min-w-0">
          {Icon ? (
            <span className="analytics-panel__icon rounded-lg p-1.5 shrink-0" aria-hidden>
              <Icon size={14} />
            </span>
          ) : null}
          <span className="truncate">{title}</span>
        </h2>
        {action}
      </div>
      <div className="analytics-panel__body p-4 sm:p-5">{children}</div>
    </section>
  );
}

function EmptyTeach({
  title,
  body,
  action,
}: {
  title: string;
  body: string;
  action?: ReactNode;
}) {
  return (
    <div className="py-8 px-2 text-center space-y-2 max-w-md mx-auto">
      <p className="text-sm font-medium text-base-content/85">{title}</p>
      <p className="text-sm text-base-content/65 text-pretty">{body}</p>
      {action ? <div className="pt-2">{action}</div> : null}
    </div>
  );
}

function pagePathLabel(
  raw: string,
  t: (ar: string, en: string) => string,
): { path: string; label: string | null } {
  const path = raw.trim() || '/';
  if (path === '/' || path === '') return { path: '/', label: t('الرئيسية', 'Home') };
  if (path.startsWith('/product/')) {
    const slug = path.slice('/product/'.length).split(/[/?#]/)[0] || '';
    return { path, label: slug ? t(`منتج · ${slug}`, `Product · ${slug}`) : t('منتج', 'Product') };
  }
  if (path.startsWith('/auth/login')) return { path, label: t('تسجيل الدخول', 'Sign in') };
  if (path.startsWith('/auth/')) return { path, label: t('حساب', 'Account') };
  if (path.startsWith('/checkout/success')) return { path, label: t('نجاح الدفع', 'Checkout success') };
  if (path.startsWith('/checkout') || path.startsWith('/cart')) return { path, label: t('الدفع / السلة', 'Checkout / cart') };
  if (path.startsWith('/dashboard')) return { path, label: t('لوحة التحكم', 'Dashboard') };
  if (path.startsWith('/store')) return { path, label: t('المتجر', 'Store') };
  return { path, label: null };
}

function referrerLabel(
  raw: string,
  t: (ar: string, en: string) => string,
): { title: string; sub: string | null } {
  const name = raw.trim();
  const low = name.toLowerCase();
  if (!name || low === '(direct)' || low === 'direct' || low === 'none') {
    return { title: t('مباشر', 'Direct'), sub: null };
  }
  if (/polar\.sh|polar\.com/.test(low)) return { title: 'Polar', sub: name };
  if (/google\.|googleapis|gstatic/.test(low)) return { title: 'Google', sub: name };
  if (/bing\.|microsoft\.com/.test(low)) return { title: 'Bing', sub: name };
  if (/youtube\.|youtu\.be/.test(low)) return { title: 'YouTube', sub: name };
  if (/twitter\.|x\.com|t\.co/.test(low)) return { title: 'X', sub: name };
  if (/facebook\.|fb\.|instagram\./.test(low)) return { title: 'Meta', sub: name };
  if (/telegram\.|t\.me/.test(low)) return { title: 'Telegram', sub: name };
  if (/discord\./.test(low)) return { title: 'Discord', sub: name };
  return { title: name, sub: null };
}

function StatList({
  rows,
  empty,
  kind = 'default',
}: {
  rows: NamedStat[];
  empty: ReactNode;
  /** Enrich path / referrer rows. */
  kind?: 'default' | 'pages' | 'referrers';
}) {
  const { t } = useI18n();
  if (rows.length === 0) {
    return typeof empty === 'string' ? (
      <p className="text-sm text-base-content/65 py-4 text-center">{empty}</p>
    ) : (
      <>{empty}</>
    );
  }
  const max = Math.max(...rows.map((r) => r.views), 1);
  return (
    <ul className="analytics-stat-list">
      {rows.map((r, i) => {
        const share = (r.views / max) * 100;
        let primary = r.name;
        let secondary: string | null = null;
        if (kind === 'pages') {
          const labeled = pagePathLabel(r.name, t);
          primary = labeled.label ?? labeled.path;
          secondary = labeled.label ? labeled.path : null;
        } else if (kind === 'referrers') {
          const labeled = referrerLabel(r.name, t);
          primary = labeled.title;
          secondary = labeled.sub;
        }
        return (
          <li
            key={`${r.name}-${i}`}
            className={`analytics-stat${i === 0 ? ' is-lead' : ''}`}
            style={{ ['--i' as string]: i, ['--share' as string]: `${share}%` }}
          >
            <span className="analytics-stat__rank tabular-nums" aria-hidden>
              {i + 1}
            </span>
            <div className="analytics-stat__body">
              <div className="analytics-stat__head">
                <div className="analytics-stat__titles min-w-0">
                  <span
                    className="analytics-stat__name"
                    dir={/^\/|[.]/.test(primary) ? 'ltr' : undefined}
                    title={r.name}
                  >
                    {primary}
                  </span>
                  {secondary ? (
                    <span className="analytics-stat__path font-mono" dir="ltr" title={secondary}>
                      {secondary}
                    </span>
                  ) : null}
                </div>
                <div className="analytics-stat__nums tabular-nums">
                  <span className="analytics-stat__views">{r.views}</span>
                  {r.pct != null && r.pct > 0 ? (
                    <span className="analytics-stat__pct">{r.pct.toFixed(0)}%</span>
                  ) : null}
                </div>
              </div>
              <div className="analytics-stat__track" aria-hidden>
                <span className="analytics-stat__fill" />
              </div>
            </div>
          </li>
        );
      })}
    </ul>
  );
}

/** Device rows with OS nested (Desktop→Windows/macOS/Linux, Mobile→Android/iOS). */
function DevicePlatformList({
  devices,
  platforms,
  empty,
}: {
  devices: NamedStat[];
  platforms: NamedStat[];
  empty: ReactNode;
}) {
  const { t } = useI18n();
  if (devices.length === 0 && platforms.length === 0) {
    return typeof empty === 'string' ? (
      <p className="text-sm text-base-content/65 py-4 text-center">{empty}</p>
    ) : (
      <>{empty}</>
    );
  }

  const bucketLabel = (b: DeviceBucket): string => {
    if (b === 'mobile') return t('هاتف', 'Mobile');
    if (b === 'tablet') return t('لوحي', 'Tablet');
    if (b === 'desktop') return t('سطح مكتب', 'Desktop');
    return t('أخرى', 'Other');
  };

  const used = new Set<string>();
  let deviceRows = devices;
  if (deviceRows.length === 0) {
    deviceRows = (['desktop', 'mobile', 'tablet'] as DeviceBucket[])
      .map((bucket) => {
        const nested = platforms.filter((p) => osBucket(p.name) === bucket);
        if (nested.length === 0) return null;
        return {
          name: bucketLabel(bucket),
          views: nested.reduce((sum, p) => sum + p.views, 0),
        };
      })
      .filter((r): r is NamedStat => r != null);
  }

  const rows = deviceRows.map((device) => {
    const bucket = deviceBucket(device.name);
    const nested = platforms.filter((p) => {
      if (osBucket(p.name) !== bucket) return false;
      used.add(p.name);
      return true;
    });
    return { device, nested };
  });
  const leftovers = platforms.filter((p) => !used.has(p.name));
  const max = Math.max(...rows.map((r) => r.device.views), ...platforms.map((p) => p.views), 1);

  return (
    <ul className="analytics-stat-list">
      {rows.map(({ device, nested }, i) => {
        const share = (device.views / max) * 100;
        const pct =
          device.pct != null && device.pct > 0
            ? device.pct
            : max > 0
              ? (device.views / rows.reduce((s, x) => s + x.device.views, 0)) * 100
              : 0;
        return (
          <li
            key={device.name}
            className={`analytics-stat${i === 0 ? ' is-lead' : ''}`}
            style={{ ['--i' as string]: i, ['--share' as string]: `${share}%` }}
          >
            <span className="analytics-stat__rank tabular-nums" aria-hidden>
              {i + 1}
            </span>
            <div className="analytics-stat__body">
              <div className="analytics-stat__head">
                <div className="analytics-stat__titles min-w-0">
                  <span className="analytics-stat__name" title={device.name}>
                    {device.name}
                  </span>
                  {nested.length > 0 ? (
                    <span className="analytics-stat__path">
                      {(() => {
                        const top = [...nested].sort((a, b) => b.views - a.views)[0];
                        return t(
                          `الأكثر من ${prettyOs(top.name)}`,
                          `Most from ${prettyOs(top.name)}`,
                        );
                      })()}
                    </span>
                  ) : null}
                </div>
                <div className="analytics-stat__nums tabular-nums">
                  <span className="analytics-stat__views">{device.views}</span>
                  {pct > 0 ? (
                    <span className="analytics-stat__pct">{pct.toFixed(0)}%</span>
                  ) : null}
                </div>
              </div>
              <div className="analytics-stat__track" aria-hidden>
                <span className="analytics-stat__fill" />
              </div>
              {nested.length > 0 ? (
                <ul className="analytics-stat__nested">
                  {nested.map((p, ni) => (
                    <li
                      key={p.name}
                      className="analytics-stat__os"
                      style={
                        {
                          ['--i' as string]: i * 3 + ni + 1,
                          ['--share' as string]: `${(p.views / max) * 100}%`,
                        }
                      }
                    >
                      <span className="analytics-stat__os-name">{prettyOs(p.name)}</span>
                      <span className="analytics-stat__os-n tabular-nums">{p.views}</span>
                      <span className="analytics-stat__os-track" aria-hidden>
                        <span className="analytics-stat__os-fill" />
                      </span>
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
          </li>
        );
      })}
      {leftovers.length > 0 ? (
        <li className="analytics-stat analytics-stat--other">
          <span className="analytics-stat__rank" aria-hidden>
            ·
          </span>
          <div className="analytics-stat__body">
            <p className="analytics-stat__name text-base-content/60">
              {t('أخرى', 'Other')}
            </p>
            <ul className="analytics-stat__nested">
              {leftovers.map((p) => (
                <li key={p.name} className="analytics-stat__os">
                  <span className="analytics-stat__os-name">{prettyOs(p.name)}</span>
                  <span className="analytics-stat__os-n tabular-nums">{p.views}</span>
                </li>
              ))}
            </ul>
          </div>
        </li>
      ) : null}
    </ul>
  );
}

function MetricTile({
  label,
  value,
  hint,
  icon: Icon,
  accent,
  tone = 'neutral',
  i = 0,
}: {
  label: string;
  value: string;
  hint?: string;
  icon: IconComp;
  accent?: boolean;
  /** Visual role — commerce (revenue), traffic, warn, neutral. */
  tone?: 'neutral' | 'commerce' | 'traffic' | 'warn';
  i?: number;
}) {
  const role = accent ? 'commerce' : tone;
  return (
    <article
      className={`analytics-metric analytics-metric--${role}${accent ? ' is-accent' : ''}`}
      style={{ ['--i' as string]: i }}
    >
      <div className="analytics-metric__top">
        <p className="analytics-metric__label">{label}</p>
        <span className="analytics-metric__icon" aria-hidden>
          <Icon size={14} strokeWidth={2.25} />
        </span>
      </div>
      <p className="analytics-metric__value tabular-nums">{value}</p>
      {hint ? <p className="analytics-metric__hint text-pretty">{hint}</p> : null}
      <span className="analytics-metric__glow" aria-hidden />
    </article>
  );
}

function LoadingSkeleton() {
  const { t } = useI18n();
  return (
    <div className="space-y-4" aria-busy="true" aria-live="polite">
      <span className="sr-only">{t('جارٍ التحميل...', 'Loading')}</span>
      <div className="h-28 rounded-xl bg-base-300/40 animate-pulse motion-reduce:animate-none" />
      <div className="h-48 rounded-xl bg-base-300/40 animate-pulse motion-reduce:animate-none" />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="h-40 rounded-xl bg-base-300/40 animate-pulse motion-reduce:animate-none" />
        <div className="h-40 rounded-xl bg-base-300/40 animate-pulse motion-reduce:animate-none" />
      </div>
    </div>
  );
}

export default function AnalyticsPage() {
  const { t, lang } = useI18n();
  const uid = useId();
  const [preset, setPreset] = useState<Preset>('last_7d');
  const [tab, setTab] = useState<Tab>('overview');
  const [traffic, setTraffic] = useState<TrafficState>({ status: 'loading' });
  const [paidCount, setPaidCount] = useState(0);
  const [revenue, setRevenue] = useState(0);
  const [salesLoading, setSalesLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const loadTraffic = useCallback(async (range: Preset) => {
    setTraffic({ status: 'loading' });
    const { data, error } = await supabase.functions.invoke('databuddy-analytics', {
      body: { preset: range },
    });

    let body = data as Record<string, unknown> | null;
    if (error && !body) {
      const ctx = (error as { context?: Response }).context;
      if (ctx) {
        try {
          body = await ctx.json();
        } catch { /* ignore */ }
      }
    }

    if (body?.error === 'databuddy_not_configured') {
      setTraffic({ status: 'need_setup' });
      return;
    }
    if (body?.error) {
      const detail = body.detail;
      const detailStr =
        typeof detail === 'string'
          ? detail
          : detail
            ? JSON.stringify(detail).slice(0, 280)
            : '';
      setTraffic({
        status: 'error',
        message: t(
          'تعذر تحميل الزيارات. حاول مرة أخرى.',
          'Could not load traffic. Try again.',
        ) + (detailStr ? ` (${String(body.error)})` : ''),
      });
      return;
    }
    if (error) {
      const msg = error.message || '';
      if (msg.includes('Function not found') || msg.includes('Failed to send') || msg.includes('404')) {
        setTraffic({ status: 'need_setup' });
      } else {
        setTraffic({ status: 'error', message: msg || t('تعذر تحميل الزيارات', 'Could not load traffic') });
      }
      return;
    }

    setTraffic(parseTraffic(body?.data ?? body, lang));
    setUpdatedAt(new Date());
  }, [lang, t]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setSalesLoading(true);
      const rangeIso = rangeStart(preset).toISOString();
      const { data: resetRow } = await supabase
        .from('site_settings')
        .select('value')
        .eq('key', 'dashboard_stats_reset_at')
        .maybeSingle();
      if (cancelled) return;
      const resetAt = parseDashboardStatsResetAt(resetRow?.value ?? '');
      const since = dashboardStatsSinceIso(resetAt, rangeIso)!;
      const { data: paid } = await supabase
        .from('orders')
        .select('total, created_at')
        .eq('status', 'paid')
        .gte('created_at', since);
      if (cancelled) return;
      const rows = paid ?? [];
      setPaidCount(rows.length);
      setRevenue(rows.reduce((s, o) => s + (Number(o.total) || 0), 0));
      setSalesLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [preset, refreshKey]);

  useEffect(() => {
    void loadTraffic(preset).finally(() => setRefreshing(false));
  }, [preset, loadTraffic, refreshKey]);

  useEffect(() => {
    if (tab !== 'live') return;
    const id = window.setInterval(() => setRefreshKey((k) => k + 1), 30000);
    return () => window.clearInterval(id);
  }, [tab]);

  const liveCount = traffic.status === 'ok' ? traffic.liveSessions.length : 0;
  const showRange = tab !== 'live';
  const bounce =
    traffic.status === 'ok'
      ? bounceDisplay(traffic.summary.bounce_rate, traffic.summary.visitors, t)
      : { value: '—' };

  const onRefresh = () => {
    setRefreshing(true);
    setRefreshKey((k) => k + 1);
  };

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6 text-start">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0 space-y-1">
          <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight text-balance">
            {t('تحليلات المتجر', 'Store analytics')}
          </h2>
          <p className="text-sm text-base-content/60 text-pretty">
            {t(
              'مبيعات وزيارات للفترة المحددة — نفس النافذة الزمنية.',
              'Sales and traffic for the selected range — same window.',
            )}
            {updatedAt ? (
              <span className="ms-2 text-base-content/70 tabular-nums">
                · {t('آخر تحديث', 'Updated')}{' '}
                {updatedAt.toLocaleTimeString(lang === 'ar' ? 'ar' : 'en', {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </span>
            ) : null}
          </p>
        </div>
        <div className="flex flex-wrap gap-2 self-start sm:self-auto">
          <StatsResetControl onReset={() => setRefreshKey((k) => k + 1)} />
          <button
            type="button"
            className={`btn btn-ghost btn-sm gap-1.5 border border-base-300 ${focusRing}`}
            onClick={onRefresh}
            disabled={refreshing || traffic.status === 'loading'}
            aria-busy={refreshing || traffic.status === 'loading'}
          >
            <RefreshCw size={15} className={refreshing ? 'animate-spin motion-reduce:animate-none' : ''} aria-hidden />
            {t('تحديث', 'Refresh')}
          </button>
        </div>
      </header>

      <div className="rounded-xl border border-base-300 bg-base-200/80 p-3 sm:p-4 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div
            className="tabs tabs-boxed bg-base-300/50 p-1"
            role="tablist"
            aria-label={t('أقسام التحليلات', 'Analytics sections')}
          >
            {TABS.map((item) => {
              const selected = tab === item.id;
              const TabIcon = item.icon;
              return (
                <button
                  key={item.id}
                  type="button"
                  role="tab"
                  id={`${uid}-tab-${item.id}`}
                  aria-selected={selected}
                  aria-controls={`${uid}-panel-${item.id}`}
                  tabIndex={selected ? 0 : -1}
                  className={`tab tab-sm gap-1.5 ${selected ? 'tab-active' : ''} ${focusRing}`}
                  onClick={() => setTab(item.id)}
                  onKeyDown={(e) => {
                    const idx = TABS.findIndex((x) => x.id === item.id);
                    if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
                      e.preventDefault();
                      const dir = e.key === 'ArrowRight' ? 1 : -1;
                      const next = TABS[(idx + dir + TABS.length) % TABS.length];
                      setTab(next.id);
                      document.getElementById(`${uid}-tab-${next.id}`)?.focus();
                    }
                  }}
                >
                  <TabIcon size={13} aria-hidden />
                  {t(item.ar, item.en)}
                  {item.id === 'live' && liveCount > 0 && (
                    <span className="badge badge-primary badge-xs ms-0.5 tabular-nums">{liveCount}</span>
                  )}
                </button>
              );
            })}
          </div>
          {showRange ? (
            <div className="join" role="group" aria-label={t('الفترة', 'Range')}>
              {PRESETS.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  className={`btn btn-sm join-item min-h-9 ${preset === p.id ? 'btn-primary' : 'btn-ghost border-base-300'} ${focusRing}`}
                  onClick={() => setPreset(p.id)}
                  aria-pressed={preset === p.id}
                >
                  {t(p.ar, p.en)}
                </button>
              ))}
            </div>
          ) : (
            <p className="text-xs font-medium text-success/90 flex items-center gap-1.5">
              <span className="relative flex h-2 w-2" aria-hidden>
                <span className="motion-safe:animate-ping absolute inline-flex h-full w-full rounded-full bg-success opacity-60" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-success" />
              </span>
              {t('آخر 5 دقائق · يتحدث كل 30ث', 'Last 5 min · refreshes every 30s')}
            </p>
          )}
        </div>
      </div>

      {traffic.status === 'loading' && tab !== 'overview' && <LoadingSkeleton />}

      {traffic.status === 'need_setup' && (
        <div className="rounded-xl border border-warning/40 bg-warning/10 p-5 text-sm space-y-2" role="status">
          <p className="font-medium">{t('تتبع الزيارات غير متصل بعد', 'Traffic tracking is not connected yet')}</p>
          <p className="text-base-content/70 text-pretty">
            {t(
              'المبيعات تظهر في الملخص. لعرض الزيارات، اطلب من المطوّر ربط تحليلات المتجر.',
              'Sales still appear in the brief. Ask your developer to connect store traffic analytics.',
            )}
          </p>
        </div>
      )}

      {traffic.status === 'error' && (
        <div role="alert" className="alert alert-error text-sm">
          <div className="space-y-2">
            <p>{traffic.message}</p>
            <button type="button" className={`btn btn-sm btn-outline ${focusRing}`} onClick={onRefresh}>
              {t('إعادة المحاولة', 'Try again')}
            </button>
          </div>
        </div>
      )}

      {/* Overview — sales brief always; traffic panels when ready */}
      {tab === 'overview' && (
        <div
          className="space-y-4"
          role="tabpanel"
          id={`${uid}-panel-overview`}
          aria-labelledby={`${uid}-tab-overview`}
        >
          <section className="space-y-3" aria-labelledby={`${uid}-brief`}>
            <div className="flex flex-wrap items-end justify-between gap-2">
              <p id={`${uid}-brief`} className="text-sm font-semibold">
                {t('ملخص الفترة', 'Range brief')}
                <span className="ms-2 text-base-content/70 font-medium">
                  · {presetLabel(preset, lang)}
                </span>
              </p>
              <Link
                to="/dashboard/orders"
                className={`btn btn-primary btn-sm gap-1.5 ${focusRing}`}
              >
                <ShoppingBag size={14} aria-hidden />
                {t('عرض الطلبات', 'View orders')}
              </Link>
            </div>
            <div className="analytics-metric-grid">
              <MetricTile
                label={t('الإيراد', 'Revenue')}
                value={salesLoading ? '—' : `$${revenue.toFixed(2)}`}
                hint={t('طلبات مدفوعة في الفترة', 'Paid orders in range')}
                icon={Wallet}
                accent
                i={0}
              />
              <MetricTile
                label={t('طلبات', 'Orders')}
                value={salesLoading ? '—' : String(paidCount)}
                hint={t('مكتملة الدفع', 'Completed payments')}
                icon={ShoppingBag}
                tone="commerce"
                i={1}
              />
              <MetricTile
                label={t('زوار', 'Visitors')}
                value={
                  traffic.status === 'ok'
                    ? String(traffic.summary.visitors)
                    : traffic.status === 'loading'
                      ? '…'
                      : '—'
                }
                hint={t('زوار فريدون', 'Unique visitors')}
                icon={Users}
                tone="traffic"
                i={2}
              />
              <MetricTile
                label={t('جلسات', 'Sessions')}
                value={traffic.status === 'ok' ? String(traffic.summary.sessions) : '—'}
                hint={
                  traffic.status === 'ok'
                    ? `${traffic.summary.pageviews} ${t('مشاهدات', 'pageviews')}`
                    : t('بعد ربط التتبع', 'After tracking connects')
                }
                icon={Activity}
                tone="traffic"
                i={3}
              />
            </div>
            {traffic.status === 'ok' ? (
              <div className="flex flex-wrap gap-2">
                <span className="badge badge-ghost border border-base-300 gap-1.5 tabular-nums">
                  <Eye size={12} aria-hidden />
                  {traffic.summary.pageviews} {t('مشاهدات', 'pageviews')}
                </span>
                <span
                  className="badge badge-ghost border border-base-300 gap-1.5"
                  title={bounce.hint}
                >
                  {t('مغادرة سريعة', 'Bounce')}: {bounce.value}
                </span>
                <span className="badge badge-ghost border border-base-300 gap-1.5 tabular-nums">
                  {t('متوسط الجلسة', 'Avg session')}: {formatDuration(traffic.summary.duration_s)}
                </span>
                {bounce.hint ? (
                  <span className="badge badge-warning badge-outline gap-1.5 text-xs">
                    {bounce.hint}
                  </span>
                ) : null}
              </div>
            ) : traffic.status === 'loading' ? (
              <div className="h-8 w-full max-w-lg rounded-lg bg-base-300/40 animate-pulse motion-reduce:animate-none" />
            ) : null}
          </section>

          {traffic.status === 'loading' && <LoadingSkeleton />}

          {traffic.status === 'ok' && (
            <>
          <Panel
            title={t('الزوار عبر الوقت', 'Visitors over time')}
            headingId={`${uid}-series`}
            icon={Activity}
            emphasis
          >
            {traffic.series.length === 0 ? (
              <EmptyTeach
                title={t('لا منحنى بعد لهذه الفترة', 'No trend for this range yet')}
                body={t(
                  'عندما يزور الناس المتجر، يظهر هنا عدد الزوار يومياً. شارك رابط المتجر أو تصفح الواجهة العامة لبدء التتبع.',
                  'When people visit the storefront, daily visitors show here. Share your store link or browse the public site to start tracking.',
                )}
              />
            ) : (
              <>
                <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                  <div className="flex flex-wrap items-center gap-4 text-xs font-medium text-base-content/70">
                    <p className="flex items-center gap-2">
                      <span className="inline-block size-2.5 rounded-full bg-primary" aria-hidden />
                      {t('زوار يومياً', 'Daily visitors')}
                    </p>
                    <p className="flex items-center gap-2">
                      <span
                        className="inline-block w-3.5 border-t-2 border-dashed border-base-content/45"
                        aria-hidden
                      />
                      {t('مشاهدات', 'Pageviews')}
                    </p>
                  </div>
                  {traffic.summary.visitors < LOW_SAMPLE_VISITORS ? (
                    <p className="text-xs text-warning">
                      {t(
                        'زيارات قليلة — المنحنى يستقر مع المزيد من الزوار',
                        'Early traffic — curve settles as visits grow',
                      )}
                    </p>
                  ) : null}
                </div>
                <p className="sr-only">
                  {t(
                    `سلسلة زمنية: ${traffic.series.length} أيام، آخر قيمة ${traffic.series[traffic.series.length - 1]?.visitors ?? 0} زوار`,
                    `Time series: ${traffic.series.length} days, latest ${traffic.series[traffic.series.length - 1]?.visitors ?? 0} visitors`,
                  )}
                </p>
                <ResponsiveContainer width="100%" height={280}>
                  <AreaChart data={traffic.series} margin={{ left: 0, right: 8, top: 8 }}>
                    <defs>
                      <linearGradient id={`${uid}-visitorsFill`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="var(--color-primary)" stopOpacity={0.4} />
                        <stop offset="100%" stopColor="var(--color-primary)" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="color-mix(in oklch, var(--color-base-content) 12%, transparent)"
                      vertical={false}
                    />
                    <XAxis
                      dataKey="label"
                      tick={{
                        fill: 'color-mix(in oklch, var(--color-base-content) 55%, transparent)',
                        fontSize: 12,
                      }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      tick={{
                        fill: 'color-mix(in oklch, var(--color-base-content) 55%, transparent)',
                        fontSize: 12,
                      }}
                      axisLine={false}
                      tickLine={false}
                      width={36}
                      allowDecimals={false}
                      domain={[0, 'dataMax']}
                    />
                    <Tooltip
                      contentStyle={{
                        background: 'var(--color-base-200)',
                        border: '1px solid color-mix(in oklch, var(--color-base-content) 12%, transparent)',
                        borderRadius: 8,
                        fontSize: 12,
                      }}
                      labelStyle={{ color: 'var(--color-base-content)' }}
                    />
                    <Area
                      type="monotone"
                      dataKey="visitors"
                      name={t('الزوار', 'Visitors')}
                      stroke="var(--color-primary)"
                      fill={`url(#${uid}-visitorsFill)`}
                      strokeWidth={2.5}
                      activeDot={{ r: 5, strokeWidth: 0 }}
                    />
                    <Area
                      type="monotone"
                      dataKey="pageviews"
                      name={t('مشاهدات', 'Pageviews')}
                      stroke="color-mix(in oklch, var(--color-base-content) 45%, transparent)"
                      fill="transparent"
                      strokeWidth={1.75}
                      strokeDasharray="5 4"
                      activeDot={{ r: 3.5, strokeWidth: 0 }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </>
            )}
          </Panel>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Panel title={t('أكثر الصفحات', 'Top pages')} headingId={`${uid}-pages`} icon={Eye} tone="pages">
              <StatList
                kind="pages"
                rows={traffic.pages}
                empty={
                  <EmptyTeach
                    title={t('لا صفحات بعد', 'No pages yet')}
                    body={t(
                      'ستظهر الصفحات الأكثر زيارة هنا بعد أول زيارات للمتجر.',
                      'Most-visited storefront pages appear here after the first visits.',
                    )}
                  />
                }
              />
            </Panel>
            <Panel title={t('من أين أتوا', 'Where they came from')} headingId={`${uid}-refs`} icon={Globe} tone="refs">
              <StatList
                kind="referrers"
                rows={traffic.referrers}
                empty={
                  <EmptyTeach
                    title={t('لا مصادر بعد', 'No sources yet')}
                    body={t(
                      'الروابط الخارجية ومحركات البحث تظهر هنا عندما يصل الزوار من خارج المتجر.',
                      'External links and search engines show here when visitors arrive from outside the store.',
                    )}
                  />
                }
              />
            </Panel>
            <Panel title={t('الأجهزة', 'Devices')} headingId={`${uid}-devices`} icon={Monitor} tone="devices">
              <DevicePlatformList
                devices={traffic.devices}
                platforms={traffic.platforms}
                empty={
                  <EmptyTeach
                    title={t('لا بيانات أجهزة', 'No device data')}
                    body={t(
                      'هاتف، جهاز لوحي، أو سطح مكتب — مع نظام التشغيل (ويندوز، ماك، أندرويد…) بعد زيارات كافية.',
                      'Phone, tablet, or desktop — with OS (Windows, macOS, Android…) after enough visits.',
                    )}
                  />
                }
              />
            </Panel>
            <Panel title={t('الدول', 'Countries')} headingId={`${uid}-countries`} icon={MapPin} tone="countries">
              <StatList
                rows={traffic.countries}
                empty={
                  <EmptyTeach
                    title={t('لا دول بعد', 'No countries yet')}
                    body={t(
                      'تظهر مواقع الزوار هنا عندما يجمع التتبع بيانات كافية.',
                      'Visitor locations show here once tracking has enough data.',
                    )}
                  />
                }
              />
            </Panel>
          </div>
            </>
          )}
        </div>
      )}

      {traffic.status === 'ok' && tab === 'live' && (
        <div
          className="analytics-live space-y-4"
          role="tabpanel"
          id={`${uid}-panel-live`}
          aria-labelledby={`${uid}-tab-live`}
        >
          <article
            className={`analytics-live__hero${liveCount > 0 ? ' is-hot' : ' is-quiet'}`}
            aria-live="polite"
          >
            <div className="analytics-live__pulse" aria-hidden>
              <span className="analytics-live__pulse-ring" />
              <span className="analytics-live__pulse-core" />
            </div>
            <div className="analytics-live__hero-copy min-w-0">
              <p className="analytics-live__count tabular-nums">{liveCount}</p>
              <p className="analytics-live__count-label text-pretty">
                {liveCount === 1
                  ? t('جلسة نشطة الآن', 'active session now')
                  : t('جلسات نشطة الآن', 'active sessions now')}
              </p>
              <p className="analytics-live__hero-hint text-pretty">
                {liveCount > 0
                  ? t('يتصفحون المتجر في هذه اللحظة.', 'Browsing the store right now.')
                  : t('الرادار هادئ — يظهر الزوار هنا فور وصولهم.', 'Radar quiet — visitors show here the moment they arrive.')}
              </p>
            </div>
            <div className="analytics-live__hero-meta" aria-hidden>
              <Radio size={22} strokeWidth={2} />
            </div>
          </article>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Panel title={t('الصفحات الآن', 'Pages right now')} headingId={`${uid}-live-pages`} icon={Eye}>
              <StatList
                kind="pages"
                rows={traffic.livePages}
                empty={
                  <EmptyTeach
                    title={t('لا أحد يتصفح حالياً', 'Nobody browsing right now')}
                    body={t(
                      'الصفحات الحية تظهر هنا عندما يفتح زائر المتجر.',
                      'Live pages appear here when a visitor opens the store.',
                    )}
                  />
                }
              />
            </Panel>
            <Panel title={t('البث المباشر', 'Live feed')} headingId={`${uid}-live-feed`} icon={Radio} emphasis>
              {traffic.liveFeed.length === 0 ? (
                <EmptyTeach
                  title={t('هادئ الآن', 'Quiet right now')}
                  body={t(
                    'عندما يتصفح أحد المتجر، تظهر الأحداث هنا فوراً.',
                    'When someone browses the store, events appear here instantly.',
                  )}
                />
              ) : (
                <ul className="analytics-live__feed">
                  {traffic.liveFeed.map((e, i) => (
                    <li
                      key={`${e.when}-${i}`}
                      className="analytics-live__event"
                      style={{ ['--i' as string]: i }}
                    >
                      <span className="analytics-live__event-dot" aria-hidden />
                      <div className="analytics-live__event-body min-w-0">
                        <div className="analytics-live__event-head">
                          <span className="analytics-live__event-name" dir="ltr">
                            {e.name}
                          </span>
                          <time className="analytics-live__event-when tabular-nums">
                            {e.when ? formatWhen(e.when, lang) : '—'}
                          </time>
                        </div>
                        <p className="analytics-live__event-meta" dir="ltr">
                          <span className="font-mono">{e.path || '—'}</span>
                          <span aria-hidden>·</span>
                          <span>{e.country || '—'}</span>
                          <span aria-hidden>·</span>
                          <span>{e.browser || '—'}</span>
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </Panel>
          </div>

          <Panel title={t('الجلسات النشطة', 'Active sessions')} headingId={`${uid}-live-sessions`} icon={Users}>
            {traffic.liveSessions.length === 0 ? (
              <EmptyTeach
                title={t('لا جلسات نشطة', 'No active sessions')}
                body={t(
                  'الجلسات الحية تظهر هنا مع الصفحة والدولة والجهاز.',
                  'Live sessions show here with page, country, and device.',
                )}
              />
            ) : (
              <ul className="analytics-live__sessions">
                {traffic.liveSessions.map((s, i) => {
                  const pageInfo = pagePathLabel(s.page || '/', t);
                  return (
                    <li
                      key={s.id}
                      className="analytics-live__session"
                      style={{ ['--i' as string]: i }}
                    >
                      <div className="analytics-live__session-main min-w-0">
                        <p className="analytics-live__session-page">
                          {pageInfo.label ?? pageInfo.path}
                        </p>
                        <p className="analytics-live__session-path font-mono" dir="ltr">
                          {pageInfo.path}
                        </p>
                        <p className="analytics-live__session-tags">
                          <span>{s.country || '—'}</span>
                          <span aria-hidden>·</span>
                          <span className="capitalize">{s.device || '—'}</span>
                          <span aria-hidden>·</span>
                          <span className="tabular-nums">
                            {s.pages} {t('صفحات', 'pages')}
                          </span>
                        </p>
                      </div>
                      <time className="analytics-live__session-seen tabular-nums">
                        {s.lastSeen ? formatWhen(s.lastSeen, lang) : '—'}
                      </time>
                    </li>
                  );
                })}
              </ul>
            )}
          </Panel>
        </div>
      )}

      {traffic.status === 'ok' && tab === 'health' && (
        <div
          className="space-y-4"
          role="tabpanel"
          id={`${uid}-panel-health`}
          aria-labelledby={`${uid}-tab-health`}
        >
          <p className="text-sm text-base-content/65 text-pretty">
            {t(
              'هل يفتح المتجر بسرعة وهل تظهر أخطاء للزوار في هذه الفترة.',
              'Whether the storefront loads quickly and whether visitors hit errors in this range.',
            )}
          </p>

          <section className="analytics-metric-grid analytics-metric-grid--3" aria-label={t('ملخص الأخطاء', 'Error summary')}>
            <MetricTile
              label={t('أخطاء', 'Errors')}
              value={String(traffic.errorSummary.total || 0)}
              hint={t('في الفترة المحددة', 'In selected range')}
              icon={Gauge}
              tone="warn"
              i={0}
            />
            <MetricTile
              label={t('زوار متأثرون', 'Visitors affected')}
              value={String(traffic.errorSummary.users || 0)}
              hint={t('واجهوا خطأ', 'Hit an error')}
              icon={Users}
              tone="warn"
              i={1}
            />
            <MetricTile
              label={t('نسبة الأخطاء', 'Error share')}
              value={
                traffic.errorSummary.rate
                  ? `${(traffic.errorSummary.rate <= 1 ? traffic.errorSummary.rate * 100 : traffic.errorSummary.rate).toFixed(2)}%`
                  : '—'
              }
              hint={t('من الجلسات', 'Of sessions')}
              icon={Activity}
              tone="warn"
              i={2}
            />
          </section>

          <Panel title={t('سرعة التحميل', 'Load speed')} headingId={`${uid}-vitals`} icon={Gauge} emphasis>
            {traffic.vitals.length === 0 ? (
              <EmptyTeach
                title={t('لا قياسات سرعة بعد', 'No speed readings yet')}
                body={t(
                  'بعد زيارات حقيقية للمتجر، تظهر هنا سرعة التحميل والتفاعل.',
                  'After real storefront visits, load and interaction speed show here.',
                )}
              />
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {traffic.vitals.map((v) => {
                  const status = vitalStatusLabel(v.metric, v.p75, t);
                  return (
                    <div
                      key={v.metric}
                      className="rounded-xl border border-base-300 bg-base-100/50 p-4"
                    >
                      <p className="text-xs font-medium text-base-content/55">{v.metric}</p>
                      <p className={`text-2xl font-semibold tabular-nums mt-1.5 ${vitalTone(v.metric, v.p75)}`}>
                        {formatVital(v.metric, v.p75)}
                      </p>
                      {status ? (
                        <p className={`text-xs font-semibold mt-1 ${vitalTone(v.metric, v.p75)}`}>
                          {status}
                        </p>
                      ) : null}
                      <p className="text-xs text-base-content/55 mt-2">
                        p95 {formatVital(v.metric, v.p95)} · {v.samples} {t('عينة', 'samples')}
                      </p>
                    </div>
                  );
                })}
              </div>
            )}
          </Panel>

          <Panel title={t('أخطاء حديثة', 'Recent errors')} headingId={`${uid}-errors`} icon={Activity}>
            {traffic.recentErrors.length === 0 ? (
              <div className="rounded-xl border border-success/30 bg-success/5 py-8 text-center space-y-2">
                <p className="text-sm font-semibold text-success flex items-center justify-center gap-2">
                  <Gauge size={16} aria-hidden />
                  {t('لا أخطاء — ممتاز', 'No errors — looking good')}
                </p>
                <p className="text-xs text-base-content/55">
                  {t('المتجر يبدو مستقراً في هذه الفترة', 'Storefront looks stable in this range')}
                </p>
              </div>
            ) : (
              <ul className="space-y-2">
                {traffic.recentErrors.map((e, i) => (
                  <li key={`${e.message}-${i}`} className="rounded-lg border border-error/20 bg-error/5 px-3 py-2.5">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="badge badge-error badge-outline badge-sm">{e.type}</span>
                      <span className="text-xs text-base-content/55">
                        {e.when ? formatWhen(e.when, lang) : '—'}
                      </span>
                    </div>
                    <p className="text-sm mt-1.5 break-words" dir="ltr">{e.message}</p>
                    <p className="text-xs text-base-content/55 mt-1 font-mono truncate" dir="ltr">{e.path}</p>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </div>
      )}

      {traffic.status === 'ok' && tab === 'events' && (
        <div
          className="space-y-4"
          role="tabpanel"
          id={`${uid}-panel-events`}
          aria-labelledby={`${uid}-tab-events`}
        >
          <Panel title={t('أحداث المتجر', 'Store events')} headingId={`${uid}-events`} icon={ShoppingBag} emphasis>
            {traffic.customEvents.length === 0 ? (
              <EmptyTeach
                title={t('لا أحداث شراء بعد', 'No purchase events yet')}
                body={t(
                  'بعد إتمام طلب مدفوع، يظهر حدث إتمام الشراء هنا. أكمل عملية شراء تجريبية للتحقق.',
                  'After a paid checkout, purchase-completed events show here. Run a test purchase to verify.',
                )}
                action={
                  <Link to="/dashboard/orders" className={`btn btn-sm btn-outline ${focusRing}`}>
                    {t('عرض الطلبات', 'View orders')}
                  </Link>
                }
              />
            ) : (
              <StatList
                rows={traffic.customEvents.map((e) => ({ name: e.name, views: e.count }))}
                empty={t('لا أحداث', 'No events')}
              />
            )}
          </Panel>
        </div>
      )}
    </div>
  );
}
