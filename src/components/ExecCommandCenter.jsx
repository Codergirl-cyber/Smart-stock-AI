import { Card, Button } from './UI';
import agents from '../services/automation/agents';
import { generateBusinessReport } from '../services/ai/businessAnalyst';
import { useAuth } from '../hooks/useAuth';
import { useState } from 'react';

export default function ExecCommandCenter() {
  const { user } = useAuth();
  const [running, setRunning] = useState(false);

  const run = async () => {
    setRunning(true);
    try {
      await agents.runAgentsOnce(user?.id);
      await agents.processPendingTasks(user?.id);
    } catch (e) { console.error(e); }
    setRunning(false);
  };

  const runReport = async () => {
    setRunning(true);
    try {
      const r = await generateBusinessReport(user?.id);
      console.log('report', r);
      alert('Report generated — open console to inspect (or use export).');
    } catch (e) { console.error(e); }
    setRunning(false);
  };

  return (
    <Card>
      <h3 style={{ marginTop: 0 }}>Executive Command Center</h3>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <Button onClick={run} disabled={running}>{running ? 'Processing…' : 'Run Inventory Analysis'}</Button>
        <Button variant="secondary" onClick={runReport} disabled={running}>Generate Restock Plan</Button>
        <Button variant="ghost" onClick={() => agents.runAgentsOnce(user?.id)}>Review Risks</Button>
      </div>
    </Card>
  );
}
