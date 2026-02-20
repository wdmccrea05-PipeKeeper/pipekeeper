// Quick access panel for feature discoverability
// Helps users remember where features live without redesigning navigation

import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { createPageUrl } from '@/components/utils/createPageUrl';
import { useNavigate } from 'react-router-dom';
import { 
  Zap, Package, Leaf, BarChart3, FileText, 
  Sparkles, User, HelpCircle, CreditCard 
} from 'lucide-react';
import { useTranslation } from '@/components/i18n/safeTranslation';

export default function FeatureQuickAccess({ isOpen, onClose }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  
  const features = [
    {
      icon: Package,
      label: t("nav.pipes"),
      description: t("quickAccess.catalogPipes"),
      page: "Pipes",
    },
    {
      icon: Leaf,
      label: t("nav.tobacco"),
      description: t("quickAccess.manageBlendsAndCellar"),
      page: "Tobacco",
    },
    {
      icon: BarChart3,
      label: t("quickAccess.collectionInsights"),
      description: t("quickAccess.viewPairingsUsageTrends"),
      page: "Home",
      hash: "#insights",
    },
    {
      icon: FileText,
      label: t("quickAccess.reportsExports"),
      description: t("quickAccess.generatePDFCSV"),
      page: "Home",
      hash: "#insights",
    },
    {
      icon: Sparkles,
      label: t("quickAccess.aiTools"),
      description: t("quickAccess.photoIdentificationOptimization"),
      page: "Home",
      hash: "#ai-tools",
    },
    {
      icon: CreditCard,
      label: t("subscription.title"),
      description: t("quickAccess.manageSubscription"),
      page: "Subscription",
    },
    {
      icon: User,
      label: t("nav.profile"),
      description: t("quickAccess.accountSettings"),
      page: "Profile",
    },
    {
      icon: HelpCircle,
      label: t("nav.help"),
      description: t("nav.faq"),
      page: "Help",
    },
  ];
  
  const handleFeatureClick = (feature) => {
    const url = createPageUrl(feature.page);
    navigate(url + (feature.hash || ''));
    onClose();
  };
  
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl">{t("quickAccess.quickAccess")}</DialogTitle>
          <p className="text-sm text-[#E0D8C8]/70">{t("quickAccess.jumpToFeatures")}</p>
        </DialogHeader>
        
        <div className="grid gap-3 mt-4">
          {features.map((feature, index) => (
            <button
              key={index}
              onClick={() => handleFeatureClick(feature)}
              className="flex items-start gap-3 p-3 rounded-lg hover:bg-white/5 transition-colors text-left"
            >
              <div className="w-10 h-10 rounded-lg bg-[#A35C5C]/20 flex items-center justify-center flex-shrink-0">
                <feature.icon className="w-5 h-5 text-[#A35C5C]" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-[#E0D8C8] text-sm">{feature.label}</p>
                <p className="text-xs text-[#E0D8C8]/70 mt-0.5">{feature.description}</p>
              </div>
            </button>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}