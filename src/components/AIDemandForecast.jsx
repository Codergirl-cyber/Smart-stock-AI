import { useEffect, useState } from 'react';
import { getDemandForecast } from '../../services/ai/demandForecast';
import { Button } from './UI';

function MiniLineChart({ history = [], forecast = [] }) {
  // render simple SVG line chart combining history and forecast
  const total = history.length + forecast.length;
  const data = [...history, ...forecast];
  const max = Math.max(...data, 1);
  const w = 320, h = 120, pad = 10;
  const points = data.map((v, i) => {
    const x = pad + (i / (total - 1 || 1)) * (w - pad * 2);
    const y = h - pad - (v / max) * (h - pad * 2);
    return [x, y];
  });
  const histPoints = points.slice(0, history.length).map(p => p.join(',')).join(' ');
  const fcPoints = points.slice(history.length).map(p => p.join(',')).join(' ');
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`}>
      <polyline fill="none" stroke="#e6e6e6" strokeWidth={2} points={points.map(p=>p.join(',')).join(' ')} />
      <polyline fill="none" stroke="#2563eb" strokeWidth={2} points={histPoints} />
      <polyline fill="none" stroke="#ef4444" strokeWidth={2} strokeDasharray="4 4" points={fcPoints} />
    </svg>
  );
}

export default function AIDemandForecast({ productId, onClose }) {
  const [forecast, setForecast] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoading(true);
      try {
        const f = await getDemandForecast(productId);
        if (!mounted) return;
        setForecast(f);
      } catch (e) {
        console.error('demand forecast error', e);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [productId]);

  if (loading) return <div className="panel-card">Loading forecast…</div>;
  if (!forecast) return <div className="panel-card">No forecast available.</div>;

  // compute forecast array for chart
  const history = forecast.history || [];
  const fcArr = Array(7).fill(Math.ceil(forecast.next7DayForecast / 7));

  return (
    <div style={{ position: 'fixed', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1200 }}>
      <div onClick={onClose} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.4)' }} />
      <div style={{ position: 'relative', width: 740, maxWidth: '95%', background: 'var(--surface)', padding: 24, borderRadius: 12 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
          <div>
            <h3 style={{ margin: 0 }}>{forecast.productName}</h3>
            <div className="caption">Trend: <strong>{forecast.trend}</strong> · Confidence: {forecast.confidence}%</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div>Current stock: <strong>{forecast.currentStock}</strong></div>
            <div>Next 7 days: <strong>{forecast.next7DayForecast}</strong></div>
            <div>Next 30 days: <strong>{forecast.next30DayForecast}</strong></div>
            <div style={{ marginTop: 8 }}><Button onClick={onClose}>Close</Button></div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 24 }}>
          <MiniLineChart history={history} forecast={fcArr} />
          <div style={{ flex: 1 }}>
            <h4>Explanation</h4>
            <p className="body" style={{ color: 'var(--text-muted)' }}>{forecast.explanation || 'Deterministic forecast based on recent sales.'}</p>
            <h4>Coverage</h4>
            <p className="body">Stock will last approximately <strong>{forecast.currentStock && forecast.avgDaily ? Math.max(0, Math.floor(forecast.currentStock / (forecast.avgDaily || 1))) : '—'}</strong> days at current average sales.</p>
            <h4>Suggested reorder</h4>
            <p className="body">Order <strong>{Math.max(0, forecast.next30DayForecast - forecast.currentStock)}</strong> units to cover predicted 30-day demand.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
