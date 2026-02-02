import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CalendarClock, AlertTriangle, CheckCircle, ChevronDown, ChevronUp } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/components/utils/createPageUrl';

export default function RotationPlanner({ user }) {
  const [expandedNeverSmoked, setExpandedNeverSmoked] = useState(false);
  const [expandedRecentlySmoked, setExpandedRecentlySmoked] = useState(false);
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
   const pipeRotation = (pipes || []).map(pipe => {
     try {
       const pipeLogs = (logs || []).filter(log => log && log.pipe_id === pipe.id);
       const lastLog = pipeLogs[0]; // Already sorted by -date
       let lastSmoked = null;
       let daysSince = null;

       if (lastLog?.date) {
         try {
           const d = new Date(lastLog.date);
           if (!Number.isNaN(d.getTime())) {
             lastSmoked = d;
             daysSince = Math.floor((new Date() - d) / (1000 * 60 * 60 * 24));
           }
         } catch {
           // invalid date, leave as null
         }
       }

       return {
         ...pipe,
         lastSmoked,
         daysSince,
         totalSessions: pipeLogs.reduce((sum, log) => sum + (Number(log?.bowls_smoked) || 1), 0),
       };
     } catch {
       return { ...pipe, lastSmoked: null, daysSince: null, totalSessions: 0 };
     }
   });

  const needsRotation = pipeRotation
    .filter(p => p.daysSince !== null && p.daysSince > 60)
    .sort((a, b) => b.daysSince - a.daysSince);

  const recentlySmoked = pipeRotation
    .filter(p => p.daysSince !== null && p.daysSince <= 7)
    .sort((a, b) => a.daysSince - b.daysSince);

  const neverSmoked = pipeRotation.filter(p => p.daysSince === null);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalendarClock className="w-5 h-5" />
            Rotation Planner
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {needsRotation.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <AlertTriangle className="w-4 h-4 text-orange-500" />
                  <h3 className="font-semibold text-sm">Needs Rotation ({needsRotation.length})</h3>
                </div>
                <div className="space-y-2">
                  {needsRotation.slice(0, 5).map(pipe => (
                    <Link 
                      key={pipe.id} 
                      to={createPageUrl('PipeDetail') + `?id=${pipe.id}`}
                      className="block"
                    >
                      <div className="flex items-center justify-between p-3 border border-orange-200 rounded-lg hover:bg-orange-50 transition-colors">
                        <div>
                          <p className="font-medium text-sm">{pipe.name}</p>
                          <p className="text-xs text-stone-500">
                            Last smoked {pipe.daysSince} days ago
                          </p>
                        </div>
                        <Badge variant="outline" className="text-orange-600 border-orange-300">
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
                    <h3 className="font-semibold text-sm">Never Smoked ({neverSmoked.length})</h3>
                  </div>
                  {neverSmoked.length > 3 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setExpandedNeverSmoked(!expandedNeverSmoked)}
                      className="h-7 text-xs"
                    >
                      {expandedNeverSmoked ? (
                        <>Show Less <ChevronUp className="w-3 h-3 ml-1" /></>
                      ) : (
                        <>Show All <ChevronDown className="w-3 h-3 ml-1" /></>
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
                      <div className="flex items-center justify-between p-3 border border-red-200 rounded-lg hover:bg-red-50 transition-colors">
                        <div>
                          <p className="font-medium text-sm">{pipe.name}</p>
                          <p className="text-xs text-stone-500">No smoking sessions recorded</p>
                        </div>
                        <Badge variant="outline" className="text-red-600 border-red-300">
                          New
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
                    <h3 className="font-semibold text-sm">Recently Smoked</h3>
                  </div>
                  {recentlySmoked.length > 3 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setExpandedRecentlySmoked(!expandedRecentlySmoked)}
                      className="h-7 text-xs"
                    >
                      {expandedRecentlySmoked ? (
                        <>Show Less <ChevronUp className="w-3 h-3 ml-1" /></>
                      ) : (
                        <>Show More <ChevronDown className="w-3 h-3 ml-1" /></>
                      )}
                    </Button>
                  )}
                </div>
                <div className="space-y-2">
                  {recentlySmoked.slice(0, expandedRecentlySmoked ? 10 : 3).map(pipe => (
                    <div 
                      key={pipe.id} 
                      className="flex items-center justify-between p-3 border border-green-200 rounded-lg"
                    >
                      <div>
                        <p className="font-medium text-sm">{pipe.name}</p>
                        <p className="text-xs text-stone-500">
                          {pipe.daysSince === 0 ? 'Today' : `${pipe.daysSince} day${pipe.daysSince > 1 ? 's' : ''} ago`}
                        </p>
                      </div>
                      <Badge variant="outline" className="text-green-600 border-green-300">
                        Active
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {needsRotation.length === 0 && neverSmoked.length === 0 && recentlySmoked.length === 0 && (
              <p className="text-center text-stone-500 py-8">
                No pipes in collection yet
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}