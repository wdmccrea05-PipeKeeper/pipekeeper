import PipeIcon from '@/components/icons/PipeIcon';
import { WhiskeyKeeperIcon } from '@/components/icons/WhiskeyKeeperIcon';

export const MODULE_ICONS = {
  pipekeeper: PipeIcon,
  whiskeykeeper: WhiskeyKeeperIcon,
};

export function getModuleIcon(moduleKey) {
  return MODULE_ICONS[moduleKey];
}

export function getAssetImageStyle(assetKey, size = 'default') {
  return {};
}