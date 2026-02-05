import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/components/utils/createPageUrl";
import { handleManageSubscription } from "@/components/utils/manageSubscription";
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

  // Show button if user has paid access
  if (!subscription?.status || (subscription.status !== "active" && subscription.status !== "trialing")) {
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