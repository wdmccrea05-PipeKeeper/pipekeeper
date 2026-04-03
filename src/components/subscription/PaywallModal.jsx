/**
 * Thin re-export — canonical PaywallModal lives at @/components/paywalls/PaywallModal.
 * The usePaywall hook lives at @/components/subscription/usePaywall.
 * All new imports must use those canonical paths directly.
 */
export { usePaywall } from "@/components/subscription/usePaywall";
export { default } from "@/components/paywalls/PaywallModal";
