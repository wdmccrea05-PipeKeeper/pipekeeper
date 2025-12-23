import React, { useState } from 'react';
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { 
  ArrowLeft, Edit, Trash2, Heart, DollarSign, 
  Sparkles, ScanSearch, Ruler, Calendar, MapPin, ArrowLeftRight, Weight 
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
import PipeForm from "@/components/pipes/PipeForm";
import MatchingEngine from "@/components/ai/MatchingEngine";
import ValueLookup from "@/components/ai/ValueLookup";
import PipeIdentifier from "@/components/ai/PipeIdentifier";
import PipeShapeIcon from "@/components/pipes/PipeShapeIcon";
import PipeSpecialization from "@/components/pipes/PipeSpecialization";
import TopBlendMatches from "@/components/pipes/TopBlendMatches";
import UpgradePrompt from "@/components/subscription/UpgradePrompt";

export default function PipeDetailPage() {
  const urlParams = new URLSearchParams(window.location.search);
  const pipeId = urlParams.get('id');
  const navigate = useNavigate();

  const [showEdit, setShowEdit] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState(0);
  const [useImperial, setUseImperial] = useState(false);

  const queryClient = useQueryClient();

  const { data: pipe, isLoading } = useQuery({
    queryKey: ['pipe', pipeId],
    queryFn: async () => {
      const pipes = await base44.entities.Pipe.filter({ id: pipeId });
      return pipes[0];
    },
    enabled: !!pipeId,
  });

  const { data: user } = useQuery({
    queryKey: ['current-user'],
    queryFn: () => base44.auth.me(),
  });

  const { data: blends = [] } = useQuery({
    queryKey: ['blends', user?.email],
    queryFn: () => base44.entities.TobaccoBlend.filter({ created_by: user?.email }),
    enabled: !!user?.email,
  });

  const { data: userProfile } = useQuery({
    queryKey: ['user-profile', user?.email],
    queryFn: async () => {
      const profiles = await base44.entities.UserProfile.filter({ user_email: user?.email });
      return profiles[0];
    },
    enabled: !!user?.email,
  });

  // Check if user has paid access (subscription or 7-day trial)
  const isWithinTrial = user?.created_date && 
    new Date().getTime() - new Date(user.created_date).getTime() < 7 * 24 * 60 * 60 * 1000;
  const isPaidUser = user?.subscription_level === 'paid' || isWithinTrial;

  const updateMutation = useMutation({
    mutationFn: (data) => base44.entities.Pipe.update(pipeId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pipe', pipeId] });
      queryClient.invalidateQueries({ queryKey: ['pipes', user?.email] });
      setShowEdit(false);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => base44.entities.Pipe.delete(pipeId),
    onSuccess: () => {
      navigate(createPageUrl('Pipes'));
    },
  });

  const toggleFavorite = () => {
    updateMutation.mutate({ is_favorite: !pipe.is_favorite });
  };

  const handleValueUpdate = (value) => {
    updateMutation.mutate({ estimated_value: value });
  };

  const handlePipeUpdate = (updates) => {
    updateMutation.mutate(updates);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#1a2c42] via-[#243548] to-[#1a2c42] p-8">
        <div className="max-w-6xl mx-auto">
          <div className="animate-pulse space-y-6">
            <div className="h-8 w-48 bg-stone-200 rounded" />
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
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

  if (!pipe) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#1a2c42] via-[#243548] to-[#1a2c42] flex items-center justify-center">
        <div className="text-center">
          <img 
            src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/694956e18d119cc497192525/021ed482a_smoking-pipe-silhouette-vintage-accessories-icon-sign-and-symbol-tobacco-pipe-illustration-vector.jpg"
            alt="Pipe not found"
            className="w-24 h-24 mx-auto mb-4 object-contain opacity-30 mix-blend-multiply"
          />
          <h2 className="text-2xl font-semibold text-stone-800 mb-2">Pipe not found</h2>
          <Link to={createPageUrl('Pipes')}>
            <Button variant="outline">Back to Pipes</Button>
          </Link>
        </div>
      </div>
    );
  }

  const allPhotos = [...(pipe.photos || []), ...(pipe.stamping_photos || [])];

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#1a2c42] via-[#243548] to-[#1a2c42]">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Back Button */}
        <Link to={createPageUrl('Pipes')}>
          <Button variant="ghost" className="mb-6 text-stone-600 hover:text-stone-800">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Pipes
          </Button>
        </Link>

        {/* Pipe Specialization */}
        {blends.length > 0 && (
          <div className="mb-6">
            <PipeSpecialization 
              pipe={pipe} 
              blends={blends}
              onUpdate={(data) => updateMutation.mutate(data)}
              isPaidUser={isPaidUser}
            />
          </div>
        )}

        {/* Top Blend Matches */}
        {blends.length > 0 && (
          <div className="mb-6">
            <TopBlendMatches 
              pipe={pipe} 
              blends={blends}
              userProfile={userProfile}
            />
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Photo Gallery */}
          <div className="space-y-4">
            <motion.div 
              className="aspect-square rounded-2xl overflow-hidden bg-gradient-to-br from-stone-100 to-stone-200 shadow-xl"
              layoutId={`pipe-${pipe.id}`}
            >
              {allPhotos.length > 0 ? (
                <img 
                  src={allPhotos[selectedPhoto]} 
                  alt={pipe.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <div className="text-stone-400 text-center">
                    <PipeShapeIcon shape={pipe.shape} className="text-9xl mb-4" />
                    <p>{pipe.shape || 'No photos'}</p>
                  </div>
                </div>
              )}
            </motion.div>
            {allPhotos.length > 1 && (
              <div className="flex gap-2 overflow-x-auto pb-2">
                {allPhotos.map((photo, idx) => (
                  <button
                    key={idx}
                    onClick={() => setSelectedPhoto(idx)}
                    className={`w-16 h-16 rounded-lg overflow-hidden shrink-0 transition-all ${
                      selectedPhoto === idx 
                        ? 'ring-2 ring-amber-600 ring-offset-2' 
                        : 'opacity-70 hover:opacity-100'
                    }`}
                  >
                    <img src={photo} alt="" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Pipe Details */}
          <div className="space-y-6">
            <div className="flex items-start justify-between">
              <div>
                <h1 className="text-3xl font-bold text-stone-800">{pipe.name}</h1>
                <p className="text-lg text-stone-500">{pipe.maker || 'Unknown maker'}</p>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={toggleFavorite}
                  className={pipe.is_favorite ? 'text-rose-500' : 'text-stone-400'}
                >
                  <Heart className={`w-5 h-5 ${pipe.is_favorite ? 'fill-current' : ''}`} />
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

            {/* Quick Info */}
            <div className="grid grid-cols-2 gap-4">
              {pipe.estimated_value && (
                <Card className="bg-emerald-50 border-emerald-200">
                  <CardContent className="p-4 flex items-center gap-3">
                    <DollarSign className="w-5 h-5 text-emerald-600" />
                    <div>
                      <p className="text-xs text-emerald-600">Est. Value</p>
                      <p className="font-semibold text-emerald-800">${pipe.estimated_value.toLocaleString()}</p>
                    </div>
                  </CardContent>
                </Card>
              )}
              {pipe.purchase_price && (
                <Card className="bg-amber-50 border-amber-200">
                  <CardContent className="p-4 flex items-center gap-3">
                    <DollarSign className="w-5 h-5 text-amber-600" />
                    <div>
                      <p className="text-xs text-amber-600">Paid</p>
                      <p className="font-semibold text-amber-800">${pipe.purchase_price.toLocaleString()}</p>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Badges */}
            <div className="flex flex-wrap gap-2">
              {pipe.shape && (
                <Badge className="bg-amber-100 text-amber-800 border-amber-200">
                  {pipe.shape}
                </Badge>
              )}
              {pipe.bowl_material && (
                <Badge className="bg-stone-100 text-stone-700 border-stone-200">
                  {pipe.bowl_material}
                </Badge>
              )}
              {pipe.chamber_volume && (
                <Badge className="bg-amber-50 text-amber-700 border-amber-200">
                  {pipe.chamber_volume} chamber
                </Badge>
              )}
              {pipe.condition && (
                <Badge className="bg-blue-100 text-blue-800 border-blue-200">
                  {pipe.condition}
                </Badge>
              )}
            </div>

            {/* Details Grid */}
            <Card className="border-stone-200">
              <CardContent className="p-6">
                <div className="flex justify-end mb-3">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setUseImperial(!useImperial)}
                  >
                    <ArrowLeftRight className="w-3 h-3 mr-2" />
                    {useImperial ? 'mm' : 'inches'}
                  </Button>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  {pipe.length_mm && (
                    <div className="flex items-center gap-2">
                      <Ruler className="w-4 h-4 text-stone-400" />
                      <div>
                        <p className="text-xs text-stone-500">Length</p>
                        <p className="font-medium text-stone-800">
                          {useImperial ? `${(pipe.length_mm / 25.4).toFixed(2)}"` : `${pipe.length_mm}mm`}
                        </p>
                      </div>
                    </div>
                  )}
                  {pipe.weight_grams && (
                    <div className="flex items-center gap-2">
                      <Weight className="w-4 h-4 text-stone-400" />
                      <div>
                        <p className="text-xs text-stone-500">Weight</p>
                        <p className="font-medium text-stone-800">
                          {useImperial ? `${(pipe.weight_grams / 28.35).toFixed(2)}oz` : `${pipe.weight_grams}g`}
                        </p>
                      </div>
                    </div>
                  )}
                  {pipe.bowl_height_mm && (
                    <div>
                      <p className="text-xs text-stone-500">Bowl Height</p>
                      <p className="font-medium text-stone-800">
                        {useImperial ? `${(pipe.bowl_height_mm / 25.4).toFixed(2)}"` : `${pipe.bowl_height_mm}mm`}
                      </p>
                    </div>
                  )}
                  {pipe.bowl_width_mm && (
                    <div>
                      <p className="text-xs text-stone-500">Bowl Width</p>
                      <p className="font-medium text-stone-800">
                        {useImperial ? `${(pipe.bowl_width_mm / 25.4).toFixed(2)}"` : `${pipe.bowl_width_mm}mm`}
                      </p>
                    </div>
                  )}
                  {pipe.bowl_diameter_mm && (
                    <div>
                      <p className="text-xs text-stone-500">Chamber Diameter</p>
                      <p className="font-medium text-stone-800">
                        {useImperial ? `${(pipe.bowl_diameter_mm / 25.4).toFixed(2)}"` : `${pipe.bowl_diameter_mm}mm`}
                      </p>
                    </div>
                  )}
                  {pipe.bowl_depth_mm && (
                    <div>
                      <p className="text-xs text-stone-500">Chamber Depth</p>
                      <p className="font-medium text-stone-800">
                        {useImperial ? `${(pipe.bowl_depth_mm / 25.4).toFixed(2)}"` : `${pipe.bowl_depth_mm}mm`}
                      </p>
                    </div>
                  )}
                  {pipe.country_of_origin && (
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-stone-400" />
                      <div>
                        <p className="text-xs text-stone-500">Origin</p>
                        <p className="font-medium text-stone-800">{pipe.country_of_origin}</p>
                      </div>
                    </div>
                  )}
                  {pipe.year_made && (
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-stone-400" />
                      <div>
                        <p className="text-xs text-stone-500">Year</p>
                        <p className="font-medium text-stone-800">{pipe.year_made}</p>
                      </div>
                    </div>
                  )}
                  {pipe.stem_material && (
                    <div>
                      <p className="text-xs text-stone-500">Stem</p>
                      <p className="font-medium text-stone-800">{pipe.stem_material}</p>
                    </div>
                  )}
                  {pipe.finish && (
                    <div>
                      <p className="text-xs text-stone-500">Finish</p>
                      <p className="font-medium text-stone-800">{pipe.finish}</p>
                    </div>
                  )}
                  {pipe.filter_type && (
                    <div>
                      <p className="text-xs text-stone-500">Filter</p>
                      <p className="font-medium text-stone-800">{pipe.filter_type}</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Stamping */}
            {pipe.stamping && (
              <Card className="border-stone-200">
                <CardContent className="p-6">
                  <p className="text-xs text-stone-500 mb-1">Stamping</p>
                  <p className="font-medium text-stone-800">{pipe.stamping}</p>
                </CardContent>
              </Card>
            )}

            {/* Notes */}
            {(pipe.smoking_characteristics || pipe.notes) && (
              <Card className="border-stone-200">
                <CardContent className="p-6 space-y-4">
                  {pipe.smoking_characteristics && (
                    <div>
                      <p className="text-xs text-stone-500 mb-1">Smoking Characteristics</p>
                      <p className="text-stone-700">{pipe.smoking_characteristics}</p>
                    </div>
                  )}
                  {pipe.notes && (
                    <div>
                      <p className="text-xs text-stone-500 mb-1">Notes</p>
                      <p className="text-stone-700">{pipe.notes}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        </div>

        {/* AI Features Tabs */}
        <Tabs defaultValue="match" className="space-y-6">
          <TabsList className="bg-white border border-stone-200 p-1">
            <TabsTrigger value="match" className="data-[state=active]:bg-amber-100 data-[state=active]:text-amber-800">
              <Sparkles className="w-4 h-4 mr-2" />
              Tobacco Matching
            </TabsTrigger>
            <TabsTrigger value="value" className="data-[state=active]:bg-emerald-100 data-[state=active]:text-emerald-800">
              <DollarSign className="w-4 h-4 mr-2" />
              Value Lookup
            </TabsTrigger>
            <TabsTrigger value="identify" className="data-[state=active]:bg-violet-100 data-[state=active]:text-violet-800">
              <ScanSearch className="w-4 h-4 mr-2" />
              Identify Pipe
            </TabsTrigger>
          </TabsList>

          <TabsContent value="match">
            <Card className="border-stone-200">
              <CardContent className="p-6">
                <MatchingEngine pipe={pipe} blends={blends} isPaidUser={isPaidUser} />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="value">
            <Card className="border-stone-200">
              <CardContent className="p-6">
                {isPaidUser ? (
                  <ValueLookup pipe={pipe} onUpdateValue={handleValueUpdate} />
                ) : (
                  <UpgradePrompt 
                    featureName="AI Value Lookup"
                    description="Get instant market value estimates for your pipes based on maker, model, condition, and current market trends."
                  />
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="identify">
            <Card className="border-stone-200">
              <CardContent className="p-6">
                {isPaidUser ? (
                  <PipeIdentifier pipe={pipe} onUpdatePipe={handlePipeUpdate} />
                ) : (
                  <UpgradePrompt 
                    featureName="AI Pipe Identification"
                    description="Use advanced AI to identify your pipe's maker, model, year, and other details from photos of stampings and characteristics."
                  />
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Edit Sheet */}
        <Sheet open={showEdit} onOpenChange={setShowEdit}>
          <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
            <SheetHeader className="mb-6">
              <SheetTitle>Edit Pipe</SheetTitle>
            </SheetHeader>
            <PipeForm
              pipe={pipe}
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
              <AlertDialogTitle>Delete this pipe?</AlertDialogTitle>
              <AlertDialogDescription>
                This will permanently delete "{pipe.name}" from your collection. This action cannot be undone.
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
      </div>
    </div>
  );
}