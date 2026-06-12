import { useEffect, useState } from 'react';
import { Card } from './UI';
import { supabase } from '../supabase';

const demoMode = import.meta.env.VITE_DEMO_MODE === 'true';

const fallbackTasks = [
  { id: 'demo-task-1', _type: 'task', agent_name: 'Low Stock Agent', task_type: 'low_stock', description: 'Executive Notebook stock is below reorder level.', priority: 'high', status: 'processing' },
  { id: 'demo-task-2', _type: 'task', agent_name: 'Demand Spike Agent', task_type: 'demand_spike', description: 'Premium Pen Set demand has increased 32% week-over-week.', priority: 'medium', status: 'completed' },
  { id: 'demo-task-3', _type: 'exec', agent_name: 'Auto Replenishment Agent', task_type: 'execution', result: { message: 'Restock plan created for 3 SKUs.' }, status: 'completed' },
];

export default function AgentActivity() {
  const [tasks, setTasks] = useState([]);

  useEffect(() => {
    let mounted = true;
    const fetch = async () => {
      try {
        const user = await (await import('../supabase')).getCurrentUser();
        const userId = user?.id;
        const [{ data: tasksData }, { data: logsData }] = await Promise.all([
          supabase.from('agent_tasks').select('*').order('created_at', { ascending: false }).limit(12).eq('user_id', userId),
          supabase.from('agent_execution_logs').select('*').order('created_at', { ascending: false }).limit(12).eq('user_id', userId),
        ]);
        if (!mounted) return;
        setTasks((tasksData || []).map((t) => ({ ...t, _type: 'task' })).concat((logsData || []).map((l) => ({ ...l, _type: 'exec' }))).slice(0, 24));
      } catch (e) { console.error(e); }
    };
    fetch();
    const sub = supabase.channel('public:agent_tasks').on('postgres_changes', { event: '*', schema: 'public', table: 'agent_tasks' }, () => { fetch(); }).subscribe();
    return () => { mounted = false; try { supabase.removeChannel(sub); } catch { /* ignore */ } };
  }, []);

  const visibleTasks = tasks.length > 0 ? tasks : demoMode ? fallbackTasks : [];

  return (
    <Card>
      <h3 style={{ marginTop: 0 }}>AI Agent Activity</h3>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {visibleTasks.length === 0 && <div className="caption" style={{ color: 'var(--text-muted)' }}>No recent agent actions.</div>}
        {visibleTasks.map((t) => (
          <div key={t.id} style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
            <div>
              <div style={{ fontWeight: 600 }}>{t._type === 'task' ? `${t.agent_name} · ${t.task_type}` : `${t.agent_name} · execution`}</div>
              <div className="caption" style={{ color: 'var(--text-muted)' }}>{t._type === 'task' ? t.description : JSON.stringify(t.result)}</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div className="mono">{t._type === 'task' ? t.priority : ''}</div>
              <div className="caption">{t._type === 'task' ? t.status : t.status}</div>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}
