import { MODULE_ICONS } from "@/components/branding/moduleAssets";

export const KEEPER_MODULES = [
  {
    type: "pipes",
    titleKey: "hub.pipekeeper",
    icon: MODULE_ICONS.pipekeeper,
    route: "PipeKeeper",
    enabled: true,
    description: "Manage your pipe collection with detailed specifications and smoking logs.",
    moduleKey: "pipekeeper",
  },
  {
    type: "whiskey",
    titleKey: "hub.whiskeykeeper",
    icon: MODULE_ICONS.whiskeykeeper,
    route: "WhiskeyKeeper",
    enabled: true,
    description: "Track your whiskey collection with tasting notes and bottle inventory.",
    moduleKey: "whiskeykeeper",
  },
  {
    type: "cigars",
    titleKey: "hub.cigarkeeper",
    icon: MODULE_ICONS.cigarkeeper,
    route: null,
    enabled: false,
    description: "Coming soon: Curate and track your cigar collection.",
    moduleKey: "cigarkeeper",
  },
  {
    type: "wine",
    titleKey: "hub.winekeeper",
    icon: MODULE_ICONS.winekeeper,
    route: null,
    enabled: false,
    description: "Coming soon: Manage your wine cellar and bottle inventory.",
    moduleKey: "winekeeper",
  },
];

export function getEnabledModules() {
  return KEEPER_MODULES.filter((m) => m.enabled);
}

export function getComingSoonModules() {
  return KEEPER_MODULES.filter((m) => !m.enabled);
}

export function getModuleByType(type) {
  return KEEPER_MODULES.find((m) => m.type === type);
}

export function getModuleByKey(key) {
  return KEEPER_MODULES.find((m) => m.moduleKey === key);
}

export function getEnabledModuleCount() {
  return getEnabledModules().length;
}