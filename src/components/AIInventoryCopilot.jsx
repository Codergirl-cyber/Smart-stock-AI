import { useEffect, useState, useRef } from 'react';
import { Card, Button, Input } from './UI';
import { askInventoryCopilot, getInventoryContext } from '../../services/ai/copilot';
import { useAuth } from '../hooks/useAuth';

function Suggested({ onClick }) {
  const prompts = [
    'Which products should I restock?',
    'What inventory risks exist this week?',
    'Summarize inventory performance.',
    'What products may stock out soon?',
    'Which products generate the most revenue?'
  ];
  return (
    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
      {prompts.map((p) => (
        <Button key={p} variant="ghost" onClick={() => onClick(p)} style={{ padding: '6px 10px' }}>{p}</Button>
      ))}
    </div>
  );
}

export default function AIInventoryCopilot() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [input, setInput] = useState('');
  const [history, setHistory] = useState([]);
  const [contextSummary, setContextSummary] = useState(null);
  const mountedRef = useRef(true);

  useEffect(() => { return () => { mountedRef.current = false; }; }, []);

  useEffect(() => {
    (async () => {
      try {
        const ctx = await getInventoryContext(user?.id);
        if (!mountedRef.current) return;
        setContextSummary({ totalProducts: ctx.totalProducts, lowStock: ctx.lowStockProducts.length, top: ctx.topSellingProducts.slice(0,3).map((t:any)=>t.name) });
      } catch (e) {
        console.warn('copilot context error', e);
      }
    })();
  }, [user]);

  const sendQuestion = async (q) => {
    if (!q || !q.trim()) return;
    setLoading(true);
    const entry = { q, response: null, status: 'pending', ts: Date.now() };
    setHistory((h) => [entry, ...h].slice(0, 10));
    try {
      const res = await askInventoryCopilot(q, user?.id);
      entry.response = res;
      entry.status = 'done';
      // analytics
      try { const k = localStorage.getItem('copilot-questions') || '0'; localStorage.setItem('copilot-questions', String(Number(k)+1)); } catch(e){}
    } catch (e) {
      entry.response = 'Error generating answer.';
      entry.status = 'error';
    } finally {
      setHistory((h) => [entry, ...h.filter((x)=>x !== entry)].slice(0, 10));
      setLoading(false);
    }
  };

  return (
    <Card style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h3 style={{ margin: 0 }}>Inventory Copilot</h3>
          <div className="caption" style={{ color: 'var(--text-muted)' }}>Ask natural language questions about your inventory.</div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div className="caption">Questions: {localStorage.getItem('copilot-questions') || 0}</div>
        </div>
      </div>

      <div>
        <Suggested onClick={(p) => { setInput(p); sendQuestion(p); }} />
      </div>

      <div style={{ display: 'flex', gap: 8 }}>
        <Input value={input} onChange={(e) => setInput(e.target.value)} placeholder="Ask about inventory..." />
        <Button onClick={() => { sendQuestion(input); setInput(''); }} disabled={loading}>{loading ? 'Thinking…' : 'Ask'}</Button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {history.length === 0 && (
          <div className="body" style={{ color: 'var(--text-muted)' }}>Try: Which products should I restock?</div>
        )}
        {history.map((h, i) => (
          <div key={h.ts} style={{ borderLeft: '3px solid var(--border-subtle)', paddingLeft: 10 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <div style={{ fontWeight: 600 }}>{h.q}</div>
              <div className="caption">{h.status === 'pending' ? '…' : ''}</div>
            </div>
            <div style={{ marginTop: 6 }} dangerouslySetInnerHTML={{ __html: (h.response || '').replace(/\n/g, '<br/>') }} />
          </div>
        ))}
      </div>
    </Card>
  );
}
