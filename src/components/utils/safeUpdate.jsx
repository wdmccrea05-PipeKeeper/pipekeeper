import { base44 } from "@/api/base44Client";

function normalizeErrorMessage(error) {
  const possibleMessages = [
    error?.response?.data?.message,
    error?.response?.data?.error,
    error?.response?.data?.details,
    error?.data?.message,
    error?.data?.error,
    error?.body?.message,
    error?.body?.error,
    error?.message,
  ];

  for (const value of possibleMessages) {
    if (typeof value === "string" && value.trim().length > 0) return value;
  }

  if (error?.response?.data?.details && typeof error.response.data.details === "object") {
    try {
      return JSON.stringify(error.response.data.details);
    } catch {
      return "Unknown validation error";
    }
  }
  return "Unknown update error";
}

function removeUndefinedValues(input = {}) {
  return Object.fromEntries(Object.entries(input).filter(([, value]) => value !== undefined));
}

const IMMUTABLE_UPDATE_FIELDS = new Set([
  "id",
  "created_date",
  "updated_date",
  "_id",
  "_createdDate",
  "_updatedDate",
]);

function stripImmutableUpdateFields(input = {}) {
  const next = { ...input };
  for (const field of IMMUTABLE_UPDATE_FIELDS) {
    if (Object.prototype.hasOwnProperty.call(next, field)) {
      delete next[field];
    }
  }
  return next;
}

function normalizeFlavorProfileForSave(value) {
  if (!Array.isArray(value)) return [];
  return [...new Set(
    value
      .filter((entry) => entry !== null && entry !== undefined)
      .map((entry) => String(entry).trim())
      .filter(Boolean)
  )];
}

function normalizePhotoArray(value) {
  if (!Array.isArray(value)) return [];
  return [...new Set(
    value
      .filter((entry) => entry !== null && entry !== undefined)
      .map((entry) => String(entry).trim())
      .filter(Boolean)
  )];
}

function mergePhotoArrays(existing, incoming) {
  const incomingNormalized = normalizePhotoArray(incoming);
  const existingNormalized = normalizePhotoArray(existing);
  if (incomingNormalized.length === 0) return [];
  const merged = [...incomingNormalized];
  for (const url of existingNormalized) {
    if (!merged.includes(url)) merged.push(url);
  }
  return merged;
}

function sanitizeSerializableValue(value) {
  if (value === undefined || typeof value === "function" || typeof value === "symbol") {
    return undefined;
  }

  if (typeof value === "bigint") {
    return String(value);
  }

  if (value === null) return null;

  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? undefined : value.toISOString();
  }

  if (value instanceof Set) {
    return sanitizeSerializableValue(Array.from(value.values()));
  }

  if (value instanceof Map) {
    return sanitizeSerializableValue(Object.fromEntries(value.entries()));
  }

  if (Array.isArray(value)) {
    return value
      .map((entry) => sanitizeSerializableValue(entry))
      .filter((entry) => entry !== undefined);
  }

  if (typeof value === "object") {
    const next = {};
    for (const [key, entry] of Object.entries(value)) {
      const sanitized = sanitizeSerializableValue(entry);
      if (sanitized !== undefined) {
        next[key] = sanitized;
      }
    }
    return next;
  }

  return value;
}

/**
 * Safe entity update that verifies ownership and sends only explicit updates.
 * Avoids legacy-record incompatibility from re-sending stale/deprecated fields.
 * 
 * @param {string} entityName - Name of the entity (e.g., 'Pipe', 'TobaccoBlend')
 * @param {string|number} id - Entity ID
 * @param {object} updates - Fields to update
 * @param {string} userEmail - Current user's email (optional, for ownership verification)
 * @returns {Promise} Updated entity
 */
export async function safeUpdate(entityName, id, updates, userEmail = null) {
  const rawPayload = updates || {};
  try {
    // Try to fetch entity with both string and number ID types
    const idStr = String(id);
    const isNumeric = /^\d+$/.test(idStr);
    const idNum = isNumeric ? Number(idStr) : null;
    
    let current = null;
    try {
      current = await base44.entities[entityName].get(idStr);
    } catch (e) {
      // Try numeric ID if string failed
      if (idNum !== null) {
        try {
          current = await base44.entities[entityName].get(idNum);
        } catch (e2) {
          // Both failed
        }
      }
    }
    
    if (!current) {
      throw new Error(`${entityName} with id ${id} not found`);
    }
    
    // Verify ownership if userEmail provided (allow missing created_by for legacy data)
    if (userEmail && current.created_by && current.created_by !== userEmail) {
      throw new Error(`Permission denied: ${entityName} belongs to another user`);
    }
    
    // IMPORTANT: send only explicit updates.
    // Re-sending the full current record can fail on legacy records that contain
    // deprecated/invalid fields no longer accepted by the current backend schema.
    const createdByField =
      rawPayload?.created_by === undefined && current?.created_by
        ? { created_by: current.created_by }
        : {};
    const merged = removeUndefinedValues({
      ...stripImmutableUpdateFields(rawPayload),
      ...createdByField,
    });
    if (Object.prototype.hasOwnProperty.call(merged, "replace_photos")) delete merged.replace_photos;
    if (Object.prototype.hasOwnProperty.call(merged, "replace_stamping_photos")) delete merged.replace_stamping_photos;
    if (Object.prototype.hasOwnProperty.call(merged, "__replace_photos")) delete merged.__replace_photos;
    if (Object.prototype.hasOwnProperty.call(merged, "__replace_stamping_photos")) delete merged.__replace_stamping_photos;
    const sanitized = sanitizeSerializableValue(merged) || {};

    if (Object.prototype.hasOwnProperty.call(rawPayload, "photos")) {
      const shouldReplacePhotos = rawPayload?.replace_photos === true || rawPayload?.__replace_photos === true;
      sanitized.photos = shouldReplacePhotos
        ? normalizePhotoArray(sanitized.photos)
        : mergePhotoArrays(current?.photos, sanitized.photos);
    }
    if (Object.prototype.hasOwnProperty.call(rawPayload, "stamping_photos")) {
      const shouldReplaceStamping = rawPayload?.replace_stamping_photos === true || rawPayload?.__replace_stamping_photos === true;
      sanitized.stamping_photos = shouldReplaceStamping
        ? normalizePhotoArray(sanitized.stamping_photos)
        : mergePhotoArrays(current?.stamping_photos, sanitized.stamping_photos);
    }

    if (entityName === "TobaccoBlend") {
      const hasFlavorPayload =
        Object.prototype.hasOwnProperty.call(sanitized, "flavor_profile") ||
        Object.prototype.hasOwnProperty.call(sanitized, "flavor_notes");
      if (hasFlavorPayload) {
        const normalizedFlavorProfile = normalizeFlavorProfileForSave(
          sanitized.flavor_profile ?? sanitized.flavor_notes
        );
        sanitized.flavor_profile = normalizedFlavorProfile;
        sanitized.flavor_notes = normalizedFlavorProfile;
      }
    }

    const finalPayload = sanitized;

    console.debug("[UPDATE RAW]", rawPayload);
    console.debug("[UPDATE SANITIZED]", sanitized);
    console.debug("[UPDATE FINAL]", finalPayload);
    
    // Perform update using the ID that actually worked (current.id)
    const response = await base44.entities[entityName].update(current.id, finalPayload);
    console.debug("[UPDATE RESPONSE]", response);
    return response;
  } catch (error) {
    console.error("[UPDATE FAILED]", error);
    console.error(`safeUpdate failed for ${entityName}:`, error);
    throw new Error(normalizeErrorMessage(error));
  }
}

/**
 * Safe batch update for multiple entities
 * 
 * @param {string} entityName - Name of the entity
 * @param {Array} updates - Array of {id, data} objects
 * @param {string} userEmail - Current user's email
 * @returns {Promise<Array>} Array of updated entities
 */
export async function safeBatchUpdate(entityName, updates, userEmail = null) {
  const results = [];
  
  for (const { id, data } of updates) {
    try {
      const result = await safeUpdate(entityName, id, data, userEmail);
      results.push({ success: true, id, data: result });
    } catch (error) {
      results.push({ success: false, id, error: error.message });
    }
  }
  
  return results;
}
