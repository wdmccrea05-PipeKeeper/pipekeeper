import React, { useState } from 'react';
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import moment from 'moment';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Heart, MessageSquare, Send, Trash2 } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { useTranslation } from "@/components/i18n/safeTranslation";
import { SafeText } from "@/components/ui/SafeText";
import CommentSection from "@/components/community/CommentSection";
import SharePostToFriend from "@/components/community/SharePostToFriend";

const TYPE_LABELS = {
  acquisition: { key: 'communityFeed.typeAcquisition', label: 'New acquisition', color: 'rgba(46,125,92,0.85)' },
  session: { key: 'communityFeed.typeSession', label: 'Session', color: 'rgba(100,130,180,0.85)' },
  photo: { key: 'communityFeed.typePhoto', label: 'Photo', color: 'rgba(150,110,180,0.85)' },
  note: { key: 'communityFeed.typeNote', label: 'Update', color: 'rgba(140,110,75,0.85)' },
};

const MODULE_LABELS = {
  general: { key: 'communityFeed.moduleGeneral', label: 'General' },
  pipe: { key: 'communityFeed.modulePipe', label: 'Pipes' },
  tobacco: { key: 'communityFeed.moduleTobacco', label: 'Tobacco' },
  whiskey: { key: 'communityFeed.moduleWhiskey', label: 'Whiskey' },
  cigar: { key: 'communityFeed.moduleCigar', label: 'Cigars' },
  wine: { key: 'communityFeed.moduleWine', label: 'Wine' },
};

export default function PostCard({ post, currentUser, friends = [], onChanged }) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [showComments, setShowComments] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const { data: likeData } = useQuery({
    queryKey: ['post-likes', post.id, currentUser?.email],
    queryFn: async () => {
      const [total, mine] = await Promise.all([
        base44.entities.CommunityPostLike.count({ post_id: post.id }),
        currentUser?.email
          ? base44.entities.CommunityPostLike.filter({ post_id: post.id, user_email: currentUser.email })
          : Promise.resolve([]),
      ]);
      return { total, myLike: mine?.[0] || null };
    },
    staleTime: 15_000,
  });

  const likeCount = likeData?.total ?? 0;
  const myLike = likeData?.myLike || null;
  const isMine = post.author_email === currentUser?.email;
  const typeInfo = TYPE_LABELS[post.post_type] || TYPE_LABELS.note;
  const moduleInfo = MODULE_LABELS[post.module_type] || MODULE_LABELS.general;

  const toggleLike = async () => {
    if (!currentUser?.email) return;
    if (myLike) {
      await base44.entities.CommunityPostLike.delete(myLike.id);
    } else {
      await base44.entities.CommunityPostLike.create({
        post_id: post.id,
        user_email: currentUser.email,
      });
    }
    queryClient.invalidateQueries({ queryKey: ['post-likes', post.id] });
  };

  const removePost = async () => {
    await base44.entities.CommunityPost.delete(post.id);
    toast.success(t('communityFeed.postDeleted', 'Post deleted'));
    setConfirmDelete(false);
    onChanged?.();
  };

  return (
    <div
      className="rounded-lg overflow-hidden"
      style={{
        background: "linear-gradient(145deg, rgba(48, 34, 22, 0.72), rgba(38, 26, 18, 0.85))",
        border: "1px solid rgba(120, 90, 65, 0.28)",
        boxShadow: "0 3px 10px rgba(0,0,0,0.5), inset 0 1px 0 rgba(180,140,100,0.08)"
      }}
    >
      <div className="p-4 sm:p-5 space-y-3">
        <div className="flex items-start gap-3">
          <Avatar className="w-10 h-10 flex-shrink-0">
            <AvatarImage src={post.author_avatar} />
            <AvatarFallback className="bg-[#A35C5C] text-[#E0D8C8] text-sm">
              {(post.author_name || post.author_email)?.[0]?.toUpperCase() || '?'}
            </AvatarFallback>
          </Avatar>

          <div className="flex-1 min-w-0">
            <SafeText as="p" className="font-semibold text-[#E0D8C8] text-sm" truncate>
              {post.author_name || post.author_email}
            </SafeText>
            <p className="text-xs text-[#E0D8C8]/55">
              {post.created_date ? moment(post.created_date).fromNow() : ''}
            </p>
          </div>

          <div className="flex items-center gap-1.5 flex-shrink-0">
            <Badge
              className="text-[10px] text-white border-0"
              style={{ background: typeInfo.color }}
            >
              {t(typeInfo.key, typeInfo.label)}
            </Badge>
            {post.module_type && post.module_type !== 'general' && (
              <Badge variant="outline" className="text-[10px] text-[#E0D8C8]/80 border-[rgba(180,140,75,0.35)]">
                {t(moduleInfo.key, moduleInfo.label)}
              </Badge>
            )}
          </div>
        </div>

        {post.title && (
          <SafeText as="h3" className="font-semibold text-[#F5F1E7]" style={{ fontFamily: "'Georgia', serif" }}>
            {post.title}
          </SafeText>
        )}

        {post.body && (
          <SafeText as="p" className="text-sm text-[#E0D8C8]/85 whitespace-pre-wrap">
            {post.body}
          </SafeText>
        )}

        {post.record_name && (
          <div
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md text-xs"
            style={{ background: 'rgba(180,140,75,0.12)', border: '1px solid rgba(180,140,75,0.3)', color: '#D4A574' }}
          >
            {post.record_name}
          </div>
        )}

        {post.photos?.length > 0 && (
          <div className={`grid gap-2 ${post.photos.length === 1 ? 'grid-cols-1' : 'grid-cols-2'}`}>
            {post.photos.map((url) => (
              <img
                key={url}
                src={url}
                alt=""
                className="w-full rounded-md object-cover"
                style={{ maxHeight: post.photos.length === 1 ? 360 : 200 }}
                loading="lazy"
              />
            ))}
          </div>
        )}

        <div className="flex items-center gap-1 pt-1 border-t" style={{ borderTopColor: 'rgba(120,90,65,0.2)' }}>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={toggleLike}
            className={myLike ? 'text-[#A35C5C]' : 'text-[#E0D8C8]/70'}
          >
            <Heart className={`w-4 h-4 mr-1 ${myLike ? 'fill-current' : ''}`} />
            {likeCount}
          </Button>

          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setShowComments((open) => !open)}
            className="text-[#E0D8C8]/70"
          >
            <MessageSquare className="w-4 h-4 mr-1" />
            {t('communityFeed.comments', 'Comments')}
          </Button>

          {!isMine && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setShareOpen(true)}
              className="text-[#E0D8C8]/70"
            >
              <Send className="w-4 h-4 mr-1" />
              {t('communityFeed.share', 'Share')}
            </Button>
          )}

          {isMine && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setConfirmDelete(true)}
              className="ml-auto text-[#E0D8C8]/60"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          )}
        </div>

        {showComments && (
          <CommentSection
            entityType="post"
            entityId={post.id}
            entityOwnerEmail={post.author_email}
            defaultOpen
          />
        )}
      </div>

      <SharePostToFriend
        open={shareOpen}
        onOpenChange={setShareOpen}
        post={post}
        friends={friends}
        user={currentUser}
      />

      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent style={{ background: 'rgba(27,19,13,0.98)', border: '1px solid rgba(140,107,63,0.35)' }}>
          <AlertDialogHeader>
            <AlertDialogTitle style={{ color: '#F5F1E7' }}>
              {t('communityFeed.deletePostTitle', 'Delete this post?')}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t('communityFeed.deletePostDesc', 'This removes it from the community feed for everyone.')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={removePost}>
              {t('common.delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}