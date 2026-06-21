import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { scopedEntities } from "@/components/api/scopedEntities";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { safeUpdate } from "@/components/utils/safeUpdate";
import { invalidatePipeQueries } from "@/components/utils/cacheInvalidation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Search, Grid3X3, List, Package2, Package } from "lucide-react";
import EmptyState from "@/components/EmptyState";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AnimatePresence, motion } from "framer-motion";
import { createPageUrl } from "@/components/utils/createPageUrl";
import PipeKeeperModuleNav from "@/components/modules/PipeKeeperModuleNav";
import PipeCard from "@/components/pipes/PipeCard";
import PipeListItem from "@/components/pipes/PipeListItem";
import PipeForm from "@/components/pipes/PipeForm";
import PipeExporter from "@/components/export/PipeExporter";
import CollectorGridView from "@/components/ui/CollectorGridView";
import PipeShapeIcon from "@/components/pipes/PipeShapeIcon";
import { Badge } from "@/components/ui/badge";
import { PK_THEME } from "@/components/utils/pkTheme";
import { PkPageTitle, PkText } from "@/components/ui/PkSectionHeader";
import { canCreatePipe } from "@/components/utils/limitChecks";
import { hasModuleProAccess } from "@/components/utils/moduleEntitlements";
import { toast } from "sonner";
import { useCurrentUser } from "@/components/hooks/useCurrentUser";
import { useNavigate } from "@/components/utils/navigation";
import { useTranslation } from "@/components/i18n/safeTranslation";

import AddFlowModal from "@/components/addflow/AddFlowModal";
import { useCurrency } from "@/lib/currency/useCurrency";
import { QUERY_KEYS, STALE_TIME } from '@/lib/queryKeys';


const SHAPES = ["Acorn", "Apple", "Author", "Bent", "Billiard", "Brandy", "Bulldog", "Calabash", "Canadian", "Cavalier", "Cherry Wood", "Chimney", "Churchwarden", "Cutty", "Devil Anse", "Dublin", "Egg", "Freehand", "Hawkbill", "Horn", "Hungarian", "Liverpool", "Lovat", "Nautilus", "Oom Paul", "Other", "Panel", "Poker", "Pot", "Prince", "Rhodesian", "Sitter", "Tomato", "Volcano", "Woodstock", "Zulu"];
const MATERIALS = ["Briar", "Cherry Wood", "Clay", "Corn Cob", "Meerschaum", "Morta", "Olive Wood", "Other"];
const ALL_SHAPES = "__ALL_SHAPES__";
const ALL_MATERIALS = "__ALL_MATERIALS__";

export default function PipesPage() {
  const { t } = useTranslation();
  // Subscribe to currency context so the component re-renders when the user changes currency
  const { formatFromBase } = useCurrency();
  const [showForm, setShowForm] = useState(false);
  const [editingPipe, setEditingPipe] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [shapeFilter, setShapeFilter] = useState('');
  const [materialFilter, setMaterialFilter] = useState('');
  const [viewMode, setViewMode] = useState(() => {
    return localStorage.getItem('pipesViewMode') || 'grid';
  });
  const [displayMode, setDisplayMode] = useState(() => {
    return localStorage.getItem('pipesDisplayMode') === 'collector';
  });
  const [showAddFlow, setShowAddFlow] = useState(false);
  const [sortBy, setSortBy] = useState('name');
  const [searchParams, setSearchParams] = useSearchParams();

  const queryClient = useQueryClient();

  const { user, isTrial } = useCurrentUser();
  const hasPipekeeperPro = hasModuleProAccess(user, 'pipekeeper');
  const navigate = useNavigate();

  const { data: pipes = [], isLoading } = useQuery({
    queryKey: QUERY_KEYS.pipes(user?.email),
    queryFn: async () => {
      try {
        const result = await scopedEntities.Pipe.listForUser(user?.email, '-created_date');
        return Array.isArray(result) ? result : [];
      } catch (err) {
        console.error('Pipes load error:', err);
        return [];
      }
    },
    enabled: !!user?.email,
    retry: 2,
    staleTime: STALE_TIME.COLLECTION,
  });

  // Handle URL action parameter — uses searchParams so it fires whenever URL changes
  useEffect(() => {
    const action = searchParams.get('action');
    if (action === 'add') {
      setShowAddFlow(true);
      setSearchParams({}, { replace: true });
    }
  }, [searchParams]);

  // Handle URL edit parameter
  useEffect(() => {
    const editId = searchParams.get('edit');
    if (editId && pipes?.length > 0) {
      const pipeToEdit = pipes.find(p => p.id === editId);
      if (pipeToEdit) {
        setEditingPipe(pipeToEdit);
        setShowForm(true);
        setSearchParams({}, { replace: true });
      }
    }
  }, [pipes, searchParams]);

  const createMutation = useMutation({
    mutationFn: async (data) => {
      // Check limits before creating
      const limitCheck = await canCreatePipe(user?.email, user, isTrial);
      if (!limitCheck.canCreate) {
        throw new Error(t(limitCheck.reason, { limit: limitCheck.limit }));
      }
      return scopedEntities.Pipe.create(data);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => safeUpdate('Pipe', id, data, user?.email),
  });

  const handleSave = async (data) => {
    try {
      if (import.meta.env.DEV) {
        console.debug('[Pipes] submitting pipe payload', {
          mode: editingPipe ? 'update' : 'create',
          pipeId: editingPipe?.id || null,
          payload: data,
        });
      }
      if (editingPipe) {
        await updateMutation.mutateAsync({ id: editingPipe.id, data });
        await invalidatePipeQueries(queryClient, user?.email);
        toast.success(t('notifications.updated'));
      } else {
        await createMutation.mutateAsync(data);
        await queryClient.invalidateQueries({ queryKey: QUERY_KEYS.pipes(user?.email) });
        toast.success(t("notifications.created"));
      }
      setShowForm(false);
      setEditingPipe(null);
    } catch (error) {
      const fallback = editingPipe ? (t('pipesPage.failedToUpdatePipe')) : (t('pipesPage.failedToAddPipe'));
      const message = error?.message || fallback;
      console.error('[Pipes] save failed', {
        mode: editingPipe ? 'update' : 'create',
        pipeId: editingPipe?.id || null,
        payload: data,
        reason: message,
        rawError: error,
      });
      toast.error(message);
      throw (error instanceof Error ? error : new Error(message));
    }
  };

  const handleEdit = (pipe) => {
    setEditingPipe(pipe);
    setShowForm(true);
  };



  const toggleFavoriteMutation = useMutation({
    mutationFn: ({ id, is_favorite }) => safeUpdate('Pipe', id, { is_favorite }, user?.email),
    onMutate: async ({ id, is_favorite }) => {
      await queryClient.cancelQueries({ queryKey: QUERY_KEYS.pipes(user?.email) });
      const previousPipes = queryClient.getQueryData(QUERY_KEYS.pipes(user?.email));
      queryClient.setQueryData(QUERY_KEYS.pipes(user?.email), (old) =>
        (old || []).map(p => p?.id === id ? { ...p, is_favorite } : p)
      );
      return { previousPipes };
    },
    onError: (err, variables, context) => {
      queryClient.setQueryData(QUERY_KEYS.pipes(user?.email), context?.previousPipes);
    },
  });

  const handleToggleFavorite = (pipe) => {
    toggleFavoriteMutation.mutate({ id: pipe.id, is_favorite: !pipe.is_favorite });
  };

  const filteredPipes = React.useMemo(() => {
    return (pipes || []).filter(pipe => {
      if (!pipe) return false;
      const matchesSearch = !searchQuery || 
        pipe.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        pipe.maker?.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesShape = !shapeFilter || pipe.shape === shapeFilter;
      const matchesMaterial = !materialFilter || pipe.bowl_material === materialFilter;
      return matchesSearch && matchesShape && matchesMaterial;
    }).sort((a, b) => {
      try {
        if (sortBy === 'favorites') {
          if (a?.is_favorite && !b?.is_favorite) return -1;
          if (!a?.is_favorite && b?.is_favorite) return 1;
          return new Date(b?.created_date || 0).getTime() - new Date(a?.created_date || 0).getTime();
        }
        if (sortBy === 'maker') {
          const makerA = (a?.maker || '').toLowerCase();
          const makerB = (b?.maker || '').toLowerCase();
          return makerA.localeCompare(makerB, undefined, { sensitivity: 'base', numeric: true });
        }
        if (sortBy === 'name') {
          const nameA = (a?.name || '').toLowerCase();
          const nameB = (b?.name || '').toLowerCase();
          return nameA.localeCompare(nameB, undefined, { sensitivity: 'base', numeric: true });
        }
        // Default: date (newest first)
        return new Date(b?.created_date || 0).getTime() - new Date(a?.created_date || 0).getTime();
      } catch (e) {
        if (import.meta.env.DEV) console.error('Sort error:', e);
        return 0;
      }
    });
  }, [pipes, searchQuery, shapeFilter, materialFilter, sortBy]);

  const totalValue = React.useMemo(() => 
    (pipes || []).reduce((sum, p) => sum + (Number(p?.estimated_value) || 0), 0),
    [pipes]
  );

  return (
    <div className="space-y-6">
      <PipeKeeperModuleNav currentPageName="Pipes" />
      
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col gap-4 mb-8"
        >
          <div>
            <PkPageTitle>{t("pipesPage.myPipes")}</PkPageTitle>
            <PkText className="mt-1">
              {pipes.length} {t("pipesPage.pipes")} {totalValue > 0 && `• ${formatFromBase(totalValue)} ${t("pipesPage.totalValue")}`}
            </PkText>
          </div>
          <div className="flex flex-wrap gap-2">
            <PipeExporter />

            <Button 
              onClick={async () => {
                const limitCheck = await canCreatePipe(user?.email, user, isTrial);
                if (!limitCheck.canCreate) {
                  toast.error(t(limitCheck.reason, { limit: limitCheck.limit }), {
                    action: {
                      label: t("subscription.upgrade"),
                      onClick: () => navigate(createPageUrl('Subscription'))
                    }
                  });
                  return;
                }
                setShowAddFlow(true);
              }}
              variant="primary"
              className="flex-shrink-0"
            >
              <Plus className="w-4 h-4 mr-2" />
              {t("pipesPage.addPipe")}
            </Button>
          </div>
        </motion.div>

        {/* Filters */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="flex flex-col gap-3 mb-6"
        >
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#E0D8C8]/60" />
            <Input
              placeholder={t("pipesPage.searchPlaceholder")}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={`pl-10 ${PK_THEME.input}`}
              aria-label={t("pipes.search")}
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 sm:gap-3">
            <Select
              value={shapeFilter || ALL_SHAPES}
              onValueChange={(v) => setShapeFilter(v === ALL_SHAPES ? '' : v)}
            >
               <SelectTrigger className="w-full text-[#F5F1E7] bg-[rgba(28,21,16,0.8)] border border-[rgba(180,140,75,0.35)]" aria-label={t("pipes.shape")}>
                  <SelectValue placeholder={t("pipes.allShapes")} />
                </SelectTrigger>
               <SelectContent>
                 <SelectItem value={ALL_SHAPES}>{t("pipes.allShapes")}</SelectItem>
                 {SHAPES.map(shape => <SelectItem key={shape} value={shape}>{t(`shapes.${shape}`, shape)}</SelectItem>)}
               </SelectContent>
             </Select>
             <Select
               value={materialFilter || ALL_MATERIALS}
               onValueChange={(v) => setMaterialFilter(v === ALL_MATERIALS ? '' : v)}
             >
               <SelectTrigger className="w-full text-[#F5F1E7] bg-[rgba(28,21,16,0.8)] border border-[rgba(180,140,75,0.35)]" aria-label={t("pipes.material")}>
                 <SelectValue placeholder={t("pipes.allMaterials")} />
               </SelectTrigger>
               <SelectContent>
                 <SelectItem value={ALL_MATERIALS}>{t("pipes.allMaterials")}</SelectItem>
                 {MATERIALS.map(material => <SelectItem key={material} value={material}>{t(`materials.${material}`, material)}</SelectItem>)}
               </SelectContent>
             </Select>
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-full text-[#F5F1E7] bg-[rgba(28,21,16,0.8)] border border-[rgba(180,140,75,0.35)]" aria-label={t("pipesPage.sortBy")}>
                <SelectValue placeholder={t("pipesPage.sortBy")} />
              </SelectTrigger>
               <SelectContent>
                 <SelectItem value="name">{t("pipesPage.byName")}</SelectItem>
                 <SelectItem value="maker">{t("pipesPage.byMaker")}</SelectItem>
                 <SelectItem value="favorites">{t("pipesPage.favoritesFirst")}</SelectItem>
                 <SelectItem value="date">{t("pipesPage.newestFirst")}</SelectItem>
               </SelectContent>
             </Select>
            <div className="flex gap-2">
              <div className={`flex border rounded-lg ${PK_THEME.card}`} role="group" aria-label={t("pipesPage.viewMode")}>
                <Button
                  variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
                  size="icon"
                  onClick={() => {
                    setViewMode('grid');
                    localStorage.setItem('pipesViewMode', 'grid');
                  }}
                  className={`rounded-r-none ${viewMode === 'grid' ? PK_THEME.buttonPrimary : `${PK_THEME.textSubtle} hover:bg-[#2C3E55]/50`}`}
                  aria-label={t("pipes.gridView")}
                  aria-pressed={viewMode === 'grid'}
                >
                  <Grid3X3 className="w-4 h-4" />
                </Button>
                <Button
                  variant={viewMode === 'list' ? 'secondary' : 'ghost'}
                  size="icon"
                  onClick={() => {
                    setViewMode('list');
                    localStorage.setItem('pipesViewMode', 'list');
                  }}
                  className={`rounded-l-none ${viewMode === 'list' ? PK_THEME.buttonPrimary : `${PK_THEME.textSubtle} hover:bg-[#2C3E55]/50`}`}
                  aria-label={t("pipes.listView")}
                  aria-pressed={viewMode === 'list'}
                >
                  <List className="w-4 h-4" />
                </Button>
              </div>
              
              {hasPipekeeperPro && (
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => {
                    const newMode = !displayMode;
                    setDisplayMode(newMode);
                    localStorage.setItem('pipesDisplayMode', newMode ? 'collector' : 'standard');
                  }}
                  className={displayMode ? 'border-amber-600/60 bg-amber-600/20' : ''}
                  title="Collector Display Mode"
                >
                  <Package2 className="w-4 h-4" style={{ color: displayMode ? "rgba(180, 140, 75, 1)" : "rgba(224, 216, 200, 0.7)" }} />
                </Button>
              )}
            </div>
          </div>
        </motion.div>

        {/* Pipes Grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {[1,2,3,4].map(i => (
              <div key={i} className="aspect-[4/5] bg-stone-200 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : filteredPipes.length === 0 ? (
          <EmptyState
            icon={Package}
            title={pipes.length === 0 ? t("pipesPage.startCollection") : t("pipesPage.noPipesFound")}
            description={
              pipes.length === 0 
                ? t("pipesPage.startCollectionDesc")
                : searchQuery 
                  ? t("pipesPage.noMatchSearch")
                  : t("pipesPage.noMatchFilters")
            }
            actionLabel={pipes.length === 0 ? t("pipesPage.addFirstPipe") : null}
            onAction={pipes.length === 0 ? () => setShowAddFlow(true) : null}
            secondaryActionLabel={searchQuery || shapeFilter || materialFilter ? t("pipesPage.clearFilters") : null}
            onSecondaryAction={() => { setSearchQuery(''); setShapeFilter(''); setMaterialFilter(''); }}
          />
        ) : displayMode && viewMode === 'grid' ? (
          <CollectorGridView
            items={filteredPipes}
            getImage={(pipe) => pipe.photos?.[0]}
            getTitle={(pipe) => pipe.name}
            getSubtitle={(pipe) => pipe.maker || t("pipesExtended.unknownMaker")}
            getBadges={(pipe) => (
              <>
                {pipe.shape && (
                  <Badge
                    className="text-[10px] px-2 py-0.5"
                    style={{
                      background: "rgba(180, 140, 75, 0.15)",
                      color: "rgba(180, 140, 75, 0.9)",
                      border: "1px solid rgba(180, 140, 75, 0.25)"
                    }}
                  >
                    {t(`shapes.${pipe.shape}`, pipe.shape)}
                  </Badge>
                )}
                {pipe.bowl_material && (
                  <Badge
                    className="text-[10px] px-2 py-0.5"
                    style={{
                      background: "rgba(100, 80, 60, 0.15)",
                      color: "rgba(200, 180, 160, 0.9)",
                      border: "1px solid rgba(120, 100, 80, 0.25)"
                    }}
                  >
                    {t(`materials.${pipe.bowl_material}`, pipe.bowl_material)}
                  </Badge>
                )}
                {pipe.chamber_volume && (
                  <Badge
                    className="text-[10px] px-2 py-0.5"
                    style={{
                      background: "rgba(180, 140, 75, 0.15)",
                      color: "rgba(180, 140, 75, 0.9)",
                      border: "1px solid rgba(180, 140, 75, 0.25)"
                    }}
                  >
                    {t(`sizes.${pipe.chamber_volume}`, pipe.chamber_volume)}
                  </Badge>
                )}
              </>
            )}
            getValue={(pipe) => pipe.estimated_value}
            getIsFavorite={(pipe) => pipe.is_favorite}
            getKey={(pipe) => pipe.id}
            onToggleFavorite={(pipe) => handleToggleFavorite(pipe)}
            onClick={(pipe) => navigate(createPageUrl(`PipeDetail?id=${encodeURIComponent(pipe.id)}`))} 
            onEdit={(pipe) => handleEdit(pipe)}
            fallbackIcon={
              <div className="text-[#E0D8C8]/25 text-center">
                <PipeShapeIcon shape={filteredPipes[0]?.shape} className="w-16 h-16 mx-auto mb-2" style={{ color: "rgba(180,140,75,0.3)" }} />
                <p className="text-xs uppercase tracking-wider" style={{ color: "rgba(180,140,75,0.4)" }}>
                  {t("pipesExtended.noPhoto")}
                </p>
              </div>
            }
            columns="grid-cols-1 sm:grid-cols-2 lg:grid-cols-3"
            gap="gap-8"
          />
        ) : (
          <motion.div 
            className={viewMode === 'grid' 
              ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
              : "flex flex-col gap-4"
            }
            layout
          >
            <AnimatePresence>
              {filteredPipes.map(pipe => (
                <motion.div
                  key={pipe.id}
                  layout
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                >
                  {viewMode === 'grid' ? (
                    <PipeCard
                      pipe={pipe}
                      onClick={() => navigate(createPageUrl(`PipeDetail?id=${encodeURIComponent(pipe.id)}`))}
                      onToggleFavorite={handleToggleFavorite}
                      onEdit={handleEdit}
                    />
                  ) : (
                    <PipeListItem
                      pipe={pipe}
                      onClick={() => navigate(createPageUrl(`PipeDetail?id=${encodeURIComponent(pipe.id)}`))}
                      onToggleFavorite={handleToggleFavorite}
                      onEdit={handleEdit}
                    />
                  )}
                </motion.div>
              ))}
            </AnimatePresence>
          </motion.div>
        )}

        {/* Add/Edit Form Sheet */}
        <Sheet open={showForm} onOpenChange={setShowForm}>
          <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
            <SheetHeader className="mb-6">
              <SheetTitle>{editingPipe ? t("pipesPage.editPipe") : t("pipesPage.addNewPipe")}</SheetTitle>
            </SheetHeader>
            <PipeForm
              pipe={editingPipe}
              onSave={handleSave}
              onCancel={() => { setShowForm(false); setEditingPipe(null); }}
              isLoading={createMutation.isPending || updateMutation.isPending}
            />
          </SheetContent>
        </Sheet>



        <AddFlowModal
          open={showAddFlow}
          onClose={() => setShowAddFlow(false)}
          initialItemType="pipe"
          onCreated={() => {
            queryClient.invalidateQueries({ queryKey: QUERY_KEYS.pipes(user?.email) });
          }}
        />
      </div>
    </div>
  );
}
