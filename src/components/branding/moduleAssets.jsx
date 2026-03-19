export const MODULE_ASSETS = {
  collectionkeeper: {
    src: "/branding/collectionkeeper-main-logo.png?v=1",
    label: "CollectionKeeper",
  },

  // backward compatibility alias
  collectionKeeper: {
    src: "/branding/collectionkeeper-main-logo.png?v=1",
    label: "CollectionKeeper",
  },

  pipekeeper: {
    // Inline SVG pipe silhouette — no external dependency, no black background
    src: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%23D4A574' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cellipse cx='5.5' cy='10' rx='2' ry='1.5'/%3E%3Cpath d='M3.5 10v4c0 1.1.9 2 2 2s2-.9 2-2v-4'/%3E%3Cpath d='M7.5 12h6'/%3E%3Cpath d='M13.5 12c1 0 2 .5 3 1.5s1.5 2.5 2 3.5'/%3E%3Ccircle cx='18.5' cy='17' r='0.8' fill='%23D4A574'/%3E%3C/svg%3E",
    label: "PipeKeeper",
  },

  pipeicon: {
    src: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%23D4A574' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cellipse cx='5.5' cy='10' rx='2' ry='1.5'/%3E%3Cpath d='M3.5 10v4c0 1.1.9 2 2 2s2-.9 2-2v-4'/%3E%3Cpath d='M7.5 12h6'/%3E%3Cpath d='M13.5 12c1 0 2 .5 3 1.5s1.5 2.5 2 3.5'/%3E%3Ccircle cx='18.5' cy='17' r='0.8' fill='%23D4A574'/%3E%3C/svg%3E",
    label: "Pipe Icon",
  },

  whiskeykeeper: {
    src: "/branding/whiskeykeeper-logo.png?v=1",
    label: "WhiskeyKeeper",
  },

  winekeeper: {
    src: "/branding/winekeeper-logo.png?v=1",
    label: "WineKeeper",
  },

  cigarkeeper: {
    src: "/branding/cigarkeeper-logo.png?v=1",
    label: "CigarKeeper",
  },

  curator: {
    src: "/branding/curator-logo.png?v=1",
    label: "Collection Curator",
  },
};

export const MODULE_ICONS = Object.fromEntries(
  Object.entries(MODULE_ASSETS).map(([key, value]) => [key, value.src])
);

export function getModuleAsset(moduleId) {
  return MODULE_ASSETS[moduleId] || MODULE_ASSETS.collectionkeeper;
}

export function getModuleIcon(moduleId) {
  return getModuleAsset(moduleId).src;
}

export function getAssetImageStyle(moduleId, size = "regular") {
  const shadow =
    size === "small"
      ? "drop-shadow(0 1px 2px rgba(0,0,0,0.2))"
      : "drop-shadow(0 2px 6px rgba(0,0,0,0.28))";

  return {
    background: "transparent",
    backgroundColor: "transparent",
    objectFit: "contain",
    filter: shadow,
    border: "none",
    outline: "none",
    boxShadow: "none",
  };
}