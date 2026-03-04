import React from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "@/components/i18n/safeTranslation";
import { PKCard } from "@/components/ui/pk-surface";
import { createPageUrl } from "@/components/utils/createPageUrl";
import { formatCurrency, formatWeight } from "@/components/utils/localeFormatters";
import { base44 } from "@/api/base44Client";
import { useCurrentUser } from "@/components/hooks/useCurrentUser";
import { calculateCellaredOzFromLogs, calculateTobaccoCollectionValue } from "@/components/utils/tobaccoQuantityHelpers";
import CollectionInsightsPanel from "@/components/home/CollectionInsightsPanel";
import ExpertTobacconist from "@/components/ai/ExpertTobacconist";
import { RefreshCw, Leaf, Heart, Sparkles, ArrowRight, Crown } from "lucide-react";

const PIPE_ICON = "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/694956e18d119cc497192525/15563e4ee_PipeiconUpdated-fotor-20260110195319.png";
import PipeShapeIcon from "@/components/pipes/PipeShapeIcon";

export default function Home() {
  const { t } = useTranslation();
  const { user, hasPaid, planLabel } = useCurrentUser();

  const { data: pipes = [] } = useQuery({
    queryKey: ['pipes', user?.email],
    queryFn: async () => {
      const result = await base44.entities.Pipe.filter({ created_by: user?.email });
      return Array.isArray(result) ? result : [];
    },
    enabled: !!user?.email,
    staleTime: 10000,
  });

  const { data: blends = [] } = useQuery({
    queryKey: ['blends', user?.email],
    queryFn: async () => {
      const result = await base44.entities.TobaccoBlend.filter({ created_by: user?.email });
      return Array.isArray(result) ? result : [];
    },
    enabled: !!user?.email,
    staleTime: 10000,
  });

  const { data: userProfile } = useQuery({
    queryKey: ['user-profile', user?.email],
    queryFn: async () => {
      const profiles = await base44.entities.UserProfile.filter({ user_email: user?.email });
      return profiles?.[0] || null;
    },
    enabled: !!user?.email,
    staleTime: 10000,
  });

  const { data: cellarLogs = [] } = useQuery({
    queryKey: ['cellar-logs-all', user?.email],
    queryFn: () => base44.entities.CellarLog.filter({ created_by: user?.email }),
    enabled: !!user?.email,
    staleTime: 30000,
  });

  const totalPipeValue = pipes.reduce((sum, p) => sum + (Number(p?.estimated_value) || 0), 0);
  const totalCellaredOz = calculateCellaredOzFromLogs(cellarLogs);
  const totalTobaccoValue = calculateTobaccoCollectionValue(blends, cellarLogs);
  const favoritePipes = pipes.filter(p => p?.is_favorite);
  const favoriteBlends = blends.filter(b => b?.is_favorite);

  return (
    <div className="space-y-8">
      {/* 1. HERO */}
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-bold font-serif text-[#E0D8C8]">
            {t("home.title", "Pipe & Tobacco Collection")}
          </h1>
        <p className="text-lg text-[#E0D8C8]/80 max-w-3xl mx-auto">
           {t("home.subtitle", "Manage your pipes and tobacco blends with AI-powered search, photo identification, pairing suggestions, and market valuations.")}
         </p>
      </div>

      {/* 2. SUBSCRIPTION STATUS BANNER */}
      {hasPaid && (
        <div className="border-l-4 border-amber-500 bg-[#223447] rounded-r-xl p-4 flex items-center gap-3">
          <Crown className="w-5 h-5 text-amber-400 shrink-0" />
          <div>
            <div className="font-semibold text-amber-400">{t("subscription.proBadge", "Pro Active")}</div>
            <div className="text-sm text-[#E0D8C8]/70">{t("subscription.thankYouSupporting", "Thank you for supporting PipeKeeper")}</div>
          </div>
          {planLabel && <span className="ml-auto text-xs text-[#E0D8C8]/50">{planLabel}</span>}
        </div>
      )}

      {/* 3. PIPE COLLECTION & TOBACCO CELLAR CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Pipe Collection Card */}
        <div className="relative overflow-hidden rounded-2xl border border-white/10 shadow-sm min-h-[320px] flex flex-col">
          <div
            className="absolute inset-0 bg-cover bg-center"
            style={{ backgroundImage: `url('https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/694956e18d119cc497192525/847ca6ee3_Image1.jpeg')` }}
          />
          <div className="absolute inset-0 bg-[#6b2d2d]/90" />
          <div className="relative flex flex-col flex-1 p-6 text-[#F5F1E7]">
            <div className="flex items-start justify-between mb-1">
              <div>
                <h2 className="text-2xl font-bold">{t("home.pipeCollectionTitle", "Pipe Collection")}</h2>
                <p className="text-sm opacity-60 mt-0.5">{t("home.pipeCollectionSubtitle", "Track and value your pipes")}</p>
              </div>
              <div className="flex gap-1">
                <a href={createPageUrl("Pipes")} className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 transition-colors" aria-label={t("common.refresh", "Refresh")}>
                  <RefreshCw className="w-4 h-4" />
                </a>
                <a href={createPageUrl("Pipes")} className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 transition-colors" aria-label={t("common.view", "View")}>
                  <Download className="w-4 h-4" />
                </a>
              </div>
            </div>
            <div className="flex flex-col gap-3 mt-5 flex-1">
              <a href={createPageUrl("Pipes")} className="bg-white/10 rounded-xl px-4 py-3 hover:bg-white/20 transition-colors block">
                <div className="text-3xl font-bold">{pipes.length}</div>
                <div className="text-sm opacity-60 mt-0.5">{t("home.pipesInCollection", "Pipes in Collection")}</div>
              </a>
              <a href={createPageUrl("Pipes")} className="bg-white/10 rounded-xl px-4 py-3 hover:bg-white/20 transition-colors block">
                <div className="text-3xl font-bold">{formatCurrency(totalPipeValue)}</div>
                <div className="text-sm opacity-60 mt-0.5">{t("home.collectionValue", "Collection Value")}</div>
              </a>
            </div>
            <div className="mt-5 pt-4 border-t border-white/20 flex items-center justify-between">
              <a href={createPageUrl("Pipes")} className="text-[#F5F1E7] font-medium hover:underline text-sm">
                {t("home.viewCollection", "View Collection")}
              </a>
              <span className="opacity-60">→</span>
            </div>
          </div>
        </div>

        {/* Tobacco Cellar Card */}
        <div className="relative overflow-hidden rounded-2xl border border-white/10 shadow-sm min-h-[320px] flex flex-col">
          <div
            className="absolute inset-0 bg-cover bg-center"
            style={{ backgroundImage: `url('https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/694956e18d119cc497192525/2f3158c10_7084B1F4-A823-4AA9-8340-8DCA2DEB5B79-1024x768.jpg')` }}
          />
          <div className="absolute inset-0 bg-[#1c3d2e]/90" />
          <div className="relative flex flex-col flex-1 p-6 text-[#F5F1E7]">
            <div className="flex items-start justify-between mb-1">
              <div>
                <h2 className="text-2xl font-bold">{t("home.tobaccoCellarTitle", "Tobacco Cellar")}</h2>
                <p className="text-sm opacity-60 mt-0.5">{t("home.tobaccoCellarSubtitle", "Manage your blends")}</p>
              </div>
              <div className="flex gap-1">
                <a href={createPageUrl("Tobacco")} className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 transition-colors" aria-label={t("common.refresh", "Refresh")}>
                  <RefreshCw className="w-4 h-4" />
                </a>
                <a href={createPageUrl("Tobacco")} className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 transition-colors" aria-label={t("common.view", "View")}>
                  <Leaf className="w-4 h-4" />
                </a>
              </div>
            </div>
            <div className="flex flex-col gap-3 mt-5 flex-1">
              <a href={createPageUrl("Tobacco")} className="bg-white/10 rounded-xl px-4 py-3 hover:bg-white/20 transition-colors block">
                <div className="text-3xl font-bold">{blends.length}</div>
                <div className="text-sm opacity-60 mt-0.5">{t("home.tobaccoBlends", "Tobacco Blends")}</div>
              </a>
              <a href={createPageUrl("Tobacco")} className="bg-white/10 rounded-xl px-4 py-3 hover:bg-white/20 transition-colors block">
                <div className="text-3xl font-bold">{formatWeight(totalCellaredOz, 'oz')}</div>
                <div className="text-sm opacity-60 mt-0.5">{t("home.cellared", "Cellared")}</div>
              </a>
              <a href={createPageUrl("Tobacco")} className="bg-white/10 rounded-xl px-4 py-3 hover:bg-white/20 transition-colors block">
                <div className="text-3xl font-bold">≈ {formatCurrency(Math.round(totalTobaccoValue))}</div>
                <div className="text-sm opacity-60 mt-0.5">{t("home.collectionValue", "Collection Value")}</div>
              </a>
            </div>
            <div className="mt-5 pt-4 border-t border-white/20 flex items-center justify-between">
              <a href={createPageUrl("Tobacco")} className="text-[#F5F1E7] font-medium hover:underline text-sm">
                {t("home.viewCellar", "View Cellar")}
              </a>
              <span className="opacity-60">→</span>
            </div>
          </div>
        </div>
      </div>

      {/* 4. FAVORITES SECTION */}
      {favoritePipes.length + favoriteBlends.length > 0 && (
        <PKCard className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <Heart className="w-5 h-5 text-red-500 fill-red-500" />
            <h2 className="text-xl font-semibold">{t("home.favorites", "Favorites")}</h2>
          </div>
          <div className="flex flex-wrap gap-2">
            {favoritePipes.map(item => (
              <span key={item.id} className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-[#1e3347] text-[#E0D8C8] text-sm border border-[#E0D8C8]/20">
                <PipeShapeIcon shape={item.shape} className="w-3 h-3" />
                {item.name}
              </span>
            ))}
            {favoriteBlends.map(item => (
              <span key={item.id} className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-[#1e3347] text-[#E0D8C8] text-sm border border-[#E0D8C8]/20">
                <Leaf className="w-3 h-3" />
                {item.name}
              </span>
            ))}
          </div>
        </PKCard>
      )}

      {/* 5. COLLECTION INSIGHTS PANEL */}
      <CollectionInsightsPanel pipes={pipes} blends={blends} user={user} />

      {/* 6. EXPERT TOBACCONIST */}
      <ExpertTobacconist pipes={pipes} blends={blends} isPaidUser={hasPaid} user={user} userProfile={userProfile} />

      {/* 7. RECENT PIPES & RECENT TOBACCO */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Recent Pipes */}
        <PKCard className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">{t("home.recentPipes", "Recent Pipes")}</h2>
            <a href={createPageUrl("Pipes")} className="text-sm text-[#E0D8C8]/70 hover:text-[#E0D8C8]">
              {t("home.viewAll", "View All")} →
            </a>
          </div>
          <div className="space-y-3">
            {pipes.slice(0, 4).map(p => (
              <a key={p.id} href={createPageUrl(`PipeDetail?id=${encodeURIComponent(p.id)}`)} className="flex items-center gap-3 hover:bg-white/5 rounded-lg p-1.5 -mx-1.5 transition-colors">
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
                  <span className="text-green-400 text-sm font-medium shrink-0">{formatCurrency(p.estimated_value)}</span>
                )}
              </a>
            ))}
          </div>
        </PKCard>

        {/* Recent Tobacco */}
        <PKCard className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">{t("home.recentTobacco", "Recent Tobacco")}</h2>
            <a href={createPageUrl("Tobacco")} className="text-sm text-[#E0D8C8]/70 hover:text-[#E0D8C8]">
              {t("home.viewAll", "View All")} →
            </a>
          </div>
          <div className="space-y-3">
            {blends.slice(0, 4).map(b => (
              <a key={b.id} href={createPageUrl(`TobaccoDetail?id=${encodeURIComponent(b.id)}`)} className="flex items-center gap-3 hover:bg-white/5 rounded-lg p-1.5 -mx-1.5 transition-colors">
                <div className="w-12 h-12 rounded-full bg-[#1E2F43] overflow-hidden shrink-0 flex items-center justify-center">
                  {(b.logo || b.photo) ? (
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

      {/* 8. BULK IMPORT FOOTER */}
      <a href={createPageUrl("Import")} className="block">
        <PKCard className="p-4 flex items-center gap-4 hover:bg-[#2a3f57] transition-colors cursor-pointer">
          <Sparkles className="w-8 h-8 text-amber-400 shrink-0" />
          <div className="flex-1">
            <div className="font-semibold">{t("home.bulkImport", "Bulk Import")}</div>
            <div className="text-sm opacity-70">{t("home.importDesc", "Import pipes & tobacco from CSV")}</div>
          </div>
          <ArrowRight className="w-5 h-5 opacity-50 shrink-0" />
        </PKCard>
      </a>
    </div>
  );
}