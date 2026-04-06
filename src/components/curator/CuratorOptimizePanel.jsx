import React, { useMemo, useState } from 'react';
import { useNavigate } from '@/components/utils/navigation';
import { createPageUrl } from '@/components/utils/createPageUrl';
import {
  AlertTriangle,
  Info,
  CheckCircle2,
  X,
  Zap,
  Lightbulb,
  MessageCircle,
  ChevronRight,
  Sparkles,
  Eye,
  HelpCircle,
  SplitSquareVertical,
  ExternalLink,
} from 'lucide-react';
import {
  generateProactiveInsights,
  INSIGHT_SCOPE,
  INSIGHT_SEVERITY,
  INSIGHT_CATEGORIES,
} from '@/platform/proactiveInsights';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  RECOMMENDATION_CLASS,
  getRecommendationClassLabel,
  getRecommendationClassColor,
  getRecommendationClassBg,
} from './recommendationActionTypes';

// ─── Module filter definitions ────────────────────────────────────────────────

const MODULE_PILLS = [
  { key: 'all', label: 'All' },
  { key: 'pipe', label: 'Pipe' },
  { key: 'tobacco', label: 'Tobacco' },
  { key: 'cigar', label: 'Cigar' },
  { key: 'whiskey', label: 'Whiskey' },
];

// ─── Pure helpers ─────────────────────────────────────────────────────────────

function plural(count, singular, pluralForm) {
  return count === 1 ? singular : (pluralForm || singular + 's');
}

function has(count) {
  return count === 1 ? 'has' : 'have';
}

function is(count) {
  return count === 1 ? 'is' : 'are';
}

function uses(count) {
  return count === 1 ? 'uses' : 'use';
}

function insightToCard(insight) {
  return {
    id: insight.id,
    title: insight.title,
    whatWeFound: insight.summary,
    whyItMatters: insight.reason,
    recommendedAction: insight.suggested_action,
    severity: insight.severity,
    scope: insight.scope,
    module: null,
    suggestions: insight.suggestions || [],
    // All proactive insights are advisory — they surface awareness, not direct data fixes
    recommendationClass: RECOMMENDATION_CLASS.ADVISORY,
    category: insight.category,
    relatedItems: insight.related_items || [],
  };
}

function getModuleKey(card) {
  if (card.module) return card.module;
  if (card.scope === INSIGHT_SCOPE.PIPE) return 'pipe';
  if (card.scope === INSIGHT_SCOPE.TOBACCO) return 'tobacco';
  if (card.scope === 'cigar') return 'cigar';
  if (card.scope === 'whiskey') return 'whiskey';
  return null;
}

function getModuleName(moduleKey) {
  switch (moduleKey) {
    case 'pipekeeper':
    case 'pipe': return 'PipeKeeper';
    case 'tobacco': return 'your tobacco collection';
    case 'cigarkeeper':
    case 'cigar': return 'CigarKeeper';
    case 'whiskeykeeper':
    case 'whiskey': return 'WhiskeyKeeper';
    default: return 'your collection';
  }
}

function getModuleRoute(moduleKey) {
  switch (moduleKey) {
    case 'pipekeeper':
    case 'pipe':
    case 'tobacco': return createPageUrl('PipeKeeper');
    case 'cigarkeeper':
    case 'cigar': return createPageUrl('CigarKeeper');
    case 'whiskeykeeper':
    case 'whiskey': return createPageUrl('WhiskeyKeeper');
    default: return null;
  }
}

function getConfirmationDetails(card) {
  const moduleName = getModuleName(getModuleKey(card));
  const isQuickWin = card.id?.startsWith('qw_');
  const isReclassify = card.id?.startsWith('rc_');

  let changes = [];
  let affectedModule = moduleName;

  if (isQuickWin || isReclassify) {
    changes = [
      `Open ${moduleName} to the relevant section`,
      `Review and complete: ${card.recommendedAction}`,
    ];
  } else if (card.suggestions?.length > 0) {
    changes = [
      `Navigate to ${moduleName}`,
      `Review the ${card.suggestions.length} specific suggestion${card.suggestions.length > 1 ? 's' : ''} listed`,
    ];
  } else {
    changes = [
      `Open ${moduleName}`,
      `Apply the recommended action: ${card.recommendedAction}`,
    ];
  }

  return { changes, affectedModule };
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

function impactLabel(severity) {
  if (severity === INSIGHT_SEVERITY.HIGH) return 'High';
  if (severity === INSIGHT_SEVERITY.MEDIUM) return 'Medium';
  return 'Low';
}

// ─── RecommendationCard ───────────────────────────────────────────────────────

function RecommendationCard({
  card,
  // AUTO_FIX handlers
  onApplyFix,
  onReviewDetails,
  // ADVISORY handlers
  onAcknowledge,
  onViewItems,
  // MULTI_PATH handlers
  onAskForMoreInfo,
  onTreatIndividually,
  // Shared
  onAskCurator,
}) {
  const [localAcknowledged, setLocalAcknowledged] = useState(false);

  const color = severityColor(card.severity);
  const bg = severityBg(card.severity);
  const impact = impactLabel(card.severity);
  const recClass = card.recommendationClass || RECOMMENDATION_CLASS.AUTO_FIX;
  const classLabel = getRecommendationClassLabel(recClass);
  const classColor = getRecommendationClassColor(recClass);
  const classBg = getRecommendationClassBg(recClass);

  if (localAcknowledged) {
    return (
      <div
        className="rounded-2xl p-4 flex items-center justify-between gap-3"
        style={{
          background: 'rgba(20,14,10,0.5)',
          border: '1px solid rgba(140,105,65,0.1)',
        }}
      >
        <div className="flex items-center gap-2 text-sm" style={{ color: 'rgba(224,216,200,0.45)' }}>
          <CheckCircle2 className="w-4 h-4 flex-shrink-0" style={{ color: 'rgba(74,124,92,0.6)' }} />
          <span>{card.title} — acknowledged</span>
        </div>
        <button
          type="button"
          onClick={() => setLocalAcknowledged(false)}
          className="text-xs hover:opacity-80 underline shrink-0"
          style={{ color: 'rgba(180,140,75,0.5)' }}
        >
          Undo
        </button>
      </div>
    );
  }

  return (
    <div
      className="rounded-2xl p-5 sm:p-6 space-y-4"
      style={{
        background: 'linear-gradient(145deg, rgba(42,30,20,0.97), rgba(28,19,13,0.99))',
        border: `1px solid ${color}30`,
        boxShadow: '0 6px 20px rgba(0,0,0,0.35)',
      }}
    >
      {/* Title row */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 flex-1 min-w-0">
          <div
            className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5"
            style={{ background: bg, border: `1px solid ${color}40` }}
          >
            {card.severity === INSIGHT_SEVERITY.HIGH || card.severity === INSIGHT_SEVERITY.MEDIUM ? (
              <AlertTriangle className="w-4 h-4" style={{ color }} />
            ) : (
              <Info className="w-4 h-4" style={{ color }} />
            )}
          </div>
          <div className="min-w-0">
            <h3
              className="text-base sm:text-lg font-bold leading-tight"
              style={{ color: '#F5F1E7', fontFamily: "'Georgia', serif" }}
            >
              {card.title}
            </h3>
            {/* Recommendation type badge */}
            {classLabel && (
              <span
                className="inline-flex items-center text-[10px] font-bold px-2 py-0.5 rounded-full mt-1"
                style={{ background: classBg, color: classColor, border: `1px solid ${classColor}40` }}
              >
                {classLabel}
              </span>
            )}
          </div>
        </div>
        {/* Impact badge */}
        <span
          className="inline-flex items-center text-xs font-bold px-2.5 py-1 rounded-lg flex-shrink-0"
          style={{ background: bg, color, border: `1px solid ${color}40` }}
        >
          {impact} Impact
        </span>
      </div>

      {/* What We Found */}
      <div className="space-y-1.5">
        <p
          className="text-[11px] font-bold uppercase tracking-widest"
          style={{ color: 'rgba(180,140,75,0.7)' }}
        >
          What We Found
        </p>
        <p
          className="text-sm sm:text-base leading-relaxed"
          style={{ color: 'rgba(240,230,210,0.9)' }}
        >
          {card.whatWeFound}
        </p>
      </div>

      {/* Why It Matters */}
      {card.whyItMatters ? (
        <div className="space-y-1.5">
          <p
            className="text-[11px] font-bold uppercase tracking-widest"
            style={{ color: 'rgba(180,140,75,0.7)' }}
          >
            Why It Matters
          </p>
          <p
            className="text-sm sm:text-base leading-relaxed"
            style={{ color: 'rgba(224,216,200,0.8)' }}
          >
            {card.whyItMatters}
          </p>
        </div>
      ) : null}

      {/* Recommended Action */}
      <div
        className="p-4 rounded-xl space-y-1.5"
        style={{
          background: 'rgba(180,140,75,0.07)',
          border: '1px solid rgba(180,140,75,0.18)',
        }}
      >
        <p
          className="text-[11px] font-bold uppercase tracking-widest"
          style={{ color: 'rgba(180,140,75,0.7)' }}
        >
          Recommended Action
        </p>
        <p
          className="text-sm sm:text-base leading-relaxed font-medium"
          style={{ color: '#F5F1E7' }}
        >
          {card.recommendedAction}
        </p>
      </div>

      {/* Specific Suggestions */}
      {card.suggestions?.length > 0 ? (
        <div className="space-y-2">
          <p
            className="text-[11px] font-bold uppercase tracking-widest"
            style={{ color: 'rgba(180,140,75,0.7)' }}
          >
            Specific Suggestions
          </p>
          <ul className="space-y-1.5">
            {card.suggestions.map((s, i) => (
              <li
                key={i}
                className="flex items-center gap-2 text-sm"
                style={{ color: 'rgba(224,216,200,0.85)' }}
              >
                <ChevronRight className="w-3.5 h-3.5 flex-shrink-0" style={{ color: 'rgba(180,140,75,0.6)' }} />
                {s}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {/* ── Action Buttons — vary by recommendation class ────────────────── */}
      {recClass === RECOMMENDATION_CLASS.AUTO_FIX && (
        <>
          <div className="flex flex-col sm:flex-row gap-2.5 pt-1">
            <button
              type="button"
              onClick={onApplyFix}
              title="Opens the relevant module — apply the fix there"
              className="flex-1 flex items-center justify-center gap-2 py-3 px-4 text-sm font-semibold rounded-xl transition-all hover:opacity-90 active:scale-[0.98]"
              style={{
                background: 'linear-gradient(135deg, rgba(74,124,92,0.4), rgba(74,124,92,0.22))',
                border: '1px solid rgba(74,124,92,0.55)',
                color: '#6aab80',
              }}
            >
              <span>✅</span>
              Apply Fix
            </button>
            <button
              type="button"
              onClick={onReviewDetails}
              title="Ask Curator for a detailed explanation of this recommendation"
              className="flex-1 flex items-center justify-center gap-2 py-3 px-4 text-sm font-semibold rounded-xl transition-all hover:opacity-90 active:scale-[0.98]"
              style={{
                background: 'linear-gradient(135deg, rgba(74,124,156,0.3), rgba(74,124,156,0.15))',
                border: '1px solid rgba(74,124,156,0.45)',
                color: '#6aabc0',
              }}
            >
              <Eye className="w-4 h-4" />
              Review Details
            </button>
            <button
              type="button"
              onClick={onAskCurator}
              title="Open a conversation about this recommendation"
              className="flex-1 flex items-center justify-center gap-2 py-3 px-4 text-sm font-semibold rounded-xl transition-all hover:opacity-90 active:scale-[0.98]"
              style={{
                background: 'linear-gradient(135deg, rgba(139,94,58,0.3), rgba(100,65,40,0.18))',
                border: '1px solid rgba(139,94,58,0.45)',
                color: '#D4956A',
              }}
            >
              <MessageCircle className="w-4 h-4" />
              Ask Curator
            </button>
          </div>
          <p className="text-[11px]" style={{ color: 'rgba(224,216,200,0.35)' }}>
            Apply Fix navigates to the relevant module where you can complete the change. Review Details asks the Curator to explain what will change before you act.
          </p>
        </>
      )}

      {recClass === RECOMMENDATION_CLASS.ADVISORY && (
        <>
          <div className="flex flex-col sm:flex-row gap-2.5 pt-1">
            <button
              type="button"
              onClick={() => { setLocalAcknowledged(true); if (onAcknowledge) onAcknowledge(card); }}
              title="Mark this insight as reviewed — no data will change"
              className="flex-1 flex items-center justify-center gap-2 py-3 px-4 text-sm font-semibold rounded-xl transition-all hover:opacity-90 active:scale-[0.98]"
              style={{
                background: 'linear-gradient(135deg, rgba(74,124,92,0.35), rgba(74,124,92,0.18))',
                border: '1px solid rgba(74,124,92,0.5)',
                color: '#6aab80',
              }}
            >
              <CheckCircle2 className="w-4 h-4" />
              Acknowledge
            </button>
            <button
              type="button"
              onClick={onViewItems}
              title="Open the relevant section of your collection"
              className="flex-1 flex items-center justify-center gap-2 py-3 px-4 text-sm font-semibold rounded-xl transition-all hover:opacity-90 active:scale-[0.98]"
              style={{
                background: 'linear-gradient(135deg, rgba(74,124,156,0.3), rgba(74,124,156,0.15))',
                border: '1px solid rgba(74,124,156,0.45)',
                color: '#6aabc0',
              }}
            >
              <Eye className="w-4 h-4" />
              View Items
            </button>
            <button
              type="button"
              onClick={onAskCurator}
              title="Discuss this insight with the Curator"
              className="flex-1 flex items-center justify-center gap-2 py-3 px-4 text-sm font-semibold rounded-xl transition-all hover:opacity-90 active:scale-[0.98]"
              style={{
                background: 'linear-gradient(135deg, rgba(139,94,58,0.3), rgba(100,65,40,0.18))',
                border: '1px solid rgba(139,94,58,0.45)',
                color: '#D4956A',
              }}
            >
              <MessageCircle className="w-4 h-4" />
              Ask Curator
            </button>
          </div>
          <p className="text-[11px]" style={{ color: 'rgba(224,216,200,0.35)' }}>
            Acknowledge marks this insight as reviewed — no data in your collection will change. View Items opens the relevant module so you can act on your own terms.
          </p>
        </>
      )}

      {recClass === RECOMMENDATION_CLASS.MULTI_PATH && (
        <>
          <div className="flex flex-col sm:flex-row gap-2.5 pt-1">
            <button
              type="button"
              onClick={() => { setLocalAcknowledged(true); if (onAcknowledge) onAcknowledge(card); }}
              title="Defer this recommendation without taking action"
              className="flex-1 flex items-center justify-center gap-2 py-3 px-4 text-sm font-semibold rounded-xl transition-all hover:opacity-90 active:scale-[0.98]"
              style={{
                background: 'linear-gradient(135deg, rgba(80,65,50,0.35), rgba(65,50,38,0.2))',
                border: '1px solid rgba(120,90,65,0.45)',
                color: 'rgba(224,200,170,0.8)',
              }}
            >
              <CheckCircle2 className="w-4 h-4" />
              Acknowledge
            </button>
            <button
              type="button"
              onClick={onAskForMoreInfo}
              title="Ask Curator to explain the rationale and evidence behind this suggestion"
              className="flex-1 flex items-center justify-center gap-2 py-3 px-4 text-sm font-semibold rounded-xl transition-all hover:opacity-90 active:scale-[0.98]"
              style={{
                background: 'linear-gradient(135deg, rgba(74,124,156,0.3), rgba(74,124,156,0.15))',
                border: '1px solid rgba(74,124,156,0.45)',
                color: '#6aabc0',
              }}
            >
              <HelpCircle className="w-4 h-4" />
              Ask for More Info
            </button>
            <button
              type="button"
              onClick={onTreatIndividually}
              title="Review and decide on each item one by one"
              className="flex-1 flex items-center justify-center gap-2 py-3 px-4 text-sm font-semibold rounded-xl transition-all hover:opacity-90 active:scale-[0.98]"
              style={{
                background: 'linear-gradient(135deg, rgba(139,94,58,0.35), rgba(100,65,40,0.2))',
                border: '1px solid rgba(139,94,58,0.5)',
                color: '#D4956A',
              }}
            >
              <SplitSquareVertical className="w-4 h-4" />
              Treat Individually
            </button>
          </div>
          <p className="text-[11px]" style={{ color: 'rgba(224,216,200,0.35)' }}>
            Acknowledge defers without action. Ask for More Info explains why this was suggested. Treat Individually opens a per-item review so you can decide on each one separately.
          </p>
        </>
      )}
    </div>
  );
}

// ─── TreatIndividuallyModal ───────────────────────────────────────────────────

function TreatIndividuallyModal({ card, onClose, onAskCurator, navigate }) {
  const items = card?.candidateItems || [];
  const [skipped, setSkipped] = useState({});

  if (!card) return null;

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        className="max-w-xl max-h-[85vh] overflow-y-auto"
        style={{
          background: 'linear-gradient(145deg, rgba(38,26,16,0.99), rgba(28,19,12,0.99))',
          border: '1px solid rgba(140,105,65,0.3)',
        }}
      >
        <DialogHeader>
          <DialogTitle
            className="text-lg font-bold"
            style={{ color: '#F5F1E7', fontFamily: "'Georgia', serif" }}
          >
            Treat Individually — {card.title}
          </DialogTitle>
          <DialogDescription className="text-sm" style={{ color: 'rgba(224,216,200,0.6)' }}>
            Review each item below and decide individually. No changes are applied until you act on each one.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 mt-2">
          {items.length === 0 ? (
            <p className="text-sm text-center py-6" style={{ color: 'rgba(224,216,200,0.5)' }}>
              No individual items available for this recommendation.
            </p>
          ) : (
            items.map((item) => {
              const isSkipped = !!skipped[item.id];
              return (
                <div
                  key={item.id}
                  className="rounded-xl p-4"
                  style={{
                    background: isSkipped ? 'rgba(20,14,10,0.4)' : 'rgba(42,30,20,0.7)',
                    border: `1px solid ${isSkipped ? 'rgba(140,105,65,0.08)' : 'rgba(140,105,65,0.22)'}`,
                    opacity: isSkipped ? 0.5 : 1,
                  }}
                >
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div>
                      <p className="font-semibold text-sm" style={{ color: '#F5F1E7' }}>
                        {item.name}
                      </p>
                      {item.currentSpecialization != null && (
                        <p className="text-xs mt-0.5" style={{ color: 'rgba(224,216,200,0.5)' }}>
                          Current specialization: {item.currentSpecialization || 'None set'}
                        </p>
                      )}
                      {item.suggestedSpecialization && (
                        <p className="text-xs mt-0.5" style={{ color: 'rgba(212,165,116,0.85)' }}>
                          Suggested: {item.suggestedSpecialization}
                        </p>
                      )}
                      {item.rationale && (
                        <p className="text-xs mt-1 leading-relaxed" style={{ color: 'rgba(224,216,200,0.6)' }}>
                          {item.rationale}
                        </p>
                      )}
                    </div>
                  </div>

                  {!isSkipped && (
                    <div className="flex flex-wrap gap-2 mt-3">
                      {item.detailUrl && (
                        <button
                          type="button"
                          onClick={() => { onClose(); navigate(item.detailUrl); }}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all hover:opacity-90"
                          style={{
                            background: 'rgba(74,124,92,0.25)',
                            border: '1px solid rgba(74,124,92,0.45)',
                            color: '#6aab80',
                          }}
                        >
                          <ExternalLink className="w-3 h-3" />
                          Go to {item.type || 'Item'}
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => {
                          if (onAskCurator) {
                            onAskCurator(`Tell me more about the ${card.title} suggestion for "${item.name}". ${item.rationale || ''}`);
                          }
                          onClose();
                        }}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all hover:opacity-90"
                        style={{
                          background: 'rgba(139,94,58,0.2)',
                          border: '1px solid rgba(139,94,58,0.4)',
                          color: '#D4956A',
                        }}
                      >
                        <MessageCircle className="w-3 h-3" />
                        Ask Curator
                      </button>
                      <button
                        type="button"
                        onClick={() => setSkipped((prev) => ({ ...prev, [item.id]: true }))}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all hover:opacity-90"
                        style={{
                          background: 'rgba(80,60,45,0.18)',
                          border: '1px solid rgba(120,90,65,0.3)',
                          color: 'rgba(224,216,200,0.5)',
                        }}
                      >
                        Skip
                      </button>
                    </div>
                  )}

                  {isSkipped && (
                    <button
                      type="button"
                      onClick={() => setSkipped((prev) => { const n = { ...prev }; delete n[item.id]; return n; })}
                      className="text-xs underline mt-1 hover:opacity-80"
                      style={{ color: 'rgba(180,140,75,0.5)' }}
                    >
                      Undo skip
                    </button>
                  )}
                </div>
              );
            })
          )}
        </div>

        <div className="mt-4 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-sm font-semibold"
            style={{
              background: 'rgba(120,90,65,0.2)',
              border: '1px solid rgba(120,90,65,0.35)',
              color: 'rgba(224,216,200,0.75)',
            }}
          >
            Close
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── SectionGroup ─────────────────────────────────────────────────────────────

function SectionGroup({
  emoji,
  title,
  cards,
  onApplyFix,
  onReviewDetails,
  onAskCurator,
  onAcknowledge,
  onViewItems,
  onAskForMoreInfo,
  onTreatIndividually,
}) {
  if (!cards.length) return null;
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <span className="text-lg">{emoji}</span>
        <h2
          className="text-base sm:text-lg font-bold"
          style={{ color: '#F5F1E7', fontFamily: "'Georgia', serif" }}
        >
          {title}
        </h2>
        <span
          className="text-xs font-semibold px-2 py-0.5 rounded-full"
          style={{ background: 'rgba(180,140,75,0.12)', color: 'rgba(180,140,75,0.8)', border: '1px solid rgba(180,140,75,0.2)' }}
        >
          {cards.length}
        </span>
      </div>
      <div className="space-y-4">
        {cards.map((card) => (
          <RecommendationCard
            key={card.id}
            card={card}
            onApplyFix={() => onApplyFix(card)}
            onReviewDetails={() => onReviewDetails(card)}
            onAskCurator={() => onAskCurator(card)}
            onAcknowledge={() => onAcknowledge && onAcknowledge(card)}
            onViewItems={() => onViewItems && onViewItems(card)}
            onAskForMoreInfo={() => onAskForMoreInfo && onAskForMoreInfo(card)}
            onTreatIndividually={() => onTreatIndividually && onTreatIndividually(card)}
          />
        ))}
      </div>
    </div>
  );
}

// ─── CuratorOptimizePanel ─────────────────────────────────────────────────────

export default function CuratorOptimizePanel({
  pipes = [],
  blends = [],
  cigars = [],
  bottles = [],
  smokeLogs = [],
  onClose,
  onAskCurator,
}) {
  const navigate = useNavigate();
  const [activeModule, setActiveModule] = useState('all');
  const [confirmCard, setConfirmCard] = useState(null);
  const [treatIndividuallyCard, setTreatIndividuallyCard] = useState(null);
  const triggerElementRef = React.useRef(null);

  // Capture the element that had focus when the panel mounted so we can
  // restore focus to it when the panel is dismissed.
  React.useEffect(() => {
    triggerElementRef.current = document.activeElement;
  }, []);

  function handleClose() {
    if (onClose) {
      onClose();
      // Restore focus to the element that opened the panel
      if (triggerElementRef.current && typeof triggerElementRef.current.focus === 'function') {
        requestAnimationFrame(() => triggerElementRef.current.focus());
      }
    }
  }

  // Build latest log map (same as OptimizeModal)
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

  // Core insights
  const allInsights = useMemo(
    () => generateProactiveInsights({ pipes, blends, latestLogByPipe }),
    [pipes, blends, latestLogByPipe]
  );

  // Quick Win cards
  const quickWinCards = useMemo(() => {
    const cards = [];
    const pipesNoPhoto = pipes.filter((p) => !p.photos?.length && !p.photo);
    if (pipesNoPhoto.length > 0) {
      cards.push({
        id: 'qw_pipes_no_photo',
        title: 'Pipes Missing Photos',
        whatWeFound: `${pipesNoPhoto.length} ${plural(pipesNoPhoto.length, 'pipe')} in your collection ${has(pipesNoPhoto.length)} no photos.`,
        whyItMatters: 'Photos improve collection presentation and help the AI identification feature work better.',
        recommendedAction: "Add photos to capture each pipe's visual details and condition.",
        severity: INSIGHT_SEVERITY.LOW,
        module: 'pipe',
        suggestions: [],
        recommendationClass: RECOMMENDATION_CLASS.AUTO_FIX,
      });
    }
    const blendsNoType = blends.filter((b) => !b.blend_type && !b.blend_family);
    if (blendsNoType.length > 0) {
      cards.push({
        id: 'qw_blends_no_type',
        title: 'Blends Without Family Classification',
        whatWeFound: `${blendsNoType.length} ${plural(blendsNoType.length, 'blend')} ${has(blendsNoType.length)} no blend family assigned.`,
        whyItMatters: 'Blend family is required for diversity analysis and pairing suggestions.',
        recommendedAction: 'Open each blend and set the blend family (Virginia, Burley, Latakia, etc.).',
        severity: INSIGHT_SEVERITY.MEDIUM,
        module: 'tobacco',
        suggestions: [],
        recommendationClass: RECOMMENDATION_CLASS.AUTO_FIX,
      });
    }
    const cigarsNoSize = cigars.filter((c) => !c.vitola && !c.size && !c.ring_gauge);
    if (cigarsNoSize.length > 0) {
      cards.push({
        id: 'qw_cigars_no_size',
        title: 'Cigars Missing Size Details',
        whatWeFound: `${cigarsNoSize.length} ${plural(cigarsNoSize.length, 'cigar')} ${is(cigarsNoSize.length)} missing vitola or size information.`,
        whyItMatters: 'Vitola and ring gauge data enable better categorization and balance analysis.',
        recommendedAction: 'Add vitola or size data to complete your cigar profiles.',
        severity: INSIGHT_SEVERITY.LOW,
        module: 'cigar',
        suggestions: [],
        recommendationClass: RECOMMENDATION_CLASS.AUTO_FIX,
      });
    }
    const bottlesNoType = bottles.filter((b) => !b.whiskey_type && !b.spirit_type && !b.category);
    if (bottlesNoType.length > 0) {
      cards.push({
        id: 'qw_bottles_no_type',
        title: 'Bottles Without Spirit Type',
        whatWeFound: `${bottlesNoType.length} ${plural(bottlesNoType.length, 'bottle')} ${is(bottlesNoType.length)} missing spirit type classification.`,
        whyItMatters: 'Spirit type is needed for whiskey collection diversity and flavor analysis.',
        recommendedAction: 'Classify each bottle with its spirit type (Scotch, Bourbon, Irish, etc.).',
        severity: INSIGHT_SEVERITY.LOW,
        module: 'whiskey',
        suggestions: [],
        recommendationClass: RECOMMENDATION_CLASS.AUTO_FIX,
      });
    }
    return cards;
  }, [pipes, blends, cigars, bottles]);

  // Reclassify cards
  const reclassifyCards = useMemo(() => {
    const cards = [];
    const pipesNoShape = pipes.filter((p) => !p.shape && !p.pipe_shape);
    if (pipesNoShape.length > 0) {
      cards.push({
        id: 'rc_pipe_shape',
        title: 'Pipe Shapes Not Specified',
        whatWeFound: `${pipesNoShape.length} ${plural(pipesNoShape.length, 'pipe')} ${is(pipesNoShape.length)} missing a shape classification.`,
        whyItMatters: 'Pipe shape affects pairing recommendations — certain shapes suit specific tobacco types.',
        recommendedAction: 'Review these pipes and assign their correct shape (billiard, bent, bulldog, etc.).',
        severity: INSIGHT_SEVERITY.LOW,
        module: 'pipe',
        suggestions: [],
        recommendationClass: RECOMMENDATION_CLASS.AUTO_FIX,
      });
    }
    const pipesGeneric = pipes.filter((p) => p.pipe_type === 'Other' || p.material === 'Other');
    if (pipesGeneric.length > 0) {
      cards.push({
        id: 'rc_pipe_generic',
        title: 'Pipes Using Generic "Other" Classification',
        whatWeFound: `${pipesGeneric.length} ${plural(pipesGeneric.length, 'pipe')} ${uses(pipesGeneric.length)} a generic "Other" type or material.`,
        whyItMatters: "Specific classifications improve the Curator's ability to make tailored recommendations.",
        recommendedAction: 'Update these pipes with more specific type or material values.',
        severity: INSIGHT_SEVERITY.LOW,
        module: 'pipe',
        suggestions: [],
        recommendationClass: RECOMMENDATION_CLASS.AUTO_FIX,
      });
    }
    const blendsUnknown = blends.filter(
      (b) => b.blend_type === 'Unknown' || b.blend_family === 'Unknown'
    );
    if (blendsUnknown.length > 0) {
      cards.push({
        id: 'rc_blend_unknown',
        title: 'Blends Classified as Unknown',
        whatWeFound: `${blendsUnknown.length} ${plural(blendsUnknown.length, 'blend')} ${is(blendsUnknown.length)} classified as "Unknown" type.`,
        whyItMatters: 'Unknown classifications reduce the effectiveness of diversity and rotation analysis.',
        recommendedAction: 'Research and update the blend family for these blends.',
        severity: INSIGHT_SEVERITY.MEDIUM,
        module: 'tobacco',
        suggestions: [],
        recommendationClass: RECOMMENDATION_CLASS.AUTO_FIX,
      });
    }
    const cigarsNoWrapper = cigars.filter((c) => !c.wrapper && !c.wrapper_country);
    if (cigarsNoWrapper.length > 0) {
      cards.push({
        id: 'rc_cigar_wrapper',
        title: 'Cigars Missing Wrapper Details',
        whatWeFound: `${cigarsNoWrapper.length} ${plural(cigarsNoWrapper.length, 'cigar')} ${is(cigarsNoWrapper.length)} missing wrapper leaf or country of origin.`,
        whyItMatters: 'Wrapper information is key for flavor profile analysis and regional recommendations.',
        recommendedAction: 'Add wrapper details to enable complete flavor and region analysis.',
        severity: INSIGHT_SEVERITY.LOW,
        module: 'cigar',
        suggestions: [],
        recommendationClass: RECOMMENDATION_CLASS.AUTO_FIX,
      });
    }
    const bottlesNoDistillery = bottles.filter((b) => !b.distillery && !b.producer && !b.brand);
    if (bottlesNoDistillery.length > 0) {
      cards.push({
        id: 'rc_bottle_distillery',
        title: 'Bottles Missing Producer/Distillery',
        whatWeFound: `${bottlesNoDistillery.length} ${plural(bottlesNoDistillery.length, 'bottle')} ${is(bottlesNoDistillery.length)} missing distillery or producer details.`,
        whyItMatters: 'Distillery data helps build a more accurate profile of your whiskey collection.',
        recommendedAction: 'Add the distillery or producer name for each bottle.',
        severity: INSIGHT_SEVERITY.LOW,
        module: 'whiskey',
        suggestions: [],
        recommendationClass: RECOMMENDATION_CLASS.AUTO_FIX,
      });
    }
    return cards;
  }, [pipes, blends, cigars, bottles]);

  // Pipe specialization cards — MULTI_PATH (needs user judgment)
  const specializationCards = useMemo(() => {
    const cards = [];
    if (pipes.length === 0) return cards;

    const pipesWithoutSpecialization = pipes.filter(
      (p) => !p.focus || (Array.isArray(p.focus) ? p.focus.length === 0 : !p.focus)
    );

    if (pipesWithoutSpecialization.length > 0) {
      cards.push({
        id: 'spec_pipes_no_focus',
        title: 'Pipe Specialization Opportunities',
        whatWeFound: `${pipesWithoutSpecialization.length} ${plural(pipesWithoutSpecialization.length, 'pipe')} ${has(pipesWithoutSpecialization.length)} no specialization set. Specialization helps the Curator match pipes to the right blends and sessions.`,
        whyItMatters: 'Pipe specialization guides pairing recommendations, session planning, and collection strategy. Assigning a focus (e.g. Aromatic, English, Virginia) improves suggestion quality.',
        recommendedAction: 'Review each pipe and consider assigning a specialization that reflects how you use it.',
        severity: INSIGHT_SEVERITY.LOW,
        module: 'pipe',
        suggestions: [],
        recommendationClass: RECOMMENDATION_CLASS.MULTI_PATH,
        // Candidate items for Treat Individually workflow
        candidateItems: pipesWithoutSpecialization.map((p) => ({
          id: p.id,
          name: p.name || 'Unnamed Pipe',
          type: 'Pipe',
          currentSpecialization: Array.isArray(p.focus) ? p.focus.join(', ') : (p.focus || null),
          suggestedSpecialization: null,
          rationale: 'No specialization is currently set. Use the pipe detail page to assign a focus based on the tobacco types you enjoy in this pipe.',
          detailUrl: createPageUrl(`PipeDetail?id=${encodeURIComponent(p.id)}`),
        })),
      });
    }

    return cards;
  }, [pipes]);

  // All cards combined
  const allCards = useMemo(
    () => [
      ...allInsights.map(insightToCard),
      ...quickWinCards,
      ...reclassifyCards,
      ...specializationCards,
    ],
    [allInsights, quickWinCards, reclassifyCards, specializationCards]
  );

  // Filter by active module
  const filteredCards = useMemo(() => {
    if (activeModule === 'all') return allCards;
    return allCards.filter((card) => {
      const mk = getModuleKey(card);
      return mk === activeModule;
    });
  }, [allCards, activeModule]);

  // Group into sections
  const highImpactCards = filteredCards.filter((c) => c.severity === INSIGHT_SEVERITY.HIGH);
  const quickWinsFiltered = filteredCards.filter((c) => c.severity === INSIGHT_SEVERITY.MEDIUM);
  const optimizationCards = filteredCards.filter(
    (c) => !c.severity || c.severity === INSIGHT_SEVERITY.LOW
  );

  // Summary stats
  const totalCount = filteredCards.length;
  const highPriorityCount = highImpactCards.length;
  const quickWinsCount = quickWinsFiltered.length;

  // Handlers
  function handleApplyFix(card) {
    setConfirmCard(card);
  }

  function handleConfirmApplyFix() {
    const card = confirmCard;
    setConfirmCard(null);
    const moduleKey = getModuleKey(card);
    const route = getModuleRoute(moduleKey);
    if (route) {
      navigate(route);
    }
  }

  function handleReviewDetails(card) {
    if (onAskCurator) {
      onAskCurator(`Tell me more about this recommendation: "${card.title}". ${card.whatWeFound}`);
    }
  }

  function handleAskCuratorCard(card) {
    if (onAskCurator) {
      onAskCurator(`I'd like to discuss: "${card.title}". ${card.whatWeFound} What should I prioritize?`);
    }
  }

  function handleAcknowledge(_card) {
    // Acknowledgement is handled locally inside RecommendationCard (localAcknowledged state).
    // This callback is a hook for future persistence if needed.
  }

  function handleViewItems(card) {
    const moduleKey = getModuleKey(card);
    const route = getModuleRoute(moduleKey);
    if (route) {
      navigate(route);
    }
  }

  function handleAskForMoreInfo(card) {
    if (onAskCurator) {
      onAskCurator(`Explain the rationale and evidence behind this suggestion: "${card.title}". ${card.whatWeFound} Why is this important for my collection?`);
    }
  }

  function handleTreatIndividually(card) {
    setTreatIndividuallyCard(card);
  }

  const confirmDetails = confirmCard ? getConfirmationDetails(confirmCard) : null;

  return (
    <div
      className="rounded-2xl overflow-hidden"
      style={{
        background: 'linear-gradient(160deg, rgba(32,22,14,0.99), rgba(20,14,9,0.99))',
        border: '1px solid rgba(140,105,65,0.22)',
        boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
      }}
    >
      {/* ── Sticky Header ─────────────────────────────────────────────────── */}
      <div
        className="sticky top-0 z-10 px-5 pt-5 pb-4"
        style={{
          background: 'linear-gradient(160deg, rgba(32,22,14,0.99), rgba(20,14,9,0.98))',
          borderBottom: '1px solid rgba(140,105,65,0.15)',
          backdropFilter: 'blur(8px)',
        }}
      >
        <div className="flex items-start justify-between gap-3 mb-3">
          <div>
            <h1
              className="text-xl sm:text-2xl font-bold leading-tight"
              style={{ color: '#F5F1E7', fontFamily: "'Georgia', serif" }}
            >
              Optimize Your Collection
            </h1>
            <p
              className="text-sm mt-1"
              style={{ color: 'rgba(224,216,200,0.6)' }}
            >
              AI-driven insights across your entire collection
            </p>
          </div>
          {onClose && (
            <button
              type="button"
              onClick={handleClose}
              className="p-2 rounded-lg transition-all hover:opacity-80 flex-shrink-0"
              style={{
                background: 'rgba(120,90,65,0.15)',
                border: '1px solid rgba(120,90,65,0.25)',
                color: 'rgba(224,216,200,0.6)',
              }}
              aria-label="Close optimize panel"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Module toggle pills */}
        <div className="flex flex-wrap gap-2">
          {MODULE_PILLS.map((pill) => {
            const isActive = activeModule === pill.key;
            return (
              <button
                key={pill.key}
                type="button"
                onClick={() => setActiveModule(pill.key)}
                className="px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all"
                style={{
                  background: isActive
                    ? 'rgba(163,92,92,0.28)'
                    : 'rgba(255,255,255,0.05)',
                  border: isActive
                    ? '1px solid rgba(163,92,92,0.55)'
                    : '1px solid rgba(120,90,65,0.2)',
                  color: isActive ? '#F5F1E7' : 'rgba(224,216,200,0.5)',
                }}
              >
                {pill.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Summary Bar ───────────────────────────────────────────────────── */}
      {totalCount > 0 && (
        <div
          className="px-5 py-4 grid grid-cols-3 gap-3"
          style={{ borderBottom: '1px solid rgba(140,105,65,0.12)' }}
        >
          {[
            { label: 'Total Recommendations', value: totalCount, color: 'rgba(224,216,200,0.8)' },
            { label: 'High Priority', value: highPriorityCount, color: '#E05252' },
            { label: 'Quick Wins', value: quickWinsCount, color: '#C89752' },
          ].map(({ label, value, color }) => (
            <div
              key={label}
              className="text-center py-3 rounded-xl"
              style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(140,105,65,0.1)' }}
            >
              <div
                className="text-2xl sm:text-3xl font-bold mb-1"
                style={{ color, fontFamily: "'Georgia', serif" }}
              >
                {value}
              </div>
              <div className="text-[10px] sm:text-xs font-medium" style={{ color: 'rgba(224,216,200,0.5)' }}>
                {label}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Recommendation Sections ────────────────────────────────────────── */}
      <div className="px-5 py-6 space-y-8">
        {totalCount === 0 ? (
          <div
            className="rounded-2xl p-8 text-center"
            style={{
              background: 'linear-gradient(145deg, rgba(42,30,20,0.9), rgba(28,19,13,0.95))',
              border: '1px solid rgba(74,124,92,0.25)',
            }}
          >
            <CheckCircle2 className="w-10 h-10 mx-auto mb-3" style={{ color: '#4A7C59' }} />
            <p
              className="text-base font-semibold mb-1"
              style={{ color: '#F5F1E7', fontFamily: "'Georgia', serif" }}
            >
              Collection Well Optimized
            </p>
            <p className="text-sm" style={{ color: 'rgba(224,216,200,0.55)' }}>
              No immediate actions needed for the selected filter.
            </p>
          </div>
        ) : (
          <>
            <SectionGroup
              emoji="🔴"
              title="High Impact Fixes"
              cards={highImpactCards}
              onApplyFix={handleApplyFix}
              onReviewDetails={handleReviewDetails}
              onAskCurator={handleAskCuratorCard}
              onAcknowledge={handleAcknowledge}
              onViewItems={handleViewItems}
              onAskForMoreInfo={handleAskForMoreInfo}
              onTreatIndividually={handleTreatIndividually}
            />
            <SectionGroup
              emoji="🟡"
              title="Quick Wins"
              cards={quickWinsFiltered}
              onApplyFix={handleApplyFix}
              onReviewDetails={handleReviewDetails}
              onAskCurator={handleAskCuratorCard}
              onAcknowledge={handleAcknowledge}
              onViewItems={handleViewItems}
              onAskForMoreInfo={handleAskForMoreInfo}
              onTreatIndividually={handleTreatIndividually}
            />
            <SectionGroup
              emoji="🧠"
              title="Optimization Opportunities"
              cards={optimizationCards}
              onApplyFix={handleApplyFix}
              onReviewDetails={handleReviewDetails}
              onAskCurator={handleAskCuratorCard}
              onAcknowledge={handleAcknowledge}
              onViewItems={handleViewItems}
              onAskForMoreInfo={handleAskForMoreInfo}
              onTreatIndividually={handleTreatIndividually}
            />
          </>
        )}
      </div>

      {/* ── Apply Fix Confirmation Modal ───────────────────────────────────── */}
      <AlertDialog open={!!confirmCard} onOpenChange={(open) => !open && setConfirmCard(null)}>
        <AlertDialogContent
          style={{
            background: 'linear-gradient(145deg, rgba(38,26,16,0.99), rgba(28,19,12,0.99))',
            border: '1px solid rgba(140,105,65,0.3)',
          }}
        >
          <AlertDialogHeader>
            <AlertDialogTitle
              className="text-lg font-bold"
              style={{ color: '#F5F1E7', fontFamily: "'Georgia', serif" }}
            >
              Apply Recommendation?
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-4 mt-2">
                {confirmCard && (
                  <>
                    <p className="text-sm font-semibold" style={{ color: 'rgba(240,230,210,0.9)' }}>
                      "{confirmCard.title}"
                    </p>
                    <div
                      className="rounded-xl p-4 space-y-2"
                      style={{
                        background: 'rgba(180,140,75,0.07)',
                        border: '1px solid rgba(180,140,75,0.2)',
                      }}
                    >
                      <p
                        className="text-xs font-bold uppercase tracking-widest mb-2"
                        style={{ color: 'rgba(180,140,75,0.7)' }}
                      >
                        This will:
                      </p>
                      {confirmDetails?.changes.map((change, i) => (
                        <div key={i} className="flex items-start gap-2">
                          <span style={{ color: 'rgba(180,140,75,0.7)' }}>•</span>
                          <p className="text-sm" style={{ color: 'rgba(224,216,200,0.85)' }}>
                            {change}
                          </p>
                        </div>
                      ))}
                      <div className="flex items-start gap-2 pt-1">
                        <span style={{ color: 'rgba(180,140,75,0.7)' }}>•</span>
                        <p className="text-sm" style={{ color: 'rgba(224,216,200,0.85)' }}>
                          Module affected: <span style={{ color: '#F5F1E7', fontWeight: 600 }}>{confirmDetails?.affectedModule}</span>
                        </p>
                      </div>
                    </div>
                    <p className="text-xs" style={{ color: 'rgba(224,216,200,0.45)' }}>
                      No data will be modified without your confirmation in the destination view.
                    </p>
                  </>
                )}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2">
            <AlertDialogCancel
              className="rounded-xl text-sm"
              style={{
                background: 'rgba(120,90,65,0.2)',
                border: '1px solid rgba(120,90,65,0.35)',
                color: 'rgba(224,216,200,0.75)',
              }}
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmApplyFix}
              className="rounded-xl text-sm font-semibold"
              style={{
                background: 'linear-gradient(135deg, rgba(74,124,92,0.5), rgba(74,124,92,0.3))',
                border: '1px solid rgba(74,124,92,0.6)',
                color: '#6aab80',
              }}
            >
              Confirm & Continue
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ── Treat Individually Modal ───────────────────────────────────────── */}
      {treatIndividuallyCard && (
        <TreatIndividuallyModal
          card={treatIndividuallyCard}
          onClose={() => setTreatIndividuallyCard(null)}
          onAskCurator={onAskCurator}
          navigate={navigate}
        />
      )}
    </div>
  );
}
