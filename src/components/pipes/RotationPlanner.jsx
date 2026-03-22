import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CalendarClock, AlertTriangle, CheckCircle, ChevronDown, ChevronUp } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/components/utils/createPageUrl';
import { useTranslation } from '@/components/i18n/safeTranslation';
import { differenceInCalendarDays } from 'date-fns';
import { parseLocalCalendarDate } from '@/components/utils/schemaCompatibility';

export default function RotationPlanner({ user }) {
  const { t } = useTranslation();
  const [expandedNeverSmoked, setExpandedNeverSmoked] = useState(false);
  const [expandedRecentlySmoked, setExpandedRecentlySmoked] = useState(false);
  const [expandedInRegularRotation, setExpandedInRegularRotation] = useState(false);
  const [expandedNeedsRotation, setExpandedNeedsRotation] = useState(false);
  const { data: pipes = [] } = useQuery({
    queryKey: ['pipes', user?.email],
    queryFn: () => base44.entities.Pipe.filter({ created_by: user?.email }, '-updated_date', 500),
    enabled: !!user?.email,
  });

  const { data: logs = [] } = useQuery({
    queryKey: ['smoking-logs', user?.email],
    queryFn: () => base44.entities.SmokingLog.filter({ created_by: user?.email }, '-date', 1000),
    enabled: !!user?.email,
  });

  // Calculate last smoked date for each pipe (safe from invalid dates)
   const getBowlsUsed = (log) => {
     if (!log) return 0;
     return log.bowls_used || log.bowls_smoked || 1;
   };

   // ISSUE-1: Exclude collection-only (ai_excluded) pipes from all rotation/usage analytics
   const activePipes = (pipes || []).filter(p => !p.ai_excluded);

   const pipeRotation = activePipes.map(pipe => {
     try {
       const pipeLogs = (logs || []).filter(log => log && log.pipe_id === pipe.id);
       const lastLog = pipeLogs[0]; // Already sorted by -date
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
         ...pipe,
         lastSmoked,
         daysSince,
         totalSessions: pipeLogs.reduce((sum, log) => sum + getBowlsUsed(log), 0),
       };
     } catch {
       return { ...pipe, lastSmoked: null, daysSince: null, totalSessions: 0 };
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
                  {needsRotation.slice(0, expandedNeedsRotation ? needsRotation.length : 5).map(pipe => (
                    <Link 
                      key={pipe.id} 
                      to={createPageUrl('PipeDetail') + `?id=${pipe.id}`}
                      className="block"
                    >
                      <div className="flex items-center justify-between p-3 rounded-lg transition-colors" style={{
                        background: "linear-gradient(135deg, rgba(80,50,30,0.3), rgba(70,40,25,0.5))",
                        border: "1px solid rgba(200,120,60,0.3)"
                      }}>
                        <div className="min-w-0 flex-1">
                          <p className="font-medium text-sm truncate" style={{ color: "#E0D8C8" }}>{pipe.name}</p>
                          <p className="text-xs truncate" style={{ color: "rgba(200,140,80,0.8)" }}>
                            {t("tobacconist.lastSmokedDaysAgo", {days: pipe.daysSince})}
                            </p>
                            </div>
                            <Badge variant="outline" style={{ color: "rgba(220,140,80,0.9)", borderColor: "rgba(200,120,60,0.4)" }} className="flex-shrink-0">
                          {pipe.daysSince}d
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
                  {neverSmoked.slice(0, expandedNeverSmoked ? neverSmoked.length : 3).map(pipe => (
                    <Link 
                      key={pipe.id} 
                      to={createPageUrl('PipeDetail') + `?id=${pipe.id}`}
                      className="block"
                    >
                      <div className="flex items-center justify-between p-3 rounded-lg transition-colors" style={{
                        background: "linear-gradient(135deg, rgba(70,35,35,0.3), rgba(60,25,25,0.5))",
                        border: "1px solid rgba(180,80,80,0.3)"
                      }}>
                        <div className="min-w-0 flex-1">
                          <p className="font-medium text-sm truncate" style={{ color: "#E0D8C8" }}>{pipe.name}</p>
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
                  {recentlySmoked.slice(0, expandedRecentlySmoked ? 10 : 3).map(pipe => (
                    <div 
                      key={pipe.id} 
                      className="flex items-center justify-between p-3 rounded-lg"
                      style={{
                        background: "linear-gradient(135deg, rgba(35,60,35,0.3), rgba(28,50,28,0.5))",
                        border: "1px solid rgba(80,160,80,0.3)"
                      }}
                    >
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-sm truncate" style={{ color: "#E0D8C8" }}>{pipe.name}</p>
                        <p className="text-xs truncate" style={{ color: "rgba(100,180,100,0.8)" }}>
                          {pipe.daysSince === 0 ? t("tobacconist.today") : `${pipe.daysSince} ${pipe.daysSince > 1 ? t("tobacconist.days") : t("tobacconist.day")} ${t("common.ago")}`}
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
                  {inRegularRotation.slice(0, expandedInRegularRotation ? inRegularRotation.length : 3).map(pipe => (
                    <Link
                      key={pipe.id}
                      to={createPageUrl('PipeDetail') + `?id=${pipe.id}`}
                      className="block"
                    >
                      <div className="flex items-center justify-between p-3 rounded-lg transition-colors" style={{
                        background: "linear-gradient(135deg, rgba(50,40,30,0.3), rgba(40,30,20,0.5))",
                        border: "1px solid rgba(140,105,65,0.3)"
                      }}>
                        <div>
                          <p className="font-medium text-sm" style={{ color: "#E0D8C8" }}>{pipe.name}</p>
                          <p className="text-xs" style={{ color: "rgba(180,140,75,0.7)" }}>
                            {t("tobacconist.lastSmokedDaysAgo", {days: pipe.daysSince})}
                            </p>
                            </div>
                            <Badge variant="outline" style={{ color: "rgba(180,140,75,0.9)", borderColor: "rgba(140,105,65,0.4)" }}>
                          {pipe.daysSince}d
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