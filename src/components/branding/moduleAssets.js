export const MODULE_ICONS = {
  collectionKeeper: 'https://media.base44.com/images/public/694956e18d119cc497192525/b9b1fc2c7_CollectionKeeperUpdated.png',
  pipekeeper: 'https://media.base44.com/images/public/694956e18d119cc497192525/27f5c2c92_PKNB.png',
  whiskeykeeper: 'https://media.base44.com/images/public/694956e18d119cc497192525/752a8ab5c_WKNB.png',
  winekeeper: 'https://media.base44.com/images/public/694956e18d119cc497192525/ef580a0c9_WineKNB.png',
  cigarkeeper: 'https://media.base44.com/images/public/694956e18d119cc497192525/c26fb6746_CigarKNB.png',
  curator: 'https://media.base44.com/images/public/694956e18d119cc497192525/2a1417d59_inappcurator.png',
};

export function getModuleIcon(moduleId) {
  return MODULE_ICONS[moduleId] || MODULE_ICONS.collectionKeeper;
}
