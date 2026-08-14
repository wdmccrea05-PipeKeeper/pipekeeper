import {
  INVENTORY_MODULES,
  CONTAINER_TYPES,
  STATUS_TYPES,
  STORAGE_TYPES,
  getModuleConfig,
} from './inventoryConfig';

function cleanObject(obj) {
  return Object.fromEntries(
    Object.entries(obj).filter(([, value]) => value !== undefined && value !== null && value !== '')
  );
}

function toNumber(value) {
  if (value === '' || value === null || value === undefined) return undefined;
  const num = Number(value);
  return Number.isNaN(num) ? undefined : num;
}

export class InventoryEngine {
  constructor(moduleType) {
    this.moduleType = moduleType;
    this.config = getModuleConfig(moduleType);

    if (!this.config) {
      throw new Error(`Unknown inventory module: ${moduleType}`);
    }
  }

  getDefaults(existing = {}) {
    return {
      ...this.config.defaults,
      ...existing,
    };
  }

  buildUpdatePayload(formData = {}) {
    if (this.moduleType === INVENTORY_MODULES.BLEND) {
      return this.buildBlendPayload(formData);
    }

    if (this.moduleType === INVENTORY_MODULES.BOTTLE) {
      return this.buildBottlePayload(formData);
    }

    if (this.moduleType === INVENTORY_MODULES.PIPE) {
      return this.buildPipePayload(formData);
    }

    if (this.moduleType === INVENTORY_MODULES.WINE) {
      return this.buildWinePayload(formData);
    }

    if (this.moduleType === INVENTORY_MODULES.CIGAR) {
      return this.buildCigarPayload(formData);
    }

    return {};
  }

  buildBlendPayload(formData = {}) {
    const containerType = formData.containerType || CONTAINER_TYPES.TIN;
    const quantity = toNumber(formData.quantity);
    const size = toNumber(formData.size);
    const storage = formData.storage || STORAGE_TYPES.ACTIVE;
    const cellarDate = formData.cellarDate || undefined;
    const payload = {};

    if (containerType === CONTAINER_TYPES.TIN) {
      payload.tin_total_tins = quantity;
      payload.tin_size_oz = size;
      payload.tin_total_quantity_oz =
        quantity !== undefined && size !== undefined ? quantity * size : undefined;

      if (storage === STORAGE_TYPES.ACTIVE) {
        payload.tin_tins_open = quantity;
        payload.tin_tins_cellared = 0;
      } else if (storage === STORAGE_TYPES.CELLAR) {
        payload.tin_tins_open = 0;
        payload.tin_tins_cellared = quantity;
        payload.tin_cellared_date = cellarDate;
      } else if (storage === STORAGE_TYPES.BOTH) {
        payload.tin_tins_open = quantity;
        payload.tin_tins_cellared = quantity;
        payload.tin_cellared_date = cellarDate;
      }
    }

    if (containerType === CONTAINER_TYPES.BULK) {
      payload.bulk_total_quantity_oz = quantity;

      if (storage === STORAGE_TYPES.ACTIVE) {
        payload.bulk_open = quantity;
        payload.bulk_cellared = 0;
      } else if (storage === STORAGE_TYPES.CELLAR) {
        payload.bulk_open = 0;
        payload.bulk_cellared = quantity;
        payload.bulk_cellared_date = cellarDate;
      } else if (storage === STORAGE_TYPES.BOTH) {
        payload.bulk_open = quantity;
        payload.bulk_cellared = quantity;
        payload.bulk_cellared_date = cellarDate;
      }
    }

    if (containerType === CONTAINER_TYPES.POUCH) {
      payload.pouch_total_pouches = quantity;
      payload.pouch_size_oz = size;
      payload.pouch_total_quantity_oz =
        quantity !== undefined && size !== undefined ? quantity * size : undefined;

      if (storage === STORAGE_TYPES.ACTIVE) {
        payload.pouch_pouches_open = quantity;
        payload.pouch_pouches_cellared = 0;
      } else if (storage === STORAGE_TYPES.CELLAR) {
        payload.pouch_pouches_open = 0;
        payload.pouch_pouches_cellared = quantity;
        payload.pouch_cellared_date = cellarDate;
      } else if (storage === STORAGE_TYPES.BOTH) {
        payload.pouch_pouches_open = quantity;
        payload.pouch_pouches_cellared = quantity;
        payload.pouch_cellared_date = cellarDate;
      }
    }

    if (containerType === CONTAINER_TYPES.JAR) {
      payload.jar_total_quantity_oz = quantity;

      if (storage === STORAGE_TYPES.ACTIVE) {
        payload.jar_open = quantity;
        payload.jar_cellared = 0;
      } else if (storage === STORAGE_TYPES.CELLAR) {
        payload.jar_open = 0;
        payload.jar_cellared = quantity;
        payload.jar_cellared_date = cellarDate;
      } else if (storage === STORAGE_TYPES.BOTH) {
        payload.jar_open = quantity;
        payload.jar_cellared = quantity;
        payload.jar_cellared_date = cellarDate;
      }
    }

    if (formData.purchasePrice !== undefined) {
      payload.purchase_price = toNumber(formData.purchasePrice);
    }

    if (formData.acquisitionMethod) {
      payload.acquisition_method = formData.acquisitionMethod;
    }

    return cleanObject(payload);
  }

  buildBottlePayload(formData = {}) {
    return cleanObject({
      bottles_owned: toNumber(formData.quantity),
      bottle_status: formData.status || STATUS_TYPES.UNOPENED,
      bottle_storage: formData.storage || STORAGE_TYPES.BAR,
      fill_level: toNumber(formData.fillLevel),
      purchase_price: toNumber(formData.purchasePrice),
      acquisition_method: formData.acquisitionMethod || undefined,
      cellared_date:
        formData.storage === STORAGE_TYPES.CELLAR ? formData.cellarDate || undefined : undefined,
    });
  }

  buildPipePayload(formData = {}) {
    return cleanObject({
      ownership_status: formData.ownershipStatus || formData.storage || STORAGE_TYPES.ACTIVE,
      storage_status: formData.storage || STORAGE_TYPES.ACTIVE,
      acquisition_price: toNumber(formData.acquisitionPrice),
      acquisition_method: formData.acquisitionMethod || undefined,
    });
  }

  buildWinePayload(formData = {}) {
    return cleanObject({
      quantity: toNumber(formData.quantity),
      purchase_price: toNumber(formData.purchasePrice),
    });
  }

  buildCigarPayload(formData = {}) {
    const qty = toNumber(formData.quantity);
    return cleanObject({
      quantity: qty,
      initial_quantity: qty,
      purchase_price: toNumber(formData.purchasePrice),
    });
  }
}

export function createInventoryEngine(moduleType) {
  return new InventoryEngine(moduleType);
}