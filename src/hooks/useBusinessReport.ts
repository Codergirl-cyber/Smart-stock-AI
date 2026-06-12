import { useState } from 'react';
import { getBusinessReport } from '../services/ai';

export function useBusinessReport() {
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState<any>(null);

  const run = async () => {
    setLoading(true);
    try {
      const r = await getBusinessReport();
      setReport(r);
      return r;
    } finally { setLoading(false); }
  };

  return { loading, report, run };
}

export default useBusinessReport;
