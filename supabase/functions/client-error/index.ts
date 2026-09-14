// Staff-visible client crash log — independent of analytics consent.
// Logs to Supabase Edge Function logs (Dashboard → Edge Functions → Logs).
// Deploy: npx supabase functions deploy client-error --no-verify-jwt
//
// Abuse ceiling: ~30 posts / IP / minute in-isolate (ponytail; upgrade = Redis/WAF).

function corsHeaders(req: Request): Record<string, string> {
  const site = (Deno.env.get('SITE_URL') ?? 'http://localhost:5173').replace(/\/$/, '');
  const origin = (req.headers.get('Origin') ?? '').replace(/\/$/, '');
  const allowed = new Set([site, 'http://localhost:5173', 'http://127.0.0.1:5173']);
  return {
    'Access-Control-Allow-Origin': allowed.has(origin) ? (req.headers.get('Origin') ?? site) : site,
    Vary: 'Origin',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  };
}

function json(req: Request, body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders(req), 'Content-Type': 'application/json' },
  });
}

const hits = new Map<string, { n: number; t: number }>();
/** Spoofed X-Forwarded-For could grow the map unboundedly — hard cap. */
const HITS_MAX = 5000;

function rateOk(ip: string, limit = 30, windowMs = 60_000): boolean {
  const now = Date.now();
  const row = hits.get(ip);
  if (!row || now - row.t > windowMs) {
    if (hits.size >= HITS_MAX) hits.clear();
    hits.set(ip, { n: 1, t: now });
    return true;
  }
  row.n += 1;
  return row.n <= limit;
}

function clientIp(req: Request): string {
  return (
    req.headers.get('cf-connecting-ip') ||
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    req.headers.get('x-real-ip') ||
    'unknown'
  );
}

function clip(s: unknown, max: number): string | undefined {
  if (typeof s !== 'string') return undefined;
  const t = s.trim();
  if (!t) return undefined;
  return t.length > max ? t.slice(0, max) : t;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders(req) });
  if (req.method !== 'POST') return json(req, { error: 'method' }, 405);

  const ip = clientIp(req);
  if (!rateOk(ip)) return json(req, { error: 'rate' }, 429);

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return json(req, { error: 'json' }, 400);
  }
  // JSON `null`/primitive passes the parse — treat as a bad body, not a crash.
  if (!body || typeof body !== 'object') return json(req, { error: 'json' }, 400);

  const payload = {
    message: clip(body.message, 500) ?? 'unknown',
    stack: clip(body.stack, 4000),
    path: clip(body.path, 300),
    error_type: clip(body.error_type, 80),
    filename: clip(body.filename, 300),
    lineno: typeof body.lineno === 'number' ? body.lineno : undefined,
    colno: typeof body.colno === 'number' ? body.colno : undefined,
    lang: clip(body.lang, 8),
    ip,
    ua: clip(req.headers.get('user-agent'), 200),
  };

  console.error('CLIENT_ERROR', JSON.stringify(payload));
  return json(req, { ok: true });
});
