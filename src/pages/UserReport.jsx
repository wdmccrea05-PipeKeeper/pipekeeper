import React, { useState, useMemo } from 'react';
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Loader2, Users, TrendingUp, RefreshCw, Crown, UserX, Search, ChevronDown, ChevronUp, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

export default function UserReport() {
  const [viewFilter, setViewFilter] = useState('all'); // 'all', 'paid', 'free'
  const [searchQuery, setSearchQuery] = useState('');
  const [showPaidTable, setShowPaidTable] = useState(true);
  const [showFreeTable, setShowFreeTable] = useState(true);
  const [sortColumn, setSortColumn] = useState('created_date');
  const [sortDirection, setSortDirection] = useState('desc');
  const [isSyncing, setIsSyncing] = useState(false);

  const { data: user } = useQuery({
    queryKey: ['current-user'],
    queryFn: () => base44.auth.me(),
  });

  const { data: report, isLoading, error, refetch } = useQuery({
    queryKey: ['user-report'],
    queryFn: async () => {
      const response = await base44.functions.invoke('getUserReport', {});
      return response.data;
    },
    enabled: user?.role === 'admin',
    retry: false,
  });

  const { data: adminMetrics, isLoading: metricsLoading } = useQuery({
    queryKey: ['admin-metrics'],
    queryFn: async () => {
      const response = await base44.functions.invoke('getAdminMetrics', {});
      return response.data;
    },
    enabled: user?.role === 'admin',
    retry: false,
  });

  // Filter and search logic - moved before early returns to avoid hook rule violation
  const filteredData = useMemo(() => {
    if (!report) return { paid: [], free: [] };

    let paid = [...(report.paid_users || [])];
    let free = [...(report.free_users || [])];

    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      paid = paid.filter(u => 
        u.email.toLowerCase().includes(query) || 
        u.full_name?.toLowerCase().includes(query)
      );
      free = free.filter(u => 
        u.email.toLowerCase().includes(query) || 
        u.full_name?.toLowerCase().includes(query)
      );
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

  if (user?.role !== 'admin') {
    return (
      <div className="max-w-7xl mx-auto p-6">
        <Card className="border-rose-200 bg-rose-50">
          <CardContent className="p-6">
            <p className="text-rose-800">Admin access required to view this page.</p>
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

  return (
    <div className="max-w-7xl mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold text-[#e8d5b7]">User Subscription Report</h1>
        <div className="flex items-center gap-2">
          <Button
            onClick={async () => {
              try {
                setIsSyncing(true);
                const res = await base44.functions.invoke('syncStripeSubscriptions', {});
                if (res?.data?.ok) {
                  toast.success(`Stripe sync complete: ${res.data.updatedUsers} users updated`);
                } else {
                  toast.error(res?.data?.error || 'Stripe sync failed');
                }
                await refetch();
              } catch (e) {
                toast.error(e?.message || 'Stripe sync failed');
              } finally {
                setIsSyncing(false);
              }
            }}
            variant="default"
            className="gap-2"
            disabled={isSyncing}
          >
            <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
            {isSyncing ? 'Syncing…' : 'Sync from Stripe'}
          </Button>

          <Button
            onClick={() => {
              refetch();
              toast.success('Report refreshed');
            }}
            variant="outline"
            className="gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </Button>
        </div>
      </div>

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
            <p className="text-3xl font-bold text-stone-800">{report?.summary?.total_users || 0}</p>
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
            <p className="text-3xl font-bold text-emerald-700">{report?.summary?.paid_users || 0}</p>
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
            <p className="text-3xl font-bold text-stone-700">{report?.summary?.free_users || 0}</p>
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
            <p className="text-3xl font-bold text-blue-700">{report?.summary?.paid_percentage || 0}%</p>
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
            <p className="text-3xl font-bold text-purple-700">{metricsLoading ? '...' : adminMetrics?.userCounts?.free || 0}</p>
          </CardContent>
        </Card>
      </div>

      {/* Additional Metrics Cards */}
      {adminMetrics && !metricsLoading && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Card className="bg-white/95 border-[#e8d5b7]/30">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-indigo-600">Premium Users</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-indigo-700">{adminMetrics.userCounts.premium}</p>
            </CardContent>
          </Card>
          <Card className="bg-white/95 border-[#e8d5b7]/30">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-amber-600">Pro Users</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-amber-700">{adminMetrics.userCounts.pro}</p>
            </CardContent>
          </Card>
          <Card className="bg-white/95 border-[#e8d5b7]/30">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-rose-600">On Trial</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-rose-700">{adminMetrics.trialMetrics.currentlyOnTrial}</p>
            </CardContent>
          </Card>
          <Card className="bg-white/95 border-[#e8d5b7]/30">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-cyan-600">Active Premium</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-cyan-700">{adminMetrics.subscriptionBreakdown.activePremium}</p>
            </CardContent>
          </Card>
          <Card className="bg-white/95 border-[#e8d5b7]/30">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-orange-600">Active Pro</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-orange-700">{adminMetrics.subscriptionBreakdown.activePro}</p>
            </CardContent>
          </Card>
          <Card className="bg-white/95 border-[#e8d5b7]/30">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-fuchsia-600">Legacy Premium</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-fuchsia-700">{adminMetrics.userCounts.legacyPremium}</p>
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