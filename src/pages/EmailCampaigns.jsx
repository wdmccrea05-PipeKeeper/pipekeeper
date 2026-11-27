import React, { useCallback, useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { useCurrentUser } from "@/components/hooks/useCurrentUser";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import CampaignComposer from "@/components/emailcampaign/CampaignComposer";
import AudiencePanel from "@/components/emailcampaign/AudiencePanel";
import EmailPreview from "@/components/emailcampaign/EmailPreview";
import CampaignHistory from "@/components/emailcampaign/CampaignHistory";
import CampaignAnalytics from "@/components/emailcampaign/CampaignAnalytics";
import SuppressionManager from "@/components/emailcampaign/SuppressionManager";
import SendApprovalDialog from "@/components/emailcampaign/SendApprovalDialog";
import { CAMPAIGN_STATUS_STYLES } from "@/components/emailcampaign/emailLanguages";

const GOLD = "#D4A574";

const TABS = [
  { id: "compose", label: "Campaign" },
  { id: "audience", label: "Recipients" },
  { id: "preview", label: "Preview" },
  { id: "delivery", label: "Delivery" },
  { id: "analytics", label: "Analytics" },
  { id: "preferences", label: "Preferences" },
];

/** Administrator dashboard for reusable promotional email campaigns. */
export default function EmailCampaigns() {
  const { isAdmin, isLoading: userLoading } = useCurrentUser();
  const [campaigns, setCampaigns] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [audience, setAudience] = useState(null);
  const [report, setReport] = useState(null);
  const [preview, setPreview] = useState(null);
  const [suppressions, setSuppressions] = useState([]);
  const [language, setLanguage] = useState("en");
  const [tab, setTab] = useState("compose");
  const [busy, setBusy] = useState("");
  const [message, setMessage] = useState(null);
  const [approvalOpen, setApprovalOpen] = useState(false);
  const [progress, setProgress] = useState(null);

  const selected = campaigns.find((item) => item.id === selectedId) || null;

  const loadCampaigns = useCallback(async () => {
    const rows = await base44.entities.EmailCampaign.list("-created_date", 50);
    const list = Array.isArray(rows) ? rows : rows?.items || [];
    setCampaigns(list);
    setSelectedId((current) => current || list[0]?.id || null);
  }, []);

  const loadAudience = useCallback(async (languages) => {
    try {
      const res = await base44.functions.invoke("appreciationEmailAudience", {
        languages: languages || [],
        sampleSize: 20,
      });
      setAudience(res?.data || null);
    } catch (error) {
      setMessage({ type: "error", text: error?.message || "Could not calculate the audience." });
    }
  }, []);

  const loadPreview = useCallback(async (code, address, campaignId) => {
    try {
      const res = await base44.functions.invoke("adminEmailCampaigns", {
        action: "preview",
        language: code,
        mailing_address: address || "",
        campaign_id: campaignId || null,
      });
      setPreview(res?.data || null);
    } catch (error) {
      setMessage({ type: "error", text: error?.message || "Could not build the preview." });
    }
  }, []);

  const loadReport = useCallback(async () => {
    try {
      const res = await base44.functions.invoke("appreciationEmailReport", {});
      setReport(res?.data || null);
    } catch (error) {
      setMessage({ type: "error", text: error?.message || "Could not load analytics." });
    }
  }, []);

  const loadSuppressions = useCallback(async () => {
    try {
      const res = await base44.functions.invoke("adminEmailCampaigns", { action: "suppressions" });
      setSuppressions(res?.data?.suppressions || []);
    } catch {
      setSuppressions([]);
    }
  }, []);

  useEffect(() => {
    if (userLoading || !isAdmin) return;
    loadCampaigns();
    loadAudience([]);
    loadPreview("en", "", null);
    loadReport();
    loadSuppressions();
  }, [userLoading, isAdmin, loadCampaigns, loadAudience, loadPreview, loadReport, loadSuppressions]);

  useEffect(() => {
    if (!selected) return;
    loadAudience(selected.languages || []);
    loadPreview(language, selected.mailing_address, selected.id);
  }, [selected?.id, language]); // eslint-disable-line react-hooks/exhaustive-deps

  const act = async (action, payload = {}) => {
    setBusy(action);
    setMessage(null);
    try {
      const res = await base44.functions.invoke("adminEmailCampaigns", { action, ...payload });
      return res?.data || null;
    } catch (error) {
      const data = error?.response?.data || {};
      setMessage({ type: "error", text: data.error || error?.message || "Request failed." });
      return null;
    } finally {
      setBusy("");
    }
  };

  const createCampaign = async (values) => {
    const data = await act("create", values);
    if (data?.campaign?.id) {
      await loadCampaigns();
      setSelectedId(data.campaign.id);
      setMessage({ type: "ok", text: "Campaign created as a draft." });
    }
  };

  const updateCampaign = async (patch) => {
    const data = await act("update", { campaign_id: selectedId, ...patch });
    if (data?.ok) {
      await loadCampaigns();
      await loadPreview(language, patch.mailing_address ?? selected?.mailing_address, selectedId);
      setMessage({ type: "ok", text: "Campaign saved." });
    }
  };

  const sendTest = async () => {
    const data = await act("test", { campaign_id: selectedId, language });
    if (data) setMessage({ type: data.ok ? "ok" : "error", text: `${data.message} (${data.to})` });
  };

  const approveAndSend = async () => {
    if (!selected) return;
    setBusy("send");
    setMessage(null);
    setProgress(null);
    try {
      const approved = await base44.functions.invoke("adminEmailCampaigns", {
        action: "approve",
        campaign_id: selected.id,
      });
      if (!approved?.data?.ok) {
        setMessage({ type: "error", text: approved?.data?.error || "Approval failed." });
        return;
      }

      let remaining = 1;
      let guard = 0;
      while (remaining > 0 && guard < 80) {
        const res = await base44.functions.invoke("adminEmailCampaigns", {
          action: "send",
          campaign_id: selected.id,
          limit: 40,
        });
        const data = res?.data || {};
        if (data.ok === false) {
          setMessage({ type: "error", text: data.error || "Delivery stopped." });
          break;
        }
        remaining = Number(data.remaining || 0);
        setProgress({ sent: data.counts?.sent ?? 0, remaining, failed: data.counts?.failed ?? 0 });
        guard += 1;
      }
      setApprovalOpen(false);
      await loadCampaigns();
      await loadReport();
      setMessage({ type: "ok", text: "Campaign delivery finished." });
    } catch (error) {
      const data = error?.response?.data || {};
      setMessage({ type: "error", text: data.error || error?.message || "Delivery failed." });
    } finally {
      setBusy("");
    }
  };

  const scheduleCampaign = async () => {
    if (!selected?.scheduled_at) {
      setMessage({ type: "error", text: "Set a schedule time in the campaign settings first." });
      return;
    }
    const data = await act("schedule", { campaign_id: selected.id, scheduled_at: selected.scheduled_at });
    if (data?.ok) {
      await loadCampaigns();
      setMessage({ type: "ok", text: "Campaign scheduled." });
    }
  };

  const cancelCampaign = async () => {
    const data = await act("cancel", { campaign_id: selectedId });
    if (data?.ok) {
      await loadCampaigns();
      setMessage({ type: "ok", text: "Campaign cancelled." });
    }
  };

  if (userLoading) return <div className="p-8 text-sm" style={{ color: "#E0D8C8" }}>…</div>;
  if (!isAdmin) return <div className="p-8 text-sm" style={{ color: "#E0D8C8" }}>Administrator access required.</div>;

  const status = CAMPAIGN_STATUS_STYLES[selected?.status] || CAMPAIGN_STATUS_STYLES.draft;

  return (
    <div className="max-w-6xl mx-auto p-4 sm:p-6 space-y-6" style={{ color: "#E0D8C8" }}>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: "#F5F1E7" }}>Email campaigns</h1>
          <p className="text-xs mt-1" style={{ color: "rgba(224,216,200,0.5)" }}>
            Collector appreciation promotional email — prepared, previewed and approved before anything is sent.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => { loadCampaigns(); loadAudience(selected?.languages || []); loadReport(); }}>
            Refresh
          </Button>
          <Button
            onClick={() => setApprovalOpen(true)}
            disabled={!selected || busy === "send" || ["sent", "cancelled"].includes(selected?.status)}
            style={{ background: GOLD, color: "#241811" }}
          >
            Approve &amp; send
          </Button>
        </div>
      </div>

      {message && (
        <p
          className="text-xs rounded-lg p-3"
          style={{
            background: message.type === "error" ? "rgba(224,155,155,0.12)" : "rgba(123,194,154,0.12)",
            color: message.type === "error" ? "#F0B9A8" : "#9FD6B5",
          }}
        >
          {message.text}
        </p>
      )}

      {progress && (
        <p className="text-xs" style={{ color: "rgba(224,216,200,0.7)" }}>
          Delivered {progress.sent} · remaining {progress.remaining} · failed {progress.failed}
        </p>
      )}

      <div className="flex flex-wrap gap-1.5">
        {TABS.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setTab(item.id)}
            className="px-3 py-1.5 rounded-full text-xs"
            style={{
              background: tab === item.id ? "rgba(212,165,116,0.18)" : "rgba(255,255,255,0.04)",
              border: `1px solid ${tab === item.id ? GOLD : "rgba(180,140,75,0.2)"}`,
              color: tab === item.id ? GOLD : "rgba(224,216,200,0.75)",
            }}
          >
            {item.label}
          </button>
        ))}
      </div>

      {tab === "compose" && (
        <Card style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(180,140,75,0.18)" }}>
          <CardHeader className="flex flex-row items-center justify-between gap-2">
            <CardTitle className="text-base" style={{ color: "#F5F1E7" }}>
              {selected ? selected.name : "New campaign"}
            </CardTitle>
            {selected && (
              <span className="text-[11px]" style={{ color: status.color }}>{status.label}</span>
            )}
          </CardHeader>
          <CardContent className="space-y-4">
            <CampaignComposer
              campaign={selected}
              saving={busy === "create" || busy === "update"}
              onCreate={createCampaign}
              onUpdate={updateCampaign}
            />
            {selected && (
              <div className="flex flex-wrap gap-2 pt-2" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
                <Button variant="outline" onClick={sendTest} disabled={busy === "test"}>
                  {busy === "test" ? "Sending test…" : "Send test email to me"}
                </Button>
                <Button variant="outline" onClick={scheduleCampaign} disabled={busy === "schedule" || !selected.approved_by}>
                  Schedule delivery
                </Button>
                <Button variant="outline" onClick={cancelCampaign} disabled={busy === "cancel" || ["sent", "cancelled"].includes(selected.status)}>
                  Cancel campaign
                </Button>
              </div>
            )}
            {selected && !selected.approved_by && (
              <p className="text-[11px]" style={{ color: "rgba(224,216,200,0.5)" }}>
                Delivery stays blocked until an administrator approves the campaign.
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {tab === "audience" && (
        <Card style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(180,140,75,0.18)" }}>
          <CardHeader><CardTitle className="text-base" style={{ color: "#F5F1E7" }}>Eligible recipients</CardTitle></CardHeader>
          <CardContent>
            <AudiencePanel
              audience={audience}
              loading={false}
              onRefresh={() => loadAudience(selected?.languages || [])}
            />
          </CardContent>
        </Card>
      )}

      {tab === "preview" && (
        <Card style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(180,140,75,0.18)" }}>
          <CardHeader><CardTitle className="text-base" style={{ color: "#F5F1E7" }}>Email preview</CardTitle></CardHeader>
          <CardContent>
            <EmailPreview
              preview={preview}
              language={language}
              onLanguageChange={setLanguage}
              loading={false}
            />
          </CardContent>
        </Card>
      )}

      {tab === "delivery" && (
        <Card style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(180,140,75,0.18)" }}>
          <CardHeader><CardTitle className="text-base" style={{ color: "#F5F1E7" }}>Campaign history</CardTitle></CardHeader>
          <CardContent>
            <CampaignHistory campaigns={campaigns} selectedId={selectedId} onSelect={setSelectedId} />
          </CardContent>
        </Card>
      )}

      {tab === "analytics" && (
        <Card style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(180,140,75,0.18)" }}>
          <CardHeader><CardTitle className="text-base" style={{ color: "#F5F1E7" }}>Campaign performance</CardTitle></CardHeader>
          <CardContent>
            <CampaignAnalytics report={report} loading={false} onRefresh={loadReport} />
          </CardContent>
        </Card>
      )}

      {tab === "preferences" && (
        <Card style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(180,140,75,0.18)" }}>
          <CardHeader><CardTitle className="text-base" style={{ color: "#F5F1E7" }}>Unsubscribe &amp; suppression</CardTitle></CardHeader>
          <CardContent>
            <SuppressionManager
              suppressions={suppressions}
              busy={busy === "suppression_add" || busy === "suppression_remove"}
              onAdd={async ({ email, reason }) => {
                await act("suppression_add", { email, reason });
                await loadSuppressions();
                await loadAudience(selected?.languages || []);
              }}
              onRemove={async (id) => {
                await act("suppression_remove", { id });
                await loadSuppressions();
                await loadAudience(selected?.languages || []);
              }}
            />
          </CardContent>
        </Card>
      )}

      <SendApprovalDialog
        open={approvalOpen}
        onOpenChange={setApprovalOpen}
        campaign={selected}
        audience={audience}
        busy={busy === "send"}
        onConfirm={approveAndSend}
      />
    </div>
  );
}