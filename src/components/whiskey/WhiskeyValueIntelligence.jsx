/**
 * WhiskeyValueIntelligence
 * Value Intelligence cards for the WhiskeyAnalytics page.
 * Consumes canonical valueEngine — NO local valuation formulas.
 */
import React, { useMemo } from 'react';
import { TrendingUp, ShieldCheck, Unlock, AlertTriangle, BarChart2, Archive } from 'lucide-react';
import {
  computeCurrentValue,
  computeReplacementDifficulty,
  computeRarityScore,
  DIFFICULTY_LABELS,
} from '@/components/valuation/valueEngine';
import { useCurrency } from '@/lib/currency/useCurrency';
import { useTranslation } from '@/components/i18n/safeTranslation';

function getBottleCount(bottle) {
  const n = Number(bottle?.bottle_count || bottle?.total_bottles || 1);
  return Number.isFinite(n) && n > 0 ? n : 1;
}

function ValueCard({ title, icon: Icon, iconColor, borderColor, children, emptyMessage }) {
  return (
    <div className="rounded-2xl overflow-hidden min-w-0" style={{ background: 'linear-gradient(145deg, rgba(34,24,16,0.95), rgba(22,15,10,0.98))', border: `1px solid ${borderColor || 'rgba(180,140,75,0.2)'}` }}>
      <div className="px-5 py-4 border-b flex items-center gap-2.5" style={{ borderColor: borderColor || 'rgba(180,140,75,0.12)' }}>
        <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: 'rgba(0,0,0,0.2)' }}>
          <Icon className="w-4 h-4" style={{ color: iconColor || '#B48C4B' }} />
        </div>
        <p className="text-sm font-bold uppercase tracking-[0.12em]" style={{ color: iconColor || '#D4A574' }}>{title}</p>
      </div>
      <div className="px-5 py-4">
        {children || (
          <p className="text-xs text-[#D8C7A6]/50 text-center py-4">{emptyMessage || 'No data yet'}</p>
        )}
      </div>
    </div>
  );
}

function BottleRow({ bottle, value, badge, badgeColor, formatFromBase }) {
  return (
    <div className="flex items-center justify-between gap-3 py-2.5 border-b border-white/[0.04] last:border-0 min-w-0">
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-[#F5F1E7] break-words leading-tight">{bottle.name || '—'}</p>
        {bottle.distillery || bottle.region ? (
          <p className="text-xs text-[#D8C7A6]/55 mt-0.5 break-words">{[bottle.distillery, bottle.region].filter(Boolean).join(' · ')}</p>
        ) : null}
      </div>
      <div className="shrink-0 text-right">
        {value > 0 ? (
          <p className="text-sm font-bold text-[#F5F1E7] tabular-nums">{formatFromBase(value)}</p>
        ) : null}
        {badge && (
          <span className="inline-block mt-0.5 px-2 py-0.5 rounded-full text-xs font-medium" style={{ background: badgeColor?.bg || 'rgba(180,140,75,0.12)', color: badgeColor?.text || '#D4A574', border: `1px solid ${badgeColor?.border || 'rgba(180,140,75,0.22)'}` }}>
            {badge}
          </span>
        )}
      </div>
    </div>
  );
}

export default function WhiskeyValueIntelligence({ bottles = [] }) {
  const { t } = useTranslation();
  // Subscribe to currency context so the component re-renders when the user changes currency
  const { formatFromBase } = useCurrency();
  const enriched = useMemo(() => {
    if (!bottles.length) return [];
    return bottles.map(b => ({
      ...b,
      _value: computeCurrentValue(b, 'whiskeykeeper'),
      _rarity: computeRarityScore(b, 'whiskeykeeper'),
      _difficulty: computeReplacementDifficulty(b, 'whiskeykeeper'),
      _qty: getBottleCount(b),
    }));
  }, [bottles]);

  const { totalValue, topHold, safeOpen, highRisk, valueByBottle, sealedValue, openValue } = useMemo(() => {
    if (!enriched.length) {
      return { totalValue: 0, topHold: [], safeOpen: [], highRisk: [], valueByBottle: [], sealedValue: 0, openValue: 0 };
    }

    const totalValue = enriched.reduce((s, b) => s + b._value * b._qty, 0);

    // Top bottles by value
    const valueByBottle = [...enriched].sort((a, b) => b._value - a._value).slice(0, 5);

    // Top Hold: high rarity or hard to replace
    const topHold = enriched
      .filter(b => b._difficulty === 'very_hard' || b._difficulty === 'hard' || b._rarity >= 60)
      .sort((a, b) => b._rarity - a._rarity)
      .slice(0, 5);

    // Safe to Open: easy to replace, duplicates, low rarity
    const nameMap = {};
    enriched.forEach(b => { nameMap[b.name] = (nameMap[b.name] || 0) + 1; });
    const safeOpen = enriched
      .filter(b => b._difficulty === 'easy' || nameMap[b.name] > 1 || b._rarity <= 25)
      .sort((a, b) => a._rarity - b._rarity)
      .slice(0, 5);

    // High Replacement Risk
    const highRisk = enriched
      .filter(b => b._difficulty === 'very_hard' || b._difficulty === 'hard')
      .sort((a, b) => b._value - a._value)
      .slice(0, 5);

    // Sealed vs Open
    const sealedValue = enriched.filter(b => !b.fill_level || b.fill_level === 'Full' || b.fill_level === 'Sealed').reduce((s, b) => s + b._value * b._qty, 0);
    const openValue = enriched.filter(b => b.fill_level && b.fill_level !== 'Full' && b.fill_level !== 'Sealed' && b.fill_level !== 'Empty').reduce((s, b) => s + b._value * b._qty, 0);

    return { totalValue, topHold, safeOpen, highRisk, valueByBottle, sealedValue, openValue };
  }, [enriched]);

  // Value concentration: what % of value is in top 3 bottles
  const top3Value = valueByBottle.slice(0, 3).reduce((s, b) => s + b._value * b._qty, 0);
  const concentrationPct = totalValue > 0 ? Math.round((top3Value / totalValue) * 100) : 0;

  if (!enriched.length) return null;

  return (
    <div className="space-y-5">
      {/* Section Header */}
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'rgba(180,140,75,0.15)', border: '1px solid rgba(180,140,75,0.25)' }}>
          <TrendingUp className="w-4 h-4 text-[#B48C4B]" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-[#F5F1E7]">{t("auto.components_whiskey_WhiskeyValueIntelligence.value_intelligence_hpi7f9")}</h2>
          <p className="text-xs text-[#D8C7A6]/60">{t("auto.components_whiskey_WhiskeyValueIntelligence.strategic_insights_from_your_collection_qsntib")}</p>
        </div>
      </div>

      {/* Overview summary row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Total Value', val: formatFromBase(totalValue), color: '#D4A574' },
          { label: 'Top 3 Concentration', val: `${concentrationPct}%`, color: concentrationPct >= 70 ? '#f87171' : '#fbbf24' },
          { label: 'Sealed Value', val: sealedValue > 0 ? formatFromBase(sealedValue) : '—', color: '#4ade80' },
          { label: 'Open Value', val: openValue > 0 ? formatFromBase(openValue) : '—', color: '#93C5FD' },
        ].map(({ label, val, color }) => (
          <div key={label} className="rounded-xl p-3 min-w-0" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(180,140,75,0.14)' }}>
            <p className="text-xs uppercase tracking-[0.1em] text-[#D8C7A6]/55 mb-1 truncate">{label}</p>
            <p className="text-xl font-bold break-words tabular-nums" style={{ color }}>{val}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Top to Hold */}
        <ValueCard title={t("auto.components_whiskey_WhiskeyValueIntelligence.top_bottles_to_hold_1jx67u")} icon={ShieldCheck} iconColor="#fca5a5" borderColor="rgba(239,68,68,0.2)" emptyMessage="No high-priority hold candidates identified">
          {topHold.length > 0 ? topHold.map(b => (
            <BottleRow
              key={b.id}
              bottle={b}
              value={b._value}
              badge={DIFFICULTY_LABELS[b._difficulty]}
              badgeColor={{ bg: 'rgba(239,68,68,0.1)', text: '#fca5a5', border: 'rgba(239,68,68,0.25)' }}
              formatFromBase={formatFromBase}
            />
          )) : (
            <p className="text-xs text-[#D8C7A6]/50 text-center py-4">{t("auto.components_whiskey_WhiskeyValueIntelligence.no_strong_hold_candidates_in_your_1rxmkq")}</p>
          )}
        </ValueCard>

        {/* Safe to Open */}
        <ValueCard title={t("auto.components_whiskey_WhiskeyValueIntelligence.safe_to_open_1h9dfu")} icon={Unlock} iconColor="#6ee7b7" borderColor="rgba(16,185,129,0.2)" emptyMessage="No low-risk bottles identified">
          {safeOpen.length > 0 ? safeOpen.map(b => (
            <BottleRow
              key={b.id}
              bottle={b}
              value={b._value}
              badge={b._rarity <= 15 ? 'Common' : 'Low Risk'}
              badgeColor={{ bg: 'rgba(16,185,129,0.1)', text: '#6ee7b7', border: 'rgba(16,185,129,0.25)' }}
              formatFromBase={formatFromBase}
            />
          )) : (
            <p className="text-xs text-[#D8C7A6]/50 text-center py-4">{t("auto.components_whiskey_WhiskeyValueIntelligence.all_bottles_have_moderate_to_high_2it18r")}</p>
          )}
        </ValueCard>

        {/* Replacement Risk */}
        <ValueCard title={t("auto.components_whiskey_WhiskeyValueIntelligence.replacement_risk_a8yz3i")} icon={AlertTriangle} iconColor="#fbbf24" borderColor="rgba(251,191,36,0.2)" emptyMessage="No high-risk bottles">
          {highRisk.length > 0 ? highRisk.map(b => (
            <BottleRow
              key={b.id}
              bottle={b}
              value={b._value}
              badge={DIFFICULTY_LABELS[b._difficulty]}
              badgeColor={{ bg: 'rgba(251,191,36,0.1)', text: '#fbbf24', border: 'rgba(251,191,36,0.25)' }}
              formatFromBase={formatFromBase}
            />
          )) : (
            <p className="text-xs text-[#D8C7A6]/50 text-center py-4">{t("auto.components_whiskey_WhiskeyValueIntelligence.no_bottles_with_high_replacement_risk_ae86qs")}</p>
          )}
        </ValueCard>

        {/* Value Concentration */}
        <ValueCard title={t("auto.components_whiskey_WhiskeyValueIntelligence.value_concentration_x9b1kp")} icon={BarChart2} iconColor="#93C5FD" borderColor="rgba(59,130,246,0.2)">
          <div className="space-y-3">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-[#D8C7A6]/60">{t("auto.components_whiskey_WhiskeyValueIntelligence.top_3_bottles_hold_1t7m54")}</span>
              <span className="text-sm font-bold" style={{ color: concentrationPct >= 70 ? '#f87171' : '#fbbf24' }}>{concentrationPct}{t("auto.components_whiskey_WhiskeyValueIntelligence.of_value_1k3tp0")}</span>
            </div>
            <div className="h-2.5 rounded-full bg-white/5 overflow-hidden">
              <div className="h-full rounded-full transition-all" style={{ width: `${concentrationPct}%`, background: concentrationPct >= 70 ? '#f87171' : concentrationPct >= 40 ? '#fbbf24' : '#4ade80' }} />
            </div>
            {concentrationPct >= 70 && (
              <p className="text-xs text-[#fbbf24]/80 mt-2">{t("auto.components_whiskey_WhiskeyValueIntelligence.high_concentration_consider_diversifying_your_co_3prhyt")}</p>
            )}
            <div className="mt-3 space-y-1">
              {valueByBottle.slice(0, 3).map((b, i) => (
                <div key={b.id} className="flex items-center justify-between gap-2 min-w-0">
                  <span className="text-xs text-[#D8C7A6]/65 shrink-0">#{i + 1}</span>
                  <span className="text-xs text-[#F5F1E7] flex-1 min-w-0 truncate">{b.name}</span>
                  <span className="text-xs font-semibold text-[#93C5FD] tabular-nums shrink-0">{formatFromBase(b._value * b._qty)}</span>
                </div>
              ))}
            </div>
          </div>
        </ValueCard>
      </div>

      {/* Sealed vs Open Exposure */}
      {(sealedValue > 0 || openValue > 0) && (
        <ValueCard title={t("auto.components_whiskey_WhiskeyValueIntelligence.sealed_vs_open_exposure_nriweh")} icon={Archive} iconColor="#D4A574" borderColor="rgba(180,140,75,0.2)">
          <div className="grid grid-cols-2 gap-4">
            <div className="text-center">
              <p className="text-xs uppercase tracking-[0.1em] text-[#4ade80]/70 mb-1">{t("auto.components_whiskey_WhiskeyValueIntelligence.sealed_1lxzzw")}</p>
              <p className="text-2xl font-bold text-[#4ade80] tabular-nums">{formatFromBase(sealedValue)}</p>
              <p className="text-xs text-[#D8C7A6]/50 mt-1">
                {totalValue > 0 ? `${Math.round((sealedValue / totalValue) * 100)}% of collection value` : '—'}
              </p>
            </div>
            <div className="text-center">
              <p className="text-xs uppercase tracking-[0.1em] text-[#93C5FD]/70 mb-1">{t("auto.components_whiskey_WhiskeyValueIntelligence.open_yjzwpj")}</p>
              <p className="text-2xl font-bold text-[#93C5FD] tabular-nums">{formatFromBase(openValue)}</p>
              <p className="text-xs text-[#D8C7A6]/50 mt-1">
                {totalValue > 0 ? `${Math.round((openValue / totalValue) * 100)}% of collection value` : '—'}
              </p>
            </div>
          </div>
          {/* Visual bar */}
          {totalValue > 0 && (
            <div className="mt-4 h-3 rounded-full bg-white/5 overflow-hidden flex">
              <div className="h-full rounded-l-full" style={{ width: `${Math.round((sealedValue / totalValue) * 100)}%`, background: '#4ade80' }} />
              <div className="h-full rounded-r-full" style={{ width: `${Math.round((openValue / totalValue) * 100)}%`, background: '#93C5FD' }} />
            </div>
          )}
        </ValueCard>
      )}
    </div>
  );
}