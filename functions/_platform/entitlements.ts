// functions/_platform/entitlements.ts
// Module entitlement architecture (backend) — mirrors src/platform/entitlements.js.
//
// Prepares the entitlement system to support multiple collection modules
// without changing current PipeKeeper subscription behavior.
// All existing subscriptions remain fully intact.

export const PLATFORM_MODULES = {
  PIPE: "pipes",
  TOBACCO: "tobacco",
  WHISKEY: "whiskey",
  CIGAR: "cigars",
  COFFEE: "coffee",
} as const;

export type PlatformModule = (typeof PLATFORM_MODULES)[keyof typeof PLATFORM_MODULES];

// Modules enabled for all current PipeKeeper subscribers.
export const PIPEKEEPER_ENABLED_MODULES: PlatformModule[] = [
  PLATFORM_MODULES.PIPE,
  PLATFORM_MODULES.TOBACCO,
];

/**
 * Returns true if the given module is enabled for a user.
 * Currently always returns true for pipes and tobacco (PipeKeeper behavior).
 */
export function isModuleEnabled(
  moduleKey: string,
  enabledModules: string[] = PIPEKEEPER_ENABLED_MODULES
): boolean {
  return enabledModules.includes(moduleKey);
}

/**
 * Return the list of enabled modules for a user.
 * For the current PipeKeeper build this is always the default list.
 */
export function getEnabledModules(userEntitlements?: {
  tier?: string;
  [key: string]: unknown;
}): PlatformModule[] {
  // Current PipeKeeper: pipes and tobacco are enabled for all tiers.
  // Future: inspect userEntitlements.modules or a per-module feature flag.
  return PIPEKEEPER_ENABLED_MODULES;
}

/**
 * Build a module entitlement map for a user.
 */
export function buildModuleEntitlements(
  userEntitlements?: Parameters<typeof getEnabledModules>[0]
): Record<PlatformModule, { enabled: boolean }> {
  const enabledModules = getEnabledModules(userEntitlements);
  const result = {} as Record<PlatformModule, { enabled: boolean }>;
  for (const moduleKey of Object.values(PLATFORM_MODULES)) {
    result[moduleKey] = { enabled: enabledModules.includes(moduleKey) };
  }
  return result;
}
