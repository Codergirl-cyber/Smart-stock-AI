import type { VercelRequest, VercelResponse } from '@vercel/node';
import crypto from 'crypto';
import agentsProcessor from '../../server/services/agentsProcessor';

const SHARED_SECRET = process.env.AGENT_SIGNING_KEY || '';

function verifySignature(body: string, sig: string | undefined) {
  if (!SHARED_SECRET) return false;
  if (!sig) return false;
  const h = crypto.createHmac('sha256', SHARED_SECRET).update(body).digest('hex');
  return crypto.timingSafeEqual(Buffer.from(h), Buffer.from(sig));
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ ok: false, error: 'method_not_allowed' });
  const sig = req.headers['x-signature'] as string | undefined;
  const body = JSON.stringify(req.body || {});
  if (!verifySignature(body, sig)) return res.status(403).json({ ok: false, error: 'invalid_signature' });

  // Validate service role env
  if (!process.env.SUPABASE_SERVICE_ROLE) return res.status(500).json({ ok: false, error: 'missing_service_role' });

  try {
    const result = await agentsProcessor.processPendingTasksServer(Number(req.body.limit || 50));
    return res.status(200).json({ ok: true, ...result });
  } catch (e: any) {
    console.error('agent process error', e);
    return res.status(500).json({ ok: false, error: e?.message || String(e) });
  }
}
