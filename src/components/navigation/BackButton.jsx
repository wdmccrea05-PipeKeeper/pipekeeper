import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { createPageUrl } from '@/components/utils/createPageUrl';
import { useTranslation } from '@/components/i18n/safeTranslation';

const FALLBACK_MAP = {
  Community: 'CollectionHub',
  PublicProfile: 'Community',
  TobaccoDetail: 'Tobacco',
  PipeDetail: 'Pipes',
  BottleDetail: 'WhiskeyKeeper',
  Tastings: 'WhiskeyKeeper',
  Profile: 'CollectionHub',
  FAQ: 'HelpCenter',
  Support: 'HelpCenter',
  HowTo: 'HelpCenter',
  Troubleshooting: 'HelpCenter',
  AdminReports: 'CollectionHub',
};

const ROOT_PAGES = new Set(['Home', 'Index', 'CollectionHub', 'Pipes', 'Tobacco', 'WhiskeyKeeper', 'TermsOfService', 'PrivacyPolicy', 'Subscription', 'AgeGate']);

export default function BackButton({ currentPageName, className = '' }) {
  const { t } = useTranslation();
  const navigate = useNavigate();

  if (ROOT_PAGES.has(currentPageName)) return null;

  const handleBack = () => {
    if (window.history.length > 1) {
      navigate(-1);
      return;
    }
    navigate(createPageUrl(FALLBACK_MAP[currentPageName] || 'CollectionHub'));
  };

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={handleBack}
      className={`text-[#E0D8C8] hover:bg-white/10 ${className}`}
      aria-label={t('common.back')}
    >
      <ArrowLeft className="w-4 h-4 mr-1" />
      <span>{t('common.back')}</span>
    </Button>
  );
}