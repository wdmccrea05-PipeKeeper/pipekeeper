import React, { useEffect, useState } from "react";
import { useCurrentUser } from "@/components/hooks/useCurrentUser";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import ShareBuilder from "@/components/share/ShareBuilder";
import CollectionShareView from "@/components/share/CollectionShareView";
import GiftPanel from "@/components/share/GiftPanel";
import {
  listMyShares,
  revokeShare,
  copyShareLink,
  shareStatus,
  fetchSharePayload,
} from "@/lib/share/shareClient";
import { Copy, Eye, Link2Off, Plus } from "lucide-react";

function ShareRow({ share, onPreview, onRevoked }) {
  const [copied, setCopied] = useState(false);
  const status = shareStatus(share);

  return (
    <div
      className="rounded-xl p-3 flex flex-wrap items-center gap-3 justify-between"
      style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(180,140,75,0.2)" }}
    >
      <div className="min-w-0">
        <p className="font-semibold text-sm break-words" style={{ color: "#F5F1E7" }}>
          {share.title || share.module_type}
        </p>
        <p className="text-[11px]" style={{ color: "rgba(224,216,200,0.6)" }}>
          {share.share_kind || "record"} · {share.view_count || 0} views
          {share.expires_at ? ` · expires ${new Date(share.expires_at).toLocaleDateString()}` : " · no expiry"}
        </p>
      </div>
      <div className="flex items-center gap-2">
        <Badge variant={status.key === "live" ? "default" : "outline"}>{status.label}</Badge>
        {status.key === "live" && (
          <>
            <Button size="sm" variant="ghost" onClick={() => onPreview(share)}>
              <Eye className="w-4 h-4 mr-1" /> Preview
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={async () => {
                const ok = await copyShareLink(share.module_type, share.share_token);
                setCopied(ok);
                setTimeout(() => setCopied(false), 2000);
              }}
            >
              <Copy className="w-4 h-4 mr-1" /> {copied ? "Copied" : "Copy link"}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={async () => {
                await revokeShare(share.id);
                onRevoked();
              }}
            >
              <Link2Off className="w-4 h-4 mr-1" /> Revoke
            </Button>
          </>
        )}
      </div>
    </div>
  );
}

export default function ShareCenter() {
  const { user } = useCurrentUser();
  const [shares, setShares] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [preview, setPreview] = useState(null);
  const [previewError, setPreviewError] = useState("");

  const load = async () => {
    setLoading(true);
    try {
      setShares(await listMyShares());
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const openPreview = async (share) => {
    setPreviewError("");
    try {
      const payload = await fetchSharePayload(share.share_token, { preview: true });
      if (payload?.items) setPreview(payload);
      else setPreviewError("This link can no longer be opened.");
    } catch {
      setPreviewError("This link can no longer be opened.");
    }
  };

  const openCreatedPreview = async (share) => {
    setCreating(false);
    await load();
    if (share?.share_token) await openPreview(share);
  };

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-semibold" style={{ color: "#F5F1E7" }}>Share & Gift</h1>
        <p className="text-sm mt-1 max-w-2xl" style={{ color: "rgba(224,216,200,0.7)" }}>
          Share a read-only view of what you own. You choose the items and the fields, the link expires when you say, and you can revoke it at any time.
        </p>
      </header>

      <Tabs defaultValue="sharing">
        <TabsList>
          <TabsTrigger value="sharing">Sharing</TabsTrigger>
          <TabsTrigger value="gifts">Gift membership</TabsTrigger>
        </TabsList>

        <TabsContent value="sharing" className="space-y-5 pt-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-lg font-semibold" style={{ color: "#F5F1E7" }}>My share links</h2>
            <Button onClick={() => setCreating((v) => !v)}>
              <Plus className="w-4 h-4 mr-1" /> {creating ? "Close" : "New share"}
            </Button>
          </div>

          {creating && <ShareBuilder onCreated={openCreatedPreview} />}

          {loading ? (
            <p className="text-sm" style={{ color: "rgba(224,216,200,0.6)" }}>Loading your links…</p>
          ) : shares.length === 0 ? (
            <div
              className="rounded-xl p-6 text-sm"
              style={{ background: "rgba(255,255,255,0.03)", border: "1px dashed rgba(180,140,75,0.3)", color: "rgba(224,216,200,0.7)" }}
            >
              You have not shared anything yet. Nothing in your collection is visible to anyone until you create a link.
            </div>
          ) : (
            <div className="space-y-2">
              {shares.map((share) => (
                <ShareRow key={share.id} share={share} onPreview={openPreview} onRevoked={load} />
              ))}
            </div>
          )}

          {previewError && <p className="text-sm" style={{ color: "#E08A8A" }}>{previewError}</p>}

          {preview && (
            <section className="rounded-2xl p-4" style={{ background: "#1a1310", border: "1px solid rgba(180,140,75,0.3)" }}>
              <p className="text-[11px] uppercase tracking-wide mb-3" style={{ color: "rgba(224,216,200,0.5)" }}>
                Exactly what a recipient sees
              </p>
              <CollectionShareView payload={preview} showPrint={false} />
            </section>
          )}
        </TabsContent>

        <TabsContent value="gifts" className="pt-4">
          <GiftPanel user={user} />
        </TabsContent>
      </Tabs>
    </div>
  );
}