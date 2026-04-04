/**
 * moduleAccess — centralized module access utilities for CollectionKeeper.
 *
 * Separates four distinct concepts:
 *
 *   A. Module EXISTS      — the platform supports it (has a route + launched)
 *   B. Module ENABLED     — the user has it visible/active in preferences
 *   C. Module PAID        — the user has Pro/paid access for that module
 *   D. Module AI-ELIGIBLE — enabled AND can contribute to AI/stories/pairings/insights
 *
 * These are intentionally separate. A paid-but-hidden module is still paid,
 * but must not appear in UI, AI, stories, or Hub aggregation.
 * A free-but-enabled module DOES participate in AI and cross-module logic.
 *
 * Single source of truth — import from here, not from scattered local checks.
 */

import { KEEPER_MODULES } from '@/components/utils/moduleRegistry';

// Derive launched module IDs from the registry (modules where enabled===true)
const LAUNCHED_MODULES = KEEPER_MODULES.filter(m => m.enabled).map(m => m.moduleKey);

// ─── A. Module EXISTS ────────────────────────────────────────────────────────

/**
 * Returns true if the platform has launched this module (has a route).
 */
export function moduleExists(moduleId) {
  const m = KEEPER_MODULES.find(k => k.moduleKey === moduleId);
  return !!m?.enabled; // enabled=true means platform-launched
}

/**
 * All platform-launched module IDs.
 */
export function getLaunchedModuleIds() {
  return LAUNCHED_MODULES;
}

// ─── B. Module ENABLED (user preference) ────────────────────────────────────

/**
 * Returns true if the user has this module visible/active.
 * Reads from a derived module states object (from deriveModuleStates).
 *
 * @param {string} moduleId
 * @param {object} moduleStates — from deriveModuleStates(profile) or useModuleVisibility
 */
export function isModuleEnabled(moduleId, moduleStates) {
  if (!moduleStates) return true; // safe default if states not yet loaded
  return moduleStates[moduleId] !== false;
}

/**
 * Returns array of enabled module IDs.
 */
export function getEnabledModuleIds(moduleStates) {
  if (!moduleStates) return [...LAUNCHED_MODULES];
  return Object.keys(moduleStates).filter(k => moduleStates[k] === true);
}

/**
 * Returns array of enabled module registry objects.
 */
export function getEnabledModules(moduleStates) {
  return KEEPER_MODULES.filter(m => m.enabled && isModuleEnabled(m.moduleKey, moduleStates));
}

// ─── C. Module PAID ──────────────────────────────────────────────────────────

/**
 * PipeKeeper is always included (core module).
 * WhiskeyKeeper is available free (basic) or paid (full features).
 * In practice, "paid" means the user has premium/pro entitlement.
 *
 * For now, this is a pass-through — entitlement is handled by useCurrentUser.
 * This utility exists to make the concept explicit and allow future per-module pricing.
 *
 * @param {string} moduleId
 * @param {object} entitlements — { hasPaid, hasPro, hasPremium }
 */
export function isModulePaid(moduleId, entitlements) {
  if (!entitlements) return false;
  const { hasPaid, hasPro, hasPremium } = entitlements;
  // All launched modules are accessible free; paid = premium/pro unlocks advanced features
  // PipeKeeper core is always free; whiskey is also accessible free (basic)
  return !!(hasPaid || hasPro || hasPremium);
}

/**
 * Returns IDs of modules the user has paid access for.
 */
export function getPaidModuleIds(entitlements) {
  if (!entitlements || !(entitlements.hasPaid || entitlements.hasPro || entitlements.hasPremium)) return [];
  return getLaunchedModuleIds(); // All modules share the same subscription tier currently
}

// ─── D. Module AI-ELIGIBLE ───────────────────────────────────────────────────

/**
 * A module is AI-eligible if:
 *   - The platform has launched it
 *   - The user has it enabled (visible/active)
 *   - NOT locked/hidden
 *
 * NOTE: Free modules CAN be AI-eligible. The rule is enablement, not payment.
 *
 * @param {string} moduleId
 * @param {object} moduleStates — from deriveModuleStates(profile) or useModuleVisibility
 */
export function isModuleAIEligible(moduleId, moduleStates) {
  return moduleExists(moduleId) && isModuleEnabled(moduleId, moduleStates);
}

/**
 * Returns array of AI-eligible module IDs (enabled + platform-launched).
 * These are the modules that can contribute to:
 *   - Curator context
 *   - Tonight's Session
 *   - Collection Story
 *   - Hub aggregation totals
 *   - Share cards
 *   - Cross-module recommendations
 */
export function getAIEligibleModuleIds(moduleStates) {
  return getLaunchedModuleIds().filter(id => isModuleAIEligible(id, moduleStates));
}

/**
 * Returns array of AI-eligible module registry objects.
 */
export function getAIEligibleModules(moduleStates) {
  return KEEPER_MODULES.filter(m => m.enabled && isModuleAIEligible(m.moduleKey, moduleStates));
}

// ─── VISIBILITY (combined check) ─────────────────────────────────────────────

/**
 * A module is visible if it exists AND is enabled by the user.
 * This is the guard used for routing and UI rendering.
 */
export function isModuleVisible(moduleId, moduleStates) {
  return moduleExists(moduleId) && isModuleEnabled(moduleId, moduleStates);
}

// ─── DATA FILTERING HELPERS ───────────────────────────────────────────────────

/**
 * Filter a data set based on whether a module is AI-eligible.
 * Returns the original array if the module is eligible, empty array if not.
 *
 * Usage:
 *   const eligibleBottles = filterByModuleEligibility('whiskeykeeper', moduleStates, bottles);
 */
export function filterByModuleEligibility(moduleId, moduleStates, data) {
  if (!isModuleAIEligible(moduleId, moduleStates)) return [];
  return Array.isArray(data) ? data : [];
}

/**
 * Build a module-filtered collection context for AI/story/recommendations.
 * Returns { pipes, blends, bottles } with non-eligible data zeroed out.
 *
 * @param {object} moduleStates
 * @param {object} collections — { pipes, blends, bottles }
 */
export function buildAIEligibleCollection(moduleStates, collections) {
  const { pipes = [], blends = [], bottles = [] } = collections;
  return {
    pipes: isModuleAIEligible('pipekeeper', moduleStates) ? pipes : [],
    blends: isModuleAIEligible('pipekeeper', moduleStates) ? blends : [], // blends belong to pipekeeper
    bottles: isModuleAIEligible('whiskeykeeper', moduleStates) ? bottles : [],
  };
}