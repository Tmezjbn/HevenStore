import { supabase } from './supabase';

/**
 * Staff-only notes keyed by user id. Lives in `profile_staff_notes` (RLS: staff
 * read, writes via `set_staff_notes`) — never on `profiles`, which users can
 * read for their own row.
 */
export async function fetchStaffNotes(ids: string[]): Promise<Record<string, string>> {
  const uniq = [...new Set(ids.filter(Boolean))];
  if (!uniq.length) return {};
  const { data, error } = await supabase
    .from('profile_staff_notes')
    .select('user_id, notes')
    .in('user_id', uniq);
  if (error) {
    console.error('profile_staff_notes', error);
    return {};
  }
  const out: Record<string, string> = {};
  for (const row of (data ?? []) as { user_id: string; notes: string }[]) out[row.user_id] = row.notes;
  return out;
}
