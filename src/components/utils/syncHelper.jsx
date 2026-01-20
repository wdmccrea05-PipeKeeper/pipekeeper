// Utility to manually trigger subscription sync for debugging/support
import { base44 } from "@/api/base44Client";

export async function triggerSubscriptionSync() {
  try {
    const response = await base44.functions.invoke('syncSubscriptionForMe');
    
    if (!response?.data) {
      throw new Error('No response from sync function');
    }

    if (!response.data.ok) {
      throw new Error(response.data.error || 'Sync failed');
    }

    return {
      success: true,
      data: response.data,
      message: response.data.message || 'Subscription synced successfully',
    };
  } catch (error) {
    console.error('Sync error:', error);
    return {
      success: false,
      error: error.message || 'Failed to sync subscription',
    };
  }
}

export function useSyncButton() {
  const [syncing, setSyncing] = React.useState(false);
  const [lastSyncResult, setLastSyncResult] = React.useState(null);

  const handleSync = async () => {
    setSyncing(true);
    const result = await triggerSubscriptionSync();
    setLastSyncResult(result);
    setSyncing(false);
    return result;
  };

  return {
    syncing,
    lastSyncResult,
    handleSync,
  };
}