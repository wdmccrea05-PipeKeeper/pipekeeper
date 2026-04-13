/**
 * Locale-aware formatting utilities for numbers, dates, and currency
 * Respects user's selected language (pk_lang from localStorage)
 */
import { formatMoneyFromBase } from '@/lib/currency/formatCurrency';
import { getCachedRates, getCurrentDisplayCurrency } from '@/lib/currency/exchangeRateStore';

/**
 * Get locale code from pk_lang localStorage key
 */
export function getLocale() {
  let lang = 'en';
  try {
    lang = (typeof window !== 'undefined' && window?.localStorage?.getItem('pk_lang')) || 'en';
  } catch {
    lang = 'en';
  }

  // Map language codes to locale codes
  const localeMap = {
    'en': 'en-US',
    'es': 'es-ES',
    'fr': 'fr-FR',
    'de': 'de-DE',
    'it': 'it-IT',
    'pt-BR': 'pt-BR',
    'nl': 'nl-NL',
    'pl': 'pl-PL',
    'ja': 'ja-JP',
    'zh-Hans': 'zh-CN',
  };
  
  return localeMap[lang] || 'en-US';
}

/**
 * Format a number with locale-specific separators
 * @param {number} value - Number to format
 * @param {number} decimals - Number of decimal places (default: 0)
 */
export function formatNumber(value, decimals = 0) {
  if (value === null || value === undefined || isNaN(value)) return '—';
  
  return new Intl.NumberFormat(getLocale(), {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
}

/**
 * Format a date with locale-specific format
 * @param {Date|string} date - Date to format
 * @param {string} style - 'short', 'medium', 'long', or 'full' (default: 'medium')
 */
export function formatDate(date, style = 'medium') {
  if (!date) return '—';
  
  const d = typeof date === 'string' ? new Date(date) : date;
  if (isNaN(d.getTime())) return '—';
  
  const options = {
    short: { year: 'numeric', month: 'numeric', day: 'numeric' },
    medium: { year: 'numeric', month: 'short', day: 'numeric' },
    long: { year: 'numeric', month: 'long', day: 'numeric' },
    full: { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' },
  };
  
  return new Intl.DateTimeFormat(getLocale(), options[style] || options.medium).format(d);
}

/**
 * Format a date and time with locale-specific format
 */
export function formatDateTime(date, includeTime = true) {
  if (!date) return '—';
  
  const d = typeof date === 'string' ? new Date(date) : date;
  if (isNaN(d.getTime())) return '—';
  
  const options = includeTime
    ? { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }
    : { year: 'numeric', month: 'short', day: 'numeric' };
  
  return new Intl.DateTimeFormat(getLocale(), options).format(d);
}

/**
 * Format currency with locale-specific format.
 * Thin compatibility wrapper only — delegates to the shared currency stack.
 * Values are assumed to be stored in USD (base currency).
 * @param {number} value      - Amount in base currency (USD)
 * @param {Object|string} options - Options object or legacy currency string override
 */
export function formatCurrency(value, options = {}) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return '—';

  // Support legacy call-sites that pass a currency string as second arg
  const opts = typeof options === 'string' ? { currency: options } : options;
  const currency = opts.currency || getCurrentDisplayCurrency();
  const locale = opts.locale || getLocale();
  const baseCurrency = opts.baseCurrency || 'USD';
  const rates = getCachedRates();

  return formatMoneyFromBase(Number(value), currency, locale, rates, baseCurrency);
}

/**
 * Format a relative time (e.g., "3 days ago")
 * @param {Date|string} date - Date to compare
 */
export function formatRelativeTime(date) {
  if (!date) return '—';
  
  const d = typeof date === 'string' ? new Date(date) : date;
  if (isNaN(d.getTime())) return '—';
  
  const now = new Date();
  const diffMs = now - d;
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const diffMonths = Math.floor(diffDays / 30);
  const diffYears = Math.floor(diffDays / 365);
  
  // Use Intl.RelativeTimeFormat for proper localization
  const rtf = new Intl.RelativeTimeFormat(getLocale(), { numeric: 'auto' });
  
  if (diffDays === 0) return rtf.format(0, 'day');
  if (diffDays < 30) return rtf.format(-diffDays, 'day');
  if (diffMonths < 12) return rtf.format(-diffMonths, 'month');
  return rtf.format(-diffYears, 'year');
}

/**
 * Format a percentage
 */
export function formatPercentage(value, decimals = 0) {
  if (value === null || value === undefined || isNaN(value)) return '—';
  
  return new Intl.NumberFormat(getLocale(), {
    style: 'percent',
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value / 100);
}

/**
 * Format weight with locale-specific format
 * @param {number} value - Weight value
 * @param {string} unit - 'oz', 'g', or 'kg'
 */
export function formatWeight(value, unit = 'oz') {
  if (value === null || value === undefined || isNaN(value)) return '—';
  
  const formatted = formatNumber(value, 1);
  return `${formatted} ${unit}`;
}

/**
 * Format measurement with locale-specific format
 * @param {number} value - Measurement value
 * @param {string} unit - 'mm', 'cm', 'in'
 */
export function formatMeasurement(value, unit = 'mm') {
  if (value === null || value === undefined || isNaN(value)) return '—';
  
  const formatted = formatNumber(value, 1);
  return `${formatted}${unit}`;
}