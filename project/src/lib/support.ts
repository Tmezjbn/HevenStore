/** Support ticket standing + status helpers (mirror SQL constants). */

export const SUPPORT_STANDING_DEFAULT = 100;
export const SUPPORT_STANDING_PENALTY = 15;
export const SUPPORT_STANDING_RESTRICT_AT = 40;
export const SUPPORT_STANDING_TRUSTED_AT = 120;

/** ponytail: poll messages + ticket list every 4s; upgrade to supabase realtime postgres_changes when enabled. */
export const SUPPORT_POLL_MS = 4000;

export type SupportTicketStatus =
  | 'open'
  | 'claimed'
  | 'escalated'
  | 'resolved'
  | 'closed';

export type SupportQueue = 'general' | 'seller';

export type SupportStandingTier = 'trusted' | 'standard' | 'restricted';

export interface SupportTicket {
  id: string;
  created_by: string;
  assignee_id: string | null;
  seller_id: string | null;
  order_id: string | null;
  subject: string;
  status: SupportTicketStatus;
  queue: SupportQueue;
  escalate_reason: string | null;
  reject_reason: string | null;
  rejected_by: string | null;
  last_message_at: string;
  created_at: string;
  updated_at: string;
}

export interface SupportMessage {
  id: string;
  ticket_id: string;
  sender_id: string;
  body: string;
  created_at: string;
}

export function supportStandingTier(standing: number | null | undefined): SupportStandingTier {
  const n = standing ?? SUPPORT_STANDING_DEFAULT;
  if (n <= SUPPORT_STANDING_RESTRICT_AT) return 'restricted';
  if (n >= SUPPORT_STANDING_TRUSTED_AT) return 'trusted';
  return 'standard';
}

export function canEscalateSupport(role: string | null | undefined, standing: number | null | undefined): boolean {
  return role === 'support' && supportStandingTier(standing) !== 'restricted';
}

export function ticketStatusLabel(
  status: SupportTicketStatus,
  lang: 'ar' | 'en',
): string {
  const map: Record<SupportTicketStatus, { ar: string; en: string }> = {
    open: { ar: 'مفتوحة', en: 'Open' },
    claimed: { ar: 'مستلمة', en: 'Claimed' },
    escalated: { ar: 'مُصعَّدة', en: 'Escalated' },
    resolved: { ar: 'محلولة', en: 'Resolved' },
    closed: { ar: 'مغلقة', en: 'Closed' },
  };
  return lang === 'ar' ? map[status].ar : map[status].en;
}
