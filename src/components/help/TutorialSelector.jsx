import React, { useMemo, useState, useEffect } from 'react';
import { ChevronRight, BookOpen } from 'lucide-react';
import { useTranslation } from '@/components/i18n/safeTranslation';
import { detectActiveModules } from './moduleDetection';
import { getArticleById } from './documentationRegistry';

const MODULE_COLOR = {
  hub: 'text-[#D4A574] border-[rgba(212,165,116,0.25)] bg-[rgba(212,165,116,0.07)]',
  pipekeeper: 'text-[#a87d52] border-[rgba(168,125,82,0.25)] bg-[rgba(168,125,82,0.07)]',
  whiskeykeeper: 'text-[#c4a35a] border-[rgba(196,163,90,0.25)] bg-[rgba(196,163,90,0.07)]',
  cigarkeeper: 'text-[#b87c5a] border-[rgba(184,124,90,0.25)] bg-[rgba(184,124,90,0.07)]',
  curator: 'text-[#8ab4c4] border-[rgba(138,180,196,0.25)] bg-[rgba(138,180,196,0.07)]',
};

const MODULE_LABEL = {
  hub: 'Hub',
  pipekeeper: 'PipeKeeper',
  whiskeykeeper: 'WhiskeyKeeper',
  cigarkeeper: 'CigarKeeper',
  curator: 'Curator',
};

// Priority order for tutorials tab
const TUTORIAL_IDS_ORDERED = [
  'hub-overview',
  'curator-overview',
  'tonights-session',
  'pipekeeper-overview',
  'add-pipe',
  'log-smoking-session',
  'pipekeeper-ai-pairings',
  'whiskeykeeper-overview',
  'add-bottle',
  'log-tasting',
  'whiskey-inventory',
  'cigarkeeper-overview',
  'add-cigar',
  'log-cigar-session',
  'cigar-humidor',
  'collection-insights',
  'sharing-stories',
  'global-search',
];

function ArticleDetail({ article, onBack }) {
  const { t } = useTranslation();
  return (
    <div className="space-y-4">
      <button
        onClick={onBack}
        className="flex items-center gap-1 text-sm text-[#D4A574] hover:text-[#F5F1E7] transition-colors"
      >
        {t("auto.components_help_TutorialSelector.back_to_tutorials_7gnei8")}
      </button>
      <div className="p-5 rounded-xl border border-[rgba(180,140,75,0.18)] bg-[rgba(25,17,12,0.7)]">
        <span className={`text-[10px] uppercase tracking-wider font-semibold px-2 py-0.5 rounded-full border ${MODULE_COLOR[article.module] || ''}`}>
          {MODULE_LABEL[article.module] || article.module}
        </span>
        <h2 className="text-xl font-bold text-[#F5F1E7] mt-3 mb-2">{article.title}</h2>
        <p className="text-[#D4A574] text-sm mb-4 font-medium">{article.summary}</p>
        <p className="text-[#E0D8C8]/80 text-sm leading-relaxed whitespace-pre-line">{article.body}</p>

        {article.relatedArticles?.length > 0 && (
          <div className="mt-5 pt-4 border-t border-[rgba(180,140,75,0.1)]">
            <p className="text-xs text-[#D7C9B2]/50 uppercase tracking-wider mb-2">{t("auto.components_help_TutorialSelector.related_articles_1wbobh")}</p>
            <div className="flex flex-col gap-1.5">
              {article.relatedArticles.map(id => {
                const rel = getArticleById(id);
                if (!rel) return null;
                return (
                  <button
                    key={id}
                    onClick={() => window.dispatchEvent(new CustomEvent('help:navigate', { detail: { id } }))}
                    className="flex items-center gap-2 text-sm text-[#D4A574] hover:text-[#F5F1E7] transition-colors"
                  >
                    <BookOpen className="w-3.5 h-3.5 flex-shrink-0" />
                    {rel.title}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function TutorialSelector({ user, subscription }) {
  const { t } = useTranslation();
  const [selectedArticle, setSelectedArticle] = useState(null);

  const activeModules = useMemo(() => detectActiveModules(user, subscription), [user, subscription]);

  // Listen for navigation events from search/AI
  useEffect(() => {
    const handler = (e) => {
      const { id } = e.detail || {};
      if (id) {
        const article = getArticleById(id);
        if (article) setSelectedArticle(article);
      }
    };
    window.addEventListener('help:navigate', handler);
    return () => window.removeEventListener('help:navigate', handler);
  }, []);

  const articles = useMemo(() => {
    return TUTORIAL_IDS_ORDERED
      .map(id => getArticleById(id))
      .filter(Boolean)
      .filter(a => {
        // Always show hub + curator articles
        if (['hub', 'curator'].includes(a.module)) return true;
        if (a.module === 'cigarkeeper') return activeModules.includes('cigarkeeper');
        return activeModules.includes(a.module);
      });
  }, [activeModules]);

  if (selectedArticle) {
    return <ArticleDetail article={selectedArticle} onBack={() => setSelectedArticle(null)} />;
  }

  return (
    <div className="space-y-2">
      {articles.map(article => (
        <button
          key={article.id}
          onClick={() => setSelectedArticle(article)}
          className="w-full text-left p-4 rounded-lg border border-[rgba(180,140,75,0.18)] bg-[rgba(180,140,75,0.04)] hover:bg-[rgba(180,140,75,0.09)] transition-colors group"
        >
          <div className="flex items-center justify-between gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h4 className="font-semibold text-[#F5F1E7] group-hover:text-[#FFE5C9] transition-colors text-sm">
                  {article.title}
                </h4>
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full border ${MODULE_COLOR[article.module] || ''}`}>
                  {MODULE_LABEL[article.module] || article.module}
                </span>
              </div>
              <p className="text-xs text-[#D7C9B2]/60 mt-1 line-clamp-1">{article.summary}</p>
            </div>
            <ChevronRight className="w-4 h-4 text-[#D7C9B2]/40 group-hover:text-[#D7C9B2] transition-colors flex-shrink-0" />
          </div>
        </button>
      ))}

      {articles.length === 0 && (
        <p className="text-sm text-[#D7C9B2]/70 text-center py-4">
          {t('help.noTutorialsAvailable')}
        </p>
      )}
    </div>
  );
}