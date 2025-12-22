import React, { useState, useEffect } from 'react';
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { motion } from "framer-motion";
import { 
  ArrowRight, Heart, DollarSign, 
  Leaf, Package, Star, Sparkles, Search, Camera
} from "lucide-react";
import PairingMatrix from "@/components/home/PairingMatrix";
import PipeShapeIcon from "@/components/pipes/PipeShapeIcon";
import CollectionOptimizer from "@/components/ai/CollectionOptimizer";
import PairingGrid from "@/components/home/PairingGrid";
import OnboardingFlow from "@/components/onboarding/OnboardingFlow";
import UpgradePrompt from "@/components/subscription/UpgradePrompt";

const PIPE_ICON = 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/694956e18d119cc497192525/5c08e5ef6_bent_billiard_pipe_thick_lines_short_stem_transparent.png';

export default function HomePage() {
  const [showOnboarding, setShowOnboarding] = useState(false);

  const { data: user } = useQuery({
    queryKey: ['current-user'],
    queryFn: () => base44.auth.me(),
  });

  // Check if user has paid access (subscription or 7-day trial)
  const isWithinTrial = user?.created_date && 
    new Date().getTime() - new Date(user.created_date).getTime() < 7 * 24 * 60 * 60 * 1000;
  const isPaidUser = user?.subscription_level === 'paid' || isWithinTrial;

  const { data: onboardingStatus, isLoading: onboardingLoading } = useQuery({
    queryKey: ['onboarding-status', user?.email],
    queryFn: async () => {
      const results = await base44.entities.OnboardingStatus.filter({ user_email: user.email });
      return results[0];
    },
    enabled: !!user,
  });

  const createOnboardingMutation = useMutation({
    mutationFn: (data) => base44.entities.OnboardingStatus.create(data),
  });

  const updateOnboardingMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.OnboardingStatus.update(id, data),
  });

  useEffect(() => {
    if (!onboardingLoading && user && !onboardingStatus) {
      setShowOnboarding(true);
    } else if (onboardingStatus && !onboardingStatus.completed && !onboardingStatus.skipped) {
      setShowOnboarding(true);
    }
  }, [user, onboardingStatus, onboardingLoading]);

  const handleOnboardingComplete = async () => {
    if (onboardingStatus) {
      await updateOnboardingMutation.mutateAsync({
        id: onboardingStatus.id,
        data: { completed: true, current_step: 5 }
      });
    } else if (user) {
      await createOnboardingMutation.mutateAsync({
        user_email: user.email,
        completed: true,
        current_step: 5
      });
    }
    setShowOnboarding(false);
  };

  const handleOnboardingSkip = async () => {
    if (onboardingStatus) {
      await updateOnboardingMutation.mutateAsync({
        id: onboardingStatus.id,
        data: { skipped: true }
      });
    } else if (user) {
      await createOnboardingMutation.mutateAsync({
        user_email: user.email,
        skipped: true,
        current_step: 0
      });
    }
    setShowOnboarding(false);
  };

  const { data: pipes = [] } = useQuery({
    queryKey: ['pipes', user?.email],
    queryFn: () => base44.entities.Pipe.filter({ created_by: user.email }, '-created_date'),
    enabled: !!user,
  });

  const { data: blends = [] } = useQuery({
    queryKey: ['blends', user?.email],
    queryFn: () => base44.entities.TobaccoBlend.filter({ created_by: user.email }, '-created_date'),
    enabled: !!user,
  });

  const totalPipeValue = pipes.reduce((sum, p) => sum + (p.estimated_value || 0), 0);
  const totalTins = blends.reduce((sum, b) => sum + (b.quantity_owned || 0), 0);
  const favoritePipes = pipes.filter(p => p.is_favorite);
  const favoriteBlends = blends.filter(b => b.is_favorite);
  const recentPipes = pipes.slice(0, 4);
  const recentBlends = blends.slice(0, 4);

  return (
    <>
      {showOnboarding && (
        <OnboardingFlow 
          onComplete={handleOnboardingComplete}
          onSkip={handleOnboardingSkip}
        />
      )}
      <div className="min-h-screen bg-gradient-to-br from-[#1a2c42] via-[#243548] to-[#1a2c42]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Hero */}
        <motion.div 
          className="text-center mb-12"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <h1 className="text-4xl md:text-5xl font-bold text-[#e8d5b7] mb-4">
            Pipe & Tobacco Collection
          </h1>
          <p className="text-lg text-[#e8d5b7]/70 max-w-2xl mx-auto">
            Manage your pipes and tobacco blends with AI-powered search, photo identification, 
            pairing suggestions, and market valuations.
          </p>
        </motion.div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <Link to={createPageUrl('Pipes')}>
              <Card className="bg-gradient-to-br from-[#8b3a3a] to-[#6d2e2e] border-[#e8d5b7]/30 cursor-pointer hover:shadow-lg transition-shadow">
                <CardContent className="p-6 text-center">
                  <img src={PIPE_ICON} alt="Pipes" className="w-10 h-10 mx-auto mb-2 object-contain brightness-0 invert" />
                  <p className="text-3xl font-bold text-[#e8d5b7]">{pipes.length}</p>
                  <p className="text-sm text-[#e8d5b7]/80">Pipes</p>
                </CardContent>
              </Card>
            </Link>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Card className="bg-gradient-to-br from-[#d4a574] to-[#b8935f] border-[#e8d5b7]/30">
              <CardContent className="p-6 text-center">
                <DollarSign className="w-8 h-8 mx-auto mb-2 text-[#1a2c42]" />
                <p className="text-3xl font-bold text-[#1a2c42]">${totalPipeValue.toLocaleString()}</p>
                <p className="text-sm text-[#1a2c42]/80">Collection Value</p>
              </CardContent>
            </Card>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <Link to={createPageUrl('Tobacco')}>
              <Card className="bg-gradient-to-br from-[#8b3a3a] to-[#6d2e2e] border-[#e8d5b7]/30 cursor-pointer hover:shadow-lg transition-shadow">
                <CardContent className="p-6 text-center">
                  <Leaf className="w-8 h-8 mx-auto mb-2 text-[#e8d5b7]" />
                  <p className="text-3xl font-bold text-[#e8d5b7]">{blends.length}</p>
                  <p className="text-sm text-[#e8d5b7]/80">Tobacco Blends</p>
                </CardContent>
              </Card>
            </Link>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <Card className="bg-gradient-to-br from-[#d4a574] to-[#b8935f] border-[#e8d5b7]/30">
              <CardContent className="p-6 text-center">
                <Package className="w-8 h-8 mx-auto mb-2 text-[#1a2c42]" />
                <p className="text-3xl font-bold text-[#1a2c42]">{totalTins}</p>
                <p className="text-sm text-[#1a2c42]/80">Tins in Cellar</p>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Quick Actions */}
        <div className="grid md:grid-cols-2 gap-6 mb-12">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.5 }}
          >
            <Card className="h-full hover:shadow-lg transition-shadow border-[#e8d5b7]/30 overflow-hidden bg-[#243548]">
              <div className="bg-gradient-to-r from-[#8b3a3a] to-[#6d2e2e] p-6 text-white">
                <div className="flex items-center gap-3 mb-2">
                  <img src={PIPE_ICON} alt="Pipes" className="w-10 h-10 object-contain brightness-0 invert" />
                  <div>
                    <h3 className="text-xl font-bold">Pipe Collection</h3>
                    <p className="text-[#e8d5b7]/80">Track and value your pipes</p>
                  </div>
                </div>
              </div>
              <CardContent className="p-6">
                <ul className="space-y-2 text-[#e8d5b7]/80 mb-6">
                  <li className="flex items-center gap-2">
                    <Search className="w-4 h-4 text-[#d4a574]" />
                    AI web search to auto-fill pipe details
                  </li>
                  <li className="flex items-center gap-2">
                    <Camera className="w-4 h-4 text-[#d4a574]" />
                    Photo identification from stamps
                  </li>
                  <li className="flex items-center gap-2">
                    <DollarSign className="w-4 h-4 text-[#d4a574]" />
                    Market value lookup
                  </li>
                  <li className="flex items-center gap-2">
                    <Star className="w-4 h-4 text-[#d4a574]" />
                    Tobacco pairing suggestions
                  </li>
                </ul>
                <Link to={createPageUrl('Pipes')}>
                  <Button className="w-full bg-[#8b3a3a] hover:bg-[#6d2e2e]">
                    View Pipes
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.6 }}
          >
            <Card className="h-full hover:shadow-lg transition-shadow border-[#e8d5b7]/30 overflow-hidden bg-[#243548]">
              <div className="bg-gradient-to-r from-[#8b3a3a] to-[#6d2e2e] p-6 text-white">
                <div className="flex items-center gap-3 mb-2">
                  <div className="text-3xl">🍂</div>
                  <div>
                    <h3 className="text-xl font-bold">Tobacco Cellar</h3>
                    <p className="text-[#e8d5b7]/80">Manage your blends</p>
                  </div>
                </div>
              </div>
              <CardContent className="p-6">
                <ul className="space-y-2 text-[#e8d5b7]/80 mb-6">
                  <li className="flex items-center gap-2">
                    <Search className="w-4 h-4 text-[#d4a574]" />
                    AI web search for blend information
                  </li>
                  <li className="flex items-center gap-2">
                    <Package className="w-4 h-4 text-[#d4a574]" />
                    Track inventory quantities
                  </li>
                  <li className="flex items-center gap-2">
                    <Leaf className="w-4 h-4 text-[#d4a574]" />
                    Flavor profiles & tasting notes
                  </li>
                  <li className="flex items-center gap-2">
                    <Star className="w-4 h-4 text-[#d4a574]" />
                    Rate and review blends
                  </li>
                </ul>
                <Link to={createPageUrl('Tobacco')}>
                  <Button className="w-full bg-[#8b3a3a] hover:bg-[#6d2e2e]">
                    View Tobacco
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Pairing Matrix */}
        {pipes.length > 0 && blends.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7 }}
            className="mb-12"
          >
            <PairingMatrix pipes={pipes} blends={blends} />
          </motion.div>
        )}

        {/* Collection Optimizer */}
        {pipes.length > 0 && blends.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.75 }}
            className="mb-12"
          >
            {isPaidUser ? (
              <CollectionOptimizer pipes={pipes} blends={blends} />
            ) : (
              <UpgradePrompt 
                featureName="Collection Optimization"
                description="Get AI-powered recommendations for specializing your pipes, identifying collection gaps, and suggestions for your next pipe purchase based on your smoking preferences."
              />
            )}
          </motion.div>
        )}

        {/* Pairing Grid */}
        {pipes.length > 0 && blends.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8 }}
            className="mb-12"
          >
            <PairingGrid pipes={pipes} blends={blends} />
          </motion.div>
        )}

        {/* Favorites */}
        {(favoritePipes.length > 0 || favoriteBlends.length > 0) && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8 }}
            className="mb-12"
          >
            <Card className="border-rose-200 bg-gradient-to-br from-rose-50 to-white">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-rose-800">
                  <Heart className="w-5 h-5 fill-rose-500 text-rose-500" />
                  Favorites
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-3">
                  {favoritePipes.map(pipe => (
                    <Link key={pipe.id} to={createPageUrl(`PipeDetail?id=${pipe.id}`)}>
                      <Badge className="bg-amber-100 text-amber-800 border-amber-200 hover:bg-amber-200 cursor-pointer px-3 py-1.5">
                        🪈 {pipe.name}
                      </Badge>
                    </Link>
                  ))}
                  {favoriteBlends.map(blend => (
                    <Link key={blend.id} to={createPageUrl(`TobaccoDetail?id=${blend.id}`)}>
                      <Badge className="bg-stone-100 text-stone-800 border-stone-200 hover:bg-stone-200 cursor-pointer px-3 py-1.5">
                        🍂 {blend.name}
                      </Badge>
                    </Link>
                  ))}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Recently Added */}
        <div className="grid md:grid-cols-2 gap-6">
          {recentPipes.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.9 }}
            >
              <Card className="border-stone-200">
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle className="text-stone-800">Recent Pipes</CardTitle>
                  <Link to={createPageUrl('Pipes')}>
                    <Button variant="ghost" size="sm">
                      View All <ArrowRight className="w-4 h-4 ml-1" />
                    </Button>
                  </Link>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {recentPipes.map(pipe => (
                      <Link key={pipe.id} to={createPageUrl(`PipeDetail?id=${pipe.id}`)}>
                        <div className="flex items-center gap-3 p-3 rounded-lg hover:bg-stone-50 transition-colors cursor-pointer">
                          <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-stone-100 to-stone-200 overflow-hidden flex items-center justify-center">
                            {pipe.photos?.[0] ? (
                              <img src={pipe.photos[0]} alt="" className="w-full h-full object-cover" />
                            ) : (
                              <PipeShapeIcon shape={pipe.shape} className="text-xl" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-stone-800 truncate">{pipe.name}</p>
                            <p className="text-sm text-stone-500 truncate">{pipe.maker || pipe.shape || 'Unknown'}</p>
                          </div>
                          {pipe.estimated_value && (
                            <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200">
                              ${pipe.estimated_value}
                            </Badge>
                          )}
                        </div>
                      </Link>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {recentBlends.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1.0 }}
            >
              <Card className="border-stone-200">
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle className="text-stone-800">Recent Tobacco</CardTitle>
                  <Link to={createPageUrl('Tobacco')}>
                    <Button variant="ghost" size="sm">
                      View All <ArrowRight className="w-4 h-4 ml-1" />
                    </Button>
                  </Link>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {recentBlends.map(blend => (
                      <Link key={blend.id} to={createPageUrl(`TobaccoDetail?id=${blend.id}`)}>
                        <div className="flex items-center gap-3 p-3 rounded-lg hover:bg-stone-50 transition-colors cursor-pointer">
                          <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-amber-100 to-amber-200 overflow-hidden flex items-center justify-center">
                            {blend.photo ? (
                              <img src={blend.photo} alt="" className="w-full h-full object-cover" />
                            ) : (
                              <span className="text-xl">🍂</span>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-stone-800 truncate">{blend.name}</p>
                            <p className="text-sm text-stone-500 truncate">{blend.manufacturer || blend.blend_type || 'Unknown'}</p>
                          </div>
                          {blend.quantity_owned > 0 && (
                            <Badge className="bg-amber-100 text-amber-800 border-amber-200">
                              {blend.quantity_owned} tin{blend.quantity_owned > 1 ? 's' : ''}
                            </Badge>
                          )}
                        </div>
                      </Link>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </div>

        {/* Empty State */}
        {pipes.length === 0 && blends.length === 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="text-center py-12"
          >
            <div className="text-6xl mb-4">🪈🍂</div>
            <h2 className="text-2xl font-semibold text-stone-800 mb-2">
              Welcome to Your Collection
            </h2>
            <p className="text-stone-500 mb-8 max-w-md mx-auto">
              Start by adding your first pipe or tobacco blend. Use AI search or photo identification for instant details.
            </p>
            <div className="flex gap-4 justify-center">
              <Link to={createPageUrl('Pipes')}>
                <Button className="bg-amber-700 hover:bg-amber-800">
                  Add Your First Pipe
                </Button>
              </Link>
              <Link to={createPageUrl('Tobacco')}>
                <Button variant="outline">
                  Add Your First Blend
                </Button>
              </Link>
            </div>
          </motion.div>
        )}
        </div>
      </div>
    </>
  );
}