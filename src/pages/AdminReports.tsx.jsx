import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AlertCircle, CheckCircle, XCircle, Eye, EyeOff } from 'lucide-react';
import { toast } from 'sonner';
import { useCurrentUser } from '@/components/hooks/useCurrentUser';
import SubscriptionMigrationCard from '@/components/admin/SubscriptionMigrationCard';
import SubscriptionProviderCard from '@/components/admin/SubscriptionProviderCard';
import RepairProAccessCard from '@/components/admin/RepairProAccessCard';
import RepairStripeByEmailCard from '@/components/admin/RepairStripeByEmailCard';
import StripeDiagnosticsCard from '@/components/admin/StripeDiagnosticsCard';
import BackfillStripeCard from '@/components/admin/BackfillStripeCard.tsx';

export default function AdminReports() {
  const { user, isAdmin } = useCurrentUser();
  const queryClient = useQueryClient();
  const [selectedReport, setSelectedReport] = useState(null);
  const [backfilling, setBackfilling] = useState(false);

  const { data: reports = [], isLoading } = useQuery({
    queryKey: ['admin-reports'],
    queryFn: () => base44.entities.AbuseReport.list('-created_date', 100),
    enabled: isAdmin,
  });

  const updateReportMutation = useMutation({
    mutationFn: async ({ reportId, status }) => {
      await base44.entities.AbuseReport.update(reportId, { status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-reports'] });
      toast.success('Report updated');
      setSelectedReport(null);
    },
    onError: () => toast.error('Failed to update report'),
  });

  const hideContentMutation = useMutation({
    mutationFn: async ({ commentId }) => {
      await base44.entities.Comment.update(commentId, { is_hidden: true });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['comments'] });
      toast.success('Content hidden');
    },
    onError: () => toast.error('Failed to hide content'),
  });

  const blockUserMutation = useMutation({
    mutationFn: async ({ reportId, reportedEmail }) => {
      // Update user profile to mark as blocked
      const profiles = await base44.entities.UserProfile.filter({ user_email: reportedEmail });
      if (profiles[0]) {
        await base44.entities.UserProfile.update(profiles[0].id, {
          blocked_users: [...(profiles[0].blocked_users || []), 'SYSTEM_BLOCKED']
        });
      }
      await base44.entities.AbuseReport.update(reportId, { status: 'actioned' });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-reports'] });
      toast.success('User blocked');
      setSelectedReport(null);
    },
    onError: () => toast.error('Failed to block user'),
  });

  const handleBackfillStripe = async () => {
    setBackfilling(true);
    try {
      const result = await base44.functions.invoke('syncStripeSubscriptions');
      toast.success(result.data?.message || 'Stripe backfill completed');
    } catch (error) {
      toast.error('Backfill failed: ' + (error.message || 'Unknown error'));
    } finally {
      setBackfilling(false);
    }
  };

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#1A2B3A] via-[#243548] to-[#1A2B3A] p-6 flex items-center justify-center">
        <Card className="max-w-md">
          <CardContent className="p-8 text-center">
            <AlertCircle className="w-12 h-12 mx-auto mb-4 text-red-500" />
            <h2 className="text-xl font-semibold mb-2">Access Denied</h2>
            <p className="text-stone-500">Only administrators can access this page.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const pendingReports = reports.filter(r => r.status === 'pending');
  const reviewedReports = reports.filter(r => r.status === 'reviewed');
  const actionedReports = reports.filter(r => r.status === 'actioned');
  const dismissedReports = reports.filter(r => r.status === 'dismissed');

  const handleAction = async (report, action) => {
    if (action === 'dismiss') {
      await updateReportMutation.mutateAsync({ reportId: report.id, status: 'dismissed' });
    } else if (action === 'hide' && report.comment_id) {
      await hideContentMutation.mutateAsync({ commentId: report.comment_id });
      await updateReportMutation.mutateAsync({ reportId: report.id, status: 'actioned' });
    } else if (action === 'block' && report.reported_user_email) {
      await blockUserMutation.mutateAsync({ 
        reportId: report.id, 
        reportedEmail: report.reported_user_email 
      });
    } else if (action === 'review') {
      await updateReportMutation.mutateAsync({ reportId: report.id, status: 'reviewed' });
    }
  };

  const ReportCard = ({ report }) => (
    <Card className="mb-4 border-stone-200 hover:border-stone-300 transition-colors">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <Badge variant={
                report.status === 'pending' ? 'destructive' :
                report.status === 'actioned' ? 'default' :
                report.status === 'dismissed' ? 'secondary' : 'outline'
              }>
                {report.status}
              </Badge>
              <span className="text-sm text-stone-500">
                {report.context_type}
              </span>
            </CardTitle>
            <p className="text-xs text-stone-400 mt-1">
              Reported: {new Date(report.created_date).toLocaleDateString()}
            </p>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <div>
            <p className="text-sm font-medium text-stone-700">Reporter:</p>
            <p className="text-sm text-stone-600">{report.reporter_email}</p>
          </div>
          
          {report.reported_user_email && (
            <div>
              <p className="text-sm font-medium text-stone-700">Reported User:</p>
              <p className="text-sm text-stone-600">{report.reported_user_email}</p>
            </div>
          )}
          
          <div>
            <p className="text-sm font-medium text-stone-700">Reason:</p>
            <p className="text-sm text-stone-600">{report.reason}</p>
          </div>

          {report.status === 'pending' && (
            <div className="flex gap-2 mt-4 pt-4 border-t">
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleAction(report, 'review')}
              >
                <Eye className="w-4 h-4 mr-1" />
                Review
              </Button>
              
              {report.comment_id && (
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => handleAction(report, 'hide')}
                >
                  <EyeOff className="w-4 h-4 mr-1" />
                  Hide Content
                </Button>
              )}
              
              {report.reported_user_email && (
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => handleAction(report, 'block')}
                >
                  <XCircle className="w-4 h-4 mr-1" />
                  Block User
                </Button>
              )}
              
              <Button
                size="sm"
                variant="secondary"
                onClick={() => handleAction(report, 'dismiss')}
              >
                <CheckCircle className="w-4 h-4 mr-1" />
                Dismiss
              </Button>
            </div>
          )}

          {report.status === 'reviewed' && (
            <div className="flex gap-2 mt-4 pt-4 border-t">
              {report.comment_id && (
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => handleAction(report, 'hide')}
                >
                  <EyeOff className="w-4 h-4 mr-1" />
                  Hide Content
                </Button>
              )}
              
              {report.reported_user_email && (
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => handleAction(report, 'block')}
                >
                  <XCircle className="w-4 h-4 mr-1" />
                  Block User
                </Button>
              )}
              
              <Button
                size="sm"
                variant="secondary"
                onClick={() => handleAction(report, 'dismiss')}
              >
                Dismiss
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#1A2B3A] via-[#243548] to-[#1A2B3A] p-6">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-[#E0D8C8] mb-2">Content Moderation</h1>
              <p className="text-sm sm:text-base text-[#E0D8C8]/70">Review and manage abuse reports</p>
            </div>
            <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
              <Button
                onClick={() => window.location.href = '/UserReport'}
                variant="outline"
                className="w-full sm:w-auto text-xs sm:text-sm whitespace-nowrap"
              >
                User Subscription Report
              </Button>
              <Button
                onClick={handleBackfillStripe}
                disabled={backfilling}
                variant="outline"
                className="w-full sm:w-auto text-xs sm:text-sm whitespace-nowrap"
              >
                {backfilling ? 'Syncing...' : 'Backfill Stripe'}
              </Button>
            </div>
          </div>
        </div>

        {/* Subscription Management */}
        <div className="mb-6">
          <SubscriptionProviderCard me={user} />
        </div>

        {/* Subscription Migration Card */}
        <div className="mb-6">
          <SubscriptionMigrationCard />
        </div>

        {/* Repair Pro Access Card */}
        <div className="mb-6">
          <RepairProAccessCard />
        </div>

        {/* Repair Stripe by Email Card */}
        <div className="mb-6">
          <RepairStripeByEmailCard />
        </div>

        {/* Stripe Diagnostics Card */}
        <div className="mb-6">
          <StripeDiagnosticsCard />
        </div>

        {/* Backfill Stripe Customers Card */}
        <div className="mb-6">
          <BackfillStripeCard />
        </div>

        <Tabs defaultValue="pending" className="w-full">
          <TabsList className="grid w-full grid-cols-2 sm:grid-cols-4 mb-6">
            <TabsTrigger value="pending" className="text-xs sm:text-sm">
              Pending ({pendingReports.length})
            </TabsTrigger>
            <TabsTrigger value="reviewed" className="text-xs sm:text-sm">
              Reviewed ({reviewedReports.length})
            </TabsTrigger>
            <TabsTrigger value="actioned" className="text-xs sm:text-sm">
              Actioned ({actionedReports.length})
            </TabsTrigger>
            <TabsTrigger value="dismissed" className="text-xs sm:text-sm">
              Dismissed ({dismissedReports.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="pending">
            {isLoading ? (
              <p className="text-[#E0D8C8]/70 text-center py-8">Loading...</p>
            ) : pendingReports.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center">
                  <CheckCircle className="w-12 h-12 mx-auto mb-4 text-green-500" />
                  <p className="text-stone-500">No pending reports</p>
                </CardContent>
              </Card>
            ) : (
              pendingReports.map(report => <ReportCard key={report.id} report={report} />)
            )}
          </TabsContent>

          <TabsContent value="reviewed">
            {reviewedReports.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center">
                  <p className="text-stone-500">No reviewed reports</p>
                </CardContent>
              </Card>
            ) : (
              reviewedReports.map(report => <ReportCard key={report.id} report={report} />)
            )}
          </TabsContent>

          <TabsContent value="actioned">
            {actionedReports.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center">
                  <p className="text-stone-500">No actioned reports</p>
                </CardContent>
              </Card>
            ) : (
              actionedReports.map(report => <ReportCard key={report.id} report={report} />)
            )}
          </TabsContent>

          <TabsContent value="dismissed">
            {dismissedReports.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center">
                  <p className="text-stone-500">No dismissed reports</p>
                </CardContent>
              </Card>
            ) : (
              dismissedReports.map(report => <ReportCard key={report.id} report={report} />)
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}