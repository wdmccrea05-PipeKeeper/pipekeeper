import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import { createPageUrl } from "@/components/utils/createPageUrl";

export default function SubscriptionSuccess() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<"loading" | "success" | "timeout">("loading");
  const [secondsRemaining, setSecondsRemaining] = useState(60);

  useEffect(() => {
    let refreshCount = 0;
    const maxRefreshes = 12;

    const refreshEntitlements = async () => {
      try {
        refreshCount++;
        await queryClient.invalidateQueries({ queryKey: ["current-user"] });
        await queryClient.invalidateQueries({ queryKey: ["subscription"] });

        const userQuery = queryClient.getQueryData(["current-user"]);
        if (userQuery) {
          setStatus("success");
          return;
        }

        if (refreshCount >= maxRefreshes) {
          setStatus("timeout");
          return;
        }
      } catch (err) {
        console.error("Failed to refresh entitlements:", err);
        if (refreshCount >= maxRefreshes) {
          setStatus("timeout");
        }
      }
    };

    refreshEntitlements();

    const interval = setInterval(() => {
      setSecondsRemaining((prev) => Math.max(0, prev - 5));
      refreshEntitlements();
    }, 5000);

    return () => clearInterval(interval);
  }, [queryClient]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0B1320] via-[#112133] to-[#0B1320] flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-[#1A2B3A] border border-[#A35C5C]/50 rounded-2xl p-8 shadow-xl">
        {status === "loading" && (
          <>
            <div className="flex justify-center mb-6">
              <Loader2 className="w-12 h-12 text-[#A35C5C] animate-spin" />
            </div>
            <h1 className="text-2xl font-bold text-[#E0D8C8] text-center mb-4">Processing Your Subscription</h1>
            <p className="text-[#E0D8C8]/70 text-center mb-6">
              Thanks! We're confirming your subscription and unlocking your features.
            </p>
            <p className="text-sm text-[#E0D8C8]/50 text-center">
              Auto-refresh: {secondsRemaining}s remaining...
            </p>
          </>
        )}

        {status === "success" && (
          <>
            <div className="flex justify-center mb-6">
              <CheckCircle2 className="w-12 h-12 text-green-500" />
            </div>
            <h1 className="text-2xl font-bold text-[#E0D8C8] text-center mb-4">Welcome!</h1>
            <p className="text-[#E0D8C8]/70 text-center mb-6">Your subscription is active. Premium features are now available.</p>
            <Button className="w-full" onClick={() => navigate(createPageUrl("Home"))}>
              Go to Home
            </Button>
          </>
        )}

        {status === "timeout" && (
          <>
            <div className="flex justify-center mb-6">
              <AlertCircle className="w-12 h-12 text-amber-500" />
            </div>
            <h1 className="text-2xl font-bold text-[#E0D8C8] text-center mb-4">Subscription Pending</h1>
            <p className="text-[#E0D8C8]/70 text-center mb-4">
              Your subscription was received. Features may take a few minutes to unlock.
            </p>
            <p className="text-sm text-[#E0D8C8]/50 text-center mb-6">
              If your features don't unlock within 2 minutes, please contact support.
            </p>
            <Button className="w-full" onClick={() => navigate(createPageUrl("Home"))}>
              Continue
            </Button>
          </>
        )}
      </div>
    </div>
  );
}