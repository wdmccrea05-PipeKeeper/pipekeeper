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
  
  // RULE 3: Enforce module gating — disabled modules must not contribute data.
  // Tobacco gating is derived from PipeKeeper; there is no standalone tobacco gate.
  const gateCheck = {
    pipekeeper: stableModuleEnabled.pipekeeper === true,
    tobacco: stableModuleEnabled.pipekeeper === true,
    whiskeykeeper: stableModuleEnabled.whiskeykeeper === true,
    winekeeper: stableModuleEnabled.winekeeper === true,
  };

  const pipesGated = !gateCheck.pipekeeper && (context.pipes?.length || 0) > 0;
  const blendsGated = !gateCheck.tobacco && (context.blends?.length || 0) > 0;
  const bottlesGated = !gateCheck.whiskeykeeper && (context.bottles?.length || 0) > 0;
  const winesGated = !gateCheck.winekeeper && (context.wines?.length || 0) > 0;

  if (pipesGated || blendsGated || bottlesGated || winesGated) {
    // Intentional audit event — log gating violation without user record data.
    console.error('MODULE_GATE_VIOLATION', {
      pipesGated,
      blendsGated,
      bottlesGated,
      winesGated,
      modules: stableModuleEnabled,
    });
  }

  // Enforce: overwrite any data that leaked through from a disabled module.
  const enforcedContext = {
    ...context,
    pipes: gateCheck.pipekeeper ? (context.pipes || []) : [],
    blends: gateCheck.tobacco ? (context.blends || []) : [],
    smokingLogs: gateCheck.pipekeeper ? (context.smokingLogs || []) : [],
    pairingMatrixPairings: gateCheck.pipekeeper ? (context.pairingMatrixPairings || []) : [],
    bottles: gateCheck.whiskeykeeper ? (context.bottles || []) : [],
    tastingLogs: gateCheck.whiskeykeeper ? (context.tastingLogs || []) : [],
    inventoryUnits: gateCheck.whiskeykeeper ? (context.inventoryUnits || []) : [],
    wines: gateCheck.winekeeper ? (context.wines || []) : [],
    wineTastingLogs: gateCheck.winekeeper ? (context.wineTastingLogs || []) : [],
  };

  // RULE 9: Debug logging on context build (gated — never in production without explicit opt-in).
  if (import.meta.env.DEV || stableModuleEnabled?.curatorDebug === true) {
    console.debug('CURATOR_CONTEXT_BUILD', {
      dataCounts: {
        pipes: enforcedContext.pipes?.length || 0,
        blends: enforcedContext.blends?.length || 0,
        bottles: enforcedContext.bottles?.length || 0,
        wines: enforcedContext.wines?.length || 0,
        smokingLogs: enforcedContext.smokingLogs?.length || 0,
        tastingLogs: enforcedContext.tastingLogs?.length || 0,
        acquisitionItems: enforcedContext.acquisitionItems?.length || 0,
        hasWinePreferences: !!(enforcedContext.preferences?.wine_preferences || enforcedContext.winePreferences),
        pairingMatrixRows: enforcedContext.pairingMatrixPairings?.length || 0,
        scoredPairingPairs: (enforcedContext.pairingMatrixPairings || []).reduce(
          (sum, p) => sum + (Array.isArray(p?.recommendations) ? p.recommendations.filter((r) => r?.score != null).length : 0),
          0
        ),
      },
      activeModules: stableModuleEnabled,
      timestamp: new Date().toISOString(),
    });
  }

  return {
    ...enforcedContext,
    _buildStatus: 'success',
  };
}