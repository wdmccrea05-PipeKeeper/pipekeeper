import React, { useState } from 'react';
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Search, Filter, Grid3X3, List, Sparkles } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AnimatePresence, motion } from "framer-motion";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import PipeCard from "@/components/pipes/PipeCard";
import PipeListItem from "@/components/pipes/PipeListItem";
import PipeForm from "@/components/pipes/PipeForm";
import QuickSearchPipe from "@/components/ai/QuickSearchPipe";

const SHAPES = ["All Shapes", "Billiard", "Bulldog", "Dublin", "Apple", "Author", "Bent", "Canadian", "Churchwarden", "Freehand", "Lovat", "Poker", "Prince", "Rhodesian", "Zulu", "Other"];
const MATERIALS = ["All Materials", "Briar", "Meerschaum", "Corn Cob", "Clay", "Other"];

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

  const queryClient = useQueryClient();

  const { data: user } = useQuery({
    queryKey: ['current-user'],
    queryFn: () => base44.auth.me(),
  });

  const { data: pipes = [], isLoading } = useQuery({
    queryKey: ['pipes', user?.email],
    queryFn: () => base44.entities.Pipe.filter({ created_by: user.email }, '-created_date'),
    enabled: !!user,
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Pipe.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pipes'] });
      setShowForm(false);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Pipe.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pipes'] });
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
    queryClient.invalidateQueries({ queryKey: ['pipes'] });
    // Open the edit form for the newly added pipe
    setEditingPipe(pipe);
    setShowForm(true);
  };

  const filteredPipes = pipes.filter(pipe => {
    const matchesSearch = !searchQuery || 
      pipe.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      pipe.maker?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesShape = shapeFilter === 'All Shapes' || pipe.shape === shapeFilter;
    const matchesMaterial = materialFilter === 'All Materials' || pipe.bowl_material === materialFilter;
    return matchesSearch && matchesShape && matchesMaterial;
  });

  const totalValue = pipes.reduce((sum, p) => sum + (p.estimated_value || 0), 0);

  return (
    <div className="min-h-screen bg-gradient-to-br from-stone-50 via-amber-50/30 to-stone-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-stone-800">My Pipes</h1>
            <p className="text-stone-500 mt-1">
              {pipes.length} pipes {totalValue > 0 && `• $${totalValue.toLocaleString()} total value`}
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
              onClick={() => { setEditingPipe(null); setShowForm(true); }}
              className="bg-amber-700 hover:bg-amber-800"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Pipe
            </Button>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
            <Input
              placeholder="Search pipes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-white border-stone-200"
            />
          </div>
          <Select value={shapeFilter} onValueChange={setShapeFilter}>
            <SelectTrigger className="w-full sm:w-40 bg-white border-stone-200">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SHAPES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={materialFilter} onValueChange={setMaterialFilter}>
            <SelectTrigger className="w-full sm:w-40 bg-white border-stone-200">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {MATERIALS.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
            </SelectContent>
          </Select>
          <div className="flex border border-stone-200 rounded-lg bg-white">
            <Button
              variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
              size="icon"
              onClick={() => {
                setViewMode('grid');
                localStorage.setItem('pipesViewMode', 'grid');
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
                localStorage.setItem('pipesViewMode', 'list');
              }}
              className="rounded-l-none"
            >
              <List className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Pipes Grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {[1,2,3,4].map(i => (
              <div key={i} className="aspect-[4/5] bg-stone-200 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : filteredPipes.length === 0 ? (
          <div className="text-center py-16">
            <img 
              src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/694956e18d119cc497192525/021ed482a_smoking-pipe-silhouette-vintage-accessories-icon-sign-and-symbol-tobacco-pipe-illustration-vector.jpg"
              alt="No pipes"
              className="w-24 h-24 mx-auto mb-4 object-contain opacity-30 mix-blend-multiply"
            />
            <h3 className="text-xl font-semibold text-stone-800 mb-2">No pipes found</h3>
            <p className="text-stone-500 mb-6">
              {pipes.length === 0 ? "Add your first pipe to start building your collection" : "Try adjusting your filters"}
            </p>
            {pipes.length === 0 && (
              <Button onClick={() => setShowForm(true)} className="bg-amber-700 hover:bg-amber-800">
                <Plus className="w-4 h-4 mr-2" />
                Add Your First Pipe
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
              {filteredPipes.map(pipe => (
                <motion.div
                  key={pipe.id}
                  layout
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                >
                  <Link to={createPageUrl(`PipeDetail?id=${pipe.id}`)}>
                    {viewMode === 'grid' ? (
                      <PipeCard pipe={pipe} onClick={() => {}} />
                    ) : (
                      <PipeListItem pipe={pipe} onClick={() => {}} />
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