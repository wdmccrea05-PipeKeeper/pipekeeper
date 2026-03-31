/**
 * SHIM — re-exports from canonical moduleRegistry.
 * Do not add logic here. Import from @/components/utils/moduleRegistry instead.
 */
export {
  KEEPER_MODULES as MODULE_REGISTRY,
  getActiveModules,
  getModuleByKey as getModule,
  getAllModuleConfigs as getAllModules,
} from '../components/utils/moduleRegistry.jsx';