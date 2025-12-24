import React, { useState, useEffect, useRef } from 'react';
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Send, Loader2, CheckCircle2, Sparkles, Upload } from "lucide-react";
import { cn } from "@/lib/utils";
import ReactMarkdown from 'react-markdown';
import { toast } from "sonner";

function MessageBubble({ message }) {
  const isUser = message.role === 'user';
  
  return (
    <div className={cn("flex gap-3", isUser ? "justify-end" : "justify-start")}>
      {!isUser && (
        <div className="h-8 w-8 rounded-lg bg-[#8b3a3a] flex items-center justify-center mt-0.5 flex-shrink-0 overflow-hidden">
          <img 
            src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/694956e18d119cc497192525/74ff3c767_4f105d90-fb0f-4713-b2cc-e24f7e1c06a3_44927272.png"
            alt="Tobacconist"
            className="w-full h-full object-cover scale-110"
          />
        </div>
      )}
      <div className={cn("max-w-[85%]", isUser && "flex flex-col items-end")}>
        {message.content && (
          <div className={cn(
            "rounded-2xl px-4 py-2.5",
            isUser ? "bg-[#1a2c42] text-white" : "bg-white border border-stone-200"
          )}>
            {isUser ? (
              <p className="text-sm leading-relaxed">{message.content}</p>
            ) : (
              <ReactMarkdown 
                className="text-sm prose prose-sm prose-stone max-w-none [&>*:first-child]:mt-0 [&>*:last-child]:mb-0"
                components={{
                  p: ({ children }) => <p className="my-1 leading-relaxed">{children}</p>,
                  ul: ({ children }) => <ul className="my-1 ml-4 list-disc">{children}</ul>,
                  ol: ({ children }) => <ol className="my-1 ml-4 list-decimal">{children}</ol>,
                  li: ({ children }) => <li className="my-0.5">{children}</li>,
                  strong: ({ children }) => <strong className="font-semibold text-[#8b3a3a]">{children}</strong>,
                }}
              >
                {message.content}
              </ReactMarkdown>
            )}
          </div>
        )}
        
        {message.tool_calls?.length > 0 && (
          <div className="mt-2 space-y-1">
            {message.tool_calls.map((toolCall, idx) => (
              <div key={idx} className="text-xs px-3 py-1.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-800">
                <Sparkles className="w-3 h-3 inline mr-1" />
                Analyzing {toolCall.name?.split('.').pop()?.toLowerCase() || 'data'}...
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function TobacconistChat({ open, onOpenChange, pipes = [], blends = [] }) {
  const [conversationId, setConversationId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef(null);
  const queryClient = useQueryClient();

  const { data: user } = useQuery({
    queryKey: ['current-user'],
    queryFn: () => base44.auth.me(),
  });

  const { data: userProfile } = useQuery({
    queryKey: ['user-profile', user?.email],
    queryFn: async () => {
      const profiles = await base44.entities.UserProfile.filter({ user_email: user?.email });
      return profiles[0];
    },
    enabled: !!user?.email,
  });

  const { data: pairings } = useQuery({
    queryKey: ['pairings', user?.email],
    queryFn: async () => {
      const results = await base44.entities.PairingMatrix.filter({ created_by: user?.email });
      return results[0];
    },
    enabled: !!user?.email,
  });

  const { data: optimization } = useQuery({
    queryKey: ['optimization', user?.email],
    queryFn: async () => {
      const results = await base44.entities.CollectionOptimization.filter({ created_by: user?.email });
      return results[0];
    },
    enabled: !!user?.email,
  });

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Subscribe to conversation updates
  useEffect(() => {
    if (!conversationId) return;

    console.log('Setting up subscription for conversation:', conversationId);
    const unsubscribe = base44.agents.subscribeToConversation(conversationId, (data) => {
      console.log('Received conversation update, messages count:', data.messages?.length);
      if (data.messages) {
        setMessages(data.messages);
      }
    });

    return () => {
      console.log('Cleaning up subscription');
      unsubscribe();
    };
  }, [conversationId]);

  // Create conversation on open
  useEffect(() => {
    if (open && !conversationId && user?.email) {
      console.log('Creating conversation, open:', open, 'conversationId:', conversationId);
      createConversation();
    }
  }, [open, user?.email]);

  const createConversation = async () => {
    try {
      console.log('Creating new conversation...');
      const conv = await base44.agents.createConversation({
        agent_name: "pipe_expert",
        metadata: {
          name: "Tobacconist Consultation",
          description: "Expert pipe and tobacco advice"
        }
      });
      
      console.log('Conversation created:', conv);
      setConversationId(conv.id);
      setMessages(conv.messages || []);
    } catch (error) {
      console.error('Failed to create conversation:', error);
      toast.error('Failed to start conversation');
    }
  };

  const buildContextSummary = () => {
    let summary = [];

    // Collection overview
    if (pipes.length > 0 || blends.length > 0) {
      summary.push(`**Collection Overview:**\n- ${pipes.length} pipes, ${blends.length} tobacco blends`);
    }

    // Pipes summary
    if (pipes.length > 0) {
      const pipeSummary = pipes.slice(0, 10).map(p => 
        `${p.name} (${p.maker || 'Unknown maker'}, ${p.shape || 'Unknown shape'}, ${p.chamber_volume || 'Unknown size'}${p.focus?.length > 0 ? `, specialized for: ${p.focus.join(', ')}` : ''})`
      ).join('\n- ');
      summary.push(`**My Pipes:**\n- ${pipeSummary}${pipes.length > 10 ? `\n- ...and ${pipes.length - 10} more` : ''}`);
    }

    // Blends summary
    if (blends.length > 0) {
      const blendSummary = blends.slice(0, 10).map(b => 
        `${b.name} (${b.manufacturer || 'Unknown'}, ${b.blend_type || 'Unknown type'}, ${b.strength || 'Unknown strength'}${b.quantity_owned > 0 ? `, ${b.quantity_owned} tins` : ''})`
      ).join('\n- ');
      summary.push(`**My Tobacco:**\n- ${blendSummary}${blends.length > 10 ? `\n- ...and ${blends.length - 10} more` : ''}`);
    }

    // User preferences
    if (userProfile) {
      let prefs = ['**My Preferences:**'];
      if (userProfile.clenching_preference) prefs.push(`- Clenching: ${userProfile.clenching_preference}`);
      if (userProfile.smoke_duration_preference) prefs.push(`- Session duration: ${userProfile.smoke_duration_preference}`);
      if (userProfile.strength_preference) prefs.push(`- Strength preference: ${userProfile.strength_preference}`);
      if (userProfile.pipe_size_preference) prefs.push(`- Pipe size: ${userProfile.pipe_size_preference}`);
      if (userProfile.preferred_blend_types?.length > 0) prefs.push(`- Favorite blend types: ${userProfile.preferred_blend_types.join(', ')}`);
      if (userProfile.preferred_shapes?.length > 0) prefs.push(`- Favorite pipe shapes: ${userProfile.preferred_shapes.join(', ')}`);
      if (userProfile.notes) prefs.push(`- Additional notes: ${userProfile.notes}`);
      if (prefs.length > 1) summary.push(prefs.join('\n'));
    }

    // Optimization insights
    if (optimization?.pipe_specializations) {
      const specs = optimization.pipe_specializations.slice(0, 5).map(s => 
        `${s.pipe_name}: ${s.recommended_focus.join(', ')}`
      ).join('\n- ');
      summary.push(`**AI Specialization Recommendations:**\n- ${specs}`);
    }

    if (optimization?.collection_gaps) {
      summary.push(`**Collection Analysis:**\n${JSON.stringify(optimization.collection_gaps, null, 2)}`);
    }

    return summary.join('\n\n');
  };

  const handleSend = async () => {
    if (!input.trim() || !conversationId || sending) return;

    const userMessage = input.trim();
    setInput('');
    setSending(true);

    try {
      // Build context summary for first message
      const contextSummary = messages.length === 0 ? buildContextSummary() : '';
      const messageContent = contextSummary 
        ? `${userMessage}\n\n---\n\nFor context, here's my collection and preferences:\n${contextSummary}\n\nPlease use this to provide personalized advice.`
        : userMessage;

      console.log('Sending message with context:', messageContent.substring(0, 200));

      // Fetch latest conversation state
      const conv = await base44.agents.getConversation(conversationId);
      
      // Add user message - subscription will update UI
      await base44.agents.addMessage(conv, {
        role: "user",
        content: messageContent
      });
      
      console.log('Message sent successfully');
    } catch (error) {
      console.error('Failed to send message:', error);
      toast.error('Failed to send message');
    } finally {
      setSending(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleReset = async () => {
    setConversationId(null);
    setMessages([]);
    if (user?.email) {
      await createConversation();
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-2xl flex flex-col p-0">
        <SheetHeader className="p-6 pb-4 border-b">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-[#8b3a3a] flex items-center justify-center overflow-hidden">
              <img 
                src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/694956e18d119cc497192525/74ff3c767_4f105d90-fb0f-4713-b2cc-e24f7e1c06a3_44927272.png"
                alt="Tobacconist"
                className="w-full h-full object-cover scale-110"
              />
            </div>
            <div>
              <SheetTitle>Master Tobacconist</SheetTitle>
              <p className="text-xs text-stone-500 mt-0.5">Expert pipe & tobacco consultation</p>
            </div>
          </div>
        </SheetHeader>

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-gradient-to-b from-stone-50 to-white">
          {!conversationId ? (
            <div className="text-center py-12">
              <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-stone-400" />
              <p className="text-sm text-stone-600">Starting conversation...</p>
            </div>
          ) : messages.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 rounded-full bg-[#8b3a3a]/10 flex items-center justify-center mx-auto mb-4 overflow-hidden">
                <img 
                  src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/694956e18d119cc497192525/74ff3c767_4f105d90-fb0f-4713-b2cc-e24f7e1c06a3_44927272.png"
                  alt="Tobacconist"
                  className="w-full h-full object-cover scale-110"
                />
              </div>
              <h3 className="font-semibold text-stone-800 mb-2">Welcome to Your Personal Tobacconist</h3>
              <p className="text-sm text-stone-600 max-w-md mx-auto">
                I can help you optimize your collection, find perfect pairings, and provide expert smoking advice. What would you like to discuss?
              </p>
            </div>
          ) : (
            <>
              {messages.map((msg, idx) => (
                <MessageBubble key={idx} message={msg} />
              ))}
              <div ref={messagesEndRef} />
            </>
          )}
        </div>

        {/* Input Area */}
        <div className="p-4 border-t bg-white">
          <div className="flex gap-2 mb-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleReset}
              className="text-xs"
            >
              New Conversation
            </Button>
          </div>
          <div className="flex gap-2">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Ask about pairings, collection optimization, or smoking advice..."
              disabled={sending || !conversationId}
              className="flex-1"
            />
            <Button 
              onClick={handleSend}
              disabled={!input.trim() || sending || !conversationId}
              className="bg-[#8b3a3a] hover:bg-[#6d2e2e]"
            >
              {sending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}