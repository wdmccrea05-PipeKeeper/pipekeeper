import React, { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { Loader2, Send, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { useQuery } from '@tanstack/react-query';
import { useCurrentUser } from '@/components/hooks/useCurrentUser';
import { waitForAssistantMessage } from '@/components/utils/agentWait';
import { FormattedTobacconistResponse } from '@/components/utils/formatTobacconistResponse';
import { classifyQuestion, type ResponseStyle } from '@/components/utils/questionClassifier';

const TOBACCONIST_ICON = 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/694956e18d119cc497192525/bac372e28_image.png';

export default function ExpertTobacconistChat() {
  const [conversationId, setConversationId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [streamingContent, setStreamingContent] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [responseStyle, setResponseStyle] = useState<ResponseStyle>('simple_paragraphs');
  const messagesEndRef = useRef(null);
  const currentRequestIdRef = useRef(null);
  const currentRequestTimeRef = useRef(null);
  const { user } = useCurrentUser();

  // Fetch user collection data
  const { data: pipes = [], isLoading: pipesLoading } = useQuery({
    queryKey: ['pipes', user?.email],
    queryFn: async () => {
      if (!user?.email) return [];
      return await base44.entities.Pipe.filter({ created_by: user.email });
    },
    enabled: !!user?.email,
  });

  const { data: blends = [], isLoading: blendsLoading } = useQuery({
    queryKey: ['blends', user?.email],
    queryFn: async () => {
      if (!user?.email) return [];
      return await base44.entities.TobaccoBlend.filter({ created_by: user.email });
    },
    enabled: !!user?.email,
  });

  const { data: pairingMatrix, isLoading: pairingLoading } = useQuery({
    queryKey: ['pairing-matrix', user?.email],
    queryFn: async () => {
      if (!user?.email) return null;
      const results = await base44.entities.PairingMatrix.filter({
        created_by: user.email,
        is_active: true,
      });
      return results[0] || null;
    },
    enabled: !!user?.email,
  });

  const { data: usageLogs = [], isLoading: logsLoading } = useQuery({
    queryKey: ['smoking-logs', user?.email],
    queryFn: async () => {
      if (!user?.email) return [];
      return await base44.entities.SmokingLog.filter({ created_by: user.email });
    },
    enabled: !!user?.email,
  });

  const contextLoading = pipesLoading || blendsLoading || pairingLoading || logsLoading;

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Initialize conversation with context sent upfront
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

        // Send context once at the start
        if (pipes.length > 0) {
          const contextMsg = buildContextMessage();
          await base44.agents.addMessage(conversation, {
            role: 'user',
            content: `[INITIAL CONTEXT - Do not repeat or remind me of this]\n\n${contextMsg}`,
          });
        }
      } catch (err) {
        console.error('Failed to create conversation:', err);
        toast.error('Failed to initialize chat');
      }
    })();
  }, [pipes, blends, pairingMatrix, usageLogs]);

  // Subscribe to conversation updates and accumulate full responses
  useEffect(() => {
    if (!conversationId) return;

    const unsubscribe = base44.agents.subscribeToConversation(conversationId, (data) => {
      const msgs = data.messages || [];

      // Only process if we have an active request
      const requestId = currentRequestIdRef.current;
      const requestTime = currentRequestTimeRef.current;

      if (requestId && requestTime) {
        // Actively streaming: collect ONLY assistant messages created AFTER this request
        let assistantContent = '';
        for (const msg of msgs) {
          if ((msg.role === 'assistant' || msg.role === 'agent') && msg.created_date) {
            const msgTime = new Date(msg.created_date).getTime();
            if (msgTime > requestTime) {
              const content = extractAssistantContent(msg);
              if (content) {
                assistantContent += content;
              }
            }
          }
        }

        // Update streaming display
        if (assistantContent && loading) {
          setStreamingContent(assistantContent);
          setIsStreaming(true);
        } else if (assistantContent && !loading) {
          setStreamingContent(assistantContent);
          setIsStreaming(false);
        }
      } else {
        // No active request: just update message list for historical view
        setMessages(msgs);
      }
    });

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [conversationId, loading]);

  const handleSend = async () => {
    if (!input.trim() || !conversationId || loading) return;

    if (contextLoading) {
      toast.error('Loading your collection data...');
      return;
    }

    const userMessage = input.trim();
    const classification = classifyQuestion(userMessage);
    setResponseStyle(classification.responseStyle);

    // Track this request
    const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const requestTime = Date.now();
    currentRequestIdRef.current = requestId;
    currentRequestTimeRef.current = requestTime;

    setInput('');
    setLoading(true);
    setStreamingContent('');
    setIsStreaming(true);

    try {
      const conversation = await base44.agents.getConversation(conversationId);

      // Send ONLY the user's question (context already sent on init)
      await base44.agents.addMessage(conversation, {
        role: 'user',
        content: userMessage,
      });

      console.log('[EXPERT_TOBACCONIST] User question sent:', userMessage);

      // Wait for response (max 240s)
      setTimeout(() => {
        setLoading(false);
      }, 240000);
    } catch (err) {
      console.error('[EXPERT_TOBACCONIST] Failed to send message:', err);
      toast.error('Failed to send message');
      setLoading(false);
      setIsStreaming(false);
      currentRequestIdRef.current = null;
      currentRequestTimeRef.current = null;
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
          <MessageBubble key={idx} message={msg} isStreaming={false} />
        ))}

        {isStreaming && streamingContent && (
          <div className="flex gap-3">
            <img
              src={TOBACCONIST_ICON}
              alt="Expert"
              className="w-8 h-8 rounded-lg shrink-0"
            />
            <div className="max-w-[80%] rounded-2xl px-4 py-2.5 bg-[#243548] text-[#e8d5b7] border border-[#e8d5b7]/10">
              {/* Use the current responseStyle for streaming */}
              <FormattedTobacconistResponse content={streamingContent} style={responseStyle} />
              <div className="mt-2 flex items-center gap-1 text-xs text-[#e8d5b7]/60">
                <span className="animate-pulse">▌</span>
              </div>
            </div>
          </div>
        )}

        {loading && !isStreaming && (
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
            disabled={!input.trim() || loading || !conversationId || contextLoading}
            className="h-auto px-6"
          >
            {contextLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </Button>
        </div>
      </Card>
    </div>
  );
}

function extractAssistantContent(message) {
  if (!message) return '';
  
  // Handle string content
  if (typeof message.content === 'string') {
    return message.content;
  }
  
  // Handle object with response field
  if (message.content && typeof message.content === 'object') {
    const textField = message.content.response || 
                     message.content.advice || 
                     message.content.text || 
                     message.content.message;
    if (typeof textField === 'string') {
      return textField;
    }
  }
  
  // Handle parts array
  if (Array.isArray(message.parts)) {
    return message.parts
      .filter((p) => p && typeof p.text === 'string')
      .map((p) => p.text)
      .join('');
  }
  
  return '';
}

function buildContextMessage() {
  // Reusable helper to format context
  const usageStats = {};
  usageLogs.forEach(log => {
    if (log.pipe_id) {
      if (!usageStats[log.pipe_id]) {
        usageStats[log.pipe_id] = { count: 0, lastUsed: null };
      }
      usageStats[log.pipe_id].count += log.bowls_smoked || 1;
      if (!usageStats[log.pipe_id].lastUsed || new Date(log.date) > new Date(usageStats[log.pipe_id].lastUsed)) {
        usageStats[log.pipe_id].lastUsed = log.date;
      }
    }
  });

  const pipesList = pipes
    .map(p => `- ${p.name}${p.maker ? ` (${p.maker})` : ''} [${p.shape}, ${p.bowl_material || 'unknown'}]${p.focus && p.focus.length > 0 ? ` focus: ${p.focus.join(', ')}` : ''}`)
    .join('\n');

  const blendsList = blends
    .map(b => `- ${b.name}${b.manufacturer ? ` (${b.manufacturer})` : ''} [${b.blend_type}, ${b.strength || 'unknown'}]`)
    .join('\n');

  const topUsedPipes = Object.entries(usageStats)
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, 5)
    .map(([pipeId, stats]) => {
      const pipe = pipes.find(p => p.id === pipeId);
      return pipe ? `${pipe.name}: ${stats.count} bowls` : null;
    })
    .filter(Boolean)
    .join(', ');

  return `COLLECTION CONTEXT:

Pipes (${pipes.length}):
${pipesList}

Tobaccos (${blends.length}):
${blendsList}

Most Used Pipes: ${topUsedPipes || 'No usage data'}
Total Smoking Sessions: ${usageLogs.length}

Pairing Grid: ${pairingMatrix ? 'Available' : 'Not generated'}

This context is for reference throughout our conversation. Focus on answering my questions naturally—don't repeat this unless I ask.`;
}

function MessageBubble({ message, isStreaming = false }) {
  const isUser = message.role === 'user';

  if (message.role === 'system') return null;

  // Skip displaying initial context message
  if (isUser && message.content?.includes('[INITIAL CONTEXT - Do not repeat')) {
    return null;
  }

  // Extract content handling multiple formats
  const content = isUser ? message.content : extractAssistantContent(message);

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
        {isUser ? (
          <div className="text-sm whitespace-pre-wrap">{content}</div>
        ) : (
          // Use stored responseStyle if available, fallback to light_structure for historical messages
          <FormattedTobacconistResponse 
            content={content} 
            style={message.responseStyle || 'light_structure'} 
          />
        )}

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