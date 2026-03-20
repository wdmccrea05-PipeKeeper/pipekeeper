import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { scopedEntities } from "@/components/api/scopedEntities";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { safeUpdate } from "@/components/utils/safeUpdate";
import { invalidateBlendQueries } from "@/components/utils/cacheInvalidation";
import { getTobaccoLogo, GENERIC_TOBACCO_ICON } from "@/components/tobacco/TobaccoLogoLibrary";
import { useCurrentUser } from "@/components/hooks/useCurrentUser";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Edit, Trash2, Heart, Star, Share2 } from "lucide-react";
import { createPageUrl } from "@/components/utils/createPageUrl";
import { motion } from "framer-motion";
import { useTranslation } from "@/components/i18n/safeTranslation";
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
import TobaccoInventoryManager from "@/components/tobacco/TobaccoInventoryManager";
import OpenInventorySummary from "@/components/tobacco/OpenInventorySummary";
import CommentSection from "@/components/community/CommentSection";
import ImageModal from "@/components/ui/ImageModal";
import CellarLog from "@/components/tobacco/CellarLog";
import TobaccoValuation from "@/components/tobacco/TobaccoValuation";
import CuratorItemNote from "@/components/curator/CuratorItemNote";
import ShareRecordModal from "@/components/share/ShareRecordModal";
import InlinePhotoEditor from "@/components/shared/InlinePhotoEditor";

const PAGE_BG =
  "linear-gradient(180deg, rgba(14,10,8,0.98) 0%, rgba(11,9,8,1) 100%)";

const COLLECTOR_CARD_STYLE = {
  background: "linear-gradient(145deg, rgba(40,28,20,0.95), rgba(32,22,15,0.95))",
  border: "1px solid rgba(140,105,65,0.35)",
  boxShadow: "0 10px 28px rgba(0,0,0,0.6), inset 0 1px 0 rgba(200,160,110,0.12)",
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

const BLEND_COLORS = {
  Virginia: "bg-yellow-900/30 text-yellow-200 border-yellow-700/40",
  "Virginia/Perique": "bg-orange-900/30 text-orange-200 border-orange-700/40",
  English: "bg-stone-700/50 text-[#E0D8C8] border-stone-600/40",
  Balkan: "bg-stone-600/50 text-[#E0D8C8] border-stone-500/40",
  Aromatic: "bg-purple-900/30 text-purple-200 border-purple-700/40",
  Burley: "bg-amber-900/30 text-amber-200 border-amber-700/40",
  "Virginia/Burley": "bg-yellow-900/30 text-yellow-200 border-yellow-700/40",
  "Latakia Blend": "bg-stone-800/50 text-[#E0D8C8] border-stone-700/40",
  "Oriental/Turkish": "bg-rose-900/30 text-rose-200 border-rose-700/40",
  "Navy Flake": "bg-stone-700/50 text-[#E0D8C8] border-stone-600/40",
  "Dark Fired": "bg-stone-500/50 text-[#E0D8C8] border-stone-400/40",
  Cavendish: "bg-amber-900/30 text-amber-200 border-amber-700/40",
};

export default function TobaccoDetailPage() {
  const { t } = useTranslation();
  const urlParams = new URLSearchParams(window.location.search);
  const blendId = urlParams.get("id");

  const [showEdit, setShowEdit] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [expandedImage, setExpandedImage] = useState(null);
  const [primaryImgError, setPrimaryImgError] = useState(false);
  const [fallbackImgError, setFallbackImgError] = useState(false);
  const [showShare, setShowShare] = useState(false);

  const queryClient = useQueryClient();
  const { user } = useCurrentUser();

  const { data: blend, isLoading: blendLoading } = useQuery({
    queryKey: ["blend", blendId, user?.email],
    enabled: !!blendId && !!user?.email,
    retry: false,
    queryFn: async () => {
      if (!blendId) throw new Error("Missing blend ID");

      try {
        const p = await base44.entities.TobaccoBlend.get(blendId);
        if (p) return p;
      } catch (e) {
        console.warn("TobaccoBlend.get failed", e);
      }

      try {
        const item = await scopedEntities.TobaccoBlend.getForUser(user.email, blendId);
        if (item) return item;
      } catch (e) {
        console.warn("TobaccoBlend.filter failed", e);
      }

      throw new Error("Blend not found");
    },
  });

  const { user: currentUser, hasPaid } = useCurrentUser();

  useEffect(() => {
    if (blend && blend.manufacturer && !blend.logo && !updateMutation.isPending && currentUser?.email) {
      const libraryLogo = getTobaccoLogo(blend.manufacturer);
      if (libraryLogo && libraryLogo !== GENERIC_TOBACCO_ICON) {
        updateMutation.mutate({ logo: libraryLogo });
      }
    }
  }, [blend?.id, currentUser?.email]);

  useEffect(() => {
    setPrimaryImgError(false);
    setFallbackImgError(false);
  }, [blend?.id]);

  const { data: pipes = [] } = useQuery({
    queryKey: ["pipes", currentUser?.email],
    queryFn: async () => {
      try {
        const result = await scopedEntities.Pipe.listForUser(currentUser?.email);
        return Array.isArray(result) ? result : [];
      } catch (err) {
        console.error("Pipes load error:", err);
        return [];
      }
    },
    enabled: !!currentUser?.email,
    retry: 1,
    staleTime: 5000,
  });

  const { data: userProfile } = useQuery({
    queryKey: ["user-profile", blend?.created_by],
    queryFn: async () => {
      const email = blend?.created_by;
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
    enabled: !!blend?.created_by,
  });

  const updateMutation = useMutation({
    mutationFn: (data) => safeUpdate("TobaccoBlend", blendId, data, currentUser?.email),
    onMutate: async (newData) => {
      await queryClient.cancelQueries({ queryKey: ["blend", blendId, currentUser?.email] });
      const previousBlend = queryClient.getQueryData(["blend", blendId, currentUser?.email]);

      queryClient.setQueryData(["blend", blendId, currentUser?.email], (old) => ({
        ...old,
        ...newData,
      }));

      return { previousBlend };
    },
    onError: (_err, _newData, context) => {
      queryClient.setQueryData(["blend", blendId, currentUser?.email], context?.previousBlend);
    },
    onSuccess: () => {
      invalidateBlendQueries(queryClient, currentUser?.email);
      setShowEdit(false);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => scopedEntities.TobaccoBlend.delete(blendId),
    onSuccess: () => {
      window.location.href = createPageUrl("Tobacco");
    },
  });

  const toggleFavorite = () => {
    if (!blend) return;
    const newValue = !blend.is_favorite;
    queryClient.setQueryData(["blend", blendId, currentUser?.email], (old) => ({
      ...(old || {}),
      is_favorite: newValue,
    }));
    updateMutation.mutate({ is_favorite: newValue });
  };

  if (blendLoading) {
    return (
      <div className="min-h-screen p-8" style={{ background: PAGE_BG }}>
        <div className="max-w-4xl mx-auto">
          <div className="animate-pulse space-y-6">
            <div className="h-8 w-48 bg-white/10 rounded" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
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

  if (!blend) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: PAGE_BG }}>
        <div className="text-center">
          <div className="text-6xl mb-4">🍂</div>
          <h2 className="text-2xl font-semibold text-[#E0D8C8] mb-2">{t("tobaccoExtended.blendNotFound")}</h2>
          <a href={createPageUrl("Tobacco")}>
            <Button variant="outline">{t("tobaccoExtended.backToTobacco")}</Button>
          </a>
        </div>
      </div>
    );
  }

  const colorClass =
    BLEND_COLORS[blend.blend_type] || "bg-[#3a2a20]/50 text-[#E0D8C8] border-[#8b6239]/30";

  return (
    <div className="min-h-screen" style={{ background: PAGE_BG }}>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <a href={createPageUrl("Tobacco")}>
          <Button variant="ghost" className="mb-6 text-[#e8d5b7] hover:text-[#e8d5b7]/80 hover:bg-white/5">
            <ArrowLeft className="w-4 h-4 mr-2" />
            {t("tobaccoExtended.backToTobacco")}
          </Button>
        </a>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
          <div className="space-y-6">
            <InlinePhotoEditor
              photos={blend.photos || (blend.logo ? [blend.logo] : blend.photo ? [blend.photo] : [])}
              maxPhotos={2}
              label="Photos"
              onUpdate={(updatedPhotos) => {
                updateMutation.mutate({ photos: updatedPhotos, logo: updatedPhotos[0] || null });
              }}
            />
            <motion.div
              className="aspect-square rounded-2xl overflow-hidden shadow-xl cursor-pointer"
              style={{
                background: "linear-gradient(145deg, rgba(50,40,30,0.7), rgba(40,28,20,0.9))",
                border: "1px solid rgba(140,105,65,0.3)",
                boxShadow: "0 8px 24px rgba(0,0,0,0.55)",
              }}
              layoutId={`blend-${blend.id}`}
              onClick={() => setExpandedImage(blend.logo || blend.photo)}
            >
              {(blend.logo || blend.photo) && !primaryImgError ? (
                <img
                  src={blend.logo || blend.photo}
                  alt={blend.name}
                  className={`w-full h-full ${blend.logo ? "object-contain p-6" : "object-cover"} hover:scale-105 transition-transform duration-300`}
                  onError={() => setPrimaryImgError(true)}
                />
              ) : primaryImgError ? (
                <div className="w-full h-full flex items-center justify-center p-6" style={{ background: "linear-gradient(145deg, rgba(50,40,30,0.7), rgba(40,28,20,0.9))" }}>
                  {!fallbackImgError ? (
                    <img
                      src={getTobaccoLogo(blend.manufacturer)}
                      alt={blend.manufacturer || "Tobacco"}
                      className="w-full h-full object-contain"
                      onError={() => setFallbackImgError(true)}
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <div className="text-amber-600 text-8xl">🍂</div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="w-full h-full flex items-center justify-center p-6" style={{ background: "linear-gradient(145deg, rgba(50,40,30,0.7), rgba(40,28,20,0.9))" }}>
                  {!fallbackImgError ? (
                    <img
                      src={getTobaccoLogo(blend.manufacturer)}
                      alt={blend.manufacturer || "Tobacco"}
                      className="w-full h-full object-contain"
                      onError={() => setFallbackImgError(true)}
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <div className="text-amber-600 text-8xl">🍂</div>
                    </div>
                  )}
                </div>
              )}
            </motion.div>

            <Card className="overflow-hidden" style={COLLECTOR_CARD_STYLE}>
              <Tabs defaultValue="containers" className="w-full">
                <div className="relative border-b border-[rgba(140,105,65,0.35)] overflow-x-auto">
                  <div className="pointer-events-none absolute right-0 inset-y-0 w-8 bg-gradient-to-l from-[#120d0a]" />
                  <TabsList className="w-full justify-start inline-flex min-w-full">
                    <TabsTrigger value="containers" className="whitespace-nowrap flex-shrink-0">
                      <span className="hidden sm:inline">{t("tobaccoExtended.openTobacco")}</span>
                      <span className="sm:hidden">{t("tobaccoExtended.open")}</span>
                    </TabsTrigger>
                    <TabsTrigger value="log" className="whitespace-nowrap flex-shrink-0">
                      <span className="hidden sm:inline">{t("cellarLog.cellaredTobacco")}</span>
                      <span className="sm:hidden">{t("tobaccoExtended.cellared")}</span>
                    </TabsTrigger>
                    <TabsTrigger value="inventory" className="whitespace-nowrap flex-shrink-0">
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

          <div className="space-y-6">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <h1 className="text-3xl font-bold text-[#e8d5b7] break-words">{blend.name}</h1>
                <p className="text-lg text-[#e8d5b7]/70 break-words">
                  {blend.manufacturer || t("tobaccoExtended.unknownMaker")}
                </p>
              </div>
              <div className="flex gap-2 shrink-0">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={toggleFavorite}
                  className={`${blend.is_favorite ? "text-rose-500" : "text-stone-400"} border-[rgba(140,105,65,0.35)] bg-black/15 hover:bg-white/5`}
                >
                  <Heart className={`w-5 h-5 ${blend.is_favorite ? "fill-current" : ""}`} />
                </Button>
                <Button variant="outline" size="icon" onClick={() => setShowShare(true)} className="border-[rgba(140,105,65,0.35)] bg-black/15 hover:bg-white/5" title={t("common.share", { defaultValue: "Share" })}>
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

            <div className="flex items-center gap-2">
              {[1, 2, 3, 4, 5].map((i) => (
                <Star
                  key={i}
                  className={`w-6 h-6 cursor-pointer transition-colors ${
                    i <= (blend.rating || 0) ? "text-amber-500 fill-current" : "text-stone-300 hover:text-amber-300"
                  }`}
                  onClick={() => updateMutation.mutate({ rating: i })}
                />
              ))}
              {blend.rating ? (
                <span className="text-white ml-2">
                  {blend.rating} {t("units.outOf5") || "out of 5"}
                </span>
              ) : null}
            </div>

            {pipes.length > 0 ? <TopPipeMatches blend={blend} pipes={pipes} /> : null}

            <div className="flex flex-wrap gap-2">
              {blend.ai_excluded === true ? (
                <Badge className="bg-purple-900/50 text-purple-200 border-purple-700/50">
                  {t("formsExtended.collectibleOnly", "Collectible Only")}
                </Badge>
              ) : null}
              {blend.blend_type ? <Badge className={colorClass}>{t(`blendTypes.${blend.blend_type}`, blend.blend_type)}</Badge> : null}
              {blend.strength ? <Badge className="bg-[#3a2a20]/50 text-[#E0D8C8] border-[#8b6239]/30">{t(`strengths.${blend.strength}`, blend.strength)}</Badge> : null}
              {blend.cut ? <Badge className="bg-[#3a2a20]/50 text-[#E0D8C8] border-[#8b6239]/30">{t(`cuts.${blend.cut}`, blend.cut)}</Badge> : null}
              {blend.production_status ? (
                <Badge style={{ background: "rgba(140,105,65,0.3)", color: "#E0D8C8", borderColor: "rgba(140,105,65,0.5)" }}>
                  {t(`productionStatuses.${blend.production_status}`, blend.production_status)}
                </Badge>
              ) : null}
              {blend.room_note ? (
                <Badge className="bg-[#3a2a20]/50 text-[#E0D8C8] border-[#8b6239]/30">
                  {t("tobaccoExtended.roomNote")} {t(`roomNotes.${blend.room_note}`, blend.room_note)}
                </Badge>
              ) : null}
            </div>

            {blend.tobacco_components?.length > 0 ? (
              <Card style={COLLECTOR_CARD_STYLE}>
                <CardContent className="p-4">
                  <p className="text-xs text-[#E0D8C8]/70 mb-2">{t("tobaccoExtended.tobaccoComponents")}</p>
                  <div className="flex flex-wrap gap-2">
                    {blend.tobacco_components.map((comp) => (
                      <Badge key={comp} variant="secondary" className="bg-amber-700 text-amber-100 border-amber-600">
                        {comp}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ) : null}

            {blend.flavor_notes?.length > 0 ? (
              <Card style={COLLECTOR_CARD_STYLE}>
                <CardContent className="p-4">
                  <p className="text-xs text-[#E0D8C8]/70 mb-2">{t("tobaccoExtended.flavorNotes")}</p>
                  <div className="flex flex-wrap gap-2">
                    {blend.flavor_notes.map((note) => (
                      <Badge key={note} variant="secondary" className="bg-amber-700 text-amber-100 border-amber-600">
                        {note}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ) : null}

            {blend.aging_potential ? (
              <Card style={COLLECTOR_CARD_STYLE}>
                <CardContent className="p-4">
                  <p className="text-xs text-[#E0D8C8]/70 mb-1">{t("tobaccoExtended.agingPotential")}</p>
                  <p className="font-medium text-[#E0D8C8]">{t(`agingPotentials.${blend.aging_potential}`, blend.aging_potential)}</p>
                </CardContent>
              </Card>
            ) : null}

            {blend.notes ? (
              <Card style={COLLECTOR_CARD_STYLE}>
                <CardContent className="p-4">
                  <p className="text-xs text-[#E0D8C8]/70 mb-1">{t("formsExtended.notes")}</p>
                  <p className="text-[#E0D8C8]/80 break-words">{blend.notes}</p>
                </CardContent>
              </Card>
            ) : null}

            <TobaccoValuation blend={blend} onUpdate={(data) => updateMutation.mutate(data)} isUpdating={updateMutation.isPending} />
          </div>
        </div>

        <CuratorItemNote moduleType="tobacco" item={blend} />

        {userProfile?.allow_comments ? (
          <Card className="mt-8" style={COLLECTOR_CARD_STYLE}>
            <CardContent className="p-6">
              <CommentSection entityType="blend" entityId={blendId} entityOwnerEmail={blend.created_by} />
            </CardContent>
          </Card>
        ) : null}

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
              <AlertDialogAction onClick={() => deleteMutation.mutate()} className="bg-rose-600 hover:bg-rose-700">
                {t("common.delete")}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>


        <ShareRecordModal
          isOpen={showShare}
          onOpenChange={setShowShare}
          moduleType="tobacco"
          record={blend}
          userProfile={{
            ...(userProfile || {}),
            email: currentUser?.email || blend?.created_by,
          }}
          privacySettings={userProfile || {}}
        />
        <ImageModal imageUrl={expandedImage} isOpen={!!expandedImage} onClose={() => setExpandedImage(null)} alt={blend.name} />
      </div>
    </div>
  );
}