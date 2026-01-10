import React, { useState, useEffect } from 'react';
import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { safeUpdate } from "@/components/utils/safeUpdate";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { User, Save, X, Sparkles, Crown, ArrowRight, LogOut, Upload, Eye, Camera, Database, Globe } from "lucide-react";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { createPageUrl } from "@/components/utils/createPageUrl";
import AvatarCropper from "@/components/pipes/AvatarCropper";
import { shouldShowPurchaseUI, getSubscriptionManagementMessage, isIOSCompanion } from "@/components/utils/companion";
import { openManageSubscription, shouldShowManageSubscription, getManageSubscriptionLabel } from "@/components/utils/subscriptionManagement";
import { hasPremiumAccess } from "@/components/utils/premiumAccess";
import { isTrialWindow, getTrialDaysRemaining } from "@/components/utils/access";
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

const BLEND_TYPES = [
  "Virginia", "Virginia/Perique", "English", "Balkan", "Aromatic",
  "Burley", "Virginia/Burley", "Latakia Blend", "Oriental/Turkish",
  "Navy Flake", "Dark Fired", "Cavendish"
];

const PIPE_SHAPES = [
  "Billiard", "Bulldog", "Dublin", "Apple", "Author", "Bent",
  "Canadian", "Churchwarden", "Freehand", "Lovat", "Poker",
  "Prince", "Rhodesian", "Zulu", "Calabash"
];

export default function ProfilePage() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    display_name: "",
    bio: "",
    avatar_url: "",
    city: "",
    state_province: "",
    country: "",
    postal_code: "",
    show_location: false,
    is_public: false,
    allow_comments: true,
    enable_messaging: false,
    allow_web_lookups: true,
    privacy_hide_values: false,
    privacy_hide_inventory: false,
    privacy_hide_collection_counts: false,
    clenching_preference: "Sometimes",
    smoke_duration_preference: "No Preference",
    preferred_blend_types: [],
    pipe_size_preference: "No Preference",
    preferred_shapes: [],
    strength_preference: "No Preference",
    notes: ""
  });
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [showCropper, setShowCropper] = useState(false);
  const [imageToCrop, setImageToCrop] = useState(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState('');
  const [deleteAIOpen, setDeleteAIOpen] = useState(false);

  const { data: user } = useQuery({
    queryKey: ['current-user'],
    queryFn: () => base44.auth.me(),
    staleTime: 10000,
    retry: 2,
    refetchOnMount: 'always',
  });

  // Check if user has paid access
  const isWithinTrial = isTrialWindow();
  const daysLeftInTrial = getTrialDaysRemaining();
  const hasActiveSubscription = hasPremiumAccess(user);

  const { data: subscription } = useQuery({
    queryKey: ['subscription', user?.email],
    queryFn: async () => {
      try {
        const subs = await base44.entities.Subscription.filter({ user_email: user?.email });
        return Array.isArray(subs) ? (subs[0] || null) : null;
      } catch (err) {
        console.error('Subscription load error:', err);
        return null;
      }
    },
    enabled: !!user?.email,
    retry: 1,
    staleTime: 5000,
  });

  const { data: profile, isLoading } = useQuery({
    queryKey: ['user-profile', user?.email],
    queryFn: async () => {
      try {
        const profiles = await base44.entities.UserProfile.filter({ user_email: user?.email });
        return Array.isArray(profiles) ? profiles[0] : null;
      } catch (err) {
        console.error('User profile load error:', err);
        return null;
      }
    },
    enabled: !!user?.email,
    retry: 2,
    staleTime: 10000,
  });

  useEffect(() => {
    if (profile) {
      setFormData({
        display_name: profile.display_name || "",
        bio: profile.bio || "",
        avatar_url: profile.avatar_url || "",
        city: profile.city || "",
        state_province: profile.state_province || "",
        country: profile.country || "",
        postal_code: profile.postal_code || "",
        show_location: profile.show_location || false,
        is_public: profile.is_public || false,
        allow_comments: profile.allow_comments !== undefined ? profile.allow_comments : true,
        enable_messaging: profile.enable_messaging || false,
        allow_web_lookups: profile.allow_web_lookups !== false,
        privacy_hide_values: profile.privacy_hide_values || false,
        privacy_hide_inventory: profile.privacy_hide_inventory || false,
        privacy_hide_collection_counts: profile.privacy_hide_collection_counts || false,
        clenching_preference: profile.clenching_preference || "Sometimes",
        smoke_duration_preference: profile.smoke_duration_preference || "No Preference",
        preferred_blend_types: profile.preferred_blend_types || [],
        pipe_size_preference: profile.pipe_size_preference || "No Preference",
        preferred_shapes: profile.preferred_shapes || [],
        strength_preference: profile.strength_preference || "No Preference",
        notes: profile.notes || ""
      });
    }
  }, [profile]);

  const saveMutation = useMutation({
    mutationFn: async (data) => {
      const profileData = { ...data, user_email: user?.email };
      if (profile) {
        return safeUpdate('UserProfile', profile.id, profileData, user?.email);
      } else {
        return base44.entities.UserProfile.create(profileData);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-profile', user?.email] });
      toast.success('Profile saved successfully');
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    saveMutation.mutate(formData);
  };

  const handleDeleteAccount = async () => {
    if (!user?.email) return;

    const email = user.email;

    const deleteAll = async (entity, filter) => {
      try {
        const rows = await entity.filter(filter);
        await Promise.all((rows || []).map(r => entity.delete(r.id)));
      } catch (err) {
        console.error('Delete error:', err);
      }
    };

    await deleteAll(base44.entities.Pipe, { created_by: email });
    await deleteAll(base44.entities.TobaccoBlend, { created_by: email });
    await deleteAll(base44.entities.SmokingLog, { created_by: email });
    await deleteAll(base44.entities.Message, { sender_email: email });
    await deleteAll(base44.entities.Message, { recipient_email: email });
    await deleteAll(base44.entities.Friendship, { requester_email: email });
    await deleteAll(base44.entities.Friendship, { recipient_email: email });
    await deleteAll(base44.entities.Comment, { commenter_email: email });
    await deleteAll(base44.entities.UserConnection, { follower_email: email });
    await deleteAll(base44.entities.UserConnection, { following_email: email });
    await deleteAll(base44.entities.PairingMatrix, { created_by: email });
    await deleteAll(base44.entities.CollectionOptimization, { created_by: email });
    await deleteAll(base44.entities.OnboardingStatus, { user_email: email });
    await deleteAll(base44.entities.Subscription, { user_email: email });
    await deleteAll(base44.entities.UserProfile, { user_email: email });

    try {
      await base44.auth.updateMe({
        deletion_requested: true,
        deletion_requested_at: new Date().toISOString(),
      });
    } catch (err) {
      console.error('Failed to mark deletion:', err);
    }

    await base44.auth.logout();
    window.location.href = '/';
  };

  const handleAvatarUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      setImageToCrop(event.target.result);
      setShowCropper(true);
    };
    reader.readAsDataURL(file);
  };

  const handleCroppedImage = async (croppedFile) => {
    setUploadingAvatar(true);
    setShowCropper(false);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file: croppedFile });
      setFormData({ ...formData, avatar_url: file_url });
      toast.success('Avatar uploaded successfully');
    } catch (err) {
      console.error('Error uploading avatar:', err);
      toast.error('Failed to upload image. Please try again.');
    } finally {
      setUploadingAvatar(false);
      setImageToCrop(null);
    }
  };

  const toggleBlendType = (type) => {
    if (formData.preferred_blend_types.includes(type)) {
      setFormData({
        ...formData,
        preferred_blend_types: formData.preferred_blend_types.filter(t => t !== type)
      });
    } else {
      setFormData({
        ...formData,
        preferred_blend_types: [...formData.preferred_blend_types, type]
      });
    }
  };

  const toggleShape = (shape) => {
    if (formData.preferred_shapes.includes(shape)) {
      setFormData({
        ...formData,
        preferred_shapes: formData.preferred_shapes.filter(s => s !== shape)
      });
    } else {
      setFormData({
        ...formData,
        preferred_shapes: [...formData.preferred_shapes, shape]
      });
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#1a2c42] via-[#243548] to-[#1a2c42] flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl mb-4">⚙️</div>
          <p className="text-stone-600">Loading profile...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#1a2c42] via-[#243548] to-[#1a2c42]">
      {showCropper && imageToCrop && (
        <AvatarCropper
          image={imageToCrop}
          onCropComplete={handleCroppedImage}
          onCancel={() => {
            setShowCropper(false);
            setImageToCrop(null);
          }}
          aspectRatio={1}
          cropShape="round"
        />
      )}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Subscription Status Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6"
        >
          <Card className="border-amber-200 bg-gradient-to-br from-amber-50 to-white">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-amber-500 to-amber-600 flex items-center justify-center">
                    <Crown className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    {hasActiveSubscription ? (
                      <>
                        <h3 className="font-semibold text-amber-900">Premium Active</h3>
                        <p className="text-sm text-amber-700">Full access to all features</p>
                      </>
                    ) : isWithinTrial ? (
                      <>
                        <h3 className="font-semibold text-amber-900">Free Trial Active</h3>
                        <p className="text-sm text-amber-700">{daysLeftInTrial} days remaining</p>
                      </>
                    ) : (
                      <>
                        <h3 className="font-semibold text-stone-800">Free Account</h3>
                        <p className="text-sm text-stone-600">Limited features available</p>
                      </>
                    )}
                  </div>
                </div>
                <div className="flex flex-col gap-2">
                  {/* iOS compliance: Hide all subscription management */}
                  {!isIOSCompanion() ? (
                    <>
                      {shouldShowManageSubscription(subscription, user) && (
                        <Button
                          className="bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-700 hover:to-amber-800 w-full"
                          onClick={async () => {
                            try {
                              await openManageSubscription();
                            } catch (e) {
                              const message = e?.message || "Unable to open subscription management portal";
                              console.error('[Profile] Manage subscription error:', message);
                              alert(message);
                            }
                          }}
                        >
                          {getManageSubscriptionLabel()}
                          <ArrowRight className="w-4 h-4 ml-2" />
                        </Button>
                      )}
                      {shouldShowPurchaseUI() && !hasActiveSubscription && (
                        <a href={createPageUrl("Subscription")}>
                          <Button className="bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-700 hover:to-amber-800 w-full">
                            {subscription?.stripe_customer_id ? 'View Subscription' : 'Upgrade'}
                            <ArrowRight className="w-4 h-4 ml-2" />
                          </Button>
                        </a>
                      )}
                      {!shouldShowPurchaseUI() && (
                        <div className="text-xs text-amber-800/80 text-right max-w-[220px]">
                          {getSubscriptionManagementMessage()}
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="text-sm text-amber-800/80 bg-amber-50 p-3 rounded-lg">
                      Premium subscriptions are available on the web. To manage billing or subscribe, visit{" "}
                      <a className="underline font-medium" href="https://pipekeeper.app/Subscription" target="_blank" rel="noreferrer">
                        pipekeeper.app
                      </a>.
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card className="border-violet-200 bg-gradient-to-br from-violet-50 to-white">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-violet-500 to-violet-600 flex items-center justify-center">
                  <User className="w-6 h-6 text-white" />
                </div>
                <div>
                  <CardTitle className="text-2xl text-violet-900">Smoking Profile</CardTitle>
                  <CardDescription className="flex items-center gap-2 mt-1">
                    <Sparkles className="w-4 h-4 text-violet-600" />
                    Personalize your AI recommendations
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Community Settings */}
                <div className="space-y-4 pb-6 border-b">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <h3 className="font-semibold text-violet-800 flex items-center gap-2">
                      <User className="w-4 h-4" />
                      Community Profile
                    </h3>
                    {user?.email && (
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="border-violet-300 text-violet-700 w-full sm:w-auto"
                        onClick={async (e) => {
                          e.preventDefault();
                          try {
                            await saveMutation.mutateAsync(formData);
                            navigate(createPageUrl(`PublicProfile?email=${encodeURIComponent(user.email)}&preview=true`));
                          } catch (err) {
                            console.error('Failed to save profile before preview:', err);
                          }
                        }}
                        disabled={saveMutation.isPending}
                      >
                        <Eye className="w-4 h-4 mr-2" />
                        Preview Profile
                      </Button>
                    )}
                  </div>
                  
                  <div>
                    <Label className="text-stone-700 font-medium mb-2 block">Profile Picture</Label>
                    <div className="flex items-center gap-4">
                      <div className="relative">
                        <div className="w-20 h-20 rounded-full bg-gradient-to-br from-amber-200 to-amber-300 flex items-center justify-center overflow-hidden">
                          {formData.avatar_url ? (
                            <img src={formData.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
                          ) : (
                            <User className="w-10 h-10 text-amber-700" />
                          )}
                        </div>
                      </div>
                      <div className="flex-1">
                        <input
                          type="file"
                          accept="image/*"
                          capture="environment"
                          onChange={handleAvatarUpload}
                          id="avatar-upload"
                          className="hidden"
                          disabled={uploadingAvatar}
                        />
                        <label htmlFor="avatar-upload">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            disabled={uploadingAvatar}
                            className="cursor-pointer"
                            onClick={(e) => {
                              e.preventDefault();
                              document.getElementById('avatar-upload')?.click();
                            }}
                          >
                            <Camera className="w-4 h-4 mr-2" />
                            {uploadingAvatar ? 'Uploading...' : formData.avatar_url ? 'Change Photo' : 'Upload Photo'}
                          </Button>
                        </label>
                        {formData.avatar_url && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => setFormData({ ...formData, avatar_url: "" })}
                            className="ml-2 text-rose-600 hover:text-rose-700"
                          >
                            Remove
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>

                  <div>
                    <Label className="text-stone-700 font-medium">Display Name</Label>
                    <Input
                      value={formData.display_name}
                      onChange={(e) => setFormData({...formData, display_name: e.target.value})}
                      placeholder="How you appear to other users"
                      className="mt-2"
                    />
                  </div>
                  <div>
                    <Label className="text-stone-700 font-medium">Bio</Label>
                    <Textarea
                      value={formData.bio}
                      onChange={(e) => setFormData({...formData, bio: e.target.value})}
                      placeholder="Tell others about your pipe journey..."
                      className="mt-2 min-h-[80px]"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="is_public"
                      checked={formData.is_public}
                      onChange={(e) => setFormData({...formData, is_public: e.target.checked})}
                      className="w-4 h-4 rounded border-stone-300"
                    />
                    <Label htmlFor="is_public" className="text-sm text-stone-700 cursor-pointer">
                      Make my profile publicly searchable in Community
                    </Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="allow_comments"
                      checked={formData.allow_comments}
                      onChange={(e) => setFormData({...formData, allow_comments: e.target.checked})}
                      className="w-4 h-4 rounded border-stone-300"
                    />
                    <Label htmlFor="allow_comments" className="text-sm text-stone-700 cursor-pointer">
                      Allow comments on my pipes, tobacco, and logs
                    </Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="enable_messaging"
                      checked={formData.enable_messaging}
                      onChange={(e) => setFormData({...formData, enable_messaging: e.target.checked})}
                      className="w-4 h-4 rounded border-stone-300"
                    />
                    <Label htmlFor="enable_messaging" className="text-sm text-stone-700 cursor-pointer">
                      Enable instant messaging with friends (Premium)
                    </Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="allow_web_lookups"
                      checked={formData.allow_web_lookups !== false}
                      onChange={(e) => setFormData({...formData, allow_web_lookups: e.target.checked})}
                      className="w-4 h-4 rounded border-stone-300"
                    />
                    <Label htmlFor="allow_web_lookups" className="text-sm text-stone-700 cursor-pointer flex items-center gap-1">
                      <Globe className="w-3 h-3" />
                      Allow AI to use external web lookups for enrichment
                    </Label>
                  </div>
                  <div className="space-y-2 pt-2 border-t">
                    <h4 className="text-sm font-semibold text-stone-700">Public Profile Privacy</h4>
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="privacy_hide_values"
                        checked={formData.privacy_hide_values || false}
                        onChange={(e) => setFormData({...formData, privacy_hide_values: e.target.checked})}
                        className="w-4 h-4 rounded border-stone-300"
                      />
                      <Label htmlFor="privacy_hide_values" className="text-sm text-stone-700 cursor-pointer">
                        Hide pipe values in public profile
                      </Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="privacy_hide_inventory"
                        checked={formData.privacy_hide_inventory || false}
                        onChange={(e) => setFormData({...formData, privacy_hide_inventory: e.target.checked})}
                        className="w-4 h-4 rounded border-stone-300"
                      />
                      <Label htmlFor="privacy_hide_inventory" className="text-sm text-stone-700 cursor-pointer">
                        Hide tobacco inventory quantities
                      </Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="privacy_hide_collection_counts"
                        checked={formData.privacy_hide_collection_counts || false}
                        onChange={(e) => setFormData({...formData, privacy_hide_collection_counts: e.target.checked})}
                        className="w-4 h-4 rounded border-stone-300"
                      />
                      <Label htmlFor="privacy_hide_collection_counts" className="text-sm text-stone-700 cursor-pointer">
                        Hide collection counts
                      </Label>
                    </div>
                  </div>


                  <div className="pt-4 border-t space-y-4">
                    <h4 className="font-semibold text-violet-800">Location (Optional)</h4>
                    <p className="text-sm text-stone-600">Share your location to connect with nearby pipe enthusiasts</p>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label className="text-stone-700 font-medium">City</Label>
                        <Input
                          value={formData.city}
                          onChange={(e) => setFormData({...formData, city: e.target.value})}
                          placeholder="e.g., Seattle"
                          className="mt-2"
                        />
                      </div>
                      <div>
                        <Label className="text-stone-700 font-medium">State/Province</Label>
                        <Input
                          value={formData.state_province}
                          onChange={(e) => setFormData({...formData, state_province: e.target.value})}
                          placeholder="e.g., WA"
                          className="mt-2"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label className="text-stone-700 font-medium">Country</Label>
                        <Input
                          list="countries"
                          value={formData.country}
                          onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                          placeholder="Type or select country..."
                          className="mt-2"
                        />
                        <datalist id="countries">
                          <option value="United States" />
                          <option value="Canada" />
                          <option value="United Kingdom" />
                          <option value="Ireland" />
                          <option value="Australia" />
                          <option value="New Zealand" />
                          <option value="Germany" />
                          <option value="France" />
                          <option value="Italy" />
                          <option value="Spain" />
                          <option value="Netherlands" />
                          <option value="Belgium" />
                          <option value="Switzerland" />
                          <option value="Austria" />
                          <option value="Denmark" />
                          <option value="Sweden" />
                          <option value="Norway" />
                          <option value="Finland" />
                          <option value="Japan" />
                          <option value="South Korea" />
                        </datalist>
                      </div>
                      <div>
                        <Label className="text-stone-700 font-medium">Zip/Postal Code</Label>
                        <Input
                          value={formData.postal_code}
                          onChange={(e) => setFormData({...formData, postal_code: e.target.value})}
                          placeholder="e.g., 98101"
                          className="mt-2"
                        />
                      </div>
                    </div>

                    <div className="flex items-center gap-2 pt-2">
                      <input
                        type="checkbox"
                        id="show_location"
                        checked={formData.show_location}
                        onChange={(e) => setFormData({...formData, show_location: e.target.checked})}
                        className="w-4 h-4 rounded border-stone-300"
                      />
                      <Label htmlFor="show_location" className="text-sm text-stone-700 cursor-pointer">
                        Show my location publicly and allow others to find me by location
                      </Label>
                    </div>
                  </div>
                  </div>

                {/* Clenching Preference */}
                <div>
                  <Label className="text-stone-700 font-medium">Do you clench your pipes?</Label>
                  <Select
                    value={formData.clenching_preference}
                    onValueChange={(value) => setFormData({ ...formData, clenching_preference: value })}
                  >
                    <SelectTrigger className="mt-2">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Yes">Yes - I prefer lighter pipes</SelectItem>
                      <SelectItem value="Sometimes">Sometimes</SelectItem>
                      <SelectItem value="No">No - Weight doesn't matter</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Smoke Duration */}
                <div>
                  <Label className="text-stone-700 font-medium">Preferred smoke duration?</Label>
                  <Select
                    value={formData.smoke_duration_preference}
                    onValueChange={(value) => setFormData({ ...formData, smoke_duration_preference: value })}
                  >
                    <SelectTrigger className="mt-2">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Short (15-30 min)">Short (15-30 min)</SelectItem>
                      <SelectItem value="Medium (30-60 min)">Medium (30-60 min)</SelectItem>
                      <SelectItem value="Long (60+ min)">Long (60+ min)</SelectItem>
                      <SelectItem value="No Preference">No Preference</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Pipe Size */}
                <div>
                  <Label className="text-stone-700 font-medium">Preferred pipe size?</Label>
                  <Select
                    value={formData.pipe_size_preference}
                    onValueChange={(value) => setFormData({ ...formData, pipe_size_preference: value })}
                  >
                    <SelectTrigger className="mt-2">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Small">Small</SelectItem>
                      <SelectItem value="Medium">Medium</SelectItem>
                      <SelectItem value="Large">Large</SelectItem>
                      <SelectItem value="Extra Large">Extra Large</SelectItem>
                      <SelectItem value="No Preference">No Preference</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Strength Preference */}
                <div>
                  <Label className="text-stone-700 font-medium">Preferred tobacco strength?</Label>
                  <Select
                    value={formData.strength_preference}
                    onValueChange={(value) => setFormData({ ...formData, strength_preference: value })}
                  >
                    <SelectTrigger className="mt-2">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Mild">Mild</SelectItem>
                      <SelectItem value="Mild-Medium">Mild-Medium</SelectItem>
                      <SelectItem value="Medium">Medium</SelectItem>
                      <SelectItem value="Medium-Full">Medium-Full</SelectItem>
                      <SelectItem value="Full">Full</SelectItem>
                      <SelectItem value="No Preference">No Preference</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Preferred Blend Types */}
                <div>
                  <Label className="text-stone-700 font-medium mb-2 block">Favorite blend types</Label>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {BLEND_TYPES.map(type => (
                      <Badge
                        key={type}
                        variant={formData.preferred_blend_types.includes(type) ? "default" : "outline"}
                        className={`cursor-pointer transition-all ${
                          formData.preferred_blend_types.includes(type)
                            ? 'bg-violet-600 text-white'
                            : 'bg-white text-stone-700 hover:bg-stone-100'
                        }`}
                        onClick={() => toggleBlendType(type)}
                      >
                        {type}
                      </Badge>
                    ))}
                  </div>
                </div>

                {/* Preferred Shapes */}
                <div>
                  <Label className="text-stone-700 font-medium mb-2 block">Favorite pipe shapes</Label>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {PIPE_SHAPES.map(shape => (
                      <Badge
                        key={shape}
                        variant={formData.preferred_shapes.includes(shape) ? "default" : "outline"}
                        className={`cursor-pointer transition-all ${
                          formData.preferred_shapes.includes(shape)
                            ? 'bg-violet-600 text-white'
                            : 'bg-white text-stone-700 hover:bg-stone-100'
                        }`}
                        onClick={() => toggleShape(shape)}
                      >
                        {shape}
                      </Badge>
                    ))}
                  </div>
                </div>

                {/* Notes */}
                <div>
                  <Label className="text-stone-700 font-medium">Additional preferences</Label>
                  <Textarea
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    placeholder="Any other preferences or smoking habits..."
                    className="mt-2 min-h-[100px]"
                  />
                </div>

                <div className="flex gap-3 pt-4">
                  <Button
                    type="submit"
                    disabled={saveMutation.isPending}
                    className="bg-gradient-to-r from-violet-600 to-violet-700 hover:from-violet-700 hover:to-violet-800"
                  >
                    <Save className="w-4 h-4 mr-2" />
                    {saveMutation.isPending ? 'Saving...' : 'Save Profile'}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </motion.div>

        {/* Data Management Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mt-6"
        >
          <Card className="border-blue-200 bg-white">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Database className="w-5 h-5 text-blue-600" />
                <CardTitle className="text-lg text-stone-800">Data Management</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-stone-600 mb-3">
                Clear old AI-generated versions (pairings, schedules, optimizations)
              </p>
              <Button
                variant="outline"
                className="w-full justify-start border-blue-200 text-blue-700 hover:bg-blue-50"
                onClick={() => setDeleteAIOpen(true)}
              >
                <Database className="w-4 h-4 mr-2" />
                Delete Old AI Versions
              </Button>
            </CardContent>
          </Card>
        </motion.div>

        {/* Logout Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="mt-6"
        >
          <Card className="border-rose-200 bg-white">
            <CardContent className="p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-stone-800">Restart Tutorial</h3>
                  <p className="text-sm text-stone-600">See the welcome guide again</p>
                </div>
                <Button
                  variant="outline"
                  className="border-violet-200 text-violet-600 hover:bg-violet-50"
                  onClick={async () => {
                    try {
                      const onboarding = await base44.entities.OnboardingStatus.filter({ user_email: user?.email });
                      if (onboarding?.[0]) {
                        await safeUpdate('OnboardingStatus', onboarding[0].id, { 
                          completed: false, 
                          skipped: false,
                          current_step: 0 
                        }, user?.email);
                      }
                      toast.success('Tutorial reset successfully');
                      window.location.href = createPageUrl('Home');
                    } catch (err) {
                      console.error('Error resetting tutorial:', err);
                      toast.error('Failed to reset tutorial');
                    }
                  }}
                >
                  <Sparkles className="w-4 h-4 mr-2" />
                  Restart
                </Button>
              </div>

              <div className="flex items-center justify-between border-t pt-4">
                <div>
                  <h3 className="font-semibold text-stone-800">Sign Out</h3>
                  <p className="text-sm text-stone-600">Log out of your PipeKeeper account</p>
                </div>
                <Button
                  variant="outline"
                  className="border-rose-200 text-rose-600 hover:bg-rose-50"
                  onClick={() => {
                    (async () => {
                      // Signal other tabs to clear cache
                      localStorage.setItem('logout', Date.now().toString());

                      // Clear cached data so logged-out screens don't render with stale state
                      queryClient.removeQueries({
                        predicate: (query) => query.queryKey[0] !== 'current-user'
                      });

                      try {
                        // Prefer awaiting logout if it returns a promise
                        await base44.auth.logout();
                      } catch (e) {
                        console.error('[Logout] error:', e);
                      } finally {
                        // Always land on a safe route in THIS tab
                        window.location.href = '/';
                      }
                    })();
                  }}
                >
                  <LogOut className="w-4 h-4 mr-2" />
                  Logout
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Delete Account */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="mt-6"
        >
          <Card className="bg-white/95 border-rose-200">
            <CardHeader>
              <CardTitle className="text-rose-700">Delete Account</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-stone-600">
                This will permanently remove your PipeKeeper content (pipes, blends, logs, messages, comments).
              </p>
              <Button
                variant="destructive"
                onClick={() => setDeleteOpen(true)}
              >
                Delete My Account
              </Button>
            </CardContent>
          </Card>
        </motion.div>

        {/* Legal Links */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
          className="mt-6"
        >
          <Card className="border-stone-200/60 bg-white/50">
            <CardContent className="p-4">
              <div className="flex flex-wrap items-center justify-center gap-6">
                <a href={createPageUrl('TermsOfService')} className="text-sm text-stone-600 hover:text-stone-900 transition-colors">
                  Terms of Service
                </a>
                <span className="text-stone-300">•</span>
                <a href={createPageUrl('PrivacyPolicy')} className="text-sm text-stone-600 hover:text-stone-900 transition-colors">
                  Privacy Policy
                </a>
              </div>
            </CardContent>
          </Card>
        </motion.div>
        </div>

        <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm account deletion</AlertDialogTitle>
            <AlertDialogDescription>
              Type <strong>DELETE</strong> to confirm. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <Input value={deleteConfirm} onChange={(e) => setDeleteConfirm(e.target.value)} placeholder="Type DELETE" />
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={deleteConfirm !== 'DELETE'}
              className="bg-rose-600 hover:bg-rose-700"
              onClick={handleDeleteAccount}
            >
              Permanently Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
        </AlertDialog>

        <AlertDialog open={deleteAIOpen} onOpenChange={setDeleteAIOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete AI History</AlertDialogTitle>
            <AlertDialogDescription>
              This will delete all old AI-generated versions (pairings, optimizations, schedules). Current active versions will be kept. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-blue-600 hover:bg-blue-700"
              onClick={async () => {
                try {
                  const pairings = await base44.entities.PairingMatrix.filter({ created_by: user?.email });
                  for (const p of pairings) {
                    if (!p.is_active) await base44.entities.PairingMatrix.delete(p.id);
                  }

                  const opts = await base44.entities.CollectionOptimization.filter({ created_by: user?.email });
                  for (const o of opts) {
                    if (!o.is_active) await base44.entities.CollectionOptimization.delete(o.id);
                  }

                  const pipes = await base44.entities.Pipe.filter({ created_by: user?.email });
                  for (const pipe of pipes) {
                    if (pipe.break_in_schedule_history?.length > 0) {
                      await safeUpdate('Pipe', pipe.id, { break_in_schedule_history: [] }, user?.email);
                    }
                  }

                  queryClient.invalidateQueries();
                  setDeleteAIOpen(false);
                  toast.success('AI history cleared successfully');
                } catch (err) {
                  toast.error('Error: ' + err.message);
                }
              }}
            >
              Delete History
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
        </AlertDialog>
        </div>
        );
        }