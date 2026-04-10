import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useCurrentUser } from '@/components/hooks/useCurrentUser';
import { scopedEntities } from '@/components/api/scopedEntities';
import {
  computeCurrentValue,
  computeRarityScore,
  computeOpenVsHoldDecision,
  PIPE_RECOMMENDATION_LABELS,
  TOBACCO_RECOMMENDATION_LABELS,
} from '@/components/valuation/valueEngine';
import { formatCurrency } from '@/components/utils/localeFormatters';
import { selectPipeCollectionValue, selectTotalQuantityOz as _selectTobaccoOz } from '@/lib/collection';
import { selectCellarValue } from '@/lib/collection/tobaccoSelectors';
import { TrendingUp, Award, Flame, ShieldAlert, Leaf, RotateCw } from 'lucide-react';
import PipeShapeIcon from '@/components/pipes/PipeShapeIcon';

// ── Analytics helpers ──────────────────────────────────────────────────────

function getMostValuablePipes(pipes, limit = 5) {
  return [...pipes]
    .map(p => ({ ...p, _value: computeCurrentValue(p, 'pipekeeper') }))
    .filter(p => p._value > 0)
    .sort((a, b) => b._value - a._value)
    .slice(0, limit);
}
function getRarestPipes(pipes, limit = 5) {
  return [...pipes]
    .map(p => ({ ...p, _rarity: computeRarityScore(p, 'pipekeeper') }))
    .filter(p => p._rarity > 0)
    .sort((a, b) => b._rarity - a._rarity)
    .slice(0, limit);
}
function getUnderutilizedHighValuePipes(pipes, limit = 5) {
  return [...pipes]
    .map(p => {
      const value = computeCurrentValue(p, 'pipekeeper');
      const { holdRecommendation } = computeOpenVsHoldDecision(p, 'pipekeeper');
      return { ...p, _value: value, _rec: holdRecommendation };
    })
    .filter(p => p._value > 0 && (p._rec === 'rotate' || p._rec === 'preserve'))
    .sort((a, b) => b._value - a._value)
    .slice(0, limit);
}
function getMostValuableTobaccos(blends, limit = 5) {
  return [...blends]
    .map(b => ({ ...b, _value: computeCurrentValue(b, 'pipekeeper') }))
    .filter(b => b._value > 0)
    .sort((a, b) => b._value - a._value)
    .slice(0, limit);
}
function getRarestTobaccos(blends, limit = 5) {
  return [...blends]
    .map(b => ({ ...b, _rarity: computeRarityScore(b, 'pipekeeper') }))
    .filter(b => b._rarity > 0)
    .sort((a, b) => b._rarity - a._rarity)
    .slice(0, limit);
}
function getDiscontinuedTobaccos(blends) {
  return blends.filter(b =>
    (b.production_status || '').toLowerCase().includes('discontinue') || !!b.discontinued
  );
}
function getCellarCandidates(blends, limit = 5) {
  return [...blends]
    .map(b => {
      const { holdRecommendation } = computeOpenVsHoldDecision(b, 'pipekeeper');
      return { ...b, _rec: holdRecommendation };
    })
    .filter(b => b._rec === 'cellar')
    .slice(0, limit);
}
function getSmokeNowCandidates(blends, limit = 5) {
  return [...blends]
    .map(b => {
      const { holdRecommendation } = computeOpenVsHoldDecision(b, 'pipekeeper');
      return { ...b, _rec: holdRecommendation };
    })
    .filter(b => b._rec === 'smoke_now')
    .slice(0, limit);
}

// ── UI helpers ─────────────────────────────────────────────────────────────

const CARD_STYLE = {
  background: 'linear-gradient(135deg, rgba(42,31,24,0.5), rgba(31,21,16,0.5))',
  border: '1px solid rgba(180,140,75,0.15)',
};

function SectionHeader({ icon: Icon, title, color = '#D4A574' }) {
  return (
    <div className="flex items-center gap-2 mb-4">
      <Icon className="w-4 h-4" style={{ color }} />
      <h3 className="text-base font-semibold" style={{ color: '#F5F1E7' }}>{title}</h3>
    </div>
  );
}

function StatCard({ label, value, sub }) {
  return (
    <div className="rounded-xl p-4" style={{ background: 'rgba(180,140,75,0.08)', border: '1px solid rgba(180,140,75,0.18)' }}>
      <p className="text-xs uppercase tracking-wider" style={{ color: 'rgba(224,216,200,0.6)' }}>{label}</p>
      <p className="text-2xl font-bold mt-1" style={{ color: '#F5F1E7' }}>{value}</p>
      {sub && <p className="text-xs mt-1" style={{ color: 'rgba(224,216,200,0.5)' }}>{sub}</p>}
    </div>
  );
}

function ItemRow({ name, sub, badge, value, rarity, recommendation, recommendationLabel, recommendationColor = '#4ade80' }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl px-4 py-3"
      style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(180,140,75,0.1)' }}>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-[#F5F1E7] truncate">{name || '—'}</p>
        {sub && <p className="text-xs text-[#D8C7A6]/60 truncate mt-0.5">{sub}</p>}
      </div>
      <div className="flex items-center gap-2 flex-shrink-0 flex-wrap justify-end">
        {rarity != null && (
          <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: 'rgba(180,140,75,0.12)', color: '#D4A574' }}>
            ★ {rarity}
          </span>
        )}
        {badge && (
          <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: 'rgba(248,113,113,0.14)', color: '#f87171', border: '1px solid rgba(248,113,113,0.25)' }}>
            {badge}
          </span>
        )}
        {recommendation && (
          <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ background: 'rgba(74,222,128,0.1)', color: recommendationColor, border: `1px solid ${recommendationColor}40` }}>
            {recommendationLabel || recommendation}
          </span>
        )}
        {value != null && value > 0 && (
          <span className="text-sm font-semibold" style={{ color: '#D4A574' }}>{formatCurrency(value)}</span>
        )}
      </div>
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────

export default function PipeValuationTab({ pipes: pipesProp, blends: blendsProp }) {
  const { user } = useCurrentUser();
  const [activeSubTab, setActiveSubTab] = React.useState('pipes');

  // Use props if provided (already fetched), otherwise fetch independently
  const { data: pipesData = [] } = useQuery({
    queryKey: ['pipes-insights', user?.email],
    queryFn: async () => {
      const result = await scopedEntities.Pipe.listForUser(user.email, '-updated_date', 500);
      return Array.isArray(result) ? result : [];
    },
    enabled: !!user?.email && !pipesProp,
  });
  const { data: blendsData = [] } = useQuery({
    queryKey: ['blends-insights', user?.email],
    queryFn: async () => {
      const result = await scopedEntities.TobaccoBlend.listForUser(user.email, '-updated_date', 500);
      return Array.isArray(result) ? result : [];
    },
    enabled: !!user?.email && !blendsProp,
  });

  const pipes = pipesProp || pipesData;
  const blends = blendsProp || blendsData;

  const totalPipeValue = useMemo(() => selectPipeCollectionValue(pipes), [pipes]);
  const totalCellarValue = useMemo(() => selectCellarValue(blends), [blends]);
  const totalOz = useMemo(() => _selectTobaccoOz(blends), [blends]);

  const mostValuablePipes = useMemo(() => getMostValuablePipes(pipes, 5), [pipes]);
  const rarestPipes = useMemo(() => getRarestPipes(pipes, 5), [pipes]);
  const underutilizedPipes = useMemo(() => getUnderutilizedHighValuePipes(pipes, 5), [pipes]);
  const mostValuableTobaccos = useMemo(() => getMostValuableTobaccos(blends, 5), [blends]);
  const rarestTobaccos = useMemo(() => getRarestTobaccos(blends, 5), [blends]);
  const discontinuedBlends = useMemo(() => getDiscontinuedTobaccos(blends), [blends]);
  const cellarCandidates = useMemo(() => getCellarCandidates(blends, 5), [blends]);
  const smokeNowCandidates = useMemo(() => {
    const excludeIds = new Set([
      ...rarestTobaccos.map(b => b.id),
      ...discontinuedBlends.map(b => b.id),
      ...cellarCandidates.map(b => b.id),
    ]);
    return getSmokeNowCandidates(blends, 10).filter(b => !excludeIds.has(b.id)).slice(0, 5);
  }, [blends, rarestTobaccos, discontinuedBlends, cellarCandidates]);

  return (
    <div className="space-y-5 pt-4">
      {/* Summary stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="Pipes" value={pipes.length} />
        <StatCard label="Pipe Value" value={totalPipeValue > 0 ? formatCurrency(Math.round(totalPipeValue)) : '—'} />
        <StatCard label="Blends" value={blends.length} sub={`${totalOz.toFixed(1)} oz total`} />
        <StatCard label="Cellar Value" value={totalCellarValue > 0 ? formatCurrency(Math.round(totalCellarValue)) : '—'} />
      </div>

      {/* Sub-tabs */}
      <div className="flex gap-2 border-b" style={{ borderColor: 'rgba(180,140,75,0.15)' }}>
        {[{ key: 'pipes', label: 'Pipes' }, { key: 'tobacco', label: 'Tobacco' }].map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveSubTab(tab.key)}
            className="px-4 py-2 text-sm font-medium transition-all"
            style={{
              color: activeSubTab === tab.key ? '#F5F1E7' : 'rgba(224,216,200,0.6)',
              borderBottom: activeSubTab === tab.key ? '2px solid #D4A574' : '2px solid transparent',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Pipe Insights */}
      {activeSubTab === 'pipes' && (
        <div className="space-y-5">
          {mostValuablePipes.length > 0 && (
            <div className="rounded-2xl p-5" style={CARD_STYLE}>
              <SectionHeader icon={TrendingUp} title="Most Valuable Pipes" />
              <div className="space-y-2">
                {mostValuablePipes.map(p => (
                  <ItemRow key={p.id} name={p.name} sub={[p.maker, p.bowl_material].filter(Boolean).join(' · ')} value={p._value} rarity={computeRarityScore(p, 'pipekeeper')} />
                ))}
              </div>
            </div>
          )}
          {rarestPipes.length > 0 && (
            <div className="rounded-2xl p-5" style={CARD_STYLE}>
              <SectionHeader icon={Award} title="Rarest Pipes" color="#f59e0b" />
              <div className="space-y-2">
                {rarestPipes.map(p => {
                  const rec = computeOpenVsHoldDecision(p, 'pipekeeper').holdRecommendation;
                  return (
                    <ItemRow key={p.id} name={p.name} sub={[p.maker, p.year_made ? `c.${p.year_made}` : null].filter(Boolean).join(' · ')} rarity={p._rarity} recommendation={rec} recommendationLabel={PIPE_RECOMMENDATION_LABELS[rec] || rec} />
                  );
                })}
              </div>
            </div>
          )}
          {underutilizedPipes.length > 0 && (
            <div className="rounded-2xl p-5" style={CARD_STYLE}>
              <SectionHeader icon={RotateCw} title="Rotate or Preserve — High-Value Pipes" color="#a78bfa" />
              <p className="text-xs mb-3" style={{ color: 'rgba(224,216,200,0.55)' }}>These pipes have notable value. Consider whether to rotate them into regular use or preserve them.</p>
              <div className="space-y-2">
                {underutilizedPipes.map(p => (
                  <ItemRow key={p.id} name={p.name} sub={[p.maker, p.condition].filter(Boolean).join(' · ')} value={p._value} recommendation={p._rec} recommendationLabel={PIPE_RECOMMENDATION_LABELS[p._rec] || p._rec} recommendationColor="#a78bfa" />
                ))}
              </div>
            </div>
          )}
          {pipes.length === 0 && (
            <div className="rounded-2xl p-8 text-center" style={CARD_STYLE}>
              <PipeShapeIcon shape="Billiard" className="w-12 h-12 mx-auto mb-3" style={{ color: 'rgba(180,140,75,0.3)' }} />
              <p style={{ color: 'rgba(224,216,200,0.5)' }}>No pipes found. Add pipes to see insights.</p>
            </div>
          )}
        </div>
      )}

      {/* Tobacco Insights */}
      {activeSubTab === 'tobacco' && (
        <div className="space-y-5">
          {mostValuableTobaccos.length > 0 && (
            <div className="rounded-2xl p-5" style={CARD_STYLE}>
              <SectionHeader icon={TrendingUp} title="Highest Cellar Value" />
              <div className="space-y-2">
                {mostValuableTobaccos.map(b => (
                  <ItemRow key={b.id} name={b.name} sub={[b.manufacturer, b.blend_type].filter(Boolean).join(' · ')} value={b._value} rarity={computeRarityScore(b, 'pipekeeper')} />
                ))}
              </div>
            </div>
          )}
          {discontinuedBlends.length > 0 && (
            <div className="rounded-2xl p-5" style={CARD_STYLE}>
              <SectionHeader icon={ShieldAlert} title="Discontinued Blends" color="#f87171" />
              <p className="text-xs mb-3" style={{ color: 'rgba(224,216,200,0.55)' }}>These blends are no longer in production. Value and scarcity may increase over time.</p>
              <div className="space-y-2">
                {discontinuedBlends.map(b => {
                  const rec = computeOpenVsHoldDecision(b, 'pipekeeper').holdRecommendation;
                  return (
                    <ItemRow key={b.id} name={b.name} sub={b.manufacturer || ''} badge="Discontinued" rarity={computeRarityScore(b, 'pipekeeper')} recommendation={rec} recommendationLabel={TOBACCO_RECOMMENDATION_LABELS[rec] || rec} recommendationColor="#4ade80" />
                  );
                })}
              </div>
            </div>
          )}
          {rarestTobaccos.length > 0 && (
            <div className="rounded-2xl p-5" style={CARD_STYLE}>
              <SectionHeader icon={Award} title="Rarest Blends" color="#f59e0b" />
              <div className="space-y-2">
                {rarestTobaccos.map(b => {
                  const rec = computeOpenVsHoldDecision(b, 'pipekeeper').holdRecommendation;
                  return (
                    <ItemRow key={b.id} name={b.name} sub={[b.manufacturer, b.blend_type].filter(Boolean).join(' · ')} rarity={b._rarity} recommendation={rec} recommendationLabel={TOBACCO_RECOMMENDATION_LABELS[rec] || rec} />
                  );
                })}
              </div>
            </div>
          )}
          {cellarCandidates.length > 0 && (
            <div className="rounded-2xl p-5" style={CARD_STYLE}>
              <SectionHeader icon={Leaf} title="Optimal Cellar Candidates" color="#34d399" />
              <p className="text-xs mb-3" style={{ color: 'rgba(224,216,200,0.55)' }}>These blends are recommended for aging to enhance flavor and value.</p>
              <div className="space-y-2">
                {cellarCandidates.map(b => (
                  <ItemRow key={b.id} name={b.name} sub={[b.manufacturer, b.aging_potential ? `Aging: ${b.aging_potential}` : null].filter(Boolean).join(' · ')} recommendation="cellar" recommendationLabel="Cellar for Aging" recommendationColor="#34d399" />
                ))}
              </div>
            </div>
          )}
          {smokeNowCandidates.length > 0 && (
            <div className="rounded-2xl p-5" style={CARD_STYLE}>
              <SectionHeader icon={Flame} title="Smoke Now — Widely Available" color="#fb923c" />
              <p className="text-xs mb-3" style={{ color: 'rgba(224,216,200,0.55)' }}>These blends are easy to replenish — enjoy freely without concern.</p>
              <div className="space-y-2">
                {smokeNowCandidates.map(b => (
                  <ItemRow key={b.id} name={b.name} sub={[b.manufacturer, b.blend_type].filter(Boolean).join(' · ')} recommendation="smoke_now" recommendationLabel="Smoke Now" recommendationColor="#fb923c" />
                ))}
              </div>
            </div>
          )}
          {blends.length === 0 && (
            <div className="rounded-2xl p-8 text-center" style={CARD_STYLE}>
              <Leaf className="w-12 h-12 mx-auto mb-3" style={{ color: 'rgba(90,124,90,0.3)' }} />
              <p style={{ color: 'rgba(224,216,200,0.5)' }}>No tobacco blends found. Add blends to see insights.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}