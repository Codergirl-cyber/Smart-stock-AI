import fetch from 'node-fetch';

export async function askOpenAI(prompt: string, key?: string) {
  const openaiKey = key || process.env.OPENAI_API_KEY;
  if (!openaiKey) return null;
  try {
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${openaiKey}` },
      body: JSON.stringify({ model: 'gpt-4o-mini', messages: [{ role: 'user', content: prompt }], temperature: 0.2, max_tokens: 800 }),
    });
    const j = await res.json();
    return j?.choices?.[0]?.message?.content ?? null;
  } catch (e) {
    console.error('askOpenAI error', e);
    return null;
  }
}

export async function askAnthropic(prompt: string, key?: string) {
  const anthropicKey = key || process.env.ANTHROPIC_API_KEY;
  if (!anthropicKey) return null;
  try {
    const res = await fetch('https://api.anthropic.com/v1/complete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${anthropicKey}` },
      body: JSON.stringify({ model: 'claude-2', prompt, max_tokens_to_sample: 800 }),
    });
    const j = await res.json();
    return j?.completion ?? null;
  } catch (e) {
    console.error('askAnthropic error', e);
    return null;
  }
}

// Server-side helper that returns mock response when keys missing
export async function askAI(prompt: string) {
  const resp = await askOpenAI(prompt);
  if (resp) return resp;
  const resp2 = await askAnthropic(prompt);
  if (resp2) return resp2;
  // deterministic fallback
  return `DEMO ANSWER:\nThis is a deterministic mock response for the prompt: ${prompt.slice(0, 200)}...`;
}

export default { askOpenAI, askAnthropic, askAI };
