import { supabase } from '../../src/supabase';

export async function runAgentsOnce(userId?: string) {
  // Fetch minimal data
  const [{ data: products }, { data: items }, { data: orders }] = await Promise.all([
    supabase.from('products').select('id, name, stock, reorder_level, user_id').eq('user_id', userId),
    supabase.from('order_items').select('product_id, quantity, created_at, product_name'),
    supabase.from('orders').select('id, order_date, user_id').eq('user_id', userId),
  ]);

  const prods = products || [];
  const orderItems = items || [];

  // Low Stock Agent
  for (const p of prods) {
    const stock = Number(p.stock || 0);
    const reorder = Number(p.reorder_level ?? 2);
    if (stock <= reorder) {
      // create task if not exists pending
      const desc = `Product ${p.name} (id:${p.id}) stock=${stock} <= reorder_level=${reorder}`;
      await ensureTask('Low Stock Agent', 'low_stock', 'high', desc, { productId: p.id, stock });
    }
  }

  // Demand Spike Agent: compare last 7 days vs previous 7 days
  const now = new Date();
  const last7 = new Date(); last7.setDate(now.getDate() - 7);
  const prev7 = new Date(); prev7.setDate(now.getDate() - 14);

  const salesLast7: Record<string, number> = {};
  const salesPrev7: Record<string, number> = {};
  orderItems.forEach((it: any) => {
    if (!it.created_at) return;
    const d = new Date(it.created_at);
    const pid = it.product_id;
    if (d >= last7) salesLast7[pid] = (salesLast7[pid] || 0) + Number(it.quantity || 0);
    else if (d >= prev7 && d < last7) salesPrev7[pid] = (salesPrev7[pid] || 0) + Number(it.quantity || 0);
  });

  Object.keys(salesLast7).forEach(pid => {
    const last = salesLast7[pid] || 0; const prev = salesPrev7[pid] || 0;
    if (prev === 0 && last >= 5) {
      ensureTask('Demand Spike Agent', 'demand_spike', 'high', `Product ${pid} sales increased from ${prev} to ${last}`, { productId: pid, last, prev });
    } else if (prev > 0 && (last / prev) >= 2.0) {
      ensureTask('Demand Spike Agent', 'demand_spike', 'medium', `Product ${pid} sales doubled (${prev} → ${last})`, { productId: pid, last, prev });
    }
  });

  // Slow Moving Inventory Agent: no sales in last 30 days
  const cutoff30 = new Date(); cutoff30.setDate(now.getDate() - 30);
  const soldIds = new Set(orderItems.filter((it:any)=> new Date(it.created_at) >= cutoff30).map((it:any)=>it.product_id));
  prods.forEach((p:any) => {
    if (!soldIds.has(p.id)) {
      ensureTask('Slow Moving Agent', 'slow_moving', 'low', `No sales for product ${p.name} in 30 days`, { productId: p.id });
    }
  });

  // Revenue Risk Agent: high selling products nearing stockout
  // compute sales per product overall
  const totalSales: Record<string, number> = {};
  orderItems.forEach((it:any)=> { totalSales[it.product_id] = (totalSales[it.product_id]||0) + Number(it.quantity||0); });
  const top = Object.entries(totalSales).sort((a:any,b:any)=>b[1]-a[1]).slice(0,10);
  for (const [pid, qty] of top) {
    const p = prods.find((x:any)=>x.id === pid);
    if (!p) continue;
    const stock = Number(p.stock || 0); const reorder = Number(p.reorder_level ?? 2);
    if (stock <= reorder * 1.5) {
      ensureTask('Revenue Risk Agent', 'revenue_risk', 'critical', `High-selling product ${p.name} (sold ${qty}) nearing stockout (stock=${stock})`, { productId: pid, sold: qty });
    }
  }
}

async function ensureTask(agent_name: string, task_type: string, priority: string, description: string, meta: any) {
  try {
    // check existing pending task with same agent and product
    const { data } = await supabase.from('agent_tasks').select('*').eq('agent_name', agent_name).eq('task_type', task_type).eq('status', 'pending').limit(1);
    if (data && data.length > 0) return;
    await supabase.from('agent_tasks').insert([{ agent_name, task_type, priority, status: 'pending', description, meta }]);
  } catch (e) {
    console.error('ensureTask error', e);
  }
}

export async function processPendingTasks(userId?: string) {
  try {
    const { data } = await supabase.from('agent_tasks').select('*').eq('status', 'pending').order('created_at', { ascending: true }).limit(10);
    const tasks = data || [];
    for (const t of tasks) {
      await supabase.from('agent_tasks').update({ status: 'processing' }).eq('id', t.id);
      // Simulate processing — in real world this would call external systems or create purchase orders
      // For demo, we'll mark completed and append a note to description
      await new Promise(r => setTimeout(r, 300));
      await supabase.from('agent_tasks').update({ status: 'completed', description: (t.description || '') + ' — processed' }).eq('id', t.id);
    }
  } catch (e) { console.error('processPendingTasks error', e); }
}

export default { runAgentsOnce, processPendingTasks };
