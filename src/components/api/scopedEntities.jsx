/**
 * Scoped Entity Access Layer
 * 
 * CRITICAL GUARDRAIL: This module enforces user-scoped queries for all user-owned entities.
 * Direct access to base44.entities.TobaccoBlend.list() is FORBIDDEN in client code.
 * 
 * WHY: Prevents accidental mass data fetches (e.g., 4M+ records) that crash the app.
 * 
 * USAGE:
 *   import { scopedEntities } from '@/components/api/scopedEntities';
 *   const blends = await scopedEntities.TobaccoBlend.listForUser(user.email);
 */

import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';

const RUNTIME_GUARD_ENABLED = true;
const MAX_ITEMS_PER_PAGE = 1000;

/**
 * Runtime assertion: logs error if unscoped query detected
 */
function assertScoped(entityName, operation, hasScope) {
  if (!hasScope && RUNTIME_GUARD_ENABLED) {
    const error = `[GUARDRAIL] Unscoped ${entityName}.${operation}() detected! This is forbidden.`;
    console.error(error);
    
    if (import.meta.env?.DEV) {
      throw new Error(error);
    } else {
      toast.error('Data fetch error - contact support');
      return true; // Signal to return empty
    }
  }
  return false;
}

/**
 * TobaccoBlend Scoped Access
 */
export const TobaccoBlend = {
  /**
   * List all tobacco blends for a user
   * @param {string} userEmail - User's email
   * @param {string} [sort] - Sort field (e.g., '-created_date')
   * @param {number} [limit] - Max items to return (default: 1000)
   */
  async listForUser(userEmail, sort = '-updated_date', limit = MAX_ITEMS_PER_PAGE) {
    if (assertScoped('TobaccoBlend', 'listForUser', !!userEmail)) {
      return [];
    }
    
    return await base44.entities.TobaccoBlend.filter({ created_by: userEmail }, sort, limit);
  },

  /**
   * Filter tobacco blends for a user
   * @param {string} userEmail - User's email
   * @param {object} filter - Additional filters (will be merged with created_by)
   * @param {string} [sort] - Sort field
   * @param {number} [limit] - Max items
   */
  async filterForUser(userEmail, filter = {}, sort, limit) {
    if (assertScoped('TobaccoBlend', 'filterForUser', !!userEmail)) {
      return [];
    }
    
    const scopedFilter = { ...filter, created_by: userEmail };
    return await base44.entities.TobaccoBlend.filter(scopedFilter, sort, limit);
  },

  /**
   * Get a single tobacco blend by ID (with ownership verification)
   * @param {string} userEmail - User's email
   * @param {string} id - Blend ID
   */
  async getForUser(userEmail, id) {
    if (assertScoped('TobaccoBlend', 'getForUser', !!userEmail)) {
      return null;
    }
    
    const blends = await base44.entities.TobaccoBlend.filter({ id, created_by: userEmail });
    return blends?.[0] || null;
  },

  /**
   * Create a tobacco blend (automatically scoped to user)
   */
  async create(data) {
    return await base44.entities.TobaccoBlend.create(data);
  },

  /**
   * Update a tobacco blend (no additional scoping needed - SDK handles)
   */
  async update(id, data) {
    return await base44.entities.TobaccoBlend.update(id, data);
  },

  /**
   * Delete a tobacco blend (no additional scoping needed - SDK handles)
   */
  async delete(id) {
    return await base44.entities.TobaccoBlend.delete(id);
  },

  /**
   * Get schema (safe - no data fetch)
   */
  schema() {
    return base44.entities.TobaccoBlend.schema();
  }
};

/**
 * Pipe Scoped Access
 */
export const Pipe = {
  async listForUser(userEmail, sort = '-updated_date', limit = MAX_ITEMS_PER_PAGE) {
    if (assertScoped('Pipe', 'listForUser', !!userEmail)) {
      return [];
    }
    return await base44.entities.Pipe.filter({ created_by: userEmail }, sort, limit);
  },

  async filterForUser(userEmail, filter = {}, sort, limit) {
    if (assertScoped('Pipe', 'filterForUser', !!userEmail)) {
      return [];
    }
    const scopedFilter = { ...filter, created_by: userEmail };
    return await base44.entities.Pipe.filter(scopedFilter, sort, limit);
  },

  async getForUser(userEmail, id) {
    if (assertScoped('Pipe', 'getForUser', !!userEmail)) {
      return null;
    }
    const pipes = await base44.entities.Pipe.filter({ id, created_by: userEmail });
    return pipes?.[0] || null;
  },

  async create(data) {
    return await base44.entities.Pipe.create(data);
  },

  async update(id, data) {
    return await base44.entities.Pipe.update(id, data);
  },

  async delete(id) {
    return await base44.entities.Pipe.delete(id);
  },

  schema() {
    return base44.entities.Pipe.schema();
  }
};

/**
 * SmokingLog Scoped Access
 */
export const SmokingLog = {
  async listForUser(userEmail, sort = '-date', limit = MAX_ITEMS_PER_PAGE) {
    if (assertScoped('SmokingLog', 'listForUser', !!userEmail)) {
      return [];
    }
    return await base44.entities.SmokingLog.filter({ created_by: userEmail }, sort, limit);
  },

  async filterForUser(userEmail, filter = {}, sort, limit) {
    if (assertScoped('SmokingLog', 'filterForUser', !!userEmail)) {
      return [];
    }
    const scopedFilter = { ...filter, created_by: userEmail };
    return await base44.entities.SmokingLog.filter(scopedFilter, sort, limit);
  },

  async create(data) {
    return await base44.entities.SmokingLog.create(data);
  },

  async update(id, data) {
    return await base44.entities.SmokingLog.update(id, data);
  },

  async delete(id) {
    return await base44.entities.SmokingLog.delete(id);
  }
};

/**
 * Export all scoped entities
 */
export const scopedEntities = {
  TobaccoBlend,
  Pipe,
  SmokingLog,
};

export default scopedEntities;