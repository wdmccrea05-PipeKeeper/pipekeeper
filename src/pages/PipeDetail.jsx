import React, { useState } from 'react';
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { safeUpdate } from "@/components/utils/safeUpdate";
import { invalidatePipeQueries } from "@/components/utils/cacheInvalidation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { formatCurrency } from "@/components/utils/localeFormatters";
import { 
  ArrowLeft, Edit, Trash2, Heart, DollarSign, 
  Sparkles, ScanSearch, Ruler, Calendar, MapPin, ArrowLeftRight, Weight, CheckCircle2,
  Target, Activity, Wrench, Flame
} from "lucide-react";
import { createPageUrl } from "@/components/utils/createPageUrl";
import { motion } from "framer-motion";
import { getEffectiveEntitlement } from "@/components/utils/getEffectiveEntitlement";
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

export default function PipeDetailPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const urlParams = new URLSearchParams(window.location.search);
  const pipeId = urlParams.get("id")?.trim();

  const [showEdit, setShowEdit] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState(0);
  const [expandedImage, setExpandedImage] = useState(null);

  const queryClient = useQueryClient();
  const { useImperial, setUseImperial } = useMeasurement();

  const { data: user, isLoading: userLoading, error: userError } = useQuery({
    queryKey: ['current-user'],
    queryFn: () => base44.auth.me(),
    staleTime: 10000,
    retry: 2,
    refetchOnMount: 'always',
  });

  const { data: pipe, isLoading: pipeLoading, error: pipeError } = useQuery({
    queryKey: ['pipe', pipeId, user?.email],
    enabled: !!pipeId && !!user?.email && !userLoading,
    retry: false,
    queryFn: async () => {
      if (!pipeId) throw new Error('Missing pipe ID');

      const isNumeric = /^\d+$/.test(pipeId);
      const numericId = isNumeric ? Number(pipeId) : null;

      // 1) Try get() with the raw string id
      try {
        const p = await base44.entities.Pipe.get(pipeId);
        if (p) return p;
      } catch (e) {
        console.warn("Pipe.get(string) failed", {
          pipeId,
          message: e?.message,
          status: e?.status,
          response: e?.response,
          e
        });
      }

      // 2) If it looks numeric, try get() with a number id
      if (numericId !== null) {
        try {
          const p = await base44.entities.Pipe.get(numericId);
          if (p) return p;
        } catch (e) {
          console.warn("Pipe.get(number) failed", {
            numericId,
            message: e?.message,
            status: e?.status,
            response: e?.response,
            e
          });
        }
      }

      // 3) Fallback: filter by id with ownership check
      try {
        const byString = await base44.entities.Pipe.filter({ id: pipeId, created_by: user.email });
        if (Array.isArray(byString) && byString.length) return byString[0];
      } catch (e) {
        console.warn("Pipe.filter({id: string}) failed", {
          pipeId,
          message: e?.message,
          status: e?.status,
          response: e?.response,
          e
        });
      }

      if (numericId !== null) {
        try {
          const byNum = await base44.entities.Pipe.filter({ id: numericId, created_by: user.email });
          if (Array.isArray(byNum) && byNum.length) return byNum[0];
        } catch (e) {
          console.warn("Pipe.filter({id: number}) failed", {
            numericId,
            message: e?.message,
            status: e?.status,
            response: e?.response,
            e
          });
        }
      }

      throw new Error('Pipe not found');
    },
  });

  const isLoading = userLoading || pipeLoading;
  const error = userError || pipeError;

  const { data: blends = [] } = useQuery({
    queryKey: ['blends', user?.email],
    queryFn: async () => {
      try {
        const result = await base44.entities.TobaccoBlend.filter({ created_by: user?.email });
        return Array.isArray(result) ? result : [];
      } catch (err) {
        console.error('Blends load error:', err);
        return [];
      }
    },
    enabled: !!user?.email,
    retry: 2,
    staleTime: 10000,
  });

  const { data: userProfile } = useQuery({
    queryKey: ['user-profile', user?.email],
    queryFn: async () => {
      const profiles = await base44.entities.UserProfile.filter({ user_email: user?.email });
      return profiles[0];
    },
    enabled: !!user?.email,
  });

  // Canonical premium access check
  const effective = getEffectiveEntitlement(user);
  const isPaidUser = effective === "pro" || effective === "premium";

  const updateMutation = useMutation({
    mutationFn: (data) => safeUpdate('Pipe', pipeId, data, user?.email),
    onSuccess: () => {
      invalidatePipeQueries(queryClient, user?.email);
      setShowEdit(false);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => base44.entities.Pipe.delete(pipeId),
    onSuccess: () => {
      invalidatePipeQueries(queryClient, user?.email);
      window.location.href = createPageUrl('Pipes');
    },
  });

  const toggleFavorite = () => {
    if (!pipe) return;
    const newValue = !pipe.is_favorite;
    queryClient.setQueryData(['pipe', pipeId, user?.email], (old) => ({
      ...(old || {}),
      is_favorite: newValue
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
      <div className="min-h-screen bg-gradient-to-br from-[#1a2c42] via-[#243548] to-[#1a2c42] p-8">
        <div className="max-w-6xl mx-auto">
          <div className="animate-pulse space-y-6">
            <div className="h-8 w-48 bg-stone-200 rounded" />
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="aspect-square bg-stone-200 rounded-2xl" />
              <div className="space-y-4">
                <div className="h-10 w-64 bg-stone-200 rounded" />
                <div className="h-6 w-48 bg-stone-200 rounded" />
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!pipe || error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#1a2c42] via-[#243548] to-[#1a2c42] flex items-center justify-center">
        <div className="text-center">
          <img 
            src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/694956e18d119cc497192525/021ed482a_smoking-pipe-silhouette-vintage-accessories-icon-sign-and-symbol-tobacco-pipe-illustration-vector.jpg"
            alt={t("pipesExtended.pipeNotFound")}
            className="w-24 h-24 mx-auto mb-4 object-contain opacity-50"
            style={{ filter: 'brightness(0) saturate(100%) invert(91%) sepia(13%) saturate(485%) hue-rotate(330deg) brightness(100%) contrast(91%)' }}
          />
          <h2 className="text-2xl font-semibold text-[#e8d5b7] mb-2">{t("pipesExtended.pipeNotFound")}</h2>
          <a href={createPageUrl('Pipes')}>
            <Button variant="outline" className="border-[#e8d5b7]/30 text-[#e8d5b7]">{t("pipesExtended.backToPipes")}</Button>
          </a>
        </div>
      </div>
    );
  }

  const allPhotos = pipe ? [...(pipe.photos || []), ...(pipe.stamping_photos || [])] : [];

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#1a2c42] via-[#243548] to-[#1a2c42]">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Back Button */}
        <a href={createPageUrl('Pipes')}>
          <Button variant="ghost" className="mb-6 text-[#e8d5b7] hover:text-[#e8d5b7]/80">
            <ArrowLeft className="w-4 h-4 mr-2" />
            {t("pipesExtended.backToPipes")}
          </Button>
        </a>

        {/* AI Specialization Suggestion - show prominently for pipes without focus */}
        {blends.length > 0 && (!pipe.focus || pipe.focus.length === 0) && (
          <Card className="mb-6 border-[#A35C5C]/50" variant="elevated">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-[#E0D8C8]">
                <Sparkles className="w-5 h-5" />
                {t("pipeDetailTabs.aiSpecializationSuggestion", "AI Specialization Suggestion")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-[#E0D8C8]/70 mb-4">
                {t("pipeDetailTabs.aiSpecializationDesc", "Get personalized recommendations on what tobacco types this pipe would be best suited for based on its characteristics and your collection.")}
              </p>
              <SpecializationRecommender 
                pipe={pipe}
                onApplyRecommendation={(data) => updateMutation.mutate(data)}
              />
            </CardContent>
          </Card>
        )}

        {/* Pipe Management Card with Tabs */}
        {blends.length > 0 && (
          <Card className="mb-6">
            <CardContent className="p-6">
              <Tabs defaultValue="specialization">
                <TabsList className="grid grid-cols-4 w-full mb-6">
                 <TabsTrigger value="specialization" className="flex items-center gap-1.5">
                   <Target className="w-4 h-4" />
                   <span className="hidden sm:inline">{t("pipeDetailTabs.specialization")}</span>
                   <span className="sm:hidden">{t("pipeDetailTabs.focus")}</span>
                 </TabsTrigger>
                 <TabsTrigger value="condition" className="flex items-center gap-1.5">
                   <Activity className="w-4 h-4" />
                   <span className="hidden sm:inline">{t("pipeDetailTabs.condition")}</span>
                   <span className="sm:hidden">{t("pipeDetailTabs.status")}</span>
                 </TabsTrigger>
                 <TabsTrigger value="maintenance" className="flex items-center gap-1.5">
                   <Wrench className="w-4 h-4" />
                   <span className="hidden sm:inline">{t("pipeDetailTabs.maintenance")}</span>
                   <span className="sm:hidden">{t("pipeDetailTabs.care")}</span>
                 </TabsTrigger>
                 <TabsTrigger value="breakin" className="flex items-center gap-1.5">
                   <Flame className="w-4 h-4" />
                   <span className="hidden sm:inline">{t("pipeDetailTabs.breakIn")}</span>
                   <span className="sm:hidden">{t("common.hide").slice(0,5)}</span>
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
                  <PipeConditionTracker 
                    pipe={pipe}
                    onUpdate={(data) => updateMutation.mutate(data)}
                  />
                </TabsContent>

                <TabsContent value="maintenance" className="mt-0">
                  <MaintenanceLog 
                    pipeId={pipeId}
                    pipeName={pipe.name}
                  />
                </TabsContent>

                <TabsContent value="breakin" className="mt-0">
                  <BreakInSchedule pipe={pipe} blends={blends} />
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        )}

        {/* Interchangeable Bowls */}
        {pipe.interchangeable_bowls && pipe.interchangeable_bowls.length > 0 && (
          <div className="mb-6">
            <InterchangeableBowls 
              pipe={pipe} 
              onUpdate={(data) => updateMutation.mutate(data)}
            />
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Photo Gallery */}
          <div className="space-y-4">
            <motion.div 
              className="aspect-[16/9] rounded-2xl overflow-hidden bg-gradient-to-br from-stone-100 to-stone-200 shadow-xl cursor-pointer"
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
                    <PipeShapeIcon shape={pipe.shape} className="text-9xl mb-4" />
                    <p>{pipe.shape || t("pipesExtended.noPhoto")}</p>
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
                    className={`w-20 h-12 rounded-lg overflow-hidden shrink-0 transition-all ${
                      selectedPhoto === idx 
                        ? 'ring-2 ring-amber-600 ring-offset-2' 
                        : 'opacity-70 hover:opacity-100'
                    }`}
                  >
                    <img src={photo} alt="" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Pipe Details */}
          <div className="space-y-6">
            <div className="flex items-start justify-between">
              <div>
                <h1 className="text-3xl font-bold text-[#e8d5b7]">{pipe.name}</h1>
                <p className="text-lg text-[#e8d5b7]/70">{pipe.maker || t("pipesExtended.unknownMaker")}</p>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={toggleFavorite}
                  className={pipe.is_favorite ? 'text-rose-500' : 'text-stone-400'}
                >
                  <Heart className={`w-5 h-5 ${pipe.is_favorite ? 'fill-current' : ''}`} />
                </Button>
                <Button variant="outline" size="icon" onClick={() => setShowEdit(true)}>
                  <Edit className="w-5 h-5" />
                </Button>
                <Button 
                  variant="outline" 
                  size="icon" 
                  className="text-rose-500 hover:text-rose-600"
                  onClick={() => setShowDelete(true)}
                >
                  <Trash2 className="w-5 h-5" />
                </Button>
              </div>
            </div>

            {/* Quick Info */}
            <div className="grid grid-cols-2 gap-4">
              {pipe.estimated_value && (
                <Card className="border-emerald-500/30 bg-emerald-500/15">
                  <CardContent className="p-4 flex items-center gap-3">
                    <DollarSign className="w-5 h-5 text-emerald-400" />
                    <div>
                      <p className="text-xs text-[#E0D8C8]/70">{t("pipesExtended.estValue")}</p>
                      <p className="font-semibold text-emerald-200">{formatCurrency(+pipe.estimated_value)}</p>
                    </div>
                  </CardContent>
                </Card>
              )}
              {pipe.purchase_price && (
                <Card className="border-amber-500/30 bg-amber-500/15">
                  <CardContent className="p-4 flex items-center gap-3">
                    <DollarSign className="w-5 h-5 text-amber-400" />
                    <div>
                      <p className="text-xs text-[#E0D8C8]/70">{t("pipesExtended.paid")}</p>
                      <p className="font-semibold text-amber-200">{formatCurrency(+pipe.purchase_price)}</p>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Badges */}
            <div className="flex flex-wrap gap-2">
              {pipe.shape && pipe.shape !== 'Unknown' && (
                <Badge className="bg-amber-700 text-amber-100 border-amber-600/50">
                  {pipe.shape}
                </Badge>
              )}
              {pipe.bowlStyle && pipe.bowlStyle !== 'Unknown' && (
                <Badge className="bg-purple-700 text-purple-100 border-purple-600/50">
                  {pipe.bowlStyle}
                </Badge>
              )}
              {pipe.shankShape && pipe.shankShape !== 'Unknown' && (
                <Badge className="bg-teal-700 text-teal-100 border-teal-600/50">
                  {t("pipesExtended.shank")} {pipe.shankShape}
                </Badge>
              )}
              {pipe.bend && pipe.bend !== 'Unknown' && (
                <Badge className="bg-indigo-700 text-indigo-100 border-indigo-600/50">
                  {pipe.bend}
                </Badge>
              )}
              {pipe.sizeClass && pipe.sizeClass !== 'Unknown' && pipe.sizeClass !== 'Standard' && (
                <Badge className="bg-orange-700 text-orange-100 border-orange-600/50">
                  {pipe.sizeClass}
                </Badge>
              )}
              {pipe.bowl_material && (
                <Badge className="bg-slate-700 text-slate-100 border-slate-600/50">
                  {pipe.bowl_material}
                </Badge>
              )}
              {pipe.chamber_volume && (
                <Badge className="bg-amber-700 text-amber-100 border-amber-600/50">
                  {t(`sizes.${pipe.chamber_volume}`, pipe.chamber_volume)} {t("pipesExtended.chamber")}
                </Badge>
              )}
              {pipe.condition && (
                <Badge className="bg-blue-700 text-blue-100 border-blue-600/50">
                  {pipe.condition}
                </Badge>
              )}
            </div>

            {/* Details Grid */}
             <Card className="border-white/10">
               <CardContent className="p-6">
                 <div className="flex items-center justify-between mb-4">
                   <h3 className="text-sm font-semibold text-[#E0D8C8]">{t("pipesExtended.detailsMeasurements")}</h3>
                   <Button
                     variant="ghost"
                     size="sm"
                     onClick={() => setUseImperial(!useImperial)}
                   >
                     <ArrowLeftRight className="w-3 h-3 mr-2" />
                     {useImperial ? t("units.mm") : t("units.inches")}
                   </Button>
                 </div>
                 <div className="grid grid-cols-2 gap-4">
                   {pipe.length_mm && (
                     <div className="flex items-center gap-2">
                       <Ruler className="w-4 h-4 text-[#E0D8C8]/60" />
                       <div>
                         <p className="text-xs text-[#E0D8C8]/60">{t("formsExtended.length")}</p>
                         <p className="font-medium text-[#E0D8C8]">
                          {useImperial ? `${(pipe.length_mm / 25.4).toFixed(2)}"` : `${pipe.length_mm.toFixed(0)} mm`}
                         </p>
                      </div>
                    </div>
                  )}
                  {pipe.weight_grams && (
                    <div className="flex items-center gap-2">
                      <Weight className="w-4 h-4 text-[#E0D8C8]/60" />
                      <div>
                        <p className="text-xs text-[#E0D8C8]/60">{t("formsExtended.weight")}</p>
                        <p className="font-medium text-[#E0D8C8]">
                          {useImperial ? `${(pipe.weight_grams / 28.35).toFixed(2)} oz` : `${pipe.weight_grams.toFixed(0)} g`}
                        </p>
                      </div>
                    </div>
                  )}
                  {pipe.bowl_height_mm && (
                    <div>
                      <p className="text-xs text-[#E0D8C8]/60">{t("formsExtended.bowlHeight")}</p>
                      <p className="font-medium text-[#E0D8C8]">
                        {useImperial ? `${(pipe.bowl_height_mm / 25.4).toFixed(2)}"` : `${pipe.bowl_height_mm.toFixed(0)} mm`}
                      </p>
                    </div>
                  )}
                  {pipe.bowl_width_mm && (
                    <div>
                      <p className="text-xs text-[#E0D8C8]/60">{t("formsExtended.bowlWidth")}</p>
                      <p className="font-medium text-[#E0D8C8]">
                        {useImperial ? `${(pipe.bowl_width_mm / 25.4).toFixed(2)}"` : `${pipe.bowl_width_mm.toFixed(0)} mm`}
                      </p>
                    </div>
                  )}
                  {pipe.bowl_diameter_mm && (
                    <div>
                      <p className="text-xs text-[#E0D8C8]/60">{t("formsExtended.chamberDiameter")}</p>
                      <p className="font-medium text-[#E0D8C8]">
                        {useImperial ? `${(pipe.bowl_diameter_mm / 25.4).toFixed(2)}"` : `${(pipe.bowl_diameter_mm).toFixed(2)}mm`}
                      </p>
                    </div>
                  )}
                  {pipe.bowl_depth_mm && (
                    <div>
                      <p className="text-xs text-[#E0D8C8]/60">{t("formsExtended.chamberDepth")}</p>
                      <p className="font-medium text-[#E0D8C8]">
                        {useImperial ? `${(pipe.bowl_depth_mm / 25.4).toFixed(2)}"` : `${(pipe.bowl_depth_mm).toFixed(2)}mm`}
                      </p>
                    </div>
                  )}
                  {pipe.country_of_origin && (
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-[#E0D8C8]/60" />
                      <div>
                        <p className="text-xs text-[#E0D8C8]/60">{t("pipesExtended.origin")}</p>
                        <p className="font-medium text-[#E0D8C8]">{pipe.country_of_origin}</p>
                      </div>
                    </div>
                  )}
                  {pipe.year_made && (
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-[#E0D8C8]/60" />
                      <div>
                        <p className="text-xs text-[#E0D8C8]/60">{t("pipesExtended.year")}</p>
                        <p className="font-medium text-[#E0D8C8]">{pipe.year_made}</p>
                      </div>
                    </div>
                  )}
                  {pipe.stem_material && (
                    <div>
                      <p className="text-xs text-[#E0D8C8]/60">{t("pipesExtended.stem")}</p>
                      <p className="font-medium text-[#E0D8C8]">{pipe.stem_material}</p>
                    </div>
                  )}
                  {pipe.finish && (
                    <div>
                      <p className="text-xs text-[#E0D8C8]/60">{t("formsExtended.finish")}</p>
                      <p className="font-medium text-[#E0D8C8]">{pipe.finish}</p>
                    </div>
                  )}
                  {pipe.filter_type && (
                    <div>
                      <p className="text-xs text-[#E0D8C8]/60">{t("pipesExtended.filter")}</p>
                      <p className="font-medium text-[#E0D8C8]">{pipe.filter_type}</p>
                    </div>
                  )}
                </div>
                {(pipe?.dimensions_found || pipe?.dimensions_source) && (
                  <div className="mt-4 pt-4 border-t border-white/10">
                      <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/15 px-3 py-1 text-xs">
                        <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                        <span className="font-medium text-emerald-200">{t("pipesExtended.verifiedMeasurements")}</span>
                        {pipe?.dimensions_source && (
                          <span className="text-emerald-300">{t("pipesExtended.source")} {pipe.dimensions_source}</span>
                        )}
                      </div>
                    </div>
                )}
              </CardContent>
            </Card>

            {/* Stamping */}
             {pipe.stamping && (
               <Card className="border-white/10">
                 <CardContent className="p-6">
                   <p className="text-xs text-[#E0D8C8]/60 mb-1">{t("pipesExtended.stamping")}</p>
                   <p className="font-medium text-[#E0D8C8]">{pipe.stamping}</p>
                </CardContent>
              </Card>
            )}

            {/* Notes */}
            {(getUsageCharacteristics(pipe) || pipe.notes) && (
              <Card className="border-white/10">
                <CardContent className="p-6 space-y-4">
                  {getUsageCharacteristics(pipe) && (
                    <div>
                      <p className="text-xs text-[#E0D8C8]/70 mb-1">{t("formsExtended.usageCharacteristics")}</p>
                      <p className="text-[#E0D8C8]/80">{getUsageCharacteristics(pipe)}</p>
                    </div>
                  )}
                  {pipe.notes && (
                    <div>
                      <p className="text-xs text-[#E0D8C8]/70 mb-1">{t("formsExtended.notes")}</p>
                      <p className="text-[#E0D8C8]/80">{pipe.notes}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        </div>

        {/* AI Features Tabs */}
        <Tabs defaultValue="match" className="space-y-6">
          <TabsList className="bg-transparent border border-white/10 p-1 overflow-x-auto flex-nowrap w-full">
            <TabsTrigger value="match" className="data-[state=active]:bg-[#A35C5C] data-[state=active]:text-[#E0D8C8] text-[#E0D8C8]/70 shrink-0">
              <Sparkles className="w-4 h-4 mr-2" />
              <span className="hidden sm:inline">{t("pipesExtended.tobaccoMatching")}</span>
              <span className="sm:hidden">{t("pipesExtended.matching")}</span>
            </TabsTrigger>
            <TabsTrigger value="value" className="data-[state=active]:bg-[#A35C5C] data-[state=active]:text-[#E0D8C8] text-[#E0D8C8]/70 shrink-0">
              <DollarSign className="w-4 h-4 mr-2" />
              <span className="hidden sm:inline">{t("pipesExtended.valueLookup")}</span>
              <span className="sm:hidden">{t("pipesExtended.value")}</span>
            </TabsTrigger>
            <TabsTrigger value="identify" className="data-[state=active]:bg-[#A35C5C] data-[state=active]:text-[#E0D8C8] text-[#E0D8C8]/70 shrink-0">
              <ScanSearch className="w-4 h-4 mr-2" />
              <span className="hidden sm:inline">{t("pipesExtended.identifyPipe")}</span>
              <span className="sm:hidden">{t("pipesExtended.identify")}</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="match">
            <Card className="bg-[#182838] border-[#465C6E]">
              <CardContent className="p-6">
                <MatchingEngine pipe={pipe} blends={blends} isPaidUser={isPaidUser} />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="value">
            <Card className="bg-[#182838] border-[#465C6E]">
              <CardContent className="p-6">
                {isPaidUser ? (
                  <ValueLookup pipe={pipe} onUpdateValue={handleValueUpdate} />
                ) : (
                  <UpgradePrompt 
                    featureName={t("pipesExtended.valueLookup")}
                    description={t("pipeDetailTabs.valueLookupDesc", "Get instant market value estimates for your pipes based on maker, model, condition, and current market trends.")}
                  />
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="identify">
            <Card className="bg-[#182838] border-[#465C6E]">
              <CardContent className="p-6">
                {isPaidUser ? (
                  <>
                    <PipeIdentifier pipe={pipe} onUpdatePipe={handlePipeUpdate} />
                    <div className="mt-6 pt-6 border-t border-[#465C6E]">
                      <PipeMeasurementCalculator pipe={pipe} onUpdate={handlePipeUpdate} />
                    </div>
                  </>
                ) : (
                  <UpgradePrompt 
                    featureName={t("pipesExtended.identifyPipe")}
                    description={t("pipeDetailTabs.identifyPipeDesc", "Use advanced AI to identify your pipe's maker, model, year, and other details from photos of stampings and characteristics.")}
                  />
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Comments Section */}
        {userProfile?.allow_comments && (
          <Card className="border-white/10 mt-8">
            <CardContent className="p-6">
              <CommentSection
                entityType="pipe"
                entityId={pipeId}
                entityOwnerEmail={pipe.created_by}
              />
            </CardContent>
          </Card>
        )}

        {/* Edit Sheet */}
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

        {/* Delete Dialog */}
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
              <AlertDialogAction 
                onClick={() => deleteMutation.mutate()}
                className="bg-rose-600 hover:bg-rose-700"
              >
                {t("common.delete")}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Image Modal */}
        <ImageModal 
          imageUrl={expandedImage}
          isOpen={!!expandedImage}
          onClose={() => setExpandedImage(null)}
          alt={pipe.name}
        />
      </div>
    </div>
  );
}