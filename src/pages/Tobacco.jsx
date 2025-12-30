import React, { useState } from 'react';
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Search, Grid3X3, List, Sparkles, Edit3 } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AnimatePresence, motion } from "framer-motion";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import TobaccoCard from "@/components/tobacco/TobaccoCard";
import TobaccoListItem from "@/components/tobacco/TobaccoListItem";
import TobaccoForm from "@/components/tobacco/TobaccoForm";
import QuickSearchTobacco from "@/components/ai/QuickSearchTobacco";
import TobaccoExporter from "@/components/export/TobaccoExporter";
import BulkTobaccoUpdate from "@/components/tobacco/BulkTobaccoUpdate";
import { Checkbox } from "@/components/ui/checkbox";
import QuickEditPanel from "@/components/tobacco/QuickEditPanel";
import { toast } from "sonner";

const BLEND_TYPES = ["All Types", "Virginia", "Virginia/Perique", "English", "Balkan", "Aromatic", "Burley", "Latakia Blend", "Other"];
const STRENGTHS = ["All Strengths", "Mild", "Mild-Medium", "Medium", "Medium-Full", "Full"];
const SORT_OPTIONS = [
  { value: "-created_date", label: "Recently Added" },
  { value: "name", label: "Name (A-Z)" },
  { value: "-name", label: "Name (Z-A)" },
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

  const { data: user } = useQuery({
    queryKey: ['current-user'],
    queryFn: () => base44.auth.me(),
  });

  const { data: blends = [], isLoading } = useQuery({
    queryKey: ['blends', user?.email, sortBy],
    queryFn: () => base44.entities.TobaccoBlend.filter({ created_by: user?.email }, sortBy),
    enabled: !!user?.email,
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.TobaccoBlend.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['blends', user?.email] });
      setShowForm(false);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.TobaccoBlend.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['blends', user?.email] });
      setShowForm(false);
      setEditingBlend(null);
    },
  });

  const bulkUpdateMutation = useMutation({
    mutationFn: async ({ blendIds, updateData }) => {
      // Update each selected blend
      const promises = blendIds.map(id => {
        const blend = blends.find(b => b.id === id);
        if (!blend) return null;
        
        // For quantity_owned, add to existing value
        const finalData = { ...updateData };
        if (updateData.quantity_owned !== undefined) {
          finalData.quantity_owned = (blend.quantity_owned || 0) + updateData.quantity_owned;
        }
        
        return base44.entities.TobaccoBlend.update(id, finalData);
      });
      
      await Promise.all(promises.filter(p => p !== null));
      return blendIds.length;
    },
    onSuccess: (count) => {
      queryClient.invalidateQueries({ queryKey: ['blends', user?.email] });
      toast.success(`Successfully updated ${count} blend${count !== 1 ? 's' : ''}!`);
      exitQuickEdit();
    },
    onError: (error) => {
      toast.error('Failed to update blends. Please try again.');
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

  const filteredBlends = blends.filter(blend => {
    const matchesSearch = !searchQuery || 
      blend.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      blend.manufacturer?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = typeFilter === 'All Types' || blend.blend_type === typeFilter;
    const matchesStrength = strengthFilter === 'All Strengths' || blend.strength === strengthFilter;
    return matchesSearch && matchesType && matchesStrength;
  });

  const totalTins = blends.reduce((sum, b) => sum + (b.quantity_owned || 0), 0);

  const toggleBlendSelection = (blendId) => {
    setSelectedForEdit(prev => 
      prev.includes(blendId) ? prev.filter(id => id !== blendId) : [...prev, blendId]
    );
  };

  const toggleSelectAll = () => {
    if (selectedForEdit.length === filteredBlends.length && filteredBlends.length > 0) {
      setSelectedForEdit([]);
    } else {
      setSelectedForEdit(filteredBlends.map(b => b.id));
    }
  };

  const exitQuickEdit = () => {
    setQuickEditMode(false);
    setSelectedForEdit([]);
    setShowQuickEditPanel(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#1a2c42] via-[#243548] to-[#1a2c42]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-[#e8d5b7]">My Tobacco</h1>
            <p className="text-[#e8d5b7]/70 mt-1">
              {blends.length} blends {totalTins > 0 && `• ${totalTins} tins in cellar`}
            </p>
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
                  ? "bg-[#8b3a3a] hover:bg-[#6d2e2e]"
                  : "border-[#e8d5b7]/30 text-black hover:bg-[#8b3a3a]/20"
                }
              >
                <Edit3 className="w-4 h-4 mr-2" />
                {quickEditMode ? 'Exit Quick Edit' : 'Quick Edit'}
              </Button>
            )}
            <Button 
              onClick={() => setShowQuickSearch(true)}
              variant="outline"
              className="border-[#e8d5b7]/30 text-black hover:bg-[#8b3a3a]/20"
            >
              <Sparkles className="w-4 h-4 mr-2" />
              Quick Search & Add
            </Button>
            <Button 
              onClick={() => { setEditingBlend(null); setShowForm(true); }}
              className="bg-[#8b3a3a] hover:bg-[#6d2e2e]"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Blend
            </Button>
          </div>
        </div>

        {/* Quick Edit Select All */}
        {quickEditMode && (
          <div 
            className="flex items-center gap-3 p-4 bg-amber-50 border border-amber-200 rounded-xl mb-4 cursor-pointer"
            onClick={toggleSelectAll}
            style={{ WebkitTapHighlightColor: 'transparent' }}
          >
            <Checkbox
              checked={selectedForEdit.length === filteredBlends.length && filteredBlends.length > 0}
              onCheckedChange={toggleSelectAll}
              className="touch-none pointer-events-none"
            />
            <span className="font-medium text-amber-900">
              Select All ({selectedForEdit.length} of {filteredBlends.length} selected)
            </span>
          </div>
        )}

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#e8d5b7]/60" />
            <Input
              placeholder="Search blends..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-[#243548] border-[#e8d5b7]/30 text-[#e8d5b7] placeholder:text-[#e8d5b7]/50"
            />
          </div>
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-full sm:w-40 bg-[#243548] border-[#e8d5b7]/30 text-[#e8d5b7]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {BLEND_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={strengthFilter} onValueChange={setStrengthFilter}>
            <SelectTrigger className="w-full sm:w-40 bg-[#243548] border-[#e8d5b7]/30 text-[#e8d5b7]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {STRENGTHS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-full sm:w-48 bg-[#243548] border-[#e8d5b7]/30 text-[#e8d5b7]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SORT_OPTIONS.map(opt => <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>)}
            </SelectContent>
          </Select>
          <div className="flex border border-[#e8d5b7]/30 rounded-lg bg-[#243548]">
            <Button
              variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
              size="icon"
              onClick={() => {
                setViewMode('grid');
                localStorage.setItem('tobaccoViewMode', 'grid');
              }}
              className={`rounded-r-none ${viewMode === 'grid' ? 'bg-[#8b3a3a] hover:bg-[#6d2e2e] text-[#e8d5b7]' : 'text-[#e8d5b7] hover:bg-[#8b3a3a]/20'}`}
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
              className={`rounded-l-none ${viewMode === 'list' ? 'bg-[#8b3a3a] hover:bg-[#6d2e2e] text-[#e8d5b7]' : 'text-[#e8d5b7] hover:bg-[#8b3a3a]/20'}`}
            >
              <List className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Blends Grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {[1,2,3,4].map(i => (
              <div key={i} className="aspect-[4/5] bg-stone-200 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : filteredBlends.length === 0 ? (
          <div className="text-center py-16">
            <div className="text-6xl mb-4">🍂</div>
            <h3 className="text-xl font-semibold text-[#e8d5b7] mb-2">No blends found</h3>
            <p className="text-[#e8d5b7]/70 mb-6">
              {blends.length === 0 ? "Add your first tobacco blend to start your cellar" : "Try adjusting your filters"}
            </p>
            {blends.length === 0 && (
              <Button onClick={() => setShowForm(true)} className="bg-[#8b3a3a] hover:bg-[#6d2e2e]">
                <Plus className="w-4 h-4 mr-2" />
                Add Your First Blend
              </Button>
            )}
          </div>
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
                    <Link to={createPageUrl(`TobaccoDetail?id=${blend.id}`)}>
                      {viewMode === 'grid' ? (
                        <TobaccoCard blend={blend} onClick={() => {}} />
                      ) : (
                        <TobaccoListItem blend={blend} onClick={() => {}} />
                      )}
                    </Link>
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
              <SheetTitle>{editingBlend ? 'Edit Blend' : 'Add New Blend'}</SheetTitle>
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
              Edit {selectedForEdit.length} Selected
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