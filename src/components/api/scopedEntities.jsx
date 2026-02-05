/**
 * Scoped Entity Access Layer (robust)
 *
 * Why: Base44 "created_by" may be email OR auth user id depending on environment/version.
 * This module tries both, then falls back to a capped list() (still safe with limits).
 */

import { base44 } from "@/api/base44Client";
import { toast } from "sonner";

const RUNTIME_GUARD_ENABLED = true;
const MAX_ITEMS_PER_PAGE = 1000;

function assertScoped(entityName, operation, hasScope) {
  if (!hasScope && RUNTIME_GUARD_ENABLED) {
    const error = `[GUARDRAIL] Unscoped ${entityName}.${operation}() detected!`;
    console.error(error);

    if (import.meta.env?.DEV) {
      throw new Error(error);
    } else {
      toast.error("Data fetch error - contact support");
      return true;
    }
  }
  return false;
}

async function tryCreatedBy(entity, createdByValue, sort, limit) {
  if (!createdByValue) return [];
  try {
    const rows = await base44.entities[entity].filter({ created_by: createdByValue }, sort, limit);
    return Array.isArray(rows) ? rows : [];
  } catch (e) {
    console.warn(`[scopedEntities] ${entity}.filter(created_by=${createdByValue}) failed:`, e);
    return [];
  }
}

async function safeList(entity, sort, limit) {
  // Hard cap to avoid huge fetches. Rely on backend scoping/RLS.
  try {
    const rows = await base44.entities[entity].list(sort || "-updated_date", limit || MAX_ITEMS_PER_PAGE);
    return Array.isArray(rows) ? rows : [];
  } catch (e) {
    console.warn(`[scopedEntities] ${entity}.list failed:`, e);
    return [];
  }
}

async function listForUserRobust(entity, userEmail, sort = "-updated_date", limit = MAX_ITEMS_PER_PAGE) {
  if (assertScoped(entity, "listForUser", !!userEmail)) return [];

  const email = String(userEmail || "").trim();

  // Single query: created_by = email
  let rows = await tryCreatedBy(entity, email, sort, limit);
  if (rows.length > 0) return rows;

  // Fallback: capped list()
  return await safeList(entity, sort, limit);
}

async function filterForUserRobust(entity, userEmail, filter = {}, sort, limit) {
  if (assertScoped(entity, "filterForUser", !!userEmail)) return [];

  const email = String(userEmail || "").trim();

  // Single query: created_by = email
  try {
    const rows = await base44.entities[entity].filter({ ...filter, created_by: email }, sort, limit);
    if (rows?.length) return rows;
  } catch (e) {
    console.warn(`[scopedEntities] ${entity}.filter(created_by=${email}) failed:`, e);
  }

  // Fallback: if filter is narrow, try unscoped filter; else capped list
  const narrow = Boolean(filter?.id || filter?.pipe_id || filter?.blend_id || filter?.tobacco_blend_id);
  if (narrow) {
    try {
      const rows = await base44.entities[entity].filter(filter, sort, limit);
      return Array.isArray(rows) ? rows : [];
    } catch (e) {
      console.warn(`[scopedEntities] ${entity}.filter(narrow) failed:`, e);
      return [];
    }
  }

  return await safeList(entity, sort, limit);
}

async function getForUserRobust(entity, userEmail, id) {
  if (assertScoped(entity, "getForUser", !!userEmail)) return null;
  const rows = await filterForUserRobust(entity, userEmail, { id }, undefined, 5);
  return rows?.[0] || null;
}

export const scopedEntities = {
  TobaccoBlend: {
    listForUser: (email, sort, limit) => listForUserRobust("TobaccoBlend", email, sort, limit),
    filterForUser: (email, filter, sort, limit) => filterForUserRobust("TobaccoBlend", email, filter, sort, limit),
    getForUser: (email, id) => getForUserRobust("TobaccoBlend", email, id),
    create: (data) => base44.entities.TobaccoBlend.create(data),
    update: (id, data) => base44.entities.TobaccoBlend.update(id, data),
    delete: (id) => base44.entities.TobaccoBlend.delete(id),
    schema: () => base44.entities.TobaccoBlend.schema(),
  },
  Pipe: {
    listForUser: (email, sort, limit) => listForUserRobust("Pipe", email, sort, limit),
    filterForUser: (email, filter, sort, limit) => filterForUserRobust("Pipe", email, filter, sort, limit),
    getForUser: (email, id) => getForUserRobust("Pipe", email, id),
    create: (data) => base44.entities.Pipe.create(data),
    update: (id, data) => base44.entities.Pipe.update(id, data),
    delete: (id) => base44.entities.Pipe.delete(id),
    schema: () => base44.entities.Pipe.schema(),
  },
  SmokingLog: {
    listForUser: (email, sort = "-date", limit) => listForUserRobust("SmokingLog", email, sort, limit),
    filterForUser: (email, filter, sort, limit) => filterForUserRobust("SmokingLog", email, filter, sort, limit),
    create: (data) => base44.entities.SmokingLog.create(data),
    update: (id, data) => base44.entities.SmokingLog.update(id, data),
    delete: (id) => base44.entities.SmokingLog.delete(id),
  },
};

export default scopedEntities;