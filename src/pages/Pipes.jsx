import React, { useState } from 'react';
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { safeUpdate } from "@/components/utils/safeUpdate";
import { invalidatePipeQueries } from "@/components/utils/cacheInvalidation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Search, Filter, Grid3X3, List, Sparkles, Package } from "lucide-react";
import EmptyState from "@/components/EmptyState";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AnimatePresence, motion } from "framer-motion";
import { createPageUrl } from "@/components/utils/createPageUrl";
import PipeCard from "@/components/pipes/PipeCard";
import PipeListItem from "@/components/pipes/PipeListItem";
import PipeForm from "@/components/pipes/PipeForm";
import QuickSearchPipe from "@/components/ai/QuickSearchPipe";
import PipeExporter from "@/components/export/PipeExporter";
import { PK_THEME } from "@/components/utils/pkTheme";
import { PkPageTitle, PkText } from "@/components/ui/PkSectionHeader";
import { canCreatePipe } from "@/components/utils/limitChecks";
import { toast } from "sonner";
import { useCurrentUser } from "@/components/hooks/useCurrentUser";

const SHAPES = ["All Shapes", "Acorn", "Apple", "Author", "Bent", "Billiard", "Bulldog", "Calabash", "Canadian", "Cavalier", "Cherry Wood", "Chimney", "Churchwarden", "Cutty", "Devil Anse", "Dublin", "Egg", "Freehand", "Hawkbill", "Horn", "Hungarian", "Liverpool", "Lovat", "Nautilus", "Oom Paul", "Other", "Panel", "Poker", "Pot", "Prince", "Rhodesian", "Sitter", "Tomato", "Volcano", "Woodstock", "Zulu"];
const MATERIALS = ["All Materials", "Briar", "Cherry Wood", "Clay", "Corn Cob", "Meerschaum", "Morta", "Olive Wood", "Other"];

export default function PipesPage() {
  const [showForm, setShowForm] = useState(false);
  const [editingPipe, setEditingPipe] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [shapeFilter, setShapeFilter] = useState('All Shapes');
  const [materialFilter, setMaterialFilter] = useState('All Materials');
  const [viewMode, setViewMode] = useState(() => {
    return localStorage.getItem('pipesViewMode') || 'grid';
  });
  const [showQuickSearch, setShowQuickSearch] = useState(false);
  const [sortBy, setSortBy] = useState('date');

  const queryClient = useQueryClient();

  const { user, hasPaidAccess, isTrialing } = useCurrentUser();

  const { data: pipes = [], isLoading } = useQuery({
    queryKey: ['pipes', user?.email],
    queryFn: async () => {
      try {
        const result = await base44.entities.Pipe.filter({ created_by: user?.email }, '-created_date');
        return Array.isArray(result) ? result : [];
      } catch (err) {
        console.error('Pipes load error:', err);
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
      const limitCheck = await canCreatePipe(user?.email, hasPaidAccess, isTrialing);
      if (!limitCheck.canCreate) {
        throw new Error(limitCheck.reason || 'Cannot create pipe');
      }
      return base44.entities.Pipe.create(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pipes', user?.email] });
      setShowForm(false);
      toast.success('Pipe added successfully!');
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to add pipe');
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => safeUpdate('Pipe', id, data, user?.email),
    onSuccess: () => {
      invalidatePipeQueries(queryClient, user?.email);
      setShowForm(false);
      setEditingPipe(null);
    },
  });

  const handleSave = (data) => {
    if (editingPipe) {
      updateMutation.mutate({ id: editingPipe.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleEdit = (pipe) => {
    setEditingPipe(pipe);
    setShowForm(true);
  };

  const handleQuickSearchAdd = (pipe) => {
    queryClient.invalidateQueries({ queryKey: ['pipes', user?.email] });
    // Open the edit form for the newly added pipe
    setEditingPipe(pipe);
    setShowForm(true);
  };

  const toggleFavoriteMutation = useMutation({
    mutationFn: ({ id, is_favorite }) => safeUpdate('Pipe', id, { is_favorite }, user?.email),
    onMutate: async ({ id, is_favorite }) => {
      await queryClient.cancelQueries({ queryKey: ['pipes', user?.email] });
      const previousPipes = queryClient.getQueryData(['pipes', user?.email]);
      queryClient.setQueryData(['pipes', user?.email], (old) =>
        old.map(p => p.id === id ? { ...p, is_favorite } : p)
      );
      return { previousPipes };
    },
    onError: (err, variables, context) => {
      queryClient.setQueryData(['pipes', user?.email], context.previousPipes);
    },
  });

  const handleToggleFavorite = (pipe) => {
    toggleFavoriteMutation.mutate({ id: pipe.id, is_favorite: !pipe.is_favorite });
  };

  const filteredPipes = pipes.filter(pipe => {
    const matchesSearch = !searchQuery || 
      pipe.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      pipe.maker?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesShape = shapeFilter === 'All Shapes' || pipe.shape === shapeFilter;
    const matchesMaterial = materialFilter === 'All Materials' || pipe.bowl_material === materialFilter;
    return matchesSearch && matchesShape && matchesMaterial;
  }).sort((a, b) => {
    if (sortBy === 'favorites') {
      if (a.is_favorite && !b.is_favorite) return -1;
      if (!a.is_favorite && b.is_favorite) return 1;
      return new Date(b.created_date || 0) - new Date(a.created_date || 0);
    }
    if (sortBy === 'maker') {
      const makerA = (a.maker || '').toLowerCase();
      const makerB = (b.maker || '').toLowerCase();
      return makerA.localeCompare(makerB);
    }
    if (sortBy === 'name') {
      const nameA = (a.name || '').toLowerCase();
      const nameB = (b.name || '').toLowerCase();
      return nameA.localeCompare(nameB);
    }
    // Default: date (newest first)
    return new Date(b.created_date || 0) - new Date(a.created_date || 0);
  });

  const totalValue = pipes.reduce((sum, p) => sum + (p.estimated_value || 0), 0);

  return (
    <div className={`min-h-screen ${PK_THEME.pageBg}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col gap-4 mb-8"
        >
          <div>
            <PkPageTitle>My Pipes</PkPageTitle>
            <PkText className="mt-1">
              {pipes.length} pipes {totalValue > 0 && `• $${totalValue.toLocaleString()} total value`}
            </PkText>
          </div>
          <div className="flex flex-wrap gap-2">
            <PipeExporter />
            <Button 
              onClick={() => setShowQuickSearch(true)}
              variant="outline"
              className="border-[#E0D8C8]/50 text-[#E0D8C8] font-semibold flex-shrink-0"
            >
              <Sparkles className="w-4 h-4 mr-2" />
              <span className="hidden sm:inline">Quick Search & Add</span>
              <span className="sm:hidden">Quick Search</span>
            </Button>
            <Button 
              onClick={async () => {
                const limitCheck = await canCreatePipe(user?.email, hasPaidAccess, isTrialing);
                if (!limitCheck.canCreate) {
                  toast.error(limitCheck.reason, {
                    action: {
                      label: 'Upgrade',
                      onClick: () => window.location.href = createPageUrl('Subscription')
                    }
                  });
                  return;
                }
                setEditingPipe(null);
                setShowForm(true);
              }}
              className="bg-gradient-to-r from-[#A35C5C] to-[#8B4A4A] hover:from-[#8B4A4A] hover:to-[#A35C5C] shadow-md hover:shadow-lg flex-shrink-0"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Pipe
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
              placeholder="Search by name, maker, or shape..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={`pl-10 ${PK_THEME.input}`}
              aria-label="Search pipes"
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 sm:gap-3">
            <Select value={shapeFilter} onValueChange={setShapeFilter}>
              <SelectTrigger className={PK_THEME.input} aria-label="Filter by shape">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SHAPES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={materialFilter} onValueChange={setMaterialFilter}>
              <SelectTrigger className={PK_THEME.input} aria-label="Filter by material">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {MATERIALS.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className={PK_THEME.input} aria-label="Sort by">
                <SelectValue placeholder="Sort by..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="date">Newest First</SelectItem>
                <SelectItem value="favorites">Favorites First</SelectItem>
                <SelectItem value="maker">By Maker</SelectItem>
                <SelectItem value="name">By Name</SelectItem>
              </SelectContent>
            </Select>
            <div className={`flex border rounded-lg w-full sm:w-fit justify-center sm:justify-start ${PK_THEME.card}`} role="group" aria-label="View mode">
              <Button
                variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
                size="icon"
                onClick={() => {
                  setViewMode('grid');
                  localStorage.setItem('pipesViewMode', 'grid');
                }}
                className={`rounded-r-none flex-1 sm:flex-none ${viewMode === 'grid' ? PK_THEME.buttonPrimary : `${PK_THEME.textSubtle} hover:bg-[#2C3E55]/50`}`}
                aria-label="Grid view"
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
                className={`rounded-l-none flex-1 sm:flex-none ${viewMode === 'list' ? PK_THEME.buttonPrimary : `${PK_THEME.textSubtle} hover:bg-[#2C3E55]/50`}`}
                aria-label="List view"
                aria-pressed={viewMode === 'list'}
              >
                <List className="w-4 h-4" />
              </Button>
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
            title={pipes.length === 0 ? "Start Your Collection" : "No Pipes Found"}
            description={
              pipes.length === 0 
                ? "Begin your pipe journey by adding your first piece. Track details, photos, and smoking notes all in one place."
                : searchQuery 
                  ? `No pipes match "${searchQuery}". Try adjusting your search or filters.`
                  : "No pipes match your current filters. Try adjusting your selections."
            }
            actionLabel={pipes.length === 0 ? "Add Your First Pipe" : null}
            onAction={pipes.length === 0 ? () => setShowForm(true) : null}
            secondaryActionLabel={pipes.length === 0 ? "Quick Search & Add" : searchQuery || shapeFilter !== 'All Shapes' || materialFilter !== 'All Materials' ? "Clear Filters" : null}
            onSecondaryAction={pipes.length === 0 ? () => setShowQuickSearch(true) : () => { setSearchQuery(''); setShapeFilter('All Shapes'); setMaterialFilter('All Materials'); }}
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
                  <a href={createPageUrl(`PipeDetail?id=${encodeURIComponent(pipe.id)}`)}>
                    {viewMode === 'grid' ? (
                      <PipeCard pipe={pipe} onClick={() => {}} onToggleFavorite={handleToggleFavorite} />
                    ) : (
                      <PipeListItem pipe={pipe} onClick={() => {}} onToggleFavorite={handleToggleFavorite} />
                    )}
                  </a>
                </motion.div>
              ))}
            </AnimatePresence>
          </motion.div>
        )}

        {/* Add/Edit Form Sheet */}
        <Sheet open={showForm} onOpenChange={setShowForm}>
          <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
            <SheetHeader className="mb-6">
              <SheetTitle>{editingPipe ? 'Edit Pipe' : 'Add New Pipe'}</SheetTitle>
            </SheetHeader>
            <PipeForm
              pipe={editingPipe}
              onSave={handleSave}
              onCancel={() => { setShowForm(false); setEditingPipe(null); }}
              isLoading={createMutation.isPending || updateMutation.isPending}
            />
          </SheetContent>
        </Sheet>

        {/* Quick Search Dialog */}
        <QuickSearchPipe
          open={showQuickSearch}
          onOpenChange={setShowQuickSearch}
          onAdd={handleQuickSearchAdd}
        />
      </div>
    </div>
  );
}