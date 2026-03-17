import React, { useState, useMemo } from 'react';
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Loader2, Users, TrendingUp, RefreshCw, Crown, UserX, Search, ChevronDown, ChevronUp, UserPlus, Clock, Zap, TrendingDown } from "lucide-react";
import { toast } from "sonner";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { useTranslation } from "@/components/i18n/safeTranslation";


export default function UserReport() {
  const { t } = useTranslation();
  const [viewFilter, setViewFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showPaidTable, setShowPaidTable] = useState(true);
  const [showFreeTable, setShowFreeTable] = useState(true);
  const [sortColumn, setSortColumn] = useState('created_date');
  const [sortDirection, setSortDirection] = useState('desc');
  const [isSyncing, setIsSyncing] = useState(false);

  const { data: user, isLoading: isLoadingUser, error: userError } = useQuery({
    queryKey: ['current-user'],
    queryFn: () => base44.auth.me(),
    retry: false,
  });
  const isAdmin = user?.role === 'admin';

  const { data: report, isLoading, error, refetch } = useQuery({
    queryKey: ['user-report'],
    queryFn: async () => {
      const response = await base44.functions.invoke('getUserReport', {});
      return response.data;
    },
    enabled: isAdmin,
    retry: false,
  });

  const { data: adminMetrics, isLoading: metricsLoading } = useQuery({
    queryKey: ['admin-metrics'],
    queryFn: async () => {
      const response = await base44.functions.invoke('getAdminMetrics', {});
      return response.data;
    },
    enabled: isAdmin,
    retry: false,
  });

  const summary = report?.summary || {
    total_users: 0,
    paid_users: 0,
    free_users: 0,
    paid_percentage: 0,
  };

  const trialMetrics = adminMetrics?.trialMetrics || {};
  const platformBreakdown = adminMetrics?.platformBreakdown || {};
  const growthLastEightWeeks = adminMetrics?.growthMetrics?.lastEightWeeks || [];
  const churnMetrics = adminMetrics?.churnMetrics || {};
  const userCounts = adminMetrics?.userCounts || {};
  const subscriptionBreakdown = adminMetrics?.subscriptionBreakdown || {};
  const usageMetrics = adminMetrics?.usageMetrics || {};
  const usageAvgPipes = usageMetrics?.avgPipesPerUser || {};
  const usageAvgTobaccos = usageMetrics?.avgTobaccosPerUser || {};

  const filteredData = useMemo(() => {
    if (!report) return { paid: [], free: [] };

    let paid = [...(report.paid_users || [])];
    let free = [...(report.free_users || [])];

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      paid = paid.filter((u) => {
        const email = String(u.email || '').toLowerCase();
        const name = String(u.full_name || '').toLowerCase();
        return email.includes(query) || name.includes(query);
      });
      free = free.filter((u) => {
        const email = String(u.email || '').toLowerCase();
        const name = String(u.full_name || '').toLowerCase();
        return email.includes(query) || name.includes(query);
      });
    }

    const sortFn = (a, b) => {
      let aVal = a[sortColumn];
      let bVal = b[sortColumn];
      
      if (sortColumn === 'created_date' || sortColumn === 'subscription_end') {
        aVal = new Date(aVal || 0);
        bVal = new Date(bVal || 0);
      }
      
      if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    };

    paid.sort(sortFn);
    free.sort(sortFn);

    return { paid, free };
  }, [report, searchQuery, sortColumn, sortDirection]);

  if (isLoadingUser) {
    return (
      <div className="max-w-7xl mx-auto p-6">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-[#8b3a3a]" />
        </div>
      </div>
    );
  }

  if (userError) {
    return (
      <div className="max-w-7xl mx-auto p-6">
        <Card className="border-rose-200 bg-rose-50">
          <CardContent className="p-6">
            <p className="text-rose-800">{t("userReport.errorLoadingUser")}: {userError.message}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="max-w-7xl mx-auto p-6">
        <Card className="bg-white/95 border-rose-200">
          <CardContent className="p-6">
            <p className="text-rose-800 font-semibold">{t("userReport.unauthorized")}</p>
            <p className="text-rose-700 text-sm mt-2">{t("userReport.adminAccessRequired")}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto p-6">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-[#8b3a3a]" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-7xl mx-auto p-6">
        <Card className="border-rose-200 bg-rose-50">
          <CardContent className="p-6">
            <p className="text-rose-800">{t("userReport.errorLoadingReport")}: {error.message}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const handleSort = (column) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('desc');
    }
  };

  const lastUpdated = new Date().toLocaleString();

  return (
    <div className="max-w-7xl mx-auto p-6">
      <div className="mb-2 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-[#e8d5b7]">{t("userReport.title")}</h1>
          <p className="text-xs text-[#e8d5b7]/60 mt-1">{t("userReport.lastUpdated")}: {lastUpdated}</p>
        </div>
        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
          <Button
            onClick={async () => {
              try {
                setIsSyncing(true);
                const res = await base44.functions.invoke('backfillStripeCustomers', {});
                if (res?.data?.ok) {
                  toast.success(t("userReport.backfillComplete", { created: res.data.createdUsers ?? res.data.created ?? 0, updated: res.data.updatedUsers ?? res.data.updated ?? 0 }));
                } else {
                  toast.error(res?.data?.error || t("userReport.backfillFailed"));
                }
                await refetch();
              } catch (e) {
                toast.error(e?.message || t("userReport.backfillFailed"));
              } finally {
                setIsSyncing(false);
              }
            }}
            variant="default"
            className="w-full gap-2 sm:w-auto"
            disabled={isSyncing}
          >
            <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
            {isSyncing ? t("userReport.syncing") : t("userReport.backfillFromStripe")}
          </Button>

          <Button
            onClick={() => {
              refetch();
              toast.success(t("userReport.reportRefreshed"));
            }}
            variant="outline"
            className="w-full gap-2 sm:w-auto"
          >
            <RefreshCw className="w-4 h-4" />
            {t("common.refresh")}
          </Button>
        </div>
      </div>
      <div className="mb-6" />



      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card 
          className={`bg-white border-gray-200 cursor-pointer transition-all hover:shadow-lg ${
            viewFilter === 'all' ? 'ring-2 ring-gray-800' : ''
          }`}
          onClick={() => {
            setViewFilter('all');
            setShowPaidTable(true);
            setShowFreeTable(true);
          }}
        >
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
              <Users className="w-4 h-4" />
              {t("userReport.totalUsers")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-black">{summary.total_users}</p>
          </CardContent>
        </Card>

        <Card 
          className={`bg-white border-gray-200 cursor-pointer transition-all hover:shadow-lg ${
            viewFilter === 'paid' ? 'ring-2 ring-gray-800' : ''
          }`}
          onClick={() => {
            setViewFilter('paid');
            setShowPaidTable(true);
            setShowFreeTable(false);
          }}
        >
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
              <Crown className="w-4 h-4" />
              {t("userReport.paidUsers")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-black">{summary.paid_users}</p>
          </CardContent>
        </Card>

        <Card 
          className={`bg-white border-gray-200 cursor-pointer transition-all hover:shadow-lg ${
            viewFilter === 'free' ? 'ring-2 ring-gray-800' : ''
          }`}
          onClick={() => {
            setViewFilter('free');
            setShowPaidTable(false);
            setShowFreeTable(true);
          }}
        >
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
              <UserX className="w-4 h-4" />
              {t("userReport.freeUsers")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-black">{summary.free_users}</p>
          </CardContent>
        </Card>

        <Card className="bg-white border-gray-200">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              {t("userReport.paidPercentage")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-black">{summary.paid_percentage}%</p>
          </CardContent>
        </Card>

        <Card className="bg-white border-gray-200">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
              <UserPlus className="w-4 h-4" />
              {t("userReport.new7Days")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-black">{metricsLoading ? '...' : trialMetrics.newSignupsLast7d || 0}</p>
          </CardContent>
        </Card>

        {/* Platform Cards */}
        {adminMetrics?.platformBreakdown && !metricsLoading && (
          <>
            <Card className="bg-white border-gray-200">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-gray-700">{t("userReport.apple")}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-600">{t("userReport.paid")}:</span>
                    <span className="font-bold text-black">{platformBreakdown.apple?.paid || 0}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-600">{t("userReport.free")}:</span>
                    <span className="font-bold text-black">{platformBreakdown.apple?.free || 0}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white border-gray-200">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-gray-700">{t("userReport.android")}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-600">{t("userReport.paid")}:</span>
                    <span className="font-bold text-black">{platformBreakdown.android?.paid || 0}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-600">{t("userReport.free")}:</span>
                    <span className="font-bold text-black">{platformBreakdown.android?.free || 0}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white border-gray-200">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-gray-700">{t("userReport.web")}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-600">{t("userReport.paid")}:</span>
                    <span className="font-bold text-black">{platformBreakdown.web?.paid || 0}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-600">{t("userReport.free")}:</span>
                    <span className="font-bold text-black">{platformBreakdown.web?.free || 0}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white border-gray-200">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-gray-700">{t("userReport.iOS")}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-600">{t("userReport.paid")}:</span>
                    <span className="font-bold text-black">{platformBreakdown.ios?.paid || 0}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-600">{t("userReport.free")}:</span>
                    <span className="font-bold text-black">{platformBreakdown.ios?.free || 0}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white border-gray-200">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-gray-700">{t("userReport.unknown")}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-600">{t("userReport.paid")}:</span>
                    <span className="font-bold text-black">{platformBreakdown.unknown?.paid || 0}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-600">{t("userReport.free")}:</span>
                    <span className="font-bold text-black">{platformBreakdown.unknown?.free || 0}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      {/* Trials Panel */}
      {adminMetrics && !metricsLoading && (
        <Card className="bg-white border-gray-200 mb-6">
          <CardHeader className="pb-3">
            <CardTitle className="text-black flex items-center gap-2">
              <Clock className="w-5 h-5 text-gray-600" />
              {t("userReport.trialMetrics")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                <p className="text-xs text-gray-600 font-medium truncate">{t("userReport.currentlyOnTrial")}</p>
                <p className="text-2xl font-bold text-black">{trialMetrics.currentlyOnTrial || 0}</p>
              </div>
              <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                <p className="text-xs text-gray-600 font-medium truncate">{t("userReport.endingIn3Days")}</p>
                <p className="text-2xl font-bold text-black">{trialMetrics.endingIn3Days || 0}</p>
              </div>
              <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                <p className="text-xs text-gray-600 font-medium truncate">{t("userReport.endingIn7Days")}</p>
                <p className="text-2xl font-bold text-black">{trialMetrics.endingIn7Days || 0}</p>
              </div>
              <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                <p className="text-xs text-gray-600 font-medium truncate">{t("userReport.avgDaysRemaining")}</p>
                <p className="text-2xl font-bold text-black">{trialMetrics.avgDaysRemaining || 0}</p>
              </div>
              <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                <p className="text-xs text-gray-600 font-medium truncate">{t("userReport.converted30d")}</p>
                <p className="text-2xl font-bold text-black">{trialMetrics.convertedLast30d || 0}</p>
              </div>
              <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                <p className="text-xs text-gray-600 font-medium truncate">{t("userReport.dropoffs30d")}</p>
                <p className="text-2xl font-bold text-black">{trialMetrics.dropoffLast30d || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Growth Chart */}
      {growthLastEightWeeks.length > 0 && !metricsLoading && (
        <Card className="bg-white border-gray-200 mb-6">
          <CardHeader className="pb-3">
            <CardTitle className="text-black flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-gray-600" />
              {t("userReport.weeklyGrowth")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={growthLastEightWeeks}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="week" tick={{ fill: '#374151', fontSize: 12 }} />
                <YAxis tick={{ fill: '#374151', fontSize: 12 }} />
                <Tooltip contentStyle={{ backgroundColor: '#fff', border: '1px solid #d1d5db', color: '#111' }} />
                <Legend wrapperStyle={{ color: '#374151' }} />
                <Bar dataKey="newUsers" fill="#374151" name={t("userReport.newUsers")} />
                <Bar dataKey="newPaidSubscribers" fill="#6b7280" name={t("userReport.newPaid")} />
                <Bar dataKey="newProSubscribers" fill="#9ca3af" name={t("userReport.newPro")} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Churn Panel */}
      {adminMetrics?.churnMetrics && !metricsLoading && (
        <Card className="bg-white border-gray-200 mb-6">
          <CardHeader className="pb-3">
            <CardTitle className="text-black flex items-center gap-2">
              <TrendingDown className="w-5 h-5 text-gray-600" />
              {t("userReport.churnDowngrades")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                <p className="text-xs text-gray-600 font-medium truncate">{t("userReport.premiumChurnRate")}</p>
                <p className="text-2xl font-bold text-black">{churnMetrics.premiumChurn30d || 0}%</p>
              </div>
              <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                <p className="text-xs text-gray-600 font-medium truncate">{t("userReport.proChurnRate")}</p>
                <p className="text-2xl font-bold text-black">{churnMetrics.proChurn30d || 0}%</p>
              </div>
              <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                <p className="text-xs text-gray-600 font-medium truncate">{t("userReport.proToPremium")}</p>
                <p className="text-2xl font-bold text-black">{churnMetrics.proToPremiumDowngrade || 0}</p>
              </div>
              <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                <p className="text-xs text-gray-600 font-medium truncate">{t("userReport.premiumToFree")}</p>
                <p className="text-2xl font-bold text-black">{churnMetrics.premiumToFreeDowngrade || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Additional Metrics Cards */}
      {adminMetrics && !metricsLoading && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Card className="bg-white border-gray-200">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600">{t("userReport.premiumUsers")}</CardTitle>
              <p className="text-xs text-gray-500 mt-1">{t("userReport.postFeb1")}</p>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-black">{userCounts.premium || 0}</p>
            </CardContent>
          </Card>
          <Card className="bg-white border-gray-200">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600">{t("userReport.proUsers")}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-black">{userCounts.pro || 0}</p>
            </CardContent>
          </Card>
          <Card className="bg-white border-gray-200">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600">{t("userReport.onTrial")}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-black">{trialMetrics.currentlyOnTrial || 0}</p>
            </CardContent>
          </Card>
          <Card className="bg-white border-gray-200">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600">{t("userReport.activeTrialPremium")}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-black">{subscriptionBreakdown.activeOrTrialPremium || 0}</p>
            </CardContent>
          </Card>
          <Card className="bg-white border-gray-200">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600">{t("userReport.activeTrialPro")}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-black">{subscriptionBreakdown.activeOrTrialPro || 0}</p>
            </CardContent>
          </Card>
          <Card className="bg-white border-gray-200">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600">{t("userReport.legacyPremium")}</CardTitle>
              <p className="text-xs text-gray-500 mt-1">{t("userReport.subscribedBeforeFeb1")}</p>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-black">{userCounts.legacyPremium || 0}</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Usage Metrics */}
      {adminMetrics?.usageMetrics && !metricsLoading && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Card className="bg-white border-gray-200">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600">{t("userReport.avgPipesPerUser")}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">{t("userReport.free")}</span>
                  <span className="font-bold text-black">{usageAvgPipes.free || 0}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">{t("userReport.premium")}</span>
                  <span className="font-bold text-black">{usageAvgPipes.premium || 0}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">{t("userReport.pro")}</span>
                  <span className="font-bold text-black">{usageAvgPipes.pro || 0}</span>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-white border-gray-200">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600">{t("userReport.avgTobaccosPerUser")}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">{t("userReport.free")}</span>
                  <span className="font-bold text-black">{usageAvgTobaccos.free || 0}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">{t("userReport.premium")}</span>
                  <span className="font-bold text-black">{usageAvgTobaccos.premium || 0}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">{t("userReport.pro")}</span>
                  <span className="font-bold text-black">{usageAvgTobaccos.pro || 0}</span>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-white border-gray-200">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600">{t("userReport.communityEngagement")}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-black">{usageMetrics.communityEngagement || 0}%</p>
              <p className="text-xs text-gray-500 mt-1">{t("userReport.usersWithComments")}</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Search Bar */}
      <div className="mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-stone-400" />
          <Input
            placeholder={t("userReport.searchPlaceholder")}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 bg-white"
          />
        </div>
      </div>

      {/* Paid Users Table */}
      {(viewFilter === 'all' || viewFilter === 'paid') && (
        <Collapsible open={showPaidTable} onOpenChange={setShowPaidTable}>
          <Card className="bg-white/95 border-[#e8d5b7]/30 mb-6">
            <CollapsibleTrigger className="w-full">
              <CardHeader className="cursor-pointer hover:bg-stone-50">
                <CardTitle className="text-stone-800 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Crown className="w-5 h-5 text-amber-600" />
                    {t("userReport.paidUsersCount", { count: filteredData.paid.length })}
                  </div>
                  {showPaidTable ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                </CardTitle>
              </CardHeader>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-stone-200">
                        <th 
                          className="text-left py-3 px-4 text-sm font-semibold text-stone-700 cursor-pointer hover:bg-stone-50"
                          onClick={() => handleSort('full_name')}
                        >
                          {t("userReport.name")} {sortColumn === 'full_name' && (sortDirection === 'asc' ? '↑' : '↓')}
                        </th>
                        <th 
                          className="text-left py-3 px-4 text-sm font-semibold text-stone-700 cursor-pointer hover:bg-stone-50"
                          onClick={() => handleSort('email')}
                        >
                          {t("userReport.email")} {sortColumn === 'email' && (sortDirection === 'asc' ? '↑' : '↓')}
                        </th>
                        <th 
                          className="text-left py-3 px-4 text-sm font-semibold text-stone-700 cursor-pointer hover:bg-stone-50"
                          onClick={() => handleSort('subscription_status')}
                        >
                          {t("userReport.status")} {sortColumn === 'subscription_status' && (sortDirection === 'asc' ? '↑' : '↓')}
                        </th>
                        <th className="text-left py-3 px-4 text-sm font-semibold text-stone-700">{t("userReport.billing")}</th>
                        <th 
                          className="text-left py-3 px-4 text-sm font-semibold text-stone-700 cursor-pointer hover:bg-stone-50"
                          onClick={() => handleSort('subscription_end')}
                        >
                          {t("userReport.periodEnd")} {sortColumn === 'subscription_end' && (sortDirection === 'asc' ? '↑' : '↓')}
                        </th>
                        <th 
                          className="text-left py-3 px-4 text-sm font-semibold text-stone-700 cursor-pointer hover:bg-stone-50"
                          onClick={() => handleSort('created_date')}
                        >
                          {t("userReport.joined")} {sortColumn === 'created_date' && (sortDirection === 'asc' ? '↑' : '↓')}
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredData.paid.length === 0 ? (
                        <tr>
                          <td colSpan="6" className="text-center py-8 text-stone-500">
                            {searchQuery ? t("userReport.noUsersMatchSearch") : t("userReport.noPaidUsersFound")}
                          </td>
                        </tr>
                      ) : (
                        filteredData.paid.map((user) => (
                          <tr key={user.email} className="border-b border-stone-100 hover:bg-stone-50">
                            <td className="py-3 px-4 text-sm text-stone-800">{user.full_name || '-'}</td>
                            <td className="py-3 px-4 text-sm text-stone-600">{user.email}</td>
                            <td className="py-3 px-4">
                              <Badge className="bg-emerald-100 text-emerald-800">{user.subscription_status}</Badge>
                            </td>
                            <td className="py-3 px-4 text-sm text-stone-600 capitalize">{user.billing_interval || '-'}</td>
                            <td className="py-3 px-4 text-sm text-stone-600">
                              {user.subscription_end ? new Date(user.subscription_end).toLocaleDateString() : '-'}
                            </td>
                            <td className="py-3 px-4 text-sm text-stone-600">
                              {new Date(user.created_date).toLocaleDateString()}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </CollapsibleContent>
          </Card>
        </Collapsible>
      )}

      {/* Free Users Table */}
      {(viewFilter === 'all' || viewFilter === 'free') && (
        <Collapsible open={showFreeTable} onOpenChange={setShowFreeTable}>
          <Card className="bg-white/95 border-[#e8d5b7]/30">
            <CollapsibleTrigger className="w-full">
              <CardHeader className="cursor-pointer hover:bg-stone-50">
                <CardTitle className="text-stone-800 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <UserX className="w-5 h-5 text-stone-600" />
                    {t("userReport.freeUsersCount", { count: filteredData.free.length })}
                  </div>
                  {showFreeTable ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                </CardTitle>
              </CardHeader>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-stone-200">
                        <th 
                          className="text-left py-3 px-4 text-sm font-semibold text-stone-700 cursor-pointer hover:bg-stone-50"
                          onClick={() => handleSort('full_name')}
                        >
                          {t("userReport.name")} {sortColumn === 'full_name' && (sortDirection === 'asc' ? '↑' : '↓')}
                        </th>
                        <th 
                          className="text-left py-3 px-4 text-sm font-semibold text-stone-700 cursor-pointer hover:bg-stone-50"
                          onClick={() => handleSort('email')}
                        >
                          {t("userReport.email")} {sortColumn === 'email' && (sortDirection === 'asc' ? '↑' : '↓')}
                        </th>
                        <th 
                          className="text-left py-3 px-4 text-sm font-semibold text-stone-700 cursor-pointer hover:bg-stone-50"
                          onClick={() => handleSort('subscription_status')}
                        >
                          {t("userReport.status")} {sortColumn === 'subscription_status' && (sortDirection === 'asc' ? '↑' : '↓')}
                        </th>
                        <th 
                          className="text-left py-3 px-4 text-sm font-semibold text-stone-700 cursor-pointer hover:bg-stone-50"
                          onClick={() => handleSort('created_date')}
                        >
                          {t("userReport.joined")} {sortColumn === 'created_date' && (sortDirection === 'asc' ? '↑' : '↓')}
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredData.free.length === 0 ? (
                        <tr>
                          <td colSpan="4" className="text-center py-8 text-stone-500">
                            {searchQuery ? t("userReport.noUsersMatchSearch") : t("userReport.noFreeUsersFound")}
                          </td>
                        </tr>
                      ) : (
                        filteredData.free.map((user) => (
                          <tr key={user.email} className="border-b border-stone-100 hover:bg-stone-50">
                            <td className="py-3 px-4 text-sm text-stone-800">{user.full_name || '-'}</td>
                            <td className="py-3 px-4 text-sm text-stone-600">{user.email}</td>
                            <td className="py-3 px-4">
                              <Badge variant="outline" className="text-stone-600">
                                {user.subscription_status}
                              </Badge>
                            </td>
                            <td className="py-3 px-4 text-sm text-stone-600">
                              {new Date(user.created_date).toLocaleDateString()}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </CollapsibleContent>
          </Card>
        </Collapsible>
      )}
    </div>
  );
}