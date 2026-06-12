import { supabase } from '../../src/supabase';

type Recommendation = {
  productId: string;
  productName: string;
  currentStock: number;
  predictedDemand: number;
  recommendedOrder: number;
  priority: 'high' | 'medium' | 'low' | 'none';
  reason: string;
};

async function fetchSalesLast30(userId?: string) {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const iso = thirtyDaysAgo.toISOString().split('T')[0];

  // Get orders in last 30 days for user
  const { data: ordersData, error: ordersError } = await supabase
    .from('orders')
    .select('id')
    .eq('user_id', userId)
    .gte('order_date', iso);

  if (ordersError) throw ordersError;
  const orderIds = (ordersData || []).map((o: any) => o.id);
  if (orderIds.length === 0) return [];

  const { data: itemsData, error: itemsError } = await supabase
    .from('order_items')
    .select('product_id, quantity')
    .in('order_id', orderIds);

  if (itemsError) throw itemsError;
  return itemsData || [];
}

function scorePriority(recommended: number, predictedDemand: number): 'high' | 'medium' | 'low' | 'none' {
  if (recommended <= 0) return 'none';
  if (recommended >= Math.ceil(predictedDemand * 0.8)) return 'high';
  if (recommended >= Math.ceil(predictedDemand * 0.4)) return 'medium';
  return 'low';
}

async function callAiModel(productSummary: any) {
  // This function will call OpenAI or Anthropic if keys exist using fetch; otherwise return null
  const openaiKey = (import.meta as any).env?.VITE_OPENAI_API_KEY;
  const anthropicKey = (import.meta as any).env?.VITE_ANTHROPIC_API_KEY;
  if (!openaiKey && !anthropicKey) return null;

  const prompt = `You are an inventory analyst.\nProduct:\n${productSummary.productName}\n\nCurrent stock: ${productSummary.currentStock}\n\nLast 30 days sales: ${productSummary.last30}\n\nAverage daily sales: ${productSummary.avgDaily}\n\nPredict:\n- risk level\n- reorder quantity\n- short explanation\n\nReturn JSON only.`;

  if (openaiKey) {
    try {
      const res = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${openaiKey}` },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.2,
          max_tokens: 300,
        }),
      });
      const j = await res.json();
      const txt = j?.choices?.[0]?.message?.content || null;
      return txt;
    } catch (e) {
      return null;
    }
  }

  if (anthropicKey) {
    try {
      const res = await fetch('https://api.anthropic.com/v1/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${anthropicKey}` },
        body: JSON.stringify({
          model: 'claude-2',
          prompt,
          max_tokens_to_sample: 300,
        }),
      });
      const j = await res.json();
      const txt = j?.completion || null;
      return txt;
    } catch (e) {
      return null;
    }
  }
  return null;
}

export async function getRestockRecommendations(userId?: string): Promise<Recommendation[]> {
  // Fetch products for user
  const { data: products, error: productsError } = await supabase
    .from('products')
    .select('id, name, stock, reorder_level')
    .eq('user_id', userId);

  if (productsError) throw productsError;

  const items = await fetchSalesLast30(userId);

  // aggregate sales per product
  const salesMap: Record<string, number> = {};
  (items || []).forEach((it: any) => {
    const pid = it.product_id;
    salesMap[pid] = (salesMap[pid] || 0) + (it.quantity || 0);
  });

  const results: Recommendation[] = [];
  for (const p of (products || [])) {
    const last30 = salesMap[p.id] || 0;
    const avgDaily = last30 / 30;
    const predicted14 = Math.ceil(avgDaily * 14);
    const currentStock = Number(p.stock || 0);
    const safety = Math.max(2, Math.ceil(predicted14 * 0.2));
    let recommended = Math.max(0, predicted14 - currentStock + safety);
    // If reorder_level exists and currentStock already above reorder, and recommended is small, set to 0
    const reorderLevel = Number(p.reorder_level ?? 2);
    if (currentStock >= predicted14 && currentStock >= reorderLevel) {
      recommended = 0;
    }

    const priority = scorePriority(recommended, predicted14);

    let reason = '';
    if (recommended <= 0) {
      reason = 'Stock level is healthy.';
    } else {
      reason = 'Demand likely exceeds available stock in the next 14 days.';
    }

    // Try AI explanation if keys exist
    const aiText = await callAiModel({ productName: p.name, currentStock, last30, avgDaily });
    if (aiText) {
      // naive attempt to parse JSON from model output
      try {
        const m = aiText.match(/\{[\s\S]*\}/m);
        if (m) {
          const parsed = JSON.parse(m[0]);
          reason = parsed.explanation || parsed.reason || reason;
        }
      } catch (e) {
        // ignore parsing errors and keep deterministic reason
      }
    }

    results.push({
      productId: p.id,
      productName: p.name,
      currentStock,
      predictedDemand: predicted14,
      recommendedOrder: recommended,
      priority,
      reason,
    });
  }

  // sort by priority and recommendedOrder
  results.sort((a, b) => {
    const rank = { high: 3, medium: 2, low: 1, none: 0 } as any;
    if (rank[b.priority] !== rank[a.priority]) return rank[b.priority] - rank[a.priority];
    return b.recommendedOrder - a.recommendedOrder;
  });

  return results;
}

export default { getRestockRecommendations };
