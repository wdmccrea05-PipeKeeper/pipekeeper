export const INVENTORY_MODULES = {
  BLEND: 'blend',
  BOTTLE: 'bottle',
  PIPE: 'pipe',
  WINE: 'wine',
};

export const CONTAINER_TYPES = {
  TIN: 'tin',
  BULK: 'bulk',
  POUCH: 'pouch',
  JAR: 'jar',
};

export const STATUS_TYPES = {
  OPEN: 'open',
  SEALED: 'sealed',
  UNOPENED: 'unopened',
};

export const STORAGE_TYPES = {
  ACTIVE: 'active',
  CELLAR: 'cellar',
  BOTH: 'both',
  BAR: 'bar',
  ARCHIVED: 'archived',
  SOLD: 'sold',
  RETIRED: 'retired',
};

export const inventoryConfig = {
  [INVENTORY_MODULES.BLEND]: {
    label: 'Blend Inventory',
    containers: [
      CONTAINER_TYPES.TIN,
      CONTAINER_TYPES.BULK,
      CONTAINER_TYPES.POUCH,
      CONTAINER_TYPES.JAR,
    ],
    statuses: [STATUS_TYPES.OPEN, STATUS_TYPES.SEALED],
    storageOptions: [STORAGE_TYPES.ACTIVE, STORAGE_TYPES.CELLAR, STORAGE_TYPES.BOTH],
    defaults: {
      containerType: CONTAINER_TYPES.TIN,
      quantity: 1,
      status: STATUS_TYPES.SEALED,
      storage: STORAGE_TYPES.ACTIVE,
      size: '',
      cellarDate: '',
    },
  },

  [INVENTORY_MODULES.BOTTLE]: {
    label: 'Bottle Inventory',
    containers: null,
    statuses: [STATUS_TYPES.UNOPENED, STATUS_TYPES.OPEN],
    storageOptions: [STORAGE_TYPES.BAR, STORAGE_TYPES.CELLAR],
    defaults: {
      quantity: 1,
      status: STATUS_TYPES.UNOPENED,
      storage: STORAGE_TYPES.BAR,
      fillLevel: '',
      cellarDate: '',
      purchasePrice: '',
    },
  },

  [INVENTORY_MODULES.PIPE]: {
    label: 'Pipe Ownership',
    containers: null,
    statuses: null,
    storageOptions: [
      STORAGE_TYPES.ACTIVE,
      STORAGE_TYPES.ARCHIVED,
      STORAGE_TYPES.SOLD,
      STORAGE_TYPES.RETIRED,
    ],
    defaults: {
      storage: STORAGE_TYPES.ACTIVE,
      ownershipStatus: STORAGE_TYPES.ACTIVE,
      acquisitionPrice: '',
    },
  },

  [INVENTORY_MODULES.WINE]: {
    label: 'Wine Cellar',
    containers: null,
    statuses: [STATUS_TYPES.UNOPENED, STATUS_TYPES.OPEN],
    storageOptions: [STORAGE_TYPES.BAR, STORAGE_TYPES.CELLAR],
    defaults: {
      quantity: 1,
      status: STATUS_TYPES.UNOPENED,
      storage: STORAGE_TYPES.BAR,
      cellarDate: '',
      purchasePrice: '',
    },
  },
};

export function getModuleConfig(moduleType) {
  return inventoryConfig[moduleType] || null;
}
