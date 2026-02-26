// Non-blocking reminder on days 5-6
import React from 'react';
import { motion } from 'framer-motion';
import { Sparkles, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { createPageUrl } from '@/components/utils/createPageUrl';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from '@/components/i18n/safeTranslation';

export default function Day5Reminder({ onDismiss, daysRemaining }) {
  const navigate = useNavigate();
  const { t } = useTranslation();

  const handleViewOptions = () => {
    navigate(createPageUrl('Subscription'));
  };

  const titleKey = daysRemaining === 1 ? "trial.day5Title" : "trial.day5TitlePlural";

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      className="fixed bottom-6 right-6 z-50 max-w-sm"
    >
      <div className="bg-gradient-to-r from-[#8b3a3a]/95 to-[#6d2e2e]/95 backdrop-blur-sm rounded-xl shadow-2xl border border-[#E0D8C8]/20 p-5">
        <div className="flex items-start gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-white font-semibold mb-1">
              {t(titleKey, { count: daysRemaining })}
            </h3>
            <p className="text-white/80 text-sm">
              {t("trial.day5Subtitle")}
            </p>
          </div>
          <button
            onClick={onDismiss}
            className="text-white/70 hover:text-white transition-colors flex-shrink-0"
            aria-label={t("trial.dismiss")}
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="flex gap-2">
          <Button
            variant="ghost"
            onClick={onDismiss}
            className="flex-1 text-white hover:bg-white/10"
          >
            {t("trial.day5GotIt")}
          </Button>
          <Button
            onClick={handleViewOptions}
            className="flex-1 bg-white/20 hover:bg-white/30 text-white"
          >
            {t("trial.day5ViewOptions")}
          </Button>
        </div>
      </div>
    </motion.div>
  );
}