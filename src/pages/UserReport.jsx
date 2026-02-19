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


export default function UserReport() {
  const [viewFilter, setViewFilter] = useState('all'); // 'all', 'paid', 'free'
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

  // Filter and search logic - moved before early returns to avoid hook rule violation
  const filteredData = useMemo(() => {
    if (!report) return { paid: [], free: [] };

    let paid = [...(report.paid_users || [])];
    let free = [...(report.free_users || [])];

    // Apply search filter
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

    // Apply sorting
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
            <p className="text-rose-800">Error loading user: {userError.message}</p>
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
            <p className="text-rose-800 font-semibold">Unauthorized</p>
            <p className="text-rose-700 text-sm mt-2">Admin access required to view this page.</p>
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
            <p className="text-rose-800">Error loading report: {error.message}</p>
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
          <h1 className="text-3xl font-bold text-[#e8d5b7]">User Subscription Report</h1>
          <p className="text-xs text-[#e8d5b7]/60 mt-1">Last updated: {lastUpdated}</p>
        </div>
        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
          <Button
            onClick={async () => {
              try {
                setIsSyncing(true);
                const res = await base44.functions.invoke('backfillStripeCustomers', {});
                if (res?.data?.ok) {
                  toast.success(`Backfill complete: ${res.data.created} created, ${res.data.updated} updated`);
                } else {
                  toast.error(res?.data?.error || 'Backfill failed');
                }
                await refetch();
              } catch (e) {
                toast.error(e?.message || 'Backfill failed');
              } finally {
                setIsSyncing(false);
              }
            }}
            variant="default"
            className="w-full gap-2 sm:w-auto"
            disabled={isSyncing}
          >
            <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
            {isSyncing ? 'Syncing…' : 'Backfill from Stripe'}
          </Button>

          <Button
            onClick={() => {
              refetch();
              toast.success('Report refreshed');
            }}
            variant="outline"
            className="w-full gap-2 sm:w-auto"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </Button>
        </div>
      </div>
      <div className="mb-6" />



      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card 
          className={`bg-white/95 border-[#e8d5b7]/30 cursor-pointer transition-all hover:shadow-lg ${
            viewFilter === 'all' ? 'ring-2 ring-[#8b3a3a]' : ''
          }`}
          onClick={() => {
            setViewFilter('all');
            setShowPaidTable(true);
            setShowFreeTable(true);
          }}
        >
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-stone-600 flex items-center gap-2">
              <Users className="w-4 h-4" />
              Total Users
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-stone-800">{summary.total_users}</p>
          </CardContent>
        </Card>

        <Card 
          className={`bg-white/95 border-[#e8d5b7]/30 cursor-pointer transition-all hover:shadow-lg ${
            viewFilter === 'paid' ? 'ring-2 ring-emerald-500' : ''
          }`}
          onClick={() => {
            setViewFilter('paid');
            setShowPaidTable(true);
            setShowFreeTable(false);
          }}
        >
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-emerald-600 flex items-center gap-2">
              <Crown className="w-4 h-4" />
              Paid Users
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-emerald-700">{summary.paid_users}</p>
          </CardContent>
        </Card>

        <Card 
          className={`bg-white/95 border-[#e8d5b7]/30 cursor-pointer transition-all hover:shadow-lg ${
            viewFilter === 'free' ? 'ring-2 ring-stone-500' : ''
          }`}
          onClick={() => {
            setViewFilter('free');
            setShowPaidTable(false);
            setShowFreeTable(true);
          }}
        >
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-stone-600 flex items-center gap-2">
              <UserX className="w-4 h-4" />
              Free Users
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-stone-700">{summary.free_users}</p>
          </CardContent>
        </Card>

        <Card className="bg-white/95 border-[#e8d5b7]/30">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-blue-600 flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              Paid %
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-blue-700">{summary.paid_percentage}%</p>
          </CardContent>
        </Card>

        <Card className="bg-white/95 border-[#e8d5b7]/30">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-purple-600 flex items-center gap-2">
              <UserPlus className="w-4 h-4" />
              New (7 days)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-purple-700">{metricsLoading ? '...' : trialMetrics.newSignupsLast7d || 0}</p>
          </CardContent>
        </Card>

        {/* Platform Cards */}
        {adminMetrics?.platformBreakdown && !metricsLoading && (
          <>
            <Card className="bg-white/95 border-gray-200">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-gray-700">Apple</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-emerald-600">Paid:</span>
                    <span className="font-bold text-emerald-700">{platformBreakdown.apple?.paid || 0}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-600">Free:</span>
                    <span className="font-bold text-gray-700">{platformBreakdown.apple?.free || 0}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white/95 border-green-200">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-green-700">Android</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-emerald-600">Paid:</span>
                    <span className="font-bold text-emerald-700">{platformBreakdown.android?.paid || 0}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-600">Free:</span>
                    <span className="font-bold text-gray-700">{platformBreakdown.android?.free || 0}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white/95 border-blue-200">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-blue-700">Web</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-emerald-600">Paid:</span>
                    <span className="font-bold text-emerald-700">{platformBreakdown.web?.paid || 0}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-600">Free:</span>
                    <span className="font-bold text-gray-700">{platformBreakdown.web?.free || 0}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white/95 border-purple-200">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-purple-700">iOS</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-emerald-600">Paid:</span>
                    <span className="font-bold text-emerald-700">{platformBreakdown.ios?.paid || 0}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-600">Free:</span>
                    <span className="font-bold text-gray-700">{platformBreakdown.ios?.free || 0}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white/95 border-amber-200">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-amber-700">Unknown</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-emerald-600">Paid:</span>
                    <span className="font-bold text-emerald-700">{platformBreakdown.unknown?.paid || 0}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-600">Free:</span>
                    <span className="font-bold text-gray-700">{platformBreakdown.unknown?.free || 0}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      {/* Trials Panel */}
      {adminMetrics && !metricsLoading && (
        <Card className="bg-white/95 border-[#e8d5b7]/30 mb-6">
          <CardHeader className="pb-3">
            <CardTitle className="text-stone-800 flex items-center gap-2">
              <Clock className="w-5 h-5 text-orange-600" />
              Trial Metrics
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div className="p-3 bg-orange-50 rounded-lg border border-orange-100">
                <p className="text-xs text-orange-600 font-medium">Currently on Trial</p>
                <p className="text-2xl font-bold text-orange-800">{trialMetrics.currentlyOnTrial || 0}</p>
              </div>
              <div className="p-3 bg-red-50 rounded-lg border border-red-100">
                <p className="text-xs text-red-600 font-medium">Ending in 3 Days</p>
                <p className="text-2xl font-bold text-red-800">{trialMetrics.endingIn3Days || 0}</p>
              </div>
              <div className="p-3 bg-yellow-50 rounded-lg border border-yellow-100">
                <p className="text-xs text-yellow-600 font-medium">Ending in 7 Days</p>
                <p className="text-2xl font-bold text-yellow-800">{trialMetrics.endingIn7Days || 0}</p>
              </div>
              <div className="p-3 bg-blue-50 rounded-lg border border-blue-100">
                <p className="text-xs text-blue-600 font-medium">Avg Days Remaining</p>
                <p className="text-2xl font-bold text-blue-800">{trialMetrics.avgDaysRemaining || 0}</p>
              </div>
              <div className="p-3 bg-green-50 rounded-lg border border-green-100">
                <p className="text-xs text-green-600 font-medium">Converted (30d)</p>
                <p className="text-2xl font-bold text-green-800">{trialMetrics.convertedLast30d || 0}</p>
              </div>
              <div className="p-3 bg-rose-50 rounded-lg border border-rose-100">
                <p className="text-xs text-rose-600 font-medium">Drop-offs (30d)</p>
                <p className="text-2xl font-bold text-rose-800">{trialMetrics.dropoffLast30d || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Growth Chart */}
      {growthLastEightWeeks.length > 0 && !metricsLoading && (
        <Card className="bg-white/95 border-[#e8d5b7]/30 mb-6">
          <CardHeader className="pb-3">
            <CardTitle className="text-stone-800 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-blue-600" />
              Weekly Growth (Last 8 Weeks)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={growthLastEightWeeks}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e8d5b7/20" />
                <XAxis dataKey="week" tick={{ fill: '#5a5a5a', fontSize: 12 }} />
                <YAxis tick={{ fill: '#5a5a5a', fontSize: 12 }} />
                <Tooltip contentStyle={{ backgroundColor: '#fff', border: '1px solid #ddd' }} />
                <Legend />
                <Bar dataKey="newUsers" fill="#3b82f6" name="New Users" />
                <Bar dataKey="newPaidSubscribers" fill="#10b981" name="New Paid" />
                <Bar dataKey="newProSubscribers" fill="#f59e0b" name="New Pro" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Churn Panel */}
      {adminMetrics?.churnMetrics && !metricsLoading && (
        <Card className="bg-white/95 border-[#e8d5b7]/30 mb-6">
          <CardHeader className="pb-3">
            <CardTitle className="text-stone-800 flex items-center gap-2">
              <TrendingDown className="w-5 h-5 text-red-600" />
              Churn & Downgrades (Last 30 Days)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="p-3 bg-red-50 rounded-lg border border-red-100">
                <p className="text-xs text-red-600 font-medium">Premium Churn Rate</p>
                <p className="text-2xl font-bold text-red-800">{churnMetrics.premiumChurn30d || 0}%</p>
              </div>
              <div className="p-3 bg-rose-50 rounded-lg border border-rose-100">
                <p className="text-xs text-rose-600 font-medium">Pro Churn Rate</p>
                <p className="text-2xl font-bold text-rose-800">{churnMetrics.proChurn30d || 0}%</p>
              </div>
              <div className="p-3 bg-purple-50 rounded-lg border border-purple-100">
                <p className="text-xs text-purple-600 font-medium">Pro → Premium</p>
                <p className="text-2xl font-bold text-purple-800">{churnMetrics.proToPremiumDowngrade || 0}</p>
              </div>
              <div className="p-3 bg-pink-50 rounded-lg border border-pink-100">
                <p className="text-xs text-pink-600 font-medium">Premium → Free</p>
                <p className="text-2xl font-bold text-pink-800">{churnMetrics.premiumToFreeDowngrade || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Additional Metrics Cards */}
      {adminMetrics && !metricsLoading && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Card className="bg-white/95 border-[#e8d5b7]/30">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-indigo-600">Premium Users</CardTitle>
              <p className="text-xs text-stone-500 mt-1">Post Feb 1, 2026</p>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-indigo-700">{userCounts.premium || 0}</p>
            </CardContent>
          </Card>
          <Card className="bg-white/95 border-[#e8d5b7]/30">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-amber-600">Pro Users</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-amber-700">{userCounts.pro || 0}</p>
            </CardContent>
          </Card>
          <Card className="bg-white/95 border-[#e8d5b7]/30">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-rose-600">On Trial</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-rose-700">{trialMetrics.currentlyOnTrial || 0}</p>
            </CardContent>
          </Card>
          <Card className="bg-white/95 border-[#e8d5b7]/30">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-cyan-600">Active/Trial Premium</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-cyan-700">{subscriptionBreakdown.activeOrTrialPremium || 0}</p>
            </CardContent>
          </Card>
          <Card className="bg-white/95 border-[#e8d5b7]/30">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-orange-600">Active/Trial Pro</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-orange-700">{subscriptionBreakdown.activeOrTrialPro || 0}</p>
            </CardContent>
          </Card>
          <Card className="bg-white/95 border-[#e8d5b7]/30">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-fuchsia-600">Legacy Premium</CardTitle>
              <p className="text-xs text-stone-500 mt-1">Subscribed before Feb 1, 2026</p>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-fuchsia-700">{userCounts.legacyPremium || 0}</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Usage Metrics */}
      {adminMetrics?.usageMetrics && !metricsLoading && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Card className="bg-white/95 border-[#e8d5b7]/30">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-indigo-600">Avg Pipes per User</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-stone-600">Free</span>
                  <span className="font-bold text-stone-800">{usageAvgPipes.free || 0}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-stone-600">Premium</span>
                  <span className="font-bold text-stone-800">{usageAvgPipes.premium || 0}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-stone-600">Pro</span>
                  <span className="font-bold text-stone-800">{usageAvgPipes.pro || 0}</span>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-white/95 border-[#e8d5b7]/30">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-amber-600">Avg Tobaccos per User</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-stone-600">Free</span>
                  <span className="font-bold text-stone-800">{usageAvgTobaccos.free || 0}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-stone-600">Premium</span>
                  <span className="font-bold text-stone-800">{usageAvgTobaccos.premium || 0}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-stone-600">Pro</span>
                  <span className="font-bold text-stone-800">{usageAvgTobaccos.pro || 0}</span>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-white/95 border-[#e8d5b7]/30">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-cyan-600">Community Engagement</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-cyan-700">{usageMetrics.communityEngagement || 0}%</p>
              <p className="text-xs text-stone-500 mt-1">Users with comments</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Search Bar */}
      <div className="mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-stone-400" />
          <Input
            placeholder="Search by name or email..."
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
                    Paid Users ({filteredData.paid.length})
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
                          Name {sortColumn === 'full_name' && (sortDirection === 'asc' ? '↑' : '↓')}
                        </th>
                        <th 
                          className="text-left py-3 px-4 text-sm font-semibold text-stone-700 cursor-pointer hover:bg-stone-50"
                          onClick={() => handleSort('email')}
                        >
                          Email {sortColumn === 'email' && (sortDirection === 'asc' ? '↑' : '↓')}
                        </th>
                        <th 
                          className="text-left py-3 px-4 text-sm font-semibold text-stone-700 cursor-pointer hover:bg-stone-50"
                          onClick={() => handleSort('subscription_status')}
                        >
                          Status {sortColumn === 'subscription_status' && (sortDirection === 'asc' ? '↑' : '↓')}
                        </th>
                        <th className="text-left py-3 px-4 text-sm font-semibold text-stone-700">Billing</th>
                        <th 
                          className="text-left py-3 px-4 text-sm font-semibold text-stone-700 cursor-pointer hover:bg-stone-50"
                          onClick={() => handleSort('subscription_end')}
                        >
                          Period End {sortColumn === 'subscription_end' && (sortDirection === 'asc' ? '↑' : '↓')}
                        </th>
                        <th 
                          className="text-left py-3 px-4 text-sm font-semibold text-stone-700 cursor-pointer hover:bg-stone-50"
                          onClick={() => handleSort('created_date')}
                        >
                          Joined {sortColumn === 'created_date' && (sortDirection === 'asc' ? '↑' : '↓')}
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredData.paid.length === 0 ? (
                        <tr>
                          <td colSpan="6" className="text-center py-8 text-stone-500">
                            {searchQuery ? 'No users match your search' : 'No paid users found'}
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
                    Free Users ({filteredData.free.length})
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
                          Name {sortColumn === 'full_name' && (sortDirection === 'asc' ? '↑' : '↓')}
                        </th>
                        <th 
                          className="text-left py-3 px-4 text-sm font-semibold text-stone-700 cursor-pointer hover:bg-stone-50"
                          onClick={() => handleSort('email')}
                        >
                          Email {sortColumn === 'email' && (sortDirection === 'asc' ? '↑' : '↓')}
                        </th>
                        <th 
                          className="text-left py-3 px-4 text-sm font-semibold text-stone-700 cursor-pointer hover:bg-stone-50"
                          onClick={() => handleSort('subscription_status')}
                        >
                          Status {sortColumn === 'subscription_status' && (sortDirection === 'asc' ? '↑' : '↓')}
                        </th>
                        <th 
                          className="text-left py-3 px-4 text-sm font-semibold text-stone-700 cursor-pointer hover:bg-stone-50"
                          onClick={() => handleSort('created_date')}
                        >
                          Joined {sortColumn === 'created_date' && (sortDirection === 'asc' ? '↑' : '↓')}
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredData.free.length === 0 ? (
                        <tr>
                          <td colSpan="4" className="text-center py-8 text-stone-500">
                            {searchQuery ? 'No users match your search' : 'No free users found'}
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
