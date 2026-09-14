/** Shared dashboard list paging (Orders / Products / Users). */
export const DASHBOARD_PAGE_SIZE = 25;

export function pageRange(page: number, size = DASHBOARD_PAGE_SIZE) {
  const from = Math.max(0, page) * size;
  return { from, to: from + size - 1 };
}

/** Local YYYY-MM-DD key — chart day buckets are local-midnight based, so keys
 *  must be local too (toISOString slices UTC and shifts a day in UTC+ zones). */
export function localDayKey(d: Date): string {
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
}

export type DayPoint = { key: string; label: string; revenue: number; orders: number };

/** Last-7-days revenue/order buckets keyed by LOCAL day (was UTC — shifted in
 *  UTC+ zones). Shared by the staff dashboard homes. */
export function buildLast7Days(
  orders: { total: number; status: string; created_at: string }[],
  lang: 'ar' | 'en',
): DayPoint[] {
  const days: DayPoint[] = [];
  const now = new Date();
  for (let i = 6; i >= 0; i -= 1) {
    const d = new Date(now);
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() - i);
    days.push({
      key: localDayKey(d),
      label: d.toLocaleDateString(lang === 'ar' ? 'ar-SA' : 'en-US', { weekday: 'short' }),
      revenue: 0,
      orders: 0,
    });
  }
  const map = new Map(days.map((d) => [d.key, d]));
  for (const o of orders) {
    if (o.status !== 'paid') continue;
    const bucket = map.get(localDayKey(new Date(o.created_at)));
    if (!bucket) continue;
    bucket.revenue += Number(o.total) || 0;
    bucket.orders += 1;
  }
  return days;
}

/** PostgREST caps a response at ~1000 rows — page until a short page arrives. */
export async function fetchPagedRows<T>(
  run: (from: number, to: number) => PromiseLike<{
    data: T[] | null;
    error: unknown;
  }>,
  pageSize = 1000,
): Promise<{ rows: T[]; error: boolean }> {
  const rows: T[] = [];
  for (let from = 0; ; from += pageSize) {
    const { data, error } = await run(from, from + pageSize - 1);
    if (error) return { rows, error: true };
    const page = data ?? [];
    rows.push(...page);
    if (page.length < pageSize) return { rows, error: false };
  }
}
