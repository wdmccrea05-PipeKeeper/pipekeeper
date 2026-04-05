import React, { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { scopedEntities } from "@/components/api/scopedEntities";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Search, Grid3X3, List, Edit3, Leaf, Package2 } from "lucide-react";
import EmptyState from "@/components/EmptyState";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AnimatePresence, motion } from "framer-motion";
import { createPageUrl } from "@/components/utils/createPageUrl";
import PipeKeeperModuleNav from "@/components/modules/PipeKeeperModuleNav";
import TobaccoCard from "@/components/tobacco/TobaccoCard";
import TobaccoListItem from "@/components/tobacco/TobaccoListItem";
import TobaccoForm from "@/components/tobacco/TobaccoForm";

import TobaccoExporter from "@/components/export/TobaccoExporter";
import CollectorDisplayCard from "@/components/ui/CollectorDisplayCard";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import QuickEditPanel from "@/components/tobacco/QuickEditPanel";
import { toast } from "sonner";
import { safeUpdate, safeBatchUpdate } from "@/components/utils/safeUpdate";
import { invalidateBlendQueries } from "@/components/utils/cacheInvalidation";
import { PK_THEME } from "@/components/utils/pkTheme";
import { PkPageTitle, PkText } from "@/components/ui/PkSectionHeader";
import { canCreateTobacco } from "@/components/utils/limitChecks";
import { useCurrentUser } from "@/components/hooks/useCurrentUser";
import { useNavigate } from "@/components/utils/navigation";
import CellarDriftAlert from "../components/tobacco/CellarDriftAlert";
import { useTranslation } from "@/components/i18n/safeTranslation";
import { isAppleBuild } from "@/components/utils/appVariant";
import { formatWeight } from "@/components/utils/localeFormatters";
import AddFlowModal from "@/components/addflow/AddFlowModal";

import { BLEND_TYPES } from "@/components/tobacco/tobaccoConstants";
const STRENGTHS = ["Mild", "Mild-Medium", "Medium", "Medium-Full", "Full"];
const SORT_OPTIONS = [
  { value: "-created_date", label: "tobaccoPage.recentlyAdded", i18nKey: true },
  { value: "favorites", label: "tobaccoPage.favoritesFirst", i18nKey: true },
  { value: "name", label: "tobaccoPage.nameAZ", i18nKey: true },
  { value: "-name", label: "tobaccoPage.nameZA", i18nKey: true },
  { value: "-rating", label: "tobaccoPage.highestRated", i18nKey: true },
  { value: "rating", label: "tobaccoPage.lowestRated", i18nKey: true },
  { value: "cellared_date", label: "tobaccoPage.oldestInCellar", i18nKey: true },
  { value: "-cellared_date", label: "tobaccoPage.newestInCellar", i18nKey: true }
];

export default function TobaccoPage() {
  const [showForm, setShowForm] = useState(false);
  const [editingBlend, setEditingBlend] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('__none__');
  const [strengthFilter, setStrengthFilter] = useState('__none__');
  const [sortBy, setSortBy] = useState('-created_date');
  const [viewMode, setViewMode] = useState(() => {
    return localStorage.getItem('tobaccoViewMode') || 'grid';
  });
  const [displayMode, setDisplayMode] = useState(() => {
    return localStorage.getItem('tobaccoDisplayMode') === 'collector';
  });
  const [showAddFlow, setShowAddFlow] = useState(false);
  const [quickEditMode, setQuickEditMode] = useState(false);
  const [searchParams, setSearchParams] = useSearchParams();
  const [selectedForEdit, setSelectedForEdit] = useState([]);
  const [showQuickEditPanel, setShowQuickEditPanel] = useState(false);

  const queryClient = useQueryClient();
  const { t } = useTranslation();
  const navigate = useNavigate();

  const { user, hasPaid, isTrial } = useCurrentUser();

  const { data: blends = [], isLoading } = useQuery({
    queryKey: ['blends', user?.email, sortBy],
    queryFn: async () => {
      try {
        const actualSort = sortBy === 'favorites' ? '-created_date' : sortBy;
        const result = await scopedEntities.TobaccoBlend.listForUser(user?.email, actualSort);
        let data = Array.isArray(result) ? result : [];
        if (sortBy === 'favorites') {
          data = data.sort((a, b) => {
            if (a.is_favorite && !b.is_favorite) return -1;
            if (!a.is_favorite && b.is_favorite) return 1;
            return 0;
          });
        }
        return data;
      } catch (err) {
        console.error('Blends load error:', err);
        return [];
      }
    },
    enabled: !!user?.email,
    retry: 2,
    staleTime: 10000,
  });

  // Handle URL action parameter
  React.useEffect(() => {
    const action = searchParams.get('action');
    if (action === 'add') {
      setShowAddFlow(true);
      setSearchParams({}, { replace: true });
    }
  }, [searchParams]);

  // Handle URL edit parameter
  React.useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const editId = urlParams.get('edit');
    if (editId && blends?.length > 0) {
      const blendToEdit = blends.find(b => b.id === editId);
      if (blendToEdit) {
        setEditingBlend(blendToEdit);
        setShowForm(true);
        window.history.replaceState({}, '', '/Tobacco');
      }
    }
  }, [blends]);

  const createMutation = useMutation({
    mutationFn: async (data) => {
      // Check limits before creating
      const limitCheck = await canCreateTobacco(user?.email, hasPaid, isTrial);
      if (!limitCheck.canCreate) {
        throw new Error(t(limitCheck.reason, { limit: limitCheck.limit }));
      }
      return scopedEntities.TobaccoBlend.create(data);
    },
    onSuccess: () => {
      invalidateBlendQueries(queryClient, user?.email);
      setShowForm(false);
      toast.success(t("notifications.created"));
    },
    onError: (error) => {
      toast.error(error.message || t("tobaccoPage.failedToAddBlend"));
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => safeUpdate('TobaccoBlend', id, data, user?.email),
    onSuccess: () => {
      invalidateBlendQueries(queryClient, user?.email);
      setShowForm(false);
      setEditingBlend(null);
    },
  });

  const bulkUpdateMutation = useMutation({
    mutationFn: async ({ blendIds, updateData }) => {
      const updates = (blendIds || [])
        .map(id => {
          const blend = (blends || []).find(b => b && b.id === id);
          if (!blend) return null;
          
          // For quantity_owned, add to existing value
          const finalData = { ...updateData };
          if (updateData.quantity_owned !== undefined) {
            finalData.quantity_owned = (Number(blend.quantity_owned) || 0) + Number(updateData.quantity_owned || 0);
          }
          
          return { id, data: finalData };
        })
        .filter(Boolean);

      const results = await safeBatchUpdate('TobaccoBlend', updates, user?.email);
      const failures = results.filter(r => !r?.success);
      if (failures.length) throw new Error(failures[0]?.error || 'Bulk update failed');
      return updates.length;
    },
    onSuccess: (count) => {
      invalidateBlendQueries(queryClient, user?.email);
      toast.success(t("tobaccoPage.successfullyUpdated", { count }));
      exitQuickEdit();
    },
    onError: (error) => {
      toast.error(t("tobaccoPage.failedToUpdateBlends"));
      console.error('Bulk update error:', error);
    }
  });

  const handleSave = (data) => {
    if (editingBlend) {
      updateMutation.mutate({ id: editingBlend.id, data });
    } else {
      createMutation.mutate(data);
    }
  };



  const handleBulkUpdate = (blendIds, updateData) => {
    bulkUpdateMutation.mutate({ blendIds, updateData });
  };

  const toggleFavoriteMutation = useMutation({
    mutationFn: ({ id, is_favorite }) => safeUpdate('TobaccoBlend', id, { is_favorite }, user?.email),
    onMutate: async ({ id, is_favorite }) => {
      await queryClient.cancelQueries({ queryKey: ['blends', user?.email, sortBy] });
      const previousBlends = queryClient.getQueryData(['blends', user?.email, sortBy]);
      queryClient.setQueryData(['blends', user?.email, sortBy], (old) =>
        (old || []).map(b => b?.id === id ? { ...b, is_favorite } : b)
      );
      return { previousBlends };
    },
    onError: (err, variables, context) => {
      queryClient.setQueryData(['blends', user?.email, sortBy], context?.previousBlends);
    },
  });

  const handleToggleFavorite = (blend) => {
    toggleFavoriteMutation.mutate({ id: blend.id, is_favorite: !blend.is_favorite });
  };

  const filteredBlends = (blends || []).filter(blend => {
    if (!blend) return false;
    const matchesSearch = !searchQuery || 
      blend.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      blend.manufacturer?.toLowerCase().includes(searchQuery.toLowerCase());
    const activeType = typeFilter === '__none__' ? '' : typeFilter;
    const activeStrength = strengthFilter === '__none__' ? '' : strengthFilter;
    const matchesType = !activeType || blend.blend_type === activeType;
    const matchesStrength = !activeStrength || blend.strength === activeStrength;
    return matchesSearch && matchesType && matchesStrength;
  });

  const totalTins = (blends || []).reduce((sum, b) => sum + (Number(b?.quantity_owned) || 0), 0);

  const toggleBlendSelection = (blendId) => {
    setSelectedForEdit(prev => 
      prev.includes(blendId) ? prev.filter(id => id !== blendId) : [...prev, blendId]
    );
  };

  const toggleSelectAll = () => {
    if (selectedForEdit.length === filteredBlends.length && filteredBlends.length > 0) {
      setSelectedForEdit([]);
    } else {
      setSelectedForEdit((filteredBlends || []).map(b => b?.id).filter(Boolean));
    }
  };

  const exitQuickEdit = () => {
    setQuickEditMode(false);
    setSelectedForEdit([]);
    setShowQuickEditPanel(false);
  };

  return (
    <div className="space-y-6">
      <PipeKeeperModuleNav currentPageName="Tobacco" />
      
      <div className="max-w-7xl mx-auto">
        <CellarDriftAlert blends={blends} user={user} />

        {/* Header */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8"
        >
          <div>
            <PkPageTitle>{isAppleBuild ? t("nav.cellar") : t("nav.tobacco")}</PkPageTitle>
            <PkText className="mt-1">
              {blends.length} {t("tobaccoPage.blends")} {totalTins > 0 && `• ${totalTins} ${t("tobaccoPage.tinsInCellar")}`}
            </PkText>
          </div>
          <div className="flex flex-wrap gap-2">
            <TobaccoExporter />
            {blends.length > 0 && (
              <Button 
                onClick={() => {
                  setQuickEditMode(!quickEditMode);
                  if (quickEditMode) exitQuickEdit();
                }}
                variant={quickEditMode ? "default" : "outline"}
                className={quickEditMode 
                  ? PK_THEME.buttonPrimary
                  : `${PK_THEME.buttonSecondary} text-white`
                }
              >
                <Edit3 className="w-4 h-4 mr-2" />
                {quickEditMode ? t("tobaccoPage.exitQuickEdit") : t("tobaccoPage.quickEdit")}
              </Button>
            )}
            <Button 
             onClick={async () => {
               const limitCheck = await canCreateTobacco(user?.email, hasPaid, isTrial);
               if (!limitCheck.canCreate) {
                 toast.error(t(limitCheck.reason, { limit: limitCheck.limit }), {
                   action: {
                     label: t("subscription.upgrade"),
                     onClick: () => navigate(createPageUrl('Subscription'))
                   }
                 });
                 return;
               }
               setEditingBlend(null);
               setShowAddFlow(true);
             }}
             className={PK_THEME.buttonPrimary}
            >
             <Plus className="w-4 h-4 mr-2" />
             {t("tobaccoPage.addBlend")}
            </Button>
          </div>
        </motion.div>

        {/* Quick Edit Select All */}
        {quickEditMode && (
          <div 
            className={`flex items-center gap-3 p-4 ${PK_THEME.card} rounded-xl mb-4 cursor-pointer`}
            onClick={toggleSelectAll}
            style={{ WebkitTapHighlightColor: 'transparent' }}
          >
            <Checkbox
              checked={selectedForEdit.length === filteredBlends.length && filteredBlends.length > 0}
              onCheckedChange={toggleSelectAll}
              className="touch-none pointer-events-none"
            />
            <span className="font-medium text-white">
              {t("tobaccoPage.selectAll")} ({selectedForEdit.length} {t("common.of")} {filteredBlends.length} {t("tobaccoPage.selected")})
            </span>
          </div>
        )}

        {/* Filters */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="flex flex-col sm:flex-row gap-3 mb-6"
        >
          <div className="relative flex-1">
            <Search className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${PK_THEME.textMuted}`} />
            <Input
              placeholder={t("tobaccoPage.searchPlaceholder")}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={`pl-10 ${PK_THEME.input}`}
              aria-label={t("tobacco.search")}
            />
          </div>
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className={`w-full sm:w-40 ${PK_THEME.input}`}>
              <SelectValue placeholder={t("tobacco.allTypes")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__">{t("tobacco.allTypes")}</SelectItem>
              {BLEND_TYPES.map(type => <SelectItem key={type} value={type}>{t(`blendTypes.${type}`, type)}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={strengthFilter} onValueChange={setStrengthFilter}>
            <SelectTrigger className={`w-full sm:w-40 ${PK_THEME.input}`}>
              <SelectValue placeholder={t("tobacco.allStrengths")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__">{t("tobacco.allStrengths")}</SelectItem>
              {STRENGTHS.map(strength => <SelectItem key={strength} value={strength}>{t(`strengths.${strength}`, strength)}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className={`w-full sm:w-48 ${PK_THEME.input}`}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
               {SORT_OPTIONS.map(option => <SelectItem key={option.value} value={option.value}>{option.i18nKey ? t(option.label) : option.label}</SelectItem>)}
            </SelectContent>
          </Select>
          <div className="flex gap-2">
            <div className={`flex border rounded-lg ${PK_THEME.card}`}>
              <Button
                variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
                size="icon"
                onClick={() => {
                  setViewMode('grid');
                  localStorage.setItem('tobaccoViewMode', 'grid');
                }}
                className={`rounded-r-none ${viewMode === 'grid' ? PK_THEME.buttonPrimary : `${PK_THEME.textSubtle} hover:bg-[#2C3E55]/50`}`}
              >
                <Grid3X3 className="w-4 h-4" />
              </Button>
              <Button
                variant={viewMode === 'list' ? 'secondary' : 'ghost'}
                size="icon"
                onClick={() => {
                  setViewMode('list');
                  localStorage.setItem('tobaccoViewMode', 'list');
                }}
                className={`rounded-l-none ${viewMode === 'list' ? PK_THEME.buttonPrimary : `${PK_THEME.textSubtle} hover:bg-[#2C3E55]/50`}`}
              >
                <List className="w-4 h-4" />
              </Button>
            </div>
            
            {hasPaid && !quickEditMode && (
              <Button
                variant="outline"
                size="icon"
                onClick={() => {
                  const newMode = !displayMode;
                  setDisplayMode(newMode);
                  localStorage.setItem('tobaccoDisplayMode', newMode ? 'collector' : 'standard');
                }}
                className={displayMode ? 'border-amber-600/60 bg-amber-600/20' : ''}
                title="Collector Display Mode"
              >
                <Package2 className="w-4 h-4" style={{ color: displayMode ? "rgba(180, 140, 75, 1)" : "rgba(224, 216, 200, 0.7)" }} />
              </Button>
            )}
          </div>
        </motion.div>

        {/* Blends Grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {[1,2,3,4].map(i => (
              <div key={i} className="aspect-[4/5] bg-stone-200 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : filteredBlends.length === 0 ? (
          <EmptyState
            icon={Leaf}
            title={blends.length === 0 ? t("tobaccoPage.buildCellar") : t("tobaccoPage.noBlendsFound")}
            description={
              blends.length === 0 
                ? t("tobaccoPage.buildCellarDesc")
                : searchQuery 
                  ? t("tobaccoPage.noMatchSearch")
                  : t("tobaccoPage.noMatchFilters")
            }
            actionLabel={blends.length === 0 ? t("tobaccoPage.addFirstBlend") : null}
            onAction={blends.length === 0 ? () => setShowAddFlow(true) : null}
            secondaryActionLabel={searchQuery || typeFilter || strengthFilter ? t("pipesPage.clearFilters") : null}
            onSecondaryAction={() => {
            setSearchQuery('');
            setTypeFilter('__none__');
            setStrengthFilter('__none__');
            }}
          />
        ) : displayMode && viewMode === 'grid' && !quickEditMode ? (
          <motion.div 
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8"
            layout
          >
            <AnimatePresence>
              {filteredBlends.map(blend => {
                const totalOz = 
                  (Number(blend.tin_total_quantity_oz) || 0) +
                  (Number(blend.bulk_total_quantity_oz) || 0) +
                  (Number(blend.pouch_total_quantity_oz) || 0);
                
                return (
                  <motion.div
                    key={blend.id}
                    layout
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                  >
                    <CollectorDisplayCard
                      image={blend.logo || blend.photo}
                      title={blend.name}
                      subtitle={blend.manufacturer || t("tobaccoExtended.unknownMaker")}
                      badges={
                        <>
                          {blend.blend_type && (
                            <Badge 
                              className="text-[10px] px-2 py-0.5"
                              style={{
                                background: "rgba(90, 124, 90, 0.18)",
                                color: "rgba(144, 180, 144, 0.95)",
                                border: "1px solid rgba(90, 124, 90, 0.3)"
                              }}
                            >
                              {t(`blendTypes.${blend.blend_type}`, blend.blend_type)}
                            </Badge>
                          )}
                          {blend.strength && (
                            <Badge 
                              className="text-[10px] px-2 py-0.5"
                              style={{
                                background: "rgba(100, 80, 60, 0.15)",
                                color: "rgba(200, 180, 160, 0.9)",
                                border: "1px solid rgba(120, 100, 80, 0.25)"
                              }}
                            >
                              {t(`strengths.${blend.strength}`, blend.strength)}
                            </Badge>
                          )}
                          {totalOz > 0 && (
                            <Badge 
                              className="text-[10px] px-2 py-0.5"
                              style={{
                                background: "rgba(180, 140, 75, 0.2)",
                                color: "rgba(180, 140, 75, 1)",
                                border: "1px solid rgba(180, 140, 75, 0.35)"
                              }}
                            >
                              {formatWeight(totalOz)}
                            </Badge>
                          )}
                        </>
                      }
                      isFavorite={blend.is_favorite}
                      onToggleFavorite={() => handleToggleFavorite(blend)}
                      onClick={() => navigate(createPageUrl(`TobaccoDetail?id=${encodeURIComponent(blend.id)}`))}
                      onEdit={() => { setEditingBlend(blend); setShowForm(true); }}
                      fallbackIcon={
                        <div className="text-[#E0D8C8]/20 text-center">
                          <Leaf className="w-14 h-14 mx-auto mb-2" style={{ color: "rgba(90,124,90,0.25)" }} />
                          <p className="text-xs uppercase tracking-wider" style={{ color: "rgba(180,140,75,0.35)" }}>
                            {blend.manufacturer || t("tobaccoExtended.unknownMaker")}
                          </p>
                        </div>
                      }
                    />
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </motion.div>
        ) : (
          <motion.div 
            className={viewMode === 'grid' 
              ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
              : "flex flex-col gap-4"
            }
            layout
          >
            <AnimatePresence>
              {filteredBlends.map(blend => (
                <motion.div
                  key={blend.id}
                  layout
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  className="relative"
                >
                  {quickEditMode ? (
                    <div 
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        toggleBlendSelection(blend.id);
                      }}
                      className={`cursor-pointer transition-all ${
                        selectedForEdit.includes(blend.id) ? 'ring-2 ring-amber-600 rounded-xl' : ''
                      }`}
                      style={{ WebkitTapHighlightColor: 'transparent' }}
                    >
                      <div 
                        className="absolute top-3 left-3 z-10"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          toggleBlendSelection(blend.id);
                        }}
                        style={{ WebkitTapHighlightColor: 'transparent' }}
                      >
                        <Checkbox
                          checked={selectedForEdit.includes(blend.id)}
                          className="bg-white border-2 touch-none pointer-events-none"
                        />
                      </div>
                      {viewMode === 'grid' ? (
                        <TobaccoCard blend={blend} onClick={() => {}} />
                      ) : (
                        <TobaccoListItem blend={blend} onClick={() => {}} />
                      )}
                    </div>
                  ) : (
                    <>
                      {viewMode === 'grid' ? (
                        <TobaccoCard
                          blend={blend}
                          onClick={() => navigate(createPageUrl(`TobaccoDetail?id=${encodeURIComponent(blend.id)}`))}
                          onToggleFavorite={handleToggleFavorite}
                          onEdit={(b) => { setEditingBlend(b); setShowForm(true); }}
                        />
                      ) : (
                        <TobaccoListItem
                          blend={blend}
                          onClick={() => navigate(createPageUrl(`TobaccoDetail?id=${encodeURIComponent(blend.id)}`))}
                          onToggleFavorite={handleToggleFavorite}
                          onEdit={(b) => { setEditingBlend(b); setShowForm(true); }}
                        />
                      )}
                    </>
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
              <SheetTitle>{editingBlend ? t("tobaccoPage.editBlend") : t("tobaccoPage.addNewBlend")}</SheetTitle>
            </SheetHeader>
            <TobaccoForm
              blend={editingBlend}
              onSave={handleSave}
              onCancel={() => { setShowForm(false); setEditingBlend(null); }}
              isLoading={createMutation.isPending || updateMutation.isPending}
            />
          </SheetContent>
        </Sheet>

        <AddFlowModal
          open={showAddFlow}
          onClose={() => setShowAddFlow(false)}
          initialItemType="blend"
          onCreated={(record) => {
            invalidateBlendQueries(queryClient, user?.email);
          }}
        />

        {/* Quick Edit Floating Button */}
        {quickEditMode && selectedForEdit.length > 0 && !showQuickEditPanel && (
          <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50">
            <Button
              onClick={() => setShowQuickEditPanel(true)}
              className="bg-amber-700 hover:bg-amber-800 shadow-2xl px-6 py-6 text-lg"
              size="lg"
            >
              <Edit3 className="w-5 h-5 mr-2" />
              {t("forms.edit")} {selectedForEdit.length} {t("tobaccoPage.selected")}
            </Button>
          </div>
        )}

        {/* Quick Edit Panel */}
        {quickEditMode && showQuickEditPanel && selectedForEdit.length > 0 && (
          <QuickEditPanel
            selectedCount={selectedForEdit.length}
            onUpdate={handleBulkUpdate}
            onCancel={() => setShowQuickEditPanel(false)}
            isLoading={bulkUpdateMutation.isPending}
            selectedBlends={selectedForEdit}
          />
        )}
      </div>
    </div>
  );
}