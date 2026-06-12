import { useEffect, useState } from 'react';
import { supabase } from '../supabase';
import { Button } from './UI';

const demoMode = import.meta.env.VITE_DEMO_MODE === 'true';
const fallbackNotifications = [
  { id: 'demo-notif-1', agent_name: 'Low Stock Agent', task_type: 'low_stock', description: 'Restock Premium Pen Set to avoid stockouts.' },
  { id: 'demo-notif-2', agent_name: 'Demand Spike Agent', task_type: 'demand_spike', description: 'Wireless Charger demand is rising; consider replenishment now.' },
];

export default function NotificationsBell() {
  const [items, setItems] = useState([]);

  useEffect(() => {
    let mounted = true;
    const fetch = async () => {
      try {
        const userMod = await import('../supabase');
        const user = await userMod.getCurrentUser();
        const userId = user?.id;
        const { data } = await supabase.from('agent_tasks').select('*').in('priority', ['critical','high']).in('status', ['pending','processing']).eq('user_id', userId);
        if (!mounted) return;
        setItems(data || []);
      } catch (e) {
        console.error(e);
      }
    };
    fetch();
    const sub = supabase.channel('public:agent_tasks_notif').on('postgres_changes', { event: '*', schema: 'public', table: 'agent_tasks' }, () => { fetch(); }).subscribe();
    return () => { mounted = false; try { supabase.removeChannel(sub); } catch { /* ignore */ } };
  }, []);

  const visibleItems = items.length > 0 ? items : demoMode ? fallbackNotifications : [];
  const visibleCount = visibleItems.length;

  return (
    <div style={{ position: 'relative' }}>
      <Button variant="ghost">🔔 {visibleCount > 0 ? `(${visibleCount})` : ''}</Button>
      {visibleItems.length > 0 && (
        <div style={{ position: 'absolute', right: 0, marginTop: 8, width: 320 }} className="panel-card">
          <div style={{ fontWeight: 700 }}>Notifications</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 8 }}>
            {visibleItems.map(i => (
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
