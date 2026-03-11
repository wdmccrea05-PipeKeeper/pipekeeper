import React, { useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "@/components/i18n/safeTranslation";
import { PKCard } from "@/components/ui/pk-surface";
import { createPageUrl } from "@/components/utils/createPageUrl";
import { formatCurrency, formatWeight } from "@/components/utils/localeFormatters";
import { base44 } from "@/api/base44Client";
import { useCurrentUser } from "@/components/hooks/useCurrentUser";
import { calculateCellaredOzFromLogs, calculateTobaccoCollectionValue } from "@/components/utils/tobaccoQuantityHelpers";
import CollectionInsightsPanel from "@/components/home/CollectionInsightsPanel";
import CollectionIntelligencePanel from "@/components/home/CollectionIntelligencePanel";
import { Leaf, Heart, Sparkles, ArrowRight, Crown, PlusCircle, BookOpen } from "lucide-react";
import QuickActions from "@/components/home/QuickActions";
import { Leaf, Heart, Sparkles, ArrowRight, Crown } from "lucide-react";
import PipeShapeIcon from "@/components/pipes/PipeShapeIcon";
import { isAppleBuild } from "@/components/utils/appVariant";

const PIPE_ICON = "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/694956e18d119cc497192525/15563e4ee_PipeiconUpdated-fotor-20260110195319.png";
const CURATOR_ICON = 'https://github.com/user-attachments/assets/c6da10bc-a008-4307-8dc7-214105e04c02';

export default function Home() {
  const { t } = useTranslation();
  const { user, hasPaid, planLabel } = useCurrentUser();

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

  const insightsSectionRef = useRef(null);
  const curatorSectionRef = useRef(null);
  const [insightsTab, setInsightsTab] = useState("log");
  const [expertTab, setExpertTab] = useState("identifier");

  const scrollTo = (ref) => {
    const SCROLL_DELAY_MS = 50;
    setTimeout(() => ref.current?.scrollIntoView({ behavior: "smooth", block: "start" }), SCROLL_DELAY_MS);
  };

  const handleLogSession = () => {
    setInsightsTab("log");
    scrollTo(insightsSectionRef);
  };

  const handleIdentify = () => {
    setExpertTab("identifier");
    scrollTo(curatorSectionRef);
  };

  const handleOptimize = () => {
    setExpertTab("optimizer");
    scrollTo(curatorSectionRef);
  };

  const handleAskCurator = () => {
    setExpertTab("whatif");
    scrollTo(curatorSectionRef);
  };

  const totalPipeValue = pipes.reduce((sum, p) => sum + (Number(p?.estimated_value) || 0), 0);
  const totalCellaredOz = calculateCellaredOzFromLogs(cellarLogs);
  const totalTobaccoValue = calculateTobaccoCollectionValue(blends, cellarLogs);
  const totalCollectionValue = totalPipeValue + totalTobaccoValue;
  const hideHomeValues = !!userProfile?.home_hide_collection_values;
  const favoritePipes = pipes.filter((p) => p?.is_favorite);
  const favoriteBlends = blends.filter((b) => b?.is_favorite);

  return (
    <div className="space-y-5">
      {/* 1. HERO */}
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold font-serif text-[#E0D8C8]">
          {t("home.title")}
        </h1>
        <p className="text-base text-[#E0D8C8]/70 max-w-2xl mx-auto">
          {t("home.subtitle")}
        </p>
      </div>

      {/* 2. SUBSCRIPTION STATUS BANNER */}
      {hasPaid && (
        <div className="border-l-4 border-amber-500 bg-[#223447] rounded-r-xl p-4 flex items-center gap-3">
          <Crown className="w-5 h-5 text-amber-400 shrink-0" />
          <div>
            <div className="font-semibold text-amber-400">{t("subscription.proBadge")}</div>
            <div className="text-sm text-[#E0D8C8]/70">{t("subscription.thankYouSupporting")}</div>
          </div>
          {planLabel && (
            <span className="ml-auto text-xs text-[#E0D8C8]/50 shrink-0 truncate max-w-[60px]">
              {planLabel}
            </span>
          )}
        </div>
      )}

      {/* 3. PORTFOLIO SUMMARY */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <PKCard className="p-4 flex flex-col justify-between min-h-[80px]">
          <div className="text-xs text-[#E0D8C8]/60 uppercase tracking-wide font-medium leading-snug">
            {t("home.totalValue")}
          </div>
          <div className="text-2xl font-bold text-[#E0D8C8] mt-2">
            {hideHomeValues ? "••••" : formatCurrency(Math.round(totalCollectionValue))}
          </div>
        </PKCard>

        <PKCard className="p-4 flex flex-col justify-between min-h-[80px]">
          <div className="text-xs text-[#E0D8C8]/60 uppercase tracking-wide font-medium leading-snug">
            {t("home.pipesInCollection")}
          </div>
          <div className="text-2xl font-bold text-[#E0D8C8] mt-2">{pipes.length}</div>
        </PKCard>

        <PKCard className="p-4 flex flex-col justify-between min-h-[80px]">
          <div className="text-xs text-[#E0D8C8]/60 uppercase tracking-wide font-medium leading-snug">
            {t("home.tobaccoBlends")}
          </div>
          <div className="text-2xl font-bold text-[#E0D8C8] mt-2">{blends.length}</div>
        </PKCard>

        <PKCard className="p-4 flex flex-col justify-between min-h-[80px]">
          <div className="text-xs text-[#E0D8C8]/60 uppercase tracking-wide font-medium leading-snug">
            {t("home.cellared")}
          </div>
          <div className="text-2xl font-bold text-[#E0D8C8] mt-2">
            {formatWeight(totalCellaredOz, "oz")}
          </div>
        </PKCard>
      </div>

      {/* 4. QUICK ACTIONS */}
      <PKCard className="p-4 sm:p-5">
        <h2 className="text-sm font-semibold text-[#E0D8C8]/60 uppercase tracking-wider mb-3">{t("home.quickActions")}</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <a
            href={createPageUrl("Pipes")}
            className="flex flex-col items-center gap-2 px-3 py-4 rounded-xl bg-[#C87941]/10 hover:bg-[#C87941]/20 text-[#E0D8C8] font-medium text-sm transition-colors min-h-[44px] text-center"
          >
            <PlusCircle className="w-6 h-6 text-[#C87941]" />
            <span>{t("home.quickActionAddPipe")}</span>
          </a>
          <a
            href={createPageUrl("Tobacco")}
            className="flex flex-col items-center gap-2 px-3 py-4 rounded-xl bg-[#4A7C59]/10 hover:bg-[#4A7C59]/20 text-[#E0D8C8] font-medium text-sm transition-colors min-h-[44px] text-center"
          >
            <Leaf className="w-6 h-6 text-[#6aab80]" />
            <span>{t("home.quickActionAddTobacco")}</span>
          </a>
          <a
            href={createPageUrl("Home")}
            className="flex flex-col items-center gap-2 px-3 py-4 rounded-xl bg-white/5 hover:bg-white/10 text-[#E0D8C8] font-medium text-sm transition-colors min-h-[44px] text-center"
          >
            <BookOpen className="w-6 h-6 text-[#E0D8C8]/70" />
            <span>{t("home.quickActionLogSession")}</span>
          </a>
          {!isAppleBuild && (
            <a
              href={createPageUrl("CollectionCurator")}
              className="flex flex-col items-center gap-2 px-3 py-4 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-[#E0D8C8] font-medium text-sm transition-colors min-h-[44px] text-center"
            >
              <div className="w-6 h-6 rounded-full overflow-hidden flex items-center justify-center bg-amber-900/30">
                <img src={CURATOR_ICON} alt="" className="w-full h-full object-cover" />
              </div>
              <span>{t("home.quickActionCollectionCurator")}</span>
            </a>
          )}
        </div>
      </PKCard>

      {/* 5. COLLECTION OVERVIEW — stacked on mobile, horizontal rows on desktop */}
      <QuickActions
        onLogSession={handleLogSession}
        onIdentify={handleIdentify}
        onOptimize={handleOptimize}
        onAskCurator={handleAskCurator}
      />

      {/* 5. MODULE OVERVIEW CARDS */}
      <div className="flex flex-col gap-4">
        <PKCard className="p-4 sm:p-5 border-l-4 border-[#C87941]">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
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
        </PKCard>

        <PKCard className="p-4 sm:p-5 border-l-4 border-[#4A7C59]">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
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

      {/* 5b. FAVORITES SECTION */}
      {favoritePipes.length + favoriteBlends.length > 0 && (
        <PKCard className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <Heart className="w-5 h-5 text-red-500 fill-red-500" />
            <h2 className="text-xl font-semibold">{t("home.favorites")}</h2>
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
                className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-[#1e3347] text-[#E0D8C8] text-sm border border-[#E0D8C8]/20"
              >
                <Leaf className="w-3 h-3" />
                {item.name}
              </span>
            ))}
          </div>
        </PKCard>
      )}

      {/* 6. COLLECTION INTELLIGENCE */}
      <CollectionIntelligencePanel pipes={pipes} blends={blends} user={user} />

      {/* 7. COLLECTION INSIGHTS PANEL */}
      <CollectionInsightsPanel pipes={pipes} blends={blends} user={user} />

      {/* 8. RECENT PIPES & RECENT TOBACCO */}
      <div ref={insightsSectionRef}>
        <CollectionInsightsPanel
          pipes={pipes}
          blends={blends}
          user={user}
          activeTab={insightsTab}
          onTabChange={setInsightsTab}
        />
      </div>

      {/* 8. CURATOR ANCHOR TARGET */}
      <div ref={curatorSectionRef} />

      {/* 9. RECENT PIPES & RECENT TOBACCO */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <PKCard className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">{t("home.recentPipes")}</h2>
            <a
              href={createPageUrl("Pipes")}
              className="text-sm text-[#E0D8C8]/70 hover:text-[#E0D8C8]"
            >
              {t("home.viewAll")} →
            </a>
          </div>
          <div className="space-y-3">
            {pipes.slice(0, 4).map((p) => (
              <a
                key={p.id}
                href={createPageUrl(`PipeDetail?id=${encodeURIComponent(p.id)}`)}
                className="flex items-center gap-3 hover:bg-white/5 rounded-lg p-1.5 -mx-1.5 transition-colors"
              >
                <div className="w-12 h-12 rounded-lg bg-[#1E2F43] overflow-hidden shrink-0 flex items-center justify-center">
                  {p.photos?.[0] ? (
                    <img src={p.photos[0]} alt={p.name} className="w-full h-full object-cover" />
                  ) : (
                    <PipeShapeIcon shape={p.shape} className="w-6 h-6" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium truncate">{p.name}</div>
                  {p.maker && <div className="text-sm opacity-60 truncate">{p.maker}</div>}
                </div>
                {p.estimated_value > 0 && (
                  <span className="text-green-400 text-sm font-medium shrink-0">
                    {formatCurrency(p.estimated_value)}
                  </span>
                )}
              </a>
            ))}
          </div>
        </PKCard>

        <PKCard className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">{t("home.recentTobacco")}</h2>
            <a
              href={createPageUrl("Tobacco")}
              className="text-sm text-[#E0D8C8]/70 hover:text-[#E0D8C8]"
            >
              {t("home.viewAll")} →
            </a>
          </div>
          <div className="space-y-3">
            {blends.slice(0, 4).map((b) => (
              <a
                key={b.id}
                href={createPageUrl(`TobaccoDetail?id=${encodeURIComponent(b.id)}`)}
                className="flex items-center gap-3 hover:bg-white/5 rounded-lg p-1.5 -mx-1.5 transition-colors"
              >
                <div className="w-12 h-12 rounded-full bg-[#1E2F43] overflow-hidden shrink-0 flex items-center justify-center">
                  {b.logo || b.photo ? (
                    <img src={b.logo || b.photo} alt={b.name} className="w-full h-full object-cover" />
                  ) : (
                    <Leaf className="w-6 h-6 opacity-40" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium truncate">{b.name}</div>
                  {b.manufacturer && <div className="text-sm opacity-60 truncate">{b.manufacturer}</div>}
                </div>
              </a>
            ))}
          </div>
        </PKCard>
      </div>

      {/* 9. BULK IMPORT FOOTER */}
      {/* 10. BULK IMPORT FOOTER */}
      <a href={createPageUrl("Import")} className="block">
        <PKCard className="p-4 flex items-center gap-4 hover:bg-[#2a3f57] transition-colors cursor-pointer">
          <Sparkles className="w-8 h-8 text-amber-400 shrink-0" />
          <div className="flex-1">
            <div className="font-semibold">{t("home.bulkImport")}</div>
            <div className="text-sm opacity-70">{t("home.importDesc")}</div>
          </div>
          <ArrowRight className="w-5 h-5 opacity-50 shrink-0" />
        </PKCard>
      </a>
    </div>
  );
}
