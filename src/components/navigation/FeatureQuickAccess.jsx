// Quick access panel for feature discoverability
// Helps users remember where features live without redesigning navigation

import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { createPageUrl } from '@/components/utils/createPageUrl';
import { useNavigate } from 'react-router-dom';
import { Package, Leaf, BarChart3, FileText, Sparkles, User, HelpCircle, CreditCard } from 'lucide-react';
import { useTranslation } from '@/components/i18n/safeTranslation';

export default function FeatureQuickAccess({ isOpen, onClose }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  
  const features = [
    {
      icon: Package,
      label: t("nav.pipes", "Pipes"),
      description: t("quickAccess.catalogPipes", "Catalog and manage your pipes"),
      page: "Pipes",
    },
    {
      icon: Leaf,
      label: t("nav.tobacco", "Tobacco"),
      description: t("quickAccess.manageBlendsAndCellar", "Manage blends and cellar"),
      page: "Tobacco",
    },
    {
      icon: BarChart3,
      label: t("quickAccess.collectionInsights", "Collection Insights"),
      description: t("quickAccess.viewPairingsUsageTrends", "View pairings, usage & trends"),
      page: "Home",
      hash: "#insights",
    },
    {
      icon: FileText,
      label: t("quickAccess.reportsExports", "Reports & Exports"),
      description: t("quickAccess.generatePDFCSV", "Generate PDF & CSV reports"),
      page: "Home",
      hash: "#insights",
    },
    {
      icon: Sparkles,
      label: t("quickAccess.aiTools", "AI Tools"),
      description: t("quickAccess.photoIdentificationOptimization", "Photo identification & optimization"),
      page: "Home",
      hash: "#ai-tools",
    },
    {
      icon: CreditCard,
      label: t("subscription.title", "Subscriptions"),
      description: t("quickAccess.manageSubscription", "Manage your subscription"),
      page: "Subscription",
    },
    {
      icon: User,
      label: t("nav.profile", "Profile"),
      description: t("quickAccess.accountSettings", "Account settings & preferences"),
      page: "Profile",
    },
    {
      icon: HelpCircle,
      label: t("nav.help", "Help"),
      description: t("nav.faq", "FAQ & support resources"),
      page: "HelpCenter",
    },
  ];
  
  const handleFeatureClick = (feature) => {
    const url = createPageUrl(feature.page);
    navigate(url + (feature.hash || ''));
    onClose();
  };
  
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="w-[calc(100vw-2rem)] max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl">{t("quickAccess.quickAccess", "Quick Access")}</DialogTitle>
          <p className="text-sm text-[#E0D8C8]/70">{t("quickAccess.jumpToFeatures", "Jump to any feature quickly")}</p>
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