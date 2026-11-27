import { useCallback, useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useCurrentUser } from '@/components/hooks/useCurrentUser';
import { APPRECIATION_CAMPAIGN_ID } from '@/components/utils/appreciationGrant';

const DISMISS_EVENT = 'ck-appreciation-dismissed';
let impressionSent = false;

const dismissKey = (email) => `ck_appreciation_dismissed_${email}_${APPRECIATION_CAMPAIGN_ID}`;
const expiredKey = (email, endsAt) => `ck_appreciation_expired_seen_${email}_${endsAt || 'none'}`;

function readFlag(key) {
  try {
    return localStorage.getItem(key) === '1';
  } catch {
    return false;
  }
}

function writeFlag(key) {
  try {
    localStorage.setItem(key, '1');
  } catch {
    /* storage unavailable — the offer simply reappears next session */
  }
}

/**
 * Single source for the existing-collector appreciation offer in the UI.
 * Eligibility and the grant itself come from the backend; this hook only
 * presents them, records funnel events and triggers the redemption.
 */
export function useAppreciationCampaign({ surface = 'hub' } = {}) {
  const { user, isLoading: userLoading, hasPaid, refetch, complimentary } = useCurrentUser();
  const queryClient = useQueryClient();
  const email = user?.email || null;

  const [dismissed, setDismissed] = useState(false);
  const [activating, setActivating] = useState(false);
  const [activateError, setActivateError] = useState(null);
  const [activatedGrant, setActivatedGrant] = useState(null);

  useEffect(() => {
    setDismissed(email ? readFlag(dismissKey(email)) : false);
  }, [email]);

  useEffect(() => {
    const handler = () => setDismissed(email ? readFlag(dismissKey(email)) : false);
    window.addEventListener(DISMISS_EVENT, handler);
    return () => window.removeEventListener(DISMISS_EVENT, handler);
  }, [email]);

  const { data: status, isLoading: statusLoading } = useQuery({
    queryKey: ['appreciationCampaign', email],
    queryFn: async () => {
      const response = await base44.functions.invoke('getAppreciationCampaign', {});
      return response?.data || null;
    },
    enabled: !!email && !hasPaid,
    staleTime: 60000,
  });

  const grantActive = Boolean(status?.grant?.active) || Boolean(complimentary?.appreciation?.active);
  const eligible = Boolean(status?.eligible) && !grantActive && !hasPaid;
  const isLoading = userLoading || (!!email && !hasPaid && statusLoading);

  const record = useCallback(
    (eventType, extra = {}) => {
      if (!email) return;
      base44.functions
        .invoke('recordAppreciationEvent', { event_type: eventType, surface, ...extra })
        .catch(() => {});
    },
    [email, surface]
  );

  const recordImpression = useCallback(() => {
    if (!email || impressionSent) return;
    impressionSent = true;
    record('impression');
  }, [email, record]);

  const dismiss = useCallback(() => {
    if (!email) return;
    writeFlag(dismissKey(email));
    setDismissed(true);
    window.dispatchEvent(new Event(DISMISS_EVENT));
    record('dismissal');
  }, [email, record]);

  const activate = useCallback(async () => {
    if (activating) return { ok: false, code: 'in_flight' };
    setActivating(true);
    setActivateError(null);
    try {
      const response = await base44.functions.invoke('activateAppreciationCampaign', {});
      const data = response?.data || {};
      if (data.ok) {
        setActivatedGrant(data.grant || null);
        queryClient.invalidateQueries({ queryKey: ['appreciationCampaign', email] });
        await refetch();
        return data;
      }
      setActivateError(data.code || 'activation_failed');
      return data;
    } catch (error) {
      setActivateError('activation_failed');
      return { ok: false, code: 'activation_failed' };
    } finally {
      setActivating(false);
    }
  }, [activating, email, queryClient, refetch]);

  const expiredGrant = (() => {
    const fromStatus = status?.grant;
    if (fromStatus?.known && !fromStatus.active) return fromStatus;
    if (complimentary?.appreciation?.expired) return complimentary.appreciation;
    return null;
  })();

  const activeGrant = activatedGrant?.active
    ? activatedGrant
    : status?.grant?.active
      ? status.grant
      : complimentary?.appreciation?.active
        ? complimentary.appreciation
        : null;

  return {
    isLoading,
    hasPaid,
    eligible,
    status,
    reason: status?.reason || null,
    activeGrant,
    expiredGrant,
    activateError,
    activating,
    dismissed,
    showBanner: eligible && !dismissed,
    showOffer: eligible,
    recordImpression,
    recordFeatureUse: (feature, module) => record('feature_use', { feature, module }),
    recordExpiredNotice: () => record('expired_notice'),
    recordConfirmationView: () => record('activation_confirmation_view'),
    expiredKey: email && expiredGrant ? expiredKey(email, expiredGrant.endsAt) : null,
    activate,
    dismiss,
  };
}

export default useAppreciationCampaign;