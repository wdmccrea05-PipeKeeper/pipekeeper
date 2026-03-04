import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/components/utils/createPageUrl";
import { handleManageSubscription } from "@/components/utils/manageSubscription";
import { hasPaidAccess } from "@/components/utils/premiumAccess";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

export default function SubscriptionManagementButton({ user, subscription, className = "" }) {
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleClick = async () => {
    setLoading(true);
    try {
      await handleManageSubscription(user, subscription, navigate, createPageUrl);
    } finally {
      setLoading(false);
    }
  };

  // FIX ISSUE-07: Use canonical hasPaidAccess resolver instead of raw subscription.status check.
  // This also covers admin-granted users (no Subscription entity) and entitlement_tier-based access.
  if (!hasPaidAccess(user, subscription)) {
    return null;
  }

  return (
    <Button
      onClick={handleClick}
      disabled={loading}
      className={className}
    >
      {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Manage Subscription"}
    </Button>
  );
}