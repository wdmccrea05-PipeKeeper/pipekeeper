import React from 'react';
import PaywallModal from '@/components/paywalls/PaywallModal';

/**
 * Locked module paywall overlay
 * Shown when user tries to access a module they don't have
 */
export default function LockedModulePaywall({
  moduleKey,
  onUpgrade,
  onClose,
}) {
  return (
    <PaywallModal
      type="module"
      lockedModule={moduleKey}
      onClose={onClose}
    />
  );
}