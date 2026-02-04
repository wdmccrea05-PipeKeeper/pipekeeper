import React, { useState, useEffect } from 'react';
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { safeUpdate } from "@/components/utils/safeUpdate";
import { invalidateBlendQueries } from "@/components/utils/cacheInvalidation";
import { getTobaccoLogo, GENERIC_TOBACCO_ICON } from "@/components/tobacco/TobaccoLogoLibrary";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  ArrowLeft, Edit, Trash2, Heart, Star, Package
} from "lucide-react";
import { createPageUrl } from "@/components/utils/createPageUrl";
import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
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
import TobaccoForm from "@/components/tobacco/TobaccoForm";
import TopPipeMatches from "@/components/tobacco/TopPipeMatches";
import TobaccoContainerManager from "@/components/tobacco/TobaccoContainerManager";
import TobaccoInventoryManager from "@/components/tobacco/TobaccoInventoryManager";
import OpenInventorySummary from "@/components/tobacco/OpenInventorySummary";
import CommentSection from "@/components/community/CommentSection";
import ImageModal from "@/components/ui/ImageModal";
import CellarLog from "@/components/tobacco/CellarLog";
import TobaccoValuation from "@/components/tobacco/TobaccoValuation";

const BLEND_COLORS = {
  "Virginia": "bg-yellow-100 text-yellow-800 border-yellow-200",
  "Virginia/Perique": "bg-orange-100 text-orange-800 border-orange-200",
  "English": "bg-stone-700 text-white border-stone-600",
  "Balkan": "bg-stone-600 text-white border-stone-500",
  "Aromatic": "bg-purple-100 text-purple-800 border-purple-200",
  "Burley": "bg-amber-100 text-amber-800 border-amber-200",
  "Virginia/Burley": "bg-yellow-200 text-yellow-900 border-yellow-300",
  "Latakia Blend": "bg-stone-800 text-white border-stone-700",
  "Oriental/Turkish": "bg-rose-100 text-rose-800 border-rose-200",
  "Navy Flake": "bg-blue-100 text-blue-800 border-blue-200",
  "Dark Fired": "bg-stone-500 text-white border-stone-400",
  "Cavendish": "bg-amber-200 text-amber-900 border-amber-300",
};

export default function TobaccoDetailPage() {
  const { t } = useTranslation();
  const urlParams = new URLSearchParams(window.location.search);
  const blendId = urlParams.get('id');

  const [showEdit, setShowEdit] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [expandedImage, setExpandedImage] = useState(null);

  const queryClient = useQueryClient();

  const { data: user } = useQuery({
    queryKey: ['current-user'],
    queryFn: () => base44.auth.me(),
    staleTime: 10000,
    retry: 2,
    refetchOnMount: 'always',
  });

  const { data: blend, isLoading: blendLoading, error: blendError } = useQuery({
    queryKey: ['blend', blendId, user?.email],
    enabled: !!blendId && !!user?.email,
    retry: false,
    queryFn: async () => {
      if (!blendId) throw new Error('Missing blend ID');

      try {
        const p = await base44.entities.TobaccoBlend.get(blendId);
        if (p) return p;
      } catch (e) {
        console.warn("TobaccoBlend.get failed", {
          blendId,
          message: e?.message,
          status: e?.status,
          response: e?.response,
          e
        });
      }

      try {
        const arr = await base44.entities.TobaccoBlend.filter({ id: blendId, created_by: user.email });
        if (Array.isArray(arr) && arr.length) return arr[0];
      } catch (e) {
        console.warn("TobaccoBlend.filter failed", {
          blendId,
          message: e?.message,
          status: e?.status,
          response: e?.response,
          e
        });
      }

      throw new Error('Blend not found');
    },
  });

  const isLoading = blendLoading;

  // Auto-populate logo from library if missing
  useEffect(() => {
    if (blend && blend.manufacturer && !blend.logo && !updateMutation.isPending && user?.email) {
      const libraryLogo = getTobaccoLogo(blend.manufacturer);
      if (libraryLogo && libraryLogo !== GENERIC_TOBACCO_ICON) {
        updateMutation.mutate({
          logo: libraryLogo,
        });
      }
    }
  }, [blend?.id, user?.email]);

  const { data: pipes = [] } = useQuery({
    queryKey: ['pipes', user?.email],
    queryFn: async () => {
      try {
        const result = await base44.entities.Pipe.filter({ created_by: user?.email });
        return Array.isArray(result) ? result : [];
      } catch (err) {
        console.error('Pipes load error:', err);
        return [];
      }
    },
    enabled: !!user?.email,
    retry: 1,
    staleTime: 5000,
  });

  const { data: userProfile } = useQuery({
    queryKey: ['user-profile', blend?.created_by],
    queryFn: async () => {
      const profiles = await base44.entities.UserProfile.filter({ user_email: blend.created_by });
      return profiles[0];
    },
    enabled: !!blend?.created_by,
  });

  const updateMutation = useMutation({
    mutationFn: (data) => safeUpdate('TobaccoBlend', blendId, data, user?.email),
    onMutate: async (newData) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['blend', blendId, user?.email] });
      
      // Snapshot previous value
      const previousBlend = queryClient.getQueryData(['blend', blendId, user?.email]);
      
      // Optimistically update
      queryClient.setQueryData(['blend', blendId, user?.email], (old) => ({
        ...old,
        ...newData
      }));
      
      return { previousBlend };
    },
    onError: (err, newData, context) => {
      // Rollback on error
      queryClient.setQueryData(['blend', blendId, user?.email], context.previousBlend);
    },
    onSuccess: () => {
      invalidateBlendQueries(queryClient, user?.email);
      setShowEdit(false);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => base44.entities.TobaccoBlend.delete(blendId),
    onSuccess: () => {
      window.location.href = createPageUrl('Tobacco');
    },
  });

  const toggleFavorite = () => {
    if (!blend) return;
    const newValue = !blend.is_favorite;
    queryClient.setQueryData(['blend', blendId, user?.email], (old) => ({
      ...(old || {}),
      is_favorite: newValue
    }));
    updateMutation.mutate({
      is_favorite: newValue,
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#1a2c42] via-[#243548] to-[#1a2c42] p-8">
        <div className="max-w-4xl mx-auto">
          <div className="animate-pulse space-y-6">
            <div className="h-8 w-48 bg-stone-200 rounded" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
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

  if (!blend) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#1a2c42] via-[#243548] to-[#1a2c42] flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">🍂</div>
          <h2 className="text-2xl font-semibold text-stone-800 mb-2">{t("tobaccoExtended.blendNotFound")}</h2>
          <a href={createPageUrl('Tobacco')}>
            <Button variant="outline">{t("tobaccoExtended.backToTobacco")}</Button>
          </a>
        </div>
      </div>
    );
  }

  const colorClass = BLEND_COLORS[blend.blend_type] || "bg-stone-100 text-stone-800 border-stone-200";

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#1a2c42] via-[#243548] to-[#1a2c42]">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Back Button */}
        <a href={createPageUrl('Tobacco')}>
          <Button variant="ghost" className="mb-6 text-[#e8d5b7] hover:text-[#e8d5b7]/80">
            <ArrowLeft className="w-4 h-4 mr-2" />
            {t("tobaccoExtended.backToTobacco")}
          </Button>
        </a>



        {/* Desktop layout: logo + cellaring side-by-side, details below */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
          {/* Left column: Photo + Cellaring */}
          <div className="space-y-6">
            {/* Photo */}
            <motion.div 
              className="aspect-square rounded-2xl overflow-hidden bg-white shadow-xl cursor-pointer"
              layoutId={`blend-${blend.id}`}
              onClick={() => setExpandedImage(blend.logo || blend.photo)}
            >
              {blend.logo || blend.photo ? (
                <img 
                  src={blend.logo || blend.photo} 
                  alt={blend.name}
                  className={`w-full h-full ${blend.logo ? 'object-contain p-6' : 'object-cover'} hover:scale-105 transition-transform duration-300`}
                  onError={(e) => {
                    e.target.style.display = 'none';
                    const fallbackLogo = getTobaccoLogo(blend.manufacturer);
                    e.target.parentElement.innerHTML = '<div class="w-full h-full flex items-center justify-center bg-white p-6"><img src="' + fallbackLogo + '" class="w-full h-full object-contain" /></div>';
                  }}
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-white p-6">
                  <img 
                    src={getTobaccoLogo(blend.manufacturer)} 
                    alt={blend.manufacturer || 'Tobacco'}
                    className="w-full h-full object-contain"
                    onError={(e) => {
                      e.target.style.display = 'none';
                      e.target.parentElement.innerHTML = '<div class="w-full h-full flex items-center justify-center"><div class="text-amber-600 text-8xl">🍂</div></div>';
                    }}
                  />
                </div>
              )}
            </motion.div>

            {/* Inventory & Cellaring Management */}
            <Card className="bg-[#5a6a7a]/90 border-[#A35C5C]/30 overflow-hidden">
              <Tabs defaultValue="containers" className="w-full">
                <div className="border-b border-[#A35C5C]/30 overflow-x-auto">
                  <TabsList className="w-full justify-start bg-transparent h-auto p-0 rounded-none inline-flex min-w-full">
                    <TabsTrigger 
                      value="containers" 
                      className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-[#D1A75D] data-[state=active]:text-[#E0D8C8] rounded-none px-3 sm:px-4 py-3 text-xs sm:text-sm whitespace-nowrap flex-shrink-0 text-[#E0D8C8]/70"
                    >
                      <span className="hidden sm:inline">{t("tobaccoExtended.openTobacco")}</span>
                      <span className="sm:hidden">{t("tobaccoExtended.open")}</span>
                    </TabsTrigger>
                    <TabsTrigger 
                      value="log" 
                      className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-[#D1A75D] data-[state=active]:text-[#E0D8C8] rounded-none px-3 sm:px-4 py-3 text-xs sm:text-sm whitespace-nowrap flex-shrink-0 text-[#E0D8C8]/70"
                    >
                      <span className="hidden sm:inline">{t("cellarLog.cellaredTobacco")}</span>
                      <span className="sm:hidden">{t("tobaccoExtended.cellared")}</span>
                    </TabsTrigger>
                    <TabsTrigger 
                      value="inventory" 
                      className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-[#D1A75D] data-[state=active]:text-[#E0D8C8] rounded-none px-3 sm:px-4 py-3 text-xs sm:text-sm whitespace-nowrap flex-shrink-0 text-[#E0D8C8]/70"
                    >
                      {t("tobaccoExtended.inventory")}
                    </TabsTrigger>
                  </TabsList>
                </div>

                <TabsContent value="containers" className="m-0">
                  <div className="p-4">
                    <OpenInventorySummary blend={blend} />
                  </div>
                </TabsContent>

                <TabsContent value="log" className="m-0">
                  <div className="p-4">
                    <CellarLog blend={blend} />
                  </div>
                </TabsContent>

                <TabsContent value="inventory" className="m-0">
                  <div className="p-4">
                    <TobaccoInventoryManager 
                      blend={blend}
                      onUpdate={(data) => updateMutation.mutate(data)}
                      isUpdating={updateMutation.isPending}
                    />
                  </div>
                </TabsContent>
              </Tabs>
            </Card>
          </div>

          {/* Right column: Blend Details */}
          <div className="space-y-6">
            <div className="flex items-start justify-between">
              <div>
                <h1 className="text-3xl font-bold text-[#e8d5b7]">{blend.name}</h1>
                <p className="text-lg text-[#e8d5b7]/70">{blend.manufacturer || t("tobaccoExtended.unknownMaker")}</p>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={toggleFavorite}
                  className={blend.is_favorite ? 'text-rose-500' : 'text-stone-400'}
                >
                  <Heart className={`w-5 h-5 ${blend.is_favorite ? 'fill-current' : ''}`} />
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

            {/* Rating */}
            <div className="flex items-center gap-2">
              {[1, 2, 3, 4, 5].map(i => (
                <Star 
                  key={i}
                  className={`w-6 h-6 cursor-pointer transition-colors ${i <= (blend.rating || 0) ? 'text-amber-500 fill-current' : 'text-stone-300 hover:text-amber-300'}`}
                  onClick={() => updateMutation.mutate({ rating: i })}
                />
              ))}
              {blend.rating && <span className="text-white ml-2">{blend.rating}{t("units.outOf5")}</span>}
            </div>

            {/* Top Pipe Matches */}
            {pipes.length > 0 && (
              <TopPipeMatches blend={blend} pipes={pipes} />
            )}

            {/* Badges */}
            <div className="flex flex-wrap gap-2">
              {blend.blend_type && (
                <Badge className={colorClass}>
                  {blend.blend_type}
                </Badge>
              )}
              {blend.strength && (
                <Badge className="bg-stone-100 text-stone-700 border-stone-200">
                  {blend.strength}
                </Badge>
              )}
              {blend.cut && (
                <Badge className="bg-amber-50 text-amber-700 border-amber-200">
                  {blend.cut}
                </Badge>
              )}
              {blend.production_status && (
                <Badge className={
                  blend.production_status === 'Discontinued' 
                    ? 'bg-rose-100 text-rose-800 border-rose-200'
                    : 'bg-blue-100 text-blue-800 border-blue-200'
                }>
                  {blend.production_status}
                </Badge>
              )}
              {blend.room_note && (
                <Badge className="bg-violet-100 text-violet-800 border-violet-200">
                  {t("tobaccoExtended.roomNote")} {t(`roomNotes.${blend.room_note}`, blend.room_note)}
                </Badge>
              )}
            </div>

            {/* Tobacco Components */}
            {blend.tobacco_components?.length > 0 && (
              <Card className="border-white/10">
                <CardContent className="p-4">
                  <p className="text-xs text-[#E0D8C8]/70 mb-2">{t("tobaccoExtended.tobaccoComponents")}</p>
                  <div className="flex flex-wrap gap-2">
                    {blend.tobacco_components.map((comp, idx) => (
                      <Badge key={idx} variant="secondary" className="bg-amber-100 text-amber-800 border-amber-200">
                        {comp}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Flavor Notes */}
            {blend.flavor_notes?.length > 0 && (
              <Card className="border-white/10">
                <CardContent className="p-4">
                  <p className="text-xs text-[#E0D8C8]/70 mb-2">{t("tobaccoExtended.flavorNotes")}</p>
                  <div className="flex flex-wrap gap-2">
                    {blend.flavor_notes.map((note, idx) => (
                      <Badge key={idx} variant="secondary" className="bg-amber-100 text-amber-800 border-amber-200">
                        {note}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Aging Potential */}
            {blend.aging_potential && (
              <Card className="border-white/10">
                <CardContent className="p-4">
                  <p className="text-xs text-[#E0D8C8]/70 mb-1">{t("tobaccoExtended.agingPotential")}</p>
                  <p className="font-medium text-[#E0D8C8]">{blend.aging_potential}</p>
                </CardContent>
              </Card>
            )}

            {/* Notes */}
            {blend.notes && (
              <Card className="border-white/10">
                <CardContent className="p-4">
                  <p className="text-xs text-[#E0D8C8]/70 mb-1">{t("formsExtended.notes")}</p>
                  <p className="text-[#E0D8C8]/80">{blend.notes}</p>
                </CardContent>
              </Card>
            )}

            {/* Tobacco Valuation */}
            <TobaccoValuation 
              blend={blend}
              onUpdate={(data) => updateMutation.mutate(data)}
              isUpdating={updateMutation.isPending}
            />
          </div>
        </div>

        {/* Comments Section */}
        {userProfile?.allow_comments && (
          <Card className="border-white/10 mt-8">
            <CardContent className="p-6">
              <CommentSection
                entityType="blend"
                entityId={blendId}
                entityOwnerEmail={blend.created_by}
              />
            </CardContent>
          </Card>
        )}

        {/* Edit Sheet */}
        <Sheet open={showEdit} onOpenChange={setShowEdit}>
          <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
            <SheetHeader className="mb-6">
              <SheetTitle>{t("tobaccoPage.editBlend")}</SheetTitle>
            </SheetHeader>
            <TobaccoForm
              blend={blend}
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
              <AlertDialogTitle>{t("tobaccoExtended.deleteBlendConfirm")}</AlertDialogTitle>
              <AlertDialogDescription>
                {t("tobaccoExtended.deleteBlendDesc", { name: blend.name })}
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
          alt={blend.name}
        />
      </div>
    </div>
  );
}