/**
 * CANONICAL MODULE REGISTRY — SINGLE SOURCE OF TRUTH
 *
 * Exports:
 *   MODULES         — module key constants
 *   MODULE_LIST     — array of module key strings
 *   KEEPER_MODULES  — full module config objects (hub/nav use)
 *   getModuleConfig()
 *   getAllModuleConfigs()
 *   getActiveModules()
 *   getModuleByKey()
 *
 * Rules:
 *   - Import ONLY from this file for module definitions
 *   - platform/moduleRegistry.js and hub/keeperModuleRegistry.js are shims pointing here
 */

import { MODULE_ICONS } from '@/components/branding/moduleAssets';
import {
  Wine,
  Cigarette,
  Package,
} from 'lucide-react';
import PipeIcon from '@/components/icons/PipeIcon';
import WhiskeyKeeperIcon from '@/components/icons/WhiskeyKeeperIcon';

// ─── Module key constants ─────────────────────────────────────────────────────
export const MODULES = {
  PIPEKEEPER: 'pipekeeper',
  WHISKEYKEEPER: 'whiskeykeeper',
  CIGARKEEPER: 'cigarkeeper',
  WINEKEEPER: 'winekeeper',
};

export const MODULE_LIST = Object.values(MODULES);

// ─── Full module config used by hub, nav, stories, AI ────────────────────────
export const KEEPER_MODULES = [
  {
    // Hub/nav fields
    type: 'pipes',
    titleKey: 'hub.pipekeeper',
    icon: MODULE_ICONS?.pipekeeper,
    route: 'PipeKeeper',
    enabled: true,
    description: 'Manage your pipe collection with detailed specifications and smoking logs.',
    moduleKey: MODULES.PIPEKEEPER,

    // Display fields
    key: MODULES.PIPEKEEPER,
    displayName: 'PipeKeeper',
    shortName: 'Pipes',
    singularName: 'Pipe',
    pageRoute: '/PipeKeeper',
    accent: '#8B7355',
    accentSoft: 'rgba(139,115,85,0.18)',
    border: 'rgba(139,115,85,0.28)',
    lucideIcon: PipeIcon,
    collectionLabel: 'Pipe Collection',
    itemLabel: 'Pipe',
    itemLabelPlural: 'Pipes',
    entityName: 'Pipe',
    status: 'active',
  },
  {
    type: 'whiskey',
    titleKey: 'hub.whiskeykeeper',
    icon: MODULE_ICONS?.whiskeykeeper,
    route: 'WhiskeyKeeper',
    enabled: false,
    description: 'Track your whiskey collection with tasting notes and bottle inventory.',
    moduleKey: MODULES.WHISKEYKEEPER,

    key: MODULES.WHISKEYKEEPER,
    displayName: 'WhiskeyKeeper',
    shortName: 'Whiskey',
    singularName: 'Bottle',
    pageRoute: '/WhiskeyKeeper',
    accent: '#A35C5C',
    accentSoft: 'rgba(163,92,92,0.18)',
    border: 'rgba(163,92,92,0.30)',
    lucideIcon: WhiskeyKeeperIcon,
    collectionLabel: 'Bottle Collection',
    itemLabel: 'Bottle',
    itemLabelPlural: 'Bottles',
    entityName: 'Bottle',
    status: 'internal',
  },
  {
    type: 'cigars',
    titleKey: 'hub.cigarkeeper',
    icon: MODULE_ICONS?.cigarkeeper,
    route: null,
    enabled: false,
    description: 'Coming soon: Curate and track your cigar collection.',
    moduleKey: MODULES.CIGARKEEPER,

    key: MODULES.CIGARKEEPER,
    displayName: 'CigarKeeper',
    shortName: 'Cigars',
    singularName: 'Cigar',
    pageRoute: '/Cigars',
    accent: '#8C6B3F',
    accentSoft: 'rgba(140,107,63,0.18)',
    border: 'rgba(140,107,63,0.30)',
    lucideIcon: Cigarette,
    collectionLabel: 'Cigar Collection',
    itemLabel: 'Cigar',
    itemLabelPlural: 'Cigars',
    entityName: 'Cigar',
    status: 'upcoming',
  },
  {
    type: 'wine',
    titleKey: 'hub.winekeeper',
    icon: MODULE_ICONS?.winekeeper,
    route: null,
    enabled: false,
    description: 'Coming soon: Manage your wine cellar and bottle inventory.',
    moduleKey: MODULES.WINEKEEPER,

    key: MODULES.WINEKEEPER,
    displayName: 'WineKeeper',
    shortName: 'Wine',
    singularName: 'Bottle',
    pageRoute: '/Wine',
    accent: '#8B3A3A',
    accentSoft: 'rgba(139,58,58,0.18)',
    border: 'rgba(139,58,58,0.30)',
    lucideIcon: Wine,
    collectionLabel: 'Wine Collection',
    itemLabel: 'Bottle',
    itemLabelPlural: 'Bottles',
    entityName: 'Wine',
    status: 'upcoming',
  },
];

// ─── Lookup helpers ───────────────────────────────────────────────────────────

export function getModuleConfig(moduleKey) {
  const key = String(moduleKey || '').trim().toLowerCase();
  return KEEPER_MODULES.find(m => m.key === key) || {
    key: key || 'unknown',
    displayName: 'CollectionKeeper',
    shortName: 'Collection',
    singularName: 'Item',
    pageRoute: '/',
    accent: '#8B7355',
    accentSoft: 'rgba(139,115,85,0.18)',
    border: 'rgba(139,115,85,0.28)',
    lucideIcon: Package,
    collectionLabel: 'Collection',
    itemLabel: 'Item',
    itemLabelPlural: 'Items',
    entityName: 'Unknown',
    status: 'unknown',
    enabled: false,
  };
}

export function getAllModuleConfigs() {
  return KEEPER_MODULES;
}

/** Returns only platform-launched (active) module keys. */
export function getActiveModules() {
  return KEEPER_MODULES.filter(m => m.status === 'active').map(m => m.key);
}

export function getModuleByKey(key) {
  return KEEPER_MODULES.find(m => m.moduleKey === key || m.key === key) || null;
}

export function getModuleByType(type) {
  return KEEPER_MODULES.find(m => m.type === type) || null;
}

export function getEnabledModules() {
  return KEEPER_MODULES.filter(m => m.enabled);
}

export function getComingSoonModules() {
  return KEEPER_MODULES.filter(m => !m.enabled);
}

export function getModuleDisplayName(moduleKey) {
  return getModuleConfig(moduleKey).displayName;
}

export function getModuleShortName(moduleKey) {
  return getModuleConfig(moduleKey).shortName;
}

export function getModuleSingularName(moduleKey) {
  return getModuleConfig(moduleKey).singularName;
}

export function getModuleRoute(moduleKey) {
  return getModuleConfig(moduleKey).pageRoute;
}

export function getModuleAccent(moduleKey) {
  return getModuleConfig(moduleKey).accent;
}

export function getModuleIcon(moduleKey) {
  return getModuleConfig(moduleKey).lucideIcon;
}

export function normalizeModuleKey(moduleKey) {
  const key = String(moduleKey || '').trim().toLowerCase();
  return KEEPER_MODULES.find(m => m.key === key) ? key : null;
}

export function isKnownModule(moduleKey) {
  return !!normalizeModuleKey(moduleKey);
}