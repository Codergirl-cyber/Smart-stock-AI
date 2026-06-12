import { useEffect, useState } from 'react';
import { Card } from './UI';
import { supabase } from '../supabase';

export default function AgentActivity() {
  const [tasks, setTasks] = useState([]);

  useEffect(() => {
    let mounted = true;
    const fetch = async () => {
      try {
        const [{ data: tasksData }, { data: logsData }] = await Promise.all([
          supabase.from('agent_tasks').select('*').order('created_at', { ascending: false }).limit(12),
          supabase.from('agent_execution_logs').select('*').order('created_at', { ascending: false }).limit(12),
        ]);
        if (!mounted) return;
        setTasks((tasksData || []).map((t:any)=>({ ...t, _type: 'task' })).concat((logsData || []).map((l:any)=>({ ...l, _type: 'exec' }))).slice(0, 24));
      } catch (e) { console.error(e); }
    };
    fetch();
    const sub = supabase.channel('public:agent_tasks').on('postgres_changes', { event: '*', schema: 'public', table: 'agent_tasks' }, payload => { fetch(); }).subscribe();
    return () => { mounted = false; try { supabase.removeChannel(sub); } catch(e){} };
  }, []);

  return (
    <Card>
      <h3 style={{ marginTop: 0 }}>AI Agent Activity</h3>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {tasks.length === 0 && <div className="caption" style={{ color: 'var(--text-muted)' }}>No recent agent actions.</div>}
        {tasks.map((t) => (
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
