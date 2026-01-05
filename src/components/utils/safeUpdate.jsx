import { base44 } from "@/api/base44Client";

/**
 * Safe entity update that merges changes with existing data
 * Prevents accidental data loss from partial updates
 * 
 * @param {string} entityName - Name of the entity (e.g., 'Pipe', 'TobaccoBlend')
 * @param {string|number} id - Entity ID
 * @param {object} updates - Fields to update
 * @param {string} userEmail - Current user's email (optional, for ownership verification)
 * @returns {Promise} Updated entity
 */
export async function safeUpdate(entityName, id, updates, userEmail = null) {
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
    
    // Merge updates with current data, preserving critical fields
    const { id: _, created_date, updated_date, ...existingData } = current;
    const merged = {
      ...existingData,
      ...updates,
      // Always preserve these fields
      created_by: current.created_by,
    };
    
    // Perform update using the ID that actually worked (current.id)
    return await base44.entities[entityName].update(current.id, merged);
  } catch (error) {
    console.error(`safeUpdate failed for ${entityName}:`, error);
    throw error;
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