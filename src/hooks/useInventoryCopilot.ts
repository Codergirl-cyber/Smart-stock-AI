import { useState } from 'react';
import { askInventoryCopilot } from '../services/ai';

export function useInventoryCopilot() {
  const [loading, setLoading] = useState(false);
  const [responses, setResponses] = useState<any[]>([]);

  const ask = async (question: string) => {
    setLoading(true);
    try {
      const r = await askInventoryCopilot(question);
      setResponses((s) => [{ q: question, text: r.text, demo: r.demo }, ...s].slice(0, 20));
      return r;
    } finally { setLoading(false); }
  };

  return { loading, responses, ask };
}

export default useInventoryCopilot;
