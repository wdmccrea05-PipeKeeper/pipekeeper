import React, { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { base44 } from "@/api/base44Client";
import { ExternalLink, AlertCircle } from "lucide-react";

interface SubscriptionBackupModeModalProps {
  isOpen: boolean;
  onClose: () => void;
  userEmail?: string;
}

export default function SubscriptionBackupModeModal({
  isOpen,
  onClose,
  userEmail,
}: SubscriptionBackupModeModalProps) {
  const [links, setLinks] = useState<Record<string, string>>({});
  const [supportEmail, setSupportEmail] = useState("admin@pipekeeperapp.com");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    const fetchConfig = async () => {
      try {
        setLoading(true);
        const keyPromises = [
          "STRIPE_CHECKOUT_PREMIUM_MONTHLY_URL",
          "STRIPE_CHECKOUT_PREMIUM_ANNUAL_URL",
          "STRIPE_CHECKOUT_PRO_MONTHLY_URL",
          "STRIPE_CHECKOUT_PRO_ANNUAL_URL",
          "SUBSCRIPTION_SUPPORT_EMAIL",
        ].map((key) =>
          base44.functions
            .invoke("getRemoteConfig", { key, environment: "live" })
            .then((res) => ({ key, value: res.data?.value || "" }))
            .catch(() => ({ key, value: "" }))
        );

        const results = await Promise.all(keyPromises);
        const newLinks: Record<string, string> = {};
        let email = supportEmail;

        results.forEach(({ key, value }) => {
          if (key === "SUBSCRIPTION_SUPPORT_EMAIL" && value) {
            email = value;
          } else if (value) {
            newLinks[key] = value;
          }
        });

        setLinks(newLinks);
        setSupportEmail(email);
      } catch (err) {
        console.error("Failed to fetch subscription config:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchConfig();
  }, [isOpen]);

  const handleEmailSupport = () => {
    const subject = "Subscription Help";
    const body = `Subscription management is temporarily unavailable. Please help me update/cancel/change my subscription.\n\nMy account email is: ${userEmail || ""}`;
    window.location.href = `mailto:${supportEmail}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  };

  const openCheckoutLink = (url: string) => {
    if (url) {
      window.open(url, "_blank");
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-amber-500" />
            Subscription Management
          </DialogTitle>
          <DialogDescription>
            Automated subscription management is temporarily unavailable due to a platform issue.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-900">
            <p className="font-medium mb-1">Temporarily Limited</p>
            <p>You can subscribe securely using the links below, or contact support for changes.</p>
          </div>

          {loading ? (
            <div className="text-center py-4 text-muted-foreground">Loading options...</div>
          ) : (
            <div className="space-y-2">
              <p className="text-sm font-medium">Subscribe now:</p>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { key: "STRIPE_CHECKOUT_PREMIUM_MONTHLY_URL", label: "Premium Monthly" },
                  { key: "STRIPE_CHECKOUT_PREMIUM_ANNUAL_URL", label: "Premium Annual" },
                  { key: "STRIPE_CHECKOUT_PRO_MONTHLY_URL", label: "Pro Monthly" },
                  { key: "STRIPE_CHECKOUT_PRO_ANNUAL_URL", label: "Pro Annual" },
                ].map(({ key, label }) => (
                  <Button
                    key={key}
                    variant={links[key] ? "default" : "outline"}
                    disabled={!links[key]}
                    onClick={() => openCheckoutLink(links[key])}
                    className="text-xs h-9"
                    title={!links[key] ? "Link not configured" : undefined}
                  >
                    {label}
                    {links[key] && <ExternalLink className="w-3 h-3 ml-1" />}
                  </Button>
                ))}
              </div>
            </div>
          )}

          <div className="border-t pt-4">
            <p className="text-sm font-medium mb-2">Need to modify your subscription?</p>
            <Button variant="outline" className="w-full" onClick={handleEmailSupport}>
              Email Support
            </Button>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-xs text-blue-900">
            <p>
              <strong>Note:</strong> If you just subscribed, your features should unlock automatically within 1–2 minutes.
              If not, contact support.
            </p>
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}