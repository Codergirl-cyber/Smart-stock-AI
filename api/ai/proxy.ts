import type { VercelRequest, VercelResponse } from '@vercel/node';
import { askOpenAI, askAnthropic } from '../../server/services/ai';

// Vercel serverless function: POST JSON { prompt, mode }
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });
  const body = req.body || {};
  const prompt = body.prompt || body.question || '';
  if (!prompt) return res.status(400).json({ error: 'Missing prompt' });

  // Try OpenAI then Anthropic, fallback to deterministic mock
  try {
    const openaiKey = process.env.OPENAI_API_KEY;
    const anthropicKey = process.env.ANTHROPIC_API_KEY;
    let reply = null;
    if (openaiKey) {
      reply = await askOpenAI(prompt, openaiKey);
    } else if (anthropicKey) {
      reply = await askAnthropic(prompt, anthropicKey);
    }
    if (!reply) {
      // deterministic mock
      reply = `Mock AI reply for: ${prompt.slice(0, 200)}`;
    }
    return res.status(200).json({ text: reply });
  } catch (e: any) {
    console.error('AI proxy error', e);
    return res.status(500).json({ error: e?.message || String(e) });
  }
}
