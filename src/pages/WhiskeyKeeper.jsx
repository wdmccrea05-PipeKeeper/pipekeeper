import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from '@/components/i18n/safeTranslation';
import { useCurrentUser } from '@/components/hooks/useCurrentUser';
import { Button } from '@/components/ui/button';
import { Wine, BookOpen, TrendingUp, BarChart3, Sparkles, ArrowRight, Heart } from 'lucide-react';
import { createPageUrl } from '@/components/utils/createPageUrl';
import { base44 } from '@/api/base44Client';
import { formatCurrency } from '@/components/utils/localeFormatters';
import CatalogPlate from '@/components/home/CatalogPlate';

export default function WhiskeyKeeper() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user } = useCurrentUser();

  // Module navigation items
  const moduleNavigation = [
    { name: t('nav.bottles') || 'Bottles', path: '/Whiskey', icon: Wine },
    { name: t('nav.tastingNotes') || 'Tastings', path: '/Tastings', icon: BookOpen },
    { name: t('nav.insights') || 'Insights', path: '/WhiskeyInsights', icon: TrendingUp },
    { name: t('nav.analytics') || 'Analytics', path: '/WhiskeyAnalytics', icon: BarChart3 },
  ];

  // Fetch bottles
  const { data: bottles = [] } = useQuery({
    queryKey: ['bottles-summary', user?.email],
    queryFn: async () => {
      const result = await base44.entities.Bottle.filter({ created_by: user?.email });
      return Array.isArray(result) ? result : [];
    },
    enabled: !!user?.email,
    staleTime: 10000,
  });

  // Fetch tasting logs
  const { data: tastingLogs = [] } = useQuery({
    queryKey: ['tasting-logs-summary', user?.email],
    queryFn: async () => {
      const result = await base44.entities.TastingLog.filter({ created_by: user?.email }, '-tasting_date', 100);
      return Array.isArray(result) ? result : [];
    },
    enabled: !!user?.email,
    staleTime: 10000,
  });

  // Calculate summary metrics
  const totalBottleValue = useMemo(() => {
    return bottles.reduce((sum, b) => {
      const val = Number(b?.purchase_price) || 0;
      return sum + (Number.isFinite(val) ? val : 0);
    }, 0);
  }, [bottles]);

  const openBottles = useMemo(() => bottles.filter(b => b?.fill_level && b.fill_level !== 'Empty'), [bottles]);
  const unOpenedBottles = useMemo(() => bottles.filter(b => !b?.opened_date), [bottles]);
  const favoriteBottles = useMemo(() => bottles.filter(b => b?.favorite), [bottles]);

  // Highest rated bottle
  const highestRatedBottle = useMemo(() => {
    const withRating = bottles.filter(b => b?.rating && b.rating > 0);
    if (!withRating.length) return null;
    return withRating.sort((a, b) => (Number(b.rating) || 0) - (Number(a.rating) || 0))[0] || null;
  }, [bottles]);

  // Most valuable bottle
  const mostValuableBottle = useMemo(() => {
    const withValue = bottles.filter(b => (Number(b?.purchase_price) || 0) > 0);
    if (!withValue.length) return null;
    return withValue.sort((a, b) => (Number(b.purchase_price) || 0) - (Number(a.purchase_price) || 0))[0] || null;
  }, [bottles]);

  // Recent tasting
  const recentTasting = useMemo(() => tastingLogs[0] || null, [tastingLogs]);

  return (
    <div className="space-y-8">
      {/* 1. HERO SECTION */}
      <div className="space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div
                className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
                style={{
                  background: 'linear-gradient(135deg, rgba(100, 70, 45, 0.45), rgba(80, 55, 35, 0.55))',
                  border: '1px solid rgba(120, 90, 65, 0.45)',
                  boxShadow: '0 3px 8px rgba(0,0,0,0.5), inset 0 1px 0 rgba(180, 140, 100, 0.2)',
                }}
              >
                <Wine
                  className="w-5 h-5"
                  style={{
                    color: 'rgba(180, 140, 75, 1)',
                    filter: 'drop-shadow(0 0 4px rgba(180,140,75,0.7))',
                  }}
                />
              </div>
              <h1
                className="text-4xl font-bold tracking-tight"
                style={{
                  color: '#F5F1E7',
                  fontFamily: "'Georgia', serif",
                  textShadow: '0 2px 6px rgba(0,0,0,0.7)',
                }}
              >
                {t('whiskeykeeper.title') || 'WhiskeyKeeper'}
              </h1>
            </div>
            <p
              className="text-base pl-14"
              style={{ color: 'rgba(224, 216, 200, 0.75)' }}
            >
              {t('whiskeykeeper.description') || 'Track your whiskey collection and tastings'}
            </p>
          </div>
          <Button
            onClick={() => navigate('/CollectionHub')}
            variant="outline"
            className="text-sm"
          >
            {t('common.backToHub') || 'Back to Hub'}
          </Button>
        </div>
      </div>

      {/* 2. COLLECTION SUMMARY CARDS */}
      <div
        className="rounded-lg p-5"
        style={{
          background: 'linear-gradient(135deg, rgba(42, 30, 20, 0.7), rgba(35, 24, 16, 0.85))',
          border: '1px solid rgba(120, 90, 65, 0.3)',
          boxShadow: '0 2px 8px rgba(0,0,0,0.5), inset 0 1px 0 rgba(180,140,100,0.08)'
        }}
      >
        <h2
          className="text-sm uppercase tracking-[0.12em] font-semibold mb-4"
          style={{ color: 'rgba(180, 140, 75, 0.8)' }}
        >
          {t('home.collectionSummary') || 'Collection Summary'}
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="space-y-2">
            <p className="text-xs uppercase tracking-wider" style={{ color: 'rgba(180, 140, 75, 0.6)' }}>
              {t('whiskeykeeper.totalValue') || 'Total Value'}
            </p>
            <p className="text-2xl font-bold" style={{ color: '#D4A574' }}>
              {formatCurrency(Math.round(totalBottleValue))}
            </p>
          </div>
          <div className="space-y-2">
            <p className="text-xs uppercase tracking-wider" style={{ color: 'rgba(180, 140, 75, 0.6)' }}>
              {t('whiskeykeeper.bottlesInCollection') || 'Bottles'}
            </p>
            <p className="text-2xl font-bold" style={{ color: '#B48C4B' }}>
              {bottles.length}
            </p>
          </div>
          <div className="space-y-2">
            <p className="text-xs uppercase tracking-wider" style={{ color: 'rgba(180, 140, 75, 0.6)' }}>
              {t('whiskeykeeper.unopened') || 'Unopened'}
            </p>
            <p className="text-2xl font-bold" style={{ color: '#8B7355' }}>
              {unOpenedBottles.length}
            </p>
          </div>
          <div className="space-y-2">
            <p className="text-xs uppercase tracking-wider" style={{ color: 'rgba(180, 140, 75, 0.6)' }}>
              {t('whiskeykeeper.openBottles') || 'Open'}
            </p>
            <p className="text-2xl font-bold" style={{ color: '#A35C5C' }}>
              {openBottles.length}
            </p>
          </div>
        </div>
      </div>

      {/* 3. COLLECTION HIGHLIGHTS */}
      {(highestRatedBottle || mostValuableBottle || recentTasting) && (
        <div>
          <h2
            className="text-sm uppercase tracking-[0.12em] font-semibold mb-4"
            style={{ color: 'rgba(180, 140, 75, 0.8)' }}
          >
            {t('home.highlights') || 'Collection Highlights'}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {highestRatedBottle && (
              <CatalogPlate
                title={t('whiskeykeeper.highestRated') || 'Highest Rated'}
                value={`${highestRatedBottle.rating || 0}/5`}
                subtitle={highestRatedBottle.name}
                heroImage={highestRatedBottle.photo}
                bgImage={highestRatedBottle.photo}
                accent="#D4AF37"
                onClick={() => navigate('/Whiskey')}
              />
            )}
            {mostValuableBottle && (
              <CatalogPlate
                title={t('home.mostValuable') || 'Most Valuable'}
                value={formatCurrency(mostValuableBottle.purchase_price)}
                subtitle={mostValuableBottle.name}
                heroImage={mostValuableBottle.photo}
                bgImage={mostValuableBottle.photo}
                accent="#B4824B"
                onClick={() => navigate('/Whiskey')}
              />
            )}
            {recentTasting && (
              <CatalogPlate
                title={t('whiskeykeeper.recentTasting') || 'Recent Tasting'}
                value={recentTasting.bottle_name}
                subtitle={new Date(recentTasting.tasting_date).toLocaleDateString()}
                heroImage={null}
                bgImage={null}
                accent="#8B6A47"
                onClick={() => navigate('/Whiskey')}
              />
            )}
          </div>
        </div>
      )}

      {/* 4. QUICK ACTIONS */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <button
          onClick={() => navigate('/Whiskey')}
          className="p-4 rounded-xl text-left transition-all duration-300"
          style={{
            background: 'linear-gradient(135deg, rgba(42, 31, 24, 0.6), rgba(31, 21, 16, 0.8))',
            border: '1px solid rgba(180, 140, 75, 0.2)',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = 'rgba(212, 165, 116, 0.6)';
            e.currentTarget.style.boxShadow = '0 8px 24px rgba(180, 140, 75, 0.15)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = 'rgba(180, 140, 75, 0.2)';
            e.currentTarget.style.boxShadow = 'none';
          }}
        >
          <Wine className="w-5 h-5 mb-2" style={{ color: '#D4A574' }} />
          <p className="text-sm font-semibold text-[#E0D8C8]">{t('whiskeykeeper.addBottle') || 'Add Bottle'}</p>
          <p className="text-xs text-[#E0D8C8]/60 mt-1">{t('whiskeykeeper.expandCollection') || 'Expand your collection'}</p>
        </button>

        <button
          onClick={() => navigate('/Whiskey')}
          className="p-4 rounded-xl text-left transition-all duration-300"
          style={{
            background: 'linear-gradient(135deg, rgba(42, 31, 24, 0.6), rgba(31, 21, 16, 0.8))',
            border: '1px solid rgba(180, 140, 75, 0.2)',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = 'rgba(212, 165, 116, 0.6)';
            e.currentTarget.style.boxShadow = '0 8px 24px rgba(180, 140, 75, 0.15)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = 'rgba(180, 140, 75, 0.2)';
            e.currentTarget.style.boxShadow = 'none';
          }}
        >
          <BookOpen className="w-5 h-5 mb-2" style={{ color: '#C87941' }} />
          <p className="text-sm font-semibold text-[#E0D8C8]">{t('whiskeykeeper.logTasting') || 'Log Tasting'}</p>
          <p className="text-xs text-[#E0D8C8]/60 mt-1">{t('whiskeykeeper.recordNotes') || 'Record tasting notes'}</p>
        </button>

        <button
          onClick={() => navigate('/Curator')}
          className="p-4 rounded-xl text-left transition-all duration-300"
          style={{
            background: 'linear-gradient(135deg, rgba(42, 31, 24, 0.6), rgba(31, 21, 16, 0.8))',
            border: '1px solid rgba(180, 140, 75, 0.2)',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = 'rgba(212, 165, 116, 0.6)';
            e.currentTarget.style.boxShadow = '0 8px 24px rgba(180, 140, 75, 0.15)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = 'rgba(180, 140, 75, 0.2)';
            e.currentTarget.style.boxShadow = 'none';
          }}
        >
          <Sparkles className="w-5 h-5 mb-2" style={{ color: '#D4AF37' }} />
          <p className="text-sm font-semibold text-[#E0D8C8]">{t('whiskeykeeper.openCurator') || 'Open Curator'}</p>
          <p className="text-xs text-[#E0D8C8]/60 mt-1">{t('whiskeykeeper.getInsights') || 'Get recommendations'}</p>
        </button>

        <button
          onClick={() => navigate('/CollectionInsightsShare')}
          className="p-4 rounded-xl text-left transition-all duration-300"
          style={{
            background: 'linear-gradient(135deg, rgba(42, 31, 24, 0.6), rgba(31, 21, 16, 0.8))',
            border: '1px solid rgba(180, 140, 75, 0.2)',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = 'rgba(212, 165, 116, 0.6)';
            e.currentTarget.style.boxShadow = '0 8px 24px rgba(180, 140, 75, 0.15)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = 'rgba(180, 140, 75, 0.2)';
            e.currentTarget.style.boxShadow = 'none';
          }}
        >
          <TrendingUp className="w-5 h-5 mb-2" style={{ color: '#5A7C5A' }} />
          <p className="text-sm font-semibold text-[#E0D8C8]">{t('whiskeykeeper.viewInsights') || 'View Insights'}</p>
          <p className="text-xs text-[#E0D8C8]/60 mt-1">{t('whiskeykeeper.collectionAnalytics') || 'Collection analytics'}</p>
        </button>
      </div>

      {/* 5. FAVORITES */}
      {favoriteBottles.length > 0 && (
        <div
          className="rounded-lg p-5"
          style={{
            background: 'linear-gradient(145deg, rgba(50, 35, 22, 0.68), rgba(38, 26, 18, 0.82))',
            border: '1px solid rgba(120, 90, 65, 0.28)',
            boxShadow: '0 2px 8px rgba(0,0,0,0.45), inset 0 1px 0 rgba(180,140,100,0.09)'
          }}
        >
          <div className="flex items-center gap-2 mb-5">
            <Heart className="w-4 h-4 fill-current" style={{ color: '#9B6B5F' }} />
            <h2
              className="text-base font-semibold"
              style={{ color: '#F5F1E7', fontFamily: "'Georgia', serif" }}
            >
              {t('home.favorites') || 'Favorite Bottles'}
            </h2>
          </div>
          <div className="flex flex-wrap gap-2">
            {favoriteBottles.map((item) => (
              <span
                key={item.id}
                className="inline-flex items-center gap-1 px-3 py-1.5 text-sm"
                style={{
                  background: 'linear-gradient(135deg, rgba(60, 42, 28, 0.6), rgba(50, 35, 25, 0.7))',
                  border: '1px solid rgba(120, 90, 65, 0.25)',
                  borderRadius: '0.375rem',
                  color: '#F5F1E7',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.3)'
                }}
              >
                <Wine className="w-3.5 h-3.5" style={{ color: 'rgba(212, 165, 116, 0.9)' }} />
                {item.name}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* 6. MODULE NAVIGATION */}
      <div>
        <h2
          className="text-sm uppercase tracking-[0.12em] font-semibold mb-4"
          style={{ color: 'rgba(180, 140, 75, 0.8)' }}
        >
          {t('whiskeykeeper.explore') || 'Explore'}
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {moduleNavigation.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                className="p-6 rounded-2xl text-left transition-all duration-300"
                style={{
                  background: 'linear-gradient(135deg, rgba(42, 31, 24, 0.6), rgba(31, 21, 16, 0.8))',
                  border: '1px solid rgba(180, 140, 75, 0.2)',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = 'rgba(212, 165, 116, 0.6)';
                  e.currentTarget.style.boxShadow = '0 8px 24px rgba(180, 140, 75, 0.15)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = 'rgba(180, 140, 75, 0.2)';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              >
                <div className="flex items-center gap-3 mb-3">
                  <div
                    className="w-10 h-10 rounded-lg flex items-center justify-center"
                    style={{
                      background: 'rgba(212, 165, 116, 0.15)',
                    }}
                  >
                    <Icon className="w-5 h-5" style={{ color: '#D4A574' }} />
                  </div>
                  <h3 className="text-lg font-semibold text-[#E0D8C8]">{item.name}</h3>
                </div>
                <p className="text-sm text-[#E0D8C8]/60">
                  {t(`whiskeykeeper.${item.path.slice(1).toLowerCase()}Desc`) || t('whiskeykeeper.explore')}
                </p>
              </button>
            );
          })}
        </div>
      </div>

      {/* 7. RECENT ACTIVITY */}
      {tastingLogs.length > 0 && (
        <a href={createPageUrl('Whiskey')} className="block">
          <div
            className="p-5 flex items-center gap-4 rounded-lg transition-all hover:scale-[1.01]"
            style={{
              background: 'linear-gradient(145deg, rgba(52, 37, 24, 0.7), rgba(40, 28, 18, 0.84))',
              border: '1px solid rgba(120, 90, 65, 0.3)',
              boxShadow: '0 2px 10px rgba(0,0,0,0.5), inset 0 1px 0 rgba(180,140,100,0.1)'
            }}
          >
            <BookOpen className="w-5 h-5 shrink-0" style={{ color: 'rgba(180, 140, 75, 0.85)' }} aria-hidden="true" />
            <div className="flex-1 min-w-0">
              <div className="font-medium text-sm" style={{ color: '#F5F1E7' }}>
                {t('whiskeykeeper.recentActivity') || 'Recent Activity'}
              </div>
              <div className="text-xs mt-0.5" style={{ color: 'rgba(224, 216, 200, 0.6)' }}>
                {tastingLogs.length} {t('whiskeykeeper.tastingsLogged') || 'tastings logged'}
              </div>
            </div>
            <ArrowRight className="w-3.5 h-3.5 shrink-0" style={{ color: 'rgba(180, 140, 75, 0.6)' }} />
          </div>
        </a>
      )}
    </div>
  );
}