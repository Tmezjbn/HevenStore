import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';
import { fetchWalletBalance, parseWalletConfig, type WalletConfig } from '../../lib/wallet';

/**
 * Wallet keys are read straight from `site_settings`: `fetchSiteSettings` drops keys
 * that are not in SITE_SETTING_KEYS, and keeping them out of that map also keeps the
 * big Settings "Save changes" upsert from ever re-writing wallet limits with stale values.
 */
export const WALLET_SETTING_KEYS = ['wallet_enabled', 'wallet_topup_min_usd', 'wallet_topup_max_usd'] as const;
export type WalletSettingKey = (typeof WALLET_SETTING_KEYS)[number];

export const WALLET_CONFIG_QUERY_KEY = ['wallet-config'] as const;
export const walletBalanceQueryKey = (userId: string | undefined) => ['wallet-balance', userId ?? ''] as const;

async function fetchWalletConfig(): Promise<WalletConfig> {
  const { data, error } = await supabase
    .from('site_settings')
    .select('key, value')
    .in('key', [...WALLET_SETTING_KEYS]);
  if (error) throw error;
  const raw: Record<string, string | undefined> = {};
  for (const row of data ?? []) raw[row.key as string] = (row.value as string | null) ?? undefined;
  return parseWalletConfig(raw);
}

export function useWalletConfig() {
  return useQuery({
    queryKey: WALLET_CONFIG_QUERY_KEY,
    queryFn: fetchWalletConfig,
    staleTime: 60_000,
  });
}

export function useWalletBalance(userId: string | undefined, enabled: boolean, refetchInterval: number | false = false) {
  return useQuery({
    queryKey: walletBalanceQueryKey(userId),
    queryFn: fetchWalletBalance,
    enabled: enabled && !!userId,
    staleTime: 15_000,
    refetchInterval,
  });
}

/**
 * Money input → canonical ASCII decimal string. Accepts Arabic-Indic (٠-٩) and
 * Eastern Arabic-Indic (۰-۹) digits and the Arabic decimal separator; max 2 decimals.
 */
export function normalizeAmountInput(raw: string): string {
  const ascii = raw
    .replace(/[\u0660-\u0669]/g, (d) => String(d.charCodeAt(0) - 0x0660))
    .replace(/[\u06f0-\u06f9]/g, (d) => String(d.charCodeAt(0) - 0x06f0))
    .replace(/[\u066b,\u060c]/g, '.')
    .replace(/[^\d.]/g, '');
  const dot = ascii.indexOf('.');
  if (dot === -1) return ascii.slice(0, 7);
  return `${ascii.slice(0, dot).slice(0, 7)}.${ascii.slice(dot + 1).replace(/\./g, '').slice(0, 2)}`;
}

/** NaN when empty / unparsable. */
export function parseAmount(normalized: string): number {
  if (!normalized || normalized === '.') return Number.NaN;
  return Number(normalized);
}
