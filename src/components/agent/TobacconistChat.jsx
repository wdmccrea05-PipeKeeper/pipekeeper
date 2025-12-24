import React, { useState, useEffect, useRef } from 'react';
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Send, Loader2 } from "lucide-react";
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
              >
                {message.content}
              </ReactMarkdown>
            )}
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

  const { data: user } = useQuery({
    queryKey: ['current-user'],
    queryFn: () => base44.auth.me(),
  });

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Create conversation once when opened
  useEffect(() => {
    if (open && !conversationId && user?.email) {
      base44.agents.createConversation({
        agent_name: "pipe_expert",
        metadata: { name: "Tobacconist Consultation" }
      }).then(conv => {
        setConversationId(conv.id);
        setMessages(conv.messages || []);
      }).catch(err => {
        console.error('Failed to create conversation:', err);
        toast.error('Failed to start conversation');
      });
    }
  }, [open, user?.email, conversationId]);

  // Subscribe to updates
  useEffect(() => {
    if (!conversationId) return;

    const unsubscribe = base44.agents.subscribeToConversation(conversationId, (data) => {
      setMessages(data.messages || []);
      setSending(false);
    });

    return () => unsubscribe();
  }, [conversationId]);

  const handleSend = async () => {
    if (!input.trim() || !conversationId || sending) return;

    const userMessage = input.trim();
    setInput('');
    setSending(true);

    try {
      const conv = await base44.agents.getConversation(conversationId);
      await base44.agents.addMessage(conv, {
        role: "user",
        content: userMessage
      });
    } catch (error) {
      console.error('Send error:', error);
      toast.error('Failed to send message');
      setSending(false);
    }
  };

  const handleReset = async () => {
    setConversationId(null);
    setMessages([]);
    setInput('');
    setSending(false);
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

        <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-gradient-to-b from-stone-50 to-white">
          {!conversationId ? (
            <div className="text-center py-12">
              <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-stone-400" />
              <p className="text-sm text-stone-600">Starting conversation...</p>
            </div>
          ) : (
            <>
              {messages.length === 0 && !sending && (
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
                    Ask me about pipe recommendations, tobacco pairings, or collection optimization.
                  </p>
                </div>
              )}

              {messages.map((msg, idx) => (
                <MessageBubble key={idx} message={msg} />
              ))}

              {sending && (
                <div className="flex gap-3 justify-start">
                  <div className="h-8 w-8 rounded-lg bg-[#8b3a3a] flex items-center justify-center flex-shrink-0 overflow-hidden">
                    <img 
                      src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/694956e18d119cc497192525/74ff3c767_4f105d90-fb0f-4713-b2cc-e24f7e1c06a3_44927272.png"
                      alt="Tobacconist"
                      className="w-full h-full object-cover scale-110"
                    />
                  </div>
                  <div className="rounded-2xl px-4 py-2.5 bg-white border border-stone-200">
                    <Loader2 className="w-4 h-4 animate-spin text-stone-400" />
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </>
          )}
        </div>

        <div className="p-4 border-t bg-white">
          <div className="flex gap-2 mb-2">
            <Button variant="outline" size="sm" onClick={handleReset}>
              New Conversation
            </Button>
          </div>
          <div className="flex gap-2">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), handleSend())}
              placeholder="Ask about pairings, recommendations, or your collection..."
              disabled={sending || !conversationId}
            />
            <Button 
              onClick={handleSend}
              disabled={!input.trim() || sending || !conversationId}
              className="bg-[#8b3a3a] hover:bg-[#6d2e2e]"
            >
              {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}