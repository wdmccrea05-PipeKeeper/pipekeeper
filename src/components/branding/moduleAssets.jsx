import pipekeeper_icon from '@/assets/icons/pipekeeper.svg';
import whiskeykeeper_icon from '@/assets/icons/whiskeykeeper.svg';
import winekeeper_icon from '@/assets/icons/winekeeper.svg';
import cigarkeeper_icon from '@/assets/icons/cigarkeeper.svg';

export const MODULE_ICONS = {
  pipekeeper: pipekeeper_icon,
  whiskeykeeper: whiskeykeeper_icon,
  winekeeper: winekeeper_icon,
  cigarkeeper: cigarkeeper_icon,
};

export function getModuleIcon(moduleKey) {
  return MODULE_ICONS[moduleKey] || null;
}