import {
  PipeIcon,
  Wine,
  Cigarette,
  Coffee,
  Package,
} from 'lucide-react';

const MODULES = {
  pipe: {
    key: 'pipe',
    displayName: 'PipeKeeper',
    shortName: 'Pipes',
    singularName: 'Pipe',
    route: '/Pipes',
    accent: '#8B7355',
    accentSoft: 'rgba(139,115,85,0.18)',
    border: 'rgba(139,115,85,0.28)',
    icon: PipeIcon,
    collectionLabel: 'Pipe Collection',
    itemLabel: 'Pipe',
    itemLabelPlural: 'Pipes',
  },

  whiskey: {
    key: 'whiskey',
    displayName: 'WhiskeyKeeper',
    shortName: 'Whiskey',
    singularName: 'Bottle',
    route: '/Whiskey',
    accent: '#A35C5C',
    accentSoft: 'rgba(163,92,92,0.18)',
    border: 'rgba(163,92,92,0.30)',
    icon: Wine,
    collectionLabel: 'Bottle Collection',
    itemLabel: 'Bottle',
    itemLabelPlural: 'Bottles',
  },

  cigar: {
    key: 'cigar',
    displayName: 'CigarKeeper',
    shortName: 'Cigars',
    singularName: 'Cigar',
    route: '/Cigars',
    accent: '#8C6B3F',
    accentSoft: 'rgba(140,107,63,0.18)',
    border: 'rgba(140,107,63,0.30)',
    icon: Cigarette,
    collectionLabel: 'Cigar Collection',
    itemLabel: 'Cigar',
    itemLabelPlural: 'Cigars',
  },

  coffee: {
    key: 'coffee',
    displayName: 'CoffeeKeeper',
    shortName: 'Coffee',
    singularName: 'Coffee',
    route: '/Coffee',
    accent: '#7A5C46',
    accentSoft: 'rgba(122,92,70,0.18)',
    border: 'rgba(122,92,70,0.28)',
    icon: Coffee,
    collectionLabel: 'Coffee Collection',
    itemLabel: 'Coffee',
    itemLabelPlural: 'Coffees',
  },
};

export function getModuleConfig(moduleKey) {
  const key = String(moduleKey || '').trim().toLowerCase();
  return MODULES[key] || {
    key: key || 'unknown',
    displayName: 'CollectionKeeper',
    shortName: 'Collection',
    singularName: 'Item',
    route: '/',
    accent: '#8B7355',
    accentSoft: 'rgba(139,115,85,0.18)',
    border: 'rgba(139,115,85,0.28)',
    icon: Package,
    collectionLabel: 'Collection',
    itemLabel: 'Item',
    itemLabelPlural: 'Items',
  };
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
  return getModuleConfig(moduleKey).route;
}

export function getModuleAccent(moduleKey) {
  return getModuleConfig(moduleKey).accent;
}

export function getModuleIcon(moduleKey) {
  return getModuleConfig(moduleKey).icon;
}

export function getAllModuleConfigs() {
  return Object.values(MODULES);
}

export function normalizeModuleKey(moduleKey) {
  const key = String(moduleKey || '').trim().toLowerCase();
  return MODULES[key] ? key : null;
}

export function isKnownModule(moduleKey) {
  return !!normalizeModuleKey(moduleKey);
}
