import React, { useState, useEffect } from 'react';
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getTobaccoLogo, GENERIC_TOBACCO_ICON } from "@/components/tobacco/TobaccoLogoLibrary";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { 
  ArrowLeft, Edit, Trash2, Heart, Star, Package
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { motion } from "framer-motion";
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
import CommentSection from "@/components/community/CommentSection";
import ImageModal from "@/components/ui/ImageModal";

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
  const urlParams = new URLSearchParams(window.location.search);
  const blendId = urlParams.get('id');
  const navigate = useNavigate();

  const [showEdit, setShowEdit] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [expandedImage, setExpandedImage] = useState(null);

  const queryClient = useQueryClient();

  const { data: blend, isLoading } = useQuery({
    queryKey: ['blend', blendId],
    queryFn: async () => {
      const blends = await base44.entities.TobaccoBlend.filter({ id: blendId });
      return blends[0];
    },
    enabled: !!blendId,
  });

  // Auto-populate logo from library if missing
  useEffect(() => {
    if (blend && blend.manufacturer && !blend.logo && !updateMutation.isPending) {
      const libraryLogo = getTobaccoLogo(blend.manufacturer);
      if (libraryLogo && libraryLogo !== GENERIC_TOBACCO_ICON) {
        updateMutation.mutate({ logo: libraryLogo });
      }
    }
  }, [blend?.id]);

  const { data: user } = useQuery({
    queryKey: ['current-user'],
    queryFn: () => base44.auth.me(),
    staleTime: 5000,
    retry: 1,
  });

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
    mutationFn: (data) => base44.entities.TobaccoBlend.update(blendId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['blend', blendId] });
      queryClient.invalidateQueries({ queryKey: ['blends', user?.email] });
      setShowEdit(false);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => base44.entities.TobaccoBlend.delete(blendId),
    onSuccess: () => {
      navigate(createPageUrl('Tobacco'));
    },
  });

  const toggleFavorite = () => {
    updateMutation.mutate({ is_favorite: !blend.is_favorite });
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
          <h2 className="text-2xl font-semibold text-stone-800 mb-2">Blend not found</h2>
          <Link to={createPageUrl('Tobacco')}>
            <Button variant="outline">Back to Tobacco</Button>
          </Link>
        </div>
      </div>
    );
  }

  const colorClass = BLEND_COLORS[blend.blend_type] || "bg-stone-100 text-stone-800 border-stone-200";

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#1a2c42] via-[#243548] to-[#1a2c42]">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Back Button */}
        <Link to={createPageUrl('Tobacco')}>
          <Button variant="ghost" className="mb-6 text-[#e8d5b7] hover:text-[#e8d5b7]/80">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Tobacco
          </Button>
        </Link>

        {/* Top Pipe Matches */}
        {pipes.length > 0 && (
          <div className="mb-6">
            <TopPipeMatches blend={blend} pipes={pipes} />
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
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

          {/* Blend Details */}
          <div className="space-y-6">
            <div className="flex items-start justify-between">
              <div>
                <h1 className="text-3xl font-bold text-[#e8d5b7]">{blend.name}</h1>
                <p className="text-lg text-[#e8d5b7]/70">{blend.manufacturer || 'Unknown maker'}</p>
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
            {blend.rating && (
              <div className="flex items-center gap-2">
                {[1, 2, 3, 4, 5].map(i => (
                  <Star 
                    key={i}
                    className={`w-6 h-6 ${i <= blend.rating ? 'text-amber-500 fill-current' : 'text-stone-300'}`}
                  />
                ))}
                <span className="text-stone-600 ml-2">{blend.rating}/5</span>
              </div>
            )}

            {/* Quick Info */}
            {blend.quantity_owned > 0 && (
              <Card className="bg-amber-50 border-amber-200">
                <CardContent className="p-4 flex items-center gap-3">
                  <Package className="w-5 h-5 text-amber-600" />
                  <div>
                    <p className="text-xs text-amber-600">In Cellar</p>
                    <p className="font-semibold text-amber-800">
                      {blend.quantity_owned} tin{blend.quantity_owned > 1 ? 's' : ''}
                      {blend.tin_size_oz && ` (${blend.tin_size_oz}oz each)`}
                    </p>
                  </div>
                </CardContent>
              </Card>
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
                  Room Note: {blend.room_note}
                </Badge>
              )}
            </div>

            {/* Tobacco Components */}
            {blend.tobacco_components?.length > 0 && (
              <Card className="border-stone-200">
                <CardContent className="p-4">
                  <p className="text-xs text-stone-500 mb-2">Tobacco Components</p>
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
              <Card className="border-stone-200">
                <CardContent className="p-4">
                  <p className="text-xs text-stone-500 mb-2">Flavor Notes</p>
                  <div className="flex flex-wrap gap-2">
                    {blend.flavor_notes.map((note, idx) => (
                      <Badge key={idx} variant="secondary" className="bg-stone-100 text-stone-700 border-stone-200">
                        {note}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Aging Potential */}
            {blend.aging_potential && (
              <Card className="border-stone-200">
                <CardContent className="p-4">
                  <p className="text-xs text-stone-500 mb-1">Aging Potential</p>
                  <p className="font-medium text-stone-800">{blend.aging_potential}</p>
                </CardContent>
              </Card>
            )}

            {/* Notes */}
            {blend.notes && (
              <Card className="border-stone-200">
                <CardContent className="p-4">
                  <p className="text-xs text-stone-500 mb-1">Notes</p>
                  <p className="text-stone-700">{blend.notes}</p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>

        {/* Comments Section */}
        {userProfile?.allow_comments && (
          <Card className="border-stone-200 mt-8">
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
              <SheetTitle>Edit Blend</SheetTitle>
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
              <AlertDialogTitle>Delete this blend?</AlertDialogTitle>
              <AlertDialogDescription>
                This will permanently delete "{blend.name}" from your collection. This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction 
                onClick={() => deleteMutation.mutate()}
                className="bg-rose-600 hover:bg-rose-700"
              >
                Delete
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