// First-launch banner - non-blocking, calm messaging
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTranslation } from '@/components/i18n/safeTranslation';

const BANNER_DISMISSED_KEY = 'pk_premium_access_banner_dismissed';

export default function PremiumAccessBanner({ daysRemaining }) {
  const [show, setShow] = useState(false);
  const { t } = useTranslation();

  useEffect(() => {
    // Only show if not dismissed and user has premium access
    const dismissed = localStorage.getItem(BANNER_DISMISSED_KEY);
    if (!dismissed && daysRemaining > 0) {
      // Show after short delay (not immediate)
      const timer = setTimeout(() => setShow(true), 2000);
      return () => clearTimeout(timer);
    }
  }, [daysRemaining]);

  const handleDismiss = () => {
    localStorage.setItem(BANNER_DISMISSED_KEY, 'true');
    setShow(false);
  };

  if (!show) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        className="fixed top-20 left-1/2 -translate-x-1/2 z-40 w-full max-w-md px-4"
      >
        <div className="bg-gradient-to-r from-[#8b3a3a]/95 to-[#6d2e2e]/95 backdrop-blur-sm rounded-xl shadow-2xl border border-[#E0D8C8]/20 p-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-white font-semibold mb-1">
                {t("trial.bannerTitle")}
              </h3>
              <p className="text-white/80 text-sm">
                {t("trial.bannerSubtitle")}
              </p>
            </div>
            <button
              onClick={handleDismiss}
              className="text-white/70 hover:text-white transition-colors flex-shrink-0"
              aria-label={t("trial.dismiss")}
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}