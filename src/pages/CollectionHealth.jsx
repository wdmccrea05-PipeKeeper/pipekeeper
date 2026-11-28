import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useCurrentUser } from '@/components/hooks/useCurrentUser';
import { useEnabledModules } from '@/components/hooks/useEnabledKeeperModules';
import { useTranslation } from '@/components/i18n/safeTranslation';
import useReportCenterData from '@/components/reports/useReportCenterData';
import { InsightsHeader, InsightsPageShell } from '@/components/insights/InsightsShell';
import StatStrip from '@/components/ui/StatStrip';
import FindingsReviewPanel from '@/components/actions/FindingsReviewPanel';
import useFindingStates from '@/hooks/useFindingStates';
import useScrollRestoration from '@/hooks/useScrollRestoration';
import {
  buildFindings,
  summarizeFindings,
  FINDING_TYPES,
  FINDING_TYPE_LABELS,
} from '@/lib/actions/collectionFindings';
import { resolveReturn } from '@/lib/navigation/returnTo';

const MODULE_TABS = [
  { key: '', label: 'All modules' },
  { key: 'pipekeeper', label: 'Pipes' },
  { key: 'tobacco', label: 'Tobacco' },
  { key: 'cigarkeeper', label: 'Cigars' },
  { key: 'whiskeykeeper', label: 'Whiskey' },
  { key: 'winekeeper', label: 'Wine' },
];

const DUPLICATE_ENTITIES = [
  { moduleKey: 'pipekeeper', entity: 'Pipe' },
  { moduleKey: 'tobacco', entity: 'TobaccoBlend' },
  { moduleKey: 'cigarkeeper', entity: 'Cigar' },
  { moduleKey: 'whiskeykeeper', entity: 'Bottle' },
  { moduleKey: 'winekeeper', entity: 'Wine' },
];

function initialParam(key) {
  const params = new URLSearchParams(window.location.search);
  return params.get(key) || '';
}

function Chip({ active, children, onClick, variant = 'dark' }) {
  const isPaper = variant === 'paper';
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-full px-3 py-2 text-[12.5px] font-semibold whitespace-nowrap min-h-[40px]"
      style={{
        background: active ? (isPaper ? 'rgba(167,124,63,0.18)' : 'rgba(198,161,91,0.2)') : (isPaper ? '#fbf5e9' : 'rgba(255,255,255,0.04)'),
        border: `1px solid ${active ? 'rgba(167,124,63,0.55)' : isPaper ? 'rgba(167,124,63,0.28)' : 'rgba(180,140,75,0.18)'}`,
        color: isPaper ? 'var(--ck-espresso)' : active ? '#F5F1E7' : 'rgba(224,216,200,0.75)',
      }}
    >
      {children}
    </button>
  );
}

/**
 * Collection health: the findings from the collector's own records, in one
 * review list.
 *
 * Every finding that can be fixed without inventing data carries the same action
 * card used everywhere else, so a correction here is validated, executed,
 * audited and undoable exactly like a Curator proposal. Findings that need the
 * collector's own information open the record instead.
 */
export default function CollectionHealth() {
  const { t } = useTranslation();
  const { user } = useCurrentUser();
  const { enabled, isLoading: modulesLoading } = useEnabledModules();
  const { states, setState, error: stateError } = useFindingStates(user);

  const [moduleFilter, setModuleFilter] = useState(() => initialParam('module'));
  const [typeFilter, setTypeFilter] = useState(() => initialParam('type'));
  const [showDetails, setShowDetails] = useState(() => Boolean(initialParam('type')));
  const [duplicates, setDuplicates] = useState({ groups: [], scanning: false, scanned: false });

  const origin = initialParam('origin');
  const report = initialParam('report');
  const returnLink = resolveReturn(origin, report ? { report } : {});

  useScrollRestoration(`collection-health:${moduleFilter}:${typeFilter}`);

  const effectiveModules = useMemo(
    () => ({
      pipe: Boolean(enabled.pipekeeper),
      whiskey: Boolean(enabled.whiskeykeeper),
      cigar: Boolean(enabled.cigarkeeper),
      wine: Boolean(enabled.winekeeper),
    }),
    [enabled]
  );

  const data = useReportCenterData({ user, modules: effectiveModules });

  const collections = useMemo(() => {
    const wants = (key) => !moduleFilter || moduleFilter === key;
    const list = [];
    if (enabled.pipekeeper && wants('pipekeeper')) list.push({ moduleKey: 'pipekeeper', records: data.pipes });
    if (enabled.pipekeeper && wants('tobacco')) list.push({ moduleKey: 'tobacco', records: data.blends });
    if (enabled.cigarkeeper && wants('cigarkeeper')) list.push({ moduleKey: 'cigarkeeper', records: data.cigars });
    if (enabled.whiskeykeeper && wants('whiskeykeeper')) list.push({ moduleKey: 'whiskeykeeper', records: data.bottles });
    if (enabled.winekeeper && wants('winekeeper')) list.push({ moduleKey: 'winekeeper', records: data.wines });
    return list;
  }, [enabled, moduleFilter, data.pipes, data.blends, data.cigars, data.bottles, data.wines]);

  const scanDuplicates = useCallback(async () => {
    setDuplicates((prev) => ({ ...prev, scanning: true }));
    const wanted = new Set(collections.map((entry) => entry.moduleKey));
    const targets = DUPLICATE_ENTITIES.filter((entry) => wanted.has(entry.moduleKey));

    const groups = [];
    for (const target of targets) {
      const response = await base44.functions.invoke('collectionItemDuplicates', {
        entityName: target.entity,
      });
      for (const group of response?.data?.groups || []) {
        groups.push({ moduleKey: target.moduleKey, entity: target.entity, ...group });
      }
    }
    setDuplicates({ groups, scanning: false, scanned: true });
  }, [collections]);

  // A duplicates drill-down opens the scan it was pointing at.
  useEffect(() => {
    if (typeFilter !== 'duplicate') return;
    if (duplicates.scanned || duplicates.scanning) return;
    scanDuplicates();
  }, [typeFilter, duplicates.scanned, duplicates.scanning, scanDuplicates]);

  const findings = useMemo(
    () =>
      buildFindings({
        collections,
        locations: data.locations,
        humidors: data.humidors,
        valuations: data.valuations,
        duplicateGroups: duplicates.groups,
      }),
    [collections, data.locations, data.humidors, data.valuations, duplicates.groups]
  );

  const activeFindings = useMemo(
    () => findings.filter((finding) => !['dismissed', 'resolved'].includes(states[finding.key]?.status)),
    [findings, states]
  );
  const summary = useMemo(() => summarizeFindings(activeFindings), [activeFindings]);
  const visibleFindings = useMemo(
    () => (typeFilter ? findings.filter((finding) => finding.type === typeFilter) : findings),
    [findings, typeFilter]
  );

  // Filters stay in the address bar, so a refresh, a return or a share keeps them.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (moduleFilter) params.set('module', moduleFilter);
    else params.delete('module');
    if (typeFilter) params.set('type', typeFilter);
    else params.delete('type');
    const query = params.toString();
    window.history.replaceState({}, '', `${window.location.pathname}${query ? `?${query}` : ''}`);
  }, [moduleFilter, typeFilter]);

  const resolvedCount = Object.values(states || {}).filter((entry) => entry?.status === 'resolved').length;
  const isLoading = modulesLoading || data.isLoading;
  const hasModules = enabled.pipekeeper || enabled.whiskeykeeper || enabled.cigarkeeper || enabled.winekeeper;

  return (
    <InsightsPageShell variant="paper">
      <InsightsHeader
        title="Collection health"
        subtitle="What is missing or inconsistent in your records, in one list. Fix what can be fixed here; open the record when only you can fill it in."
        variant="paper"
      />

      {returnLink && (
        <p className="mb-4 text-xs">
          <Link to={returnLink.to} className="underline decoration-dotted underline-offset-2" style={{ color: '#D4A574' }}>
            Back to {returnLink.label}
          </Link>
        </p>
      )}

      {data.isError && (
        <p className="mb-4 text-sm" role="alert" style={{ color: '#E0A0A0' }}>
          Some collection data could not be loaded, so this list may be incomplete.
        </p>
      )}
      {stateError && (
        <p className="mb-4 text-sm" role="alert" style={{ color: '#E0A0A0' }}>
          Finding decisions could not be loaded. Please reload before reviewing them.
        </p>
      )}

      {!isLoading && !hasModules ? (
        <div className="ck-paper-panel rounded-2xl p-8 text-center" style={{ border: '1px solid rgba(167,124,63,0.28)' }}>
          <p className="text-sm" style={{ color: 'rgba(52,37,29,0.72)' }}>
            No collection modules are open yet. Add a module and its records to review them here.
          </p>
        </div>
      ) : (
        <div className="space-y-4 min-w-0">
          <StatStrip
            variant="paper"
            items={[
              { label: 'Needs review', value: isLoading ? '—' : summary.total, onClick: () => { setTypeFilter(''); setShowDetails(true); } },
              {
                label: 'Storage',
                value: isLoading ? '—' : summary.byType.storage,
                onClick: () => { setTypeFilter('storage'); setShowDetails(true); },
              },
              {
                label: 'Classification',
                value: isLoading ? '—' : summary.byType.classification,
                onClick: () => { setTypeFilter('classification'); setShowDetails(true); },
              },
              {
                label: 'Documentation',
                value: isLoading ? '—' : summary.byType.documentation,
                onClick: () => { setTypeFilter('documentation'); setShowDetails(true); },
              },
            ]}
          />

          {!isLoading && (
            <section aria-label="Finding groups" className="space-y-2">
              {FINDING_TYPES.filter((type) => summary.byType[type.key] > 0).map((type) => (
                <div
                  key={type.key}
                  className="ck-paper-panel rounded-xl px-4 py-3 flex flex-wrap items-center justify-between gap-2"
                  style={{ background: '#fbf5e9', border: '1px solid rgba(167,124,63,0.28)', color: 'var(--ck-espresso)' }}
                >
                  <button
                    type="button"
                    onClick={() => { setTypeFilter(type.key); setShowDetails(true); }}
                    className="text-left min-h-[44px] flex-1"
                  >
                    {type.label}: {summary.byType[type.key]} <span style={{ color: 'rgba(52,37,29,0.68)' }}>· {['storage', 'documentation', 'valuation'].includes(type.key) ? 'Optional information' : 'Review'} · View records</span>
                  </button>
                  <Link
                    to={`/Curator?findingType=${encodeURIComponent(type.key)}&prompt=${encodeURIComponent(t('collectionIntelligence.reviewFindingsPrompt', { group: type.label }))}`}
                    className="inline-flex items-center justify-center rounded-lg px-3 text-sm font-semibold min-h-[44px]"
                    style={{ color: 'var(--ck-espresso)', border: '1px solid rgba(167,124,63,0.45)' }}
                  >
                    {t('collectionIntelligence.askCurator')}
                  </Link>
                </div>
              ))}
            </section>
          )}

          <div className="-mx-1 overflow-x-auto nav-scroll-bar">
            <div className="flex gap-2 px-1 py-1">
              {MODULE_TABS.filter(
                (tab) =>
                  !tab.key ||
                  (tab.key === 'tobacco' ? enabled.pipekeeper : Boolean(enabled[tab.key]))
              ).map((tab) => (
                <Chip key={tab.key || 'all'} active={moduleFilter === tab.key} onClick={() => setModuleFilter(tab.key)} variant="paper">
                  {tab.label}
                </Chip>
              ))}
            </div>
          </div>

          <button type="button" onClick={() => setShowDetails((value) => !value)} aria-expanded={showDetails}
            className="text-sm font-semibold min-h-[44px]" style={{ color: 'var(--ck-antique-brass)' }}>
            {showDetails ? 'Hide detailed findings' : 'View detailed findings and filters'}
          </button>

          {showDetails && <div className="space-y-4">
          <div className="-mx-1 overflow-x-auto nav-scroll-bar">
            <div className="flex gap-2 px-1 py-1">
              <Chip active={!typeFilter} onClick={() => setTypeFilter('')} variant="paper">
                All findings {summary.total > 0 ? `(${summary.total})` : ''}
              </Chip>
              {FINDING_TYPES.map((type) => (
                <Chip
                  key={type.key}
                  active={typeFilter === type.key}
                  onClick={() => setTypeFilter(type.key)}
                  variant="paper"
                >
                  {FINDING_TYPE_LABELS[type.key]} {summary.byType[type.key] > 0 ? `(${summary.byType[type.key]})` : ''}
                </Chip>
              ))}
            </div>
          </div>

          {typeFilter === 'duplicate' && duplicates.scanning && (
            <p className="text-[12.5px] flex items-center gap-2" style={{ color: 'rgba(52,37,29,0.72)' }}>
              <span className="w-4 h-4 border-2 border-[rgba(180,140,75,0.3)] border-t-[#D4A574] rounded-full animate-spin" />
              Checking for duplicates…
            </p>
          )}

          {typeFilter === 'duplicate' && !duplicates.scanning && duplicates.scanned && duplicates.groups.length === 0 && (
            <p className="text-[12.5px]" style={{ color: 'rgba(52,37,29,0.72)' }}>
              No records in this scope share an identity.
            </p>
          )}

          {isLoading ? (
            <div className="flex items-center justify-center py-12" role="status" aria-live="polite">
              <div className="w-8 h-8 border-4 border-[rgba(180,140,75,0.25)] border-t-[#D4A574] rounded-full animate-spin" />
              <span className="sr-only">Loading your collection</span>
            </div>
          ) : (
            <FindingsReviewPanel
              findings={visibleFindings}
              states={states}
              onStateChange={setState}
              emptyMessage={
                typeFilter === 'duplicate' && !duplicates.scanned
                  ? 'Check for duplicates to review them here.'
                  : 'Nothing needs your attention in this scope.'
              }
            />
          )}

          {typeFilter === 'duplicate' && !duplicates.scanning && (
            <button
              type="button"
              onClick={scanDuplicates}
              className="rounded-xl px-3 py-2 text-[12.5px] font-semibold min-h-[40px]"
              style={{ background: '#fbf5e9', color: 'var(--ck-espresso)', border: '1px solid rgba(167,124,63,0.35)' }}
            >
              {duplicates.scanned ? 'Check again' : 'Check for duplicates'}
            </button>
          )}
          </div>}

          {resolvedCount > 0 && (
            <p className="text-[11.5px]" style={{ color: 'rgba(52,37,29,0.7)' }}>
              {resolvedCount} resolved finding{resolvedCount === 1 ? '' : 's'} hidden. Resolving records a decision only;
              your records and their history are unchanged.
            </p>
          )}

          <p className="text-[11.5px]" style={{ color: 'rgba(52,37,29,0.7)' }}>
            Some findings concern optional information. Defer what you will come back to, and dismiss what does not
            apply; neither changes the underlying record.
          </p>
        </div>
      )}
    </InsightsPageShell>
  );
}