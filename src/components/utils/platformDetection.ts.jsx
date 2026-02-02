/**
 * Platform detection utilities for subscription routing
 * Detects iOS wrapper vs web/Android to control Stripe vs Apple IAP flows
 */

export function isIOSWrapper(): boolean {
  // Check for iOS wrapper indicators
  if (typeof window === "undefined") return false;

  // Check for webkit bridge (iOS wrapper)
  if ((window as any).webkit) return true;

  // Check user agent
  const ua = navigator.userAgent.toLowerCase();
  const isIOSUA = /iphone|ipad|ipod/.test(ua);

  // Check navigator.platform
  const isIOSPlatform = /iphone|ipad|ipod/.test(navigator.platform.toLowerCase());

  return isIOSUA || isIOSPlatform;
}

export function isWebOrAndroid(): boolean {
  return !isIOSWrapper();
}

export function getPlatformType(): "ios_wrapper" | "web" | "android" {
  if (typeof window === "undefined") return "web";

  if (isIOSWrapper()) return "ios_wrapper";

  const ua = navigator.userAgent.toLowerCase();
  return /android/.test(ua) ? "android" : "web";
}

export const platformUtils = {
  isIOSWrapper,
  isWebOrAndroid,
  getPlatformType,
};