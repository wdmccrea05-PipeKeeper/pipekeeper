import React, { useState, useEffect } from 'react';
import { useTranslation } from "react-i18next";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import ErrorBoundary from "@/components/system/ErrorBoundary";
import { safeUpdate } from "@/components/utils/safeUpdate";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { createPageUrl } from "@/components/utils/createPageUrl";
import { motion } from "framer-motion";
import { 
  ArrowRight, Heart, DollarSign, 
  Leaf, Package, Star, Sparkles, Search, Camera, X, AlertCircle, RotateCcw
} from "lucide-react";
import { isTrialWindowNow } from "@/components/utils/access";
import { getEffectiveEntitlement } from "@/components/utils/getEffectiveEntitlement";
import { useCurrentUser } from "@/components/hooks/useCurrentUser";
import PipeShapeIcon from "@/components/pipes/PipeShapeIcon";
import CollectionOptimizer from "@/components/ai/CollectionOptimizer";
import PairingGrid from "@/components/home/PairingGrid";
import OnboardingFlow from "@/components/onboarding/OnboardingFlow";
import UpgradePrompt from "@/components/subscription/UpgradePrompt";
import ExpertTobacconist from "@/components/ai/ExpertTobacconist";
import CollectionInsightsPanel from "@/components/home/CollectionInsightsPanel";
import { isAppleBuild } from "@/components/utils/appVariant";
import FeatureGate from "@/components/subscription/FeatureGate";
import { PK_THEME } from "@/components/utils/pkTheme";
import { PkCard, PkCardContent, PkCardHeader, PkCardTitle } from "@/components/ui/PkCard";
import { PkPageTitle, PkText, PkSubtext } from "@/components/ui/PkSectionHeader";
import QuickStartChecklist from "@/components/onboarding/QuickStartChecklist";
import { SafeText, SafeHeading, SafeLabel } from "@/components/ui/SafeText";
import { calculateCellaredOzFromLogs, getCellarBreakdownFromLogs, calculateTobaccoCollectionValue } from "@/components/utils/tobaccoQuantityHelpers";
import PremiumActiveIndicator from "@/components/subscription/PremiumActiveIndicator";

const PIPE_ICON = "/assets/pipekeeper-pipe-icon.png";

export default function HomePage() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showTestingNotice, setShowTestingNotice] = useState(false);
  const [showCellarDialog, setShowCellarDialog] = useState(false);
  const [hasError, setHasError] = useState(false);

  // ALL hooks MUST be called unconditionally at top level before any early returns
  const { user, isLoading: userLoading, error: userError } = useCurrentUser();

  React.useEffect(() => {
    const handleError = (error) => {
      console.error('[Home Error]', error);
      setHasError(true);
    };
    
    const handleUnhandledRejection = (event) => {
      console.error('[Home Unhandled Promise]', event.reason);
      setHasError(true);
    };
    
    if (typeof window !== 'undefined') {
      window.addEventListener('error', handleError);
      window.addEventListener('unhandledrejection', handleUnhandledRejection);
      return () => {
        window.removeEventListener('error', handleError);
        window.removeEventListener('unhandledrejection', handleUnhandledRejection);
      };
    }
  }, []);

  const { data: onboardingStatus, isLoading: onboardingLoading } = useQuery({
    queryKey: ['onboarding-status', user?.email],
    queryFn: async () => {
      if (!user?.email) return null;
      try {
        const results = await base44.entities.OnboardingStatus.filter({ user_email: user?.email });
        return Array.isArray(results) ? results[0] || null : null;
      } catch (err) {
        console.error('[Home] Onboarding load error:', err);
        return null;
      }
    },
    enabled: !!user?.email,
    retry: 1,
    staleTime: 10000,
  });

  const { data: pipes = [], isLoading: pipesLoading, error: pipesError, refetch: refetchPipes } = useQuery({
    queryKey: ['pipes', user?.email],
    queryFn: async () => {
      try {
        console.log('[Home] Loading pipes for:', user?.email);
        const result = await base44.entities.Pipe.filter({ created_by: user?.email }, '-created_date', 10000);
        console.log('[Home] Pipes loaded:', result?.length, 'result type:', typeof result, 'is array:', Array.isArray(result));
        if (!Array.isArray(result)) {
          console.error('[Home] Pipe result is not an array!', result);
        }
        return Array.isArray(result) ? result : [];
      } catch (err) {
        console.error('[Home] Pipes load error:', err?.message, err);
        throw err;
      }
    },
    enabled: !!user?.email,
    retry: 2,
    refetchOnMount: true,
    refetchOnWindowFocus: false,
  });

  // STANDARDIZED KEY: ["tobacco-blends", user?.email]
  const { data: blends = [], isLoading: blendsLoading, refetch: refetchBlends } = useQuery({
    queryKey: ['tobacco-blends', user?.email],
    queryFn: async () => {
      try {
        const result = await base44.entities.TobaccoBlend.filter({ created_by: user?.email }, '-created_date', 10000);
        return Array.isArray(result) ? result : [];
      } catch (err) {
        console.error('[Home] Blends load error:', err);
        return [];
      }
    },
    enabled: !!user?.email,
    retry: 1,
    refetchOnMount: true,
    refetchOnWindowFocus: false,
  });

  // Subscribe to blend updates and invalidate cellar logs
  useEffect(() => {
    if (!user?.email) return;
    const unsubscribe = base44.entities.TobaccoBlend.subscribe((event) => {
      if (event.type === 'update' || event.type === 'create') {
        queryClient.invalidateQueries({ queryKey: ['cellar-logs-all', user?.email] });
      }
    });
    return () => unsubscribe?.();
  }, [user?.email, queryClient]);

  // STANDARDIZED KEY: ["cellar-logs-all", user?.email]
  const { data: cellarLogs = [], refetch: refetchCellarLogs } = useQuery({
    queryKey: ['cellar-logs-all', user?.email],
    queryFn: async () => {
      try {
        const result = await base44.entities.CellarLog.filter({ created_by: user?.email }, '-created_date', 100);
        return Array.isArray(result) ? result : [];
      } catch (err) {
        console.error('[Home] Cellar logs load error:', err);
        return [];
      }
    },
    enabled: !!user?.email,
    retry: 1,
    refetchOnMount: true,
    refetchOnWindowFocus: false,
  });

  const createOnboardingMutation = useMutation({
    mutationFn: (data) => base44.entities.OnboardingStatus.create(data),
  });

  const updateOnboardingMutation = useMutation({
    mutationFn: ({ id, data }) => safeUpdate('OnboardingStatus', id, data, user?.email),
  });

  useEffect(() => {
    if (onboardingLoading || !user?.email) return;
    const urlParams = new URLSearchParams(window.location.search);
    const restartTutorial = urlParams.get('restart_tutorial') === 'true';
    if (restartTutorial) {
      setShowOnboarding(true);
      window.history.replaceState({}, '', createPageUrl('Home'));
    } else if (!onboardingStatus || (!onboardingStatus.completed && !onboardingStatus.skipped)) {
      setShowOnboarding(true);
    }
  }, [user?.email, onboardingStatus, onboardingLoading]);

  useEffect(() => {
    if (!user?.email || showOnboarding || onboardingLoading) return;
    if (isTrialWindowNow() && !localStorage.getItem('testingNoticeSeen')) {
      setShowTestingNotice(true);
    }
  }, [user?.email, showOnboarding, onboardingLoading]);

  useEffect(() => {
    if (!showTestingNotice) return;
    const tick = () => {
      if (!isTrialWindowNow()) {
        setShowTestingNotice(false);
        localStorage.setItem('testingNoticeSeen', 'true');
      }
    };
    const interval = setInterval(tick, 30 * 1000);
    tick();
    return () => clearInterval(interval);
  }, [showTestingNotice]);

  const handleOnboardingComplete = async () => {
    try {
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
    } catch (err) {
      console.error('[Home] Onboarding complete error:', err);
      setShowOnboarding(false);
    }
  };

  const handleOnboardingSkip = async () => {
    try {
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
    } catch (err) {
      console.error('[Home] Onboarding skip error:', err);
      setShowOnboarding(false);
    }
  };

  // Early returns AFTER all hooks
  if (userLoading) {
    return (
      <div className={`min-h-screen ${PK_THEME.pageBg} flex items-center justify-center p-4`}>
        <div className="text-center">
          <div className="w-32 h-32 mx-auto mb-4 flex items-center justify-center">
            <div className="text-5xl animate-pulse">🔄</div>
          </div>
          <p className={PK_THEME.textBody}>{t("common.loading")}</p>
        </div>
      </div>
    );
  }

  if (userError || !user?.email) {
    return (
      <div className={`min-h-screen ${PK_THEME.pageBg} flex items-center justify-center p-4`}>
        <Card className="max-w-md w-full">
          <CardContent className="p-8 text-center">
            <AlertCircle className="w-12 h-12 text-rose-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-[#e8d5b7] mb-2">{t("auth.loginRequired")}</h2>
            <p className="text-[#e8d5b7]/70 mb-4">{t("auth.loginPrompt")}</p>
            <Button onClick={() => base44.auth.redirectToLogin()}>{t("auth.login")}</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (hasError) {
    return (
      <div className={`min-h-screen ${PK_THEME.pageBg} flex items-center justify-center p-4`}>
        <Card className="max-w-md w-full">
          <CardContent className="p-8 text-center">
            <AlertCircle className="w-12 h-12 text-rose-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-[#e8d5b7] mb-2">{t("home.errorTitle")}</h2>
            <p className="text-[#e8d5b7]/70 mb-4">{t("home.errorRefresh")}</p>
            <Button onClick={() => window.location.reload()}>{t("common.refresh")}</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Compute values AFTER early returns
  const safePipes = Array.isArray(pipes) ? pipes : [];
  const safeBlends = Array.isArray(blends) ? blends : [];
  const safeCellarLogs = Array.isArray(cellarLogs) ? cellarLogs : [];
  
  const isInitialLoading = pipesLoading || blendsLoading || onboardingLoading;
  const isAdmin = user?.role === "admin" || user?.role === "owner" || user?.is_admin === true;
  const effective = getEffectiveEntitlement(user);
  const isPaidUser = isAdmin || effective === "pro" || effective === "premium";
  const hasNotes = safePipes.some(p => p?.notes) || safeBlends.some(b => b?.notes);
  const hasViewedInsights = typeof window !== 'undefined' && localStorage.getItem('pk_viewed_insights') === 'true';
  
  const totalCellaredOz = safeCellarLogs.reduce((sum, log) => {
    if (log.transaction_type === 'added') return sum + (log.amount_oz || 0);
    if (log.transaction_type === 'removed') return sum - (log.amount_oz || 0);
    return sum;
  }, 0);

  const getCellarBreakdown = () => {
    const byBlend = {};
    safeCellarLogs.forEach(log => {
      if (!byBlend[log.blend_id]) {
        byBlend[log.blend_id] = { blend_id: log.blend_id, blend_name: log.blend_name, totalOz: 0 };
      }
      if (log.transaction_type === 'added') {
        byBlend[log.blend_id].totalOz += (log.amount_oz || 0);
      } else if (log.transaction_type === 'removed') {
        byBlend[log.blend_id].totalOz -= (log.amount_oz || 0);
      }
    });
    return Object.values(byBlend).filter(b => b.totalOz > 0).sort((a, b) => b.totalOz - a.totalOz);
  };

  const totalPipeValue = safePipes.reduce((sum, p) => sum + (p?.estimated_value || 0), 0);
  const cellarBreakdown = getCellarBreakdown();
  const favoritePipes = safePipes.filter(p => p?.is_favorite);
  const favoriteBlends = safeBlends.filter(b => b?.is_favorite);
  const recentPipes = safePipes.slice(0, 4);
  const recentBlends = safeBlends.slice(0, 4);

  const handleDismissNotice = () => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('testingNoticeSeen', 'true');
    }
    setShowTestingNotice(false);
  };

  return (
    <>
      {isInitialLoading ? (
        <div className={`min-h-screen ${PK_THEME.pageBg} flex items-center justify-center p-4`}>
          <div className="text-center">
            <img 
              src="/assets/pipekeeper-pipe-icon.png"
              alt="PipeKeeper"
              className="w-32 h-32 mx-auto mb-4 object-contain animate-pulse"
            />
            <p className={PK_THEME.textBody}>{t("home.loadingCollection")}</p>
          </div>
        </div>
      ) : null}

      {showOnboarding && user?.email ? (
        <OnboardingFlow 
          onComplete={handleOnboardingComplete}
          onSkip={handleOnboardingSkip}
        />
      ) : null}

      {showTestingNotice && !showOnboarding && !isInitialLoading ? (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-[#223447] rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden border border-[#E0D8C8]/15"
          >
            <div className="bg-gradient-to-r from-[#8b3a3a] to-[#6d2e2e] p-6 text-white">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center">
                    <AlertCircle className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold">{t("home.testingPeriodTitle")}</h3>
                    <p className="text-sm text-white/80 mt-1">{t("home.importantInfo")}</p>
                  </div>
                </div>
                <button onClick={handleDismissNotice} className="text-white/80 hover:text-white transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
            <div className="p-6">
              <p className="text-[#E0D8C8] text-lg leading-relaxed mb-4">
                {t("home.testingPeriodBody")}
              </p>
              <p className="text-[#E0D8C8]/70 text-sm">
                {t("home.testingThankYou")}
              </p>
              <Button onClick={handleDismissNotice} className="w-full mt-6 bg-[#8b3a3a] hover:bg-[#6d2e2e]">
                {t("home.gotItThanks")}
              </Button>
            </div>
          </motion.div>
        </div>
      ) : null}

      {!isInitialLoading && (
        <div className={`min-h-screen ${PK_THEME.pageBg} overflow-x-hidden`}>
          <motion.div 
            className="text-center mb-8 sm:mb-12 px-2"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <PkPageTitle className="mb-3 sm:mb-4 leading-tight">
              {t("home.pageTitle")}
            </PkPageTitle>
            <p className="max-w-2xl mx-auto px-2 text-[#E0D8C8]/70 text-base">
              {t("home.pageSubtitle", { defaultValue: "Catalog, track, and enjoy your pipe and tobacco collection" })}
            </p>
          </motion.div>

          {/* Premium Active Indicator */}
          <div className="max-w-4xl mx-auto px-4">
            <PremiumActiveIndicator user={user} subscription={user?.subscription} />
          </div>

          {(safePipes.length < 3 || safeBlends.length < 3) && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="mb-6"
            >
              <QuickStartChecklist 
                pipes={safePipes}
                blends={safeBlends}
                hasNotes={hasNotes}
                hasViewedInsights={hasViewedInsights}
              />
            </motion.div>
          )}

          <div className="grid md:grid-cols-2 gap-4 sm:gap-6 mb-8 sm:mb-12">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 }}
            >
              <a href={createPageUrl('Pipes')}>
                <Card className="h-full hover:shadow-xl transition-all border-[#e8d5b7]/20 overflow-hidden cursor-pointer group relative">
                  <div className="absolute inset-0 bg-gradient-to-br from-[#8b3a3a]/80 via-[#6d2e2e]/70 to-[#5a2525]/80 z-10" />
                  <div 
                    className="absolute inset-0 bg-cover bg-center opacity-40 group-hover:opacity-50 transition-opacity bg-gradient-to-br from-[#8b3a3a] to-[#5a2525]"
                  />
                  <div className="relative z-20 p-4 sm:p-8 h-full flex flex-col">
                    <div className="flex items-start justify-between mb-4 sm:mb-6">
                      <div className="flex-1 min-w-0">
                        <h3 className="text-2xl sm:text-3xl font-bold text-white mb-1 sm:mb-2">{t("home.pipeCollection")}</h3>
                        <p className="text-white/90 text-sm sm:text-base">{t("home.trackAndValue")}</p>
                      </div>
                      <div className="flex gap-2 flex-shrink-0 ml-2">
                        <button
                          onClick={(e) => {
                            e.preventDefault();
                            queryClient.refetchQueries({ queryKey: ['pipes', user?.email] });
                            queryClient.refetchQueries({ queryKey: ['cellar-logs-all', user?.email] });
                          }}
                          className="bg-white/10 hover:bg-white/20 backdrop-blur-sm rounded-lg p-2 sm:p-3 transition-colors"
                          title={t("common.refresh")}
                        >
                          <RotateCcw className="w-6 h-6 sm:w-8 sm:h-8 text-white" />
                        </button>
                        <div className="bg-white/10 backdrop-blur-sm rounded-lg p-2 sm:p-3">
                          <img src={PIPE_ICON} alt="Pipes" className="w-6 h-6 sm:w-8 sm:h-8 object-contain" />
                        </div>
                      </div>
                    </div>

                    <div className="flex-1 space-y-3 sm:space-y-4 mb-4 sm:mb-6">
                      <div className="bg-black/20 backdrop-blur-sm rounded-lg p-3 sm:p-4">
                        <p className="text-3xl sm:text-4xl font-bold text-white mb-1">{safePipes.length}</p>
                        <p className="text-[#e8d5b7] text-sm sm:text-base">{t("home.pipesInCollection")}</p>
                      </div>
                      
                      <div className="bg-black/20 backdrop-blur-sm rounded-lg p-3 sm:p-4">
                        <p className="text-3xl sm:text-4xl font-bold text-white mb-1">${totalPipeValue.toLocaleString()}</p>
                        <p className="text-[#e8d5b7] text-sm sm:text-base">{t("home.collectionValue")}</p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-white group-hover:translate-x-1 transition-transform text-sm sm:text-base">
                      <span className="font-semibold">{t("home.viewCollection")}</span>
                      <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5" />
                    </div>
                  </div>
                </Card>
              </a>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.4 }}
            >
              <a href={createPageUrl('Tobacco')}>
                <Card className="h-full hover:shadow-xl transition-all border-[#e8d5b7]/20 overflow-hidden cursor-pointer group relative">
                  <div className="absolute inset-0 bg-gradient-to-br from-[#3d5a4d]/70 via-[#2d4a3d]/60 to-[#1d3a2d]/70 z-10" />
                  <div 
                    className="absolute inset-0 bg-cover bg-center opacity-40 group-hover:opacity-50 transition-opacity bg-gradient-to-br from-[#3d5a4d] to-[#1d3a2d]"
                  />
                  <div className="relative z-20 p-4 sm:p-8 h-full flex flex-col">
                    <div className="flex items-start justify-between mb-4 sm:mb-6">
                      <div className="flex-1 min-w-0">
                        <h3 className="text-2xl sm:text-3xl font-bold text-white mb-1 sm:mb-2">{t("home.tobaccoCellar")}</h3>
                        <p className="text-white/90 text-sm sm:text-base">{t("home.manageBlends")}</p>
                      </div>
                      <div className="flex gap-2 flex-shrink-0 ml-2">
                        <button
                          onClick={(e) => {
                            e.preventDefault();
                            queryClient.refetchQueries({ queryKey: ['tobacco-blends', user?.email] });
                            queryClient.refetchQueries({ queryKey: ['cellar-logs-all', user?.email] });
                          }}
                          className="bg-white/10 hover:bg-white/20 backdrop-blur-sm rounded-lg p-2 sm:p-3 transition-colors"
                          title={t("common.refresh")}
                        >
                          <RotateCcw className="w-6 h-6 sm:w-8 sm:h-8 text-white" />
                        </button>
                        <div className="bg-white/10 backdrop-blur-sm rounded-lg p-2 sm:p-3">
                          <Leaf className="w-6 h-6 sm:w-8 sm:h-8 text-white" />
                        </div>
                      </div>
                    </div>

                    <div className="flex-1 space-y-3 sm:space-y-4 mb-4 sm:mb-6">
                      <div className="bg-black/20 backdrop-blur-sm rounded-lg p-3 sm:p-4">
                        <p className="text-3xl sm:text-4xl font-bold text-white mb-1">{safeBlends.length}</p>
                        <p className="text-[#e8d5b7] text-sm sm:text-base">{t("home.tobaccoBlends")}</p>
                      </div>
                      
                      <div className="bg-black/20 backdrop-blur-sm rounded-lg p-3 sm:p-4 cursor-pointer" onClick={(e) => {
                        e.preventDefault();
                        setShowCellarDialog(true);
                      }}>
                        <p className="text-3xl sm:text-4xl font-bold text-white mb-1">{totalCellaredOz.toFixed(1)} oz</p>
                        <p className="text-[#e8d5b7] text-sm sm:text-base">{t("home.cellared")}</p>
                      </div>

                      {(() => {
                        // Use canonical value calculation
                        const totalValue = calculateTobaccoCollectionValue(safeBlends, safeCellarLogs);
                        
                        return isPaidUser && totalValue > 0 ? (
                          <div className="bg-black/20 backdrop-blur-sm rounded-lg p-3 sm:p-4">
                            <p className="text-3xl sm:text-4xl font-bold text-white mb-1">≈ ${totalValue.toFixed(0)}</p>
                            <p className="text-[#e8d5b7] text-sm sm:text-base">{t("home.collectionValue")}</p>
                          </div>
                        ) : null;
                      })()}
                    </div>

                    <div className="flex items-center justify-between text-white group-hover:translate-x-1 transition-transform text-sm sm:text-base">
                      <span className="font-semibold">{t("home.viewCellar")}</span>
                      <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5" />
                    </div>
                  </div>
                </Card>
              </a>
            </motion.div>
          </div>

          {(favoritePipes.length > 0 || favoriteBlends.length > 0) && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.7 }}
              className="mb-12"
            >
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Heart className="w-5 h-5 fill-rose-500 text-rose-500" />
                    {t("home.favorites")}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-3">
                    {favoritePipes.map(pipe => (
                       <a key={pipe.id} href={createPageUrl(`PipeDetail?id=${encodeURIComponent(pipe.id)}`)}>
                         <Badge className="cursor-pointer px-3 py-1.5 flex items-center gap-1.5">
                           <img src={PIPE_ICON} alt="" className="w-3.5 h-3.5 object-contain inline-block" />
                           {pipe.name}
                         </Badge>
                       </a>
                     ))}
                    {favoriteBlends.map(blend => (
                      <a key={blend.id} href={createPageUrl(`TobaccoDetail?id=${encodeURIComponent(blend.id)}`)}>
                        <Badge className="cursor-pointer px-3 py-1.5 flex items-center gap-1.5">
                          <Leaf className="w-3.5 h-3.5 text-[#e8d5b7]" />
                          {blend.name}
                        </Badge>
                      </a>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {safePipes.length > 0 && safeBlends.length > 0 && user && !pipesLoading && !blendsLoading ? (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.75 }}
              className="mb-12"
            >
              <ErrorBoundary fallback={<div className="text-center text-red-500">{t("home.insightsError")}</div>}>
                <CollectionInsightsPanel pipes={safePipes} blends={safeBlends} user={user} />
              </ErrorBoundary>
            </motion.div>
          ) : null}

          {safePipes.length > 0 && safeBlends.length > 0 && user && !pipesLoading && !blendsLoading ? (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.82 }}
              className="mb-12"
            >
              {isAppleBuild ? (
                <UpgradePrompt
                  featureName="Collection & Cellar Tools"
                  description="This iOS build focuses on cataloging and cellar inventory management: identification assistance, metadata cleanup, verified measurements, export reports, and organization tools."
                />
              ) : isPaidUser ? (
                <ErrorBoundary fallback={<div className="text-center text-red-500">{t("home.expertTobacconistError")}</div>}>
                  <ExpertTobacconist pipes={safePipes} blends={safeBlends} isPaidUser={isPaidUser} user={user} />
                </ErrorBoundary>
              ) : (
                <UpgradePrompt 
                  featureName="Expert Tobacconist"
                  description="Unlock AI-powered pipe identification, pairing recommendations, collection optimization, and what-if scenario analysis to maximize your smoking experience."
                />
              )}
            </motion.div>
          ) : null}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 w-full">
            {recentPipes.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.9 }}
                className="w-full"
              >
                <Card className="w-full">
                  <CardHeader className="flex flex-row items-center justify-between p-4 sm:p-6">
                    <CardTitle className="text-lg">{t("home.recentPipes")}</CardTitle>
                      <a href={createPageUrl('Pipes')}>
                         <Button variant="ghost" size="sm">
                           {t("home.viewAll")} <ArrowRight className="w-4 h-4 ml-1" />
                      </Button>
                    </a>
                  </CardHeader>
                  <CardContent className="p-4 sm:p-6">
                    <div className="space-y-2 sm:space-y-3">
                      {recentPipes.map(pipe => (
                        <a key={pipe.id} href={createPageUrl(`PipeDetail?id=${encodeURIComponent(pipe.id)}`)}>
                          <div className="flex items-center gap-2 sm:gap-3 p-2 sm:p-3 rounded-lg hover:bg-white/5 transition-colors cursor-pointer">
                            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg bg-[#1A2B3A] overflow-hidden flex items-center justify-center flex-shrink-0">
                              {pipe.photos?.[0] ? (
                                <img src={pipe.photos[0]} alt="" className="w-full h-full object-cover" />
                              ) : (
                                <PipeShapeIcon shape={pipe.shape} className="text-lg sm:text-xl" />
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <SafeText as="p" className="font-medium text-sm sm:text-base" truncate>{pipe.name}</SafeText>
                              <SafeText as="p" className="text-xs sm:text-sm text-[#E0D8C8]/60 mt-0.5" truncate title={pipe.maker || pipe.shape || t("common.unknown")}>{pipe.maker || pipe.shape || t("common.unknown")}</SafeText>
                            </div>
                            {pipe.estimated_value && (
                              <Badge variant="success" className="text-xs sm:text-sm flex-shrink-0">
                                ${pipe.estimated_value}
                              </Badge>
                            )}
                          </div>
                        </a>
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
                className="w-full"
              >
                <Card className="w-full">
                  <CardHeader className="flex flex-row items-center justify-between p-4 sm:p-6">
                    <CardTitle className="text-lg">{t("home.recentTobacco")}</CardTitle>
                      <a href={createPageUrl('Tobacco')}>
                         <Button variant="ghost" size="sm">
                           {t("home.viewAll")} <ArrowRight className="w-4 h-4 ml-1" />
                      </Button>
                    </a>
                  </CardHeader>
                  <CardContent className="p-4 sm:p-6">
                    <div className="space-y-2 sm:space-y-3">
                      {recentBlends.map(blend => (
                        <a key={blend.id} href={createPageUrl(`TobaccoDetail?id=${encodeURIComponent(blend.id)}`)}>
                          <div className="flex items-center gap-2 sm:gap-3 p-2 sm:p-3 rounded-lg hover:bg-white/5 transition-colors cursor-pointer">
                            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg bg-[#1A2B3A] overflow-hidden flex items-center justify-center flex-shrink-0">
                              {blend.logo || blend.photo ? (
                                <img 
                                  src={blend.logo || blend.photo} 
                                  alt="" 
                                  className={`w-full h-full ${blend.logo ? 'object-contain p-1' : 'object-cover'}`} 
                                />
                              ) : (
                                <span className="text-lg sm:text-xl">🍂</span>
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <SafeText as="p" className="font-medium text-sm sm:text-base" truncate>{blend.name}</SafeText>
                              <SafeText as="p" className="text-xs sm:text-sm text-[#E0D8C8]/60 mt-0.5" truncate title={blend.manufacturer || blend.blend_type || t("common.unknown")}>{blend.manufacturer || blend.blend_type || t("common.unknown")}</SafeText>
                            </div>
                            {blend.quantity_owned > 0 && (
                              <Badge className="text-xs sm:text-sm whitespace-nowrap flex-shrink-0">
                                {blend.quantity_owned} {blend.quantity_owned > 1 ? t("units.tinPlural") : t("units.tin")}
                              </Badge>
                            )}
                          </div>
                        </a>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )}
          </div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.1 }}
            className="mb-12"
          >
            <a href={createPageUrl('Import')}>
              <Card className="border-[#e8d5b7]/30 bg-gradient-to-br from-amber-900/20 to-amber-800/10 hover:shadow-lg transition-shadow cursor-pointer">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-amber-600/20 flex items-center justify-center">
                        <Sparkles className="w-5 h-5 text-[#d4a574]" />
                      </div>
                      <div>
                        <p className="font-semibold text-[#e8d5b7]">{t("home.bulkImport")}</p>
                        <p className="text-xs text-[#e8d5b7]/70">{t("home.importDesc")}</p>
                      </div>
                    </div>
                    <ArrowRight className="w-5 h-5 text-[#e8d5b7]/70" />
                  </div>
                </CardContent>
              </Card>
            </a>
          </motion.div>

          {safePipes.length === 0 && safeBlends.length === 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="text-center py-8 sm:py-12 px-4"
            >
              <div className="flex items-center justify-center gap-3 sm:gap-4 mb-3 sm:mb-4">
                <img 
                  src={PIPE_ICON}
                  alt="Pipe"
                  className="w-12 h-12 sm:w-16 sm:h-16 object-contain"
                />
                <Leaf className="w-12 h-12 sm:w-16 sm:h-16 text-[#e8d5b7]" />
              </div>
              <h2 className="text-xl sm:text-2xl font-semibold text-[#e8d5b7] mb-2">
                {t("home.welcomeToCollection")}
              </h2>
              <p className="text-sm sm:text-base text-[#e8d5b7]/70 mb-6 sm:mb-8 max-w-md mx-auto px-2">
                {t("home.emptyStateDesc")}
              </p>
              <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center max-w-sm mx-auto">
                <a href={createPageUrl('Pipes')} className="w-full sm:w-auto">
                  <Button className="bg-amber-700 hover:bg-amber-800 w-full">
                    {t("home.addFirstPipe")}
                  </Button>
                </a>
                <a href={createPageUrl('Tobacco')} className="w-full sm:w-auto">
                  <Button variant="outline" className="w-full">
                    {t("home.addFirstBlend")}
                  </Button>
                </a>
              </div>
            </motion.div>
          )}
        </div>
      )}

      <Dialog open={showCellarDialog} onOpenChange={setShowCellarDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Package className="w-5 h-5" />
              {t("home.cellarBreakdown")} ({totalCellaredOz.toFixed(1)} oz)
            </DialogTitle>
          </DialogHeader>
          <div className="mt-4">
            {cellarBreakdown.length === 0 ? (
              <p className="text-center text-[#E0D8C8]/60 py-8">{t("home.noCellaredTobacco")}</p>
            ) : (
              <div className="space-y-2 max-h-[400px] overflow-y-auto">
                {cellarBreakdown.map((item) => (
                  <a
                    key={item.blend_id}
                    href={createPageUrl(`TobaccoDetail?id=${item.blend_id}`)}
                    onClick={() => setShowCellarDialog(false)}
                  >
                    <Card className="hover:bg-white/5 transition-colors cursor-pointer">
                      <CardContent className="p-4 flex items-center justify-between">
                        <div className="flex-1">
                          <p className="font-medium">{item.blend_name}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-lg font-bold text-emerald-400">{item.totalOz.toFixed(1)} oz</p>
                        </div>
                      </CardContent>
                    </Card>
                  </a>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}