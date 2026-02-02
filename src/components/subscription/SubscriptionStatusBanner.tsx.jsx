import React, { useEffect, useState } from "react";
import { AlertCircle, X } from "lucide-react";
import { base44 } from "@/api/base44Client";

interface SubscriptionStatusBannerProps {
  onDismiss?: () => void;
}

export default function SubscriptionStatusBanner({ onDismiss }: SubscriptionStatusBannerProps) {
  const [bannerText, setBannerText] = useState("");
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const fetchBannerConfig = async () => {
      try {
        // Check if backup mode is enabled
        const backupModeRes = await base44.functions
          .invoke("getRemoteConfig", {
            key: "SUBSCRIPTION_BACKUP_MODE",
            environment: "live",
          })
          .catch(() => ({ data: { value: "" } }));

        if (backupModeRes?.data?.value?.toLowerCase() !== "true") {
          setIsVisible(false);
          return;
        }

        // Check if banner is enabled
        const bannerEnabledRes = await base44.functions
          .invoke("getRemoteConfig", {
            key: "SUBSCRIPTION_STATUS_BANNER_ENABLED",
            environment: "live",
          })
          .catch(() => ({ data: { value: "" } }));

        if (bannerEnabledRes?.data?.value?.toLowerCase() !== "true") {
          setIsVisible(false);
          return;
        }

        // Get banner text
        const bannerTextRes = await base44.functions
          .invoke("getRemoteConfig", {
            key: "SUBSCRIPTION_STATUS_BANNER_TEXT",
            environment: "live",
          })
          .catch(() => ({
            data: {
              value:
                "Subscription management is temporarily limited due to a platform issue. New subscriptions work normally. Contact support for changes.",
            },
          }));

        if (bannerTextRes?.data?.value) {
          setBannerText(bannerTextRes.data.value);
          setIsVisible(true);
        }
      } catch (err) {
        console.error("Failed to fetch banner config:", err);
      }
    };

    fetchBannerConfig();
  }, []);

  if (!isVisible) return null;

  return (
    <div className="bg-amber-50 border-b border-amber-200 px-4 py-3 flex items-start gap-3">
      <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
      <div className="flex-1">
        <p className="text-sm text-amber-900">{bannerText}</p>
      </div>
      <button
        onClick={() => {
          setIsVisible(false);
          onDismiss?.();
        }}
        className="flex-shrink-0 text-amber-600 hover:text-amber-700 transition-colors"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}