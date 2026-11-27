import React, { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { EMAIL_LANGUAGE_LABELS } from "./emailLanguages";

/**
 * Explicit administrator approval. Nothing is queued until the phrase is typed,
 * and the recipient count shown is the count that will be mailed.
 */
export default function SendApprovalDialog({ open, onOpenChange, campaign, audience, busy, onConfirm }) {
  const [phrase, setPhrase] = useState("");

  useEffect(() => {
    if (!open) setPhrase("");
  }, [open]);

  const eligible = audience?.totals?.eligible ?? 0;
  const languages = (campaign?.languages || []).map((code) => EMAIL_LANGUAGE_LABELS[code] || code);
  const ready = phrase.trim().toUpperCase() === "SEND" && eligible > 0 && !!campaign?.mailing_address;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Approve and send</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 text-sm" style={{ color: "#E0D8C8" }}>
          <p>
            This will queue <strong style={{ color: "#F5F1E7" }}>{eligible}</strong> eligible collectors and deliver
            the campaign email in batches of 40.
          </p>
          <ul className="text-xs space-y-1" style={{ color: "rgba(224,216,200,0.7)" }}>
            <li>Languages: {languages.length ? languages.join(", ") : "each collector's own language"}</li>
            <li>Paid subscribers, grandfathered accounts and anyone who already redeemed are excluded.</li>
            <li>Unsubscribed and suppressed addresses are never mailed.</li>
            <li>No collector can receive this email twice.</li>
          </ul>
          {!campaign?.mailing_address && (
            <p className="text-xs" style={{ color: "#F0B9A8" }}>
              Add the business mailing address before sending.
            </p>
          )}
          <label className="text-xs space-y-1 block">
            <span style={{ color: "rgba(224,216,200,0.7)" }}>Type SEND to confirm</span>
            <Input value={phrase} onChange={(e) => setPhrase(e.target.value)} placeholder="SEND" />
          </label>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>Cancel</Button>
            <Button onClick={onConfirm} disabled={!ready || busy} style={{ background: "#D4A574", color: "#241811" }}>
              {busy ? "Sending…" : "Approve and send"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}