import React, { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createPageUrl } from "@/components/utils/createPageUrl";
import { useTranslation } from "@/components/i18n/safeTranslation";

// Fallback map for pages without history
const FALLBACK_MAP = {
  // Community pages
  Community: "Home",
  PublicProfile: "Community",
  
  // Tobacco pages
  TobaccoDetail: "Tobacco",
  
  // Pipe pages
  PipeDetail: "Pipes",
  
  // Profile/Settings
  Profile: "Home",
  
  // AI/Tools
  AIUpdates: "Home",
  
  // Help/Support
  FAQ: "Home",
  Support: "Home",
  HowTo: "Home",
  Troubleshooting: "Home",
  
  // Admin
  AdminReports: "Home",
};

// Root pages that shouldn't show back button
const ROOT_PAGES = new Set([
  "Home",
  "Index",
  "Pipes",
  "Tobacco",
  "TermsOfService",
  "PrivacyPolicy",
  "Subscription",
  "AgeGate",
]);

// Track navigation depth to detect if we can go back
let navigationDepth = 0;

export default function BackButton({ currentPageName, className = "" }) {
  const { t, i18n } = useTranslation();
  const lang = i18n.language;
  const navigate = useNavigate();
  const location = useLocation();
  const [canGoBack, setCanGoBack] = useState(false);

  useEffect(() => {
    // Check if we have state indicating we navigated here from within the app
    const fromInternalNav = location.state?.fromInternal || navigationDepth > 0;
    setCanGoBack(fromInternalNav);
    
    // Increment depth when component mounts (new page)
    navigationDepth++;
    
    return () => {
      // Decrement when unmounting
      if (navigationDepth > 0) navigationDepth--;
    };
  }, [location]);

  // Don't show back button on root pages
  if (ROOT_PAGES.has(currentPageName)) {
    return null;
  }

  const handleBack = () => {
    // Check if there's actual browser history to go back to
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      // No history - use fallback map
      const fallbackPage = FALLBACK_MAP[currentPageName] || "Home";
      navigate(createPageUrl(fallbackPage));
    }
  };

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={handleBack}
      className={`text-[#E0D8C8] hover:bg-white/10 ${className}`}
      aria-label={t("common.back")}
    >
      <ArrowLeft className="w-4 h-4 mr-1" />
      <span className="hidden sm:inline">{t("common.back")}</span>
    </Button>
  );
}