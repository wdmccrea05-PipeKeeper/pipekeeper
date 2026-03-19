import React from 'react';
import { X } from 'lucide-react';
import OnlineImageSearch from '@/components/search/OnlineImageSearch';

export default function OnlineImageSearchModal({
  isOpen,
  onClose,
  onImageSelected,
  recordType = 'bottle',
  recordData = {},
  title,
}) {
  if (!isOpen) return null;

  const resolvedTitle = title || (
    recordType === 'pipe' ? 'Search Pipe Photos' :
    recordType === 'tobacco' || recordType === 'blend' ? 'Search Tobacco Photos' :
    'Search Bottle Photos'
  );

  return (
    <div
      className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/70 p-2 sm:p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-4xl rounded-2xl overflow-hidden flex flex-col"
        style={{ maxHeight: 'min(85vh, 680px)' }}
        style={{
          background:
            'linear-gradient(135deg, rgba(42, 31, 24, 0.98), rgba(24, 17, 12, 0.99))',
          border: '1px solid rgba(180,140,75,0.25)',
          boxShadow: '0 20px 60px rgba(0,0,0,0.7)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className="shrink-0 px-5 py-4 flex items-center justify-between border-b"
          style={{ borderColor: 'rgba(180,140,75,0.14)' }}
        >
          <div>
            <h3 className="text-lg font-semibold text-[#F5F1E7]">{resolvedTitle}</h3>
            <p className="text-xs mt-1 text-[#D8C7A6]/70">
              Search and select a photo to use for this record.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="text-[#E0D8C8]/70 hover:text-[#E0D8C8] transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 min-h-0 overflow-hidden">
          <OnlineImageSearch
            recordType={recordType}
            recordData={recordData}
            onImageSelected={(url) => {
              onImageSelected?.(url);
            }}
            onClose={onClose}
          />
        </div>
      </div>
    </div>
  );
}