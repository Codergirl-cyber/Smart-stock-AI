import { useState } from 'react';
import ai from '../services/ai';

export function useAI() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null as any);
  const [demo, setDemo] = useState(false);

  const ask = async (prompt: string) => {
    setLoading(true);
    try {
      const r = await ai.askAI(prompt);
      setResult(r.text);
      setDemo(!!r.demo);
      return r;
    } finally { setLoading(false); }
  };

  return { loading, result, demo, ask };
}

export default useAI;
