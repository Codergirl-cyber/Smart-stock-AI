import agents from './agents';
import { supabase } from '../../src/supabase';

let intervalId: any = null;

export function startAgentRunner(userId?: string) {
  if (intervalId) return;
  // run immediately then every 60 seconds
  (async () => { try { await agents.runAgentsOnce(userId); await agents.processPendingTasks(userId); } catch(e){} })();
  intervalId = setInterval(async () => {
    try {
      await agents.runAgentsOnce(userId);
      await agents.processPendingTasks(userId);
    } catch (e) { console.error('agent runner error', e); }
  }, 60 * 1000);
}

export function stopAgentRunner() {
  if (!intervalId) return;
  clearInterval(intervalId); intervalId = null;
}
