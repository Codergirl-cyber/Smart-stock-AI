// Frontend AI service wrappers — call serverless proxy (Supabase Edge Function or Vercel)
const DEFAULT_PROXY = (import.meta.env.VITE_AI_PROXY_URL as string) || '/api/ai/proxy';

async function callProxy(payload: any) {
  const url = DEFAULT_PROXY;
  try {
    const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
    if (!res.ok) {
      // mask errors from users
      return { ok: false, demo: true, text: 'Demo response due to proxy error' };
    }
    const j = await res.json();
    return j;
  } catch (e) {
    console.warn('AI proxy network error, returning demo', e);
    return { ok: false, demo: true, text: `DEMO: ${payload.prompt?.slice(0, 160)}` };
  }
}

export async function askAI(prompt: string, opts: any = {}) {
  const payload = { prompt, ...opts };
  const r = await callProxy(payload);
  return { text: r?.text || r?.message || null, demo: !!r?.demo };
}

export async function getDemandForecast(productId?: string) {
  const payload = { prompt: `demand_forecast:${productId || 'all'}`, mode: 'forecast' };
  const r = await callProxy(payload);
  // try parse structured JSON if returned
  try {
    if (r && r.text && r.text.trim().startsWith('{')) return JSON.parse(r.text);
  } catch (e) {}
  // fallback deterministic demo
  return { productId, history: Array(30).fill(0).map((_,i)=>Math.max(0, Math.round(Math.sin(i/5)*5 + 10))), next7DayForecast: 70, next30DayForecast: 220, avgDaily: 3 };
}

export async function getRestockRecommendations() {
  const payload = { prompt: 'restock_recommendations', mode: 'restock' };
  const r = await callProxy(payload);
  try { if (r && r.text && r.text.trim().startsWith('[')) return JSON.parse(r.text); } catch (e) {}
  // demo fallback
  return [ { productId: 'demo-1', productName: 'Notebook', currentStock: 5, recommendedOrder: 30, reason: 'Below reorder level' } ];
}

export async function askInventoryCopilot(question: string) {
  const payload = { prompt: question, mode: 'copilot' };
  const r = await callProxy(payload);
  return { text: r?.text || null, demo: !!r?.demo };
}

export async function getBusinessReport() {
  const payload = { prompt: 'generate_business_report', mode: 'business_report' };
  const r = await callProxy(payload);
  try { if (r && r.text && r.text.trim().startsWith('{')) return JSON.parse(r.text); } catch (e) {}
  // demo fallback
  return { generatedAt: new Date().toISOString(), executiveSummary: 'DEMO: Inventory health is FAIR', inventoryHealth: { score: 62 }, recommendations: ['Restock Notebook'] };
}

export default { askAI, getDemandForecast, getRestockRecommendations, askInventoryCopilot, getBusinessReport };
