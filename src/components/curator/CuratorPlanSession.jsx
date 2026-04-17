import React, { useMemo, useState } from 'react';
import { Calendar, HelpCircle, RefreshCw, CheckCircle2 } from 'lucide-react';
import { buildSessionPlan } from '@/lib/curator/sessionPlanner.js';

// ─── Module filter pills ───────────────────────────────────────────────────────

const MODULE_COLORS = {
  whiskey: { bg: 'rgba(74,124,156,0.12)', text: 'rgba(120,170,220,0.9)', border: 'rgba(74,124,156,0.25)', label: 'Whiskey' },
  tobacco: { bg: 'rgba(74,124,92,0.12)',  text: 'rgba(100,180,130,0.9)', border: 'rgba(74,124,92,0.25)',  label: 'Tobacco' },
  pipe:    { bg: 'rgba(180,140,75,0.12)', text: 'rgba(212,165,116,1)',   border: 'rgba(180,140,75,0.26)', label: 'Pipe' },
  cigar:   { bg: 'rgba(180,100,50,0.12)', text: 'rgba(220,140,90,0.9)', border: 'rgba(180,100,50,0.25)', label: 'Cigar' },
};

function ModulePill({ moduleKey, active, onClick }) {
  const mc = MODULE_COLORS[moduleKey] || MODULE_COLORS.tobacco;
  return (
    <button
      type="button"
      onClick={onClick}
      className="h-11 px-5 rounded-full text-[15px] font-medium transition"
      style={{
        background: active ? mc.bg : 'transparent',
        color: active ? mc.text : '#C8B898',
        border: active ? `1px solid ${mc.border}` : '1px solid rgba(255,255,255,0.10)',
      }}
    >
      {mc.label}
    </button>
  );
}

// ─── Session candidate card ────────────────────────────────────────────────────

function SessionCard({ candidate, onBuildSession, onAskCurator }) {
  const mc = MODULE_COLORS[candidate.moduleKey] || MODULE_COLORS.tobacco;

  return (
    <div
      style={{
        background: 'linear-gradient(145deg, #17171A 0%, #111113 100%)',
        border: '1px solid rgba(255,255,255,0.06)',
        boxShadow: '0 4px 20px rgba(0,0,0,0.35)',
        borderRadius: '18px',
        padding: '24px',
      }}
    >
      {/* Header chips */}
      <div className="flex items-center gap-2 mb-3 flex-wrap">
        <span
          style={{
            background: mc.bg,
            color: mc.text,
            border: `1px solid ${mc.border}`,
            fontSize: '13px',
            fontWeight: 600,
            padding: '2px 10px',
            borderRadius: '999px',
          }}
        >
          {mc.label}
        </span>
        {candidate.whyNow && (
          <span
            style={{
              background: 'rgba(255,255,255,0.05)',
              color: '#A1A1AA',
              fontSize: '13px',
              fontWeight: 500,
              padding: '2px 10px',
              borderRadius: '999px',
            }}
          >
            {candidate.whyNow}
          </span>
        )}
        {candidate.whatToExpect && (
          <span
            style={{
              background: 'rgba(255,255,255,0.04)',
              color: '#71717A',
              fontSize: '12px',
              fontWeight: 500,
              padding: '2px 10px',
              borderRadius: '999px',
              border: '1px solid rgba(255,255,255,0.06)',
            }}
          >
            {candidate.whatToExpect}
          </span>
        )}
      </div>

      {/* Title */}
      <p style={{ color: '#F5F5F7', fontSize: '18px', fontWeight: 600, lineHeight: 1.3, margin: '0 0 8px 0' }}>
        {candidate.title}
      </p>

      {/* Subtitle */}
      {candidate.subtitle && (
        <p style={{ color: '#71717A', fontSize: '13px', margin: '0 0 10px 0' }}>
          {candidate.subtitle}
        </p>
      )}

      {/* Reason (data-driven) */}
      <p style={{ color: '#D8D0C2', fontSize: '15px', lineHeight: 1.6, margin: '0 0 16px 0' }}>
        {candidate.reason}
      </p>

      {/* Actions */}
      <div
        style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '16px' }}
        className="flex flex-wrap items-center gap-2"
      >
        <button
          type="button"
          onClick={() => onBuildSession?.(candidate)}
          className="inline-flex items-center gap-2 px-5 h-11 rounded-xl font-medium"
          style={{ background: '#C6A15B', color: '#0B0B0C', fontSize: '14px' }}
        >
          <Calendar className="w-4 h-4" />
          Build Session
        </button>
        <button
          type="button"
          onClick={() => onAskCurator?.(candidate)}
          className="inline-flex items-center gap-2 px-4 h-11 rounded-xl font-medium"
          style={{ border: '1px solid rgba(255,255,255,0.12)', color: '#F5F5F7', fontSize: '14px' }}
        >
          <HelpCircle className="w-4 h-4" />
          Ask Curator
        </button>
      </div>
    </div>
  );
}

// ─── Empty state ───────────────────────────────────────────────────────────────

function EmptyState({ targetModule }) {
  return (
    <div className="py-16 text-center space-y-3">
      <CheckCircle2 className="w-10 h-10 mx-auto" style={{ color: 'rgba(74,124,92,0.35)' }} />
      <p className="text-sm font-semibold" style={{ color: 'rgba(224,216,200,0.6)' }}>
        No session candidates found
        {targetModule && targetModule !== 'any' ? ` for ${MODULE_COLORS[targetModule]?.label || targetModule}` : ''}
      </p>
      <p className="text-xs max-w-xs mx-auto" style={{ color: 'rgba(224,216,200,0.35)' }}>
        Add more records or log sessions to help Curator make better recommendations.
      </p>
    </div>
  );
}

// ─── Main component ────────────────────────────────────────────────────────────

/**
 * Plan Session surface.
 *
 * Works in both single-module and multi-module mode.
 * In multi-module mode, shows module filter pills so the user can target
 * whiskey-only, pipe-only, etc.
 *
 * Props:
 *   collectionContext  — full collection context object from CuratorWorkspace
 *   activeModules      — { pipekeeper, whiskeykeeper, cigarkeeper, … }
 *   onAction           — standard Curator action handler
 *   onRefresh          — refresh callback
 *   isRefreshing       — bool
 */
export default function CuratorPlanSession({
  collectionContext = {},
  activeModules = {},
  onAction,
  onRefresh,
  isRefreshing = false,
}) {
  const pipeActive    = !!activeModules.pipekeeper;
  const whiskeyActive = !!activeModules.whiskeykeeper;
  const cigarActive   = !!activeModules.cigarkeeper;

  // Build available module filters based on what is enabled
  const availableModules = useMemo(() => {
    const mods = [];
    if (whiskeyActive) mods.push('whiskey');
    if (pipeActive)    mods.push('pipe');
    if (pipeActive)    mods.push('tobacco');
    if (cigarActive)   mods.push('cigar');
    return mods;
  }, [pipeActive, whiskeyActive, cigarActive]);

  const isMultiModule = availableModules.length > 1;

  // Default target: 'any' in multi-module, or the single active module
  const defaultTarget = isMultiModule ? 'any' : (availableModules[0] || 'any');
  const [targetModule, setTargetModule] = useState(defaultTarget);

  // Map UI filter → planner target
  // 'tobacco' → 'tobacco', 'pipe' → 'pipe', 'whiskey' → 'whiskey', 'any' → 'any'
  const candidates = useMemo(
    () => buildSessionPlan(collectionContext, activeModules, targetModule),
    [collectionContext, activeModules, targetModule]
  );

  const handleBuildSession = (candidate) => {
    const name = candidate.title || candidate.item?.name || '';
    onAction?.('build_session', {
      leftItem: candidate.itemType === 'bottle' ? candidate.item : null,
      blendBridge: candidate.itemType === 'blend' ? candidate.item : null,
      cigarItem: candidate.itemType === 'cigar' ? candidate.item : null,
      title: name,
      _sessionCandidate: candidate,
    });
  };

  const handleAskCurator = (candidate) => {
    onAction?.('ask_curator', {
      title: candidate.title,
      summary: candidate.reason,
      items: [{ recordId: candidate.item?.id, recordType: candidate.itemType, recordName: candidate.title }],
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 style={{ color: '#F5F5F7', fontSize: '20px', fontWeight: 600, margin: 0 }}>
            Plan Session
          </h2>
          <p style={{ color: '#A1A1AA', fontSize: '16px', lineHeight: 1.6, marginTop: '4px' }}>
            What should you enjoy right now? Based on recency, usage, readiness, and collection balance.
          </p>
        </div>
        <button
          type="button"
          onClick={() => onRefresh?.()}
          disabled={isRefreshing}
          className="inline-flex items-center gap-2 px-4 h-10 rounded-xl font-medium"
          style={{ border: '1px solid rgba(255,255,255,0.10)', color: '#D8D0C2', opacity: isRefreshing ? 0.6 : 1 }}
        >
          <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Module filter pills — only shown in multi-module mode */}
      {isMultiModule && (
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setTargetModule('any')}
            className="h-11 px-5 rounded-full text-[15px] font-medium transition"
            style={{
              background: targetModule === 'any' ? 'rgba(198,161,91,0.18)' : 'transparent',
              color: targetModule === 'any' ? '#F5F5F7' : '#C8B898',
              border: targetModule === 'any' ? '1px solid rgba(198,161,91,0.35)' : '1px solid rgba(255,255,255,0.10)',
            }}
          >
            Any
          </button>
          {availableModules.map((mod) => (
            <ModulePill
              key={mod}
              moduleKey={mod}
              active={targetModule === mod}
              onClick={() => setTargetModule(mod)}
            />
          ))}
        </div>
      )}

      {/* Candidates */}
      {isRefreshing ? (
        <div className="py-16 text-center">
          <div className="text-[18px]" style={{ color: '#A1A1AA' }}>Loading session candidates…</div>
        </div>
      ) : candidates.length > 0 ? (
        <div className="space-y-4">
          {candidates.map((candidate) => (
            <SessionCard
              key={candidate.id}
              candidate={candidate}
              onBuildSession={handleBuildSession}
              onAskCurator={handleAskCurator}
            />
          ))}
        </div>
      ) : (
        <EmptyState targetModule={targetModule !== 'any' ? targetModule : null} />
      )}
    </div>
  );
}
