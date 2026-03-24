import { useMemo, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { CURATOR_ACTIONS, getVisibleActions, buildActionLaunchContext } from './curatorActions.js';
import { useTranslation } from '@/components/i18n/safeTranslation';
import { logCuratorEvent } from '@/components/utils/curatorEventLogger';

/**
 * Curator Action Bar — displays expert actions as visible buttons
 * Clicking an action seeds the Curator workspace with a structured prompt
 */
export default function CuratorActionBar({
  pipes = [],
  blends = [],
  bottles = [],
  tastingLogs = [],
  smokingLogs = [],
  userProfile = null,
  onActionSelect = null,
  disabled = false,
}) {
  const { t } = useTranslation();

  const collectionContext = useMemo(
    () => ({ pipes, blends, bottles, tastingLogs, smokingLogs, userProfile }),
    [pipes, blends, bottles, tastingLogs, smokingLogs, userProfile]
  );

  const visibleActions = useMemo(() => {
    return getVisibleActions(collectionContext);
  }, [collectionContext]);

  const handleActionClick = useCallback(
    async (action) => {
      if (!onActionSelect) return;

      const launchContext = buildActionLaunchContext(action, collectionContext);
      if (!launchContext) {
        console.error(`Failed to build launch context for ${action.id}`);
        return;
      }

      try {
        await logCuratorEvent({
          eventName: action.eventName,
          metadata: {
            action_id: action.id,
            source_expert: action.sourceExpert,
            collection_size: {
              pipes: pipes.length,
              blends: blends.length,
              bottles: bottles.length,
              smokingLogs: smokingLogs.length,
            },
          },
        });
      } catch (e) {
        console.warn('Failed to log curator action event:', e);
      }

      onActionSelect(launchContext);
    },
    [collectionContext, pipes.length, blends.length, bottles.length, smokingLogs.length, onActionSelect]
  );

  if (visibleActions.length === 0) {
    return null;
  }

  return (
    <div className="space-y-3">
      <div className="px-2">
        <p
          className="text-xs uppercase tracking-wider font-semibold"
          style={{ color: 'rgba(180,140,75,0.6)' }}
        >
          {t('curator.expertActions', 'Expert Actions')}
        </p>
        <p className="text-xs mt-1" style={{ color: 'rgba(224,216,200,0.5)' }}>
          {t('curator.expertActionsDesc', 'Structured workflows to enrich and optimize your collection')}
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 px-2">
        {visibleActions.map((action) => {
          const Icon = action.icon;
          return (
            <button
              key={action.id}
              onClick={() => handleActionClick(action)}
              disabled={disabled}
              className="relative group text-left transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ WebkitTapHighlightColor: 'transparent' }}
            >
              <div
                className="rounded-lg px-3 py-2.5 border transition-all"
                style={{
                  background: 'linear-gradient(135deg, rgba(80,55,35,0.3), rgba(60,40,25,0.4))',
                  border: '1px solid rgba(140,105,65,0.25)',
                  borderColor: 'rgba(140,105,65,0.25)',
                }}
              >
                <div className="flex items-start gap-2">
                  <Icon
                    className="w-4 h-4 mt-0.5 flex-shrink-0"
                    style={{ color: 'rgba(180,140,75,0.8)' }}
                  />
                  <div className="flex-1 min-w-0">
                    <div
                      className="text-xs font-semibold leading-tight"
                      style={{ color: '#E0D8C8' }}
                    >
                      {action.label}
                    </div>
                    <div
                      className="text-xs mt-0.5 leading-tight"
                      style={{ color: 'rgba(224,216,200,0.6)' }}
                    >
                      {action.description}
                    </div>
                  </div>
                </div>
              </div>

              <div
                className="absolute inset-0 rounded-lg opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity"
                style={{
                  background: 'linear-gradient(135deg, rgba(163,92,92,0.1), rgba(100,70,45,0.1))',
                }}
              />
            </button>
          );
        })}
      </div>
    </div>
  );
}