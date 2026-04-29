import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "@/components/utils/navigation";
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

import { User, Crown, ArrowRight, LogOut, Upload, Pencil, Share2, Layers, Trash2, AlertTriangle, Loader2 } from "lucide-react";
import AvatarCropper from "@/components/pipes/AvatarCropper";
import WhiskeyPreferencesSection from "@/components/profile/WhiskeyPreferencesSection";
import CigarPreferencesSection from "@/components/profile/CigarPreferencesSection";
import WinePreferencesSection from "@/components/profile/WinePreferencesSection";
import ModuleVisibilitySettings from "@/components/profile/ModuleVisibilitySettings";
import CurrencyPreferenceSetting from "@/components/profile/CurrencyPreferenceSetting";
import FormSection from "@/components/forms/FormSection";

import { useTranslation } from "@/components/i18n/safeTranslation";
import { createPageUrl } from "@/components/utils/createPageUrl";
import SubscriptionBackupModeModal from "@/components/subscription/SubscriptionBackupModeModal";
import { handleManageSubscription } from "@/components/utils/manageSubscription";

import { PK_THEME } from "@/components/utils/pkTheme";

import { useCurrentUser } from "@/components/hooks/useCurrentUser";
import { WINEKEEPER_PUBLIC_ENABLED, canUserAccessModule } from "@/components/utils/moduleReleaseState";


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

// Note fields where the most-recently-updated record's exact value (including "")
// must take precedence over the pick() fallback logic.
const PROFILE_NOTE_FIELDS = ['notes', 'whiskey_notes', 'wine_notes', 'cigar_notes'];

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
    // Note: whiskey_notes / wine_notes / cigar_notes are overridden below
    // using master-record preference so intentional empty saves are preserved.
    whiskey_notes: pick(acc.whiskey_notes, row.whiskey_notes),
    wine_notes: pick(acc.wine_notes, row.wine_notes),
    cigar_notes: pick(acc.cigar_notes, row.cigar_notes),
    whiskey_preferences: acc.whiskey_preferences || row.whiskey_preferences || null,
    cigar_preferences: acc.cigar_preferences || row.cigar_preferences || null,
    wine_preferences: acc.wine_preferences || row.wine_preferences || null,
    pipekeeper_enabled: pickBool(acc.pipekeeper_enabled, row.pipekeeper_enabled),
    whiskeykeeper_enabled: pickBool(acc.whiskeykeeper_enabled, row.whiskeykeeper_enabled),
    winekeeper_enabled: pickBool(acc.winekeeper_enabled, row.winekeeper_enabled),
    cigarkeeper_enabled: pickBool(acc.cigarkeeper_enabled, row.cigarkeeper_enabled),
    module_preferences_set: pickBool(acc.module_preferences_set, row.module_preferences_set),
  }), {});

  // CRITICAL: For boolean toggle fields that the user explicitly sets (enable_messaging,
  // allow_comments, etc.), the master record (most recently updated) is authoritative.
  // The reduce above uses pickBool which finds the FIRST boolean — this can return a
  // stale `false` from an older row even after the user saved `true`. Override with
  // master's explicit value for these critical fields.
  const MASTER_BOOL_FIELDS = [
    'enable_messaging', 'allow_comments', 'is_public', 'show_location',
    'allow_web_lookups', 'privacy_hide_values', 'privacy_hide_inventory',
    'privacy_hide_collection_counts', 'home_hide_collection_values', 'show_social_media',
  ];
  for (const field of MASTER_BOOL_FIELDS) {
    if (typeof master[field] === 'boolean') {
      merged[field] = master[field];
    }
  }

  // For free-text note fields, prefer the master (most-recently-updated) record's
  // exact value — including an empty string.  The `pick` helper above skips ""
  // which means intentional clears would silently revert to an older record's text.
  for (const field of PROFILE_NOTE_FIELDS) {
    const masterVal = master?.[field];
    if (masterVal !== undefined && masterVal !== null) {
      merged[field] = masterVal;
    }
  }

  return { masterId: master?.id || null, merged };
}

export default function ProfilePage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { user, provider, subscription, isLoading: userLoading, tier, planLabel, hasPaid, hasPro, isTrial, isAdmin, winekeeper_paid } = useCurrentUser();

  const email = useMemo(() => normEmail(user?.email), [user?.email]);
  const userId = user?.id || null;

  const { data: profileBundle, isLoading: profileLoading } = useQuery({
    queryKey: ["user-profile-page", email],
    queryFn: async () => {
      if (!email) return { masterId: null, merged: null };

      let records = [];
      try {
        const byEmail = await base44.entities.UserProfile.filter({ user_email: email });
        records = [...records, ...(byEmail || [])];
      } catch (e) {
        console.warn("[Profile] Could not load UserProfile by user_email:", e);
      }

      try {
        const byCreated = await base44.entities.UserProfile.filter({ created_by: email });
        records = [...records, ...(byCreated || [])];
      } catch (e) {
        console.warn("[Profile] Could not load UserProfile by created_by:", e);
      }

      const seen = new Set();
      const unique = records.filter((r) => {
        const key = r?.id || `${r?.user_email || ""}|${r?.created_by || ""}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });

      return consolidateProfiles(unique);
    },
    enabled: !!email,
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

  const initializedRef = React.useRef(false);
  const [showBackupModal, setShowBackupModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deletingProfile, setDeletingProfile] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [cropperImage, setCropperImage] = useState(null);
  const [manageSubLoading, setManageSubLoading] = useState(false);

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
    cigar_preferences: {
      strengths: [],
      bodies: [],
      wrappers: [],
      origins: [],
      vitolas: [],
      flavors: [],
      occasions: [],
      pairings: [],
    },
    wine_preferences: {
      styles: [],
      varietals: [],
      regions: [],
      drinking_goals: [],
      pairing_interests: [],
      flavor_profile: [],
      cellar_strategy: '',
      budget_everyday_min: '',
      budget_everyday_max: '',
      budget_special_min: '',
      budget_special_max: '',
      max_recommendation_price: '',
    },
    // Module visibility: null = not yet set (system derives from release state)
    pipekeeper_enabled: null,
    whiskeykeeper_enabled: false,
    winekeeper_enabled: false,
    cigarkeeper_enabled: false,
  });



  // Reset init ref when real profile data arrives so form re-hydrates with saved values
  const prevProfileIdRef = React.useRef(null);
  useEffect(() => {
    if (profileId && profileId !== prevProfileIdRef.current) {
      prevProfileIdRef.current = profileId;
      initializedRef.current = false;
    }
  }, [profileId]);

  useEffect(() => {
    // Only hydrate once when profile data first arrives; don't reset on user re-renders
    if (!profile && !user) return;
    if (initializedRef.current) return;
    initializedRef.current = true;
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
      cigar_preferences: source.cigar_preferences || { strengths: [], bodies: [], wrappers: [], origins: [], vitolas: [], flavors: [], occasions: [], pairings: [] },
      wine_preferences: source.wine_preferences || { styles: [], varietals: [], regions: [], drinking_goals: [], pairing_interests: [], flavor_profile: [], cellar_strategy: '', budget_everyday_min: '', budget_everyday_max: '', budget_special_min: '', budget_special_max: '', max_recommendation_price: '' },
      pipekeeper_enabled: source.pipekeeper_enabled,
      whiskeykeeper_enabled: source.whiskeykeeper_enabled === true,
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
      // Reset init ref so form re-hydrates from fresh backend data after save
      initializedRef.current = false;
      await queryClient.invalidateQueries({ queryKey: ["user-profile-page", email] });
      await queryClient.refetchQueries({ queryKey: ["user-profile-page", email] });
      // Invalidate all variants of user-profile cache key used across pages (Community uses id+email)
      await queryClient.invalidateQueries({ queryKey: ["user-profile"] });
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
      await queryClient.invalidateQueries({ queryKey: ["user-profile-page", email] });
      await queryClient.refetchQueries({ queryKey: ["user-profile-page", email] });
      await queryClient.invalidateQueries({ queryKey: ["user-profile", email] });
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
      navigate(createPageUrl("Home"), { replace: true });
    }
  }

  async function handleDeleteProfile() {
    setDeletingProfile(true);
    try {
      if (profileId) {
        await base44.entities.UserProfile.delete(profileId);
      }
      await base44.auth.logout();
      navigate(createPageUrl("Home"), { replace: true });
    } catch (err) {
      console.error("[Profile] delete failed:", err);
      toast.error("Could not delete profile. Please try again.");
    } finally {
      setDeletingProfile(false);
      setShowDeleteConfirm(false);
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
                <Button
                  className="bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-700 hover:to-amber-800"
                  disabled={manageSubLoading}
                  onClick={async () => {
                    setManageSubLoading(true);
                    try {
                      await handleManageSubscription(user, subscription, navigate, createPageUrl);
                    } finally {
                      setManageSubLoading(false);
                    }
                  }}
                >
                  {manageSubLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  {t("profile.manageSubscription")}
                  {!manageSubLoading && <ArrowRight className="w-4 h-4 ml-2" />}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setShowDeleteConfirm(true)}
                  className="border-red-800/40 text-red-400 hover:bg-red-900/20 hover:border-red-700"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete Profile
                </Button>
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
                <CardTitle className="text-2xl" style={{ color: '#F5F1E7', fontFamily: "'Georgia', serif" }}>Collection Profile</CardTitle>
                <CardDescription style={{ color: 'rgba(224,216,200,0.6)' }}>
                  {t("profile.personalizeAIRecommendations")}
                </CardDescription>
              </div>

              <div className="flex flex-col gap-2">
                <Button variant="outline" onClick={handleLogout}>
                  <LogOut className="w-4 h-4 mr-2" />
                  {t("profile.logout")}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setShowDeleteConfirm(true)}
                  className="border-red-800/40 text-red-400 hover:bg-red-900/20 hover:border-red-700"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete Profile
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
                <Badge variant="secondary" style={{ background: 'rgba(180,140,75,0.15)', color: 'rgba(212,165,116,0.9)', border: '1px solid rgba(180,140,75,0.25)' }}>{t("profileExtended.providerStripe")}</Badge>
              )}
              {provider === "apple" && (
                <Badge variant="secondary" style={{ background: 'rgba(180,140,75,0.15)', color: 'rgba(212,165,116,0.9)', border: '1px solid rgba(180,140,75,0.25)' }}>{t("profileExtended.providerApple")}</Badge>
              )}
              {subscription?.status && typeof subscription.status === 'string' ? (
                <Badge variant="secondary" style={{ background: 'rgba(100,100,100,0.2)', color: 'rgba(224,216,200,0.7)', border: '1px solid rgba(120,120,120,0.3)' }}>
                  {statusLabels[subscription.status] || subscription.status}
                </Badge>
              ) : null}
            </div>

            {/* Avatar */}
            <div className="space-y-2">
              <Label className="font-medium break-words" style={{ color: 'rgba(224,216,200,0.85)' }}>{t("profileExtended.profilePicture")}</Label>
              <div className="flex items-center gap-4">
                <div className="relative w-20 h-20 rounded-full bg-gradient-to-br from-amber-200 to-amber-300 overflow-hidden flex items-center justify-center group">
                  {formData.avatar_url ? (
                    <img src={formData.avatar_url} alt={t("profileExtended.avatarAlt")} className="w-full h-full object-cover" />
                  ) : (
                    <User className="w-10 h-10" style={{ color: 'rgba(212,165,116,0.8)' }} />
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
                    <Button type="button" variant="outline" disabled={uploadingAvatar} style={{ color: 'rgba(224,216,200,0.8)' }}>
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
                <Label className="font-medium" style={{ color: 'rgba(224,216,200,0.85)' }}>{t("profileExtended.displayName")}</Label>
                <Input
                  value={formData.display_name}
                  onChange={(e) => setFormData((p) => ({ ...p, display_name: e.target.value }))}
                />
              </div>
              <div>
               <Label className="font-medium" style={{ color: 'rgba(224,216,200,0.85)' }}>{t("common.email")}</Label>
               <Input value={user?.email || ""} disabled style={{ color: 'rgba(224,216,200,0.4)', backgroundColor: 'rgba(0,0,0,0.2)' }} className="cursor-not-allowed" />
              </div>
            </div>

            <div>
              <Label className="font-medium" style={{ color: 'rgba(224,216,200,0.85)' }}>{t("profileExtended.bio")}</Label>
              <Textarea
                value={formData.bio}
                onChange={(e) => setFormData((p) => ({ ...p, bio: e.target.value }))}
                rows={4}
              />
            </div>

            {/* Location */}
            <FormSection title="Location">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm" style={{ color: 'rgba(224,216,200,0.65)' }}>{t("profileExtended.showOnProfile")}</span>
                <Switch
                  checked={formData.show_location}
                  onCheckedChange={(v) => setFormData((p) => ({ ...p, show_location: !!v }))}
                  className="data-[state=checked]:bg-[#A35C5C]"
                />
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
            </FormSection>

            {/* Privacy */}
            <FormSection title="Privacy & Visibility">
              <div className="flex items-center justify-between">
                <span className="text-sm" style={{ color: 'rgba(224,216,200,0.7)' }}>{t("profileExtended.hideValues")}</span>
                <Switch
                  checked={formData.privacy_hide_values}
                  onCheckedChange={(v) => setFormData((p) => ({ ...p, privacy_hide_values: !!v }))}
                  className="data-[state=checked]:bg-[#A35C5C]"
                />
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm" style={{ color: 'rgba(224,216,200,0.7)' }}>{t("profileExtended.hideInventory")}</span>
                <Switch
                  checked={formData.privacy_hide_inventory}
                  onCheckedChange={(v) => setFormData((p) => ({ ...p, privacy_hide_inventory: !!v }))}
                  className="data-[state=checked]:bg-[#A35C5C]"
                />
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm" style={{ color: 'rgba(224,216,200,0.7)' }}>{t("profileExtended.hideCollectionCounts")}</span>
                <Switch
                  checked={formData.privacy_hide_collection_counts}
                  onCheckedChange={(v) => setFormData((p) => ({ ...p, privacy_hide_collection_counts: !!v }))}
                  className="data-[state=checked]:bg-[#A35C5C]"
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <span className="text-sm font-medium" style={{ color: 'rgba(224,216,200,0.8)' }}>{t("profileExtended.hideHomeValues")}</span>
                  <p className="text-xs mt-0.5" style={{ color: 'rgba(224,216,200,0.5)' }}>{t("profileExtended.hideHomeValuesDesc")}</p>
                </div>
                <Switch
                  checked={formData.home_hide_collection_values}
                  onCheckedChange={(v) => setFormData((p) => ({ ...p, home_hide_collection_values: !!v }))}
                  className="data-[state=checked]:bg-[#A35C5C]"
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium" style={{ color: 'rgba(224,216,200,0.8)' }}>{t("profile.enableMessaging")}</div>
                  <div className="text-xs mt-0.5" style={{ color: 'rgba(224,216,200,0.5)' }}>{t("profile.enableMessagingDesc")}</div>
                </div>
                <Switch
                  checked={formData.enable_messaging}
                  onCheckedChange={(v) => setFormData((p) => ({ ...p, enable_messaging: !!v }))}
                  className="data-[state=checked]:bg-[#A35C5C]"
                />
              </div>
            </FormSection>

            {/* Pipe / Tobacco Preferences */}
            <FormSection title={t("profile.pipeTobaccoPreferences", "Pipe & Tobacco Preferences")}>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label className="ck-field-label">{t("profileExtended.clenchingPreference")}</Label>
                  <div className="flex flex-wrap gap-2">
                    {[
                      { value: "Yes", label: t("profilePreferences.yes", "Yes") },
                      { value: "No", label: t("profilePreferences.no", "No") },
                      { value: "Sometimes", label: t("profilePreferences.sometimes", "Sometimes") },
                    ].map(({ value, label }) => {
                      const active = formData.clenching_preference === value;
                      return (
                        <Button
                          key={value}
                          onClick={() => setFormData((p) => ({ ...p, clenching_preference: value }))}
                          variant={active ? "default" : "outline"}
                          size="sm"
                          className={active ? "bg-[#A35C5C] hover:bg-[#8C4A4A] text-[#F5F1E7] border-transparent" : "border-[rgba(140,105,65,0.3)] hover:bg-[rgba(180,140,75,0.1)]"} style={{color: active ? undefined : "rgba(224,216,200,0.65)"}}
                        >
                          {label}
                        </Button>
                      );
                    })}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="ck-field-label">{t("profileExtended.smokeDurationPreference")}</Label>
                  <div className="flex flex-wrap gap-2">
                    {[
                      { value: "Short (15-30 min)", label: t("profilePreferences.durationShort", "Short (15-30 min)") },
                      { value: "Medium (30-60 min)", label: t("profilePreferences.durationMedium", "Medium (30-60 min)") },
                      { value: "Long (60+ min)", label: t("profilePreferences.durationLong", "Long (60+ min)") },
                      { value: "No Preference", label: t("profilePreferences.noPreference", "No Preference") },
                    ].map(({ value, label }) => {
                      const active = formData.smoke_duration_preference === value;
                      return (
                        <Button
                          key={value}
                          onClick={() => setFormData((p) => ({ ...p, smoke_duration_preference: value }))}
                          variant={active ? "default" : "outline"}
                          size="sm"
                          className={active ? "bg-[#A35C5C] hover:bg-[#8C4A4A] text-[#F5F1E7] border-transparent" : "border-[rgba(140,105,65,0.3)] hover:bg-[rgba(180,140,75,0.1)]"} style={{color: active ? undefined : "rgba(224,216,200,0.65)"}}
                        >
                          {label}
                        </Button>
                      );
                    })}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="ck-field-label">{t("profileExtended.pipeSizePreference")}</Label>
                  <div className="flex flex-wrap gap-2">
                    {[
                      { value: "Small", label: t("profilePreferences.sizeSmall", "Small") },
                      { value: "Medium", label: t("profilePreferences.sizeMedium", "Medium") },
                      { value: "Large", label: t("profilePreferences.sizeLarge", "Large") },
                      { value: "Extra Large", label: t("profilePreferences.sizeExtraLarge", "Extra Large") },
                      { value: "No Preference", label: t("profilePreferences.noPreference", "No Preference") },
                    ].map(({ value, label }) => {
                      const active = formData.pipe_size_preference === value;
                      return (
                        <Button
                          key={value}
                          onClick={() => setFormData((p) => ({ ...p, pipe_size_preference: value }))}
                          variant={active ? "default" : "outline"}
                          size="sm"
                          className={active ? "bg-[#A35C5C] hover:bg-[#8C4A4A] text-[#F5F1E7] border-transparent" : "border-[rgba(140,105,65,0.3)] hover:bg-[rgba(180,140,75,0.1)]"} style={{color: active ? undefined : "rgba(224,216,200,0.65)"}}
                        >
                          {label}
                        </Button>
                      );
                    })}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="ck-field-label">{t("profileExtended.strengthPreference")}</Label>
                  <div className="flex flex-wrap gap-2">
                    {[
                      { value: "Mild", label: t("profilePreferences.strengthMild", "Mild") },
                      { value: "Mild-Medium", label: t("profilePreferences.strengthMildMedium", "Mild-Medium") },
                      { value: "Medium", label: t("profilePreferences.strengthMedium", "Medium") },
                      { value: "Medium-Full", label: t("profilePreferences.strengthMediumFull", "Medium-Full") },
                      { value: "Full", label: t("profilePreferences.strengthFull", "Full") },
                      { value: "No Preference", label: t("profilePreferences.noPreference", "No Preference") },
                    ].map(({ value, label }) => {
                      const active = formData.strength_preference === value;
                      return (
                        <Button
                          key={value}
                          onClick={() => setFormData((p) => ({ ...p, strength_preference: value }))}
                          variant={active ? "default" : "outline"}
                          size="sm"
                          className={active ? "bg-[#A35C5C] hover:bg-[#8C4A4A] text-[#F5F1E7] border-transparent" : "border-[rgba(140,105,65,0.3)] hover:bg-[rgba(180,140,75,0.1)]"} style={{color: active ? undefined : "rgba(224,216,200,0.65)"}}
                        >
                          {label}
                        </Button>
                      );
                    })}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="ck-field-label">{t("profileExtended.preferredBlendTypes")}</Label>
                  <div className="flex flex-wrap gap-2">
                    {BLEND_TYPES.map((bt) => {
                      const active = formData.preferred_blend_types.includes(bt);
                      return (
                        <Badge
                          key={bt}
                          onClick={() => toggleBlendType(bt)}
                          className={`cursor-pointer border ${active ? "bg-[#A35C5C] text-[#F5F1E7] border-[#A35C5C]" : "border-[rgba(140,105,65,0.3)] text-[rgba(224,216,200,0.65)] hover:bg-[rgba(180,140,75,0.1)]"}`}
                        >
                          {bt}
                        </Badge>
                      );
                    })}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="ck-field-label">{t("profileExtended.preferredPipeShapes")}</Label>
                  <div className="flex flex-wrap gap-2">
                    {PIPE_SHAPES.map((sh) => {
                      const active = formData.preferred_shapes.includes(sh);
                      return (
                        <Badge
                          key={sh}
                          onClick={() => toggleShape(sh)}
                          className={`cursor-pointer border ${active ? "bg-[#A35C5C] text-[#F5F1E7] border-[#A35C5C]" : "border-[rgba(140,105,65,0.3)] text-[rgba(224,216,200,0.65)] hover:bg-[rgba(180,140,75,0.1)]"}`}
                        >
                          {sh}
                        </Badge>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <Label className="ck-field-label">{t("common.notes")}</Label>
                  <Textarea
                    value={formData.notes}
                    onChange={(e) => setFormData((p) => ({ ...p, notes: e.target.value }))}
                    rows={3}
                    placeholder={t("profile.pipeNotesPlaceholder", "Any guidance for pipe and tobacco recommendations...")}
                  />
                </div>
              </div>
            </FormSection>

            {/* Whiskey Preferences */}
            <FormSection title={t("profile.whiskeyPreferences", "Whiskey Preferences")}>
              <p className="text-xs mb-3" style={{ color: 'rgba(224,216,200,0.48)' }}>
                {t("profile.usedByCuratorWhiskey", "Used by Curator to personalize pairing recommendations and cross-collection insights.")}
              </p>
              <WhiskeyPreferencesSection
                preferences={formData.whiskey_preferences}
                onChange={(updated) => setFormData((p) => ({ ...p, whiskey_preferences: updated }))}
              />
              <div className="mt-4">
                <Label className="ck-field-label">{t("profile.whiskeyNotesLabel", "Whiskey Notes for Recommendations")}</Label>
                <Textarea
                  value={formData.whiskey_notes}
                  onChange={(e) => setFormData((p) => ({ ...p, whiskey_notes: e.target.value }))}
                  rows={3}
                  placeholder={t("profile.whiskeyNotesPlaceholder", "e.g. Love smoky Islays, prefer aged single malts, enjoy pairing with dark chocolate or cigars...")}
                />
                <p className="text-xs mt-1" style={{ color: 'rgba(224,216,200,0.4)' }}>
                  {t("profile.whiskeyNotesHint", "This note is shared with the Curator AI to improve whiskey recommendations.")}
                </p>
              </div>
              <div className="mt-4">
                <CurrencyPreferenceSetting />
              </div>
            </FormSection>

            {/* Cigar Preferences */}
            <FormSection title={t("profile.cigarPreferences", "Cigar Preferences")}>
              <p className="text-xs mb-3" style={{ color: 'rgba(224,216,200,0.48)' }}>
                {t("profile.usedByCuratorCigar", "Used by Curator to personalize cigar recommendations, humidor guidance, and cross-collection pairing suggestions.")}
              </p>
              <CigarPreferencesSection
                preferences={formData.cigar_preferences}
                onChange={(updated) => setFormData((p) => ({ ...p, cigar_preferences: updated }))}
              />
              <div className="mt-4">
                <Label className="ck-field-label">{t("profile.cigarNotesLabel", "Cigar Notes for Recommendations")}</Label>
                <Textarea
                  value={formData.cigar_notes}
                  onChange={(e) => setFormData((p) => ({ ...p, cigar_notes: e.target.value }))}
                  rows={3}
                  placeholder={t("profile.cigarNotesPlaceholder", "e.g. Love full-bodied Nicaraguans, prefer maduro wrappers, enjoy pairing with coffee or Bourbon...")}
                />
              </div>
            </FormSection>

            {/* WineKeeper Preferences — gated to admin/internal testers only while release state is internal.
                winekeeper_paid alone does NOT grant access; canUserAccessModule enforces the release gate. */}
            {(WINEKEEPER_PUBLIC_ENABLED || isAdmin || canUserAccessModule('winekeeper', user)) && (
              <FormSection title={t("profile.wineKeeperPreferences", "WineKeeper Preferences")}>
                <p className="text-xs mb-3" style={{ color: 'rgba(224,216,200,0.48)' }}>
                  {t("profile.usedByCuratorWine", "Used by Curator to personalize wine recommendations, cellar guidance, and cross-collection pairing suggestions.")}
                </p>
                <WinePreferencesSection
                  preferences={formData.wine_preferences}
                  onChange={(updated) => setFormData((p) => ({ ...p, wine_preferences: updated }))}
                />
                <div className="mt-4">
                  <label className="ck-field-label block mb-1">{t("profile.wineNotesLabel", "Wine Notes for Recommendations")}</label>
                  <textarea
                    value={formData.wine_notes}
                    onChange={(e) => setFormData((p) => ({ ...p, wine_notes: e.target.value }))}
                    rows={3}
                    placeholder={t("profile.wineNotesPlaceholder", "e.g. Love aged Burgundy, prefer dry reds, enjoy pairing with cigars or fine cheese...")}
                    className="flex w-full rounded-xl px-4 py-2.5 text-base text-[#F5F1E7] bg-[rgba(20,14,10,0.70)] border border-[rgba(180,140,75,0.25)] placeholder:text-[rgba(224,216,200,0.55)] focus:outline-none focus:ring-2 focus:ring-[rgba(180,140,75,0.40)] transition-colors duration-150 min-h-[5rem]"
                  />
                  <p className="text-xs mt-1" style={{ color: 'rgba(224,216,200,0.4)' }}>
                    {t("profile.wineNotesHint", "This note is shared with the Curator AI to improve wine recommendations.")}
                  </p>
                </div>
              </FormSection>
            )}

            {/* Public profile toggle */}
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium" style={{ color: 'rgba(224,216,200,0.85)' }}>{t("profileExtended.publicCommunityProfile")}</div>
                <div className="text-sm" style={{ color: 'rgba(224,216,200,0.6)' }}>{t("profileExtended.allowOthersToView")}</div>
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
                style={{color: "rgba(224,216,200,0.8)", borderColor: "rgba(140,105,65,0.35)"}}
              >
                <Share2 className="w-4 h-4 mr-2" />
                {t("profile.shareCollectionInsights", "Share Collection Insights")}
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
                 style={{color: "rgba(224,216,200,0.8)", borderColor: "rgba(140,105,65,0.35)"}}
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
                <CardTitle className="text-xl" style={{ color: '#F5F1E7' }}>{t("profile.activeModules", "Active Modules")}</CardTitle>
                <CardDescription style={{ color: 'rgba(224,216,200,0.55)' }}>
                  {t("profile.activeModulesDesc", "Control which collection modules are visible. Your data is never deleted when a module is hidden.")}
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <ModuleVisibilitySettings profile={profile} user={user} />
          </CardContent>
        </Card>

        <SubscriptionBackupModeModal
          isOpen={showBackupModal}
          onClose={() => setShowBackupModal(false)}
        />

        {/* Delete Profile Confirmation Dialog */}
        {showDeleteConfirm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.75)' }}>
            <div className="rounded-2xl p-8 max-w-md w-full space-y-5" style={{ background: 'linear-gradient(145deg, #1d1511, #140f0c)', border: '1px solid rgba(180,60,60,0.35)' }}>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ background: 'rgba(180,60,60,0.15)', border: '1px solid rgba(180,60,60,0.35)' }}>
                  <AlertTriangle className="w-6 h-6 text-red-400" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold" style={{ color: '#F5F1E7' }}>Delete Profile</h2>
                  <p className="text-sm" style={{ color: 'rgba(224,216,200,0.6)' }}>This action cannot be undone</p>
                </div>
              </div>
              <p style={{ color: 'rgba(224,216,200,0.8)' }}>
                Are you sure you want to permanently delete your profile? Your preferences and settings will be removed. Your collection data (pipes, tobacco, whiskey, cigars) will remain in the system but will no longer be linked to a profile.
              </p>
              <div className="flex gap-3 justify-end">
                <Button
                  variant="outline"
                  onClick={() => setShowDeleteConfirm(false)}
                  disabled={deletingProfile}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleDeleteProfile}
                  disabled={deletingProfile}
                  className="bg-red-700 hover:bg-red-800 text-white border-0"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  {deletingProfile ? 'Deleting...' : 'Yes, Delete Profile'}
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}