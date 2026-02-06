import { TFunction } from "i18next";

/**
 * Safe translation helper that returns a fallback if the key is missing
 * 
 * Usage:
 *   const { t } = useTranslation();
 *   const text = tSafe(t, "some.key", "Default Text");
 * 
 * @param t - i18next translation function
 * @param key - Translation key
 * @param fallback - Fallback text if translation is missing
 * @param options - Optional interpolation params
 * @returns Translated text or fallback
 */
export function tSafe(
  t: TFunction,
  key: string,
  fallback: string,
  options?: Record<string, any>
): string {
  const result = t(key, options);
  
  // If translation key leaked through (i18next returned the key itself)
  if (result === key) {
    return fallback;
  }
  
  // If result contains dots and matches key pattern, it's likely a leaked key
  if (typeof result === "string" && result.includes(".") && result === key) {
    return fallback;
  }
  
  return result;
}

/**
 * Hook-based version for convenience
 * 
 * Usage:
 *   import { useSafeTranslation } from "@/components/utils/tSafe";
 *   const tSafe = useSafeTranslation();
 *   const text = tSafe("some.key", "Default Text");
 */
export function useSafeTranslation() {
  // Import here to avoid circular dependencies
  const { useTranslation } = require("react-i18next");
  const { t } = useTranslation();
  
  return (key: string, fallback: string, options?: Record<string, any>) => {
    return tSafe(t, key, fallback, options);
  };
}