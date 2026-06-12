import { useEffect, useState } from 'react';
import { getRestockRecommendations } from '../services/ai';

export function useRestockRecommendations() {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<any[]>([]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoading(true);
      try {
        const r = await getRestockRecommendations();
        if (!mounted) return;
        setData(r || []);
      } catch (e) { console.warn(e); }
      finally { if (mounted) setLoading(false); }
    })();
    return () => { mounted = false; };
  }, []);

  return { loading, data };
}

export default useRestockRecommendations;
