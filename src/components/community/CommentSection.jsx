import React, { useState } from 'react';
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { MessageSquare, Send, Flag, Trash2 } from "lucide-react";
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
import { Textarea as ReportTextarea } from "@/components/ui/textarea";

export default function CommentSection({ entityType, entityId, entityOwnerEmail }) {
  const [showComments, setShowComments] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [reportingComment, setReportingComment] = useState(null);
  const [reportReason, setReportReason] = useState('');
  const queryClient = useQueryClient();

  const { data: user } = useQuery({
    queryKey: ['current-user'],
    queryFn: () => base44.auth.me(),
  });

  const { data: comments = [] } = useQuery({
    queryKey: ['comments', entityType, entityId],
    queryFn: () => base44.entities.Comment.filter({ 
      entity_type: entityType, 
      entity_id: entityId,
      is_hidden: false
    }, '-created_date'),
    enabled: showComments,
  });

  const addCommentMutation = useMutation({
    mutationFn: (data) => base44.entities.Comment.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['comments', entityType, entityId] });
      setNewComment('');
    },
  });

  const deleteCommentMutation = useMutation({
    mutationFn: (id) => base44.entities.Comment.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['comments', entityType, entityId] });
    },
  });

  const reportMutation = useMutation({
    mutationFn: (data) => base44.entities.AbuseReport.create(data),
    onSuccess: () => {
      setReportingComment(null);
      setReportReason('');
      alert('Report submitted. Thank you for helping keep our community safe.');
    },
  });

  const handleAddComment = () => {
    if (!newComment.trim()) return;
    
    addCommentMutation.mutate({
      entity_type: entityType,
      entity_id: entityId,
      entity_owner_email: entityOwnerEmail,
      commenter_email: user?.email,
      commenter_name: user?.full_name || user?.email,
      content: newComment
    });
  };

  const handleReport = () => {
    if (!reportReason.trim()) return;
    
    reportMutation.mutate({
      comment_id: reportingComment,
      reporter_email: user?.email,
      reason: reportReason
    });
  };

  const isOwner = user?.email === entityOwnerEmail;
  const canComment = user && user.email !== entityOwnerEmail;

  return (
    <div>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setShowComments(!showComments)}
        className="text-stone-600 hover:text-stone-800"
      >
        <MessageSquare className="w-4 h-4 mr-1" />
        {showComments ? 'Hide' : 'Show'} Comments ({comments.length})
      </Button>

      {showComments && (
        <div className="mt-4 space-y-4">
          {/* Add Comment Form */}
          {canComment && (
            <div className="space-y-2">
              <Textarea
                placeholder="Leave a comment..."
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                className="min-h-[80px]"
              />
              <Button
                size="sm"
                onClick={handleAddComment}
                disabled={addCommentMutation.isPending || !newComment.trim()}
                className="bg-amber-700 hover:bg-amber-800"
              >
                <Send className="w-4 h-4 mr-2" />
                Post Comment
              </Button>
            </div>
          )}

          {/* Comments List */}
          <div className="space-y-3">
            {comments.map((comment) => (
              <div key={comment.id} className="flex gap-3 p-3 bg-stone-50 rounded-lg">
                <Avatar className="w-8 h-8">
                  <AvatarFallback className="bg-amber-200 text-amber-800 text-xs">
                    {comment.commenter_name?.[0] || 'U'}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-medium text-sm text-stone-800">
                        {comment.commenter_name}
                      </p>
                      <p className="text-xs text-stone-500">
                        {new Date(comment.created_date).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex gap-1">
                      {user && comment.commenter_email !== user.email && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setReportingComment(comment.id)}
                          className="h-7 px-2 text-stone-500 hover:text-rose-600"
                        >
                          <Flag className="w-3 h-3" />
                        </Button>
                      )}
                      {(isOwner || comment.commenter_email === user?.email) && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => deleteCommentMutation.mutate(comment.id)}
                          disabled={deleteCommentMutation.isPending}
                          className="h-7 px-2 text-stone-500 hover:text-rose-600"
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      )}
                    </div>
                  </div>
                  <p className="text-sm text-stone-700 mt-1">{comment.content}</p>
                </div>
              </div>
            ))}

            {comments.length === 0 && (
              <p className="text-sm text-stone-500 text-center py-4">
                No comments yet. Be the first to comment!
              </p>
            )}
          </div>
        </div>
      )}

      {/* Report Dialog */}
      <AlertDialog open={!!reportingComment} onOpenChange={() => setReportingComment(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Report Inappropriate Comment</AlertDialogTitle>
            <AlertDialogDescription>
              Please describe why this comment violates community guidelines. Reports are reviewed by administrators.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <ReportTextarea
            placeholder="Explain why this comment is inappropriate..."
            value={reportReason}
            onChange={(e) => setReportReason(e.target.value)}
            className="min-h-[100px]"
          />
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setReportingComment(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleReport}
              disabled={!reportReason.trim() || reportMutation.isPending}
              className="bg-rose-600 hover:bg-rose-700"
            >
              Submit Report
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}