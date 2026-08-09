import React, { useState } from "react";
import { useCurrentUser } from "@/components/hooks/useCurrentUser";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { TrendingUp, Users, Target, RefreshCw, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { getCanonicalCuratorAnalytics } from "@/lib/analytics/canonicalAnalyticsService";

export default function CuratorAnalyticsDashboard() {
  const { isAdmin } = useCurrentUser();
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState(null);
  const [segmentData, setSegmentData] = useState(null);
  const [periodDays, setPeriodDays] = useState(7);

  if (!isAdmin) {
    return (
      <div className="p-8 text-center">
        <p className="text-stone-400">Admin access required</p>
      </div>
    );
  }

  const loadAnalytics = async () => {
    setLoading(true);
    try {
      const result = await getCanonicalCuratorAnalytics(periodDays);
      setData(result?.recommendation || null);
      setSegmentData(result?.segment || null);
    } catch (error) {
      console.error('Failed to load analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-[#E0D8C8]">Curator Analytics</h1>
          <p className="text-sm text-[#E0D8C8]/70">Recommendation performance and user engagement</p>
        </div>
        <div className="flex gap-2">
          <select
            value={periodDays}
            onChange={(e) => setPeriodDays(Number(e.target.value))}
            className="px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-[#E0D8C8]"
          >
            <option value={7}>Last 7 days</option>
            <option value={14}>Last 14 days</option>
            <option value={30}>Last 30 days</option>
            <option value={90}>Last 90 days</option>
          </select>
          <Button onClick={loadAnalytics} disabled={loading}>
            {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-2" />}
            Load Analytics
          </Button>
        </div>
      </div>

      {data && (
        <>
          {/* Overall Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  Active Users
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold text-[#E0D8C8]">{data.overall.active_users}</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2">
                  <Target className="w-4 h-4" />
                  Curator Sessions
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold text-[#E0D8C8]">{data.overall.curator_sessions}</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2">
                  <TrendingUp className="w-4 h-4" />
                  Explore Rate
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold text-[#E0D8C8]">{data.overall.overall_explore_rate}%</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2">
                  <TrendingUp className="w-4 h-4" />
                  Conversion Rate
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold text-[#E0D8C8]">{data.overall.overall_conversion_rate}%</p>
              </CardContent>
            </Card>
          </div>

          {/* Recommendation Performance */}
          <Card>
            <CardHeader>
              <CardTitle>Recommendation Performance</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {data.by_recommendation.slice(0, 10).map((rec, idx) => (
                  <div key={idx} className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
                    <div className="flex-1">
                      <p className="font-medium text-[#E0D8C8]">{rec.recommendation_key}</p>
                      <div className="flex gap-2 mt-1">
                        <Badge variant="outline" className="text-xs">
                          {rec.module}
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          {rec.category}
                        </Badge>
                      </div>
                    </div>
                    <div className="flex gap-6 text-sm">
                      <div className="text-center">
                        <p className="text-xs text-[#E0D8C8]/60">Shown</p>
                        <p className="font-bold text-[#E0D8C8]">{rec.impressions}</p>
                      </div>
                      <div className="text-center">
                        <p className="text-xs text-[#E0D8C8]/60">Explored</p>
                        <p className="font-bold text-emerald-400">{rec.explores}</p>
                      </div>
                      <div className="text-center">
                        <p className="text-xs text-[#E0D8C8]/60">CTR</p>
                        <p className="font-bold text-blue-400">{rec.explore_rate}%</p>
                      </div>
                      <div className="text-center">
                        <p className="text-xs text-[#E0D8C8]/60">Conv</p>
                        <p className="font-bold text-amber-400">{rec.conversion_rate}%</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {segmentData && (
        <>
          {/* User Segments */}
          <Card>
            <CardHeader>
              <CardTitle>User Segments</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {Object.entries(segmentData.segments).map(([key, count]) => (
                  <div key={key} className="p-3 bg-white/5 rounded-lg">
                    <p className="text-xs text-[#E0D8C8]/60 mb-1">
                      {key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                    </p>
                    <p className="text-2xl font-bold text-[#E0D8C8]">{count}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Tier Distribution */}
          <Card>
            <CardHeader>
              <CardTitle>Subscription Tier Distribution</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex gap-4">
                {Object.entries(segmentData.tier_distribution).map(([tier, count]) => (
                  <div key={tier} className="flex-1 p-4 bg-white/5 rounded-lg text-center">
                    <p className="text-xs text-[#E0D8C8]/60 mb-1 uppercase">{tier}</p>
                    <p className="text-3xl font-bold text-[#E0D8C8]">{count}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Top Engaged Users */}
          <Card>
            <CardHeader>
              <CardTitle>Top Engaged Users (Last {periodDays} days)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {segmentData.top_engaged_users.slice(0, 10).map((u, idx) => (
                  <div key={idx} className="flex items-center justify-between p-2 bg-white/5 rounded">
                    <span className="text-sm text-[#E0D8C8]/80">{u.email}</span>
                    <div className="flex gap-4 text-xs">
                      <span className="text-[#E0D8C8]/60">{u.curator_messages} msgs</span>
                      <span className="text-emerald-400">{u.recommendations_accepted} accepted</span>
                      <Badge variant="outline" className="text-xs">{u.tier}</Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {!data && !loading && (
        <div className="text-center py-12">
          <p className="text-[#E0D8C8]/60 mb-4">Click "Load Analytics" to view Curator performance data</p>
        </div>
      )}
    </div>
  );
}