import { supabase } from '../../src/supabase';

type ForecastResult = {
  productId: string;
  productName: string;
  currentStock: number;
  last30DaySales: number;
  avgDaily: number;
  next7DayForecast: number;
  next30DayForecast: number;
  trend: 'up' | 'down' | 'stable';
  confidence: number; // 0-100
  history: number[]; // last 30 daily sales
  explanation?: string;
};

async function fetchDailySales(productId?: string, userId?: string) {
  // returns array of last 30 daily sales counts (most recent last)
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 29); // include today => 30 entries
  const iso = thirtyDaysAgo.toISOString().split('T')[0];

  // fetch orders and items
  const { data: ordersData } = await supabase
    .from('orders')
    .select('id,order_date')
    .eq('user_id', userId)
    .gte('order_date', iso)
    .order('order_date', { ascending: true });

  const orderIds = (ordersData || []).map((o: any) => o.id);
  const items = orderIds.length
    ? (await supabase.from('order_items').select('order_id,product_id,quantity').in('order_id', orderIds)).data || []
    : [];

  // build map date->count for this product or all products
  const dayMap: Record<string, number> = {};
  for (let i = 0; i < 30; i++) {
    const d = new Date(thirtyDaysAgo);
    d.setDate(thirtyDaysAgo.getDate() + i);
    dayMap[d.toISOString().split('T')[0]] = 0;
  }

  for (const o of ordersData || []) {
    const dateKey = o.order_date;
    const related = (items || []).filter((it: any) => it.order_id === o.id && (!productId || it.product_id === productId));
    const qty = related.reduce((s: number, r: any) => s + (r.quantity || 0), 0);
    dayMap[dateKey] = (dayMap[dateKey] || 0) + qty;
  }

  return Object.keys(dayMap).map((k) => dayMap[k]);
}

function simpleTrend(history: number[]) {
  // compute growth comparing average last 7 vs previous 7
  const len = history.length;
  if (len < 14) return 'stable';
  const last7 = history.slice(len - 7, len).reduce((a, b) => a + b, 0) / 7;
  const prev7 = history.slice(len - 14, len - 7).reduce((a, b) => a + b, 0) / 7;
  if (last7 > prev7 * 1.15) return 'up';
  if (last7 < prev7 * 0.85) return 'down';
  return 'stable';
}

function scoreConfidence(history: number[]) {
  // confidence increases with history length and lower variance
  const n = history.length;
  if (n === 0) return 10;
  const avg = history.reduce((a, b) => a + b, 0) / n;
  const variance = history.reduce((a, b) => a + Math.pow(b - avg, 2), 0) / n;
  const std = Math.sqrt(variance);
  const base = Math.min(80, Math.floor((n / 30) * 60 + 20));
  const bonus = Math.max(0, 20 - Math.floor(std));
  return Math.min(95, base + bonus);
}

async function callAiModel(productName: string, history: number[]) {
  const openaiKey = (import.meta as any).env?.VITE_OPENAI_API_KEY;
  const anthropicKey = (import.meta as any).env?.VITE_ANTHROPIC_API_KEY;
  if (!openaiKey && !anthropicKey) return null;
  const prompt = `You are an inventory forecasting analyst.\nProduct: ${productName}\nSales by day: ${JSON.stringify(history)}\nPredict:\n- next 7 day demand\n- next 30 day demand\n- confidence %\n- brief explanation\nReturn JSON only.`;
  try {
    if (openaiKey) {
      const res = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${openaiKey}` },
        body: JSON.stringify({ model: 'gpt-4o-mini', messages: [{ role: 'user', content: prompt }], temperature: 0.1 }),
      });
      const j = await res.json();
      return j?.choices?.[0]?.message?.content || null;
    }
    if (anthropicKey) {
      const res = await fetch('https://api.anthropic.com/v1/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${anthropicKey}` },
        body: JSON.stringify({ model: 'claude-2', prompt, max_tokens_to_sample: 300 }),
      });
      const j = await res.json();
      return j?.completion || null;
    }
  } catch (e) {
    return null;
  }
  return null;
}

export async function getDemandForecast(productId?: string, userId?: string): Promise<ForecastResult | ForecastResult[]> {
  // If productId provided, return single forecast; otherwise return all products summary
  const { data: products } = await supabase.from('products').select('id,name,stock').eq('user_id', userId);
  if (!products) return [];
  const targetProducts = productId ? products.filter((p: any) => p.id === productId) : products;
  const results: ForecastResult[] = [];
  for (const p of targetProducts) {
    // build history
    const history = await fetchDailySales(p.id, userId);
    const last30 = history.reduce((a, b) => a + b, 0);
    const avgDaily = last30 / 30 || 0;
    const trend = simpleTrend(history) as 'up' | 'down' | 'stable';
    // base forecasts
    let next7 = Math.ceil(avgDaily * 7);
    let next30 = Math.ceil(avgDaily * 30);
    // apply trend adjustment
    if (trend === 'up') {
      next7 = Math.ceil(next7 * 1.15);
      next30 = Math.ceil(next30 * 1.15);
    } else if (trend === 'down') {
      next7 = Math.max(0, Math.floor(next7 * 0.85));
      next30 = Math.max(0, Math.floor(next30 * 0.85));
    }
    // fallback for insufficient data
    const hasEnough = history.some((v) => v > 0);
    if (!hasEnough) {
      // mock/demo data
      next7 = Math.max(1, Math.ceil((p.stock || 0) * 0.3));
      next30 = Math.max(3, Math.ceil((p.stock || 0) * 0.8));
    }

    let confidence = scoreConfidence(history);

    // AI augmentation
    let explanation = '';
    const aiText = await callAiModel(p.name, history);
    if (aiText) {
      try {
        const m = aiText.match(/\{[\s\S]*\}/m);
        if (m) {
          const parsed = JSON.parse(m[0]);
          next7 = parsed.next7DayForecast ?? next7;
          next30 = parsed.next30DayForecast ?? next30;
          confidence = parsed.confidence ?? confidence;
          explanation = parsed.explanation || '';
        }
      } catch (e) {
        explanation = aiText.slice(0, 400);
      }
    }

    results.push({
      productId: p.id,
      productName: p.name,
      currentStock: Number(p.stock || 0),
      last30DaySales: last30,
      avgDaily: Number(avgDaily.toFixed(2)),
      next7DayForecast: next7,
      next30DayForecast: next30,
      trend,
      confidence,
      history,
      explanation,
    });
  }
  if (productId) return results[0];
  return results;
}

export default { getDemandForecast };
