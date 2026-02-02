import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle2, Loader2, Mail, AlertCircle } from "lucide-react";
import { useCurrentUser } from "@/components/hooks/useCurrentUser";

export default function BillingSuccess() {
  const [status, setStatus] = useState("verifying"); // verifying | success | failed
  const [plan, setPlan] = useState("");
  const [needsSupport, setNeedsSupport] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useCurrentUser();

  const verifySubscription = async () => {
    try {
      setStatus("verifying");
      
      const response = await base44.functions.invoke("verifyStripeEntitlement", {});
      
      if (response?.data?.ok && (response.data.plan === "premium" || response.data.plan === "pro")) {
        setPlan(response.data.plan);
        setStatus("success");
        
        // Invalidate entitlement queries
        await queryClient.invalidateQueries({ queryKey: ["current-user"] });
        await queryClient.invalidateQueries({ queryKey: ["subscription"] });
        
        // Redirect after 2 seconds
        setTimeout(() => {
          navigate("/Profile");
        }, 2000);
      } else if (response?.data?.needs_support) {
        setStatus("failed");
        setNeedsSupport(true);
        setErrorMessage(response.data?.message || "Verification incomplete");
      } else {
        setStatus("failed");
        setErrorMessage("Could not verify subscription");
      }
    } catch (error) {
      console.error("[BillingSuccess] Verification failed:", error);
      setStatus("failed");
      setNeedsSupport(true);
      setErrorMessage("Auto-verification is temporarily unavailable");
    }
  };

  useEffect(() => {
    verifySubscription();
  }, []);

  const handleContactSupport = () => {
    const email = "admin@pipekeeperapp.com";
    const subject = encodeURIComponent("Subscription Help - Billing Success");
    const body = encodeURIComponent(
      `Hi PipeKeeper Support,\n\nI just completed checkout but my account did not unlock automatically.\n\nEmail: ${user?.email || ""}\nPlan: ${plan || "Premium/Pro"}\n\nPlease help me unlock my subscription.\n\nThanks!`
    );
    window.location.href = `mailto:${email}?subject=${subject}&body=${body}`;
  };

  if (status === "verifying") {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-[#1a2c42] via-[#243548] to-[#1a2c42]">
        <Card className="w-full max-w-md bg-[#223447] border-white/10">
          <CardHeader>
            <CardTitle className="text-center text-[#e8d5b7]">Finishing Setup...</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col items-center gap-4">
              <Loader2 className="w-12 h-12 animate-spin text-[#A35C5C]" />
              <p className="text-center text-[#e8d5b7]/80">
                Verifying your subscription and unlocking features...
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (status === "success") {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-[#1a2c42] via-[#243548] to-[#1a2c42]">
        <Card className="w-full max-w-md bg-[#223447] border-white/10">
          <CardHeader>
            <CardTitle className="text-center text-[#e8d5b7]">Welcome to PipeKeeper {plan === "pro" ? "Pro" : "Premium"}! 🎉</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col items-center gap-4">
              <CheckCircle2 className="w-16 h-16 text-green-500" />
              <p className="text-center text-[#e8d5b7]/80">
                Your subscription has been activated successfully!
              </p>
              <p className="text-center text-[#e8d5b7]/60 text-sm">
                Redirecting to your profile...
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Failed state
  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-[#1a2c42] via-[#243548] to-[#1a2c42]">
      <Card className="w-full max-w-md bg-[#223447] border-white/10">
        <CardHeader>
          <CardTitle className="text-center text-[#e8d5b7]">Almost There...</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col items-center gap-4">
            <AlertCircle className="w-12 h-12 text-amber-500" />
            <p className="text-center text-[#e8d5b7]/80">
              {errorMessage || "We received your checkout, but auto-sync is temporarily down."}
            </p>
            
            {needsSupport && (
              <>
                <p className="text-center text-[#e8d5b7]/60 text-sm">
                  Don't worry! Contact support to activate your subscription manually.
                </p>
                
                <Button
                  onClick={handleContactSupport}
                  className="w-full bg-[#A35C5C] hover:bg-[#8B4A4A] text-[#e8d5b7]"
                >
                  <Mail className="w-4 h-4 mr-2" />
                  Email Support to Unlock
                </Button>
              </>
            )}
            
            <Button
              onClick={verifySubscription}
              variant="outline"
              className="w-full border-white/20 text-[#e8d5b7] hover:bg-white/5"
            >
              Try Again
            </Button>
            
            <Button
              onClick={() => navigate("/Profile")}
              variant="ghost"
              className="text-[#e8d5b7]/60"
            >
              Return to Profile
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}