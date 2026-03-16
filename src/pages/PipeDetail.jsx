import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "@/components/i18n/safeTranslation";
import { base44 } from "@/api/base44Client";
import { scopedEntities } from "@/components/api/scopedEntities";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { safeUpdate } from "@/components/utils/safeUpdate";
import { invalidatePipeQueries } from "@/components/utils/cacheInvalidation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { formatCurrency, formatMeasurement, formatWeight } from "@/components/utils/localeFormatters";
import {
  ArrowLeft,
  Edit,
  Trash2,
  Heart,
  DollarSign,
  Sparkles,
  ScanSearch,
  Ruler,
  Calendar,
  MapPin,
  ArrowLeftRight,
  Weight,
  CheckCircle2,
  Target,
  Activity,
  Wrench,
  Flame,
  Share2,
} from "lucide-react";
import { createPageUrl } from "@/components/utils/createPageUrl";
import { motion } from "framer-motion";
import { useCurrentUser } from "@/components/hooks/useCurrentUser";
import { useMeasurement } from "@/components/utils/measurementConversion";
import { getUsageCharacteristics } from "@/components/utils/schemaCompatibility";
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
import PipeForm from "@/components/pipes/PipeForm";
import MatchingEngine from "@/components/ai/MatchingEngine";
import ValueLookup from "@/components/ai/ValueLookup";
import PipeIdentifier from "@/components/ai/PipeIdentifier";
import PipeShapeIcon from "@/components/pipes/PipeShapeIcon";
import PipeSpecialization from "@/components/pipes/PipeSpecialization";
import SpecializationRecommender from "@/components/pipes/SpecializationRecommender";
import CommentSection from "@/components/community/CommentSection";
import ImageModal from "@/components/ui/ImageModal";
import UpgradePrompt from "@/components/subscription/UpgradePrompt";
import BreakInSchedule from "@/components/pipes/BreakInSchedule";
import PipeMeasurementCalculator from "@/components/ai/PipeMeasurementCalculator";
import InterchangeableBowls from "@/components/pipes/InterchangeableBowls";
import PipeConditionTracker from "@/components/pipes/PipeConditionTracker";
import MaintenanceLog from "@/components/pipes/MaintenanceLog";
import CuratorItemNote from "@/components/curator/CuratorItemNote";
import ShareRecordModal from "@/components/share/ShareRecordModal";
import ValuationCredibility, { computePipeValuation } from "@/components/valuation/ValuationCredibility";

const PAGE_BG =
  "linear-gradient(180deg, rgba(14,10,8,0.98) 0%, rgba(11,9,8,1) 100%)";

const COLLECTOR_CARD_STYLE = {
  background: "linear-gradient(145deg, rgba(40,28,20,0.95), rgba(32,22,15,0.95))",
  border: "1px solid rgba(140,105,65,0.35)",
  boxShadow: "0 10px 28px rgba(0,0,0,0.6), inset 0 1px 0 rgba(200,160,110,0.12)",
};

const SUBPANEL_STYLE = {
  background: "linear-gradient(145deg, rgba(36,25,18,0.94), rgba(28,20,15,0.94))",
  border: "1px solid rgba(140,105,65,0.28)",
  boxShadow: "0 6px 18px rgba(0,0,0,0.45), inset 0 1px 0 rgba(200,160,110,0.08)",
};

function pickNewestProfile(profiles = []) {
  if (!Array.isArray(profiles) || profiles.length === 0) return null;
  return [...profiles].sort((a, b) => {
    const ad =
      Date.parse(a?.updated_date ?? a?.updated_at ?? a?.created_date ?? a?.created_at ?? "") || 0;
    const bd =
      Date.parse(b?.updated_date ?? b?.updated_at ?? b?.created_date ?? b?.created_at ?? "") || 0;
    return bd - ad;
  })[0];
}

export default function PipeDetailPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const urlParams = new URLSearchParams(window.location.search);
  const pipeId = urlParams.get("id")?.trim();

  const [showEdit, setShowEdit] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [showShare, setShowShare] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState(0);
  const [expandedImage, setExpandedImage] = useState(null);

  const queryClient = useQueryClient();
  const { useImperial, setUseImperial } = useMeasurement();

  const { user, hasPaid, isLoading: userLoading, error: userError } = useCurrentUser();

  const { data: pipe, isLoading: pipeLoading, error: pipeError } = useQuery({
    queryKey: ["pipe", pipeId, user?.email],
    enabled: !!pipeId && !!user?.email && !userLoading,
    retry: false,
    queryFn: async () => {
      if (!pipeId) throw new Error("Missing pipe ID");

      const isNumeric = /^\d+$/.test(pipeId);
      const numericId = isNumeric ? Number(pipeId) : null;

      try {
        const p = await base44.entities.Pipe.get(pipeId);
        if (p) return p;
      } catch (e) {
        console.warn("Pipe.get(string) failed", e);
      }

      if (numericId !== null) {
        try {
          const p = await base44.entities.Pipe.get(numericId);
          if (p) return p;
        } catch (e) {
          console.warn("Pipe.get(number) failed", e);
        }
      }

      try {
        const byString = await scopedEntities.Pipe.getForUser(user.email, pipeId);
        if (byString) return byString;
      } catch (e) {
        console.warn("Pipe.filter({id: string}) failed", e);
      }

      if (numericId !== null) {
        try {
          const byNum = await scopedEntities.Pipe.getForUser(user.email, numericId);
          if (byNum) return byNum;
        } catch (e) {
          console.warn("Pipe.filter({id: number}) failed", e);
        }
      }

      throw new Error("Pipe not found");
    },
  });

  const isLoading = userLoading || pipeLoading;
  const error = userError || pipeError;

  const { data: blends = [] } = useQuery({
    queryKey: ["blends", user?.email],
    queryFn: async () => {
      try {
        const result = await scopedEntities.TobaccoBlend.listForUser(user?.email);
        return Array.isArray(result) ? result : [];
      } catch (err) {
        console.error("Blends load error:", err);
        return [];
      }
    },
    enabled: !!user?.email,
    retry: 2,
    staleTime: 10000,
  });

  const { data: ownerProfile } = useQuery({
    queryKey: ["user-profile", pipe?.created_by],
    queryFn: async () => {
      const email = pipe?.created_by;
      if (!email) return null;

      const all = [];
      try {
        const byEmail = await base44.entities.UserProfile.filter({ user_email: email });
        if (Array.isArray(byEmail)) all.push(...byEmail);
      } catch {}
      try {
        const byCreated = await base44.entities.UserProfile.filter({ created_by: email });
        if (Array.isArray(byCreated)) all.push(...byCreated);
      } catch {}

      return pickNewestProfile(all);
    },
    enabled: !!pipe?.created_by,
  });

  const isPaidUser = hasPaid;

  const updateMutation = useMutation({
    mutationFn: (data) => safeUpdate("Pipe", pipeId, data, user?.email),
    onSuccess: () => {
      invalidatePipeQueries(queryClient, user?.email);
      setShowEdit(false);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => scopedEntities.Pipe.delete(pipeId),
    onSuccess: () => {
      invalidatePipeQueries(queryClient, user?.email);
      window.location.href = createPageUrl("Pipes");
    },
  });

  const toggleFavorite = () => {
    if (!pipe) return;
    const newValue = !pipe.is_favorite;
    queryClient.setQueryData(["pipe", pipeId, user?.email], (old) => ({
      ...(old || {}),
      is_favorite: newValue,
    }));
    updateMutation.mutate({ is_favorite: newValue });
  };

  const handleValueUpdate = (value) => {
    updateMutation.mutate({ estimated_value: value });
  };

  const handlePipeUpdate = (updates) => {
    if (!pipe) return;
    const { id, created_date, updated_date, ...rest } = pipe;
    updateMutation.mutate({
      ...rest,
      ...updates,
      created_by: pipe.created_by || user?.email,
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen p-8" style={{ background: PAGE_BG }}>
        <div className="max-w-6xl mx-auto">
          <div className="animate-pulse space-y-6">
            <div className="h-8 w-48 bg-white/10 rounded" />
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="aspect-square bg-white/10 rounded-2xl" />
              <div className="space-y-4">
                <div className="h-10 w-64 bg-white/10 rounded" />
                <div className="h-6 w-48 bg-white/10 rounded" />
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!pipe || error) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: PAGE_BG }}>
        <div className="text-center">
          <img
            src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/694956e18d119cc497192525/021ed482a_smoking-pipe-silhouette-vintage-accessories-icon-sign-and-symbol-tobacco-pipe-illustration-vector.jpg"
            alt={t("pipesExtended.pipeNotFound")}
            className="w-24 h-24 mx-auto mb-4 object-contain opacity-50"
            style={{ filter: "brightness(0) saturate(100%) invert(91%) sepia(13%) saturate(485%) hue-rotate(330deg) brightness(100%) contrast(91%)" }}
          />
          <h2 className="text-2xl font-semibold text-[#e8d5b7] mb-2">{t("pipesExtended.pipeNotFound")}</h2>
          <a href={createPageUrl("Pipes")}>
            <Button variant="outline" className="border-[#e8d5b7]/30 text-[#e8d5b7]">
              {t("pipesExtended.backToPipes")}
            </Button>
          </a>
        </div>
      </div>
    );
  }

  const allPhotos = pipe ? [...(pipe.photos || []), ...(pipe.stamping_photos || [])] : [];
  const photoCount = (pipe?.photos || []).length;

  return (
    <div className="min-h-screen" style={{ background: PAGE_BG }}>
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <a href={createPageUrl("Pipes")}>
          <Button variant="ghost" className="mb-6 text-[#e8d5b7] hover:text-[#e8d5b7]/80 hover:bg-white/5">
            <ArrowLeft className="w-4 h-4 mr-2" />
            {t("pipesExtended.backToPipes")}
          </Button>
        </a>

        {blends.length > 0 && (!pipe.focus || pipe.focus.length === 0) && (
          <Card className="mb-6" style={COLLECTOR_CARD_STYLE}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-[#E0D8C8]">
                <Sparkles className="w-5 h-5 text-amber-400" />
                {t("pipeDetailTabs.aiSpecializationSuggestion")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-[#E0D8C8]/70 mb-4">
                {t("pipeDetailTabs.aiSpecializationDesc")}
              </p>
              <SpecializationRecommender
                pipe={pipe}
                onApplyRecommendation={(data) => updateMutation.mutate(data)}
              />
            </CardContent>
          </Card>
        )}

        {blends.length > 0 && (
          <Card className="mb-6" style={COLLECTOR_CARD_STYLE}>
            <CardContent className="p-6">
              <Tabs defaultValue="specialization">
                <TabsList className="grid grid-cols-4 w-full mb-6">
                  <TabsTrigger value="specialization" className="flex items-center gap-1.5">
                    <Target className="w-4 h-4" />
                    <span className="hidden sm:inline">{t("pipeDetailTabs.specialization")}</span>
                    <span className="sm:hidden truncate">{t("pipeDetailTabs.focus")}</span>
                  </TabsTrigger>
                  <TabsTrigger value="condition" className="flex items-center gap-1.5">
                    <Activity className="w-4 h-4" />
                    <span className="hidden sm:inline">{t("pipeDetailTabs.condition")}</span>
                    <span className="sm:hidden truncate">{t("pipeDetailTabs.status")}</span>
                  </TabsTrigger>
                  <TabsTrigger value="maintenance" className="flex items-center gap-1.5">
                    <Wrench className="w-4 h-4" />
                    <span className="hidden sm:inline">{t("pipeDetailTabs.maintenance")}</span>
                    <span className="sm:hidden truncate">{t("pipeDetailTabs.care")}</span>
                  </TabsTrigger>
                  <TabsTrigger value="breakin" className="flex items-center gap-1.5">
                    <Flame className="w-4 h-4" />
                    <span className="hidden sm:inline">{t("pipeDetailTabs.breakIn")}</span>
                    <span className="sm:hidden truncate">{t("pipeDetailTabs.breakInShort")}</span>
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="specialization" className="mt-0">
                  <PipeSpecialization
                    pipe={pipe}
                    blends={blends}
                    onUpdate={(data) => updateMutation.mutate(data)}
                    isPaidUser={isPaidUser}
                  />
                </TabsContent>

                <TabsContent value="condition" className="mt-0">
                  <PipeConditionTracker pipe={pipe} onUpdate={(data) => updateMutation.mutate(data)} />
                </TabsContent>

                <TabsContent value="maintenance" className="mt-0">
                  <MaintenanceLog pipeId={pipeId} pipeName={pipe.name} />
                </TabsContent>

                <TabsContent value="breakin" className="mt-0">
                  <BreakInSchedule pipe={pipe} blends={blends} />
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        )}

        {pipe.interchangeable_bowls && pipe.interchangeable_bowls.length > 0 && (
          <div className="mb-6">
            <InterchangeableBowls pipe={pipe} onUpdate={(data) => updateMutation.mutate(data)} />
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          <div className="space-y-4">
            <motion.div
              className="aspect-[16/9] rounded-2xl overflow-hidden shadow-xl cursor-pointer"
              style={{
                background: "linear-gradient(145deg, rgba(50,40,30,0.7), rgba(40,28,20,0.9))",
                border: "1px solid rgba(140,105,65,0.3)",
                boxShadow: "0 8px 24px rgba(0,0,0,0.55)",
              }}
              layoutId={`pipe-${pipe.id}`}
              onClick={() => allPhotos.length > 0 && setExpandedImage(allPhotos[selectedPhoto])}
            >
              {allPhotos.length > 0 ? (
                <img
                  src={allPhotos[selectedPhoto]}
                  alt={pipe.name}
                  className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <div className="text-stone-400 text-center">
                    <PipeShapeIcon shape={pipe.shape} className="w-24 h-24 mb-4" />
                    <p>{pipe.shape ? t(`shapes.${pipe.shape}`, pipe.shape) : t("pipesExtended.noPhoto")}</p>
                  </div>
                </div>
              )}
            </motion.div>

            {allPhotos.length > 1 && (
              <div className="flex gap-2 overflow-x-auto pb-2">
                {allPhotos.map((photo, idx) => (
                  <button
                    key={idx}
                    onClick={() => setSelectedPhoto(idx)}
                    className={`relative w-20 h-12 rounded-lg overflow-hidden shrink-0 transition-all ${
                      selectedPhoto === idx ? "ring-2 ring-amber-600 ring-offset-2 ring-offset-[#120e0b]" : "opacity-70 hover:opacity-100"
                    }`}
                  >
                    <img src={photo} alt="" className="w-full h-full object-cover" />
                    {idx >= photoCount && (
                      <span className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-[9px] text-center py-0.5 leading-tight">
                        {t("pipesExtended.stamping")}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-6">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <h1 className="text-3xl font-bold text-[#e8d5b7] break-words">{pipe.name}</h1>
                <p className="text-lg text-[#e8d5b7]/70 break-words">{pipe.maker || t("pipesExtended.unknownMaker")}</p>
              </div>
              <div className="flex gap-2 shrink-0">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={toggleFavorite}
                  className={`${pipe.is_favorite ? "text-rose-500" : "text-stone-400"} border-[rgba(140,105,65,0.35)] bg-black/15 hover:bg-white/5`}
                >
                  <Heart className={`w-5 h-5 ${pipe.is_favorite ? "fill-current" : ""}`} />
                </Button>
                <Button variant="outline" size="icon" onClick={() => setShowShare(true)} className="border-[rgba(140,105,65,0.35)] bg-black/15 hover:bg-white/5">
                    <Share2 className="w-5 h-5" />
                  </Button>
                  <Button variant="outline" size="icon" onClick={() => setShowEdit(true)} className="border-[rgba(140,105,65,0.35)] bg-black/15 hover:bg-white/5">
                    <Edit className="w-5 h-5" />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    className="text-rose-500 hover:text-rose-600 border-[rgba(140,105,65,0.35)] bg-black/15 hover:bg-white/5"
                    onClick={() => setShowDelete(true)}
                  >
                    <Trash2 className="w-5 h-5" />
                  </Button>
              </div>
            </div>

            <div className="space-y-3">
              {pipe.purchase_price ? (
                <Card style={SUBPANEL_STYLE}>
                  <CardContent className="p-4 flex items-center gap-3">
                    <DollarSign className="w-5 h-5 text-amber-400" />
                    <div>
                      <p className="text-xs text-[#E0D8C8]/70">{t("pipesExtended.paid")}</p>
                      <p className="font-semibold text-amber-100">{formatCurrency(+pipe.purchase_price)}</p>
                    </div>
                  </CardContent>
                </Card>
              ) : null}
              <ValuationCredibility valuation={computePipeValuation(pipe)} />
            </div>

            <div className="flex flex-wrap gap-2">
              {pipe.ai_excluded === true ? (
                <Badge className="bg-purple-900/50 text-purple-200 border-purple-700/50">
                  {t("formsExtended.collectibleOnly", "Collectible Only")}
                </Badge>
              ) : null}
              {pipe.shape && pipe.shape !== "Unknown" ? (
                <Badge className="bg-amber-700 text-amber-100 border-amber-600/50">
                  {t(`shapes.${pipe.shape}`, pipe.shape)}
                </Badge>
              ) : null}
              {pipe.bowlStyle && pipe.bowlStyle !== "Unknown" ? (
                <Badge className="bg-[#3a2a20]/50 text-[#E0D8C8] border-[#8b6239]/30">
                  {t(`bowlStyles.${pipe.bowlStyle}`, pipe.bowlStyle)}
                </Badge>
              ) : null}
              {pipe.shankShape && pipe.shankShape !== "Unknown" ? (
                <Badge className="bg-[#3a2a20]/50 text-[#E0D8C8] border-[#8b6239]/30">
                  {t("pipesExtended.shank")} {t(`shankShapes.${pipe.shankShape}`, pipe.shankShape)}
                </Badge>
              ) : null}
              {pipe.bend && pipe.bend !== "Unknown" ? (
                <Badge className="bg-[#3a2a20]/50 text-[#E0D8C8] border-[#8b6239]/30">
                  {t(`bends.${pipe.bend}`, pipe.bend)}
                </Badge>
              ) : null}
              {pipe.sizeClass && pipe.sizeClass !== "Unknown" && pipe.sizeClass !== "Standard" ? (
                <Badge className="bg-[#3a2a20]/50 text-[#E0D8C8] border-[#8b6239]/30">
                  {t(`sizeClasses.${pipe.sizeClass}`, pipe.sizeClass)}
                </Badge>
              ) : null}
              {pipe.bowl_material ? (
                <Badge className="bg-[#3a2a20]/50 text-[#E0D8C8] border-[#8b6239]/30">
                  {t(`materials.${pipe.bowl_material}`, pipe.bowl_material)}
                </Badge>
              ) : null}
              {pipe.chamber_volume ? (
                <Badge className="bg-amber-700 text-amber-100 border-amber-600/50">
                  {t(`sizes.${pipe.chamber_volume}`, pipe.chamber_volume)} {t("formsExtended.chamberVolume")}
                </Badge>
              ) : null}
              {pipe.condition ? (
                <Badge className="bg-amber-700 text-amber-100 border-amber-600/50">
                  {t(`conditions.${pipe.condition}`, pipe.condition)}
                </Badge>
              ) : null}
            </div>

            <Card style={COLLECTOR_CARD_STYLE}>
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4 gap-4">
                  <h3 className="text-sm font-semibold text-[#E0D8C8]">{t("pipesExtended.detailsMeasurements")}</h3>
                  <Button variant="ghost" size="sm" onClick={() => setUseImperial(!useImperial)} className="text-[#E0D8C8] hover:bg-white/5">
                    <ArrowLeftRight className="w-3 h-3 mr-2" />
                    {useImperial ? t("units.mm") : t("units.inches")}
                  </Button>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  {pipe.length_mm ? (
                    <div className="flex items-center gap-2">
                      <Ruler className="w-4 h-4 text-[#E0D8C8]/60" />
                      <div>
                        <p className="text-xs text-[#E0D8C8]/60">{t("formsExtended.length")}</p>
                        <p className="font-medium text-[#E0D8C8]">
                          {useImperial ? formatMeasurement(pipe.length_mm / 25.4, "in") : formatMeasurement(pipe.length_mm, "mm")}
                        </p>
                      </div>
                    </div>
                  ) : null}

                  {pipe.weight_grams ? (
                    <div className="flex items-center gap-2">
                      <Weight className="w-4 h-4 text-[#E0D8C8]/60" />
                      <div>
                        <p className="text-xs text-[#E0D8C8]/60">{t("formsExtended.weight")}</p>
                        <p className="font-medium text-[#E0D8C8]">
                          {useImperial ? formatWeight(pipe.weight_grams / 28.35, "oz") : formatWeight(pipe.weight_grams, "g")}
                        </p>
                      </div>
                    </div>
                  ) : null}

                  {pipe.bowl_height_mm ? (
                    <div>
                      <p className="text-xs text-[#E0D8C8]/60">{t("formsExtended.bowlHeight")}</p>
                      <p className="font-medium text-[#E0D8C8]">
                        {useImperial ? formatMeasurement(pipe.bowl_height_mm / 25.4, "in") : formatMeasurement(pipe.bowl_height_mm, "mm")}
                      </p>
                    </div>
                  ) : null}

                  {pipe.bowl_width_mm ? (
                    <div>
                      <p className="text-xs text-[#E0D8C8]/60">{t("formsExtended.bowlWidth")}</p>
                      <p className="font-medium text-[#E0D8C8]">
                        {useImperial ? formatMeasurement(pipe.bowl_width_mm / 25.4, "in") : formatMeasurement(pipe.bowl_width_mm, "mm")}
                      </p>
                    </div>
                  ) : null}

                  {pipe.bowl_diameter_mm ? (
                    <div>
                      <p className="text-xs text-[#E0D8C8]/60">{t("formsExtended.chamberDiameter")}</p>
                      <p className="font-medium text-[#E0D8C8]">
                        {useImperial ? formatMeasurement(pipe.bowl_diameter_mm / 25.4, "in") : formatMeasurement(pipe.bowl_diameter_mm, "mm")}
                      </p>
                    </div>
                  ) : null}

                  {pipe.bowl_depth_mm ? (
                    <div>
                      <p className="text-xs text-[#E0D8C8]/60">{t("formsExtended.chamberDepth")}</p>
                      <p className="font-medium text-[#E0D8C8]">
                        {useImperial ? formatMeasurement(pipe.bowl_depth_mm / 25.4, "in") : formatMeasurement(pipe.bowl_depth_mm, "mm")}
                      </p>
                    </div>
                  ) : null}

                  {pipe.country_of_origin ? (
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-[#E0D8C8]/60" />
                      <div>
                        <p className="text-xs text-[#E0D8C8]/60">{t("pipesExtended.country")}</p>
                        <p className="font-medium text-[#E0D8C8]">{pipe.country_of_origin}</p>
                      </div>
                    </div>
                  ) : null}

                  {pipe.year_made ? (
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-[#E0D8C8]/60" />
                      <div>
                        <p className="text-xs text-[#E0D8C8]/60">{t("pipesExtended.yearMade")}</p>
                        <p className="font-medium text-[#E0D8C8]">{pipe.year_made}</p>
                      </div>
                    </div>
                  ) : null}

                  {pipe.stem_material ? (
                    <div>
                      <p className="text-xs text-[#E0D8C8]/60">{t("pipesExtended.stemMaterial")}</p>
                      <p className="font-medium text-[#E0D8C8]">{t(`stemMaterials.${pipe.stem_material}`, pipe.stem_material)}</p>
                    </div>
                  ) : null}

                  {pipe.finish ? (
                    <div>
                      <p className="text-xs text-[#E0D8C8]/60">{t("pipesExtended.finish")}</p>
                      <p className="font-medium text-[#E0D8C8]">{t(`finishes.${pipe.finish}`, pipe.finish)}</p>
                    </div>
                  ) : null}

                  {pipe.filter_type ? (
                    <div>
                      <p className="text-xs text-[#E0D8C8]/60">{t("pipesExtended.filterType")}</p>
                      <p className="font-medium text-[#E0D8C8]">{t(`filterTypes.${pipe.filter_type}`, pipe.filter_type)}</p>
                    </div>
                  ) : null}
                </div>

                {pipe?.dimensions_found || pipe?.dimensions_source ? (
                  <div className="mt-4 pt-4 border-t border-white/10">
                    <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/15 px-3 py-1 text-xs">
                      <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                      <span className="font-medium text-emerald-200">{t("pipesExtended.verifiedMeasurements")}</span>
                      {pipe?.dimensions_source ? (
                        <span className="text-emerald-300">{t("pipesExtended.source")} {pipe.dimensions_source}</span>
                      ) : null}
                    </div>
                  </div>
                ) : null}
              </CardContent>
            </Card>

            {pipe.stamping ? (
              <Card style={COLLECTOR_CARD_STYLE}>
                <CardContent className="p-6">
                  <p className="text-xs text-[#E0D8C8]/60 mb-1">{t("pipesExtended.stamping")}</p>
                  <p className="font-medium text-[#E0D8C8] break-words">{pipe.stamping}</p>
                </CardContent>
              </Card>
            ) : null}

            {getUsageCharacteristics(pipe) || pipe.notes ? (
              <Card style={COLLECTOR_CARD_STYLE}>
                <CardContent className="p-6 space-y-4">
                  {getUsageCharacteristics(pipe) ? (
                    <div>
                      <p className="text-xs text-[#E0D8C8]/70 mb-1">{t("pipesExtended.usageCharacteristics")}</p>
                      <p className="text-[#E0D8C8]/80 break-words">{getUsageCharacteristics(pipe)}</p>
                    </div>
                  ) : null}
                  {pipe.notes ? (
                    <div>
                      <p className="text-xs text-[#E0D8C8]/70 mb-1">{t("common.notes")}</p>
                      <p className="text-[#E0D8C8]/80 break-words">{pipe.notes}</p>
                    </div>
                  ) : null}
                </CardContent>
              </Card>
            ) : null}
          </div>
        </div>

        <Tabs defaultValue="match" className="space-y-6">
          <TabsList className="p-1 overflow-x-auto flex-nowrap w-full">
            <TabsTrigger value="match" className="shrink-0">
              <Sparkles className="w-4 h-4 mr-2" />
              <span className="hidden sm:inline">{t("pipesExtended.tobaccoMatching")}</span>
              <span className="sm:hidden truncate">{t("pipesExtended.matching")}</span>
            </TabsTrigger>
            <TabsTrigger value="value" className="shrink-0">
              <DollarSign className="w-4 h-4 mr-2" />
              <span className="hidden sm:inline">{t("pipesExtended.valueLookup")}</span>
              <span className="sm:hidden truncate">{t("pipesExtended.value")}</span>
            </TabsTrigger>
            <TabsTrigger value="identify" className="shrink-0">
              <ScanSearch className="w-4 h-4 mr-2" />
              <span className="hidden sm:inline">{t("pipesExtended.identifyPipe", "Identify Pipe")}</span>
              <span className="sm:hidden truncate">{t("pipesExtended.identify", "Identify")}</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="match">
            <Card style={COLLECTOR_CARD_STYLE}>
              <CardContent className="p-6">
                <MatchingEngine pipe={pipe} blends={blends} isPaidUser={isPaidUser} />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="value">
            <Card style={COLLECTOR_CARD_STYLE}>
              <CardContent className="p-6">
                {isPaidUser ? (
                  <ValueLookup pipe={pipe} onUpdateValue={handleValueUpdate} />
                ) : (
                  <UpgradePrompt
                    featureName={t("pipesExtended.valueLookup")}
                    description={t("pipeDetailTabs.valueLookupDesc")}
                  />
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="identify">
            <Card style={COLLECTOR_CARD_STYLE}>
              <CardContent className="p-6">
                {isPaidUser ? (
                  <>
                    <PipeIdentifier pipe={pipe} onUpdatePipe={handlePipeUpdate} />
                    <div className="mt-6 pt-6 border-t border-[rgba(140,105,65,0.35)]">
                      <PipeMeasurementCalculator pipe={pipe} onUpdate={handlePipeUpdate} />
                    </div>
                  </>
                ) : (
                  <UpgradePrompt
                    featureName={t("pipesExtended.identifyPipe")}
                    description={t("pipeDetailTabs.identifyPipeDesc")}
                  />
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <CuratorItemNote moduleType="pipe" item={pipe} />

        {ownerProfile?.allow_comments ? (
          <Card className="mt-8" style={COLLECTOR_CARD_STYLE}>
            <CardContent className="p-6">
              <CommentSection entityType="pipe" entityId={pipeId} entityOwnerEmail={pipe.created_by} />
            </CardContent>
          </Card>
        ) : null}

        <Sheet open={showEdit} onOpenChange={setShowEdit}>
          <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
            <SheetHeader className="mb-6">
              <SheetTitle>{t("pipesPage.editPipe")}</SheetTitle>
            </SheetHeader>
            <PipeForm
              pipe={pipe}
              onSave={(data) => updateMutation.mutate(data)}
              onCancel={() => setShowEdit(false)}
              isLoading={updateMutation.isPending}
            />
          </SheetContent>
        </Sheet>

        <AlertDialog open={showDelete} onOpenChange={setShowDelete}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{t("pipesExtended.deletePipeConfirm")}</AlertDialogTitle>
              <AlertDialogDescription>
                {t("pipesExtended.deletePipeDesc", { name: pipe.name })}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
              <AlertDialogAction onClick={() => deleteMutation.mutate()} className="bg-rose-600 hover:bg-rose-700">
                {t("common.delete")}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <ImageModal imageUrl={expandedImage} isOpen={!!expandedImage} onClose={() => setExpandedImage(null)} alt={pipe.name} />

        <ShareRecordModal
          isOpen={showShare}
          onOpenChange={setShowShare}
          moduleType="pipe"
          record={pipe}
          userProfile={ownerProfile}
          privacySettings={{}}
        />
      </div>
    </div>
  );
}