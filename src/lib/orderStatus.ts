/** Bilingual order status labels for dashboard (shared — do not redeclare per page). */
export const ORDER_STATUS_LABEL: Record<string, [string, string]> = {
  paid: ['مدفوع', 'Paid'],
  pending: ['معلق', 'Pending'],
  failed: ['فشل', 'Failed'],
  refunded: ['مسترد', 'Refunded'],
  cancelled: ['ملغى', 'Cancelled'],
  superseded: ['مُستبدل', 'Superseded'],
};
