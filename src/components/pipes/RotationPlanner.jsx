import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CalendarClock, AlertTriangle, CheckCircle, ChevronDown, ChevronUp, Clock, Flame } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/components/utils/createPageUrl';
import { useTranslation } from '@/components/i18n/safeTranslation';
import { differenceInCalendarDays } from 'date-fns';
import { parseLocalCalendarDate } from '@/components/utils/schemaCompatibility';

// ─── Single-pipe rotation view (used in PipeDetail) ────────────────────────
function SinglePipeRotation({ pipe }) {
  const { data: logs = [], isLoading } = useQuery({
    queryKey: ['smoking-logs-pipe', pipe.id],
    queryFn: () => base44.entities.SmokingLog.filter({ pipe_id: pipe.id }, '-date', 20),
    enabled: !!pipe.id,
  });

  const recentLogs = logs.slice(0, 5);
  const lastLog = logs[0];
  let daysSince = null;
  if (lastLog?.date) {
    try {
      const d = parseLocalCalendarDate(lastLog.date);
      if (!isNaN(d.getTime())) daysSince = differenceInCalendarDays(new Date(), d);
    } catch {}
  }

  // Rest recommendation logic
  let restStatus = null;
  if (daysSince === null) {
    restStatus = { label: 'Never Used', color: 'rgba(180,140,75,0.9)', bg: 'rgba(180,140,75,0.1)', border: 'rgba(180,140,75,0.3)', icon: 'new' };
  } else if (daysSince <= 2) {
    restStatus = { label: 'Rest Recommended', sub: `Last used ${daysSince === 0 ? 'today' : daysSince + 'd ago'} — allow at least 2–3 days`, color: 'rgba(220,100,80,0.9)', bg: 'rgba(180,60,40,0.15)', border: 'rgba(200,80,60,0.35)', icon: 'rest' };
  } else if (daysSince <= 6) {
    restStatus = { label: 'Almost Ready', sub: `Last used ${daysSince}d ago — ready in ${Math.max(0, 3 - daysSince) === 0 ? 'a day or two' : (3 - daysSince) + ' more day(s)'}`, color: 'rgba(220,170,70,0.9)', bg: 'rgba(180,140,40,0.12)', border: 'rgba(200,160,60,0.3)', icon: 'soon' };
  } else {
    restStatus = { label: 'Ready to Smoke', sub: `Rested ${daysSince} days — good to go`, color: 'rgba(80,180,100,0.9)', bg: 'rgba(40,120,60,0.15)', border: 'rgba(60,160,80,0.3)', icon: 'ready' };
  }

  return (
    <div className="space-y-4">
      {/* Status card */}
      <div className="rounded-xl p-4" style={{ background: restStatus.bg, border: `1px solid ${restStatus.border}` }}>
        <div className="flex items-center gap-3">
          {restStatus.icon === 'rest' ? <Flame className="w-5 h-5" style={{ color: restStatus.color }} /> :
           restStatus.icon === 'ready' ? <CheckCircle className="w-5 h-5" style={{ color: restStatus.color }} /> :
           <Clock className="w-5 h-5" style={{ color: restStatus.color }} />}
          <div>
            <p className="font-semibold text-sm" style={{ color: restStatus.color }}>{restStatus.label}</p>
            {restStatus.sub && <p className="text-xs mt-0.5" style={{ color: 'rgba(224,216,200,0.65)' }}>{restStatus.sub}</p>}
          </div>
        </div>
      </div>

      {/* Recent sessions */}
      <div>
        <p className="text-xs uppercase tracking-wider mb-2" style={{ color: 'rgba(180,140,75,0.7)' }}>Recent Sessions</p>
        {isLoading && <p className="text-xs" style={{ color: 'rgba(224,216,200,0.5)' }}>Loading…</p>}
        {!isLoading && recentLogs.length === 0 && (
          <p className="text-sm" style={{ color: 'rgba(224,216,200,0.5)' }}>No sessions logged yet for this pipe.</p>
        )}
        <div className="space-y-2">
          {recentLogs.map((log, i) => {
            let dateLabel = log.date || '';
            try {
              const d = parseLocalCalendarDate(log.date);
              if (!isNaN(d.getTime())) {
                const diff = differenceInCalendarDays(new Date(), d);
                dateLabel = diff === 0 ? 'Today' : diff === 1 ? 'Yesterday' : `${diff} days ago`;
              }
            } catch {}
            const bowls = log.bowls_used || log.bowls_smoked || 1;
            return (
              <div key={log.id || i} className="flex items-center justify-between p-3 rounded-lg" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(180,140,75,0.12)' }}>
                <div>
                  <p className="text-sm font-medium" style={{ color: '#E0D8C8' }}>{log.blend_name || 'Unknown blend'}</p>
                  <p className="text-xs" style={{ color: 'rgba(180,140,75,0.7)' }}>{dateLabel} · {bowls} {bowls === 1 ? 'bowl' : 'bowls'}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ─── Collection-wide rotation view ──────────────────────────────────────────
export default function RotationPlanner({ user, pipe }) {
  const { t } = useTranslation();
  const [expandedNeedsRotation, setExpandedNeedsRotation] = useState(false);
  const [expandedNeverSmoked, setExpandedNeverSmoked] = useState(false);
  const [expandedRecentlySmoked, setExpandedRecentlySmoked] = useState(false);
  const [expandedInRegularRotation, setExpandedInRegularRotation] = useState(false);

  // ALL hooks run unconditionally before any early return
  const { data: allPipes = [] } = useQuery({
    queryKey: ['pipes-rotation', user?.email],
    queryFn: () => base44.entities.Pipe.filter({ created_by: user?.email }, '-updated_date', 500),
    enabled: !!user?.email && !pipe,
  });

  const { data: logs = [] } = useQuery({
    queryKey: ['smoking-logs', user?.email],
    queryFn: () => base44.entities.SmokingLog.filter({ created_by: user?.email }, '-date', 1000),
    enabled: !!user?.email && !pipe,
  });

  // If a specific pipe is passed, render single-pipe mode
  if (pipe) {
    return (
      <div className="space-y-1">
        <div className="flex items-center gap-2 mb-3">
          <CalendarClock className="w-4 h-4" style={{ color: 'rgba(180,140,75,0.9)' }} />
          <span className="font-semibold text-sm" style={{ color: '#F5F1E7' }}>Rotation Status</span>
        </div>
        <SinglePipeRotation pipe={pipe} />
      </div>
    );
  }

  const getBowlsUsed = (log) => {
    if (!log) return 0;
    return log.bowls_used || log.bowls_smoked || 1;
  };

  // Exclude collection-only (ai_excluded) pipes from rotation analytics
  const activePipes = (allPipes || []).filter(p => !p.ai_excluded);

  const pipeRotation = activePipes.map(p => {
    try {
      const pipeLogs = (logs || []).filter(log => log && log.pipe_id === p.id);
      const lastLog = pipeLogs.sort((a, b) => new Date(b.date) - new Date(a.date))[0];
      let lastSmoked = null;
      let daysSince = null;

      if (lastLog?.date) {
        try {
          const d = parseLocalCalendarDate(lastLog.date);
          if (!Number.isNaN(d.getTime())) {
            lastSmoked = d;
            daysSince = differenceInCalendarDays(new Date(), d);
          }
        } catch {
          // invalid date, leave as null
        }
      }

      return {
        ...p,
        lastSmoked,
        daysSince,
        totalSessions: pipeLogs.reduce((sum, log) => sum + getBowlsUsed(log), 0),
      };
    } catch {
      return { ...p, lastSmoked: null, daysSince: null, totalSessions: 0 };
    }
  });

  const needsRotation = pipeRotation
    .filter(p => p.daysSince !== null && p.daysSince > 60)
    .sort((a, b) => b.daysSince - a.daysSince);

  const inRegularRotation = pipeRotation
    .filter(p => p.daysSince !== null && p.daysSince > 7 && p.daysSince <= 60)
    .sort((a, b) => b.daysSince - a.daysSince);

  const recentlySmoked = pipeRotation
    .filter(p => p.daysSince !== null && p.daysSince <= 7)
    .sort((a, b) => a.daysSince - b.daysSince);

  const neverSmoked = pipeRotation.filter(p => p.daysSince === null);

  return (
    <div className="space-y-4">
      <Card style={{
        background: "linear-gradient(145deg, rgba(40,28,20,0.95), rgba(32,22,15,0.95))",
        border: "1px solid rgba(140,105,65,0.35)",
        boxShadow: "0 10px 28px rgba(0,0,0,0.6), inset 0 1px 0 rgba(200,160,110,0.12)"
      }}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2" style={{ color: "#F5F1E7", fontFamily: "'Georgia', serif" }}>
            <CalendarClock className="w-5 h-5" style={{ color: "rgba(180,140,75,0.9)" }} />
            {t("tobacconist.rotationPlanner")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {needsRotation.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-orange-500" />
                    <h3 className="font-semibold text-sm" style={{ color: "#E0D8C8" }}>{t("tobacconist.needsRotation")} ({needsRotation.length})</h3>
                  </div>
                  {needsRotation.length > 5 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setExpandedNeedsRotation(!expandedNeedsRotation)}
                      className="h-7 text-xs"
                    >
                      {expandedNeedsRotation ? (
                        <>{t("tobacconist.showLess")} <ChevronUp className="w-3 h-3 ml-1" /></>
                      ) : (
                        <>{t("tobacconist.showAll")} <ChevronDown className="w-3 h-3 ml-1" /></>
                      )}
                    </Button>
                  )}
                </div>
                <div className="space-y-2">
                  {needsRotation.slice(0, expandedNeedsRotation ? needsRotation.length : 5).map(p => (
                    <Link
                      key={p.id}
                      to={createPageUrl('PipeDetail') + `?id=${p.id}`}
                      className="block"
                    >
                      <div className="flex items-center justify-between p-3 rounded-lg transition-colors" style={{
                        background: "linear-gradient(135deg, rgba(80,50,30,0.3), rgba(70,40,25,0.5))",
                        border: "1px solid rgba(200,120,60,0.3)"
                      }}>
                        <div className="min-w-0 flex-1">
                          <p className="font-medium text-sm truncate" style={{ color: "#E0D8C8" }}>{p.name}</p>
                          <p className="text-xs truncate" style={{ color: "rgba(200,140,80,0.8)" }}>
                            {t("tobacconist.lastSmokedDaysAgo", { days: p.daysSince })}
                          </p>
                        </div>
                        <Badge variant="outline" style={{ color: "rgba(220,140,80,0.9)", borderColor: "rgba(200,120,60,0.4)" }} className="flex-shrink-0">
                          {p.daysSince}d
                        </Badge>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {neverSmoked.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-red-500" />
                    <h3 className="font-semibold text-sm" style={{ color: "#E0D8C8" }}>{t("tobacconist.neverSmoked")} ({neverSmoked.length})</h3>
                  </div>
                  {neverSmoked.length > 3 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setExpandedNeverSmoked(!expandedNeverSmoked)}
                      className="h-7 text-xs"
                    >
                      {expandedNeverSmoked ? (
                        <>{t("tobacconist.showLess")} <ChevronUp className="w-3 h-3 ml-1" /></>
                      ) : (
                        <>{t("tobacconist.showAll")} <ChevronDown className="w-3 h-3 ml-1" /></>
                      )}
                    </Button>
                  )}
                </div>
                <div className="space-y-2">
                  {neverSmoked.slice(0, expandedNeverSmoked ? neverSmoked.length : 3).map(p => (
                    <Link
                      key={p.id}
                      to={createPageUrl('PipeDetail') + `?id=${p.id}`}
                      className="block"
                    >
                      <div className="flex items-center justify-between p-3 rounded-lg transition-colors" style={{
                        background: "linear-gradient(135deg, rgba(70,35,35,0.3), rgba(60,25,25,0.5))",
                        border: "1px solid rgba(180,80,80,0.3)"
                      }}>
                        <div className="min-w-0 flex-1">
                          <p className="font-medium text-sm truncate" style={{ color: "#E0D8C8" }}>{p.name}</p>
                          <p className="text-xs truncate" style={{ color: "rgba(200,120,120,0.8)" }}>{t("tobacconist.noUsageSessionsRecorded")}</p>
                        </div>
                        <Badge variant="outline" style={{ color: "rgba(200,120,120,0.9)", borderColor: "rgba(180,80,80,0.4)" }} className="flex-shrink-0">
                          {t("tobacconist.new")}
                        </Badge>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {recentlySmoked.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    <h3 className="font-semibold text-sm" style={{ color: "#E0D8C8" }}>{t("tobacconist.recentlyUsed")}</h3>
                  </div>
                  {recentlySmoked.length > 3 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setExpandedRecentlySmoked(!expandedRecentlySmoked)}
                      className="h-7 text-xs"
                    >
                      {expandedRecentlySmoked ? (
                        <>{t("tobacconist.showLess")} <ChevronUp className="w-3 h-3 ml-1" /></>
                      ) : (
                        <>{t("tobacconist.showMore")} <ChevronDown className="w-3 h-3 ml-1" /></>
                      )}
                    </Button>
                  )}
                </div>
                <div className="space-y-2">
                  {recentlySmoked.slice(0, expandedRecentlySmoked ? 10 : 3).map(p => (
                    <div
                      key={p.id}
                      className="flex items-center justify-between p-3 rounded-lg"
                      style={{
                        background: "linear-gradient(135deg, rgba(35,60,35,0.3), rgba(28,50,28,0.5))",
                        border: "1px solid rgba(80,160,80,0.3)"
                      }}
                    >
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-sm truncate" style={{ color: "#E0D8C8" }}>{p.name}</p>
                        <p className="text-xs truncate" style={{ color: "rgba(100,180,100,0.8)" }}>
                          {p.daysSince === 0 ? t("tobacconist.today") : `${p.daysSince} ${p.daysSince > 1 ? t("tobacconist.days") : t("tobacconist.day")} ${t("common.ago")}`}
                        </p>
                      </div>
                      <Badge variant="outline" style={{ color: "rgba(100,180,100,0.9)", borderColor: "rgba(80,160,80,0.4)" }} className="flex-shrink-0">
                        {t("tobacconist.active")}
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {inRegularRotation.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4" style={{ color: "rgba(180,140,75,0.8)" }} />
                    <h3 className="font-semibold text-sm" style={{ color: "#E0D8C8" }}>{t("tobacconist.inRegularRotation")} ({inRegularRotation.length})</h3>
                  </div>
                  {inRegularRotation.length > 3 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setExpandedInRegularRotation(!expandedInRegularRotation)}
                      className="h-7 text-xs"
                    >
                      {expandedInRegularRotation ? (
                        <>{t("tobacconist.showLess")} <ChevronUp className="w-3 h-3 ml-1" /></>
                      ) : (
                        <>{t("tobacconist.showMore")} <ChevronDown className="w-3 h-3 ml-1" /></>
                      )}
                    </Button>
                  )}
                </div>
                <div className="space-y-2">
                  {inRegularRotation.slice(0, expandedInRegularRotation ? inRegularRotation.length : 3).map(p => (
                    <Link
                      key={p.id}
                      to={createPageUrl('PipeDetail') + `?id=${p.id}`}
                      className="block"
                    >
                      <div className="flex items-center justify-between p-3 rounded-lg transition-colors" style={{
                        background: "linear-gradient(135deg, rgba(50,40,30,0.3), rgba(40,30,20,0.5))",
                        border: "1px solid rgba(140,105,65,0.3)"
                      }}>
                        <div>
                          <p className="font-medium text-sm" style={{ color: "#E0D8C8" }}>{p.name}</p>
                          <p className="text-xs" style={{ color: "rgba(180,140,75,0.7)" }}>
                            {t("tobacconist.lastSmokedDaysAgo", { days: p.daysSince })}
                          </p>
                        </div>
                        <Badge variant="outline" style={{ color: "rgba(180,140,75,0.9)", borderColor: "rgba(140,105,65,0.4)" }}>
                          {p.daysSince}d
                        </Badge>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {needsRotation.length === 0 && neverSmoked.length === 0 && recentlySmoked.length === 0 && inRegularRotation.length === 0 && (
              <p className="text-center py-8" style={{ color: "rgba(224,216,200,0.5)" }}>
                {t("tobacconist.noPipesInCollection")}
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}