import { supabase } from '../../src/supabase';

const DEMO_MODE = import.meta.env.VITE_DEMO_MODE === 'true';

type InventoryContext = {
  totalProducts: number;
  lowStockProducts: Array<any>;
  topSellingProducts: Array<any>;
  totalRevenue: number;
  recentSales: Array<any>;
  products?: Array<any>;
};

async function fetchProducts(userId?: string) {
  const { data, error } = await supabase.from('products').select('*').eq('user_id', userId);
  if (error) throw error;
  return data || [];
}

async function fetchOrders(userId?: string) {
  const { data, error } = await supabase.from('orders').select('*').eq('user_id', userId);
  if (error) throw error;
  return data || [];
}

async function fetchOrderItems(userId?: string) {
  const { data, error } = await supabase.from('order_items').select('*').maybeSingle();
  // order_items likely not scoped by user in schema; fetch all and filter client-side
  const { data: itemsData, error: itemsError } = await supabase.from('order_items').select('*');
  if (itemsError) throw itemsError;
  return itemsData || [];
}

async function fetchTransactions(userId?: string) {
  const { data, error } = await supabase.from('transactions').select('*').eq('user_id', userId);
  if (error) throw error;
  return data || [];
}

async function fetchInventoryLogs(userId?: string) {
  const { data, error } = await supabase.from('inventory_logs').select('*').eq('user_id', userId).order('created_at', { ascending: false }).limit(100);
  if (error) return [];
  return data || [];
}

export async function getInventoryContext(userId?: string): Promise<InventoryContext> {
  const [products, orders, items, transactions, logs] = await Promise.all([
    fetchProducts(userId),
    fetchOrders(userId),
    fetchOrderItems(userId),
    fetchTransactions(userId),
    fetchInventoryLogs(userId),
  ]);

  const totalProducts = (products || []).length;
  // low stock: stock <= reorder_level
  const lowStockProducts = (products || []).filter((p: any) => Number(p.stock || 0) <= Number(p.reorder_level ?? 2)).slice(0, 20);

  // aggregate sales by product id over last 90 days
  const salesByProduct: Record<string, { qty: number; revenue: number; name?: string }> = {};
  const ninetyDaysAgo = new Date();
  ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
  const cutoff = ninetyDaysAgo.toISOString().split('T')[0];
  const recentSales: any[] = [];

  (orders || []).forEach((o: any) => {
    const d = o.order_date ? o.order_date.split('T')[0] : null;
    if (d && d >= cutoff) {
      recentSales.push(o);
    }
  });

  (items || []).forEach((it: any) => {
    const pid = it.product_id;
    salesByProduct[pid] = salesByProduct[pid] || { qty: 0, revenue: 0, name: it.product_name || '' };
    salesByProduct[pid].qty += Number(it.quantity || 0);
    salesByProduct[pid].revenue += Number(it.price || 0) * Number(it.quantity || 0);
  });

  const topSellingProducts = Object.entries(salesByProduct)
    .map(([id, v]) => ({ id, name: v.name, qty: v.qty, revenue: v.revenue }))
    .sort((a: any, b: any) => b.qty - a.qty)
    .slice(0, 10);

  const totalRevenue = (transactions || []).reduce((acc: number, t: any) => acc + (Number(t.amount) || 0), 0);

  return {
    totalProducts,
    lowStockProducts,
    topSellingProducts,
    totalRevenue,
    recentSales,
    products,
  };
}

function safeJsonString(obj: any) {
  try {
    return JSON.stringify(obj, null, 2);
  } catch (e) {
    return String(obj);
  }
}

async function callAi(prompt: string) {
  if (DEMO_MODE) return null;
  const openaiKey = (import.meta as any).env?.VITE_OPENAI_API_KEY;
  const anthropicKey = (import.meta as any).env?.VITE_ANTHROPIC_API_KEY;
  if (!openaiKey && !anthropicKey) return null;

  if (openaiKey) {
    try {
      const res = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${openaiKey}` },
        body: JSON.stringify({ model: 'gpt-4o-mini', messages: [{ role: 'user', content: prompt }], temperature: 0.2, max_tokens: 600 }),
      });
      const j = await res.json();
      return j?.choices?.[0]?.message?.content ?? null;
    } catch (e) {
      return null;
    }
  }

  if (anthropicKey) {
    try {
      const res = await fetch('https://api.anthropic.com/v1/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${anthropicKey}` },
        body: JSON.stringify({ model: 'claude-2', prompt, max_tokens_to_sample: 600 }),
      });
      const j = await res.json();
      return j?.completion ?? null;
    } catch (e) {
      return null;
    }
  }

  return null;
}

function formatMarkdownResponse(answerSections: any) {
  const lines: string[] = [];
  if (answerSections.summary) {
    lines.push('## Summary', '', answerSections.summary, '');
  }
  if (answerSections.recommendations) {
    lines.push('## Recommendations', '', answerSections.recommendations, '');
  }
  if (answerSections.risks) {
    lines.push('## Risks', '', answerSections.risks, '');
  }
  if (answerSections.actions) {
    lines.push('## Next Actions', '', answerSections.actions, '');
  }
  return lines.join('\n');
}

function fallbackAnswer(context: any, question: string) {
  const q = (question || '').toLowerCase();
  const products = context.products || [];
  const low = context.lowStockProducts || [];
  const top = context.topSellingProducts || [];

  const sections: any = { summary: '', recommendations: '', risks: '', actions: '' };

  if (q.includes('restock')) {
    sections.summary = `Found ${low.length} product(s) below reorder thresholds.`;
    sections.recommendations = low.slice(0, 10).map((p: any) => `- ${p.name || p.product_name || 'Unknown'} (Stock: ${p.stock || 0})`).join('\n');
    sections.risks = 'Products below reorder level may run out before next restock.';
    sections.actions = '1. Review low stock products.\n2. Create purchase orders for high priority items.';
    return formatMarkdownResponse(sections);
  }

  if (q.includes('selling fastest') || q.includes('fastest')) {
    sections.summary = 'Top selling products by quantity (last window):';
    sections.recommendations = top.slice(0, 8).map((t: any) => `- ${t.name || 'Unknown'} — ${t.qty} units`).join('\n');
    sections.actions = 'Consider ensuring adequate stock for top sellers, and review pricing or promotions.';
    return formatMarkdownResponse(sections);
  }

  if (q.includes('overstock')) {
    const over = (products || []).filter((p: any) => Number(p.stock || 0) > (Number(p.reorder_level ?? 2) * 4)).slice(0, 10);
    sections.summary = `Found ${over.length} potentially overstocked product(s).`;
    sections.recommendations = over.map((o: any) => `- ${o.name} (Stock: ${o.stock})`).join('\n') || 'None found.';
    sections.actions = 'Consider promotions, bundling, or discounts to reduce excess inventory.';
    return formatMarkdownResponse(sections);
  }

  // generic summary
  sections.summary = `Products: ${context.totalProducts}. Low stock: ${low.length}. Top sellers: ${top.slice(0,3).map((t:any)=>t.name).join(', ') || '—'}`;
  sections.recommendations = 'Ask a more specific question: e.g., "Which products should I restock?"';
  return formatMarkdownResponse(sections);
}

export async function askInventoryCopilot(question: string, userId?: string) {
  const ctx = await getInventoryContext(userId);
  const inventoryContext = safeJsonString(ctx);

  const systemPrompt = `You are an inventory management expert.\nBusiness data:\n${inventoryContext}\nUser question:\n${question}\n\nProvide a concise markdown answer with sections: Summary, Recommendations, Risks, Next Actions. Keep it actionable.`;

  // try AI
  const ai = await callAi(systemPrompt);
  if (ai) {
    // prefer model output directly
    return ai;
  }

  // fallback deterministic
  return fallbackAnswer(ctx, question);
}

export default { getInventoryContext, askInventoryCopilot };
