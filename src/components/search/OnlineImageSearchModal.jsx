import React from 'react';
import { X } from 'lucide-react';
import { Button } from "@/components/ui/button";
import OnlineImageSearch from './OnlineImageSearch';
import { useTranslation } from "@/components/i18n/safeTranslation";

/**
 * OnlineImageSearchModal
 * 
 * Modal wrapper for the online image search component
 * Appears as an overlay with search interface
 */
export default function OnlineImageSearchModal({
  isOpen,
  recordType,
  recordData,
  onImageSelected,
  onClose
}) {
  const { t } = useTranslation();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div
        className="relative w-full max-w-2xl max-h-[85vh] rounded-2xl overflow-hidden flex flex-col"
        style={{
          background: 'linear-gradient(180deg, rgba(28,20,14,0.98), rgba(20,15,11,0.99))',
          border: '1px solid rgba(224,216,200,0.15)',
          boxShadow: '0 20px 60px rgba(0,0,0,0.8), inset 0 1px 0 rgba(224,216,200,0.1)'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between p-6 border-b border-[#E0D8C8]/10" style={{
          background: 'linear-gradient(to bottom, rgba(35,25,18,0.95), rgba(28,20,14,0.9))',
        }}>
          <div>
            <h2 className="text-xl font-bold text-[#F5F1E7]">
              {t("onlineImageSearch.title", "Search Online Images")}
            </h2>
            <p className="text-sm text-[#E0D8C8]/70 mt-1">
              {t("onlineImageSearch.subtitle", "Find product images to add to your record")}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/5 rounded-lg transition-colors text-[#E0D8C8]/70 hover:text-[#E0D8C8]"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto flex-1 min-h-0">
          <OnlineImageSearch
            recordType={recordType}
            recordData={recordData}
            onImageSelected={onImageSelected}
            onClose={onClose}
          />
        </div>
      </div>
    </div>
  );
}