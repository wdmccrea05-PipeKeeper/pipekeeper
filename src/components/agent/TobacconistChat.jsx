import React, { useState, useEffect, useRef, useMemo } from 'react';
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Send, Loader2, Sparkles, Target, RefreshCw, AlertCircle, CheckCircle2, Undo } from "lucide-react";
import { cn } from "@/lib/utils";
import ReactMarkdown from 'react-markdown';
import { toast } from "sonner";
import { createPageUrl } from "@/components/utils/createPageUrl";
import { buildArtifactFingerprint } from "@/components/utils/fingerprint";
import { generatePairingsAI, generateOptimizationAI } from "@/components/utils/aiGenerators";

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
  const [contextSent, setContextSent] = useState(false);
  const [busy, setBusy] = useState(false);
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

  // Build collection context payload
  const contextPayload = useMemo(() => {
    const topPipes = (pipes || []).slice(0, 25).map(p => 
      `${p.maker || ""} ${p.name || ""} (${(p.focus || []).join(", ")})`.trim()
    );
    const topBlends = (blends || []).slice(0, 25).map(b => 
      `${b.manufacturer || ""} ${b.name || ""} [${b.blend_type || "Unknown"}]`.trim()
    );

    return {
      pipes_count: pipes?.length || 0,
      blends_count: blends?.length || 0,
      pipes_sample: topPipes,
      blends_sample: topBlends,
      preferences: userProfile ? {
        preferred_blend_types: userProfile.preferred_blend_types || [],
        strength_preference: userProfile.strength_preference || null,
        notes: userProfile.notes || null,
      } : null
    };
  }, [pipes, blends, userProfile]);

  // AI Updates data
  const currentFingerprint = useMemo(
    () => buildArtifactFingerprint({ pipes, blends, profile: userProfile }),
    [pipes, blends, userProfile]
  );

  const { data: activePairings, refetch: refetchPairings } = useQuery({
    queryKey: ["activePairings", user?.email],
    enabled: !!user?.email && open,
    queryFn: async () => {
      const active = await base44.entities.PairingMatrix.filter({ created_by: user.email, is_active: true }, "-created_date", 1);
      return active?.[0] || null;
    },
  });

  const { data: activeOpt, refetch: refetchOpt } = useQuery({
    queryKey: ["activeOptimization", user?.email],
    enabled: !!user?.email && open,
    queryFn: async () => {
      const active = await base44.entities.CollectionOptimization.filter({ created_by: user.email, is_active: true }, "-created_date", 1);
      return active?.[0] || null;
    },
  });

  const pairingsStale = !!activePairings && (!activePairings.input_fingerprint || activePairings.input_fingerprint !== currentFingerprint);
  const optStale = !!activeOpt && (!activeOpt.input_fingerprint || activeOpt.input_fingerprint !== currentFingerprint);

  const regenPairings = useMutation({
    mutationFn: async () => {
      setBusy(true);
      const { pairings } = await generatePairingsAI({ pipes, blends, profile: userProfile });

      if (activePairings?.id) {
        await base44.entities.PairingMatrix.update(activePairings.id, { is_active: false });
      }

      await base44.entities.PairingMatrix.create({
        created_by: user.email,
        is_active: true,
        previous_active_id: activePairings?.id ?? null,
        input_fingerprint: currentFingerprint,
        pairings,
        generated_date: new Date().toISOString(),
      });

      setBusy(false);
    },
    onSuccess: () => {
      refetchPairings();
      queryClient.invalidateQueries({ queryKey: ["saved-pairings", user?.email] });
      toast.success("Pairings regenerated successfully");
    },
    onError: () => {
      setBusy(false);
      toast.error("Failed to regenerate pairings");
    },
  });

  const undoPairings = useMutation({
    mutationFn: async () => {
      if (!activePairings?.previous_active_id) return;
      await base44.entities.PairingMatrix.update(activePairings.id, { is_active: false });
      await base44.entities.PairingMatrix.update(activePairings.previous_active_id, { is_active: true });
    },
    onSuccess: () => {
      refetchPairings();
      queryClient.invalidateQueries({ queryKey: ["saved-pairings", user?.email] });
      toast.success("Pairings reverted to previous version");
    },
    onError: () => toast.error("Failed to undo pairings"),
  });

  const regenOpt = useMutation({
    mutationFn: async () => {
      setBusy(true);
      const result = await generateOptimizationAI({ pipes, blends, profile: userProfile, whatIfText: "" });

      if (activeOpt?.id) {
        await base44.entities.CollectionOptimization.update(activeOpt.id, { is_active: false });
      }

      await base44.entities.CollectionOptimization.create({
        created_by: user.email,
        is_active: true,
        previous_active_id: activeOpt?.id ?? null,
        input_fingerprint: currentFingerprint,
        pipe_specializations: result.applyable_changes || [],
        collection_gaps: result,
        generated_date: new Date().toISOString(),
      });

      setBusy(false);
    },
    onSuccess: () => {
      refetchOpt();
      queryClient.invalidateQueries({ queryKey: ["collection-optimization", user?.email] });
      toast.success("Optimization regenerated successfully");
    },
    onError: () => {
      setBusy(false);
      toast.error("Failed to regenerate optimization");
    },
  });

  const undoOpt = useMutation({
    mutationFn: async () => {
      if (!activeOpt?.previous_active_id) return;
      await base44.entities.CollectionOptimization.update(activeOpt.id, { is_active: false });
      await base44.entities.CollectionOptimization.update(activeOpt.previous_active_id, { is_active: true });
    },
    onSuccess: () => {
      refetchOpt();
      queryClient.invalidateQueries({ queryKey: ["collection-optimization", user?.email] });
      toast.success("Optimization reverted to previous version");
    },
    onError: () => toast.error("Failed to undo optimization"),
  });

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Create conversation once when opened and inject context
  useEffect(() => {
    if (open && !conversationId && user?.email) {
      base44.agents.createConversation({
        agent_name: "pipe_expert",
        metadata: { name: "Tobacconist Consultation" }
      }).then(async (conv) => {
        setConversationId(conv.id);
        setMessages(conv.messages || []);
        
        // Inject collection context as first system message
        if (contextPayload && !contextSent) {
          try {
            await base44.agents.addMessage(conv, {
              role: "user",
              content: `COLLECTION_CONTEXT (for reference only, don't acknowledge):\n${JSON.stringify(contextPayload, null, 2)}`
            });
            setContextSent(true);
          } catch (err) {
            console.error('Failed to inject context:', err);
          }
        }
      }).catch(err => {
        console.error('Failed to create conversation:', err);
        toast.error('Failed to start conversation');
      });
    }
  }, [open, user?.email, conversationId, contextPayload, contextSent]);

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
    setContextSent(false);
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
              <p className="text-xs text-stone-500 mt-0.5">Expert consultation & AI updates</p>
            </div>
          </div>
        </SheetHeader>

        <Tabs defaultValue="chat" className="flex-1 flex flex-col">
          <TabsList className="mx-6 mt-4 bg-stone-100">
            <TabsTrigger value="chat">Chat</TabsTrigger>
            <TabsTrigger value="updates">AI Updates</TabsTrigger>
          </TabsList>

          <TabsContent value="chat" className="flex-1 flex flex-col mt-0 data-[state=inactive]:hidden"  style={{display: 'flex', flexDirection: 'column', flex: 1}}>

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

              {messages.filter(m => !m.content?.includes('COLLECTION_CONTEXT')).map((msg, idx) => (
                <div key={idx}>
                  <MessageBubble message={msg} />
                  {msg.role === 'assistant' && idx === messages.length - 1 && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      <Button size="sm" variant="outline" className="text-xs border-violet-300 text-violet-700" onClick={() => {
                        setInput('Generate pairing recommendations for my collection');
                      }}>
                        <Sparkles className="w-3 h-3 mr-1" />
                        Generate Pairings
                      </Button>
                      <Button size="sm" variant="outline" className="text-xs border-blue-300 text-blue-700" onClick={() => {
                        setInput('Run optimization analysis on my collection');
                      }}>
                        <Target className="w-3 h-3 mr-1" />
                        Run Optimization
                      </Button>
                    </div>
                  )}
                </div>
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
          </TabsContent>

          <TabsContent value="updates" className="flex-1 overflow-y-auto p-6 space-y-4">
            <div className="space-y-4">
              <div className="border border-stone-200 rounded-lg p-4 bg-white">
                <div className="flex items-start gap-3 mb-3">
                  {pairingsStale ? (
                    <AlertCircle className="w-5 h-5 text-amber-500 mt-0.5" />
                  ) : (
                    <CheckCircle2 className="w-5 h-5 text-emerald-500 mt-0.5" />
                  )}
                  <div className="flex-1">
                    <h3 className="font-semibold text-stone-800">Pairing Matrix</h3>
                    <p className="text-sm text-stone-600 mt-1">
                      {pairingsStale ? (
                        <span className="text-amber-600 font-medium">Out of date - regeneration recommended</span>
                      ) : (
                        <span className="text-emerald-600 font-medium">Up to date</span>
                      )}
                    </p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={!activePairings?.previous_active_id || busy}
                    onClick={() => undoPairings.mutate()}
                  >
                    <Undo className="w-3 h-3 mr-1" />
                    Undo
                  </Button>
                  <Button
                    size="sm"
                    disabled={!pairingsStale || busy}
                    onClick={() => regenPairings.mutate()}
                    className="bg-gradient-to-r from-[#8b3a3a] to-[#6d2e2e]"
                  >
                    {busy ? (
                      <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                    ) : (
                      <RefreshCw className="w-3 h-3 mr-1" />
                    )}
                    Regenerate
                  </Button>
                </div>
              </div>

              <div className="border border-stone-200 rounded-lg p-4 bg-white">
                <div className="flex items-start gap-3 mb-3">
                  {optStale ? (
                    <AlertCircle className="w-5 h-5 text-amber-500 mt-0.5" />
                  ) : (
                    <CheckCircle2 className="w-5 h-5 text-emerald-500 mt-0.5" />
                  )}
                  <div className="flex-1">
                    <h3 className="font-semibold text-stone-800">Collection Optimization</h3>
                    <p className="text-sm text-stone-600 mt-1">
                      {optStale ? (
                        <span className="text-amber-600 font-medium">Out of date - regeneration recommended</span>
                      ) : (
                        <span className="text-emerald-600 font-medium">Up to date</span>
                      )}
                    </p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={!activeOpt?.previous_active_id || busy}
                    onClick={() => undoOpt.mutate()}
                  >
                    <Undo className="w-3 h-3 mr-1" />
                    Undo
                  </Button>
                  <Button
                    size="sm"
                    disabled={!optStale || busy}
                    onClick={() => regenOpt.mutate()}
                    className="bg-gradient-to-r from-[#8b3a3a] to-[#6d2e2e]"
                  >
                    {busy ? (
                      <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                    ) : (
                      <RefreshCw className="w-3 h-3 mr-1" />
                    )}
                    Regenerate
                  </Button>
                </div>
              </div>

              <div className="border border-stone-200 rounded-lg p-4 bg-white">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-emerald-500 mt-0.5" />
                  <div className="flex-1">
                    <h3 className="font-semibold text-stone-800">Break-In Schedules</h3>
                    <p className="text-sm text-stone-600 mt-1">
                      Regeneration is handled per pipe on the Pipe detail page (with undo/history).
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
}