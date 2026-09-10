/** USD money display for dashboard surfaces (shared — do not redeclare per page). */
export function formatMoney(amount: number | string | undefined | null, currency = 'USD'): string {
  const n = Number(amount ?? 0);
  if (Number.isNaN(n)) return `$${amount}`;
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
      minimumFractionDigits: n % 1 === 0 ? 0 : 2,
      maximumFractionDigits: 2,
    }).format(n);
  } catch {
    return `${n.toFixed(2)} ${currency}`;
  }
}
