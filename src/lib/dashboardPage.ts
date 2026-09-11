/** Shared dashboard list paging (Orders / Products / Users). */
export const DASHBOARD_PAGE_SIZE = 25;

export function pageRange(page: number, size = DASHBOARD_PAGE_SIZE) {
  const from = Math.max(0, page) * size;
  return { from, to: from + size - 1 };
}
