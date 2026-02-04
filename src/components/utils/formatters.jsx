/**
 * Canonical formatting utilities for numbers, currency, dates, and measurements
 * Used across the application for consistent display formatting
 */

/**
 * Format a number with locale-aware thousand separators
 * @param value - Number to format
 * @param locale - Locale code (defaults to 'en-US')
 * @param decimals - Number of decimal places (defaults to 0)
 * @returns Formatted string
 */
export function formatNumber(value, locale = 'en-US', decimals = 0) {
  if (value === null || value === undefined || isNaN(value)) return '0';
  return parseFloat(value).toLocaleString(locale, { 
    minimumFractionDigits: decimals, 
    maximumFractionDigits: decimals 
  });
}

/**
 * Format a currency value
 * @param value - Number to format
 * @param currencyCode - Currency code (defaults to 'USD')
 * @param locale - Locale code (defaults to 'en-US')
 * @returns Formatted currency string (e.g., "$1,234")
 */
export function formatCurrency(value, currencyCode = 'USD', locale = 'en-US') {
  if (value === null || value === undefined || isNaN(value)) return '$0';
  
  // For USD, use simple formatting with $ prefix
  if (currencyCode === 'USD') {
    return `$${parseFloat(value).toLocaleString(locale, { 
      minimumFractionDigits: 0, 
      maximumFractionDigits: 0 
    })}`;
  }
  
  // For other currencies, use full locale formatting
  return parseFloat(value).toLocaleString(locale, {
    style: 'currency',
    currency: currencyCode,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
}

/**
 * Format a percentage value
 * @param value - Number to format (0-100 scale)
 * @param decimals - Number of decimal places (defaults to 0)
 * @returns Formatted percentage string (e.g., "75%")
 */
export function formatPercent(value, decimals = 0) {
  if (value === null || value === undefined || isNaN(value)) return '0%';
  return `${parseFloat(value).toFixed(decimals)}%`;
}

/**
 * Format a date value
 * @param date - Date object, string, or timestamp
 * @param options - Intl.DateTimeFormatOptions
 * @param locale - Locale code (defaults to 'en-US')
 * @returns Formatted date string
 */
export function formatDate(date, options = {}, locale = 'en-US') {
  if (!date) return '';
  
  const defaultOptions = {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    ...options
  };
  
  try {
    const dateObj = date instanceof Date ? date : new Date(date);
    return dateObj.toLocaleDateString(locale, defaultOptions);
  } catch (err) {
    console.warn('Failed to format date:', err);
    return String(date);
  }
}

/**
 * Format a weight value with unit
 * @param grams - Weight in grams
 * @param useImperial - Whether to use imperial units (oz)
 * @returns Formatted weight string (e.g., "25.4 g" or "0.9 oz")
 */
export function formatWeight(grams, useImperial = false) {
  if (grams === null || grams === undefined || isNaN(grams)) return '';
  
  if (useImperial) {
    const oz = grams / 28.35;
    return `${Math.round(oz * 100) / 100} oz`;
  }
  
  return `${Math.round(grams * 100) / 100} g`;
}

/**
 * Format a length value with unit
 * @param mm - Length in millimeters
 * @param useImperial - Whether to use imperial units (inches)
 * @returns Formatted length string (e.g., "150 mm" or "5.91 in")
 */
export function formatLength(mm, useImperial = false) {
  if (mm === null || mm === undefined || isNaN(mm)) return '';
  
  if (useImperial) {
    const inches = mm / 25.4;
    return `${Math.round(inches * 100) / 100} in`;
  }
  
  return `${Math.round(mm * 100) / 100} mm`;
}

/**
 * Format a volume value with unit
 * @param ml - Volume in milliliters
 * @param useImperial - Whether to use imperial units (oz)
 * @returns Formatted volume string (e.g., "100 ml" or "3.4 oz")
 */
export function formatVolume(ml, useImperial = false) {
  if (ml === null || ml === undefined || isNaN(ml)) return '';
  
  if (useImperial) {
    const oz = ml / 29.5735;
    return `${Math.round(oz * 100) / 100} oz`;
  }
  
  return `${Math.round(ml * 100) / 100} ml`;
}