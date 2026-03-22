import React, { useState } from 'react';
import LockedModuleGuard from '@/components/modules/LockedModuleGuard';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useCurrentUser } from '@/components/hooks/useCurrentUser';
import { useTranslation } from '@/components/i18n/safeTranslation';
import { Button } from '@/components/ui/button';
import { Loader2, Wand2, Globe, Tags, DollarSign, Beaker, ArrowLeft, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import ModuleNav from '@/components/modules/ModuleNav';
import { GlassWater, BookOpen, TrendingUp, BarChart3 } from 'lucide-react';
import { useLocation } from 'react-router-dom';

function WhiskeyBottleIcon({ className, style }) {
  return (
    <svg className={className} style={style} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M9 2h6v3l2 3v11a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2V8l2-3V2z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/>
      <path d="M7 13h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
      <path d="M9 2h6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  );
}

export default function WhiskeyAIUpdates() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useCurrentUser();
  const queryClient = useQueryClient();

  const [enrichBusy, setEnrichBusy] = useState(false);
  const [normalizeBusy, setNormalizeBusy] = useState(false);
  const [abvBusy, setAbvBusy] = useState(false);
  const [classifyBusy, setClassifyBusy] = useState(false);
  const [enrichResults, setEnrichResults] = useState(null);

  const moduleNav = [
    { name: t('nav.bottles') || 'Bottles', path: '/Whiskey', icon: GlassWater },
    { name: t('nav.tastingNotes') || 'Tastings', path: '/Tastings', icon: BookOpen },
    { name: t('nav.insights') || 'Insights', path: '/WhiskeyInsights', icon: TrendingUp },
    { name: t('nav.analytics') || 'Analytics', path: '/WhiskeyAnalytics', icon: BarChart3 },
  ];

  const { data: bottles = [], refetch: refetchBottles } = useQuery({
    queryKey: ['bottles-ai', user?.email],
    queryFn: async () => {
      const result = await base44.entities.Bottle.filter({ created_by: user?.email });
      return Array.isArray(result) ? result : [];
    },
    enabled: !!user?.email,
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['bottles'] });
    queryClient.invalidateQueries({ queryKey: ['bottles-summary'] });
    queryClient.invalidateQueries({ queryKey: ['bottles-ai'] });
    refetchBottles();
  };

  // ── Enrich missing fields (distillery, region, country, age, abv) ─────────
  const handleEnrichMissingFields = async () => {
    const toEnrich = bottles.filter(b =>
      !b.distillery || !b.region || !b.country || !b.age || !b.abv
    );
    if (toEnrich.length === 0) {
      toast.info(t('whiskeyAI.allFieldsComplete') || 'All bottles already have complete data.');
      return;
    }

    setEnrichBusy(true);
    setEnrichResults(null);
    let updated = 0;

    try {
      for (const bottle of toEnrich) {
        const missing = [];
        if (!bottle.distillery) missing.push('distillery');
        if (!bottle.region) missing.push('region');
        if (!bottle.country) missing.push('country');
        if (!bottle.age) missing.push('age');
        if (!bottle.abv) missing.push('abv');

        const result = await base44.integrations.Core.InvokeLLM({
          prompt: `Look up accurate details for this whiskey bottle: "${bottle.name}"${bottle.type ? ` (${bottle.type})` : ''}.
Fill only these missing fields: ${missing.join(', ')}.
Return null for any field you cannot verify with confidence.`,
          add_context_from_internet: true,
          response_json_schema: {
            type: 'object',
            properties: {
              distillery: { type: ['string', 'null'] },
              region: { type: ['string', 'null'] },
              country: { type: ['string', 'null'] },
              age: { type: ['number', 'null'] },
              abv: { type: ['number', 'null'] },
            },
          },
        });

        const updates = {};
        missing.forEach(field => {
          if (result[field] !== null && result[field] !== undefined) {
            updates[field] = result[field];
          }
        });

        if (Object.keys(updates).length > 0) {
          await base44.entities.Bottle.update(bottle.id, updates);
          updated++;
        }
      }

      setEnrichResults({ updated, total: toEnrich.length });
      invalidate();
      if (updated > 0) {
        toast.success(t('whiskeyAI.enrichedCount', { count: updated }) || `Enriched ${updated} bottle records.`);
      } else {
        toast.info(t('whiskeyAI.noEnrichment') || 'No new data found to add.');
      }
    } catch (err) {
      toast.error(t('whiskeyAI.enrichFailed') || 'Enrichment failed. Please try again.');
      console.error(err);
    } finally {
      setEnrichBusy(false);
    }
  };

  // ── Normalize bottle types ─────────────────────────────────────────────────
  const handleNormalizeTypes = async () => {
    const toUpdate = bottles.filter(b => !b.type || b.type === 'Other');
    if (toUpdate.length === 0) {
      toast.info(t('whiskeyAI.typesAlreadyNormalized') || 'All bottle types are already classified.');
      return;
    }

    setNormalizeBusy(true);
    try {
      const types = ['Single Malt', 'Blended Malt', 'Single Grain', 'Blended Grain', 'Blended Whiskey', 'Bourbon', 'Rye', 'Tennessee Whiskey', 'Irish Whiskey', 'Scotch Whisky', 'Other'];

      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `Classify each whiskey bottle below to the correct type from this list: ${types.join(', ')}.

Bottles to classify:
${toUpdate.map(b => `- ${b.name}${b.distillery ? ` by ${b.distillery}` : ''}${b.region ? ` (${b.region})` : ''}`).join('\n')}

Only update bottles where the correct type is clearly different from "Other". Return null for genuinely unclear cases.`,
        response_json_schema: {
          type: 'object',
          properties: {
            classifications: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  name: { type: 'string' },
                  type: { type: ['string', 'null'] },
                },
              },
            },
          },
        },
      });

      let updated = 0;
      for (const classification of result?.classifications || []) {
        if (!classification.type || classification.type === 'Other') continue;
        const bottle = toUpdate.find(b => b.name?.trim() === classification.name?.trim());
        if (bottle && types.includes(classification.type)) {
          await base44.entities.Bottle.update(bottle.id, { type: classification.type });
          updated++;
        }
      }

      invalidate();
      if (updated > 0) {
        toast.success(t('whiskeyAI.normalizedCount', { count: updated }) || `Classified ${updated} bottle types.`);
      } else {
        toast.info(t('whiskeyAI.noTypeChanges') || 'No type changes needed.');
      }
    } catch (err) {
      toast.error(t('whiskeyAI.normalizeFailed') || 'Classification failed.');
      console.error(err);
    } finally {
      setNormalizeBusy(false);
    }
  };

  // ── Fill ABV from web ──────────────────────────────────────────────────────
  const handleFillABV = async () => {
    const toUpdate = bottles.filter(b => !b.abv);
    if (toUpdate.length === 0) {
      toast.info(t('whiskeyAI.abvComplete') || 'All bottles already have ABV data.');
      return;
    }

    setAbvBusy(true);
    try {
      let updated = 0;
      for (const bottle of toUpdate) {
        const result = await base44.integrations.Core.InvokeLLM({
          prompt: `What is the official ABV (alcohol by volume %) for "${bottle.name}"${bottle.distillery ? ` by ${bottle.distillery}` : ''}? Return null if unknown.`,
          add_context_from_internet: true,
          response_json_schema: {
            type: 'object',
            properties: {
              abv: { type: ['number', 'null'] },
            },
          },
        });
        if (result?.abv && result.abv > 0 && result.abv <= 100) {
          await base44.entities.Bottle.update(bottle.id, { abv: result.abv });
          updated++;
        }
      }
      invalidate();
      if (updated > 0) {
        toast.success(t('whiskeyAI.abvFilledCount', { count: updated }) || `Filled ABV for ${updated} bottles.`);
      } else {
        toast.info(t('whiskeyAI.noAbvFound') || 'No ABV data found.');
      }
    } catch (err) {
      toast.error(t('whiskeyAI.abvFailed') || 'ABV lookup failed.');
    } finally {
      setAbvBusy(false);
    }
  };

  // ── Normalize bottle sizes ─────────────────────────────────────────────────
  const handleNormalizeBottleSizes = async () => {
    const sizes = ['50ml', '100ml', '200ml', '375ml', '500ml', '700ml', '750ml', '1L', '1.75L'];
    const toUpdate = bottles.filter(b => !b.bottle_size || b.bottle_size === 'Other');
    if (toUpdate.length === 0) {
      toast.info(t('whiskeyAI.sizesComplete') || 'All bottle sizes are already set.');
      return;
    }

    setClassifyBusy(true);
    try {
      let updated = 0;
      for (const bottle of toUpdate) {
        const result = await base44.integrations.Core.InvokeLLM({
          prompt: `What is the standard bottle size for "${bottle.name}"${bottle.type ? ` (${bottle.type})` : ''}? Choose from: ${sizes.join(', ')}. Return null if unknown.`,
          add_context_from_internet: true,
          response_json_schema: {
            type: 'object',
            properties: {
              bottle_size: { type: ['string', 'null'] },
            },
          },
        });
        if (result?.bottle_size && sizes.includes(result.bottle_size)) {
          await base44.entities.Bottle.update(bottle.id, { bottle_size: result.bottle_size });
          updated++;
        }
      }
      invalidate();
      if (updated > 0) {
        toast.success(t('whiskeyAI.sizesFilledCount', { count: updated }) || `Normalized sizes for ${updated} bottles.`);
      } else {
        toast.info(t('whiskeyAI.noSizeChanges') || 'No size changes needed.');
      }
    } catch (err) {
      toast.error(t('whiskeyAI.sizeFailed') || 'Size normalization failed.');
    } finally {
      setClassifyBusy(false);
    }
  };

  const anyBusy = enrichBusy || normalizeBusy || abvBusy || classifyBusy;

  const updateTasks = [
    {
      key: 'enrich',
      icon: Globe,
      title: t('whiskeyAI.enrichTitle') || 'Enrich Missing Fields',
      description: t('whiskeyAI.enrichDesc') || 'Fill in missing distillery, region, country, age, and ABV using verified web data.',
      buttonLabel: enrichBusy
        ? (t('common.loading') || 'Working...')
        : (t('whiskeyAI.enrichBtn') || `Enrich ${bottles.filter(b => !b.distillery || !b.region || !b.country || !b.age || !b.abv).length} Bottles`),
      busy: enrichBusy,
      action: handleEnrichMissingFields,
      count: bottles.filter(b => !b.distillery || !b.region || !b.country || !b.age || !b.abv).length,
    },
    {
      key: 'normalize',
      icon: Tags,
      title: t('whiskeyAI.normalizeTitle') || 'Classify Whiskey Types',
      description: t('whiskeyAI.normalizeDesc') || 'Standardize bottle types (Single Malt, Bourbon, Rye, etc.) for unclassified bottles.',
      buttonLabel: normalizeBusy
        ? (t('common.loading') || 'Working...')
        : (t('whiskeyAI.normalizeBtn') || `Classify ${bottles.filter(b => !b.type || b.type === 'Other').length} Bottles`),
      busy: normalizeBusy,
      action: handleNormalizeTypes,
      count: bottles.filter(b => !b.type || b.type === 'Other').length,
    },
    {
      key: 'abv',
      icon: Beaker,
      title: t('whiskeyAI.abvTitle') || 'Fill ABV Data',
      description: t('whiskeyAI.abvDesc') || 'Look up and fill missing ABV (alcohol by volume) percentages from verified sources.',
      buttonLabel: abvBusy
        ? (t('common.loading') || 'Working...')
        : (t('whiskeyAI.abvBtn') || `Fill ABV for ${bottles.filter(b => !b.abv).length} Bottles`),
      busy: abvBusy,
      action: handleFillABV,
      count: bottles.filter(b => !b.abv).length,
    },
    {
      key: 'sizes',
      icon: DollarSign,
      title: t('whiskeyAI.sizesTitle') || 'Normalize Bottle Sizes',
      description: t('whiskeyAI.sizesDesc') || 'Standardize bottle sizes to recognized formats (750ml, 1L, etc.).',
      buttonLabel: classifyBusy
        ? (t('common.loading') || 'Working...')
        : (t('whiskeyAI.sizesBtn') || `Normalize ${bottles.filter(b => !b.bottle_size || b.bottle_size === 'Other').length} Bottles`),
      busy: classifyBusy,
      action: handleNormalizeBottleSizes,
      count: bottles.filter(b => !b.bottle_size || b.bottle_size === 'Other').length,
    },
  ];

  return (
    <div className="space-y-8">
      <ModuleNav items={moduleNav} currentPath={location.pathname} />

      {/* Header */}
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
              <Wand2 className="w-5 h-5" style={{ color: 'rgba(180, 140, 75, 1)' }} />
            </div>
            <h1
              className="text-4xl font-bold tracking-tight"
              style={{ color: '#F5F1E7', fontFamily: "'Georgia', serif", textShadow: '0 2px 6px rgba(0,0,0,0.7)' }}
            >
              {t('whiskeyAI.pageTitle') || 'AI Updates'}
            </h1>
          </div>
          <p className="text-base pl-14" style={{ color: 'rgba(224, 216, 200, 0.75)' }}>
            {t('whiskeyAI.pageSubtitle') || 'Bulk enrich, classify, and standardize your whiskey bottle records with AI assistance.'}
          </p>
        </div>
        <Button onClick={() => navigate('/WhiskeyKeeper')} variant="outline" className="text-sm shrink-0">
          {t('common.backToHub') || 'Back to Hub'}
        </Button>
      </div>

      {/* Collection status bar */}
      <div
        className="rounded-lg p-4 flex items-center gap-4"
        style={{
          background: 'linear-gradient(135deg, rgba(42, 30, 20, 0.7), rgba(35, 24, 16, 0.85))',
          border: '1px solid rgba(120, 90, 65, 0.3)',
        }}
      >
        <WhiskeyBottleIcon className="w-6 h-6 shrink-0" style={{ color: 'rgba(180, 140, 75, 0.9)' }} />
        <div>
          <p className="text-sm font-semibold" style={{ color: '#E0D8C8' }}>
            {bottles.length} {t('whiskeyAI.bottlesInCollection') || 'bottles in your collection'}
          </p>
          <p className="text-xs mt-0.5" style={{ color: 'rgba(224, 216, 200, 0.6)' }}>
            {t('whiskeyAI.selectTaskBelow') || 'Select an AI task below to enrich your records.'}
          </p>
        </div>
      </div>

      {/* Task Cards */}
      <div className="space-y-4">
        <h2 className="text-sm uppercase tracking-[0.12em] font-semibold" style={{ color: 'rgba(180, 140, 75, 0.8)' }}>
          {t('whiskeyAI.availableTasks') || 'Available AI Tasks'}
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {updateTasks.map((task) => (
            <div
              key={task.key}
              className="rounded-xl p-5 space-y-4"
              style={{
                background: 'linear-gradient(135deg, rgba(50, 36, 24, 0.6), rgba(40, 28, 18, 0.8))',
                border: '1px solid rgba(140, 105, 65, 0.3)',
                boxShadow: '0 2px 8px rgba(0,0,0,0.4)',
              }}
            >
              <div className="flex items-start gap-3">
                <div
                  className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
                  style={{
                    background: 'rgba(180, 140, 75, 0.15)',
                    border: '1px solid rgba(180, 140, 75, 0.3)',
                  }}
                >
                  <task.icon className="w-4 h-4" style={{ color: 'rgba(180, 140, 75, 0.9)' }} />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-sm" style={{ color: '#E0D8C8' }}>
                      {task.title}
                    </h3>
                    {task.count === 0 && (
                      <CheckCircle2 className="w-3.5 h-3.5" style={{ color: 'rgba(100, 180, 100, 0.8)' }} />
                    )}
                  </div>
                  <p className="text-xs mt-1" style={{ color: 'rgba(224, 216, 200, 0.65)' }}>
                    {task.description}
                  </p>
                  {task.count > 0 && (
                    <p className="text-xs mt-1" style={{ color: 'rgba(212, 165, 116, 0.8)' }}>
                      {task.count} {t('whiskeyAI.bottlesNeedUpdate') || 'bottle(s) need update'}
                    </p>
                  )}
                </div>
              </div>
              <Button
                size="sm"
                disabled={anyBusy || task.count === 0}
                onClick={task.action}
                className="w-full bg-gradient-to-r from-[#8b3a3a] to-[#6d2e2e] text-white"
              >
                {task.busy ? (
                  <>
                    <Loader2 className="w-3 h-3 mr-2 animate-spin" />
                    {t('common.loading') || 'Working...'}
                  </>
                ) : (
                  <>
                    <Wand2 className="w-3 h-3 mr-2" />
                    {task.buttonLabel}
                  </>
                )}
              </Button>
            </div>
          ))}
        </div>
      </div>

      {enrichResults && (
        <div
          className="rounded-lg p-4"
          style={{
            background: 'rgba(100, 180, 100, 0.1)',
            border: '1px solid rgba(100, 180, 100, 0.3)',
          }}
        >
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4" style={{ color: 'rgba(100, 180, 100, 0.9)' }} />
            <p className="text-sm" style={{ color: '#E0D8C8' }}>
              {t('whiskeyAI.enrichComplete', { updated: enrichResults.updated, total: enrichResults.total }) ||
                `Enrichment complete: ${enrichResults.updated} of ${enrichResults.total} records updated.`}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}