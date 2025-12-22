import React, { useState } from 'react';
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Search, Grid3X3, List, Sparkles } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AnimatePresence, motion } from "framer-motion";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import TobaccoCard from "@/components/tobacco/TobaccoCard";
import TobaccoListItem from "@/components/tobacco/TobaccoListItem";
import TobaccoForm from "@/components/tobacco/TobaccoForm";
import QuickSearchTobacco from "@/components/ai/QuickSearchTobacco";

const BLEND_TYPES = ["All Types", "Virginia", "Virginia/Perique", "English", "Balkan", "Aromatic", "Burley", "Latakia Blend", "Other"];
const STRENGTHS = ["All Strengths", "Mild", "Mild-Medium", "Medium", "Medium-Full", "Full"];

export default function TobaccoPage() {
  const [showForm, setShowForm] = useState(false);
  const [editingBlend, setEditingBlend] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('All Types');
  const [strengthFilter, setStrengthFilter] = useState('All Strengths');
  const [viewMode, setViewMode] = useState(() => {
    return localStorage.getItem('tobaccoViewMode') || 'grid';
  });
  const [showQuickSearch, setShowQuickSearch] = useState(false);

  const queryClient = useQueryClient();

  const { data: user } = useQuery({
    queryKey: ['current-user'],
    queryFn: () => base44.auth.me(),
  });

  const { data: blends = [], isLoading } = useQuery({
    queryKey: ['blends', user?.email],
    queryFn: () => base44.entities.TobaccoBlend.filter({ created_by: user.email }, '-created_date'),
    enabled: !!user,
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.TobaccoBlend.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['blends'] });
      setShowForm(false);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.TobaccoBlend.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['blends'] });
      setShowForm(false);
      setEditingBlend(null);
    },
  });

  const handleSave = (data) => {
    if (editingBlend) {
      updateMutation.mutate({ id: editingBlend.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleQuickSearchAdd = (blend) => {
    queryClient.invalidateQueries({ queryKey: ['blends'] });
    // Open the edit form for the newly added blend
    setEditingBlend(blend);
    setShowForm(true);
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50/50 via-stone-50 to-stone-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-stone-800">My Tobacco</h1>
            <p className="text-stone-500 mt-1">
              {blends.length} blends {totalTins > 0 && `• ${totalTins} tins in cellar`}
            </p>
          </div>
          <div className="flex gap-2">
            <Button 
              onClick={() => setShowQuickSearch(true)}
              variant="outline"
              className="border-amber-300 text-amber-700 hover:bg-amber-50"
            >
              <Sparkles className="w-4 h-4 mr-2" />
              Quick Search
            </Button>
            <Button 
              onClick={() => { setEditingBlend(null); setShowForm(true); }}
              className="bg-amber-700 hover:bg-amber-800"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Blend
            </Button>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
            <Input
              placeholder="Search blends..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-white border-stone-200"
            />
          </div>
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-full sm:w-40 bg-white border-stone-200">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {BLEND_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={strengthFilter} onValueChange={setStrengthFilter}>
            <SelectTrigger className="w-full sm:w-40 bg-white border-stone-200">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {STRENGTHS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
            </SelectContent>
          </Select>
          <div className="flex border border-stone-200 rounded-lg bg-white">
            <Button
              variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
              size="icon"
              onClick={() => {
                setViewMode('grid');
                localStorage.setItem('tobaccoViewMode', 'grid');
              }}
              className="rounded-r-none"
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
              className="rounded-l-none"
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
            <h3 className="text-xl font-semibold text-stone-800 mb-2">No blends found</h3>
            <p className="text-stone-500 mb-6">
              {blends.length === 0 ? "Add your first tobacco blend to start your cellar" : "Try adjusting your filters"}
            </p>
            {blends.length === 0 && (
              <Button onClick={() => setShowForm(true)} className="bg-amber-700 hover:bg-amber-800">
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
                >
                  <Link to={createPageUrl(`TobaccoDetail?id=${blend.id}`)}>
                    {viewMode === 'grid' ? (
                      <TobaccoCard blend={blend} onClick={() => {}} />
                    ) : (
                      <TobaccoListItem blend={blend} onClick={() => {}} />
                    )}
                  </Link>
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
      </div>
    </div>
  );
}