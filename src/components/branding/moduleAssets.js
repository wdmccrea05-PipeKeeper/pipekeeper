const svgToDataUri = (svg) => `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;

const collectionKeeperSvg = svgToDataUri(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128" fill="none">
  <defs>
    <linearGradient id="g1" x1="20" y1="16" x2="108" y2="112" gradientUnits="userSpaceOnUse">
      <stop stop-color="#F0D7A1"/>
      <stop offset="1" stop-color="#B8833D"/>
    </linearGradient>
    <linearGradient id="g2" x1="26" y1="28" x2="102" y2="102" gradientUnits="userSpaceOnUse">
      <stop stop-color="#6B4424"/>
      <stop offset="1" stop-color="#2D1A10"/>
    </linearGradient>
  </defs>
  <path d="M64 10 102 25v31c0 28-16 50-38 61C42 106 26 84 26 56V25L64 10Z" fill="url(#g1)"/>
  <path d="M64 18 95 30v26c0 22-12 40-31 50-19-10-31-28-31-50V30l31-12Z" fill="url(#g2)" stroke="#E9C98A" stroke-width="3"/>
  <path d="M48 50h32v24H48z" rx="4" fill="#E0A95B" stroke="#F6E3B7" stroke-width="2.5"/>
  <path d="M54 44h20v10H54z" rx="3" fill="#C98A45"/>
  <path d="M44 78c8 6 32 6 40 0" stroke="#E9C98A" stroke-width="4" stroke-linecap="round"/>
  <text x="64" y="96" text-anchor="middle" fill="#F6E3B7" font-size="20" font-family="Georgia, serif" font-weight="700">CK</text>
</svg>
`);

const pipeSvg = svgToDataUri(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128" fill="none">
  <path d="M20 76c0-14 10-24 24-24h18c8 0 14 6 14 14v4c0 8 6 14 14 14h18" stroke="#E2C07B" stroke-width="8" stroke-linecap="round"/>
  <path d="M34 48h18c8 0 14 6 14 14v8H34c-9 0-16-7-16-16s7-16 16-16Z" fill="#8B5A2B" stroke="#E2C07B" stroke-width="6"/>
  <path d="M89 84h19" stroke="#C88A4A" stroke-width="8" stroke-linecap="round"/>
</svg>
`);

const whiskeySvg = svgToDataUri(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128" fill="none">
  <rect x="42" y="18" width="44" height="18" rx="5" fill="#E2C07B"/>
  <path d="M48 32h32v16l10 44c3 13-7 24-21 24H59c-14 0-24-11-21-24l10-44V32Z" fill="#5A371D" stroke="#E2C07B" stroke-width="6"/>
  <path d="M45 82h38c6 0 11 5 11 11 0 10-8 18-18 18H52c-10 0-18-8-18-18 0-6 5-11 11-11Z" fill="#C6782F" opacity=".95"/>
  <path d="M52 54h24" stroke="#F8E6C0" stroke-width="4" stroke-linecap="round" opacity=".8"/>
</svg>
`);

const wineSvg = svgToDataUri(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128" fill="none">
  <path d="M42 18h44v14c0 20-8 32-22 38v19h16" stroke="#F4E5C7" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"/>
  <path d="M42 18h44v14c0 20-8 32-22 38-14-6-22-18-22-38V18Z" fill="#7B2031" stroke="#F4E5C7" stroke-width="6"/>
  <path d="M48 44h32" stroke="#F4E5C7" stroke-width="4" opacity=".8"/>
  <path d="M50 106h28" stroke="#D4A574" stroke-width="6" stroke-linecap="round"/>
</svg>
`);

const cigarSvg = svgToDataUri(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128" fill="none">
  <rect x="18" y="54" width="76" height="20" rx="10" fill="#6B4A2C" stroke="#D4A574" stroke-width="6"/>
  <rect x="86" y="54" width="24" height="20" rx="10" fill="#B86F46" stroke="#D4A574" stroke-width="6"/>
  <path d="M28 48c6-8 12-12 20-13" stroke="#D4A574" stroke-width="5" stroke-linecap="round"/>
  <path d="M40 38c9 0 15 4 19 10" stroke="#F4E5C7" stroke-width="4" stroke-linecap="round" opacity=".9"/>
</svg>
`);

const curatorSvg = svgToDataUri(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128" fill="none">
  <rect x="22" y="22" width="84" height="84" rx="20" fill="#2D1A10" stroke="#D4A574" stroke-width="6"/>
  <path d="M64 36v18M64 74v18M36 64h18M74 64h18M46 46l12 12M70 70l12 12M82 46 70 58M58 70 46 82" stroke="#F2D49A" stroke-width="5" stroke-linecap="round"/>
  <circle cx="64" cy="64" r="12" fill="#B8833D" stroke="#F6E4BF" stroke-width="4"/>
</svg>
`);

export const MODULE_ASSETS = {
  collectionKeeper: {
    src: collectionKeeperSvg,
    label: "CollectionKeeper",
  },
  pipekeeper: {
    src: pipeSvg,
    label: "PipeKeeper",
  },
  whiskeykeeper: {
    src: whiskeySvg,
    label: "WhiskeyKeeper",
  },
  winekeeper: {
    src: wineSvg,
    label: "WineKeeper",
  },
  cigarkeeper: {
    src: cigarSvg,
    label: "CigarKeeper",
  },
  curator: {
    src: curatorSvg,
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
    filter: shadow,
    objectFit: "contain",
  };
}