import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createPageUrl } from '@/components/utils/createPageUrl';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AlertCircle, CheckCircle, XCircle, Eye, EyeOff } from 'lucide-react';
import { toast } from 'sonner';
import { useCurrentUser } from '@/components/hooks/useCurrentUser';
import { useTranslation } from '@/components/i18n/safeTranslation';
import SubscriptionProviderCard from '@/components/admin/SubscriptionProviderCard';
import StripeDiagnosticsCard from '@/components/admin/StripeDiagnosticsCard';

export default function AdminReports() {
  const navigate = useNavigate();
  const { user, isAdmin } = useCurrentUser();
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [selectedReport, setSelectedReport] = useState(null);

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
      toast.success(t('admin.reportUpdated'));
      setSelectedReport(null);
    },
    onError: () => toast.error(t('admin.failedToUpdateReport')),
  });

  const hideContentMutation = useMutation({
    mutationFn: async ({ commentId }) => {
      await base44.entities.Comment.update(commentId, { is_hidden: true });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['comments'] });
      toast.success(t('admin.contentHidden'));
    },
    onError: () => toast.error(t('admin.failedToHideContent')),
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
      toast.success(t('admin.userBlocked'));
      setSelectedReport(null);
    },
    onError: () => toast.error(t('admin.failedToBlockUser')),
  });

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#1A2B3A] via-[#243548] to-[#1A2B3A] p-6 flex items-center justify-center">
        <Card className="max-w-md">
          <CardContent className="p-8 text-center">
            <AlertCircle className="w-12 h-12 mx-auto mb-4 text-red-500" />
            <h2 className="text-xl font-semibold mb-2">{t('admin.accessDenied')}</h2>
            <p className="text-stone-500">{t('admin.adminOnly')}</p>
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
              {t('admin.reportedDate')} {new Date(report.created_date).toLocaleDateString()}
            </p>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <div>
            <p className="text-sm font-medium text-stone-700">{t('admin.reporterLabel')}</p>
            <p className="text-sm text-stone-600">{report.reporter_email}</p>
          </div>
          
          {report.reported_user_email && (
            <div>
              <p className="text-sm font-medium text-stone-700">{t('admin.reportedUserLabel')}</p>
              <p className="text-sm text-stone-600">{report.reported_user_email}</p>
            </div>
          )}
          
          <div>
            <p className="text-sm font-medium text-stone-700">{t('admin.reasonLabel')}</p>
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
                {t('admin.reviewBtn')}
              </Button>
              
              {report.comment_id && (
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => handleAction(report, 'hide')}
                >
                  <EyeOff className="w-4 h-4 mr-1" />
                  {t('admin.hideContentBtn')}
                </Button>
              )}
              
              {report.reported_user_email && (
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => handleAction(report, 'block')}
                >
                  <XCircle className="w-4 h-4 mr-1" />
                  {t('admin.blockUserBtn')}
                </Button>
              )}
              
              <Button
                size="sm"
                variant="secondary"
                onClick={() => handleAction(report, 'dismiss')}
              >
                <CheckCircle className="w-4 h-4 mr-1" />
                {t('admin.dismissBtn')}
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
                  {t('admin.hideContentBtn')}
                </Button>
              )}
              
              {report.reported_user_email && (
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => handleAction(report, 'block')}
                >
                  <XCircle className="w-4 h-4 mr-1" />
                  {t('admin.blockUserBtn')}
                </Button>
              )}
              
              <Button
                size="sm"
                variant="secondary"
                onClick={() => handleAction(report, 'dismiss')}
              >
                {t('admin.dismissBtn')}
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
             <h1 className="text-2xl sm:text-3xl font-bold text-[#E0D8C8] mb-2">{t('admin.contentModeration')}</h1>
             <p className="text-sm sm:text-base text-[#E0D8C8]/70">{t('admin.reviewManageReports')}</p>
           </div>
           <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
             <Button
               onClick={() => navigate(createPageUrl('UserReport'))}
               variant="outline"
               className="w-full sm:w-auto text-xs sm:text-sm whitespace-nowrap"
             >
               {t('admin.userSubscriptionReport')}
             </Button>
           </div>
         </div>
       </div>

       {/* Abuse Reports - Moved to Top */}
       <div className="mb-8">
         <Tabs defaultValue="pending" className="w-full">
           <TabsList className="grid w-full grid-cols-2 sm:grid-cols-4 mb-6">
             <TabsTrigger value="pending" className="text-xs sm:text-sm">
               {t('admin.tabPending', { count: pendingReports.length })}
             </TabsTrigger>
             <TabsTrigger value="reviewed" className="text-xs sm:text-sm">
               {t('admin.tabReviewed', { count: reviewedReports.length })}
             </TabsTrigger>
             <TabsTrigger value="actioned" className="text-xs sm:text-sm">
               {t('admin.tabActioned', { count: actionedReports.length })}
             </TabsTrigger>
             <TabsTrigger value="dismissed" className="text-xs sm:text-sm">
               {t('admin.tabDismissed', { count: dismissedReports.length })}
             </TabsTrigger>
           </TabsList>

          <TabsContent value="pending">
            {isLoading ? (
              <p className="text-[#E0D8C8]/70 text-center py-8">{t('common.loading')}</p>
            ) : pendingReports.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center">
                  <CheckCircle className="w-12 h-12 mx-auto mb-4 text-green-500" />
                  <p className="text-[#E0D8C8]/70">{t('admin.noPendingReports')}</p>
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
                  <p className="text-[#E0D8C8]/70">{t('admin.noReviewedReports')}</p>
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
                  <p className="text-[#E0D8C8]/70">{t('admin.noActionedReports')}</p>
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
                  <p className="text-[#E0D8C8]/70">{t('admin.noDismissedReports')}</p>
                </CardContent>
              </Card>
            ) : (
              dismissedReports.map(report => <ReportCard key={report.id} report={report} />)
            )}
          </TabsContent>
          </Tabs>
          </div>

          {/* Subscription Management */}
          <div className="mb-6">
          <SubscriptionProviderCard me={user} />
          </div>

          {/* Stripe Diagnostics Card */}
          <div className="mb-6">
          <StripeDiagnosticsCard />
          </div>
          </div>
          </div>
          );
          }