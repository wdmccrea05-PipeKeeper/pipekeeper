import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sparkles, Moon, RefreshCw, ChevronRight, Brain, Save } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';

const CACHE_KEY = 'ck_tonight_session';
const CACHE_TTL = 4 * 60 * 60 * 1000; // 4 hours

const SESSION_MODES = [
  { value: 'balanced', label: 'Balanced', description: 'Favorites + underused items' },
  { value: 'rotation', label: 'Rotation', description: 'Focus on underused pipes' },
  { value: 'favorites', label: 'Favorites', description: 'Highest-rated items only' },
  { value: 'exploration', label: 'Exploration', description: 'New combinations' },
  { value: 'relaxed', label: 'Relaxed', description: 'Smooth, easy options' },
];

function getCached() {
  try {
    const raw = sessionStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const { ts, data } = JSON.parse(raw);
    if (Date.now() - ts > CACHE_TTL) return null;
    return data;
  } catch {
    return null;
  }
}

function setCache(data) {
  try {
    sessionStorage.setItem(CACHE_KEY, JSON.stringify({ ts: Date.now(), data }));
  } catch {}
}

export default function TonightSessionCard({ pipes = [], blends = [], bottles = [], profile = null, tasteProfile = null }) {
  const navigate = useNavigate();
  const [recommendation, setRecommendation] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [mode, setMode] = useState('balanced');
  const [savingSession, setSavingSession] = useState(false);

  const hasData = pipes.length > 0 || blends.length > 0;

  async function generateRecommendation(force = false) {
    if (!hasData) return;
    if (!force) {
      const cached = getCached();
      if (cached) { setRecommendation(cached); return; }
    }

    setLoading(true);
    setError(null);

    // Use taste profile candidates (priority-ordered by rating/favorites/usage)
    // Fall back to full lists if no taste profile
    const candidatePipes = tasteProfile?.session_candidates?.pipes || pipes;
    const candidateBlends = tasteProfile?.session_candidates?.blends || blends;
    const candidateBottles = tasteProfile?.session_candidates?.bottles || bottles;

    const pipesList = candidatePipes.slice(0, 15).map(p =>
      `${p.name} (${p.maker || 'unknown'}, ${p.shape || 'unknown shape'}${p.is_favorite ? ', ★ favorite' : ''}${p.rating ? `, ${p.rating}/5` : ''})`
    ).join('\n');

    const blendsList = candidateBlends.slice(0, 15).map(b =>
      `${b.name} (${b.manufacturer || 'unknown'}, ${b.blend_type || 'unknown type'}${b.is_favorite ? ', ★ favorite' : ''}${b.rating ? `, rated ${b.rating}/5` : ''})`
    ).join('\n');

    const bottlesList = candidateBottles.slice(0, 8).map(b =>
      `${b.name} (${b.distillery || 'unknown'}, ${b.whiskey_type || b.type || 'unknown type'}${b.is_favorite ? ', ★ favorite' : ''}${b.rating ? `, rated ${b.rating}/5` : ''})`
    ).join('\n');

    // Build learned profile context
    const learnedContext = tasteProfile ? `
LEARNED PREFERENCES (from ${tasteProfile.session_count} sessions, ratings, favorites):
Preferred tobacco styles: ${(tasteProfile.preferred_blend_types || []).join(', ') || 'building...'}
Preferred whiskey styles: ${(tasteProfile.preferred_whiskey_types || []).join(', ') || 'building...'}
Most-used pipe shapes: ${(tasteProfile.pipe_shapes || []).join(', ') || 'building...'}
${tasteProfile.best_rated_blend ? `Highest-rated blend: ${tasteProfile.best_rated_blend.name} (${tasteProfile.best_rated_blend.rating}/5)` : ''}
${tasteProfile.best_rated_bottle ? `Highest-rated whiskey: ${tasteProfile.best_rated_bottle.name} (${tasteProfile.best_rated_bottle.rating}/5)` : ''}
${tasteProfile.pairing_patterns?.[0] ? `Most frequent pairing: ${tasteProfile.pairing_patterns[0].blendType} + ${tasteProfile.pairing_patterns[0].pipeShape}` : ''}
${tasteProfile.has_smoky_combination ? 'Strong affinity: smoky tobacco + peated whiskey' : ''}
${tasteProfile.has_sweet_combination ? 'Strong affinity: sweet tobacco + bourbon' : ''}
` : '';

    const whiskyPrefs = profile?.whiskey_preferences;
    const prefSummary = whiskyPrefs?.types?.length
      ? `Types: ${whiskyPrefs.types.join(', ')}; Flavors: ${(whiskyPrefs.flavors || []).join(', ')}`
      : 'No explicit preferences set';

    const tobaccoPrefs = profile?.preferred_blend_types?.length
      ? `Preferred: ${profile.preferred_blend_types.join(', ')}; Strength: ${profile.strength_preference || 'any'}`
      : 'No explicit preferences set';

    const prompt = `You are a personal collector advisor. Based on this collector's data, generate a personalized "Tonight's Session" recommendation.

COLLECTION (priority-ordered by favorites, ratings, and usage):

PIPES:
${pipesList || 'None'}

TOBACCO BLENDS:
${blendsList || 'None'}

WHISKEY BOTTLES:
${bottlesList || 'None'}
${learnedContext}
EXPLICIT PREFERENCES:
Tobacco: ${tobaccoPrefs}
Whiskey: ${prefSummary}

INSTRUCTIONS:
- Strongly prioritize items marked ★ favorite or with high ratings
- Use learned pairing patterns to inform the selection
- If smoky/peated affinity detected, lean into that combination
- If sweet/bourbon affinity detected, lean into that combination
- Pick items that genuinely work together

Generate a personalized Tonight's Session with:
1. pipe — exact name from the list
2. blend — exact name from the list
3. whiskey — exact name from the list (omit if none available)
4. flavor_theme — 2-4 evocative words describing the session character
5. rationale — 1-2 sentences referencing why THIS specific combination suits this collector

Return JSON: pipe, blend, whiskey, flavor_theme, rationale`;

    try {
      const result = await base44.integrations.Core.InvokeLLM({
        prompt,
        response_json_schema: {
          type: 'object',
          properties: {
            pipe: { type: 'string' },
            blend: { type: 'string' },
            whiskey: { type: 'string' },
            flavor_theme: { type: 'string' },
            rationale: { type: 'string' },
          },
        },
      });
      setCache(result);
      setRecommendation(result);
    } catch (e) {
      setError('Could not generate recommendation right now.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (hasData) generateRecommendation(false);
  }, [pipes.length, blends.length]);

  if (!hasData) return null;

  return (
    <div
      className="rounded-2xl p-6 space-y-4"
      style={{
        background: 'linear-gradient(135deg, rgba(30, 20, 12, 0.95), rgba(42, 28, 16, 0.9))',
        border: '1px solid rgba(180, 140, 75, 0.35)',
        boxShadow: '0 4px 20px rgba(0,0,0,0.6), inset 0 1px 0 rgba(180,140,100,0.12)',
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{
              background: 'linear-gradient(135deg, rgba(180,140,75,0.25), rgba(140,105,50,0.35))',
              border: '1px solid rgba(180,140,75,0.4)',
            }}
          >
            <Moon className="w-5 h-5" style={{ color: 'rgba(180,140,75,1)' }} />
          </div>
          <div>
            <h3 className="text-base font-bold" style={{ color: '#F5F1E7', fontFamily: 'Georgia, serif' }}>
              Tonight's Session
            </h3>
            <p className="text-xs" style={{ color: 'rgba(224,216,200,0.55)' }}>
              {tasteProfile?.confidence > 0.2
                ? 'Adapted from your ratings, sessions, and favorites'
                : 'Personalized recommendation from your collection'}
            </p>
          </div>
        </div>
        <button
          onClick={() => generateRecommendation(true)}
          disabled={loading}
          className="p-2 rounded-lg transition-all hover:bg-white/5 disabled:opacity-40"
          title="Regenerate"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} style={{ color: 'rgba(180,140,75,0.7)' }} />
        </button>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex items-center gap-3 py-4">
          <Sparkles className="w-5 h-5 animate-pulse" style={{ color: 'rgba(180,140,75,0.6)' }} />
          <span className="text-sm" style={{ color: 'rgba(224,216,200,0.6)' }}>
            Crafting your perfect session…
          </span>
        </div>
      ) : error ? (
        <p className="text-sm py-2" style={{ color: 'rgba(200,120,120,0.8)' }}>{error}</p>
      ) : recommendation ? (
        <div className="space-y-4">
          {/* Flavor theme */}
          {recommendation.flavor_theme && (
            <div
              className="inline-block px-3 py-1 rounded-full text-xs font-semibold tracking-wide"
              style={{
                background: 'rgba(180,140,75,0.15)',
                border: '1px solid rgba(180,140,75,0.3)',
                color: 'rgba(180,140,75,1)',
              }}
            >
              {recommendation.flavor_theme}
            </div>
          )}

          {/* Trio */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {recommendation.pipe && (
              <div
                className="p-3 rounded-xl"
                style={{ background: 'rgba(60,40,25,0.5)', border: '1px solid rgba(120,90,65,0.3)' }}
              >
                <p className="text-xs uppercase tracking-wider mb-1" style={{ color: 'rgba(180,140,75,0.6)' }}>Pipe</p>
                <p className="text-sm font-medium leading-snug" style={{ color: '#E0D8C8' }}>{recommendation.pipe}</p>
              </div>
            )}
            {recommendation.blend && (
              <div
                className="p-3 rounded-xl"
                style={{ background: 'rgba(60,40,25,0.5)', border: '1px solid rgba(120,90,65,0.3)' }}
              >
                <p className="text-xs uppercase tracking-wider mb-1" style={{ color: 'rgba(180,140,75,0.6)' }}>Tobacco</p>
                <p className="text-sm font-medium leading-snug" style={{ color: '#E0D8C8' }}>{recommendation.blend}</p>
              </div>
            )}
            {recommendation.whiskey && (
              <div
                className="p-3 rounded-xl"
                style={{ background: 'rgba(60,40,25,0.5)', border: '1px solid rgba(120,90,65,0.3)' }}
              >
                <p className="text-xs uppercase tracking-wider mb-1" style={{ color: 'rgba(180,140,75,0.6)' }}>Whiskey</p>
                <p className="text-sm font-medium leading-snug" style={{ color: '#E0D8C8' }}>{recommendation.whiskey}</p>
              </div>
            )}
          </div>

          {/* Rationale */}
          {recommendation.rationale && (
            <p className="text-sm leading-relaxed" style={{ color: 'rgba(224,216,200,0.7)' }}>
              {recommendation.rationale}
            </p>
          )}

          {/* Learning indicator */}
          {tasteProfile?.confidence > 0.15 && (
            <div className="flex items-center gap-1.5">
              <Brain className="w-3 h-3" style={{ color: 'rgba(180,140,75,0.5)' }} />
              <span className="text-xs" style={{ color: 'rgba(180,140,75,0.5)' }}>
                Adapted from {tasteProfile.session_count > 0 ? `${tasteProfile.session_count} sessions` : 'your collection data'}
                {tasteProfile.pairing_patterns?.length > 0 ? ` · ${tasteProfile.pairing_patterns.length} pairing patterns learned` : ''}
              </span>
            </div>
          )}

          {/* CTA */}
          <Button
            onClick={() => navigate('/Curator?prompt=' + encodeURIComponent(`Tell me more about tonight's session: ${recommendation.pipe} with ${recommendation.blend}${recommendation.whiskey ? ` and ${recommendation.whiskey}` : ''}`))}
            className="w-full sm:w-auto"
            style={{
              background: 'linear-gradient(135deg, rgba(139,58,58,0.9), rgba(109,46,46,1))',
              border: 'none',
            }}
          >
            <Sparkles className="w-4 h-4 mr-2" />
            Ask Curator About This Session
            <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        </div>
      ) : null}
    </div>
  );
}