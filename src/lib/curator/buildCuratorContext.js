/**
 * CANONICAL CURATOR CONTEXT BUILDER
 * 
 * Single source of truth for collection data & module gating.
 * Called ONCE per load in CuratorWorkspace.
 * No component may build its own context or re-filter module data.
 */

export async function buildCuratorContextWithLogging(
  user,
  buildContextFn,
  stableModuleEnabled
) {
  if (!user?.email || !buildContextFn) {
    return {
      pipes: [],
      blends: [],
      bottles: [],
      smokingLogs: [],
      tastingLogs: [],
      inventoryUnits: [],
      acquisitionItems: [],
      preferences: {},
      activeModules: stableModuleEnabled,
      _buildStatus: 'no_auth',
    };
  }

  const context = await buildContextFn();
  
  // RULE 3: Verify module gating
  const gateCheck = {
    pipekeeper: stableModuleEnabled.pipekeeper !== false,
    tobacco: stableModuleEnabled.tobacco !== false,
    whiskeykeeper: stableModuleEnabled.whiskeykeeper !== false,
    winekeeper: stableModuleEnabled.winekeeper !== false,
  };
  
  const pipesGated = !gateCheck.pipekeeper && context.pipes.length > 0;
  const blendsGated = !gateCheck.tobacco && context.blends.length > 0;
  const bottlesGated = !gateCheck.whiskeykeeper && context.bottles.length > 0;
  const winesGated = !gateCheck.winekeeper && (context.wines?.length || 0) > 0;
  
  if (pipesGated || blendsGated || bottlesGated || winesGated) {
    console.error('MODULE_GATE_VIOLATION', {
      pipesGated,
      blendsGated,
      bottlesGated,
      winesGated,
      modules: stableModuleEnabled,
    });
  }

  // RULE 9: Debug logging on context build
  console.log('CURATOR_CONTEXT_BUILD', {
    dataCounts: {
      pipes: context.pipes?.length || 0,
      blends: context.blends?.length || 0,
      bottles: context.bottles?.length || 0,
      wines: context.wines?.length || 0,
      smokingLogs: context.smokingLogs?.length || 0,
      tastingLogs: context.tastingLogs?.length || 0,
      acquisitionItems: context.acquisitionItems?.length || 0,
      hasWinePreferences: !!(context.preferences?.wine_preferences || context.winePreferences),
      pairingMatrixRows: context.pairingMatrixPairings?.length || 0,
      scoredPairingPairs: (context.pairingMatrixPairings || []).reduce(
        (sum, p) => sum + (Array.isArray(p?.recommendations) ? p.recommendations.filter((r) => r?.score != null).length : 0),
        0
      ),
    },
    activeModules: stableModuleEnabled,
    timestamp: new Date().toISOString(),
  });

  return {
    ...context,
    _buildStatus: 'success',
  };
}