import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { base44 } from '@/api/base44Client';

function normalizeModules(value) {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.map((v) => String(v || '').trim().toLowerCase()).filter(Boolean))];
}

function hasModuleAccess(moduleName, paidModules = []) {
  return normalizeModules(paidModules).includes(String(moduleName || '').trim().toLowerCase());
}

export function useEntitlements() {
  const [status, setStatus] = useState({
    loading: true,
    syncing: false,
    ready: false,
    success: false,
    error: null,
    entitlementTier: 'free',
    hasPaidAccess: false,
    hasBundleAccess: false,
    paidModules: [],
    activeSubscriptions: [],
    cachedUserState: null,
  });

  const didInitRef = useRef(false);

  const loadStatus = useCallback(async () => {
    setStatus((prev) => ({
      ...prev,
      loading: true,
      error: null,
    }));

    try {
      const res = await base44.functions.invoke('checkUserSubscriptionStatus');
      const data = res?.data || res || {};

      if (!data?.success) {
        throw new Error(data?.error || 'Failed to load subscription status');
      }

      setStatus({
        loading: false,
        syncing: false,
        ready: true,
        success: true,
        error: null,
        entitlementTier: data.entitlementTier || 'free',
        hasPaidAccess: !!data.hasPaidAccess,
        hasBundleAccess: !!data.hasBundleAccess,
        paidModules: normalizeModules(data.paidModules),
        activeSubscriptions: Array.isArray(data.activeSubscriptions) ? data.activeSubscriptions : [],
        cachedUserState: data.cachedUserState || null,
      });

      return data;
    } catch (error) {
      setStatus((prev) => ({
        ...prev,
        loading: false,
        ready: true,
        success: false,
        error: error?.message || 'Failed to load entitlements',
      }));
      throw error;
    }
  }, []);

  const reconcileOnLogin = useCallback(async () => {
    try {
      await base44.functions.invoke('reconcileEntitlementsOnLogin', {});
    } catch (error) {
      console.warn('[useEntitlements] reconcileOnLogin failed:', error);
    }
  }, []);

  const fullSync = useCallback(async () => {
    setStatus((prev) => ({
      ...prev,
      syncing: true,
      error: null,
    }));

    try {
      const syncRes = await base44.functions.invoke('syncSubscriptionForMe', {});
      const syncData = syncRes?.data || syncRes || {};

      if (!syncData?.success) {
        throw new Error(syncData?.error || 'Subscription sync failed');
      }

      await loadStatus();
      return syncData;
    } catch (error) {
      setStatus((prev) => ({
        ...prev,
        syncing: false,
        error: error?.message || 'Subscription sync failed',
      }));
      throw error;
    } finally {
      setStatus((prev) => ({
        ...prev,
        syncing: false,
      }));
    }
  }, [loadStatus]);

  const refresh = useCallback(async ({ forceSync = false } = {}) => {
    if (forceSync) {
      return fullSync();
    }
    return loadStatus();
  }, [fullSync, loadStatus]);

  useEffect(() => {
    if (didInitRef.current) return;
    didInitRef.current = true;

    (async () => {
      try {
        await reconcileOnLogin();
      } finally {
        await loadStatus().catch((err) => {
          console.warn('[useEntitlements] initial load failed:', err);
        });
      }
    })();
  }, [reconcileOnLogin, loadStatus]);

  const api = useMemo(() => {
    const paidModules = normalizeModules(status.paidModules);

    return {
      ...status,
      paidModules,

      hasModuleAccess: (moduleName) => hasModuleAccess(moduleName, paidModules),

      hasAnyModuleAccess: (...moduleNames) =>
        moduleNames.some((moduleName) => hasModuleAccess(moduleName, paidModules)),

      hasAllModuleAccess: (...moduleNames) =>
        moduleNames.every((moduleName) => hasModuleAccess(moduleName, paidModules)),

      isFree: status.entitlementTier === 'free',
      isProLike: status.hasPaidAccess,
      isBundle: status.hasBundleAccess,

      refresh,
      fullSync,
      reconcileOnLogin,
    };
  }, [status, refresh, fullSync, reconcileOnLogin]);

  return api;
}

export default useEntitlements;
