import React, { useState, useEffect, useRef } from 'react';
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { safeUpdate } from "@/components/utils/safeUpdate";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { MessageCircle, Send, Trash2, Save, X, Circle, Edit2 } from "lucide-react";
import { toast } from "sonner";
import { useTranslation } from "@/components/i18n/safeTranslation";

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
      return rows?.[0] || null;
    },
    enabled: !!userEmail,
    retry: 1,
  });

  const blocked = Array.isArray(myProfile?.blocked_users) ? myProfile.blocked_users : [];

  // Update last seen every 30 seconds
  useEffect(() => {
    if (!userEmail) return;
    
    const updateLastSeen = async () => {
      try {
        const profiles = await base44.entities.UserProfile.filter({ user_email: userEmail });
        if (profiles[0]) {
          await safeUpdate('UserProfile', profiles[0].id, {
            last_seen: new Date().toISOString()
          }, userEmail);
        }
      } catch {
        // Non-fatal presence update.
      }
    };

    updateLastSeen();
    const interval = setInterval(updateLastSeen, 30000); // 30 seconds
    return () => clearInterval(interval);
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
  });

  const markAsReadMutation = useMutation({
    mutationFn: (messageId) => safeUpdate('Message', messageId, { is_read: true }),
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
        await Promise.all(unreadMessages.map((m) => markAsReadMutation.mutateAsync(m.id)));
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
  }, [selectedFriend, messages, userEmail, markAsReadMutation, queryClient]);

  // Auto scroll to bottom of chat
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
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
    return profile?.enable_messaging;
  });

  if (!userEmail || friendsWithMessaging.length === 0) {
    return null;
  }

  return (
    <>
      <Card className="bg-white/95 border-[#e8d5b7]/30">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-stone-800 flex items-center gap-2">
              <MessageCircle className="w-5 h-5 text-blue-600" />
              {t("messaging.instantMessaging")}
            </CardTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowInbox(true)}
              className="relative"
            >
              {t("messaging.inbox")}
              {inboxMessages.length > 0 && (
                <Badge className="absolute -top-2 -right-2 bg-rose-600 text-white text-xs px-1.5">
                  {inboxMessages.length}
                </Badge>
              )}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-96">
            <div className="space-y-2">
              {friendsWithMessaging.map((friendship) => {
                const friendEmail = friendship.requester_email === userEmail 
                  ? friendship.recipient_email 
                  : friendship.requester_email;
                const profile = publicProfiles.find(p => p.user_email === friendEmail);
                const online = isOnline(friendEmail);
                const unread = getUnreadCount(friendEmail);
                
                return (
                  <button
                    key={friendship.id}
                    onClick={() => setSelectedFriend(friendEmail)}
                    className={`w-full flex items-center gap-3 p-3 rounded-lg border transition-all ${
                      selectedFriend === friendEmail 
                        ? 'bg-blue-50 border-blue-300' 
                        : 'hover:bg-stone-50 border-stone-200'
                    }`}
                  >
                    <div className="relative">
                      <Avatar className="w-10 h-10">
                        <AvatarImage src={profile?.avatar_url} />
                        <AvatarFallback className="bg-amber-200 text-amber-800">
                          {profile?.display_name?.[0] || friendEmail?.[0]?.toUpperCase() || '?'}
                        </AvatarFallback>
                      </Avatar>
                      <Circle 
                        className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 ${
                          online ? 'text-emerald-500 fill-emerald-500' : 'text-stone-400 fill-stone-400'
                        }`} 
                      />
                    </div>
                    <div className="flex-1 text-left min-w-0">
                      <p className="font-medium text-stone-800 truncate">
                        {profile?.display_name || friendEmail}
                      </p>
                      <p className="text-xs text-stone-500">
                        {online ? t("messaging.online") : t("messaging.offline")}
                      </p>
                    </div>
                    {unread > 0 && (
                      <Badge className="bg-rose-600 text-white">
                        {unread}
                      </Badge>
                    )}
                  </button>
                );
              })}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Chat Sheet */}
      <Sheet open={!!selectedFriend} onOpenChange={() => setSelectedFriend(null)}>
        <SheetContent className="w-full sm:max-w-lg flex flex-col" style={{ paddingTop: 'calc(1rem + var(--safe-area-top))' }}>
          <SheetHeader>
            <SheetTitle className="flex items-center gap-3">
              <div className="relative">
                <Avatar className="w-10 h-10">
                  <AvatarImage src={publicProfiles.find(p => p.user_email === selectedFriend)?.avatar_url} />
                  <AvatarFallback className="bg-amber-200 text-amber-800">
                    {publicProfiles.find(p => p.user_email === selectedFriend)?.display_name?.[0] || selectedFriend?.[0]?.toUpperCase() || '?'}
                  </AvatarFallback>
                </Avatar>
                <Circle 
                  className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 ${
                    isOnline(selectedFriend) ? 'text-emerald-500 fill-emerald-500' : 'text-stone-400 fill-stone-400'
                  }`} 
                />
              </div>
              <div>
                <p className="font-semibold">
                  {publicProfiles.find(p => p.user_email === selectedFriend)?.display_name || selectedFriend}
                </p>
                <p className="text-xs text-stone-500 font-normal">
                  {isOnline(selectedFriend) ? t("messaging.online") : t("messaging.offline")}
                </p>
              </div>
            </SheetTitle>
          </SheetHeader>

          <ScrollArea className="flex-1 px-4 py-4" ref={scrollRef}>
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
                            {isSent ? (
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
                                    if (window.confirm('Delete this message?')) {
                                      deleteMessageMutation.mutate(message.id);
                                    }
                                  }}
                                  className="hover:opacity-70"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              </div>
                            ) : (
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
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </ScrollArea>

          <div className="border-t p-4">
            <div className="flex gap-2">
              <Input
                placeholder={t("messaging.typeMessage")}
                value={messageText}
                onChange={(e) => setMessageText(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
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
                {t("messaging.offlineNote")}
              </p>
            )}
          </div>
        </SheetContent>
      </Sheet>

      {/* Inbox Sheet */}
      <Sheet open={showInbox} onOpenChange={setShowInbox}>
        <SheetContent className="w-full sm:max-w-lg" style={{ paddingTop: 'calc(1rem + var(--safe-area-top))' }}>
          <SheetHeader>
            <SheetTitle>{t("messaging.messageInbox")}</SheetTitle>
          </SheetHeader>
          <ScrollArea className="h-full mt-6">
            <div className="space-y-4">
              <div>
                <h3 className="font-semibold text-stone-800 mb-2">{t("messaging.unreadMessages")} ({inboxMessages.length})</h3>
                {inboxMessages.length === 0 ? (
                  <p className="text-sm text-stone-500 py-4">{t("messaging.noUnread")}</p>
                ) : (
                  <div className="space-y-2">
                    {inboxMessages.map((message) => {
                      const profile = publicProfiles.find(p => p.user_email === message.sender_email);
                      return (
                        <Card key={message.id} className="bg-blue-50 border-blue-200">
                          <CardContent className="p-3">
                            <div className="flex items-start gap-3">
                              <Avatar className="w-8 h-8">
                                <AvatarImage src={profile?.avatar_url} />
                                <AvatarFallback className="bg-amber-200 text-amber-800 text-xs">
                                  {profile?.display_name?.[0] || message.sender_email?.[0]?.toUpperCase() || '?'}
                                </AvatarFallback>
                              </Avatar>
                              <div className="flex-1 min-w-0">
                                <p className="font-medium text-sm text-stone-800">
                                  {profile?.display_name || message.sender_email}
                                </p>
                                <p className="text-sm text-stone-700 break-words">{message.content}</p>
                                <p className="text-xs text-stone-500 mt-1">
                                  {new Date(message.created_date).toLocaleString()}
                                </p>
                              </div>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => {
                                  setShowInbox(false);
                                  setSelectedFriend(message.sender_email);
                                }}
                              >
                                {t("messaging.reply")}
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                )}
              </div>

              <div>
                <h3 className="font-semibold text-stone-800 mb-2">{t("messaging.savedMessages")} ({savedMessages.length})</h3>
                {savedMessages.length === 0 ? (
                  <p className="text-sm text-stone-500 py-4">{t("messaging.noSaved")}</p>
                ) : (
                  <div className="space-y-2">
                    {savedMessages.map((message) => {
                      const profile = publicProfiles.find(p => p.user_email === message.sender_email);
                      return (
                        <Card key={message.id} className="border-stone-200">
                          <CardContent className="p-3">
                            <div className="flex items-start gap-3">
                              <Avatar className="w-8 h-8">
                                <AvatarImage src={profile?.avatar_url} />
                                <AvatarFallback className="bg-amber-200 text-amber-800 text-xs">
                                  {profile?.display_name?.[0] || message.sender_email?.[0]?.toUpperCase() || '?'}
                                </AvatarFallback>
                              </Avatar>
                              <div className="flex-1 min-w-0">
                                <p className="font-medium text-sm text-stone-800">
                                  {profile?.display_name || message.sender_email}
                                </p>
                                <p className="text-sm text-stone-700 break-words">{message.content}</p>
                                <p className="text-xs text-stone-500 mt-1">
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
                          </CardContent>
                        </Card>
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
