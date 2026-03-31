// platform/moduleTypes.js
// Defines the canonical set of collection module types for the CollectionKeeper platform.
// PipeKeeper currently exposes PIPE and TOBACCO. Future modules (WHISKEY, CIGAR, COFFEE)
// are defined here so adapters and services can reference them consistently.

export const MODULE_TYPES = {
  PIPE: "pipe",
  TOBACCO: "tobacco",
  WHISKEY: "whiskey",
  CIGAR: "cigar",
  COFFEE: "coffee",
};

// Modules that are active in the current build.
export const ACTIVE_MODULES = [MODULE_TYPES.PIPE, MODULE_TYPES.TOBACCO, MODULE_TYPES.WHISKEY];

// Human-readable display names keyed by module type.
export const MODULE_DISPLAY_NAMES = {
  [MODULE_TYPES.PIPE]: "Pipes",
  [MODULE_TYPES.TOBACCO]: "Tobacco",
  [MODULE_TYPES.WHISKEY]: "Whiskey",
  [MODULE_TYPES.CIGAR]: "Cigars",
  [MODULE_TYPES.COFFEE]: "Coffee",
};

// Returns true if the given string is a recognized module type.
export function isValidModuleType(type) {
  return Object.values(MODULE_TYPES).includes(type);
}