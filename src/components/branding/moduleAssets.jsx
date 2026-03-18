export const MODULE_ASSETS = {
  collectionKeeper: {
    src: "https://media.base44.com/images/public/694956e18d119cc497192525/e9b1ad0a0_image.png",
    label: "CollectionKeeper",
  },
  pipekeeper: {
    src: "https://media.base44.com/images/public/694956e18d119cc497192525/27f5c2c92_PKNB.png",
    label: "PipeKeeper",
  },
  whiskeykeeper: {
    src: "https://media.base44.com/images/public/694956e18d119cc497192525/752a8ab5c_WKNB.png",
    label: "WhiskeyKeeper",
  },
  winekeeper: {
    src: "https://media.base44.com/images/public/694956e18d119cc497192525/ef580a0c9_WineKNB.png",
    label: "WineKeeper",
  },
  cigarkeeper: {
    src: "https://media.base44.com/images/public/694956e18d119cc497192525/c26fb6746_CigarKNB.png",
    label: "CigarKeeper",
  },
  curator: {
    src: "https://media.base44.com/images/public/694956e18d119cc497192525/2a1417d59_inappcurator.png",
    label: "Collection Curator",
  },
};

export const MODULE_ICONS = Object.fromEntries(
  Object.entries(MODULE_ASSETS).map(([key, value]) => [key, value.src])
);

export function getModuleAsset(moduleId) {
  return MODULE_ASSETS[moduleId] || MODULE_ASSETS.collectionKeeper;
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
    backgroundColor: "transparent",
    objectFit: "contain",
    filter: shadow,
  };
}