const svgToDataUri = (svg) => `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;

const cigarSvg = svgToDataUri(`
<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128" viewBox="0 0 128 128" fill="none">
  <rect x="18" y="52" width="80" height="24" rx="12" fill="#5B4633" stroke="#D4A574" stroke-width="6"/>
  <rect x="84" y="52" width="22" height="24" rx="10" fill="#AF7347" stroke="#D4A574" stroke-width="6"/>
  <path d="M30 44c5-10 12-15 24-16" stroke="#D4A574" stroke-width="6" stroke-linecap="round" opacity=".95"/>
  <path d="M44 32c9 0 16 4 21 11" stroke="#F0DFC1" stroke-width="5" stroke-linecap="round" opacity=".85"/>
</svg>
`);

const wineSvg = svgToDataUri(`
<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128" viewBox="0 0 128 128" fill="none">
  <path d="M40 16h48v16c0 19-10 31-24 36-14-5-24-17-24-36V16Z" fill="#7A1F2A" stroke="#F0DFC1" stroke-width="6"/>
  <path d="M44 40h40" stroke="#F0DFC1" stroke-width="5" opacity=".78"/>
  <path d="M64 69v28" stroke="#F0DFC1" stroke-width="6" stroke-linecap="round"/>
  <path d="M45 108h38" stroke="#D4A574" stroke-width="6" stroke-linecap="round"/>
</svg>
`);

export const MODULE_ASSETS = {
  collectionKeeper: {
    src: "https://media.base44.com/images/public/694956e18d119cc497192525/b9b1fc2c7_CollectionKeeperUpdated.png",
    renderMode: "multiply",
    label: "CollectionKeeper",
  },
  pipekeeper: {
    src: "https://media.base44.com/images/public/694956e18d119cc497192525/27f5c2c92_PKNB.png",
    renderMode: "normal",
    label: "PipeKeeper",
  },
  whiskeykeeper: {
    src: "https://media.base44.com/images/public/694956e18d119cc497192525/752a8ab5c_WKNB.png",
    renderMode: "normal",
    label: "WhiskeyKeeper",
  },
  winekeeper: {
    src: wineSvg,
    renderMode: "normal",
    label: "WineKeeper",
  },
  cigarkeeper: {
    src: cigarSvg,
    renderMode: "normal",
    label: "CigarKeeper",
  },
  curator: {
    src: "https://media.base44.com/images/public/694956e18d119cc497192525/dda113b4e_inappcurator.png",
    renderMode: "multiply",
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
  const asset = getModuleAsset(moduleId);
  const shadow =
    size === "small"
      ? "drop-shadow(0 1px 2px rgba(0,0,0,0.22))"
      : "drop-shadow(0 2px 6px rgba(0,0,0,0.28))";

  return {
    backgroundColor: "transparent",
    mixBlendMode: asset.renderMode === "multiply" ? "multiply" : "normal",
    filter: shadow,
  };
}