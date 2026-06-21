import React, { useState } from "react";
import { useCurrentUser } from "@/components/hooks/useCurrentUser";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { base44 } from "@/api/base44Client";
import { TrendingUp, Users, Target, RefreshCw, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useTranslation } from '@/components/i18n/safeTranslation';

export default function CuratorAnalyticsDashboard() {
  const { t } = useTranslation();
  const { isAdmin } = useCurrentUser();
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState(null);
  const [segmentData, setSegmentData] = useState(null);
  const [periodDays, setPeriodDays] = useState(7);

  if (!isAdmin) {
    return (
      <div className="p-8 text-center">
        <p className="text-stone-400">{t("auto.pages_CuratorAnalyticsDashboard.admin_access_required_1yiv4j")}</p>
      </div>
    );
  }

  const loadAnalytics = async () => {
    setLoading(true);
    try {
      const [recResult, segResult] = await Promise.all([
        base44.functions.invoke('getRecommendationAnalytics', { period_days: periodDays }),
        base44.functions.invoke('getUserSegmentAnalytics', { period_days: periodDays }),
      ]);

      setData(recResult.data);
      setSegmentData(segResult.data);
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
          <h1 className="text-3xl font-bold text-[#E0D8C8]">{t("auto.pages_CuratorAnalyticsDashboard.curator_analytics_3534d")}</h1>
          <p className="text-sm text-[#E0D8C8]/70">{t("auto.pages_CuratorAnalyticsDashboard.recommendation_performance_and_user_engagement_922o49")}</p>
        </div>
        <div className="flex gap-2">
          <select
            value={periodDays}
            onChange={(e) => setPeriodDays(Number(e.target.value))}
            className="px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-[#E0D8C8]"
          >
            <option value={7}>{t("auto.pages_CuratorAnalyticsDashboard.last_7_days_13lolf")}</option>
            <option value={14}>{t("auto.pages_CuratorAnalyticsDashboard.last_14_days_1hucdk")}</option>
            <option value={30}>{t("auto.pages_CuratorAnalyticsDashboard.last_30_days_mxudgt")}</option>
            <option value={90}>{t("auto.pages_CuratorAnalyticsDashboard.last_90_days_9123w3")}</option>
          </select>
          <Button onClick={loadAnalytics} disabled={loading}>
            {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-2" />}
            {t("auto.pages_CuratorAnalyticsDashboard.load_analytics_y35v2l")}
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
                  {t("auto.pages_CuratorAnalyticsDashboard.active_users_12la5z")}
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
                  {t("auto.pages_CuratorAnalyticsDashboard.curator_sessions_uwjhjw")}
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
                  {t("auto.pages_CuratorAnalyticsDashboard.explore_rate_17iinu")}
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
                  {t("auto.pages_CuratorAnalyticsDashboard.conversion_rate_1fg48h")}
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
              <CardTitle>{t("auto.pages_CuratorAnalyticsDashboard.recommendation_performance_1k6x5v")}</CardTitle>
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
                        <p className="text-xs text-[#E0D8C8]/60">{t("auto.pages_CuratorAnalyticsDashboard.shown_3wruxg")}</p>
                        <p className="font-bold text-[#E0D8C8]">{rec.impressions}</p>
                      </div>
                      <div className="text-center">
                        <p className="text-xs text-[#E0D8C8]/60">{t("auto.pages_CuratorAnalyticsDashboard.explored_l1xp48")}</p>
                        <p className="font-bold text-emerald-400">{rec.explores}</p>
                      </div>
                      <div className="text-center">
                        <p className="text-xs text-[#E0D8C8]/60">CTR</p>
                        <p className="font-bold text-blue-400">{rec.explore_rate}%</p>
                      </div>
                      <div className="text-center">
                        <p className="text-xs text-[#E0D8C8]/60">{t("auto.pages_CuratorAnalyticsDashboard.conv_yjqncr")}</p>
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
              <CardTitle>{t("auto.pages_CuratorAnalyticsDashboard.user_segments_1cjmj5")}</CardTitle>
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
              <CardTitle>{t("auto.pages_CuratorAnalyticsDashboard.subscription_tier_distribution_j2yk72")}</CardTitle>
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
              <CardTitle>{t("auto.pages_CuratorAnalyticsDashboard.top_engaged_users_last_1701n0")} {periodDays} days)</CardTitle>
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
          <p className="text-[#E0D8C8]/60 mb-4">{t("auto.pages_CuratorAnalyticsDashboard.click_load_analytics_to_view_curator_19izs0")}</p>
        </div>
      )}
    </div>
  );
}