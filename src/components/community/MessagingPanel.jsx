import React, { useState, useEffect, useRef } from 'react';
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { safeUpdate } from "@/components/utils/safeUpdate";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { MessageCircle, Send, Trash2, Save, X, Circle, Edit2 } from "lucide-react";
import { toast } from "sonner";
import { useTranslation } from "@/components/i18n/safeTranslation";

function getModuleTags(profile) {
  if (!profile) return [];
  const tags = [];
  if (profile.pipekeeper_enabled !== false) {
    tags.push({ label: '🪵 PipeKeeper', bg: 'rgba(120,80,40,0.35)', color: 'rgba(212,165,116,1)' });
  }
  // WhiskeyKeeper is a locked module — do not display as a public tag
  return tags;
}

export default function MessagingPanel({ user, friends, publicProfiles }) {
  const { t } = useTranslation();
  const [selectedFriend, setSelectedFriend] = useState(null);
  const [messageText, setMessageText] = useState('');
  const [showInbox, setShowInbox] = useState(false);
  const [editingMessageId, setEditingMessageId] = useState(null);
  const [editText, setEditText] = useState('');
  const scrollRef = useRef(null);
  const queryClient = useQueryClient();
  const userEmail = user?.email || null;

  const { data: myProfile } = useQuery({
    queryKey: ['my-profile', userEmail],
    queryFn: async () => {
      if (!userEmail) return null;
      const rows = await base44.entities.UserProfile.filter({ user_email: userEmail });
      // Select newest row if multiple exist
      const sorted = [...(rows || [])].sort((a, b) => 
        (Date.parse(b.updated_date ?? b.updated_at ?? b.created_date ?? "") || 0) -
        (Date.parse(a.updated_date ?? a.updated_at ?? a.created_date ?? "") || 0)
      );
      return sorted?.[0] || null;
    },
    enabled: !!userEmail,
    staleTime: 30_000,
    gcTime: 60_000,
    retry: 1,
  });

  const blocked = Array.isArray(myProfile?.blocked_users) ? myProfile.blocked_users : [];

  // Update last seen every 30 seconds
  useEffect(() => {
    if (!userEmail) return;

    let cancelled = false;
    
    const updateLastSeen = async () => {
      try {
        const profiles = await base44.entities.UserProfile.filter({ user_email: userEmail });
        if (cancelled) return;
        // Select newest row if multiple exist
        const sorted = [...(profiles || [])].sort((a, b) => 
          (Date.parse(b.updated_date ?? b.updated_at ?? b.created_date ?? "") || 0) -
          (Date.parse(a.updated_date ?? a.updated_at ?? a.created_date ?? "") || 0)
        );
        if (sorted[0]) {
          await safeUpdate('UserProfile', sorted[0].id, {
            last_seen: new Date().toISOString()
          }, userEmail);
        }
      } catch {
        // Non-fatal presence update.
      }
    };

    updateLastSeen();
    const interval = setInterval(updateLastSeen, 30000); // 30 seconds
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [userEmail]);

  const { data: messages = [] } = useQuery({
    queryKey: ['messages', userEmail],
    queryFn: async () => {
      if (!userEmail) return [];
      try {
        const sent = await base44.entities.Message.filter({ sender_email: userEmail });
        const received = await base44.entities.Message.filter({ recipient_email: userEmail });
        return [...sent, ...received].sort((a, b) => 
          new Date(a.created_date) - new Date(b.created_date)
        );
      } catch {
        return [];
      }
    },
    enabled: !!userEmail,
    refetchInterval: 5000, // Poll every 5 seconds
    retry: false, // Don't retry on error to prevent infinite loops
  });

  const sendMessageMutation = useMutation({
    mutationFn: (data) => base44.entities.Message.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['messages', userEmail] });
      setMessageText('');
      toast.success(t("messaging.messageSent"));
    },
    onError: () => {
      toast.error(t("messaging.failedToSend"));
    },
  });



  const toggleSaveMutation = useMutation({
    mutationFn: ({ messageId, saved }) => safeUpdate('Message', messageId, { is_saved: saved }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['messages', userEmail] });
    },
  });

  const deleteMessageMutation = useMutation({
    mutationFn: (messageId) => base44.entities.Message.delete(messageId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['messages', userEmail] });
      toast.success(t("messaging.messageDeleted"));
    },
    onError: () => {
      toast.error(t("messaging.cannotDeleteOtherMessage"));
    },
  });

  const editMessageMutation = useMutation({
    mutationFn: ({ messageId, content }) => safeUpdate('Message', messageId, { 
      content, 
      is_edited: true,
      edited_date: new Date().toISOString()
    }, userEmail),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['messages', userEmail] });
      setEditingMessageId(null);
      setEditText('');
      toast.success(t("messaging.messageEdited"));
    },
  });

  const handleSendMessage = () => {
    if (!messageText.trim() || !selectedFriend || !userEmail) return;
    
    sendMessageMutation.mutate({
      sender_email: userEmail,
      recipient_email: selectedFriend,
      content: messageText.trim()
    });
  };

  // Mark messages as read when viewing conversation
  useEffect(() => {
    if (!selectedFriend || !userEmail) return;
    
    const unreadMessages = messages.filter(m => 
      m.sender_email === selectedFriend && 
      m.recipient_email === userEmail && 
      !m.is_read
    );

    if (unreadMessages.length === 0) return;

    let cancelled = false;
    (async () => {
      try {
        await Promise.all(
          unreadMessages.map((m) => base44.entities.Message.update(m.id, { is_read: true }))
        );
        if (!cancelled) {
          queryClient.invalidateQueries({ queryKey: ['messages', userEmail] });
        }
      } catch {
        // Non-fatal; keep chat available.
      }
    })();

    return () => {
      cancelled = true;
    };
     
  }, [selectedFriend, messages, userEmail]);

  // Auto scroll to bottom of chat
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, selectedFriend]);

  const filteredMessages = messages.filter(m => 
    !blocked.includes(m.sender_email) && !blocked.includes(m.recipient_email)
  );

  const isOnline = (friendEmail) => {
    const profile = publicProfiles.find(p => p.user_email === friendEmail);
    if (!profile?.last_seen) return false;
    const lastSeen = new Date(profile.last_seen);
    const now = new Date();
    return (now - lastSeen) < 2 * 60 * 1000; // Online if seen within 2 minutes
  };

  const getConversation = (friendEmail) => {
    return filteredMessages.filter(m => 
      (m.sender_email === userEmail && m.recipient_email === friendEmail) ||
      (m.sender_email === friendEmail && m.recipient_email === userEmail)
    );
  };

  const getUnreadCount = (friendEmail) => {
    return filteredMessages.filter(m => 
      m.sender_email === friendEmail && 
      m.recipient_email === userEmail && 
      !m.is_read
    ).length;
  };

  const inboxMessages = filteredMessages.filter(m => 
    m.recipient_email === userEmail && !m.is_read
  );

  const savedMessages = filteredMessages.filter(m => 
    m.recipient_email === userEmail && m.is_saved
  );

  const isBlocked = (friendEmail) => blocked.includes(friendEmail);

  const friendsWithMessaging = friends.filter(f => {
    const friendEmail = f.requester_email === userEmail ? f.recipient_email : f.requester_email;
    if (blocked.includes(friendEmail)) return false;
    const profile = publicProfiles.find(p => p.user_email === friendEmail);
    // If profile not found (non-public), still allow messaging —
    // the enable_messaging check only applies when we know the profile.
    if (!profile) return true;
    return profile.enable_messaging !== false;
  });

  if (!userEmail) {
    return null;
  }

  if (friendsWithMessaging.length === 0) {
    if (friends.length === 0) return null;
    return (
      <Card className="bg-white/95 border-[#e8d5b7]/30 p-4">
        <p className="text-sm text-stone-500 text-center">
          {t("messaging.noFriendsWithMessaging")}
        </p>
      </Card>
    );
  }

  return (
    <>
      <div
        className="rounded-xl overflow-hidden"
        style={{
          background: 'linear-gradient(145deg, rgba(52,37,24,0.88), rgba(42,30,20,0.95))',
          border: '1px solid rgba(120,90,65,0.32)',
        }}
      >
        <div className="px-5 py-4 border-b flex items-center justify-between" style={{ borderColor: 'rgba(120,90,65,0.25)' }}>
          <div className="flex items-center gap-2">
            <MessageCircle className="w-5 h-5" style={{ color: 'rgba(180,140,75,0.9)' }} />
            <span className="font-semibold text-[#F5F1E7]">{t("messaging.instantMessaging", "Messages")}</span>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowInbox(true)}
            className="relative border-[rgba(120,90,65,0.35)] text-[#E0D8C8] hover:bg-[rgba(255,255,255,0.06)]"
          >
            {t("messaging.inbox", "Inbox")}
            {inboxMessages.length > 0 && (
              <Badge className="absolute -top-2 -right-2 bg-rose-600 text-white text-xs px-1.5">
                {inboxMessages.length}
              </Badge>
            )}
          </Button>
        </div>
        <div className="p-3">
          <ScrollArea className="h-80">
            <div className="space-y-1.5">
              {friendsWithMessaging.map((friendship) => {
                const friendEmail = friendship.requester_email === userEmail 
                  ? friendship.recipient_email 
                  : friendship.requester_email;
                const profile = publicProfiles.find(p => p.user_email === friendEmail);
                const online = isOnline(friendEmail);
                const unread = getUnreadCount(friendEmail);
                const modules = getModuleTags(profile);
                
                return (
                  <button
                    key={friendship.id}
                    onClick={() => setSelectedFriend(friendEmail)}
                    className="w-full flex items-center gap-3 p-3 rounded-lg transition-all text-left"
                    style={{
                      background: selectedFriend === friendEmail
                        ? 'rgba(163,92,92,0.18)'
                        : 'rgba(255,255,255,0.04)',
                      border: selectedFriend === friendEmail
                        ? '1px solid rgba(163,92,92,0.4)'
                        : '1px solid rgba(120,90,65,0.2)',
                    }}
                  >
                    <div className="relative flex-shrink-0">
                      <Avatar className="w-10 h-10">
                        <AvatarImage src={profile?.avatar_url} />
                        <AvatarFallback className="bg-[#A35C5C] text-[#F5F1E7] text-sm font-semibold">
                          {profile?.display_name?.[0] || friendEmail?.[0]?.toUpperCase() || '?'}
                        </AvatarFallback>
                      </Avatar>
                      <Circle 
                        className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 ${
                          online ? 'text-emerald-400 fill-emerald-400' : 'text-[#E0D8C8]/30 fill-[#E0D8C8]/30'
                        }`} 
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-[#F5F1E7] truncate text-sm">
                        {profile?.display_name || friendEmail}
                      </p>
                      <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                        <p className="text-xs" style={{ color: online ? 'rgba(52,211,153,0.9)' : 'rgba(224,216,200,0.45)' }}>
                          {online ? t("messaging.online", "Online") : t("messaging.offline", "Offline")}
                        </p>
                        {modules.map(m => (
                          <span key={m.label} className="text-[10px] px-1.5 py-0.5 rounded-full font-medium" style={{ background: m.bg, color: m.color }}>
                            {m.label}
                          </span>
                        ))}
                      </div>
                    </div>
                    {unread > 0 && (
                      <Badge className="bg-rose-600 text-white flex-shrink-0">
                        {unread}
                      </Badge>
                    )}
                  </button>
                );
              })}
            </div>
          </ScrollArea>
        </div>
      </div>

      {/* Chat Sheet */}
      <Sheet open={!!selectedFriend} onOpenChange={() => setSelectedFriend(null)}>
        <SheetContent className="w-full sm:max-w-lg flex flex-col" style={{ paddingTop: 'calc(1rem + var(--safe-area-top))' }}>
          <SheetHeader>
            <SheetTitle className="flex items-center gap-3">
              <div className="relative">
                <Avatar className="w-10 h-10">
                  <AvatarImage src={publicProfiles.find(p => p.user_email === selectedFriend)?.avatar_url} />
                  <AvatarFallback className="bg-[#A35C5C] text-[#F5F1E7] font-semibold">
                    {publicProfiles.find(p => p.user_email === selectedFriend)?.display_name?.[0] || selectedFriend?.[0]?.toUpperCase() || '?'}
                  </AvatarFallback>
                </Avatar>
                <Circle 
                  className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 ${
                    isOnline(selectedFriend) ? 'text-emerald-400 fill-emerald-400' : 'text-[#E0D8C8]/30 fill-[#E0D8C8]/30'
                  }`} 
                />
              </div>
              <div>
                <p className="font-semibold text-[#F5F1E7]">
                  {publicProfiles.find(p => p.user_email === selectedFriend)?.display_name || selectedFriend}
                </p>
                <p className="text-xs font-normal" style={{ color: isOnline(selectedFriend) ? 'rgba(52,211,153,0.9)' : 'rgba(224,216,200,0.45)' }}>
                  {isOnline(selectedFriend) ? t("messaging.online", "Online") : t("messaging.offline", "Offline")}
                </p>
              </div>
            </SheetTitle>
            <SheetDescription className="sr-only">{t("messaging.chatDescription")}</SheetDescription>
          </SheetHeader>

          <ScrollArea className="flex-1 px-4 py-4">
            <div className="space-y-3">
              {getConversation(selectedFriend).map((message) => {
                const isSent = message.sender_email === userEmail;
                const isEditing = editingMessageId === message.id;
                
                return (
                  <div key={message.id} className={`flex ${isSent ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[80%] rounded-lg p-3 ${
                      isSent 
                        ? 'bg-blue-600 text-white' 
                        : 'bg-stone-100 text-stone-800'
                    }`}>
                      {isEditing ? (
                        <div className="space-y-2">
                          <Input
                            value={editText}
                            onChange={(e) => setEditText(e.target.value)}
                            className="text-sm"
                            autoFocus
                          />
                          <div className="flex gap-1">
                            <Button
                              size="sm"
                              onClick={() => editMessageMutation.mutate({ 
                                messageId: message.id, 
                                content: editText 
                              })}
                              disabled={!editText.trim() || editMessageMutation.isPending}
                            >
                              {t("common.save")}
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => {
                                setEditingMessageId(null);
                                setEditText('');
                              }}
                            >
                              {t("common.cancel")}
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <p className="text-sm break-words">{message.content}</p>
                          {message.is_edited && (
                            <p className={`text-xs italic mt-1 ${isSent ? 'text-blue-100' : 'text-stone-500'}`}>
                              ({t("messaging.edited")})
                            </p>
                          )}
                          <div className="flex items-center gap-2 mt-1">
                            <p className={`text-xs ${isSent ? 'text-blue-100' : 'text-stone-500'}`}>
                              {new Date(message.created_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </p>
                            {isSent && (
                                <div className="flex gap-1">
                                  <button
                                    onClick={() => {
                                      setEditingMessageId(message.id);
                                      setEditText(message.content);
                                    }}
                                    className="hover:opacity-70"
                                  >
                                    <Edit2 className="w-3 h-3" />
                                  </button>
                                  <button
                                    onClick={() => {
                                      if (window.confirm(t("messaging.deleteConfirm"))) {
                                        deleteMessageMutation.mutate(message.id);
                                      }
                                    }}
                                    className="hover:opacity-70"
                                  >
                                    <Trash2 className="w-3 h-3" />
                                  </button>
                                </div>
                              )}
                            {!isSent && (
                              <div className="flex gap-1">
                                <button
                                  onClick={() => toggleSaveMutation.mutate({ 
                                    messageId: message.id, 
                                    saved: !message.is_saved 
                                  })}
                                  className="hover:opacity-70"
                                >
                                  <Save className={`w-3 h-3 ${message.is_saved ? 'fill-current' : ''}`} />
                                </button>
                              </div>
                            )}
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
            <div ref={scrollRef} />
          </ScrollArea>

          <div className="border-t p-4">
            <div className="flex gap-2">
              <Input
                placeholder={t("messaging.typeMessage", "Type a message…")}
                value={messageText}
                onChange={(e) => setMessageText(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSendMessage()}
                disabled={isBlocked(selectedFriend)}
              />
              <Button 
                onClick={handleSendMessage}
                disabled={!messageText.trim() || sendMessageMutation.isPending || isBlocked(selectedFriend)}
                className="bg-blue-600 hover:bg-blue-700"
              >
                <Send className="w-4 h-4" />
              </Button>
            </div>
            {isBlocked(selectedFriend) ? (
              <p className="text-xs text-rose-600 mt-2">
                {t("messaging.youBlockedUser")}
              </p>
            ) : !isOnline(selectedFriend) && (
              <p className="text-xs text-emerald-600 mt-2">
                {t("messaging.offlineNote", "This user is offline. They'll see your message when they return.")}
              </p>
            )}
          </div>
        </SheetContent>
      </Sheet>

      {/* Inbox Sheet */}
      <Sheet open={showInbox} onOpenChange={setShowInbox}>
        <SheetContent className="w-full sm:max-w-lg" style={{ paddingTop: 'calc(1rem + var(--safe-area-top))' }}>
          <SheetHeader>
            <SheetTitle className="text-[#F5F1E7]">{t("messaging.messageInbox", "Message Inbox")}</SheetTitle>
            <SheetDescription className="sr-only">{t("messaging.inboxDescription", "Your messages")}</SheetDescription>
          </SheetHeader>
          <ScrollArea className="h-full mt-6">
            <div className="space-y-4">
              <div>
                <h3 className="font-semibold text-[#F5F1E7] mb-2">{t("messaging.unreadMessages", "Unread")} ({inboxMessages.length})</h3>
                {inboxMessages.length === 0 ? (
                  <p className="text-sm text-[#E0D8C8]/60 py-4">{t("messaging.noUnread", "No unread messages")}</p>
                ) : (
                  <div className="space-y-2">
                    {inboxMessages.map((message) => {
                      const profile = publicProfiles.find(p => p.user_email === message.sender_email);
                      return (
                        <div key={message.id} className="rounded-lg p-3" style={{ background: 'rgba(163,92,92,0.1)', border: '1px solid rgba(163,92,92,0.25)' }}>
                          <div className="flex items-start gap-3">
                            <Avatar className="w-8 h-8">
                              <AvatarImage src={profile?.avatar_url} />
                              <AvatarFallback className="bg-[#A35C5C] text-[#F5F1E7] text-xs font-semibold">
                                {profile?.display_name?.[0] || message.sender_email?.[0]?.toUpperCase() || '?'}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex-1 min-w-0">
                              <p className="font-semibold text-sm text-[#F5F1E7]">
                                {profile?.display_name || message.sender_email}
                              </p>
                              <p className="text-sm text-[#E0D8C8] break-words mt-0.5">{message.content}</p>
                              <p className="text-xs text-[#E0D8C8]/50 mt-1">
                                {new Date(message.created_date).toLocaleString()}
                              </p>
                            </div>
                            <Button
                              size="sm"
                              variant="outline"
                              className="border-[rgba(120,90,65,0.35)] text-[#E0D8C8] hover:bg-[rgba(255,255,255,0.06)] flex-shrink-0"
                              onClick={() => {
                                setShowInbox(false);
                                setSelectedFriend(message.sender_email);
                              }}
                            >
                              {t("messaging.reply", "Reply")}
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <div>
                <h3 className="font-semibold text-[#F5F1E7] mb-2">{t("messaging.savedMessages", "Saved")} ({savedMessages.length})</h3>
                {savedMessages.length === 0 ? (
                  <p className="text-sm text-[#E0D8C8]/60 py-4">{t("messaging.noSaved", "No saved messages")}</p>
                ) : (
                  <div className="space-y-2">
                    {savedMessages.map((message) => {
                      const profile = publicProfiles.find(p => p.user_email === message.sender_email);
                      return (
                        <div key={message.id} className="rounded-lg p-3" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(120,90,65,0.22)' }}>
                          <div className="flex items-start gap-3">
                            <Avatar className="w-8 h-8">
                              <AvatarImage src={profile?.avatar_url} />
                              <AvatarFallback className="bg-[#A35C5C] text-[#F5F1E7] text-xs font-semibold">
                                {profile?.display_name?.[0] || message.sender_email?.[0]?.toUpperCase() || '?'}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex-1 min-w-0">
                              <p className="font-semibold text-sm text-[#F5F1E7]">
                                {profile?.display_name || message.sender_email}
                              </p>
                              <p className="text-sm text-[#E0D8C8] break-words mt-0.5">{message.content}</p>
                              <p className="text-xs text-[#E0D8C8]/50 mt-1">
                                {new Date(message.created_date).toLocaleString()}
                              </p>
                            </div>
                              <div className="flex gap-1">
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => toggleSaveMutation.mutate({ 
                                    messageId: message.id, 
                                    saved: false 
                                  })}
                                >
                                  <X className="w-4 h-4" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => {
                                    if (window.confirm(t("messaging.deleteConfirm"))) {
                                      deleteMessageMutation.mutate(message.id);
                                    }
                                  }}
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </div>
                              </div>
                              </div>
                              );
                              })}
                              </div>
                              )}
                              </div>
                              </div>
                              </ScrollArea>
        </SheetContent>
      </Sheet>
    </>
  );
}