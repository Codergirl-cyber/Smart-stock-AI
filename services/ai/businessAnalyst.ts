import { supabase } from '../../src/supabase';

type BusinessReport = {
  generatedAt: string;
  executiveSummary: string;
  inventoryHealth: any;
  risks: any[];
  demandAnalysis: any;
  revenueAnalysis: any;
  recommendations: string[];
  actionPlan: { immediate: string[]; next7: string[]; next30: string[] };
};

async function fetchAll(userId?: string) {
  const [productsRes, ordersRes, itemsRes, transRes, logsRes] = await Promise.all([
    supabase.from('products').select('*').eq('user_id', userId),
    supabase.from('orders').select('*').eq('user_id', userId),
    supabase.from('order_items').select('*'),
    supabase.from('transactions').select('*').eq('user_id', userId),
    supabase.from('inventory_logs').select('*').eq('user_id', userId),
  ]);

  return {
    products: productsRes.data || [],
    orders: ordersRes.data || [],
    order_items: itemsRes.data || [],
    transactions: transRes.data || [],
    inventory_logs: logsRes.data || [],
  };
}

function computeInventoryHealth(products: any[]) {
  const total = products.length;
  const healthy = products.filter(p => Number(p.stock || 0) > Number(p.reorder_level ?? 2)).length;
  const low = products.filter(p => Number(p.stock || 0) <= Number(p.reorder_level ?? 2)).length;
  const overstock = products.filter(p => Number(p.stock || 0) > (Number(p.reorder_level ?? 2) * 4));
  const score = Math.round(((healthy - low) / Math.max(1, total)) * 100);
  return { total, healthy, low, overstock: overstock.slice(0, 20), score: Math.max(0, Math.min(100, score)) };
}

function analyzeRevenue(transactions: any[], orders: any[]) {
  // compute revenue in last 30 days and previous 30 days
  const now = new Date();
  const last30 = new Date(); last30.setDate(now.getDate() - 30);
  const prev30 = new Date(); prev30.setDate(now.getDate() - 60);

  let revenueLast = 0; let revenuePrev = 0;
  transactions.forEach(t => {
    const d = t.created_at ? new Date(t.created_at) : null;
    if (!d) return;
    if (d >= last30) revenueLast += Number(t.amount || 0);
    else if (d >= prev30 && d < last30) revenuePrev += Number(t.amount || 0);
  });

  const growth = revenuePrev === 0 ? (revenueLast > 0 ? 100 : 0) : Math.round(((revenueLast - revenuePrev) / Math.abs(revenuePrev)) * 100);

  // top products by revenue from orders/order_items
  const revByProduct: Record<string, number> = {};
  orders.forEach(o => {
    if (o.product_name && o.price) revByProduct[o.product_name] = (revByProduct[o.product_name] || 0) + Number(o.price || 0);
  });
  const top = Object.entries(revByProduct).map(([name, rev]) => ({ name, revenue: rev })).sort((a,b)=>b.revenue-a.revenue).slice(0,10);

  return { revenueLast, revenuePrev, growthPercent: growth, topProducts: top };
}

function riskAnalysis(products: any[], order_items: any[]) {
  const risks: any[] = [];
  // stockout risks
  products.forEach(p => {
    if (Number(p.stock || 0) <= 0) {
      risks.push({ product: p.name, level: 'HIGH', reason: 'Out of stock' });
    }
  });

  // slow moving: no sales in last 60 days
  const soldProductIds = new Set(order_items.map((it: any) => it.product_id));
  products.forEach(p => {
    if (!soldProductIds.has(p.id)) {
      risks.push({ product: p.name, level: 'LOW', reason: 'No recent sales' });
    }
  });

  // excess inventory
  products.forEach(p => {
    if (Number(p.stock || 0) > (Number(p.reorder_level ?? 2) * 6)) {
      risks.push({ product: p.name, level: 'MEDIUM', reason: 'Potential overstock' });
    }
  });

  return risks;
}

function demandOverview(order_items: any[]) {
  const salesByProduct: Record<string, number> = {};
  order_items.forEach(it => {
    salesByProduct[it.product_id] = (salesByProduct[it.product_id] || 0) + Number(it.quantity || 0);
  });
  const top = Object.entries(salesByProduct).map(([id, qty]) => ({ id, qty })).sort((a,b)=>b.qty-a.qty).slice(0,10);
  return { topSelling: top };
}

async function callAi(prompt: string) {
  const openaiKey = (import.meta as any).env?.VITE_OPENAI_API_KEY;
  const anthropicKey = (import.meta as any).env?.VITE_ANTHROPIC_API_KEY;
  if (!openaiKey && !anthropicKey) return null;
  if (openaiKey) {
    try {
      const res = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${openaiKey}` },
        body: JSON.stringify({ model: 'gpt-4o-mini', messages: [{ role: 'user', content: prompt }], temperature: 0.2, max_tokens: 1000 }),
      });
      const j = await res.json();
      return j?.choices?.[0]?.message?.content ?? null;
    } catch (e) { return null; }
  }
  if (anthropicKey) {
    try {
      const res = await fetch('https://api.anthropic.com/v1/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${anthropicKey}` },
        body: JSON.stringify({ model: 'claude-2', prompt, max_tokens_to_sample: 1000 }),
      });
      const j = await res.json();
      return j?.completion ?? null;
    } catch (e) { return null; }
  }
  return null;
}

export async function generateBusinessReport(userId?: string): Promise<BusinessReport> {
  const { products, orders, order_items, transactions, inventory_logs } = await fetchAll(userId);

  const inventoryHealth = computeInventoryHealth(products || []);
  const revenueAnalysis = analyzeRevenue(transactions || [], orders || []);
  const risks = riskAnalysis(products || [], order_items || []);
  const demand = demandOverview(order_items || []);

  const execSummary = `Inventory health is ${inventoryHealth.score >= 70 ? 'GOOD' : inventoryHealth.score >=40 ? 'FAIR' : 'POOR' }. Revenue ${revenueAnalysis.growthPercent >=0 ? 'increased' : 'decreased'} ${Math.abs(revenueAnalysis.growthPercent)}% compared to the previous period. ${inventoryHealth.low} product(s) require attention.`;

  const recommendations = [] as string[];
  // simple recommendations
  if (inventoryHealth.low > 0) recommendations.push(`Restock ${inventoryHealth.low} product(s) below reorder levels.`);
  if (inventoryHealth.overstock.length > 0) recommendations.push(`Consider promotions for ${inventoryHealth.overstock.length} overstocked SKUs.`);
  if (revenueAnalysis.growthPercent < 0) recommendations.push('Investigate drop in revenue; review top customer segments and promotions.');

  const actionPlan = {
    immediate: inventoryHealth.low > 0 ? [`Place replenishment orders for ${inventoryHealth.low} SKUs`] : ['No immediate restocks required'],
    next7: ['Review supplier lead times', 'Run promotions for slow-moving SKUs'],
    next30: ['Adjust reorder points based on demand forecasts', 'Schedule quarterly inventory audit']
  };

  const report: BusinessReport = {
    generatedAt: new Date().toISOString(),
    executiveSummary: execSummary,
    inventoryHealth,
    risks,
    demandAnalysis: demand,
    revenueAnalysis,
    recommendations,
    actionPlan,
  };

  // Try AI augmentation
  const aiPrompt = `You are a senior inventory consultant. Analyze this business data and return a structured JSON report with fields: executiveSummary, inventoryHealth, risks, demandAnalysis, revenueAnalysis, recommendations (array of strings), actionPlan (immediate,next7,next30 arrays). Business data:\n${JSON.stringify({ inventoryHealth, revenueAnalysis, risks, demand: demand })}`;
  const ai = await callAi(aiPrompt);
  if (ai) {
    // attempt to parse JSON from model
    try {
      const m = ai.match(/\{[\s\S]*\}/m);
      if (m) {
        const parsed = JSON.parse(m[0]);
        // merge parsed where available
        return { ...report, ...parsed, generatedAt: report.generatedAt } as BusinessReport;
      }
    } catch (e) {
      // ignore parsing issues and return deterministic report
    }
  }

  return report;
}

export default { generateBusinessReport };
