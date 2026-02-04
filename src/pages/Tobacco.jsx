import React, { useState } from 'react';
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Search, Grid3X3, List, Sparkles, Edit3, Leaf } from "lucide-react";
import EmptyState from "@/components/EmptyState";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AnimatePresence, motion } from "framer-motion";
import { createPageUrl } from "@/components/utils/createPageUrl";
import TobaccoCard from "@/components/tobacco/TobaccoCard";
import TobaccoListItem from "@/components/tobacco/TobaccoListItem";
import TobaccoForm from "@/components/tobacco/TobaccoForm";
import QuickSearchTobacco from "@/components/ai/QuickSearchTobacco";
import TobaccoExporter from "@/components/export/TobaccoExporter";
import BulkTobaccoUpdate from "@/components/tobacco/BulkTobaccoUpdate";
import { Checkbox } from "@/components/ui/checkbox";
import QuickEditPanel from "@/components/tobacco/QuickEditPanel";
import { toast } from "sonner";
import { safeUpdate, safeBatchUpdate } from "@/components/utils/safeUpdate";
import { invalidateBlendQueries } from "@/components/utils/cacheInvalidation";
import { PK_THEME } from "@/components/utils/pkTheme";
import { PkPageTitle, PkText } from "@/components/ui/PkSectionHeader";
import { canCreateTobacco } from "@/components/utils/limitChecks";
import { useCurrentUser } from "@/components/hooks/useCurrentUser";
import CellarDriftAlert from "../components/tobacco/CellarDriftAlert";
import { useTranslation } from "react-i18next";
import { isAppleBuild } from "@/components/utils/appVariant";

const BLEND_TYPES = [
  "All Types",
  "American",
  "Aromatic",
  "Balkan",
  "Burley",
  "Burley-based",
  "Cavendish",
  "Codger Blend",
  "Dark Fired Kentucky",
  "English",
  "English Aromatic",
  "English Balkan",
  "Full English/Oriental",
  "Kentucky",
  "Lakeland",
  "Latakia Blend",
  "Navy Flake",
  "Oriental/Turkish",
  "Other",
  "Perique",
  "Shag",
  "Virginia",
  "Virginia/Burley",
  "Virginia/Oriental",
  "Virginia/Perique"
];
const STRENGTHS = ["All Strengths", "Mild", "Mild-Medium", "Medium", "Medium-Full", "Full"];
const SORT_OPTIONS = [
  { value: "-created_date", label: "Recently Added" },
  { value: "favorites", label: "Favorites First" },
  { value: "name", label: "Name (A-Z)" },
  { value: "-name", label: "Name (Z-A)" },
  { value: "-rating", label: "Highest Rated" },
  { value: "rating", label: "Lowest Rated" },
  { value: "cellared_date", label: "Oldest in Cellar" },
  { value: "-cellared_date", label: "Newest in Cellar" }
];

export default function TobaccoPage() {
  const [showForm, setShowForm] = useState(false);
  const [editingBlend, setEditingBlend] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('All Types');
  const [strengthFilter, setStrengthFilter] = useState('All Strengths');
  const [sortBy, setSortBy] = useState('-created_date');
  const [viewMode, setViewMode] = useState(() => {
    return localStorage.getItem('tobaccoViewMode') || 'grid';
  });
  const [showQuickSearch, setShowQuickSearch] = useState(false);
  const [showBulkUpdate, setShowBulkUpdate] = useState(false);
  const [quickEditMode, setQuickEditMode] = useState(false);
  const [selectedForEdit, setSelectedForEdit] = useState([]);
  const [showQuickEditPanel, setShowQuickEditPanel] = useState(false);

  const queryClient = useQueryClient();
  const { t } = useTranslation();

  const { user, hasPaidAccess, isTrialing } = useCurrentUser();

  const { data: blends = [], isLoading } = useQuery({
    queryKey: ['blends', user?.email, sortBy],
    queryFn: async () => {
      try {
        const actualSort = sortBy === 'favorites' ? '-created_date' : sortBy;
        const result = await base44.entities.TobaccoBlend.filter({ created_by: user?.email }, actualSort);
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

  const createMutation = useMutation({
    mutationFn: async (data) => {
      // Check limits before creating
      const limitCheck = await canCreateTobacco(user?.email, hasPaidAccess, isTrialing);
      if (!limitCheck.canCreate) {
        throw new Error(limitCheck.reason || 'Cannot create tobacco blend');
      }
      return base44.entities.TobaccoBlend.create(data);
    },
    onSuccess: () => {
      invalidateBlendQueries(queryClient, user?.email);
      setShowForm(false);
      toast.success(t("notifications.created"));
    },
    onError: (error) => {
      toast.error(error.message || t("tobaccoPage.failedToAddBlend", "Failed to add blend"));
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
      toast.success(t("tobaccoPage.successfullyUpdated", `Successfully updated ${count} blend${count !== 1 ? 's' : ''}!`));
      exitQuickEdit();
    },
    onError: (error) => {
      toast.error(t("tobaccoPage.failedToUpdateBlends", "Failed to update blends. Please try again."));
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

  const handleQuickSearchAdd = (blend) => {
    queryClient.invalidateQueries({ queryKey: ['blends', user?.email] });
    // Open the edit form for the newly added blend
    setEditingBlend(blend);
    setShowForm(true);
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
    const matchesType = typeFilter === 'All Types' || blend.blend_type === typeFilter;
    const matchesStrength = strengthFilter === 'All Strengths' || blend.strength === strengthFilter;
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
    <div className={`min-h-screen ${PK_THEME.pageBg}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
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
              onClick={() => setShowQuickSearch(true)}
              className={PK_THEME.buttonSecondary}
            >
              <Sparkles className="w-4 h-4 mr-2" />
              {t("pipesPage.quickSearchAdd")}
            </Button>
            <Button 
              onClick={async () => {
                const limitCheck = await canCreateTobacco(user?.email, hasPaidAccess, isTrialing);
                if (!limitCheck.canCreate) {
                  toast.error(limitCheck.reason, {
                    action: {
                      label: t("subscription.upgrade"),
                      onClick: () => window.location.href = createPageUrl('Subscription')
                    }
                  });
                  return;
                }
                setEditingBlend(null);
                setShowForm(true);
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
            <span className={`font-medium ${PK_THEME.textBody}`}>
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
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {BLEND_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={strengthFilter} onValueChange={setStrengthFilter}>
            <SelectTrigger className={`w-full sm:w-40 ${PK_THEME.input}`}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {STRENGTHS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className={`w-full sm:w-48 ${PK_THEME.input}`}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SORT_OPTIONS.map(opt => <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>)}
            </SelectContent>
          </Select>
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
            title={blends.length === 0 ? t("tobaccoPage.buildCellar", "Build Your Cellar") : t("tobaccoPage.noBlendsFound", "No Blends Found")}
            description={
              blends.length === 0 
                ? t("tobaccoPage.buildCellarDesc", "Start your tobacco cellar by adding your first blend. Track inventory, aging dates, and tasting notes.")
                : searchQuery 
                  ? t("tobaccoPage.noMatchSearch", `No blends match "${searchQuery}". Try adjusting your search or filters.`)
                  : t("tobaccoPage.noMatchFilters", "No blends match your current filters. Try adjusting your selections.")
            }
            actionLabel={blends.length === 0 ? t("tobaccoPage.addFirstBlend", "Add Your First Blend") : null}
            onAction={blends.length === 0 ? () => setShowForm(true) : null}
            secondaryActionLabel={blends.length === 0 ? t("pipesPage.quickSearchAdd") : searchQuery || typeFilter !== 'All Types' || strengthFilter !== 'All Strengths' ? t("pipesPage.clearFilters") : null}
            onSecondaryAction={blends.length === 0 ? () => setShowQuickSearch(true) : () => { setSearchQuery(''); setTypeFilter('All Types'); setStrengthFilter('All Strengths'); }}
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
                    <a href={createPageUrl(`TobaccoDetail?id=${encodeURIComponent(blend.id)}`)}>
                      {viewMode === 'grid' ? (
                        <TobaccoCard blend={blend} onClick={() => {}} onToggleFavorite={handleToggleFavorite} />
                      ) : (
                        <TobaccoListItem blend={blend} onClick={() => {}} onToggleFavorite={handleToggleFavorite} />
                      )}
                    </a>
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

        {/* Quick Search Dialog */}
        <QuickSearchTobacco
          open={showQuickSearch}
          onOpenChange={setShowQuickSearch}
          onAdd={handleQuickSearchAdd}
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