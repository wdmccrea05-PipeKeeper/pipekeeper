import React, { useState, useEffect, useMemo } from "react";
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
import { toast } from "sonner";
import { useTranslation } from "@/components/i18n/safeTranslation";
import { createPageUrl } from "@/components/utils/createPageUrl";
import { useCurrentUser } from "@/components/hooks/useCurrentUser";
import { hasPremiumAccess } from "@/components/utils/premiumAccess";
import SubscriptionBackupModeModal from "@/components/subscription/SubscriptionBackupModeModal";

const normEmail = (email) => String(email || "").trim().toLowerCase();

export default function ProfilePage() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const { user, subscription, hasPremium, hasPaid, isPro, isLoading: userLoading } = useCurrentUser();
  const emailLower = useMemo(() => normEmail(user?.email), [user?.email]);
  const userId = user?.auth_user_id || user?.id;

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
    social_media: [],
    show_social_media: false,
    clenching_preference: "Sometimes",
    smoke_duration_preference: "No Preference",
    preferred_blend_types: [],
    pipe_size_preference: "No Preference",
    preferred_shapes: [],
    strength_preference: "No Preference",
    notes: ""
  });

  // Load UserProfile with stable identity (user_id first, email fallback)
  const { data: profile, isLoading: profileLoading } = useQuery({
    queryKey: ["user-profile", userId, emailLower],
    enabled: !!(userId || emailLower),
    staleTime: 30_000,
    retry: 1,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    queryFn: async () => {
      try {
        // Prefer user_id if your UserProfile entity supports it
        if (userId) {
          const byId = await base44.entities.UserProfile.filter({ user_id: userId });
          if (Array.isArray(byId) && byId.length) return byId[0];
        }

        // Fallback: normalized email
        if (emailLower) {
          const byEmail = await base44.entities.UserProfile.filter({ user_email: emailLower });
          if (!Array.isArray(byEmail) || !byEmail.length) return null;

          // If duplicates exist, prefer most recently updated/created
          const sorted = [...byEmail].sort((a, b) => {
            const ta = Date.parse(a.updated_date || a.created_date || 0) || 0;
            const tb = Date.parse(b.updated_date || b.created_date || 0) || 0;
            return tb - ta;
          });
          return sorted[0];
        }

        return null;
      } catch (err) {
        console.error("[Profile] UserProfile load error:", err);
        return null;
      }
    }
  });

  useEffect(() => {
    if (!profile) return;
    setFormData((prev) => ({
      ...prev,
      display_name: profile.display_name || "",
      bio: profile.bio || "",
      avatar_url: profile.avatar_url || "",
      city: profile.city || "",
      state_province: profile.state_province || "",
      country: profile.country || "",
      postal_code: profile.postal_code || "",
      show_location: !!profile.show_location,
      is_public: !!profile.is_public,
      allow_comments: profile.allow_comments !== undefined ? !!profile.allow_comments : true,
      enable_messaging: !!profile.enable_messaging,
      allow_web_lookups: profile.allow_web_lookups !== false,
      privacy_hide_values: !!profile.privacy_hide_values,
      privacy_hide_inventory: !!profile.privacy_hide_inventory,
      privacy_hide_collection_counts: !!profile.privacy_hide_collection_counts,
      social_media: Array.isArray(profile.social_media) ? profile.social_media : [],
      show_social_media: !!profile.show_social_media,
      clenching_preference: profile.clenching_preference || "Sometimes",
      smoke_duration_preference: profile.smoke_duration_preference || "No Preference",
      preferred_blend_types: Array.isArray(profile.preferred_blend_types) ? profile.preferred_blend_types : [],
      pipe_size_preference: profile.pipe_size_preference || "No Preference",
      preferred_shapes: Array.isArray(profile.preferred_shapes) ? profile.preferred_shapes : [],
      strength_preference: profile.strength_preference || "No Preference",
      notes: profile.notes || ""
    }));
  }, [profile]);

  const saveMutation = useMutation({
    mutationFn: async (data) => {
      if (!emailLower && !userId) throw new Error("Missing user identity");
      const payload = {
        ...data,
        user_email: emailLower || undefined,
        user_id: userId || undefined
      };

      if (profile?.id) {
        // Use normalized email for ownership check
        return safeUpdate("UserProfile", profile.id, payload, emailLower);
      }

      // Prevent duplicates: if any profile exists by email, update newest
      if (emailLower) {
        const existing = await base44.entities.UserProfile.filter({ user_email: emailLower });
        if (Array.isArray(existing) && existing.length) {
          const sorted = [...existing].sort((a, b) => {
            const ta = Date.parse(a.updated_date || a.created_date || 0) || 0;
            const tb = Date.parse(b.updated_date || b.created_date || 0) || 0;
            return tb - ta;
          });
          return safeUpdate("UserProfile", sorted[0].id, payload, emailLower);
        }
      }

      return base44.entities.UserProfile.create(payload);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["user-profile", userId, emailLower] });
      toast.success(t("notifications.saved"));
    },
    onError: (e) => {
      console.error("[Profile] Save failed:", e);
      toast.error(e?.message || "Save failed");
    }
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    saveMutation.mutate(formData);
  };

  const handleLogout = async () => {
    await base44.auth.logout();
    window.location.assign(createPageUrl("Index"));
  };

  const showBackup = !hasPaid; // if you want: only show direct links when not paid

  return (
    <div className="p-4 max-w-3xl mx-auto">
      <Card>
        <CardHeader>
          <CardTitle>{t("nav.profile")}</CardTitle>
          <CardDescription>
            {userLoading || profileLoading ? "Loading…" : null}
          </CardDescription>

          <div className="flex flex-wrap gap-2 mt-2">
            <Badge variant={hasPaid ? "default" : "secondary"}>
              {hasPaid ? "Paid" : "Free"}
            </Badge>
            <Badge variant={isPro ? "default" : "secondary"}>
              {isPro ? "Pro" : (hasPremium ? "Premium" : "Free")}
            </Badge>
            <Badge variant="secondary">
              {subscription?.provider ? `Provider: ${subscription.provider}` : "Provider: none"}
            </Badge>
          </div>
        </CardHeader>

        <CardContent>
          {showBackup ? <SubscriptionBackupModeModal /> : null}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label>Display name</Label>
              <Input
                value={formData.display_name}
                onChange={(e) => setFormData({ ...formData, display_name: e.target.value })}
              />
            </div>

            <div>
              <Label>Bio</Label>
              <Textarea
                value={formData.bio}
                onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
              />
            </div>

            <div className="flex gap-2">
              <Button type="submit" disabled={saveMutation.isPending}>
                {saveMutation.isPending ? "Saving…" : "Save"}
              </Button>
              <Button type="button" variant="outline" onClick={handleLogout}>
                Logout
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}