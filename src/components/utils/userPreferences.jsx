/**
 * User Preferences Manager
 * Saves and loads user preferences like sorting, filters, collapse states, etc.
 */

const STORAGE_KEY = 'pk_user_preferences';

/**
 * Get all stored preferences for the current user
 */
export function getPreferences(userEmail) {
  try {
    const stored = localStorage.getItem(`${STORAGE_KEY}_${userEmail}`);
    return stored ? JSON.parse(stored) : {};
  } catch {
    return {};
  }
}

/**
 * Get a specific preference value
 */
export function getPreference(userEmail, key, defaultValue = null) {
  const prefs = getPreferences(userEmail);
  return prefs[key] !== undefined ? prefs[key] : defaultValue;
}

/**
 * Set a specific preference value
 */
export function setPreference(userEmail, key, value) {
  try {
    const prefs = getPreferences(userEmail);
    prefs[key] = value;
    localStorage.setItem(`${STORAGE_KEY}_${userEmail}`, JSON.stringify(prefs));
  } catch (err) {
    console.error('Failed to save preference:', err);
  }
}

/**
 * Set multiple preferences at once
 */
export function setPreferences(userEmail, updates) {
  try {
    const prefs = { ...getPreferences(userEmail), ...updates };
    localStorage.setItem(`${STORAGE_KEY}_${userEmail}`, JSON.stringify(prefs));
  } catch (err) {
    console.error('Failed to save preferences:', err);
  }
}

/**
 * Clear all preferences for a user
 */
export function clearPreferences(userEmail) {
  try {
    localStorage.removeItem(`${STORAGE_KEY}_${userEmail}`);
  } catch (err) {
    console.error('Failed to clear preferences:', err);
  }
}