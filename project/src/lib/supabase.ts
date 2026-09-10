import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

/** True when build-time env is present. Missing vars → blank white if we throw at import. */
export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

if (!isSupabaseConfigured) {
  console.error(
    '[heven] Missing VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY — set them in the host env, then rebuild.',
  );
}

// Placeholder client keeps the module graph alive so React can render a config error UI
// instead of a white screen from an import-time throw.
export const supabase: SupabaseClient = createClient(
  supabaseUrl || 'https://example.supabase.co',
  supabaseAnonKey || 'public-anon-key',
  // SEC-5: SPA keeps GoTrue default (localStorage). HttpOnly cookies need a BFF;
  // mitigate XSS via CSP in public/_headers (script-src locked down).
);
