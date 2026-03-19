import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, TrendingUp, RotateCcw, PackageOpen, Leaf, Sparkles, GlassWater, BookOpen } from 'lucide-react';
import { MODULE_ICONS } from '@/components/branding/moduleAssets';

function PipeInsightIcon({ color }) {
  return (
    <img
      src={MODULE_ICONS.pipeicon}
      alt="Pipe"
      className="w-4 h-4 object-contain"
      style={{ backgroundColor: 'transparent', opacity: 0.9 }}
      draggable={false}
    />
  );
}

function InsightChip({ icon: Icon, label, detail, onClick, color = '#D4A574' }) {
  return (
    <button
      onClick={onClick}
      className="flex items-start gap-3 p-3 rounded-xl w-full text-left transition-all hover:scale-[1.01]"
      style={{
        background: 'rgba(50,35,22,0.5)',
        border: '1px solid rgba(120,90,65,0.25)',
      }}
    >
      <div
        className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5"
        style={{ background: `${color}20`, border: `1px solid ${color}40` }}
      >
        <Icon className="w-4 h-4" style={{ color }} />
      </div>
      <div className="min-w-0">
        <p className="text-sm font-medium leading-snug" style={{ color: '#E0D8C8' }}>{label}</p>
        {detail && <p className="text-xs mt-0.5" style={{ color: 'rgba(224,216,200,0.55)' }}>{detail}</p>}
      </div>
    </button>
  );
}

export default function CollectionIntelligencePanel({ pipes = [], blends = [], bottles = [], logs = [], profile = null, tasteProfile = null }) {
  const navigate = useNavigate();
  const [insights, setInsights] = useState([]);

  useEffect(() => {
    const generated = [];
    const now = Date.now();
    const ninetyDaysMs = 90 * 24 * 60 * 60 * 1000;

    // --- Pipe rotation insight ---
    if (pipes.length > 3 && logs.length > 0) {
      const usedPipeIds = new Set(logs.map(l => l.pipe_id));
      const unusedPipes = pipes.filter(p => !usedPipeIds.has(p.id));
      if (unusedPipes.length > 0) {
        generated.push({
          icon: null,
          isPipeIcon: true,
          label: `${unusedPipes.length} pipe${unusedPipes.length > 1 ? 's' : ''} haven't been smoked yet`,
          detail: 'Consider adding them to your rotation',
          color: '#D4A574',
          prompt: 'Which pipes in my collection should I rotate into my sessions?',
        });
      } else {
        // Check for underused pipes (not smoked in 90 days)
        const recentLogs = logs.filter(l => {
          const logDate = new Date(l.date).getTime();
          return now - logDate < ninetyDaysMs;
        });
        const recentlyUsedIds = new Set(recentLogs.map(l => l.pipe_id));
        const underused = pipes.filter(p => !recentlyUsedIds.has(p.id));
        if (underused.length >= 2) {
          generated.push({
            icon: null,
            isPipeIcon: true,
            label: `${underused.length} pipes unused in the last 90 days`,
            detail: 'Rotating them may improve flavor separation',
            color: '#D4A574',
            prompt: 'Which pipes should I rotate back into my sessions?',
          });
        }
      }
    }

    // --- Overused pipe warning ---
    if (logs.length >= 10 && pipes.length >= 3) {
      const usageCount = {};
      logs.forEach(l => { usageCount[l.pipe_id] = (usageCount[l.pipe_id] || 0) + 1; });
      const topPipeId = Object.entries(usageCount).sort((a, b) => b[1] - a[1])[0];
      const topPipe = pipes.find(p => p.id === topPipeId?.[0]);
      if (topPipe && topPipeId[1] > logs.length * 0.4) {
        generated.push({
          icon: null,
          isPipeIcon: true,
          label: `${topPipe.name} dominates your sessions`,
          detail: 'Rotating more pipes may preserve distinct flavor profiles',
          color: '#C09060',
          prompt: `Help me build a better rotation — I've been over-relying on my ${topPipe.name}.`,
        });
      }
    }

    // --- Unopened bottles insight ---
    const unopenedBottles = bottles.filter(b => !b.opened_date && !b.fill_level);
    if (unopenedBottles.length > 0) {
      const firstUnopened = unopenedBottles[0];
      generated.push({
        icon: GlassWater,
        label: `${unopenedBottles.length} unopened bottle${unopenedBottles.length > 1 ? 's' : ''} in your collection`,
        detail: firstUnopened ? `${firstUnopened.name} is ready to open` : 'Ready for tasting',
        color: '#8BAA7A',
        bottleId: firstUnopened?.id,
        isBottleInsight: true,
        prompt: `Which of my unopened whiskey bottles should I open next?`,
      });
    }

    // --- Cellar aging insight ---
    const cellarable = blends.filter(b =>
      b.tin_tins_cellared > 0 || b.bulk_cellared > 0
    );
    if (cellarable.length > 0) {
      const goodAgers = cellarable.filter(b =>
        b.aging_potential === 'Excellent' || b.aging_potential === 'Good'
      );
      if (goodAgers.length > 0) {
        generated.push({
          icon: Leaf,
          label: `${goodAgers.length} cellared blend${goodAgers.length > 1 ? 's' : ''} with good aging potential`,
          detail: `${goodAgers[0].name} is aging well`,
          color: '#7AAA88',
          prompt: 'Tell me about my cellared blends and their aging potential.',
        });
      }
    }

    // --- LEARNED: Top pairing pattern from session history ---
    if (tasteProfile?.pairing_patterns?.length > 0) {
      const top = tasteProfile.pairing_patterns[0];
      if (top.count >= 3) {
        generated.push({
          icon: TrendingUp,
          label: `Your top pairing: ${top.blendType} + ${top.pipeShape} pipe`,
          detail: `Detected across ${top.count} sessions`,
          color: '#A574D4',
          prompt: `Tell me more about my ${top.blendType} tobacco and ${top.pipeShape} pipe pairing pattern.`,
        });
      }
    }

    // --- LEARNED: Highest-rated blend insight ---
    if (tasteProfile?.best_rated_blend && tasteProfile.best_rated_blend.rating >= 4) {
      const b = tasteProfile.best_rated_blend;
      generated.push({
        icon: TrendingUp,
        label: `Your highest-rated blend: ${b.name} (${b.rating}/5)`,
        detail: `${b.blend_type || ''} — consider expanding this style in your cellar`,
        color: '#8BAA7A',
        prompt: `I consistently rate ${b.name} highly. What similar blends should I explore?`,
      });
    }

    // --- LEARNED: Smoky cross-collection affinity ---
    if (tasteProfile?.has_smoky_combination) {
      const latakiaBlends = blends.filter(b =>
        b.blend_type === 'English' || b.blend_type === 'Latakia Blend' || b.blend_type === 'Balkan'
      );
      const peatBottles = bottles.filter(b =>
        (b.whiskey_type || '').toLowerCase().includes('scotch') ||
        (b.flavor_notes || []).some(f => ['peated', 'smoky', 'peaty'].includes(f.toLowerCase()))
      );
      if (latakiaBlends.length > 0 && peatBottles.length > 0) {
        generated.push({
          icon: TrendingUp,
          label: `Smoky affinity detected across your collections`,
          detail: `${latakiaBlends.length} Latakia blends · ${peatBottles.length} peated/Scotch bottles`,
          color: '#A574D4',
          prompt: 'How do my Latakia blends pair with my Scotch whisky collection?',
        });
      }
    }

    // --- LEARNED: Sweet cross-collection affinity ---
    if (tasteProfile?.has_sweet_combination) {
      const virginiaBlends = blends.filter(b =>
        b.blend_type === 'Virginia' || b.blend_type === 'Virginia/Perique'
      );
      const bourbonBottles = bottles.filter(b =>
        (b.whiskey_type || '').toLowerCase().includes('bourbon')
      );
      if (virginiaBlends.length > 0 && bourbonBottles.length > 0) {
        generated.push({
          icon: TrendingUp,
          label: `Sweet affinity detected: Virginia blends + Bourbon`,
          detail: `${virginiaBlends.length} Virginia blends complement your bourbon selection`,
          color: '#D4A874',
          prompt: 'How do my Virginia blends pair with my bourbon collection?',
        });
      }
    }

    // --- Cross-collection pairing (profile preferences fallback) ---
    const whiskyPrefs = profile?.whiskey_preferences;
    if (!tasteProfile?.has_smoky_combination &&
      (whiskyPrefs?.flavors?.includes('Peated') || whiskyPrefs?.types?.includes('Scotch'))) {
      const latakiaBlends = blends.filter(b =>
        b.blend_type === 'English' || b.blend_type === 'Latakia Blend' || b.blend_type === 'Balkan'
      );
      if (latakiaBlends.length > 0) {
        generated.push({
          icon: TrendingUp,
          label: `Your Latakia blends pair with your peated Scotch preferences`,
          detail: `${latakiaBlends.length} blend${latakiaBlends.length > 1 ? 's' : ''} complement your whiskey profile`,
          color: '#A574D4',
          prompt: 'How do my Latakia blends pair with my whiskey collection?',
        });
      }
    }

    // --- Whiskey collection balance ---
    if (bottles.length >= 3 && tasteProfile?.preferred_whiskey_types?.length > 0) {
      const topType = tasteProfile.preferred_whiskey_types[0];
      const topCount = bottles.filter(b => (b.whiskey_type || b.type) === topType).length;
      if (topCount > bottles.length * 0.6) {
        generated.push({
          icon: TrendingUp,
          label: `Your whiskey collection leans heavily ${topType}`,
          detail: 'Exploring other styles may open new cross-collection pairings',
          color: '#74A5D4',
          prompt: `I mostly drink ${topType}. What other whiskey styles complement my tobacco collection?`,
        });
      }
    } else if (bottles.length >= 3) {
      const typeCounts = {};
      bottles.forEach(b => {
        const t = b.whiskey_type || b.type || 'Unknown';
        typeCounts[t] = (typeCounts[t] || 0) + 1;
      });
      const topType = Object.entries(typeCounts).sort((a, b) => b[1] - a[1])[0];
      if (topType && topType[1] > bottles.length * 0.6) {
        generated.push({
          icon: TrendingUp,
          label: `Your whiskey collection is heavily ${topType[0]}`,
          detail: 'Exploring other styles may open new pairing possibilities',
          color: '#74A5D4',
          prompt: `My whiskey collection is mostly ${topType[0]}. What styles should I explore next?`,
        });
      }
    }

    setInsights(generated.slice(0, 5));
  }, [pipes.length, blends.length, bottles.length, logs.length, profile, tasteProfile]);

  if (insights.length === 0) return null;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Sparkles className="w-4 h-4" style={{ color: 'rgba(180,140,75,0.8)' }} />
        <h2 className="text-sm uppercase tracking-[0.12em] font-semibold" style={{ color: 'rgba(180, 140, 75, 0.8)' }}>
          Collection Intelligence
        </h2>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {insights.map((insight, i) => (
          <InsightChip
            key={i}
            icon={insight.icon}
            label={insight.label}
            detail={insight.detail}
            color={insight.color}
            onClick={() => {
              if (insight.isBottleInsight && insight.bottleId) {
                navigate(`/BottleDetail?bottleId=${insight.bottleId}`);
              } else {
                navigate('/Curator?prompt=' + encodeURIComponent(insight.prompt));
              }
            }}
          />
        ))}
      </div>
    </div>
  );
}