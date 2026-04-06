import React, { useMemo, useState } from 'react';
import { useNavigate } from '@/components/utils/navigation';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { createPageUrl } from '@/components/utils/createPageUrl';
import {
  TrendingUp,
  Zap,
  Layers,
  BarChart2,
  Target,
  AlertTriangle,
  Info,
  CheckCircle2,
} from 'lucide-react';
import {
  generateProactiveInsights,
  INSIGHT_SCOPE,
  INSIGHT_SEVERITY,
  INSIGHT_CATEGORIES,
} from '@/platform/proactiveInsights';

// ─── Constants ────────────────────────────────────────────────────────────────

const MODES = [
  {
    key: 'all',
    label: 'Optimize Entire Collection',
    icon: TrendingUp,
    description: 'Cross-module analysis using Curator logic',
    primary: true,
  },
  {
    key: 'module',
    label: 'Optimize by Module',
    icon: Layers,
    description: 'Filter insights for a specific module',
  },
  {
    key: 'quickwins',
    label: 'Quick Wins',
    icon: Zap,
    description: 'Missing fields and easy improvements',
  },
  {
    key: 'reclassify',
    label: 'Smart Reclassification',
    icon: Target,
    description: 'Corrections for classifications and attributes',
  },
  {
    key: 'balance',
    label: 'Balance & Gap Analysis',
    icon: BarChart2,
    description: 'Detect overconcentration or missing categories',
  },
];

const MODULE_FILTERS = [
  { key: 'pipe', label: 'PipeKeeper', scope: INSIGHT_SCOPE.PIPE },
  { key: 'tobacco', label: 'Tobacco', scope: INSIGHT_SCOPE.TOBACCO },
  { key: 'cigar', label: 'CigarKeeper', scope: 'cigar' },
  { key: 'whiskey', label: 'WhiskeyKeeper', scope: 'whiskey' },
];

// ─── Pure helpers ─────────────────────────────────────────────────────────────

function plural(count, singular, pluralForm) {
  return count === 1 ? singular : (pluralForm || singular + 's');
}

function insightToCard(insight) {
  return {
    id: insight.id,
    title: insight.title,
    description: insight.summary,
    context: insight.reason,
    recommendation: insight.suggested_action,
    severity: insight.severity,
    scope: insight.scope,
    module: null,
  };
}

function getRouteForScope(scope) {
  switch (scope) {
    case 'pipe':
    case 'tobacco':
      return createPageUrl('PipeKeeper');
    default:
      return null;
  }
}

function getRouteForModule(moduleKey) {
  switch (moduleKey) {
    case 'pipekeeper':
    case 'tobacco':
      return createPageUrl('PipeKeeper');
    case 'cigarkeeper':
      return createPageUrl('CigarKeeper');
    case 'whiskeykeeper':
      return createPageUrl('WhiskeyKeeper');
    default:
      return null;
  }
}

function severityColor(severity) {
  if (severity === INSIGHT_SEVERITY.HIGH) return '#E05252';
  if (severity === INSIGHT_SEVERITY.MEDIUM) return '#C89752';
  return '#4A7C9C';
}

function severityBg(severity) {
  if (severity === INSIGHT_SEVERITY.HIGH) return 'rgba(224,82,82,0.12)';
  if (severity === INSIGHT_SEVERITY.MEDIUM) return 'rgba(200,151,82,0.12)';
  return 'rgba(74,124,156,0.12)';
}

// ─── InsightCard ─────────────────────────────────────────────────────────────

function InsightCard({ card, onApplyFix, onReviewInCurator }) {
  const color = severityColor(card.severity);
  const bg = severityBg(card.severity);

  return (
    <div
      className="rounded-xl p-4 space-y-3"
      style={{
        background: 'linear-gradient(145deg, rgba(42,30,20,0.95), rgba(28,19,13,0.98))',
        border: `1px solid ${color}35`,
        boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
      }}
    >
      {/* Header */}
      <div className="flex items-start gap-2.5">
        <div
          className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5"
          style={{ background: bg, border: `1px solid ${color}40` }}
        >
          {card.severity === INSIGHT_SEVERITY.HIGH || card.severity === INSIGHT_SEVERITY.MEDIUM ? (
            <AlertTriangle className="w-3.5 h-3.5" style={{ color }} />
          ) : (
            <Info className="w-3.5 h-3.5" style={{ color }} />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <h4
            className="text-sm font-semibold leading-snug"
            style={{ color: '#F5F1E7', fontFamily: "'Georgia', serif" }}
          >
            {card.title}
          </h4>
          {card.severity !== INSIGHT_SEVERITY.LOW && (
            <span
              className="inline-block text-[10px] font-semibold px-1.5 py-0.5 rounded mt-1 uppercase tracking-wide"
              style={{ background: bg, color, border: `1px solid ${color}40` }}
            >
              {card.severity}
            </span>
          )}
        </div>
      </div>

      {/* Issue description */}
      <p className="text-sm leading-relaxed" style={{ color: 'rgba(224,216,200,0.82)' }}>
        {card.description}
      </p>

      {/* Additional context */}
      {card.context ? (
        <p className="text-xs leading-relaxed" style={{ color: 'rgba(224,216,200,0.52)' }}>
          {card.context}
        </p>
      ) : null}

      {/* Recommendation */}
      <div
        className="pt-2.5 border-t space-y-1"
        style={{ borderColor: 'rgba(180,140,75,0.15)' }}
      >
        <p
          className="text-[10px] font-semibold uppercase tracking-[0.12em]"
          style={{ color: 'rgba(180,140,75,0.65)' }}
        >
          Recommendation
        </p>
        <p className="text-sm leading-relaxed" style={{ color: 'rgba(224,216,200,0.88)' }}>
          {card.recommendation}
        </p>
      </div>

      {/* Action buttons */}
      <div className="flex gap-2 pt-0.5">
        <button
          type="button"
          onClick={onApplyFix}
          className="flex-1 py-2 text-xs font-semibold rounded-lg transition-all hover:opacity-90"
          style={{
            background: 'linear-gradient(135deg, rgba(74,124,156,0.35), rgba(74,124,156,0.18))',
            border: '1px solid rgba(74,124,156,0.45)',
            color: '#6aabc0',
          }}
        >
          Apply Fix
        </button>
        <button
          type="button"
          onClick={onReviewInCurator}
          className="flex-1 py-2 text-xs font-semibold rounded-lg transition-all hover:opacity-90"
          style={{
            background: 'linear-gradient(135deg, rgba(139,94,58,0.28), rgba(100,65,40,0.18))',
            border: '1px solid rgba(139,94,58,0.42)',
            color: '#D4956A',
          }}
        >
          Review in Curator
        </button>
      </div>
    </div>
  );
}

// ─── OptimizeModal ────────────────────────────────────────────────────────────

export default function OptimizeModal({
  isOpen,
  onClose,
  pipes = [],
  blends = [],
  cigars = [],
  bottles = [],
  smokeLogs = [],
}) {
  const navigate = useNavigate();
  const [activeMode, setActiveMode] = useState('all');
  const [activeModule, setActiveModule] = useState('pipe');

  // Build latestLogByPipe map from smoking logs
  const latestLogByPipe = useMemo(() => {
    const map = {};
    for (const log of smokeLogs) {
      if (!log.pipe_id) continue;
      const logDate = log.date || log.created_date;
      if (!logDate) continue;
      const existing = map[log.pipe_id];
      if (!existing || logDate > existing) map[log.pipe_id] = logDate;
    }
    return map;
  }, [smokeLogs]);

  // Core proactive insights from the Curator engine
  const allInsights = useMemo(
    () => generateProactiveInsights({ pipes, blends, latestLogByPipe }),
    [pipes, blends, latestLogByPipe]
  );

  // Quick Wins: items missing key fields across all modules
  const quickWinCards = useMemo(() => {
    const cards = [];

    const pipesNoPhoto = pipes.filter((p) => !p.photos?.length && !p.photo);
    if (pipesNoPhoto.length > 0) {
      cards.push({
        id: 'qw_pipes_no_photo',
        title: 'Pipes Missing Photos',
        description: `${pipesNoPhoto.length} ${plural(pipesNoPhoto.length, 'pipe')} in your collection ${pipesNoPhoto.length === 1 ? 'has' : 'have'} no photos.`,
        context: 'Photos improve collection presentation and help with AI identification.',
        recommendation: "Add photos to capture each pipe's visual details and condition.",
        severity: INSIGHT_SEVERITY.LOW,
        module: 'pipekeeper',
      });
    }

    const blendsNoType = blends.filter((b) => !b.blend_type && !b.blend_family);
    if (blendsNoType.length > 0) {
      cards.push({
        id: 'qw_blends_no_type',
        title: 'Blends Without Family Classification',
        description: `${blendsNoType.length} ${plural(blendsNoType.length, 'blend')} ${blendsNoType.length === 1 ? 'has' : 'have'} no blend family assigned.`,
        context: 'Blend family is required for diversity analysis and pairing suggestions.',
        recommendation: 'Open each blend and set the blend family (Virginia, Burley, Latakia, etc.).',
        severity: INSIGHT_SEVERITY.MEDIUM,
        module: 'tobacco',
      });
    }

    const cigarsNoSize = cigars.filter((c) => !c.vitola && !c.size && !c.ring_gauge);
    if (cigarsNoSize.length > 0) {
      cards.push({
        id: 'qw_cigars_no_size',
        title: 'Cigars Missing Size Details',
        description: `${cigarsNoSize.length} ${plural(cigarsNoSize.length, 'cigar')} ${cigarsNoSize.length === 1 ? 'is' : 'are'} missing vitola or size information.`,
        context: 'Vitola and ring gauge data enable better categorization and balance analysis.',
        recommendation: 'Add vitola or size data to complete your cigar profiles.',
        severity: INSIGHT_SEVERITY.LOW,
        module: 'cigarkeeper',
      });
    }

    const bottlesNoType = bottles.filter((b) => !b.whiskey_type && !b.spirit_type && !b.category);
    if (bottlesNoType.length > 0) {
      cards.push({
        id: 'qw_bottles_no_type',
        title: 'Bottles Without Spirit Type',
        description: `${bottlesNoType.length} ${plural(bottlesNoType.length, 'bottle')} ${bottlesNoType.length === 1 ? 'is' : 'are'} missing spirit type classification.`,
        context: 'Spirit type is needed for whiskey collection diversity and flavor analysis.',
        recommendation: 'Classify each bottle with its spirit type (Scotch, Bourbon, Irish, etc.).',
        severity: INSIGHT_SEVERITY.LOW,
        module: 'whiskeykeeper',
      });
    }

    return cards;
  }, [pipes, blends, cigars, bottles]);

  // Smart Reclassification: items with generic or missing classification data
  const reclassifyCards = useMemo(() => {
    const cards = [];

    const pipesNoShape = pipes.filter((p) => !p.shape && !p.pipe_shape);
    if (pipesNoShape.length > 0) {
      cards.push({
        id: 'rc_pipe_shape',
        title: 'Pipe Shapes Not Specified',
        description: `${pipesNoShape.length} ${plural(pipesNoShape.length, 'pipe')} ${pipesNoShape.length === 1 ? 'is' : 'are'} missing a shape classification.`,
        context: 'Pipe shape affects pairing recommendations — certain shapes suit specific tobacco types.',
        recommendation: 'Review these pipes and assign their correct shape (billiard, bent, bulldog, etc.).',
        severity: INSIGHT_SEVERITY.LOW,
        module: 'pipekeeper',
      });
    }

    const pipesGeneric = pipes.filter((p) => p.pipe_type === 'Other' || p.material === 'Other');
    if (pipesGeneric.length > 0) {
      cards.push({
        id: 'rc_pipe_generic',
        title: 'Pipes Using Generic "Other" Classification',
        description: `${pipesGeneric.length} ${plural(pipesGeneric.length, 'pipe')} ${pipesGeneric.length === 1 ? 'uses' : 'use'} a generic "Other" type or material.`,
        context: "Specific classifications improve the Curator's ability to make tailored recommendations.",
        recommendation: 'Update these pipes with more specific type or material values.',
        severity: INSIGHT_SEVERITY.LOW,
        module: 'pipekeeper',
      });
    }

    const blendsUnknown = blends.filter(
      (b) => b.blend_type === 'Unknown' || b.blend_family === 'Unknown'
    );
    if (blendsUnknown.length > 0) {
      cards.push({
        id: 'rc_blend_unknown',
        title: 'Blends Classified as Unknown',
        description: `${blendsUnknown.length} ${plural(blendsUnknown.length, 'blend')} ${blendsUnknown.length === 1 ? 'is' : 'are'} classified as "Unknown" type.`,
        context: 'Unknown classifications reduce the effectiveness of diversity and rotation analysis.',
        recommendation: 'Research and update the blend family for these blends.',
        severity: INSIGHT_SEVERITY.MEDIUM,
        module: 'tobacco',
      });
    }

    const cigarsNoWrapper = cigars.filter((c) => !c.wrapper && !c.wrapper_country);
    if (cigarsNoWrapper.length > 0) {
      cards.push({
        id: 'rc_cigar_wrapper',
        title: 'Cigars Missing Wrapper Details',
        description: `${cigarsNoWrapper.length} ${plural(cigarsNoWrapper.length, 'cigar')} ${cigarsNoWrapper.length === 1 ? 'is' : 'are'} missing wrapper leaf or country of origin.`,
        context: 'Wrapper information is key for flavor profile analysis and regional recommendations.',
        recommendation: 'Add wrapper details to enable complete flavor and region analysis.',
        severity: INSIGHT_SEVERITY.LOW,
        module: 'cigarkeeper',
      });
    }

    const bottlesNoDistillery = bottles.filter(
      (b) => !b.distillery && !b.producer && !b.brand
    );
    if (bottlesNoDistillery.length > 0) {
      cards.push({
        id: 'rc_bottle_distillery',
        title: 'Bottles Missing Producer/Distillery',
        description: `${bottlesNoDistillery.length} ${plural(bottlesNoDistillery.length, 'bottle')} ${bottlesNoDistillery.length === 1 ? 'is' : 'are'} missing distillery or producer details.`,
        context: 'Distillery data helps build a more accurate profile of your whiskey collection.',
        recommendation: 'Add the distillery or producer name for each bottle.',
        severity: INSIGHT_SEVERITY.LOW,
        module: 'whiskeykeeper',
      });
    }

    return cards;
  }, [pipes, blends, cigars, bottles]);

  // Balance & Gap Analysis: diversity, health, and inventory insights from the Curator engine
  const balanceCards = useMemo(
    () =>
      allInsights.filter(
        (i) =>
          i.category === INSIGHT_CATEGORIES.DIVERSITY ||
          i.category === INSIGHT_CATEGORIES.COLLECTION_HEALTH ||
          i.category === INSIGHT_CATEGORIES.INVENTORY
      ),
    [allInsights]
  );

  // Cards to display based on active mode and module filter
  const displayCards = useMemo(() => {
    switch (activeMode) {
      case 'all':
        return allInsights.map(insightToCard);
      case 'module': {
        const moduleFilter = MODULE_FILTERS.find((m) => m.key === activeModule);
        if (!moduleFilter) return [];
        return allInsights
          .filter((i) => i.scope === moduleFilter.scope)
          .map(insightToCard);
      }
      case 'quickwins':
        return quickWinCards;
      case 'reclassify':
        return reclassifyCards;
      case 'balance':
        return balanceCards.map(insightToCard);
      default:
        return [];
    }
  }, [activeMode, activeModule, allInsights, quickWinCards, reclassifyCards, balanceCards]);

  function getApplyFixRoute(card) {
    if (card.module) return getRouteForModule(card.module);
    if (card.scope) return getRouteForScope(card.scope);
    return null;
  }

  function handleApplyFix(card) {
    const route = getApplyFixRoute(card);
    onClose();
    navigate(route || createPageUrl('Curator'));
  }

  function handleReviewInCurator() {
    onClose();
    navigate(createPageUrl('Curator'));
  }

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="overflow-y-auto">
        <SheetHeader className="mb-6">
          <SheetTitle
            className="text-2xl font-bold"
            style={{ fontFamily: "'Georgia', serif" }}
          >
            Optimize Your Collection
          </SheetTitle>
          <p className="text-sm mt-1" style={{ color: 'rgba(224,216,200,0.62)' }}>
            Cross-module analysis powered by Curator intelligence.
          </p>
        </SheetHeader>

        {/* Mode selector */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
          {MODES.map((mode) => {
            const Icon = mode.icon;
            const isActive = activeMode === mode.key;
            return (
              <button
                key={mode.key}
                type="button"
                onClick={() => setActiveMode(mode.key)}
                className={`flex items-start gap-3 p-3.5 rounded-xl text-left transition-all${mode.primary ? ' sm:col-span-2' : ''}`}
                style={{
                  background: isActive
                    ? 'linear-gradient(135deg, rgba(74,124,156,0.28), rgba(74,124,156,0.14))'
                    : 'linear-gradient(145deg, rgba(52,37,24,0.6), rgba(38,27,18,0.75))',
                  border: isActive
                    ? '1px solid rgba(74,124,156,0.55)'
                    : '1px solid rgba(120,90,65,0.28)',
                }}
              >
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5"
                  style={{
                    background: isActive ? 'rgba(74,124,156,0.25)' : 'rgba(100,70,45,0.4)',
                    border: isActive
                      ? '1px solid rgba(74,124,156,0.45)'
                      : '1px solid rgba(120,90,65,0.3)',
                  }}
                >
                  <Icon
                    className="w-4 h-4"
                    style={{ color: isActive ? '#6aabc0' : 'rgba(180,140,75,0.9)' }}
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <div
                    className="text-sm font-semibold flex items-center gap-2 flex-wrap"
                    style={{ color: isActive ? '#6aabc0' : '#F5F1E7' }}
                  >
                    {mode.label}
                    {mode.primary && (
                      <span
                        className="text-[10px] px-1.5 py-0.5 rounded font-medium"
                        style={{
                          background: 'rgba(74,124,156,0.18)',
                          color: '#6aabc0',
                          border: '1px solid rgba(74,124,156,0.3)',
                        }}
                      >
                        Primary
                      </span>
                    )}
                  </div>
                  <div
                    className="text-xs mt-0.5"
                    style={{ color: 'rgba(224,216,200,0.5)' }}
                  >
                    {mode.description}
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {/* Module sub-filter */}
        {activeMode === 'module' && (
          <div className="flex flex-wrap gap-2 mb-5">
            {MODULE_FILTERS.map((m) => (
              <button
                key={m.key}
                type="button"
                onClick={() => setActiveModule(m.key)}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
                style={{
                  background:
                    activeModule === m.key
                      ? 'rgba(74,124,156,0.25)'
                      : 'rgba(52,37,24,0.6)',
                  border:
                    activeModule === m.key
                      ? '1px solid rgba(74,124,156,0.5)'
                      : '1px solid rgba(120,90,65,0.3)',
                  color:
                    activeModule === m.key ? '#6aabc0' : 'rgba(224,216,200,0.75)',
                }}
              >
                {m.label}
              </button>
            ))}
          </div>
        )}

        {/* Results */}
        <div className="space-y-3">
          {displayCards.length === 0 ? (
            <div
              className="rounded-xl p-6 text-center"
              style={{
                background:
                  'linear-gradient(145deg, rgba(42,30,20,0.9), rgba(28,19,13,0.95))',
                border: '1px solid rgba(180,140,75,0.16)',
              }}
            >
              <CheckCircle2
                className="w-8 h-8 mx-auto mb-3"
                style={{ color: '#4A7C59' }}
              />
              <p
                className="text-sm font-semibold"
                style={{ color: '#F5F1E7' }}
              >
                Your collection is well optimized — no immediate actions needed.
              </p>
            </div>
          ) : (
            displayCards.map((card) => (
              <InsightCard
                key={card.id}
                card={card}
                onApplyFix={() => handleApplyFix(card)}
                onReviewInCurator={handleReviewInCurator}
              />
            ))
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
