import React, { useMemo } from 'react';
import { useTranslation } from '@/components/i18n/safeTranslation';
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LineChart,
  Line,
} from 'recharts';
import { formatCurrency } from '@/components/utils/localeFormatters';
import { subMonths, parseISO, format, differenceInCalendarMonths } from 'date-fns';

/**
 * WhiskeyInsightsAnalytics
 * Analytics & charts for whiskey collection insights
 * Adapted from PipeKeeper Insights pattern
 */

export function getBottleTypeDistribution(bottles) {
  const types = {};
  bottles.forEach((b) => {
    const type = b.type || 'Other';
    types[type] = (types[type] || 0) + 1;
  });
  return Object.entries(types).map(([name, value]) => ({ name, value }));
}

export function getCountryDistribution(bottles) {
  const countries = {};
  bottles.forEach((b) => {
    const country = b.country || 'Unknown';
    countries[country] = (countries[country] || 0) + 1;
  });
  return Object.entries(countries)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 8);
}

export function getCollectionValue(bottles) {
  return {
    retail: bottles.reduce((sum, b) => sum + (Number(b.retail_price) || 0), 0),
    aftermarket: bottles.reduce((sum, b) => sum + (Number(b.aftermarket_price) || 0), 0),
    collector: bottles.reduce((sum, b) => sum + (Number(b.collector_value) || 0), 0),
  };
}

export function getTastingTrends(tastingLogs, bottles) {
  if (!tastingLogs.length) return [];

  const now = new Date();
  const months = [];

  // Last 12 months of data
  for (let i = 11; i >= 0; i--) {
    const monthDate = subMonths(now, i);
    const monthStr = format(monthDate, 'MMM yyyy');
    const monthNum = format(monthDate, 'yyyy-MM');

    const count = tastingLogs.filter((log) => {
      try {
        const logDate = log.tasting_date || log.date;
        return logDate ? logDate.startsWith(monthNum) : false;
      } catch {
        return false;
      }
    }).length;

    months.push({ month: monthStr, tastings: count });
  }

  return months;
}

export function getPurchaseTrends(bottles) {
  if (!bottles.length) return [];

  const now = new Date();
  const months = [];

  for (let i = 11; i >= 0; i--) {
    const monthDate = subMonths(now, i);
    const monthStr = format(monthDate, 'MMM yyyy');
    const monthNum = format(monthDate, 'yyyy-MM');

    const count = bottles.filter((b) => {
      try {
        return b.purchase_date && b.purchase_date.startsWith(monthNum) ? 1 : 0;
      } catch {
        return false;
      }
    }).length;

    months.push({ month: monthStr, purchases: count });
  }

  return months;
}

export function getRatingTrends(bottles) {
  const rated = bottles.filter((b) => b.rating);
  if (!rated.length) return [];

  // Average rating by country (top 8)
  const byCountry = {};
  rated.forEach((b) => {
    const country = b.country || 'Unknown';
    if (!byCountry[country]) byCountry[country] = [];
    byCountry[country].push(Number(b.rating));
  });

  return Object.entries(byCountry)
    .map(([country, ratings]) => ({
      country,
      avgRating: (ratings.reduce((a, b) => a + b, 0) / ratings.length).toFixed(2),
    }))
    .sort((a, b) => b.avgRating - a.avgRating)
    .slice(0, 8);
}

export function getCollectionGrowth(bottles) {
  if (!bottles.length) return [];

  const now = new Date();
  const months = [];
  let cumulativeCount = 0;

  for (let i = 11; i >= 0; i--) {
    const monthDate = subMonths(now, i);
    const monthStr = format(monthDate, 'MMM yyyy');
    const monthNum = format(monthDate, 'yyyy-MM');

    const addedThisMonth = bottles.filter((b) => {
      try {
        return b.purchase_date && b.purchase_date.startsWith(monthNum) ? 1 : 0;
      } catch {
        return false;
      }
    }).length;

    cumulativeCount += addedThisMonth;
    months.push({ month: monthStr, bottles: cumulativeCount });
  }

  return months;
}

const COLORS = ['#C87941', '#10B981', '#3B82F6', '#8B5CF6', '#F59E0B', '#EF4444', '#06B6D4', '#EC4899'];

export function WhiskeyAnalyticsTab({ bottles, tastingLogs }) {
  const { t } = useTranslation();

  const typeDistribution = useMemo(() => getBottleTypeDistribution(bottles), [bottles]);
  const countryDistribution = useMemo(() => getCountryDistribution(bottles), [bottles]);
  const collectionValue = useMemo(() => getCollectionValue(bottles), [bottles]);
  const tastingTrends = useMemo(() => getTastingTrends(tastingLogs, bottles), [tastingLogs, bottles]);
  const purchaseTrends = useMemo(() => getPurchaseTrends(bottles), [bottles]);
  const ratingTrends = useMemo(() => getRatingTrends(bottles), [bottles]);
  const growthTrends = useMemo(() => getCollectionGrowth(bottles), [bottles]);

  return (
    <div className="space-y-8">
      {/* Type Distribution */}
      <div className="rounded-2xl p-6" style={{
        background: 'linear-gradient(135deg, rgba(42, 31, 24, 0.5), rgba(31, 21, 16, 0.5))',
        border: '1px solid rgba(180, 140, 75, 0.15)',
      }}>
        <h3 className="text-lg font-semibold mb-4" style={{ color: '#F5F1E7' }}>
          {t('whiskeykeeper.bottleTypeDistribution', 'Bottle Type Distribution')}
        </h3>
        <ResponsiveContainer width="100%" height={360}>
          <PieChart>
            <Pie
              data={typeDistribution}
              cx="38%"
              cy="50%"
              outerRadius={96}
              innerRadius={30}
              paddingAngle={2}
              labelLine={false}
              dataKey="value"
            >
              {typeDistribution.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{
                background: 'rgba(28,18,10,0.95)',
                border: '1px solid rgba(180,140,75,0.3)',
                color: '#F5F1E7',
              }}
            />
            <Legend
              layout="vertical"
              align="right"
              verticalAlign="middle"
              wrapperStyle={{
                color: '#E0D8C8',
                fontSize: 12,
                lineHeight: '18px',
                paddingLeft: 12,
              }}
              formatter={(value) => <span style={{ color: '#E0D8C8' }}>{value}</span>}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>

      {/* Country Distribution */}
      <div className="rounded-2xl p-6" style={{
        background: 'linear-gradient(135deg, rgba(42, 31, 24, 0.5), rgba(31, 21, 16, 0.5))',
        border: '1px solid rgba(180, 140, 75, 0.15)',
      }}>
        <h3 className="text-lg font-semibold mb-4" style={{ color: '#F5F1E7' }}>
          {t('whiskeykeeper.countryDistribution', 'Country Distribution')}
        </h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={countryDistribution}>
            <CartesianGrid stroke="rgba(180,140,75,0.15)" />
            <XAxis dataKey="name" tick={{ fill: 'rgba(224,216,200,0.7)', fontSize: 12 }} />
            <YAxis tick={{ fill: 'rgba(224,216,200,0.7)', fontSize: 12 }} />
            <Tooltip 
              contentStyle={{ background: 'rgba(28,18,10,0.95)', border: '1px solid rgba(180,140,75,0.3)' }}
              labelStyle={{ color: '#F5F1E7' }}
            />
            <Bar dataKey="value" fill="#C87941" radius={[8, 8, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Collection Value Breakdown */}
      <div className="rounded-2xl p-6" style={{
        background: 'linear-gradient(135deg, rgba(42, 31, 24, 0.5), rgba(31, 21, 16, 0.5))',
        border: '1px solid rgba(180, 140, 75, 0.15)',
      }}>
        <h3 className="text-lg font-semibold mb-4" style={{ color: '#F5F1E7' }}>
          {t('whiskeykeeper.collectionValueBreakdown', 'Collection Value Breakdown')}
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-4 rounded-lg" style={{ background: 'rgba(180,140,75,0.08)', border: '1px solid rgba(180,140,75,0.15)' }}>
            <p className="text-sm" style={{ color: 'rgba(224,216,200,0.7)' }}>Retail Value</p>
            <p className="text-2xl font-bold" style={{ color: '#F5F1E7' }}>
              {formatCurrency(Math.round(collectionValue.retail))}
            </p>
          </div>
          <div className="p-4 rounded-lg" style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.15)' }}>
            <p className="text-sm" style={{ color: 'rgba(224,216,200,0.7)' }}>Aftermarket Value</p>
            <p className="text-2xl font-bold" style={{ color: '#F5F1E7' }}>
              {formatCurrency(Math.round(collectionValue.aftermarket))}
            </p>
          </div>
          <div className="p-4 rounded-lg" style={{ background: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.15)' }}>
            <p className="text-sm" style={{ color: 'rgba(224,216,200,0.7)' }}>Collector Value</p>
            <p className="text-2xl font-bold" style={{ color: '#F5F1E7' }}>
              {formatCurrency(Math.round(collectionValue.collector))}
            </p>
          </div>
        </div>
      </div>

      {/* Tasting Trends */}
      {tastingTrends.length > 0 && (
        <div className="rounded-2xl p-6" style={{
          background: 'linear-gradient(135deg, rgba(42, 31, 24, 0.5), rgba(31, 21, 16, 0.5))',
          border: '1px solid rgba(180, 140, 75, 0.15)',
        }}>
          <h3 className="text-lg font-semibold mb-4" style={{ color: '#F5F1E7' }}>
            {t('whiskeykeeper.tastingTrends', 'Tasting Trends')}
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={tastingTrends}>
              <CartesianGrid stroke="rgba(180,140,75,0.15)" />
              <XAxis dataKey="month" tick={{ fill: 'rgba(224,216,200,0.7)', fontSize: 11 }} angle={-45} />
              <YAxis tick={{ fill: 'rgba(224,216,200,0.7)', fontSize: 12 }} />
              <Tooltip 
                contentStyle={{ background: 'rgba(28,18,10,0.95)', border: '1px solid rgba(180,140,75,0.3)' }}
                labelStyle={{ color: '#F5F1E7' }}
              />
              <Line type="monotone" dataKey="tastings" stroke="#C87941" strokeWidth={2} dot={{ fill: '#C87941' }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Purchase Trends */}
      {purchaseTrends.length > 0 && (
        <div className="rounded-2xl p-6" style={{
          background: 'linear-gradient(135deg, rgba(42, 31, 24, 0.5), rgba(31, 21, 16, 0.5))',
          border: '1px solid rgba(180, 140, 75, 0.15)',
        }}>
          <h3 className="text-lg font-semibold mb-4" style={{ color: '#F5F1E7' }}>
            {t('whiskeykeeper.purchaseTrends', 'Purchase Trends')}
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={purchaseTrends}>
              <CartesianGrid stroke="rgba(180,140,75,0.15)" />
              <XAxis dataKey="month" tick={{ fill: 'rgba(224,216,200,0.7)', fontSize: 11 }} angle={-45} />
              <YAxis tick={{ fill: 'rgba(224,216,200,0.7)', fontSize: 12 }} />
              <Tooltip 
                contentStyle={{ background: 'rgba(28,18,10,0.95)', border: '1px solid rgba(180,140,75,0.3)' }}
                labelStyle={{ color: '#F5F1E7' }}
              />
              <Bar dataKey="purchases" fill="#10B981" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Rating Trends */}
      {ratingTrends.length > 0 && (
        <div className="rounded-2xl p-6" style={{
          background: 'linear-gradient(135deg, rgba(42, 31, 24, 0.5), rgba(31, 21, 16, 0.5))',
          border: '1px solid rgba(180, 140, 75, 0.15)',
        }}>
          <h3 className="text-lg font-semibold mb-4" style={{ color: '#F5F1E7' }}>
            {t('whiskeykeeper.ratingTrends', 'Average Rating by Country')}
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={ratingTrends}>
              <CartesianGrid stroke="rgba(180,140,75,0.15)" />
              <XAxis dataKey="country" tick={{ fill: 'rgba(224,216,200,0.7)', fontSize: 11 }} angle={-45} />
              <YAxis tick={{ fill: 'rgba(224,216,200,0.7)', fontSize: 12 }} domain={[0, 5]} />
              <Tooltip 
                contentStyle={{ background: 'rgba(28,18,10,0.95)', border: '1px solid rgba(180,140,75,0.3)' }}
                labelStyle={{ color: '#F5F1E7' }}
              />
              <Bar dataKey="avgRating" fill="#8B5CF6" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Collection Growth */}
      {growthTrends.length > 0 && (
        <div className="rounded-2xl p-6" style={{
          background: 'linear-gradient(135deg, rgba(42, 31, 24, 0.5), rgba(31, 21, 16, 0.5))',
          border: '1px solid rgba(180, 140, 75, 0.15)',
        }}>
          <h3 className="text-lg font-semibold mb-4" style={{ color: '#F5F1E7' }}>
            {t('whiskeykeeper.collectionGrowth', 'Collection Growth')}
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={growthTrends}>
              <CartesianGrid stroke="rgba(180,140,75,0.15)" />
              <XAxis dataKey="month" tick={{ fill: 'rgba(224,216,200,0.7)', fontSize: 11 }} angle={-45} />
              <YAxis tick={{ fill: 'rgba(224,216,200,0.7)', fontSize: 12 }} />
              <Tooltip 
                contentStyle={{ background: 'rgba(28,18,10,0.95)', border: '1px solid rgba(180,140,75,0.3)' }}
                labelStyle={{ color: '#F5F1E7' }}
              />
              <Line type="monotone" dataKey="bottles" stroke="#F59E0B" strokeWidth={2} dot={{ fill: '#F59E0B' }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}