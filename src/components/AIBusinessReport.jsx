import { useState } from 'react';
import { Card, Button } from './UI';
import { generateBusinessReport } from '../../services/ai/businessAnalyst';
import { useAuth } from '../hooks/useAuth';

function HealthGauge({ score = 0 }) {
  const pct = Math.max(0, Math.min(100, score));
  const r = 36; const c = 2 * Math.PI * r; const dash = (pct / 100) * c;
  const color = pct >= 70 ? '#10b981' : pct >= 40 ? '#f59e0b' : '#ef4444';
  return (
    <svg width={100} height={100} viewBox="0 0 100 100">
      <g transform="translate(50,50)">
        <circle r={r} stroke="#eef2f7" strokeWidth={8} fill="none" />
        <circle r={r} stroke={color} strokeWidth={8} fill="none" strokeLinecap="round" strokeDasharray={`${dash} ${c - dash}`} transform="rotate(-90)" />
        <text x="0" y="6" textAnchor="middle" fontSize="14" fontWeight="700">{pct}%</text>
      </g>
    </svg>
  );
}

export default function AIBusinessReportWidget() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState(null);

  const runAnalysis = async () => {
    setLoading(true);
    try {
      const r = await generateBusinessReport(user?.id);
      setReport(r);
      try { localStorage.setItem('lastAnalysis', r.generatedAt); } catch (e) {}
    } catch (e) {
      console.error('analysis error', e);
    } finally { setLoading(false); }
  };

  const exportJSON = () => {
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `seller-sync-report-${new Date().toISOString()}.json`; a.click(); URL.revokeObjectURL(url);
  };

  const exportCSV = () => {
    if (!report) return;
    const rows = [['section', 'key', 'value']];
    rows.push(['executiveSummary', '', report.executiveSummary]);
    rows.push(['inventoryHealth', 'score', report.inventoryHealth.score]);
    const csv = rows.map(r => r.map(c => `"${String(c).replace(/"/g,'""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = `seller-sync-report-${new Date().toISOString()}.csv`; a.click(); URL.revokeObjectURL(url);
  };

  return (
    <Card style={{ display: 'flex', gap: 12, alignItems: 'center', justifyContent: 'space-between' }}>
      <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
        <HealthGauge score={report?.inventoryHealth?.score ?? 0} />
        <div>
          <h3 style={{ margin: 0 }}>AI Business Analyst</h3>
          <div className="caption" style={{ color: 'var(--text-muted)' }}>{report ? `Last: ${new Date(report.generatedAt).toLocaleString()}` : 'No analysis yet.'}</div>
          <div style={{ marginTop: 8 }} className="caption">Health: {report?.inventoryHealth?.score ?? '—'}</div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 8 }}>
        <Button onClick={runAnalysis} disabled={loading}>{loading ? 'Running…' : 'Run AI Analysis'}</Button>
        <Button variant="secondary" onClick={exportJSON} disabled={!report}>Export JSON</Button>
        <Button variant="ghost" onClick={exportCSV} disabled={!report}>Export CSV</Button>
      </div>

      {/* Detailed report preview below */}
      {report && (
        <div style={{ position: 'absolute', left: 20, right: 20, top: '110px', zIndex: 1100 }}>
          <div className="panel-card">
            <h3>Executive Summary</h3>
            <p>{report.executiveSummary}</p>
            <h4>Recommendations</h4>
            <ul>{report.recommendations.map((r,i)=>(<li key={i}>{r}</li>))}</ul>
          </div>
        </div>
      )}
    </Card>
  );
}
