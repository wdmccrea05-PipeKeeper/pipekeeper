import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertCircle, CheckCircle2 } from "lucide-react";
import { useCurrentUser } from "@/components/hooks/useCurrentUser";

export default function AdminSubscriptionTools() {
  const { user, isLoading } = useCurrentUser();
  const [email, setEmail] = useState("");
  const [tier, setTier] = useState("premium");
  const [status, setStatus] = useState("active");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null);
  const [updatedUser, setUpdatedUser] = useState<any>(null);

  // Check admin access
  if (!isLoading && user?.role !== "admin") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#0B1320] via-[#112133] to-[#0B1320] flex items-center justify-center">
        <Card className="max-w-md w-full bg-[#1A2B3A] border-[#A35C5C]/50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-red-500 mb-4">
              <AlertCircle className="w-5 h-5" />
              <span>Admin access required</span>
            </div>
            <p className="text-sm text-[#E0D8C8]/70">Only administrators can access this tool.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const handleGrant = async () => {
    if (!email.trim()) {
      setResult({ ok: false, message: "Please enter an email address" });
      return;
    }

    try {
      setLoading(true);
      setResult(null);
      setUpdatedUser(null);

      // Call backend function to grant access
      const response = await base44.functions.invoke("adminGrantSubscriptionAccess", {
        email: email.trim(),
        tier,
        status,
        notes: notes.trim(),
      });

      if (response?.data?.ok) {
        setResult({ ok: true, message: "Access granted successfully!" });
        setUpdatedUser(response.data.user);
        setEmail("");
        setTier("premium");
        setStatus("active");
        setNotes("");
      } else {
        setResult({
          ok: false,
          message: response?.data?.message || "Failed to grant access",
        });
      }
    } catch (err) {
      setResult({ ok: false, message: `Error: ${(err as any)?.message || err}` });
    } finally {
      setLoading(false);
    }
  };

  const handleRevoke = async () => {
    if (!email.trim()) {
      setResult({ ok: false, message: "Please enter an email address" });
      return;
    }

    try {
      setLoading(true);
      setResult(null);
      setUpdatedUser(null);

      const response = await base44.functions.invoke("adminRevokeSubscriptionAccess", {
        email: email.trim(),
        notes: notes.trim(),
      });

      if (response?.data?.ok) {
        setResult({ ok: true, message: "Access revoked successfully!" });
        setUpdatedUser(response.data.user);
        setEmail("");
        setNotes("");
      } else {
        setResult({
          ok: false,
          message: response?.data?.message || "Failed to revoke access",
        });
      }
    } catch (err) {
      setResult({ ok: false, message: `Error: ${(err as any)?.message || err}` });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0B1320] via-[#112133] to-[#0B1320] py-12">
      <div className="max-w-4xl mx-auto px-4">
        <h1 className="text-4xl font-bold text-[#E0D8C8] mb-8">Subscription Admin Tools</h1>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Grant/Revoke Form */}
          <Card className="bg-[#1A2B3A] border-[#A35C5C]/50">
            <CardHeader>
              <CardTitle className="text-[#E0D8C8]">Manage User Subscription</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-[#E0D8C8] mb-2">Email Address</label>
                <Input
                  placeholder="user@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="bg-[#243548] border-[#A35C5C]/30 text-[#E0D8C8]"
                  disabled={loading}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[#E0D8C8] mb-2">Tier</label>
                <Select value={tier} onValueChange={setTier} disabled={loading}>
                  <SelectTrigger className="bg-[#243548] border-[#A35C5C]/30 text-[#E0D8C8]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="premium">Premium</SelectItem>
                    <SelectItem value="pro">Pro</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="block text-sm font-medium text-[#E0D8C8] mb-2">Status</label>
                <Select value={status} onValueChange={setStatus} disabled={loading}>
                  <SelectTrigger className="bg-[#243548] border-[#A35C5C]/30 text-[#E0D8C8]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="block text-sm font-medium text-[#E0D8C8] mb-2">Notes (optional)</label>
                <Textarea
                  placeholder="Admin notes..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="bg-[#243548] border-[#A35C5C]/30 text-[#E0D8C8] min-h-20"
                  disabled={loading}
                />
              </div>

              {result && (
                <div
                  className={`p-3 rounded-lg flex items-start gap-2 ${
                    result.ok ? "bg-green-900/20 text-green-200" : "bg-red-900/20 text-red-200"
                  }`}
                >
                  {result.ok ? (
                    <CheckCircle2 className="w-5 h-5 flex-shrink-0 mt-0.5" />
                  ) : (
                    <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                  )}
                  <span className="text-sm">{result.message}</span>
                </div>
              )}

              <div className="flex gap-2">
                <Button
                  onClick={handleGrant}
                  disabled={loading || !email.trim()}
                  className="flex-1 bg-green-700 hover:bg-green-800"
                >
                  {loading ? "Processing..." : "Grant Access"}
                </Button>
                <Button
                  onClick={handleRevoke}
                  disabled={loading || !email.trim()}
                  variant="destructive"
                  className="flex-1"
                >
                  Revoke Access
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Updated User Summary */}
          {updatedUser && (
            <Card className="bg-[#1A2B3A] border-[#A35C5C]/50">
              <CardHeader>
                <CardTitle className="text-[#E0D8C8] flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-green-500" />
                  Updated User
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div>
                  <p className="text-[#E0D8C8]/50">Email</p>
                  <p className="text-[#E0D8C8] font-medium">{updatedUser.email}</p>
                </div>
                <div>
                  <p className="text-[#E0D8C8]/50">Name</p>
                  <p className="text-[#E0D8C8] font-medium">{updatedUser.full_name}</p>
                </div>
                <div>
                  <p className="text-[#E0D8C8]/50">Subscription Source</p>
                  <p className="text-[#E0D8C8] font-medium">{updatedUser.subscriptionSource || "None"}</p>
                </div>
                <div>
                  <p className="text-[#E0D8C8]/50">Subscription Status</p>
                  <p className="text-[#E0D8C8] font-medium">{updatedUser.subscriptionStatus || "Inactive"}</p>
                </div>
                <div>
                  <p className="text-[#E0D8C8]/50">Subscription Tier</p>
                  <p className="text-[#E0D8C8] font-medium">{updatedUser.subscriptionTier || "None"}</p>
                </div>
                <div>
                  <p className="text-[#E0D8C8]/50">Updated At</p>
                  <p className="text-[#E0D8C8] font-medium">
                    {updatedUser.subscriptionUpdatedAt
                      ? new Date(updatedUser.subscriptionUpdatedAt).toLocaleString()
                      : "—"}
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}