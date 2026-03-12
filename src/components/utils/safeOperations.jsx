/**
 * SAFE OPERATIONS UTILITIES
 * 
 * Provides safe wrappers for localStorage, image loading, and other browser APIs
 * that can fail in private browsing or due to missing data.
 */

/**
 * Safe localStorage getter - returns null if unavailable (private browsing, etc)
 */
export function safeLocalStorage(key, defaultValue = null) {
  try {
    return localStorage.getItem(key) ?? defaultValue;
  } catch (err) {
    // localStorage is blocked (private browsing, quota exceeded, etc)
    return defaultValue;
  }
}

/**
 * Safe localStorage setter - silently fails if unavailable
 */
export function safeSetLocalStorage(key, value) {
  try {
    localStorage.setItem(key, value);
    return true;
  } catch (err) {
    // localStorage is blocked - silently fail
    return false;
  }
}

/**
 * Safe sessionStorage getter
 */
export function safeSessionStorage(key, defaultValue = null) {
  try {
    return sessionStorage.getItem(key) ?? defaultValue;
  } catch (err) {
    return defaultValue;
  }
}

/**
 * Safe sessionStorage setter
 */
export function safeSetSessionStorage(key, value) {
  try {
    sessionStorage.setItem(key, value);
    return true;
  } catch (err) {
    return false;
  }
}

/**
 * Safe image URL fallback - returns placeholder if image URL is missing
 */
export function getSafeImageUrl(imageUrl, placeholderUrl = "/images/placeholder.png") {
  if (!imageUrl || typeof imageUrl !== 'string') {
    return placeholderUrl;
  }
  return imageUrl;
}

/**
 * Safe data access with fallback chain
 */
export function safeGet(obj, path, defaultValue = undefined) {
  if (!obj || typeof obj !== 'object') {
    return defaultValue;
  }

  const keys = path.split('.');
  let current = obj;

  for (const key of keys) {
    if (current == null) {
      return defaultValue;
    }
    current = current[key];
  }

  return current ?? defaultValue;
}