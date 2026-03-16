import React, { useState, useMemo, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "@/components/i18n/safeTranslation";
import TutorialSystem from "@/components/onboarding/TutorialSystem.jsx";
import { createPageUrl } from "@/components/utils/createPageUrl";
import { formatCurrency, formatWeight } from "@/components/utils/localeFormatters";
import { base44 } from "@/api/base44Client";
import { useCurrentUser } from "@/components/hooks/useCurrentUser";
import { calculateCellaredOzFromLogs, calculateTobaccoCollectionValue } from "@/components/utils/tobaccoQuantityHelpers";
import CollectionIntelligencePanel from "@/components/home/CollectionIntelligencePanel";
import ProactiveCuratorPanel from "@/components/curator/ProactiveCuratorPanel";
import QuickActions from "@/components/home/QuickActions";
import LogSessionModal from "@/components/home/LogSessionModal";
import IdentifyModal from "@/components/home/IdentifyModal";
import ModuleNav from "@/components/modules/ModuleNav";
import { Leaf, Heart, Sparkles, ArrowRight, Crown, BarChart3, Archive, TrendingUp, Wind, BookOpen } from "lucide-react";
import PipeShapeIcon from "@/components/pipes/PipeShapeIcon";
import { isAppleBuild } from "@/components/utils/appVariant";
import { PIPE_SILHOUETTE_URL } from "@/components/utils/collectionConstants";
import { CATEGORY_COLORS } from "@/components/ui/HeroCard";
import CollectorStory from "@/components/story/CollectorStory";
import StoryTrigger from "@/components/story/StoryTrigger";
import { generateStoryCards } from "@/components/story/generateStoryCards";
import LedgerPanel from "@/components/home/LedgerPanel";
import DrawerRow from "@/components/home/DrawerRow";
import CatalogPlate from "@/components/home/CatalogPlate";

const PIPE_ICON = "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/694956e18d119cc497192525/15563e4ee_PipeiconUpdated-fotor-20260110195319.png";

export default function Home() {
  const { t } = useTranslation();
  const { user, hasPaid, hasPremium, hasPro, planLabel } = useCurrentUser();

  const [showLogSession, setShowLogSession] = useState(false);
  const [showIdentify, setShowIdentify] = useState(false);
  const [showStory, setShowStory] = useState(false);
  const [forceTutorial, setForceTutorial] = useState(false);

  const moduleNavItems = [
    { name: t('nav.pipes') || 'Pipes', path: '/Pipes', icon: Wind },
    { name: t('nav.tobacco') || 'Tobacco', path: '/Tobacco', icon: Leaf },
    { name: t('nav.smokingLog') || 'Sessions', path: '/Insights', icon: BookOpen },
    { name: t('nav.insights') || 'Insights', path: '/Insights', icon: TrendingUp },
  ];

  // Check for forced tutorial from FAQ
  useEffect(() => {
    if (user?.email) {
      const flag = localStorage.getItem(`pk_force_tutorial_${user.email}`);
      if (flag) {
        setForceTutorial(true);
        localStorage.removeItem(`pk_force_tutorial_${user.email}`);
      }
    }
  }, [user?.email]);

  const { data: pipes = [] } = useQuery({
    queryKey: ["pipes", user?.email],
    queryFn: async () => {
      const result = await base44.entities.Pipe.filter({ created_by: user?.email });
      return Array.isArray(result) ? result : [];
    },
    enabled: !!user?.email,
    staleTime: 10000,
  });

  const { data: blends = [] } = useQuery({
    queryKey: ["blends", user?.email],
    queryFn: async () => {
      const result = await base44.entities.TobaccoBlend.filter({ created_by: user?.email });
      return Array.isArray(result) ? result : [];
    },
    enabled: !!user?.email,
    staleTime: 10000,
  });

  const { data: userProfile } = useQuery({
    queryKey: ["user-profile", user?.id, user?.email],
    queryFn: async () => {
      const byEmail = await base44.entities.UserProfile.filter({ user_email: user?.email }).catch(() => []);
      const byCreatedBy = await base44.entities.UserProfile.filter({ created_by: user?.email }).catch(() => []);
      const all = [...byEmail, ...byCreatedBy];
      const seen = new Set();
      const unique = all.filter((r) => {
        const key = r?.id || `${r?.user_id || ""}|${r?.user_email || ""}|${r?.created_by || ""}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
      const sorted = unique.sort((a, b) =>
        (Date.parse(b.updated_date ?? b.updated_at ?? b.created_date ?? "") || 0) -
        (Date.parse(a.updated_date ?? a.updated_at ?? a.created_date ?? "") || 0)
      );
      return sorted[0] || null;
    },
    enabled: !!(user?.id || user?.email),
    staleTime: 10000,
  });

  const { data: cellarLogs = [] } = useQuery({
    queryKey: ["cellar-logs-all", user?.email],
    queryFn: () => base44.entities.CellarLog.filter({ created_by: user?.email }),
    enabled: !!user?.email,
    staleTime: 30000,
  });

  const { data: smokingLogs = [] } = useQuery({
    queryKey: ["smoking-logs", user?.email],
    queryFn: () => base44.entities.SmokingLog.filter({ created_by: user?.email }, "-date"),
    enabled: !!user?.email,
    staleTime: 60000,
  });

  const { data: activePairings } = useQuery({
    queryKey: ["activePairings", user?.email],
    enabled: !!user?.email,
    queryFn: async () => {
      const active = await base44.entities.PairingMatrix.filter(
        { created_by: user.email, is_active: true },
        "-created_date",
        1
      );
      return active?.[0] || null;
    },
    staleTime: 60_000,
  });

  const { data: activeOpt } = useQuery({
    queryKey: ["activeOptimization", user?.email],
    enabled: !!user?.email,
    queryFn: async () => {
      const active = await base44.entities.CollectionOptimization.filter(
        { created_by: user.email, is_active: true },
        "-created_date",
        1
      );
      return active?.[0] || null;
    },
    staleTime: 60_000,
  });

  const handleLogSession = () => {
    if (isAppleBuild) return;
    setShowLogSession(true);
  };

  const handleIdentify = () => {
    setShowIdentify(true);
  };

  const handleOptimize = () => {
    window.location.href = createPageUrl("Curator?tab=optimizer");
  };

  const handleAskCurator = () => {
    window.location.href = createPageUrl("Curator");
  };

  const totalPipeValue = pipes.reduce((sum, p) => {
    const val = Number(p?.estimated_value) || 0;
    return sum + (Number.isFinite(val) ? val : 0);
  }, 0);
  const totalCellaredOz = calculateCellaredOzFromLogs(cellarLogs);
  const totalTobaccoValue = calculateTobaccoCollectionValue(blends, cellarLogs);
  const totalCollectionValue = totalPipeValue + totalTobaccoValue;
  const hideHomeValues = !!userProfile?.home_hide_collection_values;
  const favoritePipes = pipes.filter((p) => p?.is_favorite);
  const favoriteBlends = blends.filter((b) => b?.is_favorite);

  // Featured artifacts for module card backgrounds
  const featuredPipe = pipes.find((p) => p?.photos?.length > 0);
  const featuredBlend = blends.find((b) => b?.logo || b?.photo);

  // Summary stats for compact insights card
  const aiUpdateCount = (activePairings ? 1 : 0) + (activeOpt ? 1 : 0);

  // Generate story cards with stable dependencies
  const storyCards = useMemo(() => {
    if (!pipes.length && !blends.length) return [];
    return generateStoryCards(pipes, blends, smokingLogs, totalCollectionValue, formatCurrency, t);
  }, [pipes.length, blends.length, smokingLogs.length, totalCollectionValue]);

  // Most smoked pipe
  const mostSmokedPipe = useMemo(() => {
    if (!smokingLogs.length || !pipes.length) return null;
    const pipeCounts = {};
    smokingLogs.forEach((log) => {
      pipeCounts[log.pipe_id] = (pipeCounts[log.pipe_id] || 0) + (log.bowls_used || 1);
    });
    const topId = Object.entries(pipeCounts).sort((a, b) => b[1] - a[1])[0]?.[0];
    return pipes.find((p) => p.id === topId);
  }, [pipes, smokingLogs]);

  // Most valuable pipe with safe handling
  const mostValuablePipe = useMemo(() => {
    const withValue = pipes.filter(p => (Number(p?.estimated_value) || 0) > 0);
    if (!withValue.length) return null;
    const sorted = withValue.sort((a, b) => (Number(b.estimated_value) || 0) - (Number(a.estimated_value) || 0));
    return sorted[0] || null;
  }, [pipes]);

  // Favorite blend
  const favoriteBlend = useMemo(() => {
    return favoriteBlends[0] || null;
  }, [favoriteBlends]);

  return (
    <div className="space-y-6">
      <ModuleNav items={moduleNavItems} currentPath="/Home" />
      
      <div className="space-y-8">
      {/* 1. HERO - Collector's Study Header */}
      <div className="space-y-4">
        <div className="text-center space-y-2">
          <h1 
            className="text-4xl font-bold tracking-tight"
            style={{ 
              color: "#F5F1E7",
              textShadow: "0 2px 4px rgba(0,0,0,0.5)",
              fontFamily: "'Georgia', serif"
            }}
          >
            {t("home.title")}
          </h1>
          <p 
            className="text-base max-w-2xl mx-auto leading-relaxed"
            style={{ color: "rgba(224, 216, 200, 0.75)" }}
          >
            {t("home.subtitle")}
          </p>
        </div>
        
        {storyCards.length > 0 && (
          <div className="flex justify-center">
            <StoryTrigger onClick={() => setShowStory(true)} variant="secondary" />
          </div>
        )}
      </div>

      {/* 2. MEMBERSHIP PLAQUE */}
      {hasPaid && (
        <div 
          className="rounded-lg p-4 flex items-center gap-3"
          style={{
            background: "linear-gradient(135deg, rgba(60, 45, 25, 0.6), rgba(50, 35, 20, 0.8))",
            border: "1px solid rgba(180, 140, 75, 0.4)",
            borderLeft: "3px solid #D4AF37",
            boxShadow: "0 2px 8px rgba(0,0,0,0.5), inset 0 1px 0 rgba(180,140,100,0.1)"
          }}
        >
          <Crown className="w-5 h-5 shrink-0" style={{ color: "#D4AF37" }} />
          <div className="flex-1">
            <div className="font-semibold" style={{ color: "#D4AF37" }}>{t("subscription.proBadge")}</div>
            <div className="text-sm" style={{ color: "rgba(224, 216, 200, 0.7)" }}>{t("subscription.thankYouSupporting")}</div>
          </div>
          {planLabel && (
            <span className="text-xs shrink-0 truncate max-w-[60px]" style={{ color: "rgba(224, 216, 200, 0.5)" }}>
              {planLabel}
            </span>
          )}
        </div>
      )}

      {/* 3. COLLECTOR'S LEDGER SUMMARY */}
      <div 
        className="rounded-lg p-5"
        style={{
          background: "linear-gradient(135deg, rgba(42, 30, 20, 0.7), rgba(35, 24, 16, 0.85))",
          border: "1px solid rgba(120, 90, 65, 0.3)",
          boxShadow: "0 2px 8px rgba(0,0,0,0.5), inset 0 1px 0 rgba(180,140,100,0.08)"
        }}
      >
        <h2 
          className="text-sm uppercase tracking-[0.12em] font-semibold mb-4"
          style={{ color: "rgba(180, 140, 75, 0.8)" }}
        >
          {t("home.collectionSummary", "Collection Summary")}
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <LedgerPanel
            icon={TrendingUp}
            label={t("home.totalValue")}
            value={hideHomeValues ? "••••" : formatCurrency(Math.round(totalCollectionValue))}
            accent={CATEGORY_COLORS.value}
          />
          <LedgerPanel
            icon={() => (
              <img
                src={PIPE_ICON}
                alt=""
                className="w-4 h-4 object-contain"
                style={{
                  filter: "invert(1) sepia(0.35) saturate(0.4) hue-rotate(350deg) brightness(0.9) opacity(0.9)",
                }}
              />
            )}
            label={t("home.pipesInCollection")}
            value={pipes.length}
            accent={CATEGORY_COLORS.pipe}
          />
          <LedgerPanel
            icon={Leaf}
            label={t("home.tobaccoBlends")}
            value={blends.length}
            accent={CATEGORY_COLORS.tobacco}
          />
          <LedgerPanel
            icon={Archive}
            label={t("home.cellared")}
            value={formatWeight(totalCellaredOz, "oz")}
            accent={CATEGORY_COLORS.activity}
          />
        </div>
      </div>

      {/* 4. COLLECTOR'S HIGHLIGHTS - Editorial catalog cards */}
      {(mostSmokedPipe || mostValuablePipe || favoriteBlend) && (
        <div>
          <h2 
            className="text-sm uppercase tracking-[0.12em] font-semibold mb-4"
            style={{ color: "rgba(180, 140, 75, 0.8)" }}
          >
            {t("home.highlights", "Collection Highlights")}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {mostSmokedPipe && (
              <CatalogPlate
                title={t("home.mostSmoked", "Most Smoked")}
                value={mostSmokedPipe.name}
                subtitle={mostSmokedPipe.maker}
                heroImage={mostSmokedPipe.photos?.[0]}
                bgImage={mostSmokedPipe.photos?.[0]}
                accent="#C87941"
                onClick={() => window.location.href = createPageUrl(`PipeDetail?id=${encodeURIComponent(mostSmokedPipe.id)}`)}
              />
            )}
            {mostValuablePipe && (
              <CatalogPlate
                title={t("home.mostValuable", "Most Valuable")}
                value={formatCurrency(mostValuablePipe.estimated_value)}
                subtitle={mostValuablePipe.name}
                heroImage={mostValuablePipe.photos?.[0]}
                bgImage={mostValuablePipe.photos?.[0]}
                accent="#B4824B"
                onClick={() => window.location.href = createPageUrl(`PipeDetail?id=${encodeURIComponent(mostValuablePipe.id)}`)}
              />
            )}
            {favoriteBlend && (
              <CatalogPlate
                title={t("home.favoriteBlend", "Favorite Blend")}
                value={favoriteBlend.name}
                subtitle={favoriteBlend.manufacturer}
                heroImage={favoriteBlend.logo || favoriteBlend.photo}
                bgImage={favoriteBlend.logo || favoriteBlend.photo}
                accent="#5A7C5A"
                onClick={() => window.location.href = createPageUrl(`TobaccoDetail?id=${encodeURIComponent(favoriteBlend.id)}`)}
              />
            )}
          </div>
        </div>
      )}

      {/* 5. QUICK ACTIONS */}
      <QuickActions
        onLogSession={handleLogSession}
        onIdentify={handleIdentify}
        onOptimize={handleOptimize}
        onAskCurator={handleAskCurator}
        onViewStory={() => setShowStory(true)}
        hasStoryData={storyCards.length > 0}
      />

      {/* 6. CABINET DRAWERS - Module navigation */}
      <div>
        <h2 
          className="text-sm uppercase tracking-[0.12em] font-semibold mb-4"
          style={{ color: "rgba(180, 140, 75, 0.8)" }}
        >
          {t("home.collection", "Collection")}
        </h2>
        <div className="flex flex-col gap-4">
        <DrawerRow
          title={t("home.pipeCollectionTitle")}
          stats={[
            { 
              value: hideHomeValues ? "••••" : formatCurrency(Math.round(totalPipeValue)), 
              label: t("home.collectionValue") 
            },
            { value: pipes.length, label: t("home.pipesInCollection") }
          ]}
          iconImage={PIPE_ICON}
          accent="#B48C4B"
          bgImage={featuredPipe?.photos?.[0]}
          href={createPageUrl("Pipes")}
        />
        
        <DrawerRow
          title={t("home.tobaccoCellarTitle")}
          stats={[
            { 
              value: hideHomeValues ? "••••" : formatCurrency(Math.round(totalTobaccoValue)), 
              label: t("home.collectionValue") 
            },
            { value: blends.length, label: t("home.tobaccoBlends") },
            { value: formatWeight(totalCellaredOz, "oz"), label: t("home.cellared") }
          ]}
          icon={Leaf}
          accent="#5A7C5A"
          bgImage={featuredBlend?.logo || featuredBlend?.photo}
          href={createPageUrl("Tobacco")}
        />
        </div>
      </div>

      {/* 7. PROACTIVE CURATOR */}
      {(hasPremium || hasPro) && (
        <ProactiveCuratorPanel
          pipes={pipes}
          blends={blends}
          logs={smokingLogs}
          curatorEnabled={userProfile?.enable_curator !== false}
        />
      )}

      {/* 8. COLLECTION INTELLIGENCE */}
      <div 
        className="rounded-lg overflow-hidden mt-2"
        style={{
          border: "1px solid rgba(180, 140, 75, 0.28)",
          boxShadow: "0 2px 10px rgba(0,0,0,0.5)"
        }}
      >
        <CollectionIntelligencePanel pipes={pipes} blends={blends} user={user} />
      </div>

      {/* 9. FAVORITES SECTION */}
      {favoritePipes.length + favoriteBlends.length > 0 && (
        <div
          className="rounded-lg p-5"
          style={{
            background: "linear-gradient(145deg, rgba(50, 35, 22, 0.68), rgba(38, 26, 18, 0.82))",
            border: "1px solid rgba(120, 90, 65, 0.28)",
            boxShadow: "0 2px 8px rgba(0,0,0,0.45), inset 0 1px 0 rgba(180,140,100,0.09)"
          }}
        >
          <div className="flex items-center gap-2 mb-5">
            <Heart className="w-4 h-4 fill-current" style={{ color: "#9B6B5F" }} />
            <h2 
              className="text-base font-semibold"
              style={{ color: "#F5F1E7", fontFamily: "'Georgia', serif" }}
            >
              {t("home.favorites")}
            </h2>
          </div>
          <div className="flex flex-wrap gap-2">
            {favoritePipes.map((item) => (
              <span
                key={item.id}
                className="inline-flex items-center gap-1 px-3 py-1.5 text-sm"
                style={{
                  background: "linear-gradient(135deg, rgba(60, 42, 28, 0.6), rgba(50, 35, 25, 0.7))",
                  border: "1px solid rgba(120, 90, 65, 0.25)",
                  borderRadius: "0.375rem",
                  color: "#F5F1E7",
                  boxShadow: "0 1px 3px rgba(0,0,0,0.3)"
                }}
              >
                <img
                  src={PIPE_ICON}
                  alt="pipe"
                  className="w-3.5 h-3.5 object-contain"
                  style={{
                    filter: "brightness(0) invert(1) sepia(0.7) saturate(2.2) hue-rotate(20deg) brightness(0.9)",
                  }}
                />
                {item.name}
              </span>
            ))}
            {favoriteBlends.map((item) => (
              <span
                key={item.id}
                className="inline-flex items-center gap-1 px-3 py-1.5 text-sm"
                style={{
                  background: "linear-gradient(135deg, rgba(60, 42, 28, 0.6), rgba(50, 35, 25, 0.7))",
                  border: "1px solid rgba(120, 90, 65, 0.25)",
                  borderRadius: "0.375rem",
                  color: "#F5F1E7",
                  boxShadow: "0 1px 3px rgba(0,0,0,0.3)"
                }}
              >
                <Leaf className="w-3.5 h-3.5" style={{ color: "rgba(90, 124, 90, 0.95)" }} />
                {item.name}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* 10. INSIGHTS REFERENCE */}
      {!isAppleBuild && (pipes.length > 0 || blends.length > 0) && (
        <div 
          className="p-5 flex items-center gap-4 rounded-lg transition-all hover:scale-[1.01]"
          style={{
            background: "linear-gradient(145deg, rgba(52, 37, 24, 0.7), rgba(40, 28, 18, 0.84))",
            border: "1px solid rgba(120, 90, 65, 0.3)",
            boxShadow: "0 2px 10px rgba(0,0,0,0.5), inset 0 1px 0 rgba(180,140,100,0.1)"
          }}
        >
          <BarChart3 className="w-5 h-5 shrink-0" style={{ color: "rgba(180, 140, 75, 0.85)" }} aria-hidden="true" />
          <div className="flex-1 min-w-0">
            <div className="font-medium text-sm" style={{ color: "#F5F1E7" }}>
              {t("insights.title")}
            </div>
            <div className="text-xs mt-0.5 space-y-0.5" style={{ color: "rgba(224, 216, 200, 0.6)" }}>
              {smokingLogs.length > 0 && (
                <div>{smokingLogs.length} {t("home.insightsSessions")}</div>
              )}
              {aiUpdateCount > 0 && (
                <div>{aiUpdateCount} {t("home.insightsAiUpdates")}</div>
              )}
            </div>
          </div>
          <a
            href={createPageUrl("Insights")}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 text-xs font-semibold transition-all shrink-0 whitespace-nowrap hover:scale-105"
            style={{
              background: "linear-gradient(135deg, rgba(100, 70, 45, 0.45), rgba(80, 55, 35, 0.55))",
              border: "1px solid rgba(120, 90, 65, 0.4)",
              borderRadius: "0.5rem",
              color: "#F5F1E7",
              boxShadow: "0 2px 5px rgba(0,0,0,0.4), inset 0 1px 0 rgba(180, 140, 100, 0.12)"
            }}
          >
            {t("home.openInsights")} <ArrowRight className="w-3.5 h-3.5" />
          </a>
        </div>
      )}

      {/* 11. RECENT ITEMS */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div
          className="rounded-lg p-5"
          style={{
            background: "linear-gradient(145deg, rgba(48, 34, 22, 0.72), rgba(36, 25, 17, 0.86))",
            border: "1px solid rgba(120, 90, 65, 0.28)",
            boxShadow: "0 2px 8px rgba(0,0,0,0.45), inset 0 1px 0 rgba(180,140,100,0.09), inset 0 -1px 2px rgba(0,0,0,0.2)"
          }}
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold" style={{ color: "#F5F1E7", fontFamily: "'Georgia', serif" }}>{t("home.recentPipes")}</h2>
            <a
              href={createPageUrl("Pipes")}
              className="text-xs transition-colors"
              style={{ color: "rgba(180, 140, 75, 0.7)" }}
            >
              {t("home.viewAll")} →
            </a>
          </div>
          <div className="space-y-2">
            {pipes.slice(0, 4).map((p) => (
              <a
                key={p.id}
                href={createPageUrl(`PipeDetail?id=${encodeURIComponent(p.id)}`)}
                className="flex items-center gap-3 rounded p-1.5 -mx-1.5 transition-all hover:bg-[rgba(60,45,30,0.2)]"
              >
                <div 
                  className="w-10 h-10 overflow-hidden shrink-0 flex items-center justify-center"
                  style={{
                    borderRadius: "0.375rem",
                    background: "linear-gradient(135deg, rgba(40, 28, 18, 0.8), rgba(35, 24, 16, 0.9))",
                    border: "1px solid rgba(120, 90, 65, 0.2)"
                  }}
                >
                  {p.photos?.[0] ? (
                    <img src={p.photos[0]} alt={p.name} className="w-full h-full object-cover" />
                  ) : (
                    <PipeShapeIcon shape={p.shape} className="w-5 h-5" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate" style={{ color: "#F5F1E7" }}>{p.name}</div>
                  {p.maker && <div className="text-xs truncate" style={{ color: "rgba(224, 216, 200, 0.6)" }}>{p.maker}</div>}
                </div>
                {p.estimated_value > 0 && (
                  <span className="text-xs font-medium shrink-0" style={{ color: "#5A7C5A" }}>
                    {formatCurrency(p.estimated_value)}
                  </span>
                )}
              </a>
            ))}
          </div>
        </div>

        <div
          className="rounded-lg p-5"
          style={{
            background: "linear-gradient(145deg, rgba(48, 34, 22, 0.72), rgba(36, 25, 17, 0.86))",
            border: "1px solid rgba(120, 90, 65, 0.28)",
            boxShadow: "0 2px 8px rgba(0,0,0,0.45), inset 0 1px 0 rgba(180,140,100,0.09), inset 0 -1px 2px rgba(0,0,0,0.2)"
          }}
        >
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-semibold" style={{ color: "#F5F1E7", fontFamily: "'Georgia', serif" }}>{t("home.recentTobacco")}</h2>
            <a
              href={createPageUrl("Tobacco")}
              className="text-xs transition-colors"
              style={{ color: "rgba(180, 140, 75, 0.7)" }}
            >
              {t("home.viewAll")} →
            </a>
          </div>
          <div className="space-y-2">
            {blends.slice(0, 4).map((b) => (
              <a
                key={b.id}
                href={createPageUrl(`TobaccoDetail?id=${encodeURIComponent(b.id)}`)}
                className="flex items-center gap-3 p-1.5 -mx-1.5 transition-all hover:bg-[rgba(60,45,30,0.2)] rounded"
              >
                <div 
                  className="w-10 h-10 rounded-full overflow-hidden shrink-0 flex items-center justify-center"
                  style={{
                    background: "linear-gradient(135deg, rgba(40, 28, 18, 0.8), rgba(35, 24, 16, 0.9))",
                    border: "1px solid rgba(120, 90, 65, 0.2)"
                  }}
                >
                  {b.logo || b.photo ? (
                    <img src={b.logo || b.photo} alt={b.name} className="w-full h-full object-cover" />
                  ) : (
                    <Leaf className="w-5 h-5 opacity-40" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate" style={{ color: "#F5F1E7" }}>{b.name}</div>
                  {b.manufacturer && <div className="text-xs truncate" style={{ color: "rgba(224, 216, 200, 0.6)" }}>{b.manufacturer}</div>}
                </div>
              </a>
            ))}
          </div>
        </div>
      </div>

      {/* 12. IMPORT TOOL */}
      <a href={createPageUrl("Import")} className="block">
        <div 
          className="p-5 flex items-center gap-4 transition-all cursor-pointer rounded-lg hover:scale-[1.01]"
          style={{
            background: "linear-gradient(145deg, rgba(52, 37, 24, 0.65), rgba(40, 28, 18, 0.78))",
            border: "1px solid rgba(120, 90, 65, 0.28)",
            boxShadow: "0 2px 8px rgba(0,0,0,0.45), inset 0 1px 0 rgba(180,140,100,0.08)"
          }}
        >
          <Sparkles className="w-6 h-6 shrink-0" style={{ color: "#D4AF37" }} />
          <div className="flex-1">
            <div className="font-semibold" style={{ color: "#F5F1E7" }}>{t("home.bulkImport")}</div>
            <div className="text-sm" style={{ color: "rgba(224, 216, 200, 0.7)" }}>{t("home.importDesc")}</div>
          </div>
          <ArrowRight className="w-5 h-5 shrink-0" style={{ color: "rgba(180, 140, 75, 0.5)" }} />
        </div>
      </a>

      {/* QUICK MODALS */}
      <LogSessionModal
        isOpen={showLogSession}
        onClose={() => setShowLogSession(false)}
        pipes={pipes}
        blends={blends}
        user={user}
      />
      <IdentifyModal
        isOpen={showIdentify}
        onClose={() => setShowIdentify(false)}
        pipes={pipes}
        blends={blends}
      />
      <CollectorStory
        isOpen={showStory}
        onClose={() => setShowStory(false)}
        storyCards={storyCards}
      />

      <TutorialSystem 
        user={user}
        pipes={pipes}
        blends={blends}
        forceTutorial={forceTutorial}
        onTutorialClose={() => setForceTutorial(false)}
      />
      </div>
    </div>
  );
}