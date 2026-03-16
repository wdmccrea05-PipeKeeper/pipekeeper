import React, { useState, useMemo } from 'react';
import { Search, X } from 'lucide-react';
import { useTranslation } from '@/components/i18n/safeTranslation';
import { searchDocumentation } from './documentationRegistry';

export default function DocumentationSearch() {
  const { t } = useTranslation();
  const [searchQuery, setSearchQuery] = useState('');
  const [showResults, setShowResults] = useState(false);

  const results = useMemo(() => {
    if (searchQuery.length < 2) return [];
    return searchDocumentation(searchQuery).slice(0, 10);
  }, [searchQuery]);

  const handleResultClick = (result) => {
    // Emit event for parent to handle navigation
    window.dispatchEvent(
      new CustomEvent('help:navigate', {
        detail: {
          type: result.type,
          module: result.module,
          id: result.id,
          tutorialId: result.tutorialId
        }
      })
    );
    setSearchQuery('');
    setShowResults(false);
  };

  return (
    <div className="relative">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-[#D7C9B2]/50" />
        <input
          type="text"
          placeholder={t('help.searchDocs', 'Search documentation...')}
          value={searchQuery}
          onChange={(e) => {
            setSearchQuery(e.target.value);
            setShowResults(true);
          }}
          onFocus={() => setShowResults(true)}
          className="w-full pl-10 pr-10 py-2 rounded-lg bg-[rgba(180,140,75,0.1)] border border-[rgba(180,140,75,0.2)] text-[#F5F1E7] placeholder-[#D7C9B2]/50 focus:outline-none focus:border-[rgba(180,140,75,0.4)]"
        />
        {searchQuery && (
          <button
            onClick={() => {
              setSearchQuery('');
              setShowResults(false);
            }}
            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-[#D7C9B2]/50 hover:text-[#F5F1E7]"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {showResults && searchQuery.length >= 2 && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-[rgba(20,15,10,0.95)] border border-[rgba(180,140,75,0.2)] rounded-lg shadow-lg z-50 max-h-96 overflow-y-auto">
          {results.length > 0 ? (
            <div className="divide-y divide-[rgba(180,140,75,0.1)]">
              {results.map((result, idx) => (
                <button
                  key={idx}
                  onClick={() => handleResultClick(result)}
                  className="w-full text-left p-3 hover:bg-[rgba(180,140,75,0.1)] transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-[#F5F1E7]">{result.title}</p>
                      <p className="text-xs text-[#D7C9B2]/60 mt-1 line-clamp-2">{result.preview}</p>
                      <p className="text-xs text-[#D7C9B2]/40 mt-1">
                        {result.module} • {result.type}
                      </p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <div className="p-4 text-center text-[#D7C9B2]/70 text-sm">
              {t('help.noResults', 'No results found')}
            </div>
          )}
        </div>
      )}
    </div>
  );
}