import React, { useState } from 'react';
import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { safeUpdate } from "@/components/utils/safeUpdate";
import { invalidateProfileQueries } from "@/components/utils/cacheInvalidation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Calendar, Leaf, MessageSquare, Eye, Globe, Settings, Flag, ShieldOff } from "lucide-react";
import { createPageUrl } from "@/components/utils/createPageUrl";
import PipeShapeIcon from "@/components/pipes/PipeShapeIcon";
import CommentSection from "@/components/community/CommentSection";
import ImageModal from "@/components/ui/ImageModal";
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
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

const PIPE_IMAGE = 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/694956e18d119cc497192525/dd0287dd6_pipe_no_bg.png';

export default function PublicProfilePage() {
  const urlParams = new URLSearchParams(window.location.search);
  const profileEmail = urlParams.get('email');
  const isPreview = urlParams.get('preview') === 'true';
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [expandedImage, setExpandedImage] = React.useState(null);
  const [reportOpen, setReportOpen] = useState(false);
  const [blockOpen, setBlockOpen] = useState(false);
  const [reportReason, setReportReason] = useState('');

  const { data: currentUser } = useQuery({
    queryKey: ['current-user'],
    queryFn: () => base44.auth.me(),
    staleTime: 5000,
    retry: 1,
  });

  const { data: profile } = useQuery({
    queryKey: ['public-profile', profileEmail],
    queryFn: async () => {
      try {
        const profiles = await base44.entities.UserProfile.filter({ user_email: profileEmail });
        return Array.isArray(profiles) ? profiles[0] : null;
      } catch (err) {
        console.error('Profile load error:', err);
        return null;
      }
    },
    enabled: !!profileEmail,
    retry: 1,
    staleTime: 5000,
  });

  const { data: myProfile } = useQuery({
    queryKey: ['my-profile', currentUser?.email],
    queryFn: async () => {
      const rows = await base44.entities.UserProfile.filter({ user_email: currentUser?.email });
      return rows?.[0] || null;
    },
    enabled: !!currentUser?.email,
    retry: 1,
  });

  const { data: pipes = [] } = useQuery({
    queryKey: ['public-pipes', profileEmail],
    queryFn: async () => {
      try {
        const result = await base44.entities.Pipe.filter({ created_by: profileEmail });
        return Array.isArray(result) ? result : [];
      } catch (err) {
        console.error('Public pipes load error:', err);
        return [];
      }
    },
    enabled: !!profileEmail,
    retry: 1,
    staleTime: 5000,
  });

  const { data: blends = [] } = useQuery({
    queryKey: ['public-blends', profileEmail],
    queryFn: async () => {
      try {
        const result = await base44.entities.TobaccoBlend.filter({ created_by: profileEmail });
        return Array.isArray(result) ? result : [];
      } catch (err) {
        console.error('Public blends load error:', err);
        return [];
      }
    },
    enabled: !!profileEmail,
    retry: 1,
    staleTime: 5000,
  });

  const { data: logs = [] } = useQuery({
    queryKey: ['public-logs', profileEmail],
    queryFn: async () => {
      try {
        const result = await base44.entities.SmokingLog.filter({ created_by: profileEmail }, '-date', 20);
        return Array.isArray(result) ? result : [];
      } catch (err) {
        console.error('Public logs load error:', err);
        return [];
      }
    },
    enabled: !!profileEmail,
    retry: 1,
    staleTime: 5000,
  });

  const makePublicMutation = useMutation({
    mutationFn: (profileId) => safeUpdate('UserProfile', profileId, { is_public: true }, currentUser?.email),
    onSuccess: () => {
      invalidateProfileQueries(queryClient, profileEmail);
    },
  });

  const reportUserMutation = useMutation({
    mutationFn: (data) => base44.entities.AbuseReport.create(data),
    onSuccess: () => {
      setReportOpen(false);
      setReportReason('');
      toast.success('Report submitted. Thank you for helping keep our community safe.');
    },
    onError: () => toast.error('Could not submit report'),
  });

  const blockUserMutation = useMutation({
    mutationFn: async () => {
      if (!myProfile?.id || !profileEmail) return;
      const blocked = Array.isArray(myProfile.blocked_users) ? myProfile.blocked_users : [];
      const next = Array.from(new Set([...blocked, profileEmail]));
      await safeUpdate('UserProfile', myProfile.id, { blocked_users: next }, currentUser?.email);
    },
    onSuccess: () => {
      setBlockOpen(false);
      toast.success('User blocked');
      navigate(createPageUrl('Community'));
    },
    onError: () => toast.error('Could not block user'),
  });

  const isOwnProfile = currentUser?.email === profileEmail;

  if (!profile) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#1a2c42] via-[#243548] to-[#1a2c42] flex items-center justify-center">
        <Card className="bg-white/95 max-w-md">
          <CardContent className="p-8 text-center">
            <h2 className="text-xl font-semibold text-stone-800 mb-2">Profile Not Found</h2>
            <p className="text-stone-600 mb-4">This profile does not exist.</p>
            <a href={createPageUrl('Community')}>
              <Button variant="outline">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Community
              </Button>
            </a>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!profile.is_public && !isPreview) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#1a2c42] via-[#243548] to-[#1a2c42] flex items-center justify-center">
        <Card className="bg-white/95 max-w-md">
          <CardContent className="p-8 text-center">
            <h2 className="text-xl font-semibold text-stone-800 mb-2">Profile Not Available</h2>
            <p className="text-stone-600 mb-4">This profile is private or does not exist.</p>
            <a href={createPageUrl('Community')}>
              <Button variant="outline">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Community
              </Button>
            </a>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#1a2c42] via-[#243548] to-[#1a2c42]">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {isPreview && isOwnProfile ? (
          <a href={createPageUrl('Profile')}>
            <Button variant="ghost" className="mb-6 text-[#e8d5b7] hover:text-[#e8d5b7]/80">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Profile Settings
            </Button>
          </a>
        ) : (
          <a href={createPageUrl('Community')}>
            <Button variant="ghost" className="mb-6 text-[#e8d5b7] hover:text-[#e8d5b7]/80">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Community
            </Button>
          </a>
        )}

        {/* Preview Banner */}
        {isPreview && isOwnProfile && (
          <Card className="bg-gradient-to-r from-amber-100 to-amber-50 border-amber-300 mb-6">
            <CardContent className="p-6">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <Eye className="w-5 h-5 text-amber-700" />
                    <h3 className="font-semibold text-amber-900">Preview Mode</h3>
                  </div>
                  <p className="text-sm text-amber-800 mb-3">
                    This is how your profile will appear to other users. Review your information before making it public.
                  </p>
                  <div className="flex items-start gap-3 p-3 bg-white/50 rounded-lg border border-amber-200">
                    <div className="text-amber-700 mt-0.5">
                      <Globe className="w-4 h-4" />
                    </div>
                    <div className="flex-1 text-sm">
                      <p className="font-medium text-amber-900 mb-1">What will be shared:</p>
                      <ul className="text-amber-800 space-y-1">
                        <li>• Your display name, bio, and profile picture</li>
                        <li>• Your pipe collection with photos and details</li>
                        <li>• Your tobacco cellar with blend information</li>
                        <li>• Your smoking session logs</li>
                        {profile.allow_comments && <li>• Other users can comment on your items</li>}
                      </ul>
                    </div>
                  </div>
                </div>
                {!profile.is_public && (
                  <div className="flex flex-col gap-2">
                    <Button
                      onClick={() => makePublicMutation.mutate(profile.id)}
                      disabled={makePublicMutation.isPending}
                      className="bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 whitespace-nowrap"
                    >
                      {makePublicMutation.isPending ? (
                        'Making Public...'
                      ) : (
                        <>
                          <Globe className="w-4 h-4 mr-2" />
                          Make Profile Public
                        </>
                      )}
                    </Button>
                    <a href={createPageUrl('Profile')}>
                      <Button variant="outline" size="sm" className="w-full">
                        <Settings className="w-4 h-4 mr-2" />
                        Edit Settings
                      </Button>
                    </a>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Profile Header */}
        <Card className="bg-white/95 mb-6">
          <CardContent className="p-6">
            <div className="flex items-start gap-6">
              <Avatar 
                className="w-24 h-24 cursor-pointer hover:opacity-80 transition-opacity"
                onClick={() => profile.avatar_url && setExpandedImage(profile.avatar_url)}
              >
                <AvatarImage src={profile.avatar_url} />
                <AvatarFallback className="bg-amber-200 text-amber-800 text-2xl">
                  {profile.display_name?.[0] || profile.user_email?.[0]?.toUpperCase() || '?'}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <h1 className="text-2xl font-bold text-stone-800 mb-2">
                  {profile.display_name || 'Anonymous User'}
                </h1>
                {profile.show_location && (profile.city || profile.state_province || profile.country) && (
                  <p className="text-sm text-stone-500 mb-2">
                    📍 {[profile.city, profile.state_province, profile.country].filter(Boolean).join(', ')}
                  </p>
                )}
                {profile.bio && (
                  <p className="text-stone-600 mb-4">{profile.bio}</p>
                )}
                {!profile.privacy_hide_collection_counts && (
                  <div className="flex flex-wrap gap-4 text-sm text-stone-600 mb-3">
                    <div className="flex items-center gap-1">
                      <img src={PIPE_IMAGE} alt="Pipes" className="w-4 h-4 opacity-60" />
                      <span>{pipes.length} Pipes</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Leaf className="w-4 h-4" />
                      <span>{blends.length} Blends</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Calendar className="w-4 h-4" />
                      <span>{logs.length} Smoking Sessions</span>
                    </div>
                  </div>
                )}
                {!isOwnProfile && currentUser?.email && (
                  <div className="flex flex-wrap gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="border-rose-300 text-rose-700 hover:bg-rose-50"
                      onClick={() => setReportOpen(true)}
                    >
                      <Flag className="w-4 h-4 mr-2" />
                      Report
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="border-stone-300 text-stone-700 hover:bg-stone-50"
                      onClick={() => setBlockOpen(true)}
                    >
                      <ShieldOff className="w-4 h-4 mr-2" />
                      Block
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Collection Tabs */}
        <Tabs defaultValue="pipes" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="pipes">Pipes ({pipes.length})</TabsTrigger>
            <TabsTrigger value="tobacco">Tobacco ({blends.length})</TabsTrigger>
            <TabsTrigger value="logs">Sessions ({logs.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="pipes" className="space-y-4">
            <div className="space-y-4">
              {pipes.map((pipe) => (
                <Card key={pipe.id} className="bg-white/95 border-stone-200 hover:border-amber-400 transition-colors">
                  <CardContent className="p-4">
                    <div className="space-y-3">
                      <div className="flex gap-4">
                        <div 
                          className="w-32 h-20 rounded-lg bg-gradient-to-br from-stone-100 to-stone-200 overflow-hidden flex items-center justify-center flex-shrink-0 cursor-pointer hover:opacity-80 transition-opacity"
                          onClick={(e) => {
                            if (pipe.photos?.[0]) {
                              e.stopPropagation();
                              setExpandedImage(pipe.photos[0]);
                            }
                          }}
                        >
                          {pipe.photos?.[0] ? (
                            <img src={pipe.photos[0]} alt={pipe.name} className="w-full h-full object-cover" />
                          ) : (
                            <PipeShapeIcon shape={pipe.shape} className="w-16 h-16" />
                          )}
                        </div>
                        <div className="flex-1">
                          <h3 className="font-semibold text-stone-800 mb-1">{pipe.name}</h3>
                          {pipe.maker && <p className="text-sm text-stone-600 mb-2">{pipe.maker}</p>}
                          <div className="flex flex-wrap gap-2">
                            {pipe.shape && (
                              <Badge variant="outline" className="text-xs">
                                {pipe.shape}
                              </Badge>
                            )}
                            {!profile.privacy_hide_values && pipe.estimated_value && (
                              <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 text-xs">
                                ${pipe.estimated_value.toLocaleString()}
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                      {pipe.photos?.length > 1 && (
                        <div className="flex gap-2 overflow-x-auto pb-2">
                          {pipe.photos.map((photo, idx) => (
                            <img
                              key={idx}
                              src={photo}
                              alt={`${pipe.name} ${idx + 1}`}
                              className="w-20 h-20 rounded-lg object-cover flex-shrink-0 border border-stone-200 cursor-pointer hover:opacity-80 transition-opacity"
                              onClick={(e) => {
                                e.stopPropagation();
                                setExpandedImage(photo);
                              }}
                            />
                          ))}
                        </div>
                      )}
                    </div>
                    {profile.allow_comments && !isPreview && (
                      <div className="mt-3 pt-3 border-t">
                        <CommentSection
                          entityType="pipe"
                          entityId={pipe.id}
                          entityOwnerEmail={profileEmail}
                        />
                      </div>
                    )}
                    {profile.allow_comments && isPreview && (
                      <div className="mt-3 pt-3 border-t">
                        <p className="text-xs text-stone-500 italic flex items-center gap-1">
                          <MessageSquare className="w-3 h-3" />
                          Comments will be enabled when profile is public
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
            {pipes.length === 0 && (
              <Card className="bg-white/95">
                <CardContent className="py-12 text-center text-stone-500">
                  <img src={PIPE_IMAGE} alt="No pipes" className="w-16 h-16 mx-auto mb-4 opacity-30" />
                  <p>No pipes in collection yet</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="tobacco" className="space-y-4">
            <div className="space-y-4">
              {blends.map((blend) => (
                <Card key={blend.id} className="bg-white/95 border-stone-200 hover:border-amber-400 transition-colors">
                  <CardContent className="p-4">
                    <div className="space-y-3">
                      <div className="flex gap-4">
                        <div 
                          className="w-32 h-20 rounded-lg bg-gradient-to-br from-stone-100 to-stone-200 overflow-hidden flex items-center justify-center flex-shrink-0 cursor-pointer hover:opacity-80 transition-opacity"
                          onClick={(e) => {
                            if (blend.logo || blend.photo) {
                              e.stopPropagation();
                              setExpandedImage(blend.logo || blend.photo);
                            }
                          }}
                        >
                          {blend.logo ? (
                            <img src={blend.logo} alt={blend.manufacturer} className="w-16 h-16 object-contain" />
                          ) : blend.photo ? (
                            <img src={blend.photo} alt={blend.name} className="w-full h-full object-cover" />
                          ) : (
                            <Leaf className="w-16 h-16 text-stone-400" />
                          )}
                        </div>
                        <div className="flex-1">
                          <h3 className="font-semibold text-stone-800 mb-1">{blend.name}</h3>
                          {blend.manufacturer && <p className="text-sm text-stone-600 mb-2">{blend.manufacturer}</p>}
                          <div className="flex flex-wrap gap-2">
                            {blend.blend_type && (
                              <Badge variant="outline" className="text-xs">
                                {blend.blend_type}
                              </Badge>
                            )}
                            {blend.strength && (
                              <Badge variant="outline" className="text-xs">
                                {blend.strength}
                              </Badge>
                            )}
                            {!profile.privacy_hide_inventory && (
                              <>
                                {(blend.tin_total_quantity_oz || 0) > 0 && (
                                  <Badge className="bg-blue-100 text-blue-800 border-blue-200 text-xs">
                                    {blend.tin_total_quantity_oz}oz tins
                                  </Badge>
                                )}
                                {(blend.bulk_total_quantity_oz || 0) > 0 && (
                                  <Badge className="bg-amber-100 text-amber-800 border-amber-200 text-xs">
                                    {blend.bulk_total_quantity_oz}oz bulk
                                  </Badge>
                                )}
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                      {blend.photos?.length > 0 && (
                        <div className="flex gap-2 overflow-x-auto pb-2">
                          {blend.photos.map((photo, idx) => (
                            <img
                              key={idx}
                              src={photo}
                              alt={`${blend.name} ${idx + 1}`}
                              className="w-20 h-20 rounded-lg object-cover flex-shrink-0 border border-stone-200 cursor-pointer hover:opacity-80 transition-opacity"
                              onClick={(e) => {
                                e.stopPropagation();
                                setExpandedImage(photo);
                              }}
                            />
                          ))}
                        </div>
                      )}
                    </div>
                    {profile.allow_comments && !isPreview && (
                      <div className="mt-3 pt-3 border-t">
                        <CommentSection
                          entityType="blend"
                          entityId={blend.id}
                          entityOwnerEmail={profileEmail}
                        />
                      </div>
                    )}
                    {profile.allow_comments && isPreview && (
                      <div className="mt-3 pt-3 border-t">
                        <p className="text-xs text-stone-500 italic flex items-center gap-1">
                          <MessageSquare className="w-3 h-3" />
                          Comments will be enabled when profile is public
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
            {blends.length === 0 && (
              <Card className="bg-white/95">
                <CardContent className="py-12 text-center text-stone-500">
                  <Leaf className="w-16 h-16 mx-auto mb-4 opacity-30" />
                  <p>No tobacco blends in cellar yet</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="logs" className="space-y-4">
            {logs.map((log) => (
              <Card key={log.id} className="bg-white/95 border-stone-200">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="font-semibold text-stone-800">{log.pipe_name}</h3>
                      <p className="text-sm text-stone-600">{log.blend_name}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-stone-500">
                        {new Date(log.date).toLocaleDateString()}
                      </p>
                      {log.bowls_smoked && (
                        <Badge variant="outline" className="text-xs mt-1">
                          {log.bowls_smoked} bowl{log.bowls_smoked > 1 ? 's' : ''}
                        </Badge>
                      )}
                    </div>
                  </div>
                  {log.notes && (
                    <p className="text-sm text-stone-600 mb-3">{log.notes}</p>
                  )}
                  {profile.allow_comments && !isPreview && (
                    <div className="pt-3 border-t">
                      <CommentSection
                        entityType="log"
                        entityId={log.id}
                        entityOwnerEmail={profileEmail}
                      />
                    </div>
                  )}
                  {profile.allow_comments && isPreview && (
                    <div className="pt-3 border-t">
                      <p className="text-xs text-stone-500 italic flex items-center gap-1">
                        <MessageSquare className="w-3 h-3" />
                        Comments will be enabled when profile is public
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
            {logs.length === 0 && (
              <Card className="bg-white/95">
                <CardContent className="py-12 text-center text-stone-500">
                  <Calendar className="w-16 h-16 mx-auto mb-4 opacity-30" />
                  <p>No smoking sessions logged yet</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Image Modal */}
      <ImageModal 
        imageUrl={expandedImage}
        isOpen={!!expandedImage}
        onClose={() => setExpandedImage(null)}
        alt="Profile image"
      />

      {/* Report User Dialog */}
      <AlertDialog open={reportOpen} onOpenChange={setReportOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Report this user</AlertDialogTitle>
            <AlertDialogDescription>
              Tell us what happened. Reports are reviewed by administrators.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <Textarea
            value={reportReason}
            onChange={(e) => setReportReason(e.target.value)}
            placeholder="Describe the issue (harassment, spam, inappropriate content, etc.)"
            className="min-h-[120px]"
          />
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={!reportReason.trim() || reportUserMutation.isPending}
              className="bg-rose-600 hover:bg-rose-700"
              onClick={() =>
                reportUserMutation.mutate({
                  reporter_email: currentUser?.email,
                  reported_user_email: profileEmail,
                  context_type: 'user_profile',
                  reason: reportReason.trim(),
                })
              }
            >
              Submit Report
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Block User Dialog */}
      <AlertDialog open={blockOpen} onOpenChange={setBlockOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Block this user?</AlertDialogTitle>
            <AlertDialogDescription>
              You won't see their profile or messages, and they won't be able to message you.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-stone-800 hover:bg-stone-900"
              onClick={() => blockUserMutation.mutate()}
            >
              Block User
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}