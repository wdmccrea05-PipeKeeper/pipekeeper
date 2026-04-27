import PipeIcon from '@/components/icons/PipeIcon';
import { WhiskeyKeeperIcon } from '@/components/icons/WhiskeyKeeperIcon';

export const MODULE_ICONS = {
  pipekeeper: PipeIcon,
  whiskeykeeper: WhiskeyKeeperIcon,
  winekeeper: 'https://media.base44.com/images/public/694956e18d119cc497192525/9c58601f9_generated_image.png',
};

export function getModuleIcon(moduleKey) {
  return MODULE_ICONS[moduleKey];
}

export function getModuleAsset(assetKey) {
  const assets = {
    collectionkeeper: { src: '/favicon.ico' },
    pipekeeper: { src: '/favicon.ico' },
    whiskeykeeper: { src: '/favicon.ico' },
    cigarkeeper: { src: '/favicon.ico' },
    winekeeper: { src: '/favicon.ico' },
  };
  return assets[assetKey] || { src: '/favicon.ico' };
}

export function getAssetImageStyle(assetKey, size = 'default') {
  return {};
}