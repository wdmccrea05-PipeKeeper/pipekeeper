// platform/index.js
// CollectionKeeper Platform — main export barrel.
//
// Import platform services from this entry point to keep import paths stable
// as the platform grows. PipeKeeper-specific code is kept in src/components/
// and src/pages/; this directory contains only reusable platform-level services.

export * from "./moduleTypes.js";
export * from "./itemModel.js";
export * from "./aiEligibility.js";
export * from "./valuation.js";
export * from "./reporting.js";
export * from "./dashboard.js";
export * from "./entitlements.js";
export { getAdapter, normalizeItemForPlatform, getItemUsageProfile, isItemAiEligibleViaAdapter } from "./moduleAdapters/index.js";
export { pipeAdapter, tobaccoAdapter } from "./moduleAdapters/pipeAdapter.js";
