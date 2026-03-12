/**
 * What's New Popup Component
 * Displays new features to users after login
 */

import React, { useState, useEffect } from 'react';
import { X, Sparkles } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useTranslation } from '@/components/i18n/safeTranslation';

const WHATS_NEW_VERSION = '2.0.0'; // Increment when you have new updates
const STORAGE_KEY = 'pk_whats_new_dismissed';

export default function WhatsNewPopup({ user }) {
  const [isOpen, setIsOpen] = useState(false);
  const [dontShowAgain, setDontShowAgain] = useState(false);
  const { t } = useTranslation();

  useEffect(() => {
    if (!user?.email) return;

    // Check if user has dismissed this version
    const dismissed = localStorage.getItem(`${STORAGE_KEY}_${WHATS_NEW_VERSION}`);
    if (dismissed) {
      setIsOpen(false);
      return;
    }

    // Delay showing popup to avoid overwhelming user on login
    const timer = setTimeout(() => {
      setIsOpen(true);
    }, 2000); // 2 second delay

    return () => clearTimeout(timer);
  }, [user?.email]);

  const handleDismiss = () => {
    if (dontShowAgain) {
      localStorage.setItem(`${STORAGE_KEY}_${WHATS_NEW_VERSION}`, 'true');
    }
    setIsOpen(false);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999] bg-black/60 flex items-center justify-center p-4">
      <div
        className="w-full max-w-xl rounded-2xl relative overflow-hidden shadow-2xl"
        style={{
          background: `linear-gradient(135deg, rgba(50,35,25,0.9), rgba(30,20,15,0.95))`,
          border: '2px solid rgba(212, 175, 116, 0.3)'
        }}
      >
        {/* Close button */}
        <button
          onClick={handleDismiss}
          className="absolute top-4 right-4 p-2 hover:bg-white/10 rounded-lg transition-all"
        >
          <X className="w-5 h-5 text-[#E0D8C8]" />
        </button>

        {/* Header */}
        <div className="px-8 pt-8 pb-4 text-center border-b border-[#E0D8C8]/20">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-full mb-4" style={{
            background: 'rgba(212, 175, 116, 0.2)',
            border: '2px solid rgba(212, 175, 116, 0.4)'
          }}>
            <Sparkles className="w-7 h-7" style={{ color: '#D4A574' }} />
          </div>
          <h2 className="text-3xl font-bold text-[#E0D8C8] mb-2">{t("whatsNew.title", { defaultValue: "What's New" })}</h2>
          <p className="text-[#E0D8C8]/70">{t("whatsNew.subtitle", { defaultValue: "PipeKeeper has been updated with exciting new features" })}</p>
        </div>

        {/* Content */}
        <div className="px-8 py-6 space-y-4 max-h-96 overflow-y-auto">
          <FeatureItem
            icon="📖"
            title={t("whatsNew.storyTitle", { defaultValue: "Collector Story Cards" })}
            description={t("whatsNew.storyDesc", { defaultValue: "View and share beautiful narrative cards about your collector journey. Tap View Story on your Home page." })}
          />
          <FeatureItem
            icon="🎯"
            title={t("whatsNew.curatorTitle", { defaultValue: "Enhanced Collection Curator" })}
            description={t("whatsNew.curatorDesc", { defaultValue: "Get expert guidance organized into 5 categories: Rotation, Cellar, Pairing, Discovery, and Stewardship." })}
          />
          <FeatureItem
            icon="📊"
            title={t("whatsNew.insightsTitle", { defaultValue: "Improved Insights Dashboard" })}
            description={t("whatsNew.insightsDesc", { defaultValue: "More detailed collection statistics, smoking streaks, and collection highlights with beautiful visualizations." })}
          />
          <FeatureItem
            icon="💡"
            title={t("whatsNew.recommendationsTitle", { defaultValue: "Better Recommendations" })}
            description={t("whatsNew.recommendationsDesc", { defaultValue: "Smarter AI pairing suggestions, collection optimization, and curator insights based on your preferences." })}
          />
          <FeatureItem
            icon="🔍"
            title={t("whatsNew.aiToolsTitle", { defaultValue: "Advanced AI Tools" })}
            description={t("whatsNew.aiToolsDesc", { defaultValue: "Use AI to identify pipes, analyze geometry from photos, and estimate tobacco market values." })}
          />
          <FeatureItem
            icon="🌍"
            title={t("whatsNew.sharingTitle", { defaultValue: "Enhanced Sharing" })}
            description={t("whatsNew.sharingDesc", { defaultValue: "Export story cards and collection insights to share with other enthusiasts on social media." })}
          />
        </div>

        {/* Footer */}
        <div className="px-8 py-6 border-t border-[#E0D8C8]/20 space-y-4">
          <label className="flex items-center gap-3 cursor-pointer group">
            <input
              type="checkbox"
              checked={dontShowAgain}
              onChange={(e) => setDontShowAgain(e.target.checked)}
              className="w-4 h-4 rounded cursor-pointer"
            />
            <span className="text-sm text-[#E0D8C8]/70 group-hover:text-[#E0D8C8] transition-colors">
              {t("whatsNew.dontShowAgain", { defaultValue: "Don't show this again" })}
            </span>
          </label>
          <div className="flex gap-3">
            <button
              onClick={handleDismiss}
              className="flex-1 px-4 py-2.5 rounded-lg font-semibold transition-all hover:bg-white/10"
              style={{ color: '#D4A574' }}
            >
              {t("whatsNew.dismiss", { defaultValue: "Dismiss" })}
            </button>
            <a
              href="/Help"
              onClick={handleDismiss}
              className="flex-1 px-4 py-2.5 rounded-lg font-semibold text-white transition-all text-center"
              style={{
                background: 'linear-gradient(135deg, rgba(212, 175, 116, 0.3), rgba(212, 175, 116, 0.15))',
                border: '1px solid rgba(212, 175, 116, 0.4)'
              }}
            >
              {t("whatsNew.learnMore", { defaultValue: "Learn More" })}
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

function FeatureItem({ icon, title, description }) {
  return (
    <div className="flex gap-4 p-3 rounded-lg" style={{ background: 'rgba(60, 45, 30, 0.3)' }}>
      <div className="text-2xl flex-shrink-0">{icon}</div>
      <div>
        <h3 className="font-semibold text-[#E0D8C8] mb-1">{title}</h3>
        <p className="text-sm text-[#E0D8C8]/70">{description}</p>
      </div>
    </div>
  );
}