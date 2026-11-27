import { useCallback, useEffect, useState } from 'react';
import { loadFindingStates, saveFindingState } from '@/lib/actions/findingState';

/**
 * Loads the collector's finding decisions and persists new ones. The findings
 * themselves are always rebuilt from the records, so this only ever holds what
 * the collector chose to defer, dismiss or mark resolved.
 */
export function useFindingStates(user) {
  const email = user?.email;
  const [states, setStates] = useState({});
  const [loading, setLoading] = useState(false);

  const reload = useCallback(async () => {
    if (!email) {
      setStates({});
      return;
    }
    setLoading(true);
    try {
      setStates(await loadFindingStates(email));
    } finally {
      setLoading(false);
    }
  }, [email]);

  useEffect(() => {
    reload();
  }, [reload]);

  const setState = useCallback(
    async (finding, status) => {
      if (!email || !finding?.key) return null;
      const row = await saveFindingState({ email, finding, status });
      setStates((prev) => ({
        ...prev,
        [finding.key]: { id: row?.id, status, note: row?.note || '', resolved_at: row?.resolved_at || null },
      }));
      return row;
    },
    [email]
  );

  return { states, loading, reload, setState };
}

export default useFindingStates;