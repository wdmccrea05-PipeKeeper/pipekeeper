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

import { User, Crown, ArrowRight, LogOut, Upload, Pencil } from "lucide-react";
import AvatarCropper from "@/components/pipes/AvatarCropper";

import { useTranslation } from "@/components/i18n/safeTranslation";
import { createPageUrl } from "@/components/utils/createPageUrl";
import SubscriptionBackupModeModal from "@/components/subscription/SubscriptionBackupModeModal";
import { shouldShowPurchaseUI, getSubscriptionManagementMessage, isIOSCompanion } from "@/components/utils/companion";
import { getEntitlementTier, hasPaidAccess, hasProAccess, isTrialingAccess, getPlanLabel } from "@/components/utils/premiumAccess";
import { isTrialWindow } from "@/components/utils/access";
import { PK_THEME } from "@/components/utils/pkTheme";
import { AlertCircle } from "lucide-react";

import { useCurrentUser } from "@/components/hooks/useCurrentUser";
import { resolveSubscriptionProvider } from "@/components/utils/subscriptionProvider";
import { getGraceStatus, getSubscriptionStatusMessage } from "@/components/utils/gracePeriod";

const normEmail = (email) => String(email || "").trim().toLowerCase();

// Stored enum values — raw English values are kept for database compatibility.
// Display labels are resolved through the translation system.
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
  if (!Array.isArray(rows) || rows.length === 0) return null;

  // Sort by newest first (updated_date > updated_at > updatedAt > created_at > created_date)
  const sorted = [...rows].sort((a, b) => {
    const getTimestamp = (r) => {
      const ts = Date.parse(r.updated_date ?? r.updated_at ?? r.updatedAt ?? r.created_at ?? r.created_date ?? "");
      return ts || 0;
    };
    return getTimestamp(b) - getTimestamp(a);
  });

  const master = sorted[0];
  const merged = { ...master };

  // Merge fields field-by-field, taking first non-empty value from newest → oldest
  const fieldsToPrioritize = [
    'display_name', 'bio', 'avatar_url', 'city', 'state_province', 'country', 'postal_code',
    'clenching_preference', 'smoke_duration_preference', 'pipe_size_preference', 'strength_preference', 'notes'
  ];

  for (const field of fieldsToPrioritize) {
    for (const row of sorted) {
      const val = row[field];
      if (val !== null && val !== undefined && val !== '') {
        merged[field] = val;
        break;
      }
    }
  }

  // Handle booleans correctly (false is valid)
  const boolFields = [
    'show_location', 'is_public', 'allow_comments', 'enable_messaging', 'allow_web_lookups',
    'privacy_hide_values', 'privacy_hide_inventory', 'privacy_hide_collection_counts', 'home_hide_collection_values',
    'show_social_media'
  ];

  for (const field of boolFields) {
    let hasSet = false;
    for (const row of sorted) {
      if (row[field] !== null && row[field] !== undefined) {
        merged[field] = !!row[field];
        hasSet = true;
        break;
      }
    }
    if (!hasSet) merged[field] = false;
  }

  // Handle arrays (preferred_blend_types, preferred_shapes)
  const arrayFields = ['preferred_blend_types', 'preferred_shapes'];
  for (const field of arrayFields) {
    for (const row of sorted) {
      if (Array.isArray(row[field]) && row[field].length > 0) {
        merged[field] = row[field];
        break;
      }
    }
    if (!Array.isArray(merged[field])) merged[field] = [];
  }

  return {
    masterId: master.id,
    merged
  };
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
      if (!userId && !email) return null;
      try {
        let records = [];
        
        // Query by user_id if available
        if (userId) {
          try {
            const byUserId = await base44.entities.UserProfile.filter({ user_id: userId });
            records = [...records, ...byUserId];
          } catch {
            // Ignore error, try email next
          }
        }
        
        // Query by user_email if available
        if (email) {
          try {
            const byEmail = await base44.entities.UserProfile.filter({ user_email: email });
            records = [...records, ...byEmail];
          } catch {
            // Ignore error
          }
        }

        // De-duplicate by id
        const seen = new Set();
        const uniqueRecords = records.filter((r) => {
          if (seen.has(r.id)) return false;
          seen.add(r.id);
          return true;
        });

        // Dev logging for duplicates
        if (import.meta.env.DEV && uniqueRecords.length > 1) {
          console.warn("[Profile] Multiple UserProfile rows detected", uniqueRecords.map(r => r.id));
        }

        return consolidateProfiles(uniqueRecords) || null;
      } catch (e) {
        console.warn("[Profile] Could not load UserProfile:", e);
        return null;
      }
    },
    enabled: !!(userId || email),
    staleTime: 30_000,
    gcTime: 60_000,
  });

  // Derive profile and profileId from bundle
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
  });

  const hasActiveSubscription = hasPaid;
  const isWithinTrial = isTrial;

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
      home_hide_collection_values: !!profile.home_hide_collection_values,
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
        user_email: email || undefined,
      };

      if (profileId) {
        return safeUpdate("UserProfile", profileId, payload, email);
      }

      return base44.entities.UserProfile.create(payload);
    },
    onSuccess: async (savedData) => {
      toast.success(t("notifications.saved"));
      // Invalidate ALL user-profile cache variants to ensure fresh data on reload
      await queryClient.invalidateQueries({ queryKey: ["user-profile"] });
      await queryClient.refetchQueries({ queryKey: ["user-profile", userId, email] });
      await queryClient.invalidateQueries({ queryKey: ["current-user"] });
      await queryClient.invalidateQueries({ queryKey: ["public-profile"] });
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
        await queryClient.invalidateQueries({ queryKey: ["user-profile", userId, email] });
        await queryClient.invalidateQueries({ queryKey: ["public-profile", email] });
      } else {
        // No profile exists yet, create one with avatar
        const newProfile = await base44.entities.UserProfile.create({
          user_id: userId || undefined,
          user_email: email || undefined,
          avatar_url: file_url,
        });
        await queryClient.invalidateQueries({ queryKey: ["user-profile", userId, email] });
      }
      
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

  // Use centralized grace period status messaging
  const graceStatus = getGraceStatus(subscription);
  const subscriptionStatusMessage = getSubscriptionStatusMessage(subscription, t);

  const clenchingLabels = {
    "Yes": t("profilePreferences.yes"),
    "No": t("profilePreferences.no"),
    "Sometimes": t("profilePreferences.sometimes"),
  };

  const smokeDurationLabels = {
    "Short (15-30 min)": t("profilePreferences.durationShort"),
    "Medium (30-60 min)": t("profilePreferences.durationMedium"),
    "Long (60+ min)": t("profilePreferences.durationLong"),
    "No Preference": t("profilePreferences.noPreference"),
  };

  const pipeSizeLabels = {
    "Small": t("profilePreferences.sizeSmall"),
    "Medium": t("profilePreferences.sizeMedium"),
    "Large": t("profilePreferences.sizeLarge"),
    "Extra Large": t("profilePreferences.sizeExtraLarge"),
    "No Preference": t("profilePreferences.noPreference"),
  };

  const strengthLabels = {
    "Mild": t("strengths.Mild"),
    "Mild-Medium": t("strengths.Mild-Medium"),
    "Medium": t("strengths.Medium"),
    "Medium-Full": t("strengths.Medium-Full"),
    "Full": t("strengths.Full"),
    "No Preference": t("profilePreferences.noPreference"),
  };

  return (
    <div className={`min-h-screen ${PK_THEME.pageBg}`}>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">

        {/* Subscription Status / Management */}
        <div
          className="rounded-lg p-7"
          style={{
            background: "linear-gradient(145deg, rgba(52, 37, 24, 0.78), rgba(42, 30, 20, 0.90))",
            border: "1px solid rgba(120, 90, 65, 0.32)",
            boxShadow: "0 3px 10px rgba(0,0,0,0.6), inset 0 1px 0 rgba(180,140,100,0.12), inset 0 -2px 3px rgba(0,0,0,0.25)",
          }}
        >
          <div className="relative">
            <div className="flex items-start justify-between gap-4 flex-col md:flex-row">
              <div className="flex items-center gap-3">
                <div 
                  className="w-11 h-11 rounded-full flex items-center justify-center"
                  style={{
                    background: "linear-gradient(135deg, rgba(212, 175, 55, 0.9), rgba(180, 140, 75, 1))",
                    boxShadow: "0 3px 8px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.2)"
                  }}
                >
                  <Crown className="w-5 h-5" style={{ color: "rgba(28, 18, 10, 0.9)" }} />
                </div>
                <div>
                  {hasPaid ? (
                    <>
                      <div className="font-semibold" style={{ color: "#F5F1E7" }}>
                        {hasPro ? t("profile.proActive") : t("profile.premiumActive")}
                      </div>
                      <div className="text-sm flex items-center gap-2" style={{ color: "rgba(180, 140, 75, 0.8)" }}>
                        {graceStatus.inGrace ? (
                          <>
                            <AlertCircle className="w-4 h-4 text-amber-500" />
                            <span>{t("subscription.gracePeriod", `Payment overdue — ${graceStatus.daysRemaining} day${graceStatus.daysRemaining > 1 ? 's' : ''} remaining`)}</span>
                          </>
                        ) : (
                          t("profile.fullAccess")
                        )}
                      </div>
                    </>
                  ) : graceStatus.gracePeriodExpired ? (
                    <>
                      <div className="font-semibold" style={{ color: "rgba(224, 100, 100, 0.9)" }}>
                        {t("subscription.suspended", "Paid access suspended")}
                      </div>
                      <div className="text-sm" style={{ color: "rgba(224, 100, 100, 0.7)" }}>
                        {t("subscription.updatePayment", "Please update your payment method")}
                      </div>
                    </>
                  ) : isTrial ? (
                    <>
                      <div className="font-semibold" style={{ color: "#F5F1E7" }}>
                        {t("profile.freeTrialActive")}
                      </div>
                      <div className="text-sm" style={{ color: "rgba(180, 140, 75, 0.8)" }}>
                        {t("profile.sevenDaysFree")}
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="font-semibold" style={{ color: "rgba(224, 216, 200, 0.8)" }}>
                        {t("profile.freeAccount")}
                      </div>
                      <div className="text-sm" style={{ color: "rgba(180, 140, 75, 0.6)" }}>
                        {t("profile.limitedFeatures")}
                      </div>
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
          </div>
        </div>

        {/* Profile */}
        <div
          className="rounded-lg overflow-hidden"
          style={{
            background: "linear-gradient(145deg, rgba(52, 37, 24, 0.78), rgba(42, 30, 20, 0.90))",
            border: "1px solid rgba(120, 90, 65, 0.32)",
            boxShadow: "0 3px 10px rgba(0,0,0,0.6), inset 0 1px 0 rgba(180,140,100,0.12), inset 0 -2px 3px rgba(0,0,0,0.25)",
          }}
        >
          <div 
            className="px-6 py-5 border-b flex items-center justify-between"
            style={{
              borderBottomColor: "rgba(120, 90, 65, 0.28)",
              background: "linear-gradient(to bottom, rgba(62, 44, 30, 0.4), transparent)"
            }}
          >
            <div className="flex items-center gap-3 flex-1 min-w-0">
            <div 
              className="w-10 h-10 rounded-full flex items-center justify-center shrink-0"
              style={{
                background: "linear-gradient(135deg, rgba(100, 70, 45, 0.5), rgba(80, 55, 35, 0.6))",
                border: "1px solid rgba(120, 90, 65, 0.4)",
                boxShadow: "0 2px 6px rgba(0,0,0,0.4), inset 0 1px 0 rgba(180, 140, 100, 0.15)"
              }}
            >
              <User className="w-4 h-4" style={{ color: "rgba(180, 140, 75, 1)" }} />
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-xl font-semibold break-words" style={{ color: "#F5F1E7", fontFamily: "'Georgia', serif" }}>
                {t("profile.smokingProfile")}
              </h2>
              <p className="text-sm break-words" style={{ color: "rgba(224, 216, 200, 0.7)" }}>
                {t("profile.personalizeAIRecommendations")}
              </p>
            </div>
            </div>

            <div className="flex gap-2">
              <Button 
                variant="outline" 
                onClick={handleLogout}
                style={{
                  background: "rgba(163, 92, 92, 0.15)",
                  borderColor: "rgba(163, 92, 92, 0.3)",
                  color: "#F5F1E7"
                }}
              >
                <LogOut className="w-3.5 h-3.5 mr-2" />
                {t("profile.logout")}
              </Button>
            </div>
          </div>

          <div className="p-7 space-y-7">
            {/* Badges */}
            <div className="flex gap-2 flex-wrap">
              <Badge 
                className="border-0 text-xs px-3 py-1"
                style={{
                  background: hasPro 
                    ? "linear-gradient(135deg, rgba(126, 84, 160, 0.9), rgba(106, 64, 140, 1))" 
                    : "linear-gradient(135deg, rgba(180, 140, 75, 0.9), rgba(160, 120, 65, 1))",
                  color: "#fff",
                  boxShadow: "0 2px 4px rgba(0,0,0,0.3)"
                }}
              >
                {planLabel.toUpperCase()}
              </Badge>
              {provider === "stripe" && (
                <Badge variant="secondary" className="text-xs" style={{
                  background: "rgba(60, 45, 30, 0.3)",
                  color: "rgba(224, 216, 200, 0.8)",
                  border: "1px solid rgba(120, 90, 65, 0.25)"
                }}>
                  {t("profileExtended.providerStripe")}
                </Badge>
              )}
              {provider === "apple" && (
                <Badge variant="secondary" className="text-xs" style={{
                  background: "rgba(60, 45, 30, 0.3)",
                  color: "rgba(224, 216, 200, 0.8)",
                  border: "1px solid rgba(120, 90, 65, 0.25)"
                }}>
                  {t("profileExtended.providerApple")}
                </Badge>
              )}
              {subscription?.status && typeof subscription.status === 'string' ? (
                <Badge variant="secondary" className="text-xs flex items-center gap-1" style={{
                  background: graceStatus.inGrace 
                    ? "rgba(245, 158, 11, 0.15)" 
                    : graceStatus.gracePeriodExpired
                    ? "rgba(220, 60, 60, 0.15)"
                    : "rgba(60, 45, 30, 0.3)",
                  color: graceStatus.inGrace
                    ? "rgba(245, 158, 11, 0.95)"
                    : graceStatus.gracePeriodExpired
                    ? "rgba(220, 60, 60, 0.95)"
                    : "rgba(224, 216, 200, 0.8)",
                  border: `1px solid ${graceStatus.inGrace ? "rgba(245, 158, 11, 0.35)" : graceStatus.gracePeriodExpired ? "rgba(220, 60, 60, 0.35)" : "rgba(120, 90, 65, 0.25)"}`
                }}>
                  {graceStatus.inGrace && <AlertCircle className="w-3 h-3" />}
                  {subscriptionStatusMessage}
                </Badge>
              ) : null}
            </div>

            {/* Avatar */}
            <div className="space-y-2">
              <Label className="text-sm font-medium" style={{ color: "rgba(180, 140, 75, 0.9)" }}>
                {t("profileExtended.profilePicture")}
              </Label>
              <div className="flex items-center gap-4">
                <div 
                  className="relative w-20 h-20 rounded-full overflow-hidden flex items-center justify-center group"
                  style={{
                    background: "linear-gradient(135deg, rgba(180, 140, 75, 0.25), rgba(160, 120, 65, 0.35))",
                    border: "2px solid rgba(120, 90, 65, 0.4)",
                    boxShadow: "0 2px 8px rgba(0,0,0,0.4)"
                  }}
                >
                  {formData.avatar_url ? (
                    <img src={formData.avatar_url} alt={t("profileExtended.avatarAlt")} className="w-full h-full object-cover" />
                  ) : (
                    <User className="w-9 h-9" style={{ color: "rgba(180, 140, 75, 0.6)" }} />
                  )}
                  <label className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 cursor-pointer transition-opacity rounded-full" style={{ background: "rgba(0,0,0,0.5)" }}>
                    <input type="file" accept="image/*" onChange={handleAvatarFileSelected} className="hidden" disabled={uploadingAvatar} />
                    <Pencil className="w-4 h-4" style={{ color: "rgba(224, 216, 200, 0.95)" }} />
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
                    <Button 
                      type="button" 
                      variant="outline" 
                      disabled={uploadingAvatar}
                      style={{
                        background: "rgba(60, 42, 28, 0.35)",
                        borderColor: "rgba(120, 90, 65, 0.3)",
                        color: "#F5F1E7"
                      }}
                    >
                      <Upload className="w-3.5 h-3.5 mr-2" />
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
                <Label className="text-sm font-medium" style={{ color: "rgba(180, 140, 75, 0.9)" }}>
                  {t("profileExtended.displayName")}
                </Label>
                <Input
                  value={formData.display_name || ""}
                  onChange={(e) => setFormData((p) => ({ ...p, display_name: e.target.value }))}
                  placeholder={t("profileExtended.displayNamePlaceholder", "Your display name")}
                />
              </div>
              <div>
                <Label className="text-sm font-medium" style={{ color: "rgba(180, 140, 75, 0.9)" }}>
                  {t("common.email")}
                </Label>
                <Input 
                  value={user?.email || ""} 
                  disabled 
                  style={{
                    background: "rgba(30, 20, 15, 0.5)",
                    borderColor: "rgba(120, 90, 65, 0.2)",
                    color: "rgba(224, 216, 200, 0.5)",
                    cursor: "not-allowed"
                  }}
                />
              </div>
            </div>

            <div>
              <Label className="text-sm font-medium" style={{ color: "rgba(180, 140, 75, 0.9)" }}>
                {t("profileExtended.bio")}
              </Label>
              <Textarea
                value={formData.bio || ""}
                onChange={(e) => setFormData((p) => ({ ...p, bio: e.target.value }))}
                placeholder={t("profileExtended.bioPlaceholder", "Tell us about yourself...")}
                rows={4}
              />
            </div>

            {/* Location */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium" style={{ color: "rgba(180, 140, 75, 0.9)" }}>
                  {t("profileExtended.location")}
                </Label>
                <div className="flex items-center gap-2">
                  <span className="text-xs" style={{ color: "rgba(224, 216, 200, 0.7)" }}>
                    {t("profileExtended.showOnProfile")}
                  </span>
                  <Switch
                    checked={formData.show_location}
                    onCheckedChange={(v) => setFormData((p) => ({ ...p, show_location: !!v }))}
                    className="data-[state=checked]:bg-[#A35C5C]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  placeholder={t("profileExtended.cityPlaceholder", "City")}
                  value={formData.city || ""}
                  onChange={(e) => setFormData((p) => ({ ...p, city: e.target.value }))}
                />
                <Input
                  placeholder={t("profileExtended.stateProvincePlaceholder", "State/Province")}
                  value={formData.state_province || ""}
                  onChange={(e) => setFormData((p) => ({ ...p, state_province: e.target.value }))}
                />
                <Input
                  placeholder={t("profileExtended.countryPlaceholder", "Country")}
                  value={formData.country || ""}
                  onChange={(e) => setFormData((p) => ({ ...p, country: e.target.value }))}
                />
                <Input
                  placeholder={t("profileExtended.postalCodePlaceholder", "Postal code")}
                  value={formData.postal_code || ""}
                  onChange={(e) => setFormData((p) => ({ ...p, postal_code: e.target.value }))}
                />
              </div>
            </div>

            {/* Privacy */}
            <div className="space-y-3">
              <Label className="text-sm font-medium" style={{ color: "rgba(180, 140, 75, 0.9)" }}>
                {t("profileExtended.privacy")}
              </Label>

              <div className="flex items-center justify-between">
                <span className="text-sm" style={{ color: "#F5F1E7" }}>
                  {t("profileExtended.hideValues")}
                </span>
                <Switch
                  checked={formData.privacy_hide_values}
                  onCheckedChange={(v) => setFormData((p) => ({ ...p, privacy_hide_values: !!v }))}
                  className="data-[state=checked]:bg-[#A35C5C]"
                />
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm" style={{ color: "#F5F1E7" }}>
                  {t("profileExtended.hideInventory")}
                </span>
                <Switch
                  checked={formData.privacy_hide_inventory}
                  onCheckedChange={(v) => setFormData((p) => ({ ...p, privacy_hide_inventory: !!v }))}
                  className="data-[state=checked]:bg-[#A35C5C]"
                />
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm" style={{ color: "#F5F1E7" }}>
                  {t("profileExtended.hideCollectionCounts")}
                </span>
                <Switch
                  checked={formData.privacy_hide_collection_counts}
                  onCheckedChange={(v) => setFormData((p) => ({ ...p, privacy_hide_collection_counts: !!v }))}
                  className="data-[state=checked]:bg-[#A35C5C]"
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <span className="text-sm font-medium" style={{ color: "#F5F1E7" }}>
                    {t("profileExtended.hideHomeValues")}
                  </span>
                  <p className="text-xs mt-0.5" style={{ color: "rgba(224, 216, 200, 0.6)" }}>
                    {t("profileExtended.hideHomeValuesDesc")}
                  </p>
                </div>
                <Switch
                  checked={formData.home_hide_collection_values}
                  onCheckedChange={(v) => setFormData((p) => ({ ...p, home_hide_collection_values: !!v }))}
                  className="data-[state=checked]:bg-[#A35C5C]"
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium" style={{ color: "#F5F1E7" }}>
                    {t("profile.enableMessaging")}
                  </div>
                  <div className="text-xs" style={{ color: "rgba(224, 216, 200, 0.6)" }}>
                    {t("profile.enableMessagingDesc")}
                  </div>
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
               <Label className="text-sm font-medium" style={{ color: "rgba(180, 140, 75, 0.9)" }}>
                 {t("profileExtended.clenchingPreference")}
               </Label>
               <div className="flex flex-wrap gap-2">
                 {["Yes", "No", "Sometimes"].map((pref) => {
                   const active = formData.clenching_preference === pref;
                   return (
                     <Badge
                       key={pref}
                       onClick={() => setFormData((p) => ({ ...p, clenching_preference: pref }))}
                       className="cursor-pointer border text-xs"
                       style={active ? {
                         background: "linear-gradient(135deg, rgba(180, 140, 75, 0.9), rgba(160, 120, 65, 1))",
                         borderColor: "rgba(180, 140, 75, 1)",
                         color: "#1a120a"
                       } : {
                         background: "rgba(40, 28, 18, 0.4)",
                         borderColor: "rgba(120, 90, 65, 0.3)",
                         color: "rgba(224, 216, 200, 0.8)"
                       }}
                     >
                       {clenchingLabels[pref] ?? pref}
                     </Badge>
                   );
                 })}
               </div>
             </div>

             <div className="space-y-3">
               <Label className="text-sm font-medium" style={{ color: "rgba(180, 140, 75, 0.9)" }}>
                 {t("profileExtended.smokeDurationPreference")}
               </Label>
               <div className="flex flex-wrap gap-2">
                 {["Short (15-30 min)", "Medium (30-60 min)", "Long (60+ min)", "No Preference"].map((pref) => {
                   const active = formData.smoke_duration_preference === pref;
                   return (
                     <Badge
                       key={pref}
                       onClick={() => setFormData((p) => ({ ...p, smoke_duration_preference: pref }))}
                       className="cursor-pointer border text-xs"
                       style={active ? {
                         background: "linear-gradient(135deg, rgba(180, 140, 75, 0.9), rgba(160, 120, 65, 1))",
                         borderColor: "rgba(180, 140, 75, 1)",
                         color: "#1a120a"
                       } : {
                         background: "rgba(40, 28, 18, 0.4)",
                         borderColor: "rgba(120, 90, 65, 0.3)",
                         color: "rgba(224, 216, 200, 0.8)"
                       }}
                     >
                       {smokeDurationLabels[pref] ?? pref}
                     </Badge>
                   );
                 })}
               </div>
             </div>

             <div className="space-y-3">
               <Label className="text-sm font-medium" style={{ color: "rgba(180, 140, 75, 0.9)" }}>
                 {t("profileExtended.pipeSizePreference")}
               </Label>
               <div className="flex flex-wrap gap-2">
                 {["Small", "Medium", "Large", "Extra Large", "No Preference"].map((pref) => {
                   const active = formData.pipe_size_preference === pref;
                   return (
                     <Badge
                       key={pref}
                       onClick={() => setFormData((p) => ({ ...p, pipe_size_preference: pref }))}
                       className="cursor-pointer border text-xs"
                       style={active ? {
                         background: "linear-gradient(135deg, rgba(180, 140, 75, 0.9), rgba(160, 120, 65, 1))",
                         borderColor: "rgba(180, 140, 75, 1)",
                         color: "#1a120a"
                       } : {
                         background: "rgba(40, 28, 18, 0.4)",
                         borderColor: "rgba(120, 90, 65, 0.3)",
                         color: "rgba(224, 216, 200, 0.8)"
                       }}
                     >
                       {pipeSizeLabels[pref] ?? pref}
                     </Badge>
                   );
                 })}
               </div>
             </div>

             <div className="space-y-3">
               <Label className="text-sm font-medium" style={{ color: "rgba(180, 140, 75, 0.9)" }}>
                 {t("profileExtended.strengthPreference")}
               </Label>
               <div className="flex flex-wrap gap-2">
                 {["Mild", "Mild-Medium", "Medium", "Medium-Full", "Full", "No Preference"].map((pref) => {
                   const active = formData.strength_preference === pref;
                   return (
                     <Badge
                       key={pref}
                       onClick={() => setFormData((p) => ({ ...p, strength_preference: pref }))}
                       className="cursor-pointer border text-xs"
                       style={active ? {
                         background: "linear-gradient(135deg, rgba(180, 140, 75, 0.9), rgba(160, 120, 65, 1))",
                         borderColor: "rgba(180, 140, 75, 1)",
                         color: "#1a120a"
                       } : {
                         background: "rgba(40, 28, 18, 0.4)",
                         borderColor: "rgba(120, 90, 65, 0.3)",
                         color: "rgba(224, 216, 200, 0.8)"
                       }}
                     >
                       {strengthLabels[pref] ?? pref}
                     </Badge>
                   );
                 })}
               </div>
             </div>

             <div className="space-y-3">
               <Label className="text-sm font-medium" style={{ color: "rgba(180, 140, 75, 0.9)" }}>
                 {t("profileExtended.preferredBlendTypes")}
               </Label>
              <div className="flex flex-wrap gap-2">
                {BLEND_TYPES.map((bt) => {
                  const active = formData.preferred_blend_types.includes(bt);
                  return (
                    <Badge
                      key={bt}
                      onClick={() => toggleBlendType(bt)}
                      className="cursor-pointer border text-xs"
                      style={active ? {
                        background: "linear-gradient(135deg, rgba(90, 124, 90, 0.9), rgba(74, 108, 74, 1))",
                        borderColor: "rgba(90, 124, 90, 1)",
                        color: "#fff"
                      } : {
                        background: "rgba(40, 28, 18, 0.4)",
                        borderColor: "rgba(120, 90, 65, 0.3)",
                        color: "rgba(224, 216, 200, 0.8)"
                      }}
                    >
                      {t(`blendTypes.${bt}`, bt)}
                    </Badge>
                  );
                })}
              </div>
            </div>

            <div className="space-y-3">
              <Label className="text-sm font-medium" style={{ color: "rgba(180, 140, 75, 0.9)" }}>
                {t("profileExtended.preferredPipeShapes")}
              </Label>
              <div className="flex flex-wrap gap-2">
                {PIPE_SHAPES.map((sh) => {
                  const active = formData.preferred_shapes.includes(sh);
                  return (
                    <Badge
                      key={sh}
                      onClick={() => toggleShape(sh)}
                      className="cursor-pointer border text-xs"
                      style={active ? {
                        background: "linear-gradient(135deg, rgba(180, 140, 75, 0.9), rgba(160, 120, 65, 1))",
                        borderColor: "rgba(180, 140, 75, 1)",
                        color: "#1a120a"
                      } : {
                        background: "rgba(40, 28, 18, 0.4)",
                        borderColor: "rgba(120, 90, 65, 0.3)",
                        color: "rgba(224, 216, 200, 0.8)"
                      }}
                    >
                      {t(`shapes.${sh}`, sh)}
                    </Badge>
                  );
                })}
              </div>
            </div>

            <div>
              <Label className="text-sm font-medium" style={{ color: "rgba(180, 140, 75, 0.9)" }}>
                {t("common.notes")}
              </Label>
              <Textarea
                value={formData.notes || ""}
                onChange={(e) => setFormData((p) => ({ ...p, notes: e.target.value }))}
                placeholder={t("profileExtended.notesPlaceholder", "Additional notes about your preferences...")}
                rows={4}
              />
            </div>

            {/* Public profile toggle */}
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium" style={{ color: "#F5F1E7" }}>
                  {t("profileExtended.publicCommunityProfile")}
                </div>
                <div className="text-sm" style={{ color: "rgba(224, 216, 200, 0.7)" }}>
                  {t("profileExtended.allowOthersToView")}
                </div>
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
                  style={{
                    background: "rgba(60, 42, 28, 0.35)",
                    borderColor: "rgba(120, 90, 65, 0.3)",
                    color: "#F5F1E7"
                  }}
                >
                  {t("profileExtended.previewPublicProfile")}
                </Button>
              ) : null}
            </div>
          </div>
        </div>

        <SubscriptionBackupModeModal
          isOpen={showBackupModal}
          onClose={() => setShowBackupModal(false)}
        />
      </div>
    </div>
  );
}