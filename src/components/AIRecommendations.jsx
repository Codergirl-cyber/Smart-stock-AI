import { useEffect, useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { getRestockRecommendations } from '../../services/ai/restock';
import { Badge } from './UI';

export default function AIRecommendations() {
  const { user } = useAuth();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      setLoading(true);
      try {
        const recs = await getRestockRecommendations(user?.id);
        if (!mounted) return;
        setItems(recs.slice(0, 5));
      } catch (e) {
        console.error('AI recommendations error', e);
      } finally {
        if (mounted) setLoading(false);
      }
    };
    if (user) load();
    const handler = () => { if (user) load(); };
    window.addEventListener('sellersync-data-changed', handler);
    return () => { mounted = false; window.removeEventListener('sellersync-data-changed', handler); };
  }, [user]);

  if (!user) return null;

  return (
    <div className="panel-card">
      <h3 className="caption" style={{ marginBottom: '12px' }}>AI Restock Recommendations</h3>
      {loading ? (
        <div className="body">Loading recommendations…</div>
      ) : items.length === 0 ? (
        <div className="body">No recommendations at this time.</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {items.map((it) => (
            <div key={it.productId} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontWeight: 600 }}>{it.productName}</div>
                <div className="caption" style={{ color: 'var(--text-muted)' }}>{it.reason}</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontWeight: 700 }}>Order: {it.recommendedOrder}</div>
                <div style={{ marginTop: '6px' }}>
                  <Badge status={it.priority === 'high' ? 'error' : it.priority === 'medium' ? 'warning' : 'success'}>{it.priority.toUpperCase()}</Badge>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
