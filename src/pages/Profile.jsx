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
import { User, Save, X, Sparkles } from "lucide-react";
import { motion } from "framer-motion";

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
    clenching_preference: "Sometimes",
    smoke_duration_preference: "No Preference",
    preferred_blend_types: [],
    pipe_size_preference: "No Preference",
    preferred_shapes: [],
    strength_preference: "No Preference",
    notes: ""
  });

  const { data: user } = useQuery({
    queryKey: ['current-user'],
    queryFn: () => base44.auth.me(),
  });

  const { data: profile, isLoading } = useQuery({
    queryKey: ['user-profile'],
    queryFn: async () => {
      const profiles = await base44.entities.UserProfile.filter({ user_email: user.email });
      return profiles[0];
    },
    enabled: !!user,
  });

  useEffect(() => {
    if (profile) {
      setFormData({
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
      const profileData = { ...data, user_email: user.email };
      if (profile) {
        return base44.entities.UserProfile.update(profile.id, profileData);
      } else {
        return base44.entities.UserProfile.create(profileData);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-profile'] });
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    saveMutation.mutate(formData);
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
      <div className="min-h-screen bg-gradient-to-br from-stone-50 via-amber-50/30 to-stone-100 flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl mb-4">⚙️</div>
          <p className="text-stone-600">Loading profile...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-stone-50 via-amber-50/30 to-stone-100">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
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
      </div>
    </div>
  );
}