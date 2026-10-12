import { supabase } from './supabase';

export interface StockPulse {
  units: number;
  oos: number;
  listings: number;
  pendingReview: number;
}

/** Catalog-wide stock totals for the staff product lists (server-side; no 1000-row cap). */
export async function fetchStockPulse(): Promise<StockPulse | null> {
  const { data, error } = await supabase.rpc('product_stock_pulse');
  if (error) {
    console.error('product_stock_pulse', error);
    return null;
  }
  const row = (Array.isArray(data) ? data[0] : data) as
    | { units: number | string; oos: number | string; listings: number | string; pending_review: number | string }
    | null
    | undefined;
  if (!row) return null;
  return {
    units: Number(row.units) || 0,
    oos: Number(row.oos) || 0,
    listings: Number(row.listings) || 0,
    pendingReview: Number(row.pending_review) || 0,
  };
}
