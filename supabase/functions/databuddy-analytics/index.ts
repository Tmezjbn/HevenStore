// Proxy Databuddy Query API for owner/admin/moderator.
//
// Secrets: DATABUDDY_API_KEY, DATABUDDY_WEBSITE_ID
// Deploy: npx supabase functions deploy databuddy-analytics

import { createClient } from 'npm:@supabase/supabase-js@2';

function corsHeaders(req: Request): Record<string, string> {
  const site = (Deno.env.get('SITE_URL') ?? 'http://localhost:5173').replace(/\/$/, '');
  const origin = (req.headers.get('Origin') ?? '').replace(/\/$/, '');
  const allowed = new Set([site, 'http://localhost:5173', 'http://127.0.0.1:5173']);
  return {
    'Access-Control-Allow-Origin': allowed.has(origin) ? (req.headers.get('Origin') ?? site) : site,
    'Vary': 'Origin',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  };
}

const STAFF = new Set(['owner', 'admin', 'moderator']);
const ALLOWED_PRESETS = new Set(['today', 'last_7d', 'last_30d', 'last_90d']);

// Free plan has no error tracking — batching those types 402s the whole query.
const CORE_QUERY_TYPES = [
  'summary_metrics',
  'events_by_date',
  'top_pages',
  'top_referrers',
  'device_types',
  'os_name',
  'country',
  'vitals_overview',
  'realtime_sessions',
  'realtime_pages',
  'realtime_feed',
  'custom_events',
];

const PAID_QUERY_TYPES = ['error_summary', 'recent_errors'];

function json(req: Request, body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders(req), 'Content-Type': 'application/json' },
  });
}

function isFeatureUnavailable(status: number, payload: unknown): boolean {
  if (status !== 402) return false;
  if (!payload || typeof payload !== 'object') return false;
  return (payload as { code?: string }).code === 'FEATURE_UNAVAILABLE';
}

async function queryDatabuddy(
  apiKey: string,
  websiteId: string,
  preset: string,
  parameters: string[],
): Promise<{ ok: boolean; status: number; payload: unknown }> {
  let res: Response;
  try {
    res = await fetch(
      `https://api.databuddy.cc/v1/query?website_id=${encodeURIComponent(websiteId)}`,
      {
        method: 'POST',
        headers: {
          'x-api-key': apiKey,
          'Content-Type': 'application/json',
        },
        signal: AbortSignal.timeout(8000),
        body: JSON.stringify({
          parameters,
          preset,
          limit: 12,
          granularity: 'daily',
        }),
      },
    );
  } catch (e) {
    // Hung/failed upstream — surface as 502 to the caller, not an unhandled 500.
    return { ok: false, status: 502, payload: e instanceof Error ? e.message : String(e) };
  }

  const text = await res.text();
  let payload: unknown = text;
  try {
    payload = JSON.parse(text);
  } catch { /* keep text */ }

  return { ok: res.ok, status: res.status, payload };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders(req) });
  if (req.method !== 'POST') return json(req, { error: 'Method not allowed' }, 405);

  const apiKey = Deno.env.get('DATABUDDY_API_KEY');
  const websiteId = Deno.env.get('DATABUDDY_WEBSITE_ID');
  if (!apiKey || !websiteId) return json(req, { error: 'databuddy_not_configured' }, 501);

  const authHeader = req.headers.get('Authorization') ?? '';
  const anon = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    { global: { headers: { Authorization: authHeader } } },
  );
  const { data: userData, error: userErr } = await anon.auth.getUser();
  if (userErr || !userData.user) return json(req, { error: 'unauthorized' }, 401);

  const { data: profile } = await anon
    .from('profiles')
    .select('role')
    .eq('id', userData.user.id)
    .maybeSingle();
  if (!profile || !STAFF.has(profile.role)) return json(req, { error: 'forbidden' }, 403);

  let preset = 'last_7d';
  try {
    const body = await req.json();
    if (typeof body?.preset === 'string' && ALLOWED_PRESETS.has(body.preset)) {
      preset = body.preset;
    }
  } catch { /* default */ }

  let result = await queryDatabuddy(apiKey, websiteId, preset, [
    ...CORE_QUERY_TYPES,
    ...PAID_QUERY_TYPES,
  ]);

  // Free plan: error tracking gated → drop paid types and retry once.
  if (!result.ok && isFeatureUnavailable(result.status, result.payload)) {
    result = await queryDatabuddy(apiKey, websiteId, preset, CORE_QUERY_TYPES);
  }

  if (!result.ok) {
    console.error('databuddy query failed:', result.status, JSON.stringify(result.payload).slice(0, 500));
    return json(req, {
      error: 'databuddy_query_failed',
      status: result.status,
    }, 502);
  }

  return json(req, { ok: true, preset, data: result.payload });
});
