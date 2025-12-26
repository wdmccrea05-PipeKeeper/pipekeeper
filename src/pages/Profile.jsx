import React, { useState, useEffect } from 'react';
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { User, Save, X, Sparkles, Crown, ArrowRight, LogOut, Upload, Eye, Camera } from "lucide-react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import AvatarCropper from "@/components/pipes/AvatarCropper";

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
  const [formData, setFormData] = useState({
    display_name: "",
    bio: "",
    avatar_url: "",
    is_public: false,
    allow_comments: true,
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

  const { data: user } = useQuery({
    queryKey: ['current-user'],
    queryFn: () => base44.auth.me(),
  });

  // Check if user has paid access (subscription or 7-day trial)
  const trialEndDate = user?.created_date 
    ? new Date(new Date(user.created_date).getTime() + 7 * 24 * 60 * 60 * 1000)
    : null;
  const isInTrial = trialEndDate && new Date() < trialEndDate;
  const daysLeftInTrial = isInTrial 
    ? Math.ceil((trialEndDate - new Date()) / (1000 * 60 * 60 * 24))
    : 0;
  const hasActiveSubscription = user?.subscription_level === 'paid';

  const { data: profile, isLoading } = useQuery({
    queryKey: ['user-profile', user?.email],
    queryFn: async () => {
      const profiles = await base44.entities.UserProfile.filter({ user_email: user?.email });
      return profiles[0];
    },
    enabled: !!user?.email,
  });

  useEffect(() => {
    if (profile) {
      setFormData({
        display_name: profile.display_name || "",
        bio: profile.bio || "",
        avatar_url: profile.avatar_url || "",
        is_public: profile.is_public || false,
        allow_comments: profile.allow_comments !== undefined ? profile.allow_comments : true,
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
        return base44.entities.UserProfile.update(profile.id, profileData);
      } else {
        return base44.entities.UserProfile.create(profileData);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-profile', user?.email] });
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    saveMutation.mutate(formData);
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
    } catch (err) {
      console.error('Error uploading avatar:', err);
      alert('Failed to upload image. Please try again.');
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
                    ) : isInTrial ? (
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
                <Link to={createPageUrl('Subscription')}>
                  <Button className="bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-700 hover:to-amber-800">
                    {hasActiveSubscription ? 'Manage' : 'Upgrade'}
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </Link>
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
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-violet-800 flex items-center gap-2">
                      <User className="w-4 h-4" />
                      Community Profile
                    </h3>
                    {user?.email && (
                      <Link to={createPageUrl(`PublicProfile?email=${user.email}&preview=true`)}>
                        <Button variant="outline" size="sm" className="border-violet-300 text-violet-700">
                          <Eye className="w-4 h-4 mr-2" />
                          Preview Profile
                        </Button>
                      </Link>
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

        {/* Logout Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mt-6"
        >
          <Card className="border-rose-200 bg-white">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-stone-800">Sign Out</h3>
                  <p className="text-sm text-stone-600">Log out of your PipeKeeper account</p>
                </div>
                <Button
                  variant="outline"
                  className="border-rose-200 text-rose-600 hover:bg-rose-50"
                  onClick={() => base44.auth.logout()}
                >
                  <LogOut className="w-4 h-4 mr-2" />
                  Logout
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Legal Links */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="mt-6"
        >
          <Card className="border-stone-200/60 bg-white/50">
            <CardContent className="p-4">
              <div className="flex flex-wrap items-center justify-center gap-6">
                <Link to={createPageUrl('TermsOfService')} className="text-sm text-stone-600 hover:text-stone-900 transition-colors">
                  Terms of Service
                </Link>
                <span className="text-stone-300">•</span>
                <Link to={createPageUrl('PrivacyPolicy')} className="text-sm text-stone-600 hover:text-stone-900 transition-colors">
                  Privacy Policy
                </Link>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}