import React, { useState, useMemo } from 'react';
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Loader2, Users, TrendingUp, RefreshCw, Crown, UserX, Search, ChevronDown, ChevronUp, UserPlus, Clock, Zap, TrendingDown, Download, Calendar, DollarSign } from "lucide-react";
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
  const [newAccountsDateRange, setNewAccountsDateRange] = useState('week');
  const [renewalsDateRange, setRenewalsDateRange] = useState('month');

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

  // Consolidate Premium/Pro into single tier
  const consolidatedPaidUsers = summary.paid_users;
  const consolidatedPaidPercentage = summary.paid_percentage;
  const consolidatedUserCount = (userCounts.premium || 0) + (userCounts.pro || 0);
  const consolidatedTrialCount = (subscriptionBreakdown.activeOrTrialPremium || 0) + (subscriptionBreakdown.activeOrTrialPro || 0);

  // Consolidate Apple/iOS into single platform
  const applePlatformBreakdown = {
    paid: (platformBreakdown.apple?.paid || 0) + (platformBreakdown.ios?.paid || 0),
    free: (platformBreakdown.apple?.free || 0) + (platformBreakdown.ios?.free || 0)
  };

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

  function exportCSV() {
    const rows = [];
    rows.push(['tier', 'name', 'email', 'subscription_status', 'billing_interval', 'subscription_end', 'joined']);

    (report?.paid_users || []).forEach((u) => {
      rows.push([
        'paid',
        u.full_name || '',
        u.email || '',
        u.subscription_status || '',
        u.billing_interval || '',
        u.subscription_end ? new Date(u.subscription_end).toLocaleDateString() : '',
        u.created_date ? new Date(u.created_date).toLocaleDateString() : '',
      ]);
    });

    (report?.free_users || []).forEach((u) => {
      rows.push([
        'free',
        u.full_name || '',
        u.email || '',
        u.subscription_status || '',
        '',
        '',
        u.created_date ? new Date(u.created_date).toLocaleDateString() : '',
      ]);
    });

    const csv = rows.map((r) => r.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `users_export_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('CSV exported');
  }

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
            onClick={exportCSV}
            variant="outline"
            className="w-full gap-2 sm:w-auto"
            disabled={!report}
          >
            <Download className="w-4 h-4" />
            Export CSV
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
          className={`cursor-pointer transition-all hover:shadow-lg ${
            viewFilter === 'all' ? 'ring-2 ring-[#B48C4B]' : ''
          }`}
          onClick={() => {
            setViewFilter('all');
            setShowPaidTable(true);
            setShowFreeTable(true);
          }}
        >
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-[#E0D8C8]/70 flex items-center gap-2">
              <Users className="w-4 h-4" />
              {t("userReport.totalUsers")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-[#F5F1E7]">{summary.total_users}</p>
          </CardContent>
        </Card>

        <Card 
          className={`cursor-pointer transition-all hover:shadow-lg ${
            viewFilter === 'paid' ? 'ring-2 ring-[#B48C4B]' : ''
          }`}
          onClick={() => {
            setViewFilter('paid');
            setShowPaidTable(true);
            setShowFreeTable(false);
          }}
        >
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-[#E0D8C8]/70 flex items-center gap-2">
              <Crown className="w-4 h-4" />
              {t("userReport.paidUsers")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-[#F5F1E7]">{summary.paid_users}</p>
          </CardContent>
        </Card>

        <Card 
          className={`cursor-pointer transition-all hover:shadow-lg ${
            viewFilter === 'free' ? 'ring-2 ring-[#B48C4B]' : ''
          }`}
          onClick={() => {
            setViewFilter('free');
            setShowPaidTable(false);
            setShowFreeTable(true);
          }}
        >
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-[#E0D8C8]/70 flex items-center gap-2">
              <UserX className="w-4 h-4" />
              {t("userReport.freeUsers")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-[#F5F1E7]">{summary.free_users}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-[#E0D8C8]/70 flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              {t("userReport.paidPercentage")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-[#F5F1E7]">{summary.paid_percentage}%</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-[#E0D8C8]/70 flex items-center gap-2">
              <UserPlus className="w-4 h-4" />
              {t("userReport.new7Days")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-[#F5F1E7]">{metricsLoading ? '...' : trialMetrics.newSignupsLast7d || 0}</p>
          </CardContent>
        </Card>

        {/* Platform Cards - Consolidated Apple/iOS */}
          {adminMetrics?.platformBreakdown && !metricsLoading && (
            <>
              <Card className="bg-transparent">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-[#E0D8C8]">iOS/Apple</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="text-[#E0D8C8]/70">{t("userReport.paid")}:</span>
                      <span className="font-bold text-[#F5F1E7]">{applePlatformBreakdown.paid}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-[#E0D8C8]/70">{t("userReport.free")}:</span>
                      <span className="font-bold text-[#F5F1E7]">{applePlatformBreakdown.free}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-transparent">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-[#E0D8C8]">{t("userReport.android")}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="text-[#E0D8C8]/70">{t("userReport.paid")}:</span>
                      <span className="font-bold text-[#F5F1E7]">{platformBreakdown.android?.paid || 0}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-[#E0D8C8]/70">{t("userReport.free")}:</span>
                      <span className="font-bold text-[#F5F1E7]">{platformBreakdown.android?.free || 0}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-transparent">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-[#E0D8C8]">{t("userReport.web")}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="text-[#E0D8C8]/70">{t("userReport.paid")}:</span>
                      <span className="font-bold text-[#F5F1E7]">{platformBreakdown.web?.paid || 0}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-[#E0D8C8]/70">{t("userReport.free")}:</span>
                      <span className="font-bold text-[#F5F1E7]">{platformBreakdown.web?.free || 0}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-transparent">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-[#E0D8C8]">{t("userReport.unknown")}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="text-[#E0D8C8]/70">{t("userReport.paid")}:</span>
                      <span className="font-bold text-[#F5F1E7]">{platformBreakdown.unknown?.paid || 0}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-[#E0D8C8]/70">{t("userReport.free")}:</span>
                      <span className="font-bold text-[#F5F1E7]">{platformBreakdown.unknown?.free || 0}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </>
          )}
      </div>

      {/* Trials Panel */}
      {adminMetrics && !metricsLoading && (
        <Card className="bg-transparent mb-6">
          <CardHeader className="pb-3">
            <CardTitle className="text-[#F5F1E7] flex items-center gap-2">
              <Clock className="w-5 h-5 text-[#E0D8C8]/70" />
              {t("userReport.trialMetrics")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              <div className="p-3 rounded-lg border border-[#8b6239]/30 bg-[#2a1f18]/50">
                <p className="text-xs text-[#E0D8C8]/70 font-medium truncate">{t("userReport.currentlyOnTrial")}</p>
                <p className="text-2xl font-bold text-[#F5F1E7]">{trialMetrics.currentlyOnTrial || 0}</p>
              </div>
              <div className="p-3 rounded-lg border border-[#8b6239]/30 bg-[#2a1f18]/50">
                <p className="text-xs text-[#E0D8C8]/70 font-medium truncate">{t("userReport.endingIn3Days")}</p>
                <p className="text-2xl font-bold text-[#F5F1E7]">{trialMetrics.endingIn3Days || 0}</p>
              </div>
              <div className="p-3 rounded-lg border border-[#8b6239]/30 bg-[#2a1f18]/50">
                <p className="text-xs text-[#E0D8C8]/70 font-medium truncate">{t("userReport.endingIn7Days")}</p>
                <p className="text-2xl font-bold text-[#F5F1E7]">{trialMetrics.endingIn7Days || 0}</p>
              </div>
              <div className="p-3 rounded-lg border border-[#8b6239]/30 bg-[#2a1f18]/50">
                <p className="text-xs text-[#E0D8C8]/70 font-medium truncate">{t("userReport.avgDaysRemaining")}</p>
                <p className="text-2xl font-bold text-[#F5F1E7]">{trialMetrics.avgDaysRemaining || 0}</p>
              </div>
              <div className="p-3 rounded-lg border border-[#8b6239]/30 bg-[#2a1f18]/50">
                <p className="text-xs text-[#E0D8C8]/70 font-medium truncate">{t("userReport.converted30d")}</p>
                <p className="text-2xl font-bold text-[#F5F1E7]">{trialMetrics.convertedLast30d || 0}</p>
              </div>
              <div className="p-3 rounded-lg border border-[#8b6239]/30 bg-[#2a1f18]/50">
                <p className="text-xs text-[#E0D8C8]/70 font-medium truncate">{t("userReport.dropoffs30d")}</p>
                <p className="text-2xl font-bold text-[#F5F1E7]">{trialMetrics.dropoffLast30d || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Growth Chart */}
      {growthLastEightWeeks.length > 0 && !metricsLoading && (
        <Card className="bg-transparent mb-6">
          <CardHeader className="pb-3">
            <CardTitle className="text-[#F5F1E7] flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-[#E0D8C8]/70" />
              {t("userReport.weeklyGrowth")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={growthLastEightWeeks}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(139,98,57,0.3)" />
                <XAxis dataKey="week" tick={{ fill: '#E0D8C8', fontSize: 12 }} />
                <YAxis tick={{ fill: '#E0D8C8', fontSize: 12 }} />
                <Tooltip contentStyle={{ backgroundColor: '#2a1f18', border: '1px solid rgba(139,98,57,0.5)', color: '#F5F1E7' }} />
                <Legend wrapperStyle={{ color: '#E0D8C8' }} />
                <Bar dataKey="newUsers" fill="#B48C4B" name={t("userReport.newUsers")} />
                <Bar dataKey="newPaidSubscribers" fill="#8B6239" name={t("userReport.newPaid")} />
                <Bar dataKey="newProSubscribers" fill="#A35C5C" name={t("userReport.newPro")} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Churn Panel - Consolidated */}
      {adminMetrics?.churnMetrics && !metricsLoading && (
        <Card className="bg-transparent mb-6">
          <CardHeader className="pb-3">
            <CardTitle className="text-[#F5F1E7] flex items-center gap-2">
              <TrendingDown className="w-5 h-5 text-[#E0D8C8]/70" />
              {t("userReport.churnDowngrades")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="p-3 rounded-lg border border-[#8b6239]/30 bg-[#2a1f18]/50">
                <p className="text-xs text-[#E0D8C8]/70 font-medium truncate">Paid Churn Rate (30d)</p>
                <p className="text-2xl font-bold text-[#F5F1E7]">{((churnMetrics.premiumChurn30d || 0) + (churnMetrics.proChurn30d || 0)) / 2}%</p>
              </div>
              <div className="p-3 rounded-lg border border-[#8b6239]/30 bg-[#2a1f18]/50">
                <p className="text-xs text-[#E0D8C8]/70 font-medium truncate">Premium Churn (30d)</p>
                <p className="text-2xl font-bold text-[#F5F1E7]">{churnMetrics.premiumChurn30d || 0}%</p>
              </div>
              <div className="p-3 rounded-lg border border-[#8b6239]/30 bg-[#2a1f18]/50">
                <p className="text-xs text-[#E0D8C8]/70 font-medium truncate">Pro Churn (30d)</p>
                <p className="text-2xl font-bold text-[#F5F1E7]">{churnMetrics.proChurn30d || 0}%</p>
              </div>
              <div className="p-3 rounded-lg border border-[#8b6239]/30 bg-[#2a1f18]/50">
                <p className="text-xs text-[#E0D8C8]/70 font-medium truncate">Downgrade to Free</p>
                <p className="text-2xl font-bold text-[#F5F1E7]">{churnMetrics.premiumToFreeDowngrade || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Consolidated Premium/Pro Metrics */}
      {adminMetrics && !metricsLoading && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Card className="bg-transparent">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-[#E0D8C8]/70">Active Paid Subscribers</CardTitle>
              <p className="text-xs text-[#E0D8C8]/50 mt-1">Premium + Pro Combined</p>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-[#F5F1E7]">{consolidatedUserCount}</p>
            </CardContent>
          </Card>
          <Card className="bg-transparent">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-[#E0D8C8]/70">Active/Trial Paid</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-[#F5F1E7]">{consolidatedTrialCount}</p>
            </CardContent>
          </Card>
          <Card className="bg-transparent">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-[#E0D8C8]/70">Legacy Premium</CardTitle>
              <p className="text-xs text-[#E0D8C8]/50 mt-1">Subscribed before Feb 1, 2026</p>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-[#F5F1E7]">{userCounts.legacyPremium || 0}</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* New Tracking Cards */}
      {adminMetrics && !metricsLoading && (
        <>
          {/* Daily/Weekly Activity */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <Card className="bg-transparent">
              <CardHeader className="pb-3">
                <CardTitle className="text-[#F5F1E7] flex items-center gap-2">
                  <Users className="w-5 h-5 text-[#E0D8C8]/70" />
                  Average Daily Users/Logins
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold text-[#F5F1E7]">{adminMetrics.dailyActiveUsers || 0}</p>
                <p className="text-xs text-[#E0D8C8]/50 mt-2">Last 30 days average</p>
              </CardContent>
            </Card>

            <Card className="bg-transparent">
              <CardHeader className="pb-3">
                <CardTitle className="text-[#F5F1E7] flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-[#E0D8C8]/70" />
                  Average Weekly Users
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold text-[#F5F1E7]">{adminMetrics.weeklyActiveUsers || 0}</p>
                <p className="text-xs text-[#E0D8C8]/50 mt-2">Last 4 weeks average</p>
              </CardContent>
            </Card>
          </div>

          {/* New Accounts by Time Period */}
          <Card className="bg-transparent mb-6">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-[#F5F1E7] flex items-center gap-2">
                  <UserPlus className="w-5 h-5 text-[#E0D8C8]/70" />
                  New Accounts Created
                </CardTitle>
                <select
                  value={newAccountsDateRange}
                  onChange={(e) => setNewAccountsDateRange(e.target.value)}
                  className="text-xs bg-[#2a1f18] border border-[#8b6239]/30 text-[#E0D8C8] px-2 py-1 rounded"
                >
                  <option value="day">Last 24 Hours</option>
                  <option value="week">Last 7 Days</option>
                  <option value="month">Last 30 Days</option>
                  <option value="quarter">Last 90 Days</option>
                </select>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="p-3 rounded-lg border border-[#8b6239]/30 bg-[#2a1f18]/50">
                  <p className="text-xs text-[#E0D8C8]/70">24 Hours</p>
                  <p className="text-2xl font-bold text-[#F5F1E7]">{adminMetrics.newAccounts?.day || 0}</p>
                </div>
                <div className="p-3 rounded-lg border border-[#8b6239]/30 bg-[#2a1f18]/50">
                  <p className="text-xs text-[#E0D8C8]/70">7 Days</p>
                  <p className="text-2xl font-bold text-[#F5F1E7]">{adminMetrics.newAccounts?.week || 0}</p>
                </div>
                <div className="p-3 rounded-lg border border-[#8b6239]/30 bg-[#2a1f18]/50">
                  <p className="text-xs text-[#E0D8C8]/70">30 Days</p>
                  <p className="text-2xl font-bold text-[#F5F1E7]">{adminMetrics.newAccounts?.month || 0}</p>
                </div>
                <div className="p-3 rounded-lg border border-[#8b6239]/30 bg-[#2a1f18]/50">
                  <p className="text-xs text-[#E0D8C8]/70">90 Days</p>
                  <p className="text-2xl font-bold text-[#F5F1E7]">{adminMetrics.newAccounts?.quarter || 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Subscription Renewals */}
          <Card className="bg-transparent mb-6">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-[#F5F1E7] flex items-center gap-2">
                  <DollarSign className="w-5 h-5 text-[#E0D8C8]/70" />
                  Upcoming Subscription Renewals & Revenue
                </CardTitle>
                <select
                  value={renewalsDateRange}
                  onChange={(e) => setRenewalsDateRange(e.target.value)}
                  className="text-xs bg-[#2a1f18] border border-[#8b6239]/30 text-[#E0D8C8] px-2 py-1 rounded"
                >
                  <option value="week">Next 7 Days</option>
                  <option value="month">Next 30 Days</option>
                  <option value="quarter">Next 90 Days</option>
                  <option value="year">Next 365 Days</option>
                </select>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 sm:grid-cols-2 gap-4">
                <div className="p-3 rounded-lg border border-[#8b6239]/30 bg-[#2a1f18]/50">
                  <p className="text-xs text-[#E0D8C8]/70">Renewal Count</p>
                  <p className="text-2xl font-bold text-[#F5F1E7]">{adminMetrics.renewals?.[renewalsDateRange]?.count || 0}</p>
                </div>
                <div className="p-3 rounded-lg border border-[#8b6239]/30 bg-[#2a1f18]/50">
                  <p className="text-xs text-[#E0D8C8]/70">Projected Revenue</p>
                  <p className="text-2xl font-bold text-[#F5F1E7]">${(adminMetrics.renewals?.[renewalsDateRange]?.totalAmount || 0).toFixed(2)}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Module Usage Tracking (Placeholder for Future) */}
          <Card className="bg-transparent mb-6 border-[#8b6239]/20 opacity-75">
            <CardHeader className="pb-3">
              <CardTitle className="text-[#E0D8C8] flex items-center gap-2">
                <Zap className="w-5 h-5" />
                Module Usage & Revenue (Coming Soon)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-[#E0D8C8]/50 text-sm">Tracking for:</p>
              <ul className="text-xs text-[#E0D8C8]/40 space-y-1 mt-2">
                <li>• Modules used per user</li>
                <li>• Which modules are most popular</li>
                <li>• Module adoption by tier (Free/Paid)</li>
                <li>• Recurring revenue per module</li>
                <li>• Bundle usage and revenue</li>
              </ul>
            </CardContent>
          </Card>
        </>
      )}

      {/* Usage Metrics */}
      {adminMetrics?.usageMetrics && !metricsLoading && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Card className="bg-transparent">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-[#E0D8C8]/70">{t("userReport.avgPipesPerUser")}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-[#E0D8C8]/70">{t("userReport.free")}</span>
                  <span className="font-bold text-[#F5F1E7]">{usageAvgPipes.free || 0}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-[#E0D8C8]/70">{t("userReport.premium")}</span>
                  <span className="font-bold text-[#F5F1E7]">{usageAvgPipes.premium || 0}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-[#E0D8C8]/70">{t("userReport.pro")}</span>
                  <span className="font-bold text-[#F5F1E7]">{usageAvgPipes.pro || 0}</span>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-transparent">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-[#E0D8C8]/70">{t("userReport.avgTobaccosPerUser")}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-[#E0D8C8]/70">{t("userReport.free")}</span>
                  <span className="font-bold text-[#F5F1E7]">{usageAvgTobaccos.free || 0}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-[#E0D8C8]/70">{t("userReport.premium")}</span>
                  <span className="font-bold text-[#F5F1E7]">{usageAvgTobaccos.premium || 0}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-[#E0D8C8]/70">{t("userReport.pro")}</span>
                  <span className="font-bold text-[#F5F1E7]">{usageAvgTobaccos.pro || 0}</span>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-transparent">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-[#E0D8C8]/70">{t("userReport.communityEngagement")}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-[#F5F1E7]">{usageMetrics.communityEngagement || 0}%</p>
              <p className="text-xs text-[#E0D8C8]/50 mt-1">{t("userReport.usersWithComments")}</p>
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
            className="pl-10"
          />
        </div>
      </div>

      {/* Paid Users Table */}
      {(viewFilter === 'all' || viewFilter === 'paid') && (
        <Collapsible open={showPaidTable} onOpenChange={setShowPaidTable}>
          <Card className="bg-transparent mb-6">
            <CollapsibleTrigger className="w-full">
              <CardHeader className="cursor-pointer hover:bg-[#2a1f18]/40">
                <CardTitle className="text-[#F5F1E7] flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Crown className="w-5 h-5 text-[#E0D8C8]/70" />
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
                      <tr className="border-b border-[#8b6239]/30">
                        <th 
                          className="text-left py-3 px-4 text-sm font-semibold text-[#E0D8C8] cursor-pointer hover:bg-[#2a1f18]/40"
                          onClick={() => handleSort('full_name')}
                        >
                          {t("userReport.name")} {sortColumn === 'full_name' && (sortDirection === 'asc' ? '↑' : '↓')}
                        </th>
                        <th 
                          className="text-left py-3 px-4 text-sm font-semibold text-[#E0D8C8] cursor-pointer hover:bg-[#2a1f18]/40"
                          onClick={() => handleSort('email')}
                        >
                          {t("userReport.email")} {sortColumn === 'email' && (sortDirection === 'asc' ? '↑' : '↓')}
                        </th>
                        <th 
                          className="text-left py-3 px-4 text-sm font-semibold text-[#E0D8C8] cursor-pointer hover:bg-[#2a1f18]/40"
                          onClick={() => handleSort('subscription_status')}
                        >
                          {t("userReport.status")} {sortColumn === 'subscription_status' && (sortDirection === 'asc' ? '↑' : '↓')}
                        </th>
                        <th className="text-left py-3 px-4 text-sm font-semibold text-[#E0D8C8]">{t("userReport.billing")}</th>
                        <th 
                          className="text-left py-3 px-4 text-sm font-semibold text-[#E0D8C8] cursor-pointer hover:bg-[#2a1f18]/40"
                          onClick={() => handleSort('subscription_end')}
                        >
                          {t("userReport.periodEnd")} {sortColumn === 'subscription_end' && (sortDirection === 'asc' ? '↑' : '↓')}
                        </th>
                        <th 
                          className="text-left py-3 px-4 text-sm font-semibold text-[#E0D8C8] cursor-pointer hover:bg-[#2a1f18]/40"
                          onClick={() => handleSort('created_date')}
                        >
                          {t("userReport.joined")} {sortColumn === 'created_date' && (sortDirection === 'asc' ? '↑' : '↓')}
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredData.paid.length === 0 ? (
                        <tr>
                          <td colSpan="6" className="text-center py-8 text-[#E0D8C8]/50">
                            {searchQuery ? t("userReport.noUsersMatchSearch") : t("userReport.noPaidUsersFound")}
                          </td>
                        </tr>
                      ) : (
                        filteredData.paid.map((user) => (
                          <tr key={user.email} className="border-b border-[#8b6239]/20 hover:bg-[#2a1f18]/40">
                            <td className="py-3 px-4 text-sm text-[#F5F1E7]">{user.full_name || '-'}</td>
                            <td className="py-3 px-4 text-sm text-[#E0D8C8]">{user.email}</td>
                            <td className="py-3 px-4">
                              <Badge className="bg-[#B48C4B]/20 text-[#F5F1E7] border border-[#B48C4B]/40">{user.subscription_status}</Badge>
                            </td>
                            <td className="py-3 px-4 text-sm text-[#E0D8C8] capitalize">{user.billing_interval || '-'}</td>
                            <td className="py-3 px-4 text-sm text-[#E0D8C8]">
                              {user.subscription_end ? new Date(user.subscription_end).toLocaleDateString() : '-'}
                            </td>
                            <td className="py-3 px-4 text-sm text-[#E0D8C8]">
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
          <Card className="bg-transparent">
            <CollapsibleTrigger className="w-full">
              <CardHeader className="cursor-pointer hover:bg-[#2a1f18]/40">
                <CardTitle className="text-[#F5F1E7] flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <UserX className="w-5 h-5 text-[#E0D8C8]/70" />
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
                      <tr className="border-b border-[#8b6239]/30">
                        <th 
                          className="text-left py-3 px-4 text-sm font-semibold text-[#E0D8C8] cursor-pointer hover:bg-[#2a1f18]/40"
                          onClick={() => handleSort('full_name')}
                        >
                          {t("userReport.name")} {sortColumn === 'full_name' && (sortDirection === 'asc' ? '↑' : '↓')}
                        </th>
                        <th 
                          className="text-left py-3 px-4 text-sm font-semibold text-[#E0D8C8] cursor-pointer hover:bg-[#2a1f18]/40"
                          onClick={() => handleSort('email')}
                        >
                          {t("userReport.email")} {sortColumn === 'email' && (sortDirection === 'asc' ? '↑' : '↓')}
                        </th>
                        <th 
                          className="text-left py-3 px-4 text-sm font-semibold text-[#E0D8C8] cursor-pointer hover:bg-[#2a1f18]/40"
                          onClick={() => handleSort('subscription_status')}
                        >
                          {t("userReport.status")} {sortColumn === 'subscription_status' && (sortDirection === 'asc' ? '↑' : '↓')}
                        </th>
                        <th 
                          className="text-left py-3 px-4 text-sm font-semibold text-[#E0D8C8] cursor-pointer hover:bg-[#2a1f18]/40"
                          onClick={() => handleSort('created_date')}
                        >
                          {t("userReport.joined")} {sortColumn === 'created_date' && (sortDirection === 'asc' ? '↑' : '↓')}
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredData.free.length === 0 ? (
                        <tr>
                          <td colSpan="4" className="text-center py-8 text-[#E0D8C8]/50">
                            {searchQuery ? t("userReport.noUsersMatchSearch") : t("userReport.noFreeUsersFound")}
                          </td>
                        </tr>
                      ) : (
                        filteredData.free.map((user) => (
                          <tr key={user.email} className="border-b border-[#8b6239]/20 hover:bg-[#2a1f18]/40">
                            <td className="py-3 px-4 text-sm text-[#F5F1E7]">{user.full_name || '-'}</td>
                            <td className="py-3 px-4 text-sm text-[#E0D8C8]">{user.email}</td>
                            <td className="py-3 px-4">
                              <Badge variant="outline" className="text-[#E0D8C8]/70 border-[#8b6239]/40">
                                {user.subscription_status}
                              </Badge>
                            </td>
                            <td className="py-3 px-4 text-sm text-[#E0D8C8]">
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