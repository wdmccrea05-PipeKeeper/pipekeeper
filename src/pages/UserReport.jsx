import React from 'react';
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Users, TrendingUp, RefreshCw, Crown, UserX } from "lucide-react";
import { toast } from "sonner";

export default function UserReport() {
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

  return (
    <div className="max-w-7xl mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold text-[#e8d5b7]">User Subscription Report</h1>
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

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card className="bg-white/95 border-[#e8d5b7]/30">
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

        <Card className="bg-white/95 border-[#e8d5b7]/30">
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

        <Card className="bg-white/95 border-[#e8d5b7]/30">
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
      </div>

      {/* Paid Users Table */}
      <Card className="bg-white/95 border-[#e8d5b7]/30 mb-6">
        <CardHeader>
          <CardTitle className="text-stone-800 flex items-center gap-2">
            <Crown className="w-5 h-5 text-amber-600" />
            Paid Users ({report?.paid_users?.length || 0})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-stone-200">
                  <th className="text-left py-3 px-4 text-sm font-semibold text-stone-700">Name</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-stone-700">Email</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-stone-700">Status</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-stone-700">Billing</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-stone-700">Period End</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-stone-700">Joined</th>
                </tr>
              </thead>
              <tbody>
                {report?.paid_users?.map((user) => (
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
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Free Users Table */}
      <Card className="bg-white/95 border-[#e8d5b7]/30">
        <CardHeader>
          <CardTitle className="text-stone-800 flex items-center gap-2">
            <UserX className="w-5 h-5 text-stone-600" />
            Free Users ({report?.free_users?.length || 0})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-stone-200">
                  <th className="text-left py-3 px-4 text-sm font-semibold text-stone-700">Name</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-stone-700">Email</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-stone-700">Status</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-stone-700">Joined</th>
                </tr>
              </thead>
              <tbody>
                {report?.free_users?.map((user) => (
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
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}