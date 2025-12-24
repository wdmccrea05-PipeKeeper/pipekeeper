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
import SmokingLogPanel from "@/components/home/SmokingLogPanel";

const PIPE_ICON = 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/694956e18d119cc497192525/dd0287dd6_pipe_no_bg.png';

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
      const results = await base44.entities.OnboardingStatus.filter({ user_email: user?.email });
      return results[0];
    },
    enabled: !!user?.email,
  });

  const createOnboardingMutation = useMutation({
    mutationFn: (data) => base44.entities.OnboardingStatus.create(data),
  });

  const updateOnboardingMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.OnboardingStatus.update(id, data),
  });

  useEffect(() => {
    if (!onboardingLoading && user?.email && !onboardingStatus) {
      setShowOnboarding(true);
    } else if (onboardingStatus && !onboardingStatus.completed && !onboardingStatus.skipped) {
      setShowOnboarding(true);
    }
  }, [user?.email, onboardingStatus, onboardingLoading]);

  const handleOnboardingComplete = async () => {
    if (onboardingStatus) {
      await updateOnboardingMutation.mutateAsync({
        id: onboardingStatus.id,
        data: { completed: true, current_step: 5 }
      });
    } else if (user?.email) {
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
    } else if (user?.email) {
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
    queryFn: () => base44.entities.Pipe.filter({ created_by: user?.email }, '-created_date'),
    enabled: !!user?.email,
  });

  const { data: blends = [] } = useQuery({
    queryKey: ['blends', user?.email],
    queryFn: () => base44.entities.TobaccoBlend.filter({ created_by: user?.email }, '-created_date'),
    enabled: !!user?.email,
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
                  <img src={PIPE_ICON} alt="Pipes" className="w-8 h-8 mx-auto mb-2 object-contain brightness-0 invert" />
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

        {/* Import Link */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.45 }}
          className="mb-6"
        >
          <Link to={createPageUrl('Import')}>
            <Card className="border-[#e8d5b7]/30 bg-gradient-to-br from-amber-900/20 to-amber-800/10 hover:shadow-lg transition-shadow cursor-pointer">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-amber-600/20 flex items-center justify-center">
                      <Sparkles className="w-5 h-5 text-[#d4a574]" />
                    </div>
                    <div>
                      <p className="font-semibold text-[#e8d5b7]">Bulk Import</p>
                      <p className="text-xs text-[#e8d5b7]/70">Import pipes & tobacco from CSV</p>
                    </div>
                  </div>
                  <ArrowRight className="w-5 h-5 text-[#e8d5b7]/70" />
                </div>
              </CardContent>
            </Card>
          </Link>
        </motion.div>

        {/* Quick Actions */}
        <div className="grid md:grid-cols-2 gap-6 mb-12">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.5 }}
          >
            <Link to={createPageUrl('Pipes')}>
              <Card className="h-full hover:shadow-xl transition-all border-[#e8d5b7]/20 overflow-hidden cursor-pointer group relative">
                <div className="absolute inset-0 bg-gradient-to-br from-[#8b3a3a]/70 via-[#6d2e2e]/60 to-[#5a2525]/70 z-10" />
                <div 
                  className="absolute inset-0 bg-cover bg-center opacity-40 group-hover:opacity-50 transition-opacity"
                  style={{
                    backgroundImage: 'url(https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/694956e18d119cc497192525/027742301_image.png)'
                  }}
                />
                <div className="relative z-20 p-8 h-full flex flex-col">
                  <div className="flex items-start justify-between mb-6">
                    <div>
                      <h3 className="text-2xl font-bold text-white mb-1">Pipe Collection</h3>
                      <p className="text-[#e8d5b7]/90 text-sm">Track and value your pipes</p>
                    </div>
                    <div className="bg-white/10 backdrop-blur-sm rounded-lg p-3">
                      <img src={PIPE_ICON} alt="Pipes" className="w-8 h-8 object-contain brightness-0 invert" />
                    </div>
                  </div>
                  
                  <div className="flex-1 mb-6">
                    <div className="bg-black/20 backdrop-blur-sm rounded-lg p-4 mb-3">
                      <p className="text-3xl font-bold text-white mb-1">{pipes.length}</p>
                      <p className="text-[#e8d5b7]/80 text-sm">Pipes in Collection</p>
                    </div>
                    
                    <ul className="space-y-2.5 text-[#e8d5b7]/90 text-sm">
                      <li className="flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-[#d4a574]" />
                        AI web search to auto-fill details
                      </li>
                      <li className="flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-[#d4a574]" />
                        Photo identification from stamps
                      </li>
                      <li className="flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-[#d4a574]" />
                        Market value lookup
                      </li>
                    </ul>
                  </div>

                  <div className="flex items-center justify-between text-white group-hover:translate-x-1 transition-transform">
                    <span className="font-semibold">View Collection</span>
                    <ArrowRight className="w-5 h-5" />
                  </div>
                </div>
              </Card>
            </Link>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.6 }}
          >
            <Link to={createPageUrl('Tobacco')}>
              <Card className="h-full hover:shadow-xl transition-all border-[#e8d5b7]/20 overflow-hidden cursor-pointer group relative">
                <div className="absolute inset-0 bg-gradient-to-br from-[#3d5a4d]/70 via-[#2d4a3d]/60 to-[#1d3a2d]/70 z-10" />
                <div 
                  className="absolute inset-0 bg-cover bg-center opacity-40 group-hover:opacity-50 transition-opacity"
                  style={{
                    backgroundImage: 'url(https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/694956e18d119cc497192525/19a8321a9_image.png)'
                  }}
                />
                <div className="relative z-20 p-8 h-full flex flex-col">
                  <div className="flex items-start justify-between mb-6">
                    <div>
                      <h3 className="text-2xl font-bold text-white mb-1">Tobacco Cellar</h3>
                      <p className="text-[#e8d5b7]/90 text-sm">Manage your blends</p>
                    </div>
                    <div className="bg-white/10 backdrop-blur-sm rounded-lg p-3">
                      <Leaf className="w-8 h-8 text-white" />
                    </div>
                  </div>
                  
                  <div className="flex-1 mb-6">
                    <div className="bg-black/20 backdrop-blur-sm rounded-lg p-4 mb-3">
                      <p className="text-3xl font-bold text-white mb-1">{blends.length}</p>
                      <p className="text-[#e8d5b7]/80 text-sm">Tobacco Blends</p>
                    </div>
                    
                    <ul className="space-y-2.5 text-[#e8d5b7]/90 text-sm">
                      <li className="flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-[#d4a574]" />
                        AI web search for blend info
                      </li>
                      <li className="flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-[#d4a574]" />
                        Track inventory quantities
                      </li>
                      <li className="flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-[#d4a574]" />
                        Flavor profiles & ratings
                      </li>
                    </ul>
                  </div>

                  <div className="flex items-center justify-between text-white group-hover:translate-x-1 transition-transform">
                    <span className="font-semibold">View Cellar</span>
                    <ArrowRight className="w-5 h-5" />
                  </div>
                </div>
              </Card>
            </Link>
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

        {/* Smoking Log Panel */}
        {pipes.length > 0 && blends.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.72 }}
            className="mb-12"
          >
            <SmokingLogPanel pipes={pipes} blends={blends} user={user} />
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
                          <div className="w-12 h-12 rounded-lg bg-white overflow-hidden flex items-center justify-center">
                            {blend.logo || blend.photo ? (
                              <img 
                                src={blend.logo || blend.photo} 
                                alt="" 
                                className={`w-full h-full ${blend.logo ? 'object-contain p-1' : 'object-cover'}`} 
                              />
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