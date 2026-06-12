import { useEffect, useState, useRef } from 'react';
import { Card, Button, Input } from './UI';
import { askInventoryCopilot, getInventoryContext } from '../../services/ai/copilot';
import { useAuth } from '../hooks/useAuth';

const demoMode = import.meta.env.VITE_DEMO_MODE === 'true';

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

function renderMarkdown(text) {
  return text.split('\n').map((line, index) => <p key={index} style={{ margin: '6px 0', whiteSpace: 'pre-wrap' }}>{line}</p>);
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
    if (!user) return;
    (async () => {
      try {
        const ctx = await getInventoryContext(user.id);
        if (!mountedRef.current) return;
        setContextSummary({
          totalProducts: ctx.totalProducts,
          lowStock: ctx.lowStockProducts.length,
          top: ctx.topSellingProducts.slice(0, 3).map((t) => t.name),
        });
      } catch (e) {
        console.warn('copilot context error', e);
      }
    })();
  }, [user]);

  const sendQuestion = async (question) => {
    if (!question || !question.trim()) return;
    setLoading(true);
    const entry = { q: question, response: 'Loading answer…', status: 'pending', ts: Date.now() };
    setHistory((prev) => [entry, ...prev].slice(0, 10));

    try {
      const result = await askInventoryCopilot(question, user?.id);
      const text = typeof result === 'string' ? result : result?.text || 'No answer available at this time.';
      entry.response = text;
      entry.status = 'done';
      try {
        const k = window.localStorage.getItem('copilot-questions') || '0';
        window.localStorage.setItem('copilot-questions', String(Number(k) + 1));
      } catch {
        /* ignore local storage failures */
      }
    } catch {
      entry.response = 'Unable to fetch a recommendation right now. Try again shortly.';
      entry.status = 'error';
    } finally {
      if (!mountedRef.current) {
        setLoading(false);
      } else {
        setHistory((prev) => [entry, ...prev.filter((item) => item.ts !== entry.ts)].slice(0, 10));
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    if (!user) return;
    if (history.length === 0 && !loading) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      sendQuestion('Which products should I restock?');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, history.length, loading]);

  if (!user) return null;

  return (
    <Card style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap' }}>
        <div>
          <h3 style={{ margin: 0 }}>Inventory Copilot</h3>
          <div className="caption" style={{ color: 'var(--text-muted)' }}>Ask natural language questions about your inventory.</div>
          {contextSummary && (
            <div className="caption" style={{ marginTop: '10px' }}>
              {contextSummary.totalProducts} products • {contextSummary.lowStock} low stock • Top: {contextSummary.top.join(', ')}
            </div>
          )}
        </div>
        <div style={{ textAlign: 'right' }}>
          <div className="caption">Questions: {typeof window !== 'undefined' ? window.localStorage.getItem('copilot-questions') || 0 : 0}</div>
          {demoMode && <div className="caption" style={{ color: 'var(--accent)', marginTop: 6 }}>Demo mode active</div>}
        </div>
      </div>

      <Suggested onClick={(p) => { setInput(p); sendQuestion(p); }} />

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <Input value={input} onChange={(e) => setInput(e.target.value)} placeholder="Ask about inventory..." style={{ flex: 1, minWidth: '180px' }} />
        <Button onClick={() => { sendQuestion(input); setInput(''); }} disabled={loading}>{loading ? 'Thinking…' : 'Ask'}</Button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {history.length === 0 ? (
          <div className="body" style={{ color: 'var(--text-muted)' }}>Try: Which products should I restock?</div>
        ) : (
          history.map((entry) => (
            <div key={entry.ts} style={{ borderLeft: '3px solid var(--border-subtle)', paddingLeft: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}>
                <div style={{ fontWeight: 600 }}>{entry.q}</div>
                <div className="caption" style={{ color: entry.status === 'error' ? 'var(--error)' : 'var(--text-secondary)' }}>
                  {entry.status === 'pending' ? '…' : entry.status === 'error' ? 'Error' : 'Answered'}
                </div>
              </div>
              <div style={{ marginTop: 8, color: 'var(--text-muted)', fontSize: '13px' }}>
                {renderMarkdown(entry.response)}
              </div>
            </div>
          ))
        )}
      </div>
    </Card>
  );
}
