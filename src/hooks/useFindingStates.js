import { useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { loadFindingStates, saveFindingState } from '@/lib/actions/findingState';

/**
 * Loads the collector's finding decisions and persists new ones. The findings
 * themselves are always rebuilt from the records, so this only ever holds what
 * the collector chose to defer, dismiss or mark resolved.
 */
export function useFindingStates(user) {
  const email = user?.email;
  const queryClient = useQueryClient();
  const { data: states = {}, isLoading: loading, error, refetch: reload } = useQuery({
    queryKey: ['finding-states', email],
    queryFn: () => loadFindingStates(email),
    enabled: Boolean(email),
  });

  const setState = useCallback(
    async (finding, status) => {
      if (!email || !finding?.key) return null;
      try {
        const row = await saveFindingState({ email, finding, status });
        queryClient.setQueryData(['finding-states', email], (prev = {}) => ({
          ...prev,
          [finding.key]: { id: row?.id, status, note: row?.note || '', resolved_at: row?.resolved_at || null },
        }));
        return row;
      } catch (error) {
        toast.error(error?.message || 'Could not save the finding decision.');
        return null;
      }
    },
    [email, queryClient]
  );

  return { states, loading, error, reload, setState };
}

export default useFindingStates;