/**
 * Safe navigation utilities to prevent full page reloads
 * and ensure consistent ID encoding
 */

import { createPageUrl } from './createPageUrl';

/**
 * Navigate to a page programmatically without full reload
 * @param {string} pageName - Page name with optional query params
 */
export function navigateTo(pageName) {
  window.location.href = createPageUrl(pageName);
}

/**
 * Create a safe detail page URL with properly encoded ID
 * @param {string} pageName - Page name (e.g., 'PipeDetail', 'TobaccoDetail')
 * @param {string|number} id - Entity ID to encode
 * @param {object} additionalParams - Optional additional query parameters
 * @returns {string} Fully formed URL with encoded ID
 */
export function createDetailUrl(pageName, id, additionalParams = {}) {
  const params = new URLSearchParams({
    id: encodeURIComponent(id),
    ...additionalParams
  });
  
  return createPageUrl(`${pageName}?${params.toString()}`);
}

/**
 * Navigate to a detail page with safe ID encoding
 * @param {string} pageName - Page name
 * @param {string|number} id - Entity ID
 */
export function navigateToDetail(pageName, id) {
  window.location.href = createDetailUrl(pageName, id);
}

/**
 * Create click handler for navigation without full reload
 * @param {string} pageName - Page name with optional query params
 * @returns {function} Click handler function
 */
export function createNavHandler(pageName) {
  return (e) => {
    e.preventDefault();
    navigateTo(pageName);
  };
}

/**
 * Create click handler for detail page navigation
 * @param {string} pageName - Page name
 * @param {string|number} id - Entity ID
 * @returns {function} Click handler function
 */
export function createDetailNavHandler(pageName, id) {
  return (e) => {
    e.preventDefault();
    navigateToDetail(pageName, id);
  };
}