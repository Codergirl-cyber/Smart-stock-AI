import { useEffect, useState } from 'react';
import { getDemandForecast } from '../services/ai';

export function useDemandForecast(productId?: string) {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoading(true);
      try {
        const r = await getDemandForecast(productId);
        if (!mounted) return;
        setData(r);
      } catch (e) { console.warn(e); }
      finally { if (mounted) setLoading(false); }
    })();
    return () => { mounted = false; };
  }, [productId]);

  return { loading, data };
}

export default useDemandForecast;
