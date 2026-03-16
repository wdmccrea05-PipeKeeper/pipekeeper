import React, { useState } from 'react';
import { Send, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTranslation } from '@/components/i18n/safeTranslation';
import { base44 } from '@/api/base44Client';
import { searchDocumentation } from './documentationRegistry';

export default function AiHelpAssistant() {
  const { t } = useTranslation();
  const [question, setQuestion] = useState('');
  const [messages, setMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  const handleAsk = async (e) => {
    e.preventDefault();
    if (!question.trim() || isLoading) return;

    const userMessage = question;
    setQuestion('');
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setIsLoading(true);

    try {
      // Search documentation for relevant articles
      const searchResults = searchDocumentation(userMessage).slice(0, 3);
      
      const context = searchResults.length > 0
        ? `Based on the documentation:\n${searchResults.map(r => `- ${r.title}: ${r.preview}`).join('\n')}`
        : '';

      // Use AI to generate a response
      const response = await base44.integrations.Core.InvokeLLM({
        prompt: `You are a helpful assistant for CollectionKeeper, a pipe and whiskey collection management app. Answer this user question based on the documentation provided.\n\n${context}\n\nUser question: ${userMessage}\n\nProvide a helpful, concise answer. If you don't have information, suggest checking the documentation or contacting support.`,
        model: 'gemini_3_flash'
      });

      setMessages(prev => [...prev, { role: 'assistant', content: response }]);
    } catch (error) {
      console.error('AI Help error:', error);
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: t('help.aiError', 'Sorry, I encountered an error. Please try again or consult the documentation directly.') 
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-96 bg-[rgba(20,15,10,0.5)] rounded-lg border border-[rgba(180,140,75,0.15)]">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && (
          <div className="flex items-center justify-center h-full text-center">
            <p className="text-[#D7C9B2]/60">
              {t('help.askQuestion', 'Ask me anything about CollectionKeeper!')}
            </p>
          </div>
        )}

        {messages.map((msg, idx) => (
          <div
            key={idx}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-xs px-4 py-2 rounded-lg ${
                msg.role === 'user'
                  ? 'bg-[rgba(180,140,75,0.2)] text-[#F5F1E7]'
                  : 'bg-[rgba(100,150,200,0.2)] text-[#D7C9B2]'
              }`}
            >
              <p className="text-sm leading-relaxed">{msg.content}</p>
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="flex justify-start">
            <div className="px-4 py-2 rounded-lg bg-[rgba(100,150,200,0.2)]">
              <Loader2 className="w-4 h-4 animate-spin text-[#D7C9B2]" />
            </div>
          </div>
        )}
      </div>

      {/* Input */}
      <form onSubmit={handleAsk} className="border-t border-[rgba(180,140,75,0.15)] p-4 flex gap-2">
        <input
          type="text"
          placeholder={t('help.typeQuestion', 'Type your question...')}
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          disabled={isLoading}
          className="flex-1 px-3 py-2 rounded-lg bg-[rgba(180,140,75,0.1)] border border-[rgba(180,140,75,0.2)] text-[#F5F1E7] placeholder-[#D7C9B2]/50 focus:outline-none focus:border-[rgba(180,140,75,0.4)] disabled:opacity-50"
        />
        <Button
          type="submit"
          disabled={isLoading || !question.trim()}
          size="sm"
          className="gap-2"
        >
          {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
        </Button>
      </form>
    </div>
  );
}