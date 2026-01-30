import React, { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { Loader2, Send, Sparkles } from 'lucide-react';
import { toast } from 'sonner';

const TOBACCONIST_ICON = 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/694956e18d119cc497192525/bac372e28_image.png';

export default function ExpertTobacconistChat() {
  const [conversationId, setConversationId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Initialize conversation
  useEffect(() => {
    (async () => {
      try {
        const conversation = await base44.agents.createConversation({
          agent_name: 'expert_tobacconist',
          metadata: {
            name: 'Expert Tobacconist Chat',
            description: 'Personalized pipe and tobacco advice',
          },
        });
        setConversationId(conversation.id);
        setMessages(conversation.messages || []);
      } catch (err) {
        console.error('Failed to create conversation:', err);
        toast.error('Failed to initialize chat');
      }
    })();
  }, []);

  // Subscribe to conversation updates
  useEffect(() => {
    if (!conversationId) return;

    const unsubscribe = base44.agents.subscribeToConversation(conversationId, (data) => {
      setMessages(data.messages || []);
      setLoading(false);
    });

    return unsubscribe;
  }, [conversationId]);

  const handleSend = async () => {
    if (!input.trim() || !conversationId || loading) return;

    const userMessage = input.trim();
    setInput('');
    setLoading(true);

    try {
      // Get current conversation data
      const conversation = await base44.agents.getConversation(conversationId);
      
      // Add user message
      await base44.agents.addMessage(conversation, {
        role: 'user',
        content: userMessage,
      });
    } catch (err) {
      console.error('Failed to send message:', err);
      toast.error('Failed to send message');
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const suggestedPrompts = [
    "What pipe should I smoke tonight?",
    "Which of my blends pairs best with my Peterson?",
    "How should I break in my new pipe?",
    "What's missing from my collection?",
  ];

  return (
    <div className="flex flex-col h-[600px] max-w-4xl mx-auto">
      {/* Chat Messages */}
      <div className="flex-1 overflow-y-auto space-y-4 p-4 bg-[#1a2c42]/30 rounded-t-xl">
        {messages.length === 0 && !loading && (
          <div className="text-center py-12">
            <img 
              src={TOBACCONIST_ICON} 
              alt="Expert Tobacconist"
              className="w-20 h-20 mx-auto mb-4 rounded-2xl"
            />
            <h3 className="text-lg font-semibold text-[#e8d5b7] mb-2">
              Ask Your Expert Tobacconist
            </h3>
            <p className="text-sm text-[#e8d5b7]/70 mb-6">
              I have access to your collection and preferences
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-w-2xl mx-auto">
              {suggestedPrompts.map((prompt, i) => (
                <Button
                  key={i}
                  variant="outline"
                  size="sm"
                  onClick={() => setInput(prompt)}
                  className="text-left justify-start h-auto py-2 px-3 text-xs"
                >
                  <Sparkles className="w-3 h-3 mr-2 shrink-0" />
                  {prompt}
                </Button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg, idx) => (
          <MessageBubble key={idx} message={msg} />
        ))}

        {loading && (
          <div className="flex items-center gap-2 text-[#e8d5b7]/70">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span className="text-sm">Expert is thinking...</span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <Card className="rounded-t-none border-t-0 bg-[#243548]/95 p-4">
        <div className="flex gap-2">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask about your pipes, blends, or pairings..."
            className="resize-none min-h-[60px] bg-[#1a2c42] border-[#e8d5b7]/20"
            disabled={loading || !conversationId}
          />
          <Button
            onClick={handleSend}
            disabled={!input.trim() || loading || !conversationId}
            className="h-auto px-6"
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </Card>
    </div>
  );
}

function MessageBubble({ message }) {
  const isUser = message.role === 'user';

  if (message.role === 'system') return null;

  return (
    <div className={`flex gap-3 ${isUser ? 'justify-end' : 'justify-start'}`}>
      {!isUser && (
        <img
          src={TOBACCONIST_ICON}
          alt="Expert"
          className="w-8 h-8 rounded-lg shrink-0"
        />
      )}
      <div
        className={`max-w-[80%] rounded-2xl px-4 py-2.5 ${
          isUser
            ? 'bg-[#8b3a3a] text-[#e8d5b7]'
            : 'bg-[#243548] text-[#e8d5b7] border border-[#e8d5b7]/10'
        }`}
      >
        <div className="text-sm whitespace-pre-wrap">{message.content}</div>
        
        {message.tool_calls?.length > 0 && (
          <div className="mt-2 pt-2 border-t border-[#e8d5b7]/10 text-xs text-[#e8d5b7]/60">
            {message.tool_calls.map((tool, i) => (
              <div key={i} className="flex items-center gap-1">
                <Sparkles className="w-3 h-3" />
                Checked {tool.name.split('.').pop()}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}