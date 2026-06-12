import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SUPABASE_SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE || '';
if (!SUPABASE_SERVICE_ROLE) {
  console.warn('SUPABASE_SERVICE_ROLE not set — agentsProcessor will be limited or in demo mode.');
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE);

export async function processPendingTasksServer(limit = 20) {
  if (!SUPABASE_SERVICE_ROLE) return { error: 'no_service_role' };
  const { data: tasks } = await supabase.from('agent_tasks').select('*').eq('status', 'pending').order('created_at', { ascending: true }).limit(limit);
  const processed: any[] = [];
  for (const t of tasks || []) {
    try {
      await supabase.from('agent_tasks').update({ status: 'processing' }).eq('id', t.id);
      const result = await executeTask(t);
      await supabase.from('agent_execution_logs').insert([{ task_id: t.id, agent_name: t.agent_name, status: 'completed', result, user_id: t.user_id, created_by: 'system' }]);
      await supabase.from('agent_tasks').update({ status: 'completed' }).eq('id', t.id);
      processed.push({ id: t.id, ok: true, result });
    } catch (e: any) {
      await supabase.from('agent_execution_logs').insert([{ task_id: t.id, agent_name: t.agent_name, status: 'failed', result: { error: e?.message || String(e) }, user_id: t.user_id, created_by: 'system' }]);
      await supabase.from('agent_tasks').update({ status: 'dismissed' }).eq('id', t.id);
      processed.push({ id: t.id, ok: false, error: e?.message || String(e) });
    }
  }
  return { tasksProcessed: processed.length, processed };
}

async function executeTask(task: any) {
  const agent = task.agent_name;
  // Demo processing logic — in real system this would call other services
  if (agent === 'Low Stock Agent') {
    return { message: `Generated restock recommendation for ${task.meta?.productId || 'unknown'}`, recomm: [{ productId: task.meta?.productId, qty: 20 }] };
  }
  if (agent === 'Demand Spike Agent') {
    return { message: `Demand spike analyzed for ${task.meta?.productId || 'unknown'}`, urgency: 'high' };
  }
  if (agent === 'Slow Moving Agent') {
    return { message: `Flagged slow-moving SKU ${task.meta?.productId || 'unknown'}`, action: 'discount_suggestion' };
  }
  if (agent === 'Revenue Risk Agent') {
    return { message: `Revenue risk processed for ${task.meta?.productId || 'unknown'}`, priority: 'critical' };
  }
  return { message: 'No-op', info: task };
}

export default { processPendingTasksServer };
