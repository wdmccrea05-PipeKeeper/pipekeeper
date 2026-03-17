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

import { User, Crown, ArrowRight, LogOut, Upload, Pencil, Share2, GlassWater, Layers } from "lucide-react";
import AvatarCropper from "@/components/pipes/AvatarCropper";
import WhiskeyPreferencesSection from "@/components/profile/WhiskeyPreferencesSection";
import ModuleVisibilitySettings from "@/components/profile/ModuleVisibilitySettings";

import { useTranslation } from "@/components/i18n/safeTranslation";
import { createPageUrl } from "@/components/utils/createPageUrl";
import SubscriptionBackupModeModal from "@/components/subscription/SubscriptionBackupModeModal";
import { shouldShowPurchaseUI, getSubscriptionManagementMessage, isIOSCompanion } from "@/components/utils/companion";
import { getEntitlementTier, hasPaidAccess, hasProAccess, isTrialingAccess, getPlanLabel } from "@/components/utils/premiumAccess";
import { PK_THEME } from "@/components/utils/pkTheme";

import { useCurrentUser } from "@/components/hooks/useCurrentUser";
import { resolveSubscriptionProvider } from "@/components/utils/subscriptionProvider";

const normEmail = (email) => String(email || "").trim().toLowerCase();

// TODO: Move BLEND_TYPES and PIPE_SHAPES to the translation system so labels are translatable.
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

function consolidateProfiles(rows = []) {
  if (!Array.isArray(rows) || rows.length === 0) {
    return { masterId: null, merged: null };
  }

  const sorted = [...rows].sort((a, b) => {
    const ad = Date.parse(a?.updated_date ?? a?.updated_at ?? a?.updatedAt ?? a?.created_date ?? a?.created_at ?? "") || 0;
    const bd = Date.parse(b?.updated_date ?? b?.updated_at ?? b?.updatedAt ?? b?.created_date ?? b?.created_at ?? "") || 0;
    return bd - ad;
  });

  const master = sorted[0];

  const pick = (...values) => values.find((v) => v !== undefined && v !== null && v !== "");
  const pickBool = (...values) => values.find((v) => typeof v === "boolean");
  const pickArray = (...values) => values.find((v) => Array.isArray(v));

  const merged = sorted.reduce((acc, row) => ({
    ...acc,
    display_name: pick(acc.display_name, row.display_name),
    bio: pick(acc.bio, row.bio),
    avatar_url: pick(acc.avatar_url, row.avatar_url),
    city: pick(acc.city, row.city),
    state_province: pick(acc.state_province, row.state_province),
    country: pick(acc.country, row.country),
    postal_code: pick(acc.postal_code, row.postal_code),
    show_location: pickBool(acc.show_location, row.show_location),
    is_public: pickBool(acc.is_public, row.is_public),
    allow_comments: pickBool(acc.allow_comments, row.allow_comments),
    enable_messaging: pickBool(acc.enable_messaging, row.enable_messaging),
    allow_web_lookups: pickBool(acc.allow_web_lookups, row.allow_web_lookups),
    privacy_hide_values: pickBool(acc.privacy_hide_values, row.privacy_hide_values),
    privacy_hide_inventory: pickBool(acc.privacy_hide_inventory, row.privacy_hide_inventory),
    privacy_hide_collection_counts: pickBool(acc.privacy_hide_collection_counts, row.privacy_hide_collection_counts),
    home_hide_collection_values: pickBool(acc.home_hide_collection_values, row.home_hide_collection_values),
    show_social_media: pickBool(acc.show_social_media, row.show_social_media),
    clenching_preference: pick(acc.clenching_preference, row.clenching_preference),
    smoke_duration_preference: pick(acc.smoke_duration_preference, row.smoke_duration_preference),
    preferred_blend_types: pickArray(acc.preferred_blend_types, row.preferred_blend_types),
    pipe_size_preference: pick(acc.pipe_size_preference, row.pipe_size_preference),
    preferred_shapes: pickArray(acc.preferred_shapes, row.preferred_shapes),
    strength_preference: pick(acc.strength_preference, row.strength_preference),
    notes: pick(acc.notes, row.notes),
    whiskey_notes: pick(acc.whiskey_notes, row.whiskey_notes),
    wine_notes: pick(acc.wine_notes, row.wine_notes),
    cigar_notes: pick(acc.cigar_notes, row.cigar_notes),
    whiskey_preferences: acc.whiskey_preferences || row.whiskey_preferences || null,
    pipekeeper_enabled: pickBool(acc.pipekeeper_enabled, row.pipekeeper_enabled),
    whiskeykeeper_enabled: pickBool(acc.whiskeykeeper_enabled, row.whiskeykeeper_enabled),
    winekeeper_enabled: pickBool(acc.winekeeper_enabled, row.winekeeper_enabled),
    cigarkeeper_enabled: pickBool(acc.cigarkeeper_enabled, row.cigarkeeper_enabled),
    module_preferences_set: pickBool(acc.module_preferences_set, row.module_preferences_set),
  }), {});

  return { masterId: master?.id || null, merged };
}

export default function ProfilePage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { user, provider, subscription, isLoading: userLoading, tier, planLabel, hasPaid, hasPro, isTrial } = useCurrentUser();

  const email = useMemo(() => normEmail(user?.email), [user?.email]);
  const userId = user?.id || null;

  const { data: profileBundle, isLoading: profileLoading } = useQuery({
    queryKey: ["user-profile", userId, email],
    queryFn: async () => {
      if (!userId && !email) return { masterId: null, merged: null };

      let records = [];

      if (userId) {
        try {
          const byUserId = await base44.entities.UserProfile.filter({ user_id: userId });
          records = [...records, ...byUserId];
        } catch (e) {
          console.warn("[Profile] Could not load UserProfile by user_id:", e);
        }
      }

      if (email) {
        try {
          const byEmail = await base44.entities.UserProfile.filter({ user_email: email });
          records = [...records, ...byEmail];
        } catch (e) {
          console.warn("[Profile] Could not load UserProfile by email:", e);
        }

        try {
          const byCreated = await base44.entities.UserProfile.filter({ created_by: email });
          records = [...records, ...byCreated];
        } catch (e) {
          console.warn("[Profile] Could not load UserProfile by created_by:", e);
        }
      }

      const seen = new Set();
      const uniqueRecords = records.filter((r) => {
        const key = r?.id || `${r?.user_id || ""}|${r?.user_email || ""}|${r?.created_by || ""}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });

      if (import.meta.env.DEV) {
        console.log("[Profile] Found profile rows:", uniqueRecords.map((r) => r?.id || r));
      }

      return consolidateProfiles(uniqueRecords);
    },
    enabled: !!(userId || email),
    staleTime: 30_000,
    gcTime: 60_000,
  });

  const profile = profileBundle?.merged || null;
  const profileId = profileBundle?.masterId || null;

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
  const [cropperImage, setCropperImage] = useState(null);

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
    home_hide_collection_values: false,
    show_social_media: false,
    clenching_preference: "Sometimes",
    smoke_duration_preference: "No Preference",
    preferred_blend_types: [],
    pipe_size_preference: "No Preference",
    preferred_shapes: [],
    strength_preference: "No Preference",
    notes: "",
    whiskey_notes: "",
    wine_notes: "",
    cigar_notes: "",
    whiskey_preferences: {
      types: [],
      flavors: [],
      drinking_style: [],
      cocktails: [],
    },
    pipekeeper_enabled: true,
    whiskeykeeper_enabled: true,
    winekeeper_enabled: false,
    cigarkeeper_enabled: false,
  });



  useEffect(() => {
    if (!profile && !user) return;
    const source = profile || {};

    if (import.meta.env.DEV) {
      console.log("[Profile] Hydrating form from source:", {
        profileId,
        source,
        user,
      });
    }

    setFormData((prev) => ({
      ...prev,
      display_name:
        source.display_name ||
        user?.display_name ||
        user?.full_name ||
        user?.name ||
        "",
      bio: source.bio || user?.bio || "",
      avatar_url: source.avatar_url || user?.avatar_url || "",
      city: source.city || "",
      state_province: source.state_province || "",
      country: source.country || "",
      postal_code: source.postal_code || "",
      show_location: source.show_location ?? false,
      is_public: source.is_public ?? false,
      allow_comments: source.allow_comments !== undefined ? !!source.allow_comments : true,
      enable_messaging: source.enable_messaging ?? false,
      allow_web_lookups: source.allow_web_lookups !== false,
      home_hide_collection_values: source.home_hide_collection_values ?? false,
      privacy_hide_values: source.privacy_hide_values ?? false,
      privacy_hide_inventory: source.privacy_hide_inventory ?? false,
      privacy_hide_collection_counts: source.privacy_hide_collection_counts ?? false,
      show_social_media: source.show_social_media ?? false,
      clenching_preference: source.clenching_preference || "Sometimes",
      smoke_duration_preference: source.smoke_duration_preference || "No Preference",
      preferred_blend_types: Array.isArray(source.preferred_blend_types) ? source.preferred_blend_types : [],
      pipe_size_preference: source.pipe_size_preference || "No Preference",
      preferred_shapes: Array.isArray(source.preferred_shapes) ? source.preferred_shapes : [],
      strength_preference: source.strength_preference || "No Preference",
      notes: source.notes || "",
      whiskey_notes: source.whiskey_notes || "",
      wine_notes: source.wine_notes || "",
      cigar_notes: source.cigar_notes || "",
      whiskey_preferences: source.whiskey_preferences || { types: [], flavors: [], drinking_style: [], cocktails: [] },
      pipekeeper_enabled: source.pipekeeper_enabled !== false,
      whiskeykeeper_enabled: source.whiskeykeeper_enabled !== false,
      winekeeper_enabled: source.winekeeper_enabled === true,
      cigarkeeper_enabled: source.cigarkeeper_enabled === true,
    }));
  }, [profile, profileId, user]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!userId && !email) throw new Error("Missing identity");

      const payload = {
        ...formData,
        user_id: userId || undefined,
        user_email: email || undefined,
      };

      if (profileId) {
        return safeUpdate("UserProfile", profileId, payload, email);
      }

      return base44.entities.UserProfile.create(payload);
    },
    onSuccess: async (savedData) => {
      console.log("[Profile] Save successful, returned data:", savedData);
      toast.success(t("notifications.saved"));
      await queryClient.invalidateQueries({ queryKey: ["user-profile", userId, email] });
      await queryClient.refetchQueries({ queryKey: ["user-profile", userId, email] });
      await queryClient.invalidateQueries({ queryKey: ["current-user"] });
      await queryClient.invalidateQueries({ queryKey: ["public-profile", email] });
    },
    onError: (err) => {
      console.error("[Profile] save failed:", err);
      toast.error(t("profileExtended.couldNotSave"));
    },
  });

  function handleAvatarFileSelected(e) {
    const file = e?.target?.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    setCropperImage(url);
    e.target.value = "";
  }

  async function handleCropComplete(croppedFile) {
    setCropperImage(null);
    setUploadingAvatar(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file: croppedFile });
      setFormData((p) => ({ ...p, avatar_url: file_url }));
      if (profileId) {
        await safeUpdate("UserProfile", profileId, { avatar_url: file_url }, email);
      } else {
        await base44.entities.UserProfile.create({
          user_id: userId || undefined,
          user_email: email || undefined,
          created_by: email || undefined,
          avatar_url: file_url,
        });
      }
      await queryClient.invalidateQueries({ queryKey: ["user-profile", userId, email] });
      await queryClient.refetchQueries({ queryKey: ["user-profile", userId, email] });
      await queryClient.invalidateQueries({ queryKey: ["public-profile", email] });
      await queryClient.invalidateQueries({ queryKey: ["current-user"] });
      toast.success(t("profile.avatarUploadedSuccessfully"));
    } catch (err) {
      console.error("[Profile] avatar upload error:", err);
      toast.error(t("profile.failedToUploadImage"));
    } finally {
      setUploadingAvatar(false);
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

  const statusLabels = {
    active: t("profileExtended.statusActive"),
    trialing: t("profileExtended.statusTrialing"),
    trial: t("profileExtended.statusTrial"),
    past_due: t("profileExtended.statusPastDue"),
    canceled: t("profileExtended.statusCanceled"),
    incomplete: t("profileExtended.statusIncomplete"),
    unpaid: t("profileExtended.statusUnpaid"),
  };

  return (
    <div className={`min-h-screen ${PK_THEME.pageBg}`}>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">

        {/* Subscription Status / Management */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-start justify-between gap-4 flex-col md:flex-row">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full flex items-center justify-center shrink-0" style={{ background: 'linear-gradient(135deg, rgba(180,140,75,0.3), rgba(140,100,60,0.4))', border: '1px solid rgba(180,140,75,0.4)' }}>
                  <Crown className="w-6 h-6" style={{ color: '#D4A574' }} />
                </div>
                <div>
                  {hasPaid ? (
                    <>
                      <div className="font-semibold" style={{ color: '#F5F1E7' }}>
                        {t("profile.proActive")}
                      </div>
                      <div className="text-sm" style={{ color: 'rgba(224,216,200,0.65)' }}>{t("profile.fullAccess")}</div>
                    </>
                  ) : isTrial ? (
                    <>
                      <div className="font-semibold" style={{ color: '#F5F1E7' }}>{t("profile.freeTrialActive")}</div>
                      <div className="text-sm" style={{ color: 'rgba(224,216,200,0.65)' }}>{t("profile.sevenDaysFree")}</div>
                    </>
                  ) : (
                    <>
                      <div className="font-semibold" style={{ color: '#F5F1E7' }}>{t("profile.freeAccount")}</div>
                      <div className="text-sm" style={{ color: 'rgba(224,216,200,0.55)' }}>{t("profile.limitedFeatures")}</div>
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
                          onClick={async () => {
                            if (provider === "stripe") {
                              try {
                                const response = await base44.functions.invoke('createCustomerPortalSession', {});
                                if (response.data?.url) {
                                  window.location.href = response.data.url;
                                } else {
                                  toast.error(t("profile.manageSubError"));
                                }
                              } catch (e) {
                                console.error("[Profile] portal session error:", e);
                                toast.error(t("profile.manageSubError"));
                              }
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

                    {shouldShowPurchaseUI() && !hasPaid && (
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
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full flex items-center justify-center shrink-0" style={{ background: 'linear-gradient(135deg, rgba(100,70,45,0.4), rgba(80,55,35,0.5))', border: '1px solid rgba(120,90,65,0.45)' }}>
                <User className="w-6 h-6" style={{ color: '#D4A574' }} />
              </div>
              <div className="flex-1">
                <CardTitle className="text-2xl" style={{ color: '#F5F1E7', fontFamily: "'Georgia', serif" }}>{t("profile.smokingProfile")}</CardTitle>
                <CardDescription style={{ color: 'rgba(224,216,200,0.6)' }}>
                  {t("profile.personalizeAIRecommendations")}
                </CardDescription>
              </div>

              <div className="flex gap-2">
                <Button variant="outline" onClick={handleLogout}>
                  <LogOut className="w-4 h-4 mr-2" />
                  {t("profile.logout")}
                </Button>
              </div>
            </div>
          </CardHeader>

          <CardContent className="space-y-6">
            {/* Badges */}
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
              {subscription?.status && typeof subscription.status === 'string' ? (
                <Badge variant="secondary" className="bg-stone-200 text-stone-800 border-stone-300">
                  {statusLabels[subscription.status] || subscription.status}
                </Badge>
              ) : null}
            </div>

            {/* Avatar */}
            <div className="space-y-2">
              <Label className="text-stone-700 font-medium break-words">{t("profileExtended.profilePicture")}</Label>
              <div className="flex items-center gap-4">
                <div className="relative w-20 h-20 rounded-full bg-gradient-to-br from-amber-200 to-amber-300 overflow-hidden flex items-center justify-center group">
                  {formData.avatar_url ? (
                    <img src={formData.avatar_url} alt={t("profileExtended.avatarAlt")} className="w-full h-full object-cover" />
                  ) : (
                    <User className="w-10 h-10 text-amber-700" />
                  )}
                  <label className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 cursor-pointer transition-opacity rounded-full">
                    <input type="file" accept="image/*" onChange={handleAvatarFileSelected} className="hidden" disabled={uploadingAvatar} />
                    <Pencil className="w-5 h-5 text-white" />
                  </label>
                </div>
                <div className="flex items-center gap-2">
                  <label className="inline-flex items-center">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleAvatarFileSelected}
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

            {cropperImage && (
              <AvatarCropper
                image={cropperImage}
                onCropComplete={handleCropComplete}
                onCancel={() => setCropperImage(null)}
                cropShape="round"
              />
            )}

            {/* Basic */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label className="text-stone-700 font-medium break-words">{t("profileExtended.displayName")}</Label>
                <Input
                  value={formData.display_name}
                  onChange={(e) => setFormData((p) => ({ ...p, display_name: e.target.value }))}
                />
              </div>
              <div>
                <Label className="text-stone-700 font-medium break-words">{t("common.email")}</Label>
                <Input value={user?.email || ""} disabled className="bg-stone-50 text-stone-500 cursor-not-allowed" />
              </div>
            </div>

            <div>
              <Label className="text-stone-700 font-medium break-words">{t("profileExtended.bio")}</Label>
              <Textarea
                value={formData.bio}
                onChange={(e) => setFormData((p) => ({ ...p, bio: e.target.value }))}
                rows={4}
              />
            </div>

            {/* Location */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-stone-700 font-medium break-words">{t("profileExtended.location")}</Label>
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
              <Label className="text-stone-700 font-medium break-words">{t("profileExtended.privacy")}</Label>

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
                  <span className="text-sm font-medium text-stone-700">{t("profileExtended.hideHomeValues")}</span>
                  <p className="text-xs text-stone-500 mt-0.5">{t("profileExtended.hideHomeValuesDesc")}</p>
                </div>
                <Switch
                  checked={formData.home_hide_collection_values}
                  onCheckedChange={(v) => setFormData((p) => ({ ...p, home_hide_collection_values: !!v }))}
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
               <Label className="text-stone-700 font-medium break-words">{t("profileExtended.clenchingPreference")}</Label>
               <div className="flex flex-wrap gap-2">
                 {["Yes", "No", "Sometimes"].map((pref) => {
                   const active = formData.clenching_preference === pref;
                   return (
                     <Badge
                       key={pref}
                       onClick={() => setFormData((p) => ({ ...p, clenching_preference: pref }))}
                       className={`cursor-pointer border ${active ? "bg-violet-600 text-white border-violet-600" : "bg-white text-stone-700 border-stone-200"}`}
                     >
                       {pref}
                     </Badge>
                   );
                 })}
               </div>
             </div>

             <div className="space-y-3">
               <Label className="text-stone-700 font-medium break-words">{t("profileExtended.smokeDurationPreference")}</Label>
               <div className="flex flex-wrap gap-2">
                 {["Short (15-30 min)", "Medium (30-60 min)", "Long (60+ min)", "No Preference"].map((pref) => {
                   const active = formData.smoke_duration_preference === pref;
                   return (
                     <Badge
                       key={pref}
                       onClick={() => setFormData((p) => ({ ...p, smoke_duration_preference: pref }))}
                       className={`cursor-pointer border ${active ? "bg-violet-600 text-white border-violet-600" : "bg-white text-stone-700 border-stone-200"}`}
                     >
                       {pref}
                     </Badge>
                   );
                 })}
               </div>
             </div>

             <div className="space-y-3">
               <Label className="text-stone-700 font-medium break-words">{t("profileExtended.pipeSizePreference")}</Label>
               <div className="flex flex-wrap gap-2">
                 {["Small", "Medium", "Large", "Extra Large", "No Preference"].map((pref) => {
                   const active = formData.pipe_size_preference === pref;
                   return (
                     <Badge
                       key={pref}
                       onClick={() => setFormData((p) => ({ ...p, pipe_size_preference: pref }))}
                       className={`cursor-pointer border ${active ? "bg-violet-600 text-white border-violet-600" : "bg-white text-stone-700 border-stone-200"}`}
                     >
                       {pref}
                     </Badge>
                   );
                 })}
               </div>
             </div>

             <div className="space-y-3">
               <Label className="text-stone-700 font-medium break-words">{t("profileExtended.strengthPreference")}</Label>
               <div className="flex flex-wrap gap-2">
                 {["Mild", "Mild-Medium", "Medium", "Medium-Full", "Full", "No Preference"].map((pref) => {
                   const active = formData.strength_preference === pref;
                   return (
                     <Badge
                       key={pref}
                       onClick={() => setFormData((p) => ({ ...p, strength_preference: pref }))}
                       className={`cursor-pointer border ${active ? "bg-violet-600 text-white border-violet-600" : "bg-white text-stone-700 border-stone-200"}`}
                     >
                       {pref}
                     </Badge>
                   );
                 })}
               </div>
             </div>

             <div className="space-y-3">
               <Label className="text-stone-700 font-medium break-words">{t("profileExtended.preferredBlendTypes")}</Label>
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
              <Label className="text-stone-700 font-medium break-words">{t("profileExtended.preferredPipeShapes")}</Label>
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
              <Label className="text-stone-700 font-medium break-words">{t("common.notes")}</Label>
              <Textarea
                value={formData.notes}
                onChange={(e) => setFormData((p) => ({ ...p, notes: e.target.value }))}
                rows={4}
              />
            </div>

            {/* Whiskey Preferences */}
            <div className="pt-2 space-y-3">
              <div className="flex items-center gap-2">
                <GlassWater className="w-4 h-4 text-amber-600" />
                <Label className="text-stone-700 font-semibold text-base">Whiskey Preferences</Label>
              </div>
              <p className="text-xs text-stone-500">
                Used by Curator to personalize pairing recommendations and cross-collection insights.
              </p>
              <WhiskeyPreferencesSection
                preferences={formData.whiskey_preferences}
                onChange={(updated) => setFormData((p) => ({ ...p, whiskey_preferences: updated }))}
              />
            </div>

            {/* Whiskey Notes for AI */}
            <div className="pt-2 space-y-2">
              <div className="flex items-center gap-2">
                <GlassWater className="w-4 h-4 text-amber-500" />
                <Label className="text-stone-700 font-semibold text-base">Whiskey Notes for Recommendations</Label>
              </div>
              <p className="text-xs text-stone-500">
                Add any whiskey preferences, dislikes, pairing notes, collector priorities, or guidance for Curator. For example: "Prefer sweeter bourbons over peated scotch", "Saving rare bottles for special occasions", or "Prefer pairings with Virginia/Perique blends".
              </p>
              <Textarea
                value={formData.whiskey_notes}
                onChange={(e) => setFormData((p) => ({ ...p, whiskey_notes: e.target.value }))}
                rows={4}
                placeholder="e.g. Prefer sweeter bourbons, avoid heavily peated Scotch, saving Pappy for special occasions..."
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

            {/* Save & Share */}
            <div className="flex flex-col md:flex-row gap-3">
              <Button
                onClick={() => saveMutation.mutate()}
                disabled={saveMutation.isPending}
                className="bg-[#A35C5C] hover:bg-[#8C4A4A]"
              >
                {saveMutation.isPending ? t("profileExtended.saving") : t("common.save")}
              </Button>

              <Button
                variant="outline"
                onClick={() => navigate(createPageUrl("CollectionInsightsShare"))}
                className="text-stone-700 border-stone-300 hover:bg-stone-50 hover:text-stone-900"
              >
                <Share2 className="w-4 h-4 mr-2" />
                Share Collection Insights
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

        {/* Module Visibility */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full flex items-center justify-center shrink-0" style={{ background: 'linear-gradient(135deg, rgba(80,60,40,0.4), rgba(60,45,30,0.5))', border: '1px solid rgba(120,90,65,0.35)' }}>
                <Layers className="w-6 h-6" style={{ color: '#D4A574' }} />
              </div>
              <div>
                <CardTitle className="text-xl" style={{ color: '#F5F1E7' }}>Active Modules</CardTitle>
                <CardDescription style={{ color: 'rgba(224,216,200,0.55)' }}>
                  Control which collection modules are visible. Your data is never deleted when a module is hidden.
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <ModuleVisibilitySettings />
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