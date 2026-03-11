import React, { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "@/components/i18n/safeTranslation";
import { PKCard } from "@/components/ui/pk-surface";
import { createPageUrl } from "@/components/utils/createPageUrl";
import { formatCurrency, formatWeight } from "@/components/utils/localeFormatters";
import { base44 } from "@/api/base44Client";
import { useCurrentUser } from "@/components/hooks/useCurrentUser";
import { calculateCellaredOzFromLogs, calculateTobaccoCollectionValue } from "@/components/utils/tobaccoQuantityHelpers";
import CollectionIntelligencePanel from "@/components/home/CollectionIntelligencePanel";
import QuickActions from "@/components/home/QuickActions";
import LogSessionModal from "@/components/home/LogSessionModal";
import IdentifyModal from "@/components/home/IdentifyModal";
import { Leaf, Heart, Sparkles, ArrowRight, Crown, BarChart3, Archive, TrendingUp, Flame } from "lucide-react";
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
  const { user, hasPaid, planLabel } = useCurrentUser();

  const [showLogSession, setShowLogSession] = useState(false);
  const [showIdentify, setShowIdentify] = useState(false);
  const [showStory, setShowStory] = useState(false);

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
      const profiles = await base44.entities.UserProfile.filter({ user_email: user?.email });
      return profiles?.[0] || null;
    },
    enabled: !!user?.email,
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
    queryFn: () => base44.entities.SmokingLog.filter({ created_by: user?.email }, "-date", 1000),
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

  const totalPipeValue = pipes.reduce((sum, p) => sum + (Number(p?.estimated_value) || 0), 0);
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

  // Generate story cards
  const storyCards = useMemo(() => {
    if (!pipes.length && !blends.length) return [];
    return generateStoryCards(pipes, blends, smokingLogs, totalCollectionValue, formatCurrency, t);
  }, [pipes, blends, smokingLogs, totalCollectionValue, t]);

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

  // Most valuable pipe
  const mostValuablePipe = useMemo(() => {
    return pipes.filter((p) => (p.estimated_value || 0) > 0).sort((a, b) => (b.estimated_value || 0) - (a.estimated_value || 0))[0] || null;
  }, [pipes]);

  // Favorite blend
  const favoriteBlend = useMemo(() => {
    return favoriteBlends[0] || null;
  }, [favoriteBlends]);

  return (
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
        
        {/* OLD MODULE CARDS - REPLACED ABOVE 
        <PKCard className="p-4 sm:p-5 border-l-4 border-[#C87941] relative overflow-hidden">
          {/* Ambient artifact: blurred pipe photo if available */}
          {featuredPipe?.photos?.[0] ? (
            <>
              <div
                className="absolute inset-0 pointer-events-none"
                style={{
                  backgroundImage: `url(${featuredPipe.photos[0]})`,
                  backgroundSize: "cover",
                  backgroundPosition: "center",
                  filter: "blur(18px) brightness(0.18) saturate(0.55)",
                  opacity: 0.85,
                  transform: "scale(1.1)",
                }}
              />
              {/* Hero crop: pipe photo visible on right edge */}
              <div
                className="absolute right-0 top-0 bottom-0 pointer-events-none overflow-hidden"
                style={{ width: "40%" }}
              >
                <div
                  className="absolute inset-0"
                  style={{
                    backgroundImage: `url(${featuredPipe.photos[0]})`,
                    backgroundSize: "cover",
                    backgroundPosition: "center",
                    filter: "blur(3px) brightness(0.35) saturate(0.75)",
                  }}
                />
                <div
                  className="absolute inset-0"
                  style={{ background: "linear-gradient(to right, rgba(20,32,46,1) 0%, rgba(20,32,46,0.5) 40%, transparent 85%)" }}
                />
              </div>
              <div
                className="absolute inset-0 pointer-events-none"
                style={{ background: "linear-gradient(to right, rgba(34,52,71,0.94) 0%, rgba(34,52,71,0.75) 55%, rgba(200,121,65,0.10) 100%)" }}
              />
            </>
          ) : (
            <div
              className="absolute right-0 top-0 bottom-0 flex items-center pointer-events-none"
              style={{ opacity: 0.06 }}
            >
              <img
                src={PIPE_SILHOUETTE_URL}
                alt=""
                className="w-32 h-32 object-contain"
                style={{ filter: "brightness(0) invert(1)" }}
                loading="lazy"
              />
            </div>
          )}
          {/* Wood grain texture overlay */}
          <svg className="absolute inset-0 w-full h-full pointer-events-none" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id="home-woodgrain-pipes" x="0" y="0" width="200" height="26" patternUnits="userSpaceOnUse">
                <path d="M0,4 C40,3 80,5 120,4 S175,3 200,4" stroke="#C87941" strokeWidth="0.5" fill="none" strokeOpacity="0.08" />
                <path d="M0,11 C50,10 90,12 140,11 S180,10 200,11" stroke="#C87941" strokeWidth="0.35" fill="none" strokeOpacity="0.055" />
                <path d="M0,18 C35,17 75,19 115,18 S170,17 200,18" stroke="#C87941" strokeWidth="0.45" fill="none" strokeOpacity="0.07" />
                <path d="M0,24 C60,23 100,25 155,24 S188,23 200,24" stroke="#C87941" strokeWidth="0.3" fill="none" strokeOpacity="0.045" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#home-woodgrain-pipes)" />
          </svg>
          <div className="flex flex-col sm:flex-row sm:items-center gap-4 relative">
            <div className="flex items-center gap-3 sm:w-48 sm:shrink-0">
              <div className="w-9 h-9 rounded-lg bg-[#C87941]/20 flex items-center justify-center shrink-0">
                <img
                  src={PIPE_ICON}
                  alt=""
                  className="w-5 h-5 object-contain"
                  style={{
                    filter:
                      "invert(1) sepia(0.35) saturate(0.4) hue-rotate(350deg) brightness(0.9) opacity(0.9)",
                  }}
                />
              </div>
              <h2 className="text-base font-semibold text-[#E0D8C8]">
                {t("home.pipeCollectionTitle")}
              </h2>
            </div>

            <div className="flex flex-row flex-wrap gap-x-6 gap-y-2 flex-1">
              <div>
                <div className="text-xl font-bold text-[#E0D8C8]">
                  {hideHomeValues ? "••••" : formatCurrency(Math.round(totalPipeValue))}
                </div>
                <div className="text-xs text-[#E0D8C8]/60 mt-0.5">{t("home.collectionValue")}</div>
              </div>
              <div>
                <div className="text-xl font-bold text-[#E0D8C8]">{pipes.length}</div>
                <div className="text-xs text-[#E0D8C8]/60 mt-0.5">{t("home.pipesInCollection")}</div>
              </div>
            </div>

            <a
              href={createPageUrl("Pipes")}
              className="inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-[#C87941]/20 hover:bg-[#C87941]/30 text-[#E0D8C8] font-medium text-sm transition-colors min-h-[44px] sm:shrink-0 whitespace-nowrap"
            >
              {t("home.viewCollection")} <ArrowRight className="w-4 h-4" />
            </a>
          </div>
        </PKCard> */}

        {/* OLD TOBACCO CARD - REPLACED ABOVE
        <PKCard className="p-4 sm:p-5 border-l-4 border-[#4A7C59] relative overflow-hidden">
          {/* Ambient artifact: blurred blend logo/photo if available */}
          {featuredBlend?.logo || featuredBlend?.photo ? (
            <>
              <div
                className="absolute inset-0 pointer-events-none"
                style={{
                  backgroundImage: `url(${featuredBlend.logo || featuredBlend.photo})`,
                  backgroundSize: "cover",
                  backgroundPosition: "center",
                  filter: "blur(18px) brightness(0.18) saturate(0.55)",
                  opacity: 0.85,
                  transform: "scale(1.1)",
                }}
              />
              {/* Hero crop: tin label visible on right edge */}
              <div
                className="absolute right-0 top-0 bottom-0 pointer-events-none overflow-hidden"
                style={{ width: "40%" }}
              >
                <div
                  className="absolute inset-0"
                  style={{
                    backgroundImage: `url(${featuredBlend.logo || featuredBlend.photo})`,
                    backgroundSize: "contain",
                    backgroundPosition: "center",
                    backgroundRepeat: "no-repeat",
                    filter: "blur(2px) brightness(0.38) saturate(0.80)",
                  }}
                />
                <div
                  className="absolute inset-0"
                  style={{ background: "linear-gradient(to right, rgba(20,32,28,1) 0%, rgba(20,32,28,0.5) 40%, transparent 85%)" }}
                />
              </div>
              <div
                className="absolute inset-0 pointer-events-none"
                style={{ background: "linear-gradient(to right, rgba(34,52,71,0.94) 0%, rgba(34,52,71,0.75) 55%, rgba(74,124,89,0.12) 100%)" }}
              />
            </>
          ) : (
            <svg
              className="absolute right-0 top-1/2 -translate-y-1/2 w-32 h-32 pointer-events-none"
              viewBox="0 0 100 100"
              xmlns="http://www.w3.org/2000/svg"
              style={{ opacity: 0.06 }}
            >
              <path d="M50 5 C20 5, 5 30, 5 55 C5 75, 20 92, 50 95 C80 92, 95 75, 95 55 C95 30, 80 5, 50 5Z" fill="white" />
              <line x1="50" y1="95" x2="50" y2="5" stroke="white" strokeWidth="2" />
              <line x1="50" y1="40" x2="20" y2="25" stroke="white" strokeWidth="1.5" />
              <line x1="50" y1="55" x2="15" y2="50" stroke="white" strokeWidth="1.5" />
              <line x1="50" y1="70" x2="20" y2="65" stroke="white" strokeWidth="1.5" />
              <line x1="50" y1="40" x2="80" y2="25" stroke="white" strokeWidth="1.5" />
              <line x1="50" y1="55" x2="85" y2="50" stroke="white" strokeWidth="1.5" />
              <line x1="50" y1="70" x2="80" y2="65" stroke="white" strokeWidth="1.5" />
            </svg>
          )}
          {/* Paper / label texture overlay */}
          <svg className="absolute inset-0 w-full h-full pointer-events-none" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id="home-paper-tobacco" x="0" y="0" width="50" height="50" patternUnits="userSpaceOnUse">
                <line x1="0" y1="0" x2="0" y2="50" stroke="#4A7C59" strokeWidth="0.25" strokeOpacity="0.055" />
                <line x1="10" y1="0" x2="10" y2="50" stroke="#4A7C59" strokeWidth="0.2" strokeOpacity="0.04" />
                <line x1="20" y1="0" x2="20" y2="50" stroke="#4A7C59" strokeWidth="0.25" strokeOpacity="0.05" />
                <line x1="30" y1="0" x2="30" y2="50" stroke="#4A7C59" strokeWidth="0.2" strokeOpacity="0.04" />
                <line x1="40" y1="0" x2="40" y2="50" stroke="#4A7C59" strokeWidth="0.25" strokeOpacity="0.055" />
                <line x1="0" y1="0" x2="50" y2="0" stroke="#4A7C59" strokeWidth="0.2" strokeOpacity="0.04" />
                <line x1="0" y1="13" x2="50" y2="13" stroke="#4A7C59" strokeWidth="0.17" strokeOpacity="0.032" />
                <line x1="0" y1="26" x2="50" y2="26" stroke="#4A7C59" strokeWidth="0.2" strokeOpacity="0.04" />
                <line x1="0" y1="39" x2="50" y2="39" stroke="#4A7C59" strokeWidth="0.17" strokeOpacity="0.032" />
                <circle cx="6" cy="18" r="0.35" fill="#4A7C59" fillOpacity="0.055" />
                <circle cx="31" cy="7" r="0.28" fill="#4A7C59" fillOpacity="0.045" />
                <circle cx="44" cy="36" r="0.35" fill="#4A7C59" fillOpacity="0.055" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#home-paper-tobacco)" />
          </svg>
          <div className="flex flex-col sm:flex-row sm:items-center gap-4 relative">
            <div className="flex items-center gap-3 sm:w-48 sm:shrink-0">
              <div className="w-9 h-9 rounded-lg bg-[#4A7C59]/20 flex items-center justify-center shrink-0">
                <Leaf className="w-5 h-5 text-[#6aab80]" />
              </div>
              <h2 className="text-base font-semibold text-[#E0D8C8]">
                {t("home.tobaccoCellarTitle")}
              </h2>
            </div>

            <div className="flex flex-row flex-wrap gap-x-6 gap-y-2 flex-1">
              <div>
                <div className="text-xl font-bold text-[#E0D8C8]">
                  {hideHomeValues ? "••••" : formatCurrency(Math.round(totalTobaccoValue))}
                </div>
                <div className="text-xs text-[#E0D8C8]/60 mt-0.5">{t("home.collectionValue")}</div>
              </div>
              <div>
                <div className="text-xl font-bold text-[#E0D8C8]">{blends.length}</div>
                <div className="text-xs text-[#E0D8C8]/60 mt-0.5">{t("home.tobaccoBlends")}</div>
              </div>
              <div>
                <div className="text-xl font-bold text-[#E0D8C8]">
                  {formatWeight(totalCellaredOz, "oz")}
                </div>
                <div className="text-xs text-[#E0D8C8]/60 mt-0.5">{t("home.cellared")}</div>
              </div>
            </div>

            <a
              href={createPageUrl("Tobacco")}
              className="inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-[#4A7C59]/20 hover:bg-[#4A7C59]/30 text-[#E0D8C8] font-medium text-sm transition-colors min-h-[44px] sm:shrink-0 whitespace-nowrap"
            >
              {t("home.viewCellar")} <ArrowRight className="w-4 h-4" />
            </a>
          </div>
        </PKCard>
      </div>

      {/* 7. CURATOR INTELLIGENCE */}
      <div 
        className="rounded-lg overflow-hidden"
        style={{
          border: "1px solid rgba(180, 140, 75, 0.25)",
          boxShadow: "0 2px 8px rgba(0,0,0,0.5)"
        }}
      >
        <CollectionIntelligencePanel pipes={pipes} blends={blends} user={user} />
      </div>

      {/* 8. FAVORITES SECTION */}
      {favoritePipes.length + favoriteBlends.length > 0 && (
        <div
          className="rounded-lg p-5"
          style={{
            background: "linear-gradient(135deg, rgba(42, 30, 20, 0.7), rgba(35, 24, 16, 0.85))",
            border: "1px solid rgba(120, 90, 65, 0.3)",
            boxShadow: "0 2px 6px rgba(0,0,0,0.4), inset 0 1px 0 rgba(180,140,100,0.08)"
          }}
        >
          <div className="flex items-center gap-2 mb-4">
            <Heart className="w-5 h-5 fill-current" style={{ color: "#9B6B5F" }} />
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
                className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-[#1e3347] text-[#E0D8C8] text-sm border border-[#E0D8C8]/20"
              >
                <img
                  src={PIPE_ICON}
                  alt="pipe"
                  className="w-3 h-3 object-contain"
                  style={{
                    filter:
                      "invert(1) sepia(0.35) saturate(0.4) hue-rotate(350deg) brightness(0.9) opacity(0.9)",
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
                <Leaf className="w-3 h-3" style={{ color: "#5A7C5A" }} />
                {item.name}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* 9. INSIGHTS REFERENCE */}
      {!isAppleBuild && (pipes.length > 0 || blends.length > 0) && (
        <div 
          className="p-4 flex items-center gap-3 rounded-lg"
          style={{
            background: "linear-gradient(135deg, rgba(42, 30, 20, 0.6), rgba(35, 24, 16, 0.75))",
            border: "1px solid rgba(120, 90, 65, 0.25)",
            boxShadow: "0 1px 4px rgba(0,0,0,0.4)"
          }}
        >
          <BarChart3 className="w-7 h-7 shrink-0" style={{ color: "rgba(180, 140, 75, 0.7)" }} aria-hidden="true" />
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
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium transition-colors shrink-0 whitespace-nowrap"
            style={{
              background: "linear-gradient(135deg, rgba(100, 70, 45, 0.3), rgba(80, 55, 35, 0.4))",
              border: "1px solid rgba(120, 90, 65, 0.3)",
              borderRadius: "0.375rem",
              color: "#F5F1E7",
              boxShadow: "0 1px 2px rgba(0,0,0,0.3)"
            }}
          >
            {t("home.openInsights")} <ArrowRight className="w-3 h-3" />
          </a>
        </div>
      )}

      {/* 10. RECENT ITEMS */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div
          className="rounded-lg p-4"
          style={{
            background: "linear-gradient(135deg, rgba(42, 30, 20, 0.7), rgba(35, 24, 16, 0.85))",
            border: "1px solid rgba(120, 90, 65, 0.3)",
            boxShadow: "0 2px 6px rgba(0,0,0,0.4), inset 0 1px 0 rgba(180,140,100,0.08)"
          }}
        >
          <div className="flex items-center justify-between mb-3">
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
                className="flex items-center gap-3 hover:bg-white/5 rounded-lg p-1.5 -mx-1.5 transition-colors"
              >
                <div className="w-10 h-10 rounded-lg bg-[#1E2F43] overflow-hidden shrink-0 flex items-center justify-center">
                  {p.photos?.[0] ? (
                    <img src={p.photos[0]} alt={p.name} className="w-full h-full object-cover" />
                  ) : (
                    <PipeShapeIcon shape={p.shape} className="w-5 h-5" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">{p.name}</div>
                  {p.maker && <div className="text-xs opacity-60 truncate">{p.maker}</div>}
                </div>
                {p.estimated_value > 0 && (
                  <span className="text-green-400 text-xs font-medium shrink-0">
                    {formatCurrency(p.estimated_value)}
                  </span>
                )}
              </a>
            ))}
            </div>
            </div>

            <div
            className="rounded-lg p-4"
            style={{
            background: "linear-gradient(135deg, rgba(42, 30, 20, 0.7), rgba(35, 24, 16, 0.85))",
            border: "1px solid rgba(120, 90, 65, 0.3)",
            boxShadow: "0 2px 6px rgba(0,0,0,0.4), inset 0 1px 0 rgba(180,140,100,0.08)"
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
                className="flex items-center gap-3 hover:bg-white/5 rounded-lg p-1.5 -mx-1.5 transition-colors"
              >
                <div className="w-10 h-10 rounded-full bg-[#1E2F43] overflow-hidden shrink-0 flex items-center justify-center">
                  {b.logo || b.photo ? (
                    <img src={b.logo || b.photo} alt={b.name} className="w-full h-full object-cover" />
                  ) : (
                    <Leaf className="w-5 h-5 opacity-40" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">{b.name}</div>
                  {b.manufacturer && <div className="text-xs opacity-60 truncate">{b.manufacturer}</div>}
                </div>
              </a>
            ))}
            </div>
            </div>
            </div>

            {/* 11. IMPORT TOOL */}
            <a href={createPageUrl("Import")} className="block">
            <div 
            className="p-4 flex items-center gap-4 transition-all cursor-pointer rounded-lg"
            style={{
            background: "linear-gradient(135deg, rgba(42, 30, 20, 0.6), rgba(35, 24, 16, 0.75))",
            border: "1px solid rgba(120, 90, 65, 0.25)",
            boxShadow: "0 2px 6px rgba(0,0,0,0.4)"
            }}
            >
          <Sparkles className="w-8 h-8 shrink-0" style={{ color: "#D4AF37" }} />
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
    </div>
  );
}