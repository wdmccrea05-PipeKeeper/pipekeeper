import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { safeUpdate } from "@/components/utils/safeUpdate";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";

import { User, Crown, ArrowRight, LogOut, Upload, AlertCircle } from "lucide-react";

import { useTranslation } from "@/components/i18n/safeTranslation";
import { createPageUrl } from "@/components/utils/createPageUrl";
import SubscriptionBackupModeModal from "@/components/subscription/SubscriptionBackupModeModal";
import { shouldShowPurchaseUI, getSubscriptionManagementMessage, isIOSCompanion } from "@/components/utils/companion";
import { getEntitlementTier, hasPaidAccess, hasProAccess, isTrialingAccess, getPlanLabel } from "@/components/utils/premiumAccess";
import { isTrialWindow } from "@/components/utils/access";
import { PK_THEME } from "@/components/utils/pkTheme";

// Canonical user/sub state (already in your repo)
import { useCurrentUser } from "@/components/hooks/useCurrentUser";
import { resolveSubscriptionProvider } from "@/components/utils/subscriptionProvider";

const normEmail = (email) => String(email || "").trim().toLowerCase();

const BLEND_TYPES = [
  "Virginia", "Virginia/Perique", "English", "Balkan", "Aromatic",
  "Burley", "Virginia/Burley", "Latakia Blend", "Oriental/Turkish",
  "Navy Flake", "Dark Fired", "Cavendish",
];

const PIPE_SHAPES = [
  "Billiard", "Bulldog", "Dublin", "Apple", "Author", "Bent",
  "Canadian", "Churchwarden", "Freehand", "Lovat", "Poker",
  "Prince", "Rhodesian", "Zulu", "Calabash",
];

function pickBestProfile(rows = []) {
  if (!Array.isArray(rows) || rows.length === 0) return null;
  // Prefer record with tos_accepted_at / display_name / most recently updated/created
  const scored = rows.map((r) => {
    const updated = Date.parse(r.updated_at || r.updatedAt || "") || 0;
    const created = Date.parse(r.created_at || r.createdAt || "") || 0;
    const hasName = r.display_name ? 1 : 0;
    const hasTos = r.tos_accepted_at ? 1 : 0;
    const hasAvatar = r.avatar_url ? 1 : 0;
    const score = hasTos * 10 + hasName * 5 + hasAvatar * 2 + (updated || created) / 1e12;
    return { r, score };
  });
  scored.sort((a, b) => b.score - a.score);
  return scored[0].r;
}

export default function ProfilePage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { user, provider, subscription, isLoading: userLoading, tier, planLabel, hasPaid, hasPro, isTrial } = useCurrentUser();

  const email = useMemo(() => normEmail(user?.email), [user?.email]);
  const userId = user?.auth_user_id || user?.id || null;

  // Load UserProfile separately
  const { data: profile, isLoading: profileLoading } = useQuery({
    queryKey: ["user-profile", userId, email],
    queryFn: async () => {
      if (!userId && !email) return null;
      try {
        const records = await base44.entities.UserProfile.filter({
          user_email: email,
        });
        return pickBestProfile(records) || null;
      } catch (e) {
        console.warn("[Profile] Could not load UserProfile:", e);
        return null;
      }
    },
    enabled: !!(userId || email),
    staleTime: 30_000,
  });

  // Sanity check: detect provider conflicts (dev/admin only)
  useEffect(() => {
    if (!profile || !import.meta.env.DEV) return;

    const hasStripe = !!(profile.stripe_customer_id || profile.stripeCustomerId);
    const hasApple = !!(profile.apple_original_transaction_id || profile.appleOriginalTransactionId);

    if (hasStripe && hasApple && provider !== "stripe") {
      console.warn(
        "[Profile] Provider conflict: Both Stripe and Apple IDs exist but provider resolved to:",
        provider
      );
    }

    if (hasStripe && provider !== "stripe") {
      console.error(
        "[Profile] CRITICAL: stripe_customer_id exists but provider is not 'stripe'",
        { provider, profile_id: profile.id }
      );
    }
  }, [profile, provider]);

  const [showBackupModal, setShowBackupModal] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

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
    show_social_media: false,
    clenching_preference: "Sometimes",
    smoke_duration_preference: "No Preference",
    preferred_blend_types: [],
    pipe_size_preference: "No Preference",
    preferred_shapes: [],
    strength_preference: "No Preference",
    notes: "",
  });

  // Use canonical access flags
  const hasActiveSubscription = hasPaid;
  const isWithinTrial = isTrial;

  // Hydrate form from profile
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
      show_social_media: !!profile.show_social_media,
      clenching_preference: profile.clenching_preference || "Sometimes",
      smoke_duration_preference: profile.smoke_duration_preference || "No Preference",
      preferred_blend_types: Array.isArray(profile.preferred_blend_types) ? profile.preferred_blend_types : [],
      pipe_size_preference: profile.pipe_size_preference || "No Preference",
      preferred_shapes: Array.isArray(profile.preferred_shapes) ? profile.preferred_shapes : [],
      strength_preference: profile.strength_preference || "No Preference",
      notes: profile.notes || "",
    }));
  }, [profile]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!userId && !email) throw new Error("Missing identity");

      const payload = {
        ...formData,
        user_id: userId || undefined,
        user_email: email || undefined, // ALWAYS normalized
      };

      if (profile?.id) {
        return safeUpdate("UserProfile", profile.id, payload, email);
      }

      return base44.entities.UserProfile.create(payload);
    },
    onSuccess: async () => {
      toast.success(t("notifications.saved"));
      await queryClient.invalidateQueries({ queryKey: ["user-profile", userId, email] });
      await queryClient.invalidateQueries({ queryKey: ["current-user"] });
    },
    onError: (err) => {
      console.error("[Profile] save failed:", err);
      toast.error(t("profileExtended.couldNotSave"));
    },
  });

  async function handleAvatarUpload(e) {
    const file = e?.target?.files?.[0];
    if (!file) return;

    setUploadingAvatar(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setFormData((p) => ({ ...p, avatar_url: file_url }));
      toast.success(t("profile.avatarUploadedSuccessfully"));
    } catch (err) {
      console.error("[Profile] avatar upload error:", err);
      toast.error(t("profile.failedToUploadImage"));
    } finally {
      setUploadingAvatar(false);
      e.target.value = "";
    }
  }

  function toggleBlendType(type) {
    setFormData((p) => {
      const has = p.preferred_blend_types.includes(type);
      return {
        ...p,
        preferred_blend_types: has
          ? p.preferred_blend_types.filter((x) => x !== type)
          : [...p.preferred_blend_types, type],
      };
    });
  }

  function toggleShape(shape) {
    setFormData((p) => {
      const has = p.preferred_shapes.includes(shape);
      return {
        ...p,
        preferred_shapes: has
          ? p.preferred_shapes.filter((x) => x !== shape)
          : [...p.preferred_shapes, shape],
      };
    });
  }

  async function handleLogout() {
    try {
      await base44.auth.logout();
    } finally {
      window.location.href = "/";
    }
  }

  if (userLoading || profileLoading) {
    return (
      <div className={`min-h-screen ${PK_THEME.pageBg} flex items-center justify-center`}>
        <div className="text-center">
          <div className="text-4xl mb-4">⚙️</div>
          <p className={PK_THEME.textMuted}>{t("common.loading")}</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${PK_THEME.pageBg}`}>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">

        {/* Subscription Status / Management */}
        <Card className="border-amber-200 bg-gradient-to-br from-amber-50 to-white">
          <CardContent className="p-6">
            <div className="flex items-start justify-between gap-4 flex-col md:flex-row">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-amber-500 to-amber-600 flex items-center justify-center">
                  <Crown className="w-6 h-6 text-white" />
                </div>
                <div>
                  {hasPaid ? (
                    <>
                      <div className="font-semibold text-amber-900">
                        {hasPro ? t("profile.proActive") : t("profile.premiumActive")}
                      </div>
                      <div className="text-sm text-amber-700">{t("profile.fullAccess")}</div>
                    </>
                  ) : isTrial ? (
                    <>
                      <div className="font-semibold text-amber-900">{t("profile.freeTrialActive")}</div>
                      <div className="text-sm text-amber-700">{t("profile.sevenDaysFree")}</div>
                    </>
                  ) : (
                    <>
                      <div className="font-semibold text-stone-800">{t("profile.freeAccount")}</div>
                      <div className="text-sm text-stone-600">{t("profile.limitedFeatures")}</div>
                    </>
                  )}
                </div>
              </div>

              <div className="w-full md:w-auto flex flex-col gap-2">
                {!isIOSCompanion() ? (
                  <>
                    {subscription?.status === "active" || subscription?.status === "trialing" ? (
                        <Button
                          className="bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-700 hover:to-amber-800"
                          onClick={() => {
                            if (provider === "stripe") {
                              window.location.href = "https://billing.stripe.com/p/login/28EbJ1f03b5B2Krabvgbm00";
                            } else if (provider === "apple") {
                              window.location.href = "https://apps.apple.com/account/subscriptions";
                            } else {
                              navigate(createPageUrl("Subscription"));
                            }
                          }}
                        >
                          {t("profile.manageSubscription")}
                          <ArrowRight className="w-4 h-4 ml-2" />
                        </Button>
                      ) : null}

                    {shouldShowPurchaseUI() && !hasActiveSubscription && (
                      <Button
                        onClick={() => navigate(createPageUrl("Subscription"))}
                        className="bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-700 hover:to-amber-800"
                      >
                        {t("profile.upgrade")}
                        <ArrowRight className="w-4 h-4 ml-2" />
                      </Button>
                    )}

                    {!shouldShowPurchaseUI() && (
                       <div className="text-xs text-amber-800/80 text-right max-w-[260px]">
                         {getSubscriptionManagementMessage()}
                       </div>
                     )}
                  </>
                ) : (
                  <div className="text-sm text-amber-800/80 bg-amber-50 p-3 rounded-lg">
                    {t("profile.premiumSubscriptionWebOnly")}{" "}
                    <a className="underline font-medium" href="https://pipekeeper.app/Subscription" target="_blank" rel="noreferrer">
                      pipekeeper.app
                    </a>
                    .
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Profile */}
        <Card className="border-violet-200 bg-gradient-to-br from-violet-50 to-white">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-violet-500 to-violet-600 flex items-center justify-center">
                <User className="w-6 h-6 text-white" />
              </div>
              <div className="flex-1">
                <CardTitle className="text-2xl text-violet-900">{t("profile.smokingProfile")}</CardTitle>
                <CardDescription className="text-stone-700">
                  {t("profile.personalizeAIRecommendations")}
                </CardDescription>
              </div>

              <div className="flex gap-2">
                <Button variant="outline" onClick={handleLogout} className="text-stone-700 hover:text-stone-900">
                  <LogOut className="w-4 h-4 mr-2" />
                  {t("profile.logout")}
                </Button>
              </div>
            </div>
          </CardHeader>

          <CardContent className="space-y-6">
            {/* Badges (kept visible) */}
            <div className="flex gap-2 flex-wrap">
              <Badge className={hasPro ? "bg-purple-600 text-white border-0" : "bg-[#A35C5C] text-white border-0"}>
                {planLabel.toUpperCase()}
              </Badge>
              {provider === "stripe" && (
                <Badge variant="secondary" className="bg-stone-200 text-stone-800 border-stone-300">{t("profileExtended.providerStripe")}</Badge>
              )}
              {provider === "apple" && (
                <Badge variant="secondary" className="bg-stone-200 text-stone-800 border-stone-300">{t("profileExtended.providerApple")}</Badge>
              )}
              {subscription?.status ? (
                <Badge variant="secondary" className="bg-stone-200 text-stone-800 border-stone-300">{t("profileExtended.statusLabel")}: {subscription.status}</Badge>
              ) : null}
            </div>

            {/* Avatar */}
            <div className="space-y-2">
              <Label className="text-stone-700 font-medium">{t("profileExtended.profilePicture")}</Label>
              <div className="flex items-center gap-4">
                <div className="w-20 h-20 rounded-full bg-gradient-to-br from-amber-200 to-amber-300 overflow-hidden flex items-center justify-center">
                  {formData.avatar_url ? (
                    <img src={formData.avatar_url} alt={t("profileExtended.avatarAlt")} className="w-full h-full object-cover" />
                  ) : (
                    <User className="w-10 h-10 text-amber-700" />
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <label className="inline-flex items-center">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleAvatarUpload}
                      className="hidden"
                      disabled={uploadingAvatar}
                    />
                    <Button type="button" variant="outline" disabled={uploadingAvatar} className="text-stone-700 hover:text-stone-900">
                      <Upload className="w-4 h-4 mr-2" />
                      {uploadingAvatar ? t("profileExtended.uploading") : t("common.upload")}
                    </Button>
                  </label>
                </div>
              </div>
            </div>

            {/* Basic */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label className="text-stone-700 font-medium">{t("profileExtended.displayName")}</Label>
                <Input
                  value={formData.display_name}
                  onChange={(e) => setFormData((p) => ({ ...p, display_name: e.target.value }))}
                />
              </div>
              <div>
                <Label className="text-stone-700 font-medium">{t("common.email")}</Label>
                <Input value={user?.email || ""} disabled className="bg-stone-50 text-stone-500 cursor-not-allowed" />
              </div>
            </div>

            <div>
              <Label className="text-stone-700 font-medium">{t("profileExtended.bio")}</Label>
              <Textarea
                value={formData.bio}
                onChange={(e) => setFormData((p) => ({ ...p, bio: e.target.value }))}
                rows={4}
              />
            </div>

            {/* Location */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-stone-700 font-medium">{t("profileExtended.location")}</Label>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-stone-600">{t("profileExtended.showOnProfile")}</span>
                  <Switch
                    checked={formData.show_location}
                    onCheckedChange={(v) => setFormData((p) => ({ ...p, show_location: !!v }))}
                    className="data-[state=checked]:bg-[#A35C5C]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  placeholder={t("profileExtended.cityPlaceholder")}
                  value={formData.city}
                  onChange={(e) => setFormData((p) => ({ ...p, city: e.target.value }))}
                />
                <Input
                  placeholder={t("profileExtended.stateProvincePlaceholder")}
                  value={formData.state_province}
                  onChange={(e) => setFormData((p) => ({ ...p, state_province: e.target.value }))}
                />
                <Input
                  placeholder={t("profileExtended.countryPlaceholder")}
                  value={formData.country}
                  onChange={(e) => setFormData((p) => ({ ...p, country: e.target.value }))}
                />
                <Input
                  placeholder={t("profileExtended.postalCodePlaceholder")}
                  value={formData.postal_code}
                  onChange={(e) => setFormData((p) => ({ ...p, postal_code: e.target.value }))}
                />
              </div>
            </div>

            {/* Privacy */}
            <div className="space-y-3">
              <Label className="text-stone-700 font-medium">{t("profileExtended.privacy")}</Label>

              <div className="flex items-center justify-between">
                <span className="text-sm text-stone-700">{t("profileExtended.hideValues")}</span>
                <Switch
                  checked={formData.privacy_hide_values}
                  onCheckedChange={(v) => setFormData((p) => ({ ...p, privacy_hide_values: !!v }))}
                  className="data-[state=checked]:bg-[#A35C5C]"
                />
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm text-stone-700">{t("profileExtended.hideInventory")}</span>
                <Switch
                  checked={formData.privacy_hide_inventory}
                  onCheckedChange={(v) => setFormData((p) => ({ ...p, privacy_hide_inventory: !!v }))}
                  className="data-[state=checked]:bg-[#A35C5C]"
                />
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm text-stone-700">{t("profileExtended.hideCollectionCounts")}</span>
                <Switch
                  checked={formData.privacy_hide_collection_counts}
                  onCheckedChange={(v) => setFormData((p) => ({ ...p, privacy_hide_collection_counts: !!v }))}
                  className="data-[state=checked]:bg-[#A35C5C]"
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium text-stone-700">{t("profile.enableMessaging")}</div>
                  <div className="text-xs text-stone-600">{t("profile.enableMessagingDesc")}</div>
                </div>
                <Switch
                  checked={formData.enable_messaging}
                  onCheckedChange={(v) => setFormData((p) => ({ ...p, enable_messaging: !!v }))}
                  className="data-[state=checked]:bg-[#A35C5C]"
                />
              </div>
            </div>

            {/* Preferences */}
            <div className="space-y-3">
              <Label className="text-stone-700 font-medium">{t("profileExtended.preferredBlendTypes")}</Label>
              <div className="flex flex-wrap gap-2">
                {BLEND_TYPES.map((bt) => {
                  const active = formData.preferred_blend_types.includes(bt);
                  return (
                    <Badge
                      key={bt}
                      onClick={() => toggleBlendType(bt)}
                      className={`cursor-pointer border ${active ? "bg-violet-600 text-white border-violet-600" : "bg-white text-stone-700 border-stone-200"}`}
                    >
                      {bt}
                    </Badge>
                  );
                })}
              </div>
            </div>

            <div className="space-y-3">
              <Label className="text-stone-700 font-medium">{t("profileExtended.preferredPipeShapes")}</Label>
              <div className="flex flex-wrap gap-2">
                {PIPE_SHAPES.map((sh) => {
                  const active = formData.preferred_shapes.includes(sh);
                  return (
                    <Badge
                      key={sh}
                      onClick={() => toggleShape(sh)}
                      className={`cursor-pointer border ${active ? "bg-violet-600 text-white border-violet-600" : "bg-white text-stone-700 border-stone-200"}`}
                    >
                      {sh}
                    </Badge>
                  );
                })}
              </div>
            </div>

            <div>
              <Label className="text-stone-700 font-medium">{t("common.notes")}</Label>
              <Textarea
                value={formData.notes}
                onChange={(e) => setFormData((p) => ({ ...p, notes: e.target.value }))}
                rows={4}
              />
            </div>

            {/* Public profile toggle */}
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium text-stone-800">{t("profileExtended.publicCommunityProfile")}</div>
                <div className="text-sm text-stone-600">{t("profileExtended.allowOthersToView")}</div>
              </div>
              <Switch
                checked={formData.is_public}
                onCheckedChange={(v) => setFormData((p) => ({ ...p, is_public: !!v }))}
                className="data-[state=checked]:bg-[#A35C5C]"
              />
            </div>

            {/* Save */}
            <div className="flex flex-col md:flex-row gap-3">
              <Button
                onClick={() => saveMutation.mutate()}
                disabled={saveMutation.isPending}
                className="bg-[#A35C5C] hover:bg-[#8C4A4A]"
              >
                {saveMutation.isPending ? t("profileExtended.saving") : t("common.save")}
              </Button>

              {user?.email ? (
                <Button
                  variant="outline"
                  onClick={async () => {
                    try {
                      await saveMutation.mutateAsync();
                      navigate(createPageUrl(`PublicProfile?email=${encodeURIComponent(user.email)}&preview=true`));
                    } catch {}
                  }}
                  className="text-stone-700 border-stone-300 hover:bg-stone-50 hover:text-stone-900"
                >
                  {t("profileExtended.previewPublicProfile")}
                </Button>
              ) : null}
            </div>
          </CardContent>
        </Card>

        <SubscriptionBackupModeModal
          isOpen={showBackupModal}
          onClose={() => setShowBackupModal(false)}
        />
      </div>
    </div>
  );
}