import { serve } from 'https://deno.land/std@0.201.0/http/server.ts';
import agentsProcessorModule from '../../../server/services/agentsProcessor.ts';

const SHARED_SECRET = Deno.env.get('AGENT_SIGNING_KEY') || '';

serve(async (req: Request) => {
  try {
    // Only allow internal invocation by checking a header or secret
    const sig = req.headers.get('x-signature') || '';
    if (!SHARED_SECRET || sig !== SHARED_SECRET) {
      return new Response(JSON.stringify({ ok: false, error: 'unauthorized' }), { status: 403, headers: { 'content-type': 'application/json' } });
    }

    const body = await req.json().catch(() => ({}));
    const limit = Number(body.limit || 50);
    const result = await agentsProcessorModule.processPendingTasksServer(limit);
    return new Response(JSON.stringify({ ok: true, ...result }), { status: 200, headers: { 'content-type': 'application/json' } });
  } catch (e) {
    console.error('agents-run error', e);
    return new Response(JSON.stringify({ ok: false, error: 'internal_error' }), { status: 500, headers: { 'content-type': 'application/json' } });
  }
});
