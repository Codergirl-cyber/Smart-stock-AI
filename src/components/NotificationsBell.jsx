import { useEffect, useState } from 'react';
import { supabase } from '../supabase';
import { Button } from './UI';

export default function NotificationsBell() {
  const [count, setCount] = useState(0);
  const [items, setItems] = useState([]);

  useEffect(() => {
    let mounted = true;
    const fetch = async () => {
      try {
        const { data } = await supabase.from('agent_tasks').select('*').in('priority', ['critical','high']).in('status', ['pending','processing']);
        if (!mounted) return;
        setItems(data || []);
        setCount((data || []).length);
      } catch (e) { console.error(e); }
    };
    fetch();
    const sub = supabase.channel('public:agent_tasks_notif').on('postgres_changes', { event: '*', schema: 'public', table: 'agent_tasks' }, payload => { fetch(); }).subscribe();
    return () => { mounted = false; try { supabase.removeChannel(sub); } catch(e){} };
  }, []);

  return (
    <div style={{ position: 'relative' }}>
      <Button variant="ghost">🔔 {count > 0 ? `(${count})` : ''}</Button>
      {items.length > 0 && (
        <div style={{ position: 'absolute', right: 0, marginTop: 8, width: 320 }} className="panel-card">
          <div style={{ fontWeight: 700 }}>Notifications</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 8 }}>
            {items.map(i => (
              <div key={i.id}>
                <div style={{ fontWeight: 600 }}>{i.agent_name} · {i.task_type}</div>
                <div className="caption" style={{ color: 'var(--text-muted)' }}>{i.description}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
