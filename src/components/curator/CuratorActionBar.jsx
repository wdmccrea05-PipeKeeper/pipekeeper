import { useMemo, useCallback } from 'react';
import { getVisibleActions, buildActionLaunchContext } from './curatorActions';
import { filterCuratorActions } from './curatorActionVisibility';
import { useEnabledModules } from '@/components/hooks/useEnabledModules';
import { useTranslation } from '@/components/i18n/safeTranslation';
import { logCuratorEvent } from '@/components/utils/curatorEventLogger';

// IDs of primary "hero" actions — get large prominent cards
const PRIMARY_ACTION_IDS = ['session_builder', 'optimize_collection', 'cigar_smoke_now'];

// Secondary group definitions — ordered
const SECONDARY_GROUPS = [
  {
    key: 'optimize',
    label: 'Optimize & Maintain',
    actionIds: ['recommend_specializations', 'optimize_whiskey_collection', 'reclassify_tobacco_blends', 'update_pipe_measurements', 'update_bottle_data', 'cigar_rest_longer'],
  },
  {
    key: 'discovery',
    label: 'Discovery',
    actionIds: ['find_similar_blends', 'find_similar_pipes', 'find_similar_bottles', 'cigar_buy_again', 'cigar_pairing_suggestions'],
  },
];

function PrimaryActionCard({ action, collectionContext, onActionClick, disabled }) {
  const Icon = action.icon;
  const desc = typeof action.description === 'function' ? action.description(collectionContext) : action.description;
  return (
    <button
      type="button"
      onClick={() => onActionClick(action)}
      disabled={disabled}
      className="relative group text-left transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed w-full"
      style={{ WebkitTapHighlightColor: 'transparent' }}
    >
      <div
        className="rounded-xl px-4 py-4 h-full transition-all"
        style={{
          background: 'linear-gradient(135deg, rgba(100,68,38,0.35), rgba(65,42,22,0.45))',
          border: '1px solid rgba(180,140,75,0.3)',
        }}
      >
        <div className="flex flex-col gap-2">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
            style={{ background: 'rgba(180,140,75,0.15)' }}
          >
            <Icon className="w-4 h-4" style={{ color: 'rgba(200,165,90,0.9)' }} />
          </div>
          <div>
            <div
              className="text-sm font-bold leading-tight"
              style={{ color: '#F5F1E7', fontFamily: "'Georgia', serif" }}
            >
              {action.label}
            </div>
            <div
              className="text-xs mt-1 leading-snug"
              style={{ color: 'rgba(224,216,200,0.65)' }}
            >
              {desc}
            </div>
          </div>
        </div>
      </div>
      <div
        className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity"
        style={{ background: 'rgba(163,92,92,0.08)' }}
      />
    </button>
  );
}

function SecondaryActionButton({ action, collectionContext, onActionClick, disabled }) {
  const Icon = action.icon;
  const desc = typeof action.description === 'function' ? action.description(collectionContext) : action.description;
  return (
    <button
      type="button"
      onClick={() => onActionClick(action)}
      disabled={disabled}
      className="relative group text-left transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
      style={{ WebkitTapHighlightColor: 'transparent' }}
    >
      <div
        className="rounded-lg px-3 py-2.5 transition-all"
        style={{
          background: 'rgba(60,40,25,0.3)',
          border: '1px solid rgba(140,105,65,0.2)',
        }}
      >
        <div className="flex items-start gap-2">
          <Icon className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" style={{ color: 'rgba(180,140,75,0.7)' }} />
          <div className="flex-1 min-w-0">
            <div className="text-xs font-semibold leading-tight" style={{ color: '#E0D8C8' }}>
              {action.label}
            </div>
            <div className="text-xs mt-0.5 leading-tight" style={{ color: 'rgba(224,216,200,0.55)' }}>
              {desc}
            </div>
          </div>
        </div>
      </div>
      <div
        className="absolute inset-0 rounded-lg opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity"
        style={{ background: 'rgba(163,92,92,0.07)' }}
      />
    </button>
  );
}

/**
 * Curator Action Bar — hierarchical expert action layout.
 * Primary featured actions shown as large prominent cards.
 * Secondary actions grouped by theme below.
 */
export default function CuratorActionBar({
  pipes = [],
  blends = [],
  bottles = [],
  tastingLogs = [],
  smokingLogs = [],
  cigars = [],
  cigarSessions = [],
  userProfile = null,
  curatorScope = "all",
  enabledModules = null,
  onActionSelect = null,
  disabled = false,
}) {
  const { t } = useTranslation();
  const { enabled: hookEnabled } = useEnabledModules();
  const enabled = enabledModules || hookEnabled;

  const collectionContext = useMemo(
    () => ({
      pipes,
      blends,
      bottles,
      tastingLogs,
      smokingLogs,
      cigars,
      cigarSessions,
      userProfile,
      curatorScope,
    }),
    [pipes, blends, bottles, tastingLogs, smokingLogs, cigars, cigarSessions, userProfile, curatorScope]
  );

  const visibleActions = useMemo(() => {
    const actions = getVisibleActions(collectionContext);
    return filterCuratorActions(actions, enabled);
  }, [collectionContext, enabled]);

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
              cigars: cigars.length,
              smokingLogs: smokingLogs.length,
            },
          },
        });
      } catch (e) {
        console.warn('Failed to log curator action event:', e);
      }

      onActionSelect(launchContext);
    },
    [collectionContext, pipes.length, blends.length, bottles.length, cigars.length, smokingLogs.length, onActionSelect]
  );

  if (visibleActions.length === 0) {
    return null;
  }

  const visibleIds = new Set(visibleActions.map((a) => a.id));

  // Split into primary and secondary
  const primaryActions = PRIMARY_ACTION_IDS
    .filter((id) => visibleIds.has(id))
    .map((id) => visibleActions.find((a) => a.id === id));

  // Build secondary groups (only include actions that are visible and not primary)
  const secondaryGrouped = SECONDARY_GROUPS.map((group) => ({
    ...group,
    actions: group.actionIds
      .filter((id) => visibleIds.has(id) && !PRIMARY_ACTION_IDS.includes(id))
      .map((id) => visibleActions.find((a) => a.id === id)),
  })).filter((g) => g.actions.length > 0);

  // Catch-all: any visible action not in primary or secondary groups
  const coveredIds = new Set([
    ...PRIMARY_ACTION_IDS,
    ...SECONDARY_GROUPS.flatMap((g) => g.actionIds),
  ]);
  const uncategorized = visibleActions.filter(
    (a) => !coveredIds.has(a.id) && !PRIMARY_ACTION_IDS.includes(a.id)
  );

  return (
    <div className="space-y-4">
      {/* Primary featured actions */}
      {primaryActions.length > 0 && (
        <div>
          <p
            className="text-xs uppercase tracking-wider font-semibold mb-2"
            style={{ color: 'rgba(180,140,75,0.55)' }}
          >
            {t('curator.featuredActions', 'Quick Start')}
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            {primaryActions.map((action) => (
              <PrimaryActionCard
                key={action.id}
                action={action}
                collectionContext={collectionContext}
                onActionClick={handleActionClick}
                disabled={disabled}
              />
            ))}
          </div>
        </div>
      )}

      {/* Secondary grouped actions */}
      {secondaryGrouped.map((group) => (
        <div key={group.key}>
          <p
            className="text-xs uppercase tracking-wider font-semibold mb-2"
            style={{ color: 'rgba(180,140,75,0.5)' }}
          >
            {group.label}
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
            {group.actions.map((action) => (
              <SecondaryActionButton
                key={action.id}
                action={action}
                collectionContext={collectionContext}
                onActionClick={handleActionClick}
                disabled={disabled}
              />
            ))}
          </div>
        </div>
      ))}

      {/* Uncategorized fallback */}
      {uncategorized.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
          {uncategorized.map((action) => (
            <SecondaryActionButton
              key={action.id}
              action={action}
              collectionContext={collectionContext}
              onActionClick={handleActionClick}
              disabled={disabled}
            />
          ))}
        </div>
      )}
    </div>
  );
}