// functions/_platform/moduleTypes.ts
// Backend module type constants — mirrors src/platform/moduleTypes.js.
// Any change here must be kept in sync with the frontend counterpart.

export const MODULE_TYPES = {
  PIPE: "pipe",
  TOBACCO: "tobacco",
  WHISKEY: "whiskey",
  CIGAR: "cigar",
  COFFEE: "coffee",
} as const;

export type ModuleType = (typeof MODULE_TYPES)[keyof typeof MODULE_TYPES];

// Modules currently active in the PipeKeeper build.
export const ACTIVE_MODULES: ModuleType[] = [MODULE_TYPES.PIPE, MODULE_TYPES.TOBACCO, MODULE_TYPES.WHISKEY];

// Human-readable display names keyed by module type.
export const MODULE_DISPLAY_NAMES: Record<ModuleType, string> = {
  [MODULE_TYPES.PIPE]: "Pipes",
  [MODULE_TYPES.TOBACCO]: "Tobacco",
  [MODULE_TYPES.WHISKEY]: "Whiskey",
  [MODULE_TYPES.CIGAR]: "Cigars",
  [MODULE_TYPES.COFFEE]: "Coffee",
};

export function isValidModuleType(type: unknown): type is ModuleType {
  return typeof type === "string" && Object.values(MODULE_TYPES).includes(type as ModuleType);
}