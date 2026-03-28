import { useState, useEffect, useMemo } from 'react';
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
  
  // All hooks MUST be called unconditionally at top level
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

  const { data: adminMetrics, isLoading: metricsLoading, refetch: refetchAdminMetrics } = useQuery({
    queryKey: ['admin-metrics'],
    queryFn: async () => {
      const response = await base44.functions.invoke('getAdminMetrics', {});
      return response.data;
    },
    enabled: isAdmin,
    retry: false,
  });

  const { data: userMetrics, isLoading: userMetricsLoading, refetch: refetchUserMetrics } = useQuery({
    queryKey: ['user-metrics'],
    queryFn: async () => {
      const response = await base44.functions.invoke('calculateUserMetrics', {});
      return response.data;
    },
    enabled: isAdmin,
    retry: false,
  });

  useEffect(() => {
    refetchUserMetrics();
  }, [renewalsDateRange, newAccountsDateRange, refetchUserMetrics]);

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

  // Early returns - AFTER all hooks
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

  const consolidatedPaidUsers = userMetrics?.consolidatedPaidUsers || summary.paid_users;
  const consolidatedPaidPercentage = summary.paid_percentage;
  const consolidatedUserCount = userMetrics?.consolidatedPaidUsers || ((userCounts.premium || 0) + (userCounts.pro || 0));
  const consolidatedTrialCount = userMetrics?.activeOrTrialPaidUsers || ((subscriptionBreakdown.activeOrTrialPremium || 0) + (subscriptionBreakdown.activeOrTrialPro || 0));
  const legacyPremiumCount = userMetrics?.legacyPremiumCount || (userCounts.legacyPremium || 0);
  const newAccountsData = userMetrics?.newAccounts || { day: 0, week: 0, month: 0, quarter: 0 };
  const renewalsData = userMetrics?.renewals || { week: { count: 0, totalAmount: 0 }, month: { count: 0, totalAmount: 0 }, quarter: { count: 0, totalAmount: 0 }, year: { count: 0, totalAmount: 0 } };
  const dailyActiveUsers = userMetrics?.dailyActiveUsers || 0;
  const weeklyActiveUsers = userMetrics?.weeklyActiveUsers || 0;

  // Compute platform breakdown directly from the report data (source of truth)
  const computedPlatformBreakdown = useMemo(() => {
    const breakdown = { apple: { paid: 0, free: 0 }, android: { paid: 0, free: 0 }, web: { paid: 0, free: 0 }, unknown: { paid: 0, free: 0 } };
    (report?.paid_users || []).forEach(u => {
      const p = (u.platform || 'web').toLowerCase();
      const key = (p === 'ios' || p === 'apple') ? 'apple' : (p === 'android' ? 'android' : (p === 'web' ? 'web' : 'unknown'));
      breakdown[key].paid++;
    });
    (report?.free_users || []).forEach(u => {
      const p = (u.platform || 'web').toLowerCase();
      const key = (p === 'ios' || p === 'apple') ? 'apple' : (p === 'android' ? 'android' : (p === 'web' ? 'web' : 'unknown'));
      breakdown[key].free++;
    });
    return breakdown;
  }, [report]);

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
                await refetchUserMetrics();
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
              refetchUserMetrics();
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

        {report && (
          <>
            <Card className="bg-transparent">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-[#E0D8C8]">iOS/Apple</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-[#E0D8C8]/70">{t("userReport.paid")}:</span>
                    <span className="font-bold text-[#F5F1E7]">{computedPlatformBreakdown.apple.paid}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-[#E0D8C8]/70">{t("userReport.free")}:</span>
                    <span className="font-bold text-[#F5F1E7]">{computedPlatformBreakdown.apple.free}</span>
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
                    <span className="font-bold text-[#F5F1E7]">{computedPlatformBreakdown.android.paid}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-[#E0D8C8]/70">{t("userReport.free")}:</span>
                    <span className="font-bold text-[#F5F1E7]">{computedPlatformBreakdown.android.free}</span>
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
                    <span className="font-bold text-[#F5F1E7]">{computedPlatformBreakdown.web.paid}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-[#E0D8C8]/70">{t("userReport.free")}:</span>
                    <span className="font-bold text-[#F5F1E7]">{computedPlatformBreakdown.web.free}</span>
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
                    <span className="font-bold text-[#F5F1E7]">{computedPlatformBreakdown.unknown.paid}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-[#E0D8C8]/70">{t("userReport.free")}:</span>
                    <span className="font-bold text-[#F5F1E7]">{computedPlatformBreakdown.unknown.free}</span>
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

      {/* New Accounts Panel */}
      {userMetrics && !userMetricsLoading && (
        <Card className="bg-transparent mb-6">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-[#F5F1E7] flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-[#E0D8C8]/70" />
                New Accounts
              </CardTitle>
              <div className="flex gap-2">
                {['day', 'week', 'month', 'quarter'].map((period) => (
                  <Button
                    key={period}
                    variant={newAccountsDateRange === period ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setNewAccountsDateRange(period)}
                    className="text-xs capitalize"
                  >
                    {period}
                  </Button>
                ))}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-[#F5F1E7]">
              {newAccountsData[newAccountsDateRange] || 0}
            </div>
            <p className="text-sm text-[#E0D8C8]/70 mt-2">
              New accounts in the last {newAccountsDateRange}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Renewals Panel */}
      {userMetrics && !userMetricsLoading && (
        <Card className="bg-transparent mb-6">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-[#F5F1E7] flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-[#E0D8C8]/70" />
                Renewals
              </CardTitle>
              <div className="flex gap-2">
                {['week', 'month', 'quarter', 'year'].map((period) => (
                  <Button
                    key={period}
                    variant={renewalsDateRange === period ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setRenewalsDateRange(period)}
                    className="text-xs capitalize"
                  >
                    {period}
                  </Button>
                ))}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-[#E0D8C8]/70 font-medium mb-1">Count</p>
                <p className="text-2xl font-bold text-[#F5F1E7]">
                  {renewalsData[renewalsDateRange]?.count || 0}
                </p>
              </div>
              <div>
                <p className="text-xs text-[#E0D8C8]/70 font-medium mb-1 flex items-center gap-1">
                  <DollarSign className="w-3 h-3" />Total
                </p>
                <p className="text-2xl font-bold text-[#F5F1E7]">
                  ${(renewalsData[renewalsDateRange]?.totalAmount || 0).toFixed(2)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Activity & Usage Panel */}
      {userMetrics && !userMetricsLoading && (
        <Card className="bg-transparent mb-6">
          <CardHeader className="pb-3">
            <CardTitle className="text-[#F5F1E7] flex items-center gap-2">
              <Zap className="w-5 h-5 text-[#E0D8C8]/70" />
              Activity & Usage
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="p-3 rounded-lg border border-[#8b6239]/30 bg-[#2a1f18]/50">
                <p className="text-xs text-[#E0D8C8]/70 font-medium mb-1">Daily Active Users</p>
                <p className="text-2xl font-bold text-[#F5F1E7]">{dailyActiveUsers || 0}</p>
              </div>
              <div className="p-3 rounded-lg border border-[#8b6239]/30 bg-[#2a1f18]/50">
                <p className="text-xs text-[#E0D8C8]/70 font-medium mb-1">Weekly Active Users</p>
                <p className="text-2xl font-bold text-[#F5F1E7]">{weeklyActiveUsers || 0}</p>
              </div>
              <div className="p-3 rounded-lg border border-[#8b6239]/30 bg-[#2a1f18]/50">
                <p className="text-xs text-[#E0D8C8]/70 font-medium mb-1">Avg Pipes/User</p>
                <p className="text-2xl font-bold text-[#F5F1E7]">
                  {(usageAvgPipes?.average || 0).toFixed(1)}
                </p>
              </div>
              <div className="p-3 rounded-lg border border-[#8b6239]/30 bg-[#2a1f18]/50">
                <p className="text-xs text-[#E0D8C8]/70 font-medium mb-1">Avg Tobacco/User</p>
                <p className="text-2xl font-bold text-[#F5F1E7]">
                  {(usageAvgTobaccos?.average || 0).toFixed(1)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
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