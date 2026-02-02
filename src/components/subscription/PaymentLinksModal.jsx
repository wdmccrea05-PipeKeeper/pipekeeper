import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ExternalLink, Mail } from "lucide-react";

export default function PaymentLinksModal({ isOpen, onClose, config, userEmail }) {
  const supportMailto = `mailto:${config.supportEmail}?subject=${encodeURIComponent(
    "PipeKeeper Subscription Help"
  )}&body=${encodeURIComponent(
    `Hi PipeKeeper Support,

I need help with my subscription.

Email used in PipeKeeper: ${userEmail || ""}
Request: 

Thanks!`
  )}`;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg bg-[#243548] border-[#A35C5C]/60">
        <DialogHeader>
          <DialogTitle className="text-[#E0D8C8] text-xl">Subscription Options</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {config.banner && (
            <div className="rounded-lg bg-[#1A2B3A] border border-[#A35C5C]/30 p-3">
              <p className="text-[#E0D8C8] text-sm leading-relaxed">{config.banner}</p>
            </div>
          )}

          <div className="space-y-3">
            <p className="text-[#E0D8C8] leading-relaxed">
              Automated subscription management is temporarily unavailable. You can still subscribe or upgrade using the links below, or contact support.
            </p>
          </div>

          <div className="space-y-2">
            <h3 className="text-[#E0D8C8] font-semibold mb-2">Premium Tier</h3>
            <div className="grid gap-2">
              {config.premiumMonthly && (
                <Button
                  variant="outline"
                  className="w-full justify-between border-[#A35C5C]/50 text-[#E0D8C8] hover:bg-[#A35C5C]/20"
                  onClick={() => window.open(config.premiumMonthly, "_blank")}
                >
                  Premium Monthly
                  <ExternalLink className="w-4 h-4 ml-2" />
                </Button>
              )}
              {config.premiumAnnual && (
                <Button
                  variant="outline"
                  className="w-full justify-between border-[#A35C5C]/50 text-[#E0D8C8] hover:bg-[#A35C5C]/20"
                  onClick={() => window.open(config.premiumAnnual, "_blank")}
                >
                  Premium Annual
                  <ExternalLink className="w-4 h-4 ml-2" />
                </Button>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <h3 className="text-[#E0D8C8] font-semibold mb-2">Pro Tier</h3>
            <div className="grid gap-2">
              {config.proMonthly && (
                <Button
                  variant="outline"
                  className="w-full justify-between border-[#A35C5C]/50 text-[#E0D8C8] hover:bg-[#A35C5C]/20"
                  onClick={() => window.open(config.proMonthly, "_blank")}
                >
                  Pro Monthly
                  <ExternalLink className="w-4 h-4 ml-2" />
                </Button>
              )}
              {config.proAnnual && (
                <Button
                  variant="outline"
                  className="w-full justify-between border-[#A35C5C]/50 text-[#E0D8C8] hover:bg-[#A35C5C]/20"
                  onClick={() => window.open(config.proAnnual, "_blank")}
                >
                  Pro Annual
                  <ExternalLink className="w-4 h-4 ml-2" />
                </Button>
              )}
            </div>
          </div>

          <div className="pt-4 border-t border-[#A35C5C]/30">
            <Button
              variant="outline"
              className="w-full justify-center border-[#A35C5C]/50 text-[#E0D8C8] hover:bg-[#A35C5C]/20"
              onClick={() => window.location.href = supportMailto}
            >
              <Mail className="w-4 h-4 mr-2" />
              Email Support
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}