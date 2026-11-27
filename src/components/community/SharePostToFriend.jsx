import React, { useState } from 'react';
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Loader2, Send } from "lucide-react";
import { toast } from "sonner";
import { useTranslation } from "@/components/i18n/safeTranslation";

function friendEmail(friendship, userEmail) {
  return friendship.requester_email === userEmail
    ? friendship.recipient_email
    : friendship.requester_email;
}

export default function SharePostToFriend({ open, onOpenChange, post, friends = [], user }) {
  const { t } = useTranslation();
  const [sendingTo, setSendingTo] = useState(null);

  const recipients = friends
    .filter((friendship) => friendship.status === 'accepted')
    .map((friendship) => friendEmail(friendship, user?.email))
    .filter((email) => email && email !== user?.email);

  const share = async (email) => {
    setSendingTo(email);
    try {
      const snippet = [post.title, post.body].filter(Boolean).join(' — ').slice(0, 400);
      const link = `${window.location.origin}/Community`;
      await base44.entities.Message.create({
        sender_email: user.email,
        recipient_email: email,
        content: `${post.author_name || post.author_email} shared a post in the community: "${snippet}"\n\n${link}`,
      });
      toast.success(t('communityFeed.sharedWithFriend', 'Post sent to your friend'));
      onOpenChange(false);
    } catch {
      toast.error(t('communityFeed.shareFailed', 'Could not share that post'));
    } finally {
      setSendingTo(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md" style={{ background: 'rgba(27,19,13,0.98)', border: '1px solid rgba(140,107,63,0.35)' }}>
        <DialogHeader>
          <DialogTitle style={{ color: '#F5F1E7', fontFamily: "'Georgia', serif" }}>
            {t('communityFeed.sharePost', 'Share post')}
          </DialogTitle>
          <DialogDescription>
            {t('communityFeed.sharePostDesc', 'Send this post to one of your friends as a message.')}
          </DialogDescription>
        </DialogHeader>

        {recipients.length === 0 ? (
          <p className="text-sm text-[#E0D8C8]/70 py-4">
            {t('communityFeed.noFriendsToShare', 'Add a friend first to share posts with them.')}
          </p>
        ) : (
          <div className="space-y-2 max-h-72 overflow-y-auto">
            {recipients.map((email) => (
              <div
                key={email}
                className="flex items-center gap-3 p-2 rounded-md"
                style={{ background: 'rgba(42,30,20,0.7)', border: '1px solid rgba(120,90,65,0.25)' }}
              >
                <Avatar className="w-9 h-9">
                  <AvatarImage src="" />
                  <AvatarFallback className="bg-[#A35C5C] text-[#E0D8C8] text-xs">
                    {email[0]?.toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <span className="flex-1 min-w-0 text-sm text-[#E0D8C8] truncate">{email}</span>
                <Button size="sm" disabled={sendingTo === email} onClick={() => share(email)}>
                  {sendingTo === email ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                </Button>
              </div>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}