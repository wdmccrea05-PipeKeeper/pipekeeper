import React, { useState, useMemo } from 'react';
import { Search, X, BookOpen, ChevronRight } from 'lucide-react';
import { useTranslation } from '@/components/i18n/safeTranslation';
import { searchHelpArticles, HELP_ARTICLES } from './documentationRegistry';

const MODULE_LABEL = {
  hub: 'Hub',
  pipekeeper: 'PipeKeeper',
  whiskeykeeper: 'WhiskeyKeeper',
  curator: 'Curator',
};

const MODULE_COLOR = {
  hub: 'text-[#D4A574]',
  pipekeeper: 'text-[#a87d52]',
  whiskeykeeper: 'text-[#c4a35a]',
  curator: 'text-[#8ab4c4]',
};

// Top question shortcuts shown when the input is empty / focused
const TOP_QUESTIONS = [
  { label: 'How do I use the Curator?', query: 'how do i use the curator' },
  { label: 'How do I log a tasting?', query: 'log tasting' },
  { label: 'How do I add a pipe?', query: 'add pipe' },
  { label: "How do I use Tonight's Session?", query: "tonights session" },
  { label: 'How do I view Collection Insights?', query: 'collection insights' },
];

export default function DocumentationSearch({ fullPage = false }) {
  const { t } = useTranslation();
  const [query, setQuery] = useState('');
  const [focused, setFocused] = useState(false);

  const results = useMemo(() => {
    if (query.length < 2) return [];
    return searchHelpArticles(query).slice(0, 8);
  }, [query]);

  // Near-miss suggestions when nothing scored but we have a query
  const suggestions = useMemo(() => {
    if (query.length < 2 || results.length > 0) return [];
    // Return first 4 articles from related modules based on first word
    const word = query.split(' ')[0].toLowerCase();
    return HELP_ARTICLES.filter(a =>
      a.module.includes(word) || a.category.includes(word)
    ).slice(0, 4);
  }, [query, results]);

  const showDropdown = focused && (query.length >= 2 || !query);

  const handleSelect = (article) => {
    window.dispatchEvent(new CustomEvent('help:navigate', {
      detail: { type: 'article', module: article.module, id: article.id }
    }));
    setQuery('');
    setFocused(false);
  };

  const handleShortcut = (q) => {
    setQuery(q);
    setFocused(true);
  };

  return (
    <div className={`relative ${fullPage ? 'w-full' : ''}`}>
      {/* Input */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#D7C9B2]/50 pointer-events-none" />
        <input
          type="text"
          placeholder={t('help.searchDocs', 'Search help articles, features, questions…')}
          value={query}
          onChange={e => setQuery(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setTimeout(() => setFocused(false), 150)}
          className="w-full pl-10 pr-10 py-2.5 rounded-lg bg-[rgba(180,140,75,0.1)] border border-[rgba(180,140,75,0.2)] text-[#F5F1E7] placeholder-[#D7C9B2]/50 focus:outline-none focus:border-[rgba(180,140,75,0.4)] text-sm"
        />
        {query && (
          <button
            onMouseDown={e => e.preventDefault()}
            onClick={() => setQuery('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-[#D7C9B2]/50 hover:text-[#F5F1E7]"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Dropdown */}
      {showDropdown && (
        <div className="absolute top-full left-0 right-0 mt-1 z-50 bg-[rgba(16,11,8,0.97)] border border-[rgba(180,140,75,0.22)] rounded-xl shadow-2xl max-h-[400px] overflow-y-auto">

          {/* No query — show top questions */}
          {!query && (
            <div className="p-3">
              <p className="text-[10px] uppercase tracking-widest text-[#D7C9B2]/40 px-1 mb-2">Popular questions</p>
              {TOP_QUESTIONS.map(tq => (
                <button
                  key={tq.query}
                  onMouseDown={e => e.preventDefault()}
                  onClick={() => handleShortcut(tq.query)}
                  className="w-full flex items-center gap-2 text-left px-2 py-2 rounded-lg hover:bg-[rgba(180,140,75,0.1)] text-sm text-[#F5F1E7]/80 transition-colors"
                >
                  <ChevronRight className="w-3 h-3 text-[#D4A574]/60 flex-shrink-0" />
                  {tq.label}
                </button>
              ))}
            </div>
          )}

          {/* Results */}
          {results.length > 0 && (
            <div className="divide-y divide-[rgba(180,140,75,0.08)]">
              {results.map(article => (
                <button
                  key={article.id}
                  onMouseDown={e => e.preventDefault()}
                  onClick={() => handleSelect(article)}
                  className="w-full text-left px-4 py-3 hover:bg-[rgba(180,140,75,0.08)] transition-colors"
                >
                  <div className="flex items-start gap-2">
                    <BookOpen className="w-3.5 h-3.5 mt-0.5 text-[#D4A574]/60 flex-shrink-0" />
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-[#F5F1E7] leading-snug">{article.title}</p>
                      <p className="text-xs text-[#D7C9B2]/60 mt-0.5 line-clamp-2">{article.summary}</p>
                      <span className={`text-[10px] font-medium mt-1 inline-block ${MODULE_COLOR[article.module] || 'text-[#D7C9B2]/50'}`}>
                        {MODULE_LABEL[article.module] || article.module}
                      </span>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* Near-miss suggestions when no results */}
          {query.length >= 2 && results.length === 0 && suggestions.length > 0 && (
            <div className="p-3">
              <p className="text-[10px] uppercase tracking-widest text-[#D7C9B2]/40 px-1 mb-2">You might also want</p>
              {suggestions.map(article => (
                <button
                  key={article.id}
                  onMouseDown={e => e.preventDefault()}
                  onClick={() => handleSelect(article)}
                  className="w-full flex items-center gap-2 text-left px-2 py-2 rounded-lg hover:bg-[rgba(180,140,75,0.1)] text-sm text-[#F5F1E7]/80 transition-colors"
                >
                  <ChevronRight className="w-3 h-3 text-[#D4A574]/60 flex-shrink-0" />
                  <span>{article.title}</span>
                  <span className={`text-[10px] ml-auto ${MODULE_COLOR[article.module] || ''}`}>
                    {MODULE_LABEL[article.module] || article.module}
                  </span>
                </button>
              ))}
            </div>
          )}

          {/* True no results */}
          {query.length >= 2 && results.length === 0 && suggestions.length === 0 && (
            <div className="p-5 text-center">
              <p className="text-sm text-[#D7C9B2]/60 mb-3">No exact match found for <em className="text-[#F5F1E7]/80">"{query}"</em></p>
              <p className="text-xs text-[#D7C9B2]/40 mb-3">Try one of these:</p>
              <div className="flex flex-wrap gap-2 justify-center">
                {TOP_QUESTIONS.slice(0, 3).map(tq => (
                  <button
                    key={tq.query}
                    onMouseDown={e => e.preventDefault()}
                    onClick={() => handleShortcut(tq.query)}
                    className="text-xs px-2 py-1 rounded-full bg-[rgba(180,140,75,0.15)] text-[#D4A574] hover:bg-[rgba(180,140,75,0.25)] transition-colors"
                  >
                    {tq.label}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}