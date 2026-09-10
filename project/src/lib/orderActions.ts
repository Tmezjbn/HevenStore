import { supabase } from './supabase';

/** Cancel a pending order (buyer) or pending/paid/failed (staff). Server RPC. */
export async function cancelOrder(orderId: string): Promise<{ error: string | null }> {
  const { error } = await supabase.rpc('cancel_order', { p_order_id: orderId });
  if (!error) return { error: null };
  const msg = error.message || '';
  if (msg.includes('NOT_PENDING') || msg.includes('CANNOT_CANCEL')) {
    return { error: 'cannot_cancel' };
  }
  if (msg.includes('FORBIDDEN') || msg.includes('NOT_AUTHENTICATED')) {
    return { error: 'forbidden' };
  }
  if (msg.includes('NOT_FOUND')) return { error: 'not_found' };
  return { error: 'failed' };
}

/** Hard-delete an order (owner/admin). Server RPC. */
export async function deleteOrder(orderId: string): Promise<{ error: string | null }> {
  const { error } = await supabase.rpc('delete_order', { p_order_id: orderId });
  if (!error) return { error: null };
  const msg = error.message || '';
  if (msg.includes('FORBIDDEN') || msg.includes('NOT_AUTHENTICATED')) {
    return { error: 'forbidden' };
  }
  if (msg.includes('NOT_FOUND')) return { error: 'not_found' };
  return { error: 'failed' };
}
