import { base44 } from "@/api/base44Client";

let cachedConfig = null;
let cacheTimestamp = 0;
const CACHE_TTL = 60 * 1000; // 60 seconds

const DEFAULTS = {
  premiumMonthly: "",
  premiumAnnual: "",
  proMonthly: "",
  proAnnual: "",
  supportEmail: "admin@pipekeeperapp.com",
  stripePortalEnabled: false,
  banner: "",
};

export async function getBillingConfig() {
  const now = Date.now();
  
  if (cachedConfig && (now - cacheTimestamp) < CACHE_TTL) {
    return cachedConfig;
  }

  try {
    const configs = await base44.entities.RemoteConfig.filter({ is_active: true });
    
    const config = { ...DEFAULTS };
    
    configs.forEach((item) => {
      switch (item.key) {
        case "billing_premium_monthly_link":
          config.premiumMonthly = item.value || "";
          break;
        case "billing_premium_annual_link":
          config.premiumAnnual = item.value || "";
          break;
        case "billing_pro_monthly_link":
          config.proMonthly = item.value || "";
          break;
        case "billing_pro_annual_link":
          config.proAnnual = item.value || "";
          break;
        case "billing_support_email":
          config.supportEmail = item.value || DEFAULTS.supportEmail;
          break;
        case "billing_stripe_portal_enabled":
          config.stripePortalEnabled = item.value === "true" || item.value === true;
          break;
        case "billing_message_banner":
          config.banner = item.value || "";
          break;
      }
    });

    cachedConfig = config;
    cacheTimestamp = now;
    
    return config;
  } catch (error) {
    console.error("[billingConfig] Failed to fetch config:", error);
    return DEFAULTS;
  }
}

export function clearBillingConfigCache() {
  cachedConfig = null;
  cacheTimestamp = 0;
}