// Supabase Edge Function (Deno)
import { serve } from 'https://deno.land/std@0.201.0/http/server.ts';

type ProxyRequest = { prompt?: string; question?: string; mode?: string; model?: string };

const RATE_LIMIT_WINDOW_MS = 60_000; // 1 minute
const RATE_LIMIT_MAX = 40; // max requests per window per key

const counters: Map<string, { ts: number; count: number }> = new Map();

function rateLimitKey(req: Request) {
  // use ip-forwarded or origin header as a simple key
  const forwarded = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || req.headers.get('cf-connecting-ip');
  return forwarded || 'unknown';
}

async function callOpenAI(prompt: string, key: string, model = 'gpt-4o-mini') {
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
    body: JSON.stringify({ model, messages: [{ role: 'user', content: prompt }], temperature: 0.2 }),
  });
  const j = await res.json();
  return j?.choices?.[0]?.message?.content ?? null;
}

async function callAnthropic(prompt: string, key: string) {
  const res = await fetch('https://api.anthropic.com/v1/complete', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
    body: JSON.stringify({ model: 'claude-2', prompt, max_tokens_to_sample: 800 }),
  });
  const j = await res.json();
  return j?.completion ?? null;
}

serve(async (req: Request) => {
  try {
    if (req.method !== 'POST') return new Response(JSON.stringify({ ok: false, error: 'Method not allowed' }), { status: 405, headers: { 'content-type': 'application/json' } });
    const key = rateLimitKey(req);
    const now = Date.now();
    const entry = counters.get(key) || { ts: now, count: 0 };
    if (now - entry.ts > RATE_LIMIT_WINDOW_MS) { entry.ts = now; entry.count = 0; }
    entry.count += 1;
    counters.set(key, entry);
    if (entry.count > RATE_LIMIT_MAX) {
      return new Response(JSON.stringify({ ok: false, error: 'rate_limited' }), { status: 429, headers: { 'content-type': 'application/json' } });
    }

    const body: ProxyRequest = await req.json().catch(() => ({}));
    const prompt = body.prompt || body.question || '';
    if (!prompt) return new Response(JSON.stringify({ ok: false, error: 'missing_prompt' }), { status: 400, headers: { 'content-type': 'application/json' } });

    const openaiKey = Deno.env.get('OPENAI_API_KEY') || '';
    const anthropicKey = Deno.env.get('ANTHROPIC_API_KEY') || '';

    // Validate environment for soft warnings
    const demoMode = !openaiKey && !anthropicKey;

    let text = null;
    if (openaiKey) {
      try { text = await callOpenAI(prompt, openaiKey, body.model); } catch (e) { console.error('openai call failed', e); text = null; }
    }
    if (!text && anthropicKey) {
      try { text = await callAnthropic(prompt, anthropicKey); } catch (e) { console.error('anthropic call failed', e); text = null; }
    }

    if (!text) {
      // deterministic mock / demo
      text = `DEMO RESPONSE:\nSummary: This is a generated demo answer for the prompt: ${prompt.slice(0,160)}...\nRecommendations:\n- Review low stock SKUs\n- Consider restocking top sellers`;
    }

    const res = { ok: true, demo: demoMode, text };
    return new Response(JSON.stringify(res), { status: 200, headers: { 'content-type': 'application/json' } });
  } catch (e) {
    console.error('ai-proxy error', e);
    return new Response(JSON.stringify({ ok: false, error: 'internal_error' }), { status: 500, headers: { 'content-type': 'application/json' } });
  }
});
