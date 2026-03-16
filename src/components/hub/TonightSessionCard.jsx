import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sparkles, Moon, RefreshCw, ChevronRight, Brain, Save } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';
import { useTranslation } from '@/components/i18n/safeTranslation';

const CACHE_KEY = 'ck_tonight_session';
const CACHE_TTL = 4 * 60 * 60 * 1000; // 4 hours

const SESSION_MODES = [
  { value: 'balanced', label: 'session.modes.balanced', description: 'session.descriptions.balanced' },
  { value: 'rotation', label: 'session.modes.rotation', description: 'session.descriptions.rotation' },
  { value: 'favorites', label: 'session.modes.favorites', description: 'session.descriptions.favorites' },
  { value: 'exploration', label: 'session.modes.exploration', description: 'session.descriptions.exploration' },
  { value: 'relaxed', label: 'session.modes.relaxed', description: 'session.descriptions.relaxed' },
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
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [recommendation, setRecommendation] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [mode, setMode] = useState('balanced');
  const [savingSession, setSavingSession] = useState(false);
  const [sessionHistory, setSessionHistory] = useState([]); // Track last 5 recommendations

  const hasData = pipes.length > 0 || blends.length > 0;

  async function generateRecommendation(forceRefresh = false) {
    if (!hasData) return;
    
    setLoading(true);
    setError(null);

    try {
      // Call intelligent recommendation backend
      const result = await base44.functions.invoke('generateSessionRecommendation', {
        pipes,
        blends,
        bottles,
        tasteProfile,
        userProfile: profile,
        mode,
        previousPairings: [],
        sessionHistory, // Pass recent recommendations to avoid repetition
      });

      if (result?.data) {
        setCache(result.data);
        setRecommendation(result.data);
        
        // Track this recommendation in session history (keep last 5)
        setSessionHistory(prev => [
          {
            pipe_id: result.data.pipe_id,
            blend_id: result.data.blend_id,
            whiskey_id: result.data.whiskey_id,
            mode: result.data.mode,
            timestamp: Date.now(),
          },
          ...prev,
        ].slice(0, 5));
      }
    } catch (e) {
      console.error('Recommendation error:', e);
      setError(t('session.errorGenerating', 'Could not generate recommendation right now.'));
    } finally {
      setLoading(false);
    }
  }

  async function recordSession() {
    if (!recommendation || !recommendation.pipe_id || !recommendation.blend_id) {
      toast.error(t('session.invalidData', 'Invalid session data'));
      return;
    }

    setSavingSession(true);

    try {
      await base44.entities.SmokingLog.create({
        pipe_id: recommendation.pipe_id,
        pipe_name: recommendation.pipe,
        blend_id: recommendation.blend_id,
        blend_name: recommendation.blend,
        bowls_used: 1,
        date: new Date().toISOString().split('T')[0],
        is_break_in: false,
        notes: t('session.recordedNote', 'Recommended session') + ` (${mode} ${t('session.mode', 'mode')})`,
      });

      toast.success(t('session.recorded', 'Session recorded!'));
    } catch (e) {
      console.error('Failed to record session:', e);
      toast.error(t('session.recordFailed', 'Failed to record session'));
    } finally {
      setSavingSession(false);
    }
  }

  // Regenerate when mode changes (not cached)
  useEffect(() => {
    if (hasData && recommendation) {
      generateRecommendation(true);
    }
  }, [mode]);

  // Initial generation on mount or data change
  useEffect(() => {
    if (hasData) {
      const cached = getCached();
      if (cached && !recommendation) {
        setRecommendation(cached);
      } else {
        generateRecommendation(false);
      }
    }
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
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{
              background: 'linear-gradient(135deg, rgba(180,140,75,0.25), rgba(140,105,50,0.35))',
              border: '1px solid rgba(180,140,75,0.4)',
            }}
          >
            <Moon className="w-5 h-5" style={{ color: 'rgba(180,140,75,1)' }} />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="text-base font-bold" style={{ color: '#F5F1E7', fontFamily: 'Georgia, serif' }}>
              {t('session.tonightTitle', "Tonight's Session")}
            </h3>
            <p className="text-xs" style={{ color: 'rgba(224,216,200,0.55)' }}>
              {tasteProfile?.confidence > 0.2
                ? t('session.adaptedFrom', 'Adapted from your ratings, sessions, and favorites')
                : t('session.personalized', 'Personalized recommendation from your collection')}
            </p>
          </div>
        </div>
        <button
          onClick={() => generateRecommendation(true)}
          disabled={loading}
          className="p-2 rounded-lg transition-all hover:bg-white/5 disabled:opacity-40 flex-shrink-0 ml-2"
          title="Regenerate"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} style={{ color: 'rgba(180,140,75,0.7)' }} />
        </button>
      </div>

      {/* Mode Selector */}
      <div className="space-y-2">
        <label className="text-xs uppercase tracking-widest" style={{ color: 'rgba(180,140,75,0.6)' }}>
          {t('session.recommendationMode', 'Recommendation Mode')}
        </label>
        <Select value={mode} onValueChange={(v) => { 
          setMode(v);
        }}>
          <SelectTrigger className="h-8 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {SESSION_MODES.map(m => (
              <SelectItem key={m.value} value={m.value}>
                <div className="flex flex-col">
                  <span className="font-medium">{t(m.label, m.label)}</span>
                  <span className="text-xs text-muted-foreground">{t(m.description, m.description)}</span>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex items-center gap-3 py-4">
          <Sparkles className="w-5 h-5 animate-pulse" style={{ color: 'rgba(180,140,75,0.6)' }} />
          <span className="text-sm" style={{ color: 'rgba(224,216,200,0.6)' }}>
            {t('session.crafting', 'Crafting your perfect session…')}
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

          {/* Learning indicator + Mode bias */}
          <div className="space-y-1">
            {recommendation.learning_context && (
              <div className="flex items-center gap-1.5">
                <Brain className="w-3 h-3 flex-shrink-0" style={{ color: 'rgba(180,140,75,0.5)' }} />
                <span className="text-xs" style={{ color: 'rgba(180,140,75,0.5)' }}>
                  {recommendation.learning_context}
                </span>
              </div>
            )}
            {recommendation.mode_bias && (
              <div className="text-xs" style={{ color: 'rgba(180,140,75,0.4)' }}>
                Mode bias: {recommendation.mode_bias}
              </div>
            )}
          </div>

          {/* CTA Buttons */}
          <div className="flex gap-2 pt-2">
            <Button
              onClick={recordSession}
              disabled={savingSession}
              size="sm"
              variant="outline"
              className="flex-1"
            >
              <Save className="w-3.5 h-3.5 mr-1.5" />
              Record Session
            </Button>
            <Button
              onClick={() => navigate('/Curator?prompt=' + encodeURIComponent(`Tell me more about tonight's session: ${recommendation.pipe} with ${recommendation.blend}${recommendation.whiskey ? ` and ${recommendation.whiskey}` : ''}`))}
              className="flex-1 sm:flex-none"
              style={{
                background: 'linear-gradient(135deg, rgba(139,58,58,0.9), rgba(109,46,46,1))',
                border: 'none',
              }}
            >
              <Sparkles className="w-3.5 h-3.5 mr-1.5" />
              Curator
              <ChevronRight className="w-3 h-3 ml-1" />
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}