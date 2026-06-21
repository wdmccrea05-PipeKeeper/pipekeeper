import React, { useState, useRef, useEffect } from 'react';
import { Send, Loader2, BookOpen, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTranslation } from '@/components/i18n/safeTranslation';
import { base44 } from '@/api/base44Client';
import { buildAiContext, getArticleById } from './documentationRegistry';
import ReactMarkdown from 'react-markdown';

const MODULE_COLOR = {
  hub: 'text-[#D4A574]',
  pipekeeper: 'text-[#a87d52]',
  whiskeykeeper: 'text-[#c4a35a]',
  curator: 'text-[#8ab4c4]',
};

const STARTER_QUESTIONS = [
  'How do I use the Curator?',
  "How do I use Tonight's Session?",
  'How do I log a tasting?',
  'How do I add a pipe?',
];

function RelatedArticleChips({ articleIds }) {
  if (!articleIds || articleIds.length === 0) return null;
  const articles = articleIds.map(id => getArticleById(id)).filter(Boolean);
  if (articles.length === 0) return null;
  return (
    <div className="mt-3 flex flex-wrap gap-1.5">
      {articles.map(a => (
        <button
          key={a.id}
          onClick={() => window.dispatchEvent(new CustomEvent('help:navigate', {
            detail: { type: 'article', module: a.module, id: a.id }
          }))}
          className={`flex items-center gap-1 text-[10px] px-2 py-1 rounded-full bg-[rgba(180,140,75,0.12)] border border-[rgba(180,140,75,0.2)] hover:bg-[rgba(180,140,75,0.22)] transition-colors ${MODULE_COLOR[a.module] || 'text-[#D4A574]'}`}
        >
          <BookOpen className="w-2.5 h-2.5" />
          {a.title}
        </button>
      ))}
    </div>
  );
}

export default function AiHelpAssistant() {
  const { t } = useTranslation();
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const handleAsk = async (questionText) => {
    const question = (questionText || input).trim();
    if (!question || isLoading) return;

    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: question }]);
    setIsLoading(true);

    try {
      const { context, articles } = buildAiContext(question, 4);

      const docsBlock = context
        ? `You have access to the following CollectionKeeper help articles. Base your answer on these:\n\n${context}`
        : 'No specific help articles matched this query, but answer from your general knowledge of CollectionKeeper.';

      const prompt = `You are a helpful support assistant for CollectionKeeper — a pipe, tobacco, and whiskey collection management app.

${docsBlock}

---

User question: ${question}

Instructions:
- Answer clearly and specifically using the help articles above.
- Use markdown formatting (bold, lists) for readability.
- If steps are involved, use a numbered list.
- At the end, briefly mention which help article(s) you used (title only).
- Do NOT say documentation is missing if you found relevant articles above.
- Keep the answer concise — under 250 words.`;

      const response = await base44.integrations.Core.InvokeLLM({
        prompt,
        model: 'gemini_3_flash',
      });

      const relatedIds = articles.flatMap(a => a.relatedArticles || []).slice(0, 4);

      setMessages(prev => [...prev, {
        role: 'assistant',
        content: response,
        sourceArticles: articles.map(a => a.id),
        relatedArticles: relatedIds,
      }]);
    } catch (err) {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: t('help.aiError'),
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col bg-[rgba(12,8,6,0.6)] rounded-xl border border-[rgba(180,140,75,0.15)]" style={{ minHeight: '420px', maxHeight: '600px' }}>
      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4" style={{ minHeight: 0 }}>
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center gap-4 py-6">
            <p className="text-[#D7C9B2]/60 text-sm">
              {t('help.askQuestion')}
            </p>
            <div className="flex flex-col gap-2 w-full max-w-xs">
              {STARTER_QUESTIONS.map(q => (
                <button
                  key={q}
                  onClick={() => handleAsk(q)}
                  className="flex items-center gap-2 text-left text-xs px-3 py-2 rounded-lg bg-[rgba(180,140,75,0.1)] border border-[rgba(180,140,75,0.18)] text-[#D4A574] hover:bg-[rgba(180,140,75,0.18)] transition-colors"
                >
                  <ChevronRight className="w-3 h-3 flex-shrink-0" />
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg, idx) => (
          <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] px-4 py-3 rounded-xl text-sm ${
              msg.role === 'user'
                ? 'bg-[rgba(180,140,75,0.2)] text-[#F5F1E7]'
                : 'bg-[rgba(40,30,22,0.8)] text-[#E0D8C8] border border-[rgba(180,140,75,0.1)]'
            }`}>
              {msg.role === 'assistant' ? (
                <>
                  <ReactMarkdown
                    className="prose prose-sm prose-invert max-w-none [&>*:first-child]:mt-0 [&>*:last-child]:mb-0"
                    components={{
                      p: ({ children }) => <p className="my-1 text-[#E0D8C8] text-sm leading-relaxed">{children}</p>,
                      strong: ({ children }) => <strong className="text-[#F5F1E7] font-semibold">{children}</strong>,
                      li: ({ children }) => <li className="text-[#E0D8C8] text-sm my-0.5">{children}</li>,
                      ol: ({ children }) => <ol className="list-decimal ml-4 my-1">{children}</ol>,
                      ul: ({ children }) => <ul className="list-disc ml-4 my-1">{children}</ul>,
                    }}
                  >
                    {msg.content}
                  </ReactMarkdown>
                  {msg.relatedArticles?.length > 0 && (
                    <div className="mt-3 pt-2 border-t border-[rgba(180,140,75,0.1)]">
                      <p className="text-[10px] text-[#D7C9B2]/40 uppercase tracking-wider mb-1.5">{t("auto.components_help_AiHelpAssistant.related_articles_1wbobh")}</p>
                      <RelatedArticleChips articleIds={msg.relatedArticles} />
                    </div>
                  )}
                </>
              ) : (
                <p className="leading-relaxed">{msg.content}</p>
              )}
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="flex justify-start">
            <div className="px-4 py-3 rounded-xl bg-[rgba(40,30,22,0.8)] border border-[rgba(180,140,75,0.1)]">
              <Loader2 className="w-4 h-4 animate-spin text-[#D4A574]" />
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <form
        onSubmit={e => { e.preventDefault(); handleAsk(); }}
        className="border-t border-[rgba(180,140,75,0.15)] p-3 flex gap-2 flex-shrink-0"
      >
        <input
          type="text"
          placeholder={t('help.typeQuestion')}
          value={input}
          onChange={e => setInput(e.target.value)}
          disabled={isLoading}
          className="flex-1 px-3 py-2 rounded-lg bg-[rgba(180,140,75,0.08)] border border-[rgba(180,140,75,0.2)] text-[#F5F1E7] placeholder-[#D7C9B2]/40 focus:outline-none focus:border-[rgba(180,140,75,0.4)] disabled:opacity-50 text-sm"
        />
        <Button
          type="submit"
          disabled={isLoading || !input.trim()}
          size="sm"
          className="gap-1.5 flex-shrink-0"
        >
          {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
        </Button>
      </form>
    </div>
  );
}