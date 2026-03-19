import React, { useMemo } from 'react';
import { Wine, BarChart3, Flame, Trophy, Gauge, MapPin } from 'lucide-react';
import { useTranslation } from '@/components/i18n/safeTranslation';

export default function BottleInsights({ bottles = [], tastingLogs = [] }) {
  const { t } = useTranslation();

  const insights = useMemo(() => {
    const safeBottles = Array.isArray(bottles) ? bottles : [];
    const safeLogs = Array.isArray(tastingLogs) ? tastingLogs : [];

    if (safeBottles.length === 0) {
      return {
        totalBottles: 0,
        totalCollected: 0,
        regionBreakdown: [],
        typeBreakdown: [],
        avgAge: 0,
        favoriteDistillery: null,
        highestRated: null,
        logsCount: safeLogs.length,
      };
    }

    // Total bottles
    const totalBottles = safeBottles.length;
    const totalCollected = safeBottles.reduce((sum, b) => sum + (Number(b.bottle_count) || 1), 0);

    // Region breakdown
    const regionMap = {};
    safeBottles.forEach((b) => {
      const region = b.region || 'Unknown';
      regionMap[region] = (regionMap[region] || 0) + 1;
    });
    const regionBreakdown = Object.entries(regionMap)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([region, count]) => ({ region, count }));

    // Type breakdown
    const typeMap = {};
    safeBottles.forEach((b) => {
      const type = b.type || 'Other';
      typeMap[type] = (typeMap[type] || 0) + 1;
    });
    const typeBreakdown = Object.entries(typeMap)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([type, count]) => ({ type, count }));

    // Average age
    const bottlesWithAge = safeBottles.filter((b) => b.age);
    const avgAge =
      bottlesWithAge.length > 0
        ? (bottlesWithAge.reduce((sum, b) => sum + Number(b.age), 0) / bottlesWithAge.length).toFixed(1)
        : 0;

    // Favorite distillery
    const distilleryMap = {};
    safeBottles.forEach((b) => {
      if (b.distillery) {
        distilleryMap[b.distillery] = (distilleryMap[b.distillery] || 0) + 1;
      }
    });
    const favoriteDistillery = Object.entries(distilleryMap).sort((a, b) => b[1] - a[1])[0];

    // Highest rated bottle
    const ratedBottles = safeBottles.filter((b) => b.rating);
    const highestRated = ratedBottles.length > 0
      ? ratedBottles.sort((a, b) => Number(b.rating) - Number(a.rating))[0]
      : null;

    return {
      totalBottles,
      totalCollected,
      regionBreakdown,
      typeBreakdown,
      avgAge,
      favoriteDistillery: favoriteDistillery ? favoriteDistillery[0] : null,
      highestRated,
      logsCount: safeLogs.length,
    };
  }, [bottles, tastingLogs]);

  const StatCard = ({ icon: Icon, label, value, accent = '#A35C5C' }) => (
     <div
       className="rounded-xl p-4"
       style={{
         background: `rgba(163, 92, 92, 0.1)`,
         border: `1px solid ${accent}40`,
       }}
     >
       <div className="flex items-center gap-2 mb-2">
         <Icon className="w-4 h-4" style={{ color: accent }} />
         <p className="text-xs uppercase tracking-wider font-semibold" style={{ color: 'rgba(224,216,200,0.8)' }}>
           {label}
         </p>
       </div>
       <p style={{ color: '#F5F1E7' }} className="text-2xl font-bold">
         {value || '—'}
       </p>
     </div>
   );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="relative">
        <div className="flex items-center gap-3 mb-2">
          <div
            className="w-11 h-11 rounded-xl flex items-center justify-center"
            style={{
              background: 'linear-gradient(135deg, rgba(100, 70, 45, 0.45), rgba(80, 55, 35, 0.55))',
              border: '1px solid rgba(120, 90, 65, 0.45)',
            }}
          >
            <Wine className="w-5 h-5" style={{ color: 'rgba(180, 140, 75, 1)' }} />
          </div>
          <h2
            className="text-2xl font-bold tracking-tight"
            style={{
              color: '#F5F1E7',
              fontFamily: "'Georgia', serif",
            }}
          >
            Whiskey Insights
          </h2>
        </div>
      </div>

      {/* Top Stats Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <StatCard icon={Wine} label="Bottles" value={insights.totalBottles} accent="#A35C5C" />
        <StatCard icon={BarChart3} label="Collected" value={insights.totalCollected} accent="#C87941" />
        <StatCard icon={Flame} label="Tastings" value={insights.logsCount} accent="#D4AF37" />
      </div>

      {/* Detailed Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Average Age */}
        <div
          className="rounded-xl p-4"
          style={{
            background: 'rgba(180, 140, 75, 0.1)',
            border: '1px solid rgba(180, 140, 75, 0.2)',
          }}
        >
          <div className="flex items-center gap-2 mb-2">
            <Gauge className="w-4 h-4" style={{ color: '#B48C4B' }} />
            <p className="text-xs uppercase tracking-wider" style={{ color: 'rgba(224,216,200,0.6)' }}>
              Avg Age
            </p>
          </div>
          <p style={{ color: '#F5F1E7' }} className="text-2xl font-bold">
            {insights.avgAge}y
          </p>
        </div>

        {/* Favorite Distillery */}
          <div
            className="rounded-xl p-4"
            style={{
              background: 'rgba(100, 80, 60, 0.1)',
              border: '1px solid rgba(100, 80, 60, 0.3)',
            }}
          >
            <div className="flex items-center gap-2 mb-2">
              <Trophy className="w-4 h-4" style={{ color: '#C87941' }} />
              <p className="text-xs uppercase tracking-wider font-semibold" style={{ color: 'rgba(224,216,200,0.8)' }}>
                Top Distillery
              </p>
            </div>
            <p style={{ color: '#F5F1E7' }} className="text-lg font-semibold break-words">
              {insights.favoriteDistillery || '—'}
            </p>
          </div>
      </div>

      {/* Highest Rated */}
      {insights.highestRated && (
        <div
          className="rounded-xl p-4"
          style={{
            background: 'linear-gradient(135deg, rgba(212, 175, 55, 0.1), rgba(180, 140, 75, 0.05))',
            border: '1px solid rgba(212, 175, 55, 0.3)',
          }}
        >
          <div className="flex items-center gap-2 mb-2">
            <Trophy className="w-4 h-4" style={{ color: '#D4AF37' }} />
            <p className="text-xs uppercase tracking-wider font-semibold" style={{ color: 'rgba(224,216,200,0.8)' }}>
              Highest Rated
            </p>
          </div>
          <p style={{ color: '#F5F1E7' }} className="text-lg font-semibold break-words">
            {insights.highestRated.name}
          </p>
          <p style={{ color: 'rgba(200,160,100,0.95)' }} className="text-sm mt-1">
            Rating: {insights.highestRated.rating?.toFixed(1)} / 5
          </p>
        </div>
      )}

      {/* Region Breakdown */}
      {insights.regionBreakdown.length > 0 && (
        <div className="space-y-2">
          <h3 style={{ color: 'rgba(180,140,75,0.9)' }} className="text-xs uppercase tracking-wider font-semibold">
            Top Regions
          </h3>
          <div className="space-y-2">
            {insights.regionBreakdown.map(({ region, count }) => (
              <div key={region} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <MapPin className="w-3 h-3" style={{ color: 'rgba(180,140,75,0.7)' }} />
                  <span style={{ color: '#F5F1E7' }}>{region}</span>
                </div>
                <span style={{ color: 'rgba(180,140,75,0.8)' }} className="text-sm font-semibold">
                  {count}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Type Breakdown */}
      {insights.typeBreakdown.length > 0 && (
        <div className="space-y-2">
          <h3 style={{ color: 'rgba(180,140,75,0.9)' }} className="text-xs uppercase tracking-wider font-semibold">
            Top Types
          </h3>
          <div className="space-y-2">
            {insights.typeBreakdown.map(({ type, count }) => (
              <div key={type} className="flex items-center justify-between">
                <span style={{ color: '#F5F1E7' }}>{type}</span>
                <span style={{ color: 'rgba(180,140,75,0.8)' }} className="text-sm font-semibold">
                  {count}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}