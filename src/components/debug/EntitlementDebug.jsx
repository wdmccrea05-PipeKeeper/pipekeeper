import React, { useState, useEffect } from 'react';
import { useCurrentUser } from '@/components/hooks/useCurrentUser';
import { isLegacyPremium, isFoundingMember } from '@/components/utils/premiumAccess';
import { ChevronDown, ChevronUp, Copy, Check, Download } from 'lucide-react';
import { toast } from 'sonner';
import { downloadMissingKeysReport, clearMissingKeys } from '@/components/i18n/missingKeyRegistry';

// Detect dev mode using Vite's import.meta.env (browser-safe)
function isDevMode() {
  return import.meta.env.DEV === true;
}

// Safe debug param detector
function getDebugParam() {
  if (typeof window === 'undefined') return false;
  try {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams?.get('debug') === '1';
  } catch {
    return false;
  }
}

// Safe clipboard copy
function copyToClipboard(text) {
  if (typeof navigator === 'undefined' || !navigator.clipboard) {
    console.warn('[EntitlementDebug] Clipboard API not available');
    return false;
  }
  
  try {
    navigator.clipboard.writeText(text);
    return true;
  } catch (e) {
    console.error('[EntitlementDebug] Copy failed:', e);
    return false;
  }
}

// Debug component - only visible in dev or (admin + ?debug=1)
export default function EntitlementDebug() {
  const [isExpanded, setIsExpanded] = useState(false);
  const [justCopied, setJustCopied] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  const { user, subscription, isLoading, hasPaid, hasPremium, isInTrial, isAdmin } = useCurrentUser();

  // Safely check visibility after mount to avoid hydration mismatch
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Only render if mounted AND conditions are met
  if (!isMounted || isLoading || !user?.email) return null;
  
  const devMode = isDevMode();
  const debugParam = getDebugParam();
  const adminDebugMode = isAdmin && debugParam;
  
  if (!devMode && !adminDebugMode) return null;

  const isLegacy = isLegacyPremium(subscription);
  const isFounder = isFoundingMember(user);

  // Determine plan source
  const planSource = subscription?.stripe_subscription_id ? 'Stripe' : 
                     subscription?.id ? 'Apple IAP' : 'None';

  const snapshot = {
    tier: subscription?.tier || 'free',
    isOnTrial: isInTrial,
    subscriptionStartedAt: subscription?.subscriptionStartedAt || null,
    isLegacyPremium: isLegacy,
    isFoundingMember: isFounder,
    planSource,
    canUseSummary: hasPremium
  };

  const handleCopySnapshot = () => {
    const copied = copyToClipboard(JSON.stringify(snapshot, null, 2));
    if (copied) {
      setJustCopied(true);
      setTimeout(() => setJustCopied(false), 2000);
      toast.success('Snapshot copied');
    } else {
      toast.error('Copy failed - clipboard unavailable');
    }
  };

  const handleDownloadI18nReport = () => {
    downloadMissingKeysReport();
    toast.success('i18n report downloaded');
  };

  const handleClearI18nReport = () => {
    clearMissingKeys();
    toast.success('i18n report cleared');
  };

  return (
    <div className="fixed bottom-4 right-4 max-w-xs bg-black/95 text-white/80 text-xs p-3 rounded-lg border border-yellow-600/50 font-mono z-40 shadow-lg">
      <div className="flex items-center justify-between gap-2 mb-2">
        <div className="text-yellow-500 font-bold flex items-center gap-1">
          <span>🔍 Debug</span>
          {!isDevMode() && <span className="text-blue-400 text-[10px]">(Admin)</span>}
        </div>
        <div className="flex gap-1">
          <button
            onClick={handleDownloadI18nReport}
            className="hover:bg-white/10 p-1 rounded transition-colors"
            title="Download i18n report"
          >
            <Download className="w-3 h-3 text-white/60" />
          </button>
          <button
            onClick={handleCopySnapshot}
            className="hover:bg-white/10 p-1 rounded transition-colors"
            title="Copy snapshot"
          >
            {justCopied ? (
              <Check className="w-3 h-3 text-green-400" />
            ) : (
              <Copy className="w-3 h-3 text-white/60" />
            )}
          </button>
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="hover:bg-white/10 p-1 rounded transition-colors"
          >
            {isExpanded ? (
              <ChevronUp className="w-3 h-3" />
            ) : (
              <ChevronDown className="w-3 h-3" />
            )}
          </button>
        </div>
      </div>

      {isExpanded && (
        <div className="space-y-1 border-t border-white/10 pt-2">
          <div>Tier: <span className="text-blue-400">{snapshot.tier}</span></div>
          <div>Paid: <span className={hasPaid ? 'text-green-400' : 'text-red-400'}>{hasPaid ? 'Yes' : 'No'}</span></div>
          <div>Premium: <span className={hasPremium ? 'text-green-400' : 'text-red-400'}>{hasPremium ? 'Yes' : 'No'}</span></div>
          <div>Trial: <span className={isInTrial ? 'text-orange-400' : 'text-gray-500'}>{isInTrial ? 'Yes' : 'No'}</span></div>
          <div>Legacy: <span className={isLegacy ? 'text-purple-400' : 'text-gray-500'}>{isLegacy ? 'Yes' : 'No'}</span></div>
          <div>Founder: <span className={isFounder ? 'text-amber-400' : 'text-gray-500'}>{isFounder ? 'Yes' : 'No'}</span></div>
          <div>Source: <span className="text-cyan-400">{planSource}</span></div>
          <div className="text-gray-400 mt-1">Started: {snapshot.subscriptionStartedAt?.split('T')[0] || 'N/A'}</div>
        </div>
      )}
    </div>
  );
}