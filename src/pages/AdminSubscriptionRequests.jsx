import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { AlertCircle, CheckCircle2, Clock, Loader2, Search, ZoomOut } from "lucide-react";
import { toast } from "sonner";
import { useCurrentUser } from "@/components/hooks/useCurrentUser";
import { useTranslation } from "@/components/i18n/safeTranslation";

const STATUS_COLORS = {
  new: "bg-blue-100 text-blue-800",
  paid_confirmed: "bg-yellow-100 text-yellow-800",
  access_granted: "bg-green-100 text-green-800",
  resolved: "bg-gray-100 text-gray-800",
  rejected: "bg-red-100 text-red-800",
};

const STATUS_ICONS = {
  new: <Clock className="w-3 h-3" />,
  paid_confirmed: <AlertCircle className="w-3 h-3" />,
  access_granted: <CheckCircle2 className="w-3 h-3" />,
  resolved: <CheckCircle2 className="w-3 h-3" />,
  rejected: <AlertCircle className="w-3 h-3" />,
};

export default function AdminSubscriptionRequests() {
  const { user, isLoading: userLoading } = useCurrentUser();
  const { t } = useTranslation();
  const [searchEmail, setSearchEmail] = useState("");
  const [expandedId, setExpandedId] = useState(null);
  const [rejectingId, setRejectingId] = useState(null);
  const [rejectNotes, setRejectNotes] = useState("");
  const queryClient = useQueryClient();

  // Check admin access
  if (!userLoading && user?.role !== "admin") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#0B1320] via-[#112133] to-[#0B1320] flex items-center justify-center">
        <Card className="max-w-md w-full bg-[#1A2B3A] border-[#A35C5C]/50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-red-500 mb-4">
              <AlertCircle className="w-5 h-5" />
              <span>{t("admin.accessRequired")}</span>
            </div>
            <p className="text-sm text-[#E0D8C8]/70">{t("admin.adminOnly")}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Fetch subscription support requests
  const { data: requests, isLoading: requestsLoading } = useQuery({
    queryKey: ["subscription-requests"],
    queryFn: async () => {
      const result = await base44.entities.SubscriptionSupportRequest.filter(
        { status: { $in: ["new", "paid_confirmed"] } },
        "-created_date",
        100
      );
      return Array.isArray(result) ? result : [];
    },
    staleTime: 5000,
    refetchInterval: 10000,
  });

  // Grant access mutation
  const grantMutation = useMutation({
    mutationFn: async ({ requestId, tier }) => {
      // Call admin function to grant access
      const response = await base44.functions.invoke("adminGrantSubscriptionAccess", {
        email: requests.find((r) => r.id === requestId)?.user_email,
        tier,
        status: "active",
        notes: "Manual grant from admin queue",
      });

      if (!response?.data?.ok) {
        throw new Error(response?.data?.message || "Failed to grant access");
      }

      // Update request status
      await base44.entities.SubscriptionSupportRequest.update(requestId, {
        status: "access_granted",
        granted_by: user.email,
        granted_at: new Date().toISOString(),
      });

      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["subscription-requests"] });
      toast.success(t("admin.requestGranted", "Access granted and request updated"));
    },
    onError: (err) => {
      toast.error(`Error: ${err.message}`);
    },
  });

  // Reject mutation
  const rejectMutation = useMutation({
    mutationFn: async ({ requestId, notes }) => {
      await base44.entities.SubscriptionSupportRequest.update(requestId, {
        status: "rejected",
        admin_notes: notes,
        granted_by: user.email,
        granted_at: new Date().toISOString(),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["subscription-requests"] });
      toast.success(t("admin.requestRejected", "Request rejected"));
      setRejectingId(null);
      setRejectNotes("");
    },
    onError: (err) => {
      toast.error(`Error: ${err.message}`);
    },
  });

  // Resolve mutation
  const resolveMutation = useMutation({
    mutationFn: async (requestId) => {
      await base44.entities.SubscriptionSupportRequest.update(requestId, {
        status: "resolved",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["subscription-requests"] });
      toast.success(t("admin.requestResolved", "Request marked as resolved"));
    },
    onError: (err) => {
      toast.error(`Error: ${err.message}`);
    },
  });

  const filteredRequests =
    requests?.filter((r) =>
      r.user_email?.toLowerCase().includes(searchEmail.toLowerCase())
    ) || [];

  if (requestsLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#0B1320] via-[#112133] to-[#0B1320] py-12">
        <div className="max-w-7xl mx-auto px-4 flex items-center justify-center gap-2">
          <Loader2 className="w-5 h-5 text-[#A35C5C] animate-spin" />
          <span className="text-[#E0D8C8]">{t("admin.loading")}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0B1320] via-[#112133] to-[#0B1320] py-12">
      <div className="max-w-7xl mx-auto px-4">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-[#E0D8C8] mb-2">{t("admin.subSupportQueue")}</h1>
          <p className="text-[#E0D8C8]/60">
            {filteredRequests.length} {t("admin.pendingRequestsSuffix", "pending request(s)")}
          </p>
        </div>

        {/* Search */}
        <Card className="mb-6 bg-[#1A2B3A] border-[#A35C5C]/50">
          <CardContent className="p-4">
            <div className="relative">
              <Search className="absolute left-3 top-3 w-4 h-4 text-[#E0D8C8]/40" />
              <Input
                placeholder={t("admin.searchByEmail")}
                value={searchEmail}
                onChange={(e) => setSearchEmail(e.target.value)}
                className="pl-10 bg-[#243548] border-[#A35C5C]/30 text-[#E0D8C8]"
              />
            </div>
          </CardContent>
        </Card>

        {/* Requests Table */}
        {filteredRequests.length === 0 ? (
          <Card className="bg-[#1A2B3A] border-[#A35C5C]/50">
            <CardContent className="pt-12 pb-12 text-center">
              <ZoomOut className="w-8 h-8 text-[#E0D8C8]/40 mx-auto mb-2" />
              <p className="text-[#E0D8C8]/70">
                {searchEmail ? t("admin.noMatchingRequests") : t("admin.noPendingRequests")}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="bg-[#1A2B3A] border border-[#A35C5C]/50 rounded-lg overflow-hidden">
            <Table>
              <TableHeader className="bg-[#243548]">
                <TableRow className="border-[#A35C5C]/20">
                  <TableHead className="text-[#E0D8C8]">Email</TableHead>
                  <TableHead className="text-[#E0D8C8]">Tier / Term</TableHead>
                  <TableHead className="text-[#E0D8C8]">Payment Ref</TableHead>
                  <TableHead className="text-[#E0D8C8]">Status</TableHead>
                  <TableHead className="text-[#E0D8C8] text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRequests.map((req) => (
                  <React.Fragment key={req.id}>
                    <TableRow className="border-[#A35C5C]/20 hover:bg-[#243548]/50 transition-colors">
                      <TableCell className="text-[#E0D8C8] font-medium">{req.user_email}</TableCell>
                      <TableCell className="text-[#E0D8C8]/80">
                        {req.requested_tier} / {req.requested_term}
                      </TableCell>
                      <TableCell className="text-[#E0D8C8]/60 text-sm">
                        {req.payment_reference || "—"}
                      </TableCell>
                      <TableCell>
                        <Badge className={`${STATUS_COLORS[req.status]} flex w-fit gap-1`}>
                          {STATUS_ICONS[req.status]}
                          {req.status.replace("_", " ")}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() =>
                            setExpandedId(expandedId === req.id ? null : req.id)
                          }
                          className="text-[#A35C5C] hover:bg-[#A35C5C]/20"
                        >
                          {expandedId === req.id ? t("admin.hide", "Hide") : t("admin.show", "Show")}
                        </Button>
                      </TableCell>
                    </TableRow>

                    {/* Expanded Details */}
                    {expandedId === req.id && (
                      <TableRow className="bg-[#243548] border-[#A35C5C]/20">
                        <TableCell colSpan="5" className="p-4">
                          <div className="space-y-4">
                            {/* User Message */}
                            {req.user_message && (
                              <div>
                                <p className="text-xs text-[#E0D8C8]/50 uppercase tracking-wide mb-1">
                                  User Message
                                </p>
                                <p className="text-[#E0D8C8] bg-[#1A2B3A] p-2 rounded text-sm">
                                  {req.user_message}
                                </p>
                              </div>
                            )}

                            {/* Admin Notes (if rejected) */}
                            {req.admin_notes && (
                              <div>
                                <p className="text-xs text-[#E0D8C8]/50 uppercase tracking-wide mb-1">
                                  Admin Notes
                                </p>
                                <p className="text-[#E0D8C8] bg-[#1A2B3A] p-2 rounded text-sm">
                                  {req.admin_notes}
                                </p>
                              </div>
                            )}

                            {/* Metadata */}
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm">
                              <div>
                                <p className="text-[#E0D8C8]/50 text-xs">{t("admin.created")}</p>
                                <p className="text-[#E0D8C8]">
                                  {new Date(req.created_date).toLocaleDateString()}
                                </p>
                              </div>
                              {req.granted_at && (
                                <div>
                                  <p className="text-[#E0D8C8]/50 text-xs">{t("admin.grantedBy")}</p>
                                  <p className="text-[#E0D8C8] truncate">{req.granted_by}</p>
                                </div>
                              )}
                            </div>

                            {/* Action Buttons */}
                            {req.status === "new" || req.status === "paid_confirmed" ? (
                              <div className="flex flex-col sm:flex-row gap-2 pt-2 border-t border-[#A35C5C]/20">
                                <Button
                                  size="sm"
                                  onClick={() =>
                                    grantMutation.mutate({
                                      requestId: req.id,
                                      tier: req.requested_tier,
                                    })
                                  }
                                  disabled={grantMutation.isPending}
                                  className="bg-green-700 hover:bg-green-800 text-white flex-1"
                                >
                                  {grantMutation.isPending ? (
                                    <>
                                      <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                                      Granting...
                                    </>
                                  ) : (
                                    `Grant ${req.requested_tier.toUpperCase()}`
                                  )}
                                </Button>

                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => setRejectingId(req.id)}
                                  className="border-[#A35C5C]/30 text-[#E0D8C8] hover:bg-[#A35C5C]/20 flex-1"
                                >
                                  Reject
                                </Button>
                              </div>
                            ) : (
                              <div className="flex gap-2 pt-2 border-t border-[#A35C5C]/20">
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() =>
                                    resolveMutation.mutate(req.id)
                                  }
                                  disabled={resolveMutation.isPending}
                                  className="text-[#A35C5C] hover:bg-[#A35C5C]/20 flex-1"
                                >
                                  {resolveMutation.isPending ? t("admin.resolving", "Resolving...") : t("admin.markResolved", "Mark Resolved")}
                                </Button>
                              </div>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    )}

                    {/* Reject Dialog */}
                    {rejectingId === req.id && (
                      <TableRow className="bg-red-950/30 border-red-500/30">
                        <TableCell colSpan="5" className="p-4">
                          <div className="space-y-3">
                            <Textarea
                              placeholder={t("admin.rejectionReasonPlaceholder", "Optional rejection reason...")}
                              value={rejectNotes}
                              onChange={(e) => setRejectNotes(e.target.value)}
                              className="bg-[#243548] border-red-500/30 text-[#E0D8C8] min-h-20"
                            />
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                onClick={() =>
                                  rejectMutation.mutate({
                                    requestId: req.id,
                                    notes: rejectNotes,
                                  })
                                }
                                disabled={rejectMutation.isPending}
                                className="bg-red-700 hover:bg-red-800 flex-1"
                              >
                                Confirm Rejection
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => {
                                  setRejectingId(null);
                                  setRejectNotes("");
                                }}
                                className="text-[#E0D8C8] flex-1"
                              >
                                Cancel
                              </Button>
                            </div>
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </React.Fragment>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </div>
  );
}