// Value-moment paywall - shown after user experiences value
// Calm, continuity-focused messaging
import React from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle2, X } from 'lucide-react';
import { createPageUrl } from '@/components/utils/createPageUrl';
import { useNavigate } from 'react-router-dom';
import { getTrialDayNumber } from '@/components/utils/paywallTriggers';
import { useTranslation } from '@/components/i18n/safeTranslation';
import { isAppleBuild } from '@/components/utils/appVariant';

export default function ValueMomentPaywall({ onDismiss, user, daysRemaining }) {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const dayNumber = getTrialDayNumber(user);
  const isDay7 = dayNumber >= 7;

  const handleContinueFree = () => {
    onDismiss();
  };

  const handleContinuePremium = () => {
    navigate(createPageUrl('Subscription'));
  };

  const handleUpgradePro = () => {
    navigate(createPageUrl('Subscription'));
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[200] flex items-center justify-center p-4"
      onClick={onDismiss}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="w-full max-w-4xl"
        onClick={(e) => e.stopPropagation()}
      >
        <Card className="bg-[#1A2B3A]/98 border-[#E0D8C8]/20 overflow-hidden">
          <div className="relative">
            <button
              onClick={onDismiss}
              className="absolute top-4 right-4 text-[#E0D8C8]/60 hover:text-[#E0D8C8] transition-colors z-10"
              aria-label="Close"
            >
              <X className="w-6 h-6" />
            </button>

            <CardHeader className="text-center pt-8 pb-6">
              <CardTitle className="text-2xl sm:text-3xl font-bold text-[#E0D8C8] mb-2">
                Continue using Premium tools for your collection
              </CardTitle>
              <p className="text-[#E0D8C8]/70 text-sm sm:text-base">
                {isDay7 
                  ? "Your 7 days of full Premium access are complete — choose how you'd like to continue."
                  : `You have ${daysRemaining} day${daysRemaining !== 1 ? 's' : ''} of Premium access remaining — choose how you'd like to continue.`}
              </p>
            </CardHeader>

            <CardContent className="px-4 sm:px-8 pb-8">
              <div className="grid sm:grid-cols-3 gap-4 mb-6">
                {/* Free Tier */}
                <div className="border border-[#E0D8C8]/20 rounded-xl p-4 bg-[#112133]/40">
                  <h3 className="text-lg font-semibold text-[#E0D8C8] mb-2">Free</h3>
                  <p className="text-sm text-[#E0D8C8]/70 mb-4">
                    Core cataloging for pipes and cellar items.
                  </p>
                  <div className="space-y-2 mb-4">
                    <div className="flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                      <span className="text-sm text-[#E0D8C8]/80">Basic item records</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                      <span className="text-sm text-[#E0D8C8]/80">Notes and photos</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                      <span className="text-sm text-[#E0D8C8]/80">Manual organization</span>
                    </div>
                  </div>
                  <Button variant="outline" onClick={handleContinueFree} className="w-full">
                    Continue with Free
                  </Button>
                </div>

                {/* Premium Tier - Emphasized */}
                <div className="border-2 border-[#A35C5C] rounded-xl p-4 bg-[#1A2B3A]/80 relative">
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-[#A35C5C] text-white px-3 py-1 rounded-full text-xs font-semibold">
                    Recommended
                  </div>
                  <h3 className="text-lg font-semibold text-[#E0D8C8] mb-1">Premium</h3>
                  <p className="text-xs text-[#A35C5C] font-semibold mb-2">For active collectors</p>
                  <p className="text-sm text-[#E0D8C8]/70 mb-3">
                    Expanded insights, reports, and advanced organization tools.
                  </p>
                  <div className="space-y-2 mb-3">
                    <div className="flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                      <span className="text-sm text-[#E0D8C8]/80">Collection insights</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                      <span className="text-sm text-[#E0D8C8]/80">Reports and exports</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                      <span className="text-sm text-[#E0D8C8]/80">Advanced tools</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                      <span className="text-sm text-[#E0D8C8]/80">Priority features</span>
                    </div>
                  </div>
                  <p className="text-lg font-bold text-[#A35C5C] mb-1">$1.99/mo or $19.99/yr</p>
                  <p className="text-xs text-emerald-500 mb-2">Annual saves vs monthly</p>
                  <Button onClick={handleContinuePremium} className="w-full bg-[#A35C5C] hover:bg-[#8F4E4E] mb-2">
                    {t("subscription.continueWithPremium")}
                  </Button>
                  <p className="text-xs text-[#E0D8C8]/60 text-center">
                    {isDay7 
                      ? t("subscription.renewsAuto")
                      : t("subscription.startsAfterTrial")}
                  </p>
                </div>

                {/* Pro Tier */}
                <div className="border border-[#E0D8C8]/20 rounded-xl p-4 bg-[#112133]/40">
                  <h3 className="text-lg font-semibold text-[#E0D8C8] mb-1">Pro</h3>
                  <p className="text-xs text-[#A35C5C] font-semibold mb-2">For advanced collectors</p>
                  <p className="text-sm text-[#E0D8C8]/70 mb-4">
                    Deep analytics and AI-assisted tools.
                  </p>
                  <div className="space-y-2 mb-4">
                    <div className="flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                      <span className="text-sm text-[#E0D8C8]/80">Deep analytics</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                      <span className="text-sm text-[#E0D8C8]/80">AI-assisted tools</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                      <span className="text-sm text-[#E0D8C8]/80">Power features</span>
                    </div>
                  </div>
                  <p className="text-lg font-bold text-[#A35C5C] mb-3">$2.99/mo or $29.99/yr</p>
                  <Button variant="outline" onClick={handleUpgradePro} className="w-full">
                    Upgrade to Pro
                  </Button>
                </div>
              </div>

              {/* Reassurance */}
              <div className="text-center space-y-1 text-xs text-[#E0D8C8]/60 pt-4 border-t border-[#E0D8C8]/10">
                <p>• Cancel anytime</p>
                {isAppleBuild && <p>• {t("subscription.managedThrough")}</p>}
                <p>• {t("subscription.dataNotAffected")}</p>
              </div>
            </CardContent>
          </div>
        </Card>
      </motion.div>
    </motion.div>
  );
}