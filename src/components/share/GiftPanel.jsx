import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const MODULES = [
  { key: "pipekeeper", label: "PipeKeeper" },
  { key: "whiskeykeeper", label: "WhiskeyKeeper" },
  { key: "cigarkeeper", label: "CigarKeeper" },
  { key: "winekeeper", label: "WineKeeper" },
];

const ERROR_COPY = {
  invalid_code: "That code was not recognised.",
  already_redeemed: "That code has already been redeemed.",
  expired: "That code has expired.",
  revoked: "That code was revoked.",
  invalid_module: "Choose a module this gift includes.",
};

export default function GiftPanel({ user }) {
  const [code, setCode] = useState("");
  const [module, setModule] = useState("pipekeeper");
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const [months, setMonths] = useState("12");
  const [issueModules, setIssueModules] = useState([]);
  const [recipientHint, setRecipientHint] = useState("");
  const [issued, setIssued] = useState(null);
  const [codes, setCodes] = useState([]);

  const isAdmin = user?.role === "admin";

  const loadCodes = async () => {
    if (!isAdmin) return;
    try {
      const response = await base44.functions.invoke("giftCodes", { action: "list" });
      setCodes(response?.data?.codes || []);
    } catch {
      setCodes([]);
    }
  };

  useEffect(() => { loadCodes(); }, [isAdmin]);

  const redeem = async () => {
    setError("");
    setResult(null);
    if (!code.trim()) {
      setError("Enter a gift code.");
      return;
    }
    setBusy(true);
    try {
      const response = await base44.functions.invoke("giftCodes", { action: "redeem", code, module });
      if (response?.data?.ok) {
        setResult(response.data);
        setCode("");
      } else {
        setError(ERROR_COPY[response?.data?.error] || "The code could not be redeemed.");
      }
    } catch (e) {
      const message = e?.response?.data?.error || e?.data?.error;
      setError(ERROR_COPY[message] || "The code could not be redeemed.");
    } finally {
      setBusy(false);
    }
  };

  const issue = async () => {
    setError("");
    setIssued(null);
    setBusy(true);
    try {
      const response = await base44.functions.invoke("giftCodes", {
        action: "issue",
        months: Number(months),
        modules: issueModules,
        recipient_hint: recipientHint,
      });
      if (response?.data?.ok) {
        setIssued(response.data);
        setRecipientHint("");
        loadCodes();
      } else {
        setError("The gift could not be issued.");
      }
    } catch {
      setError("The gift could not be issued.");
    } finally {
      setBusy(false);
    }
  };

  const revoke = async (targetCode) => {
    try {
      await base44.functions.invoke("giftCodes", { action: "revoke", code: targetCode, reason: "Revoked by administrator" });
      loadCodes();
    } catch {
      setError("The code could not be revoked.");
    }
  };

  return (
    <div className="space-y-6">
      <section className="rounded-2xl p-4 space-y-4" style={{ background: "rgba(42,31,24,0.85)", border: "1px solid rgba(180,140,75,0.25)" }}>
        <div>
          <h3 className="text-lg font-semibold" style={{ color: "#F5F1E7" }}>Redeem a membership gift</h3>
          <p className="text-sm mt-1" style={{ color: "rgba(224,216,200,0.7)" }}>
            A gift adds membership time to your own account. It is software access only and is never a tobacco or alcohol product.
          </p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <Label className="ck-field-label">Gift code</Label>
            <Input value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder="CK-XXXX-XXXX" />
          </div>
          <div>
            <Label className="ck-field-label">Module</Label>
            <Select value={module} onValueChange={setModule}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {MODULES.map((m) => <SelectItem key={m.key} value={m.key}>{m.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>
        {error && <p className="text-sm" style={{ color: "#E08A8A" }}>{error}</p>}
        {result && (
          <p className="text-sm" style={{ color: "#9AD6B4" }}>
            Added {result.months} month{result.months === 1 ? "" : "s"} of {result.module} access, through {new Date(result.end_at).toLocaleDateString()}.
          </p>
        )}
        <Button onClick={redeem} disabled={busy}>{busy ? "Checking…" : "Redeem gift"}</Button>
      </section>

      {isAdmin && (
        <section className="rounded-2xl p-4 space-y-4" style={{ background: "rgba(42,31,24,0.85)", border: "1px solid rgba(180,140,75,0.25)" }}>
          <div>
            <h3 className="text-lg font-semibold" style={{ color: "#F5F1E7" }}>Issue a gift code</h3>
            <p className="text-sm mt-1" style={{ color: "rgba(224,216,200,0.7)" }}>
              Issuing does not charge anyone. Codes expire, can be revoked before redemption, and can be redeemed once.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <Label className="ck-field-label">Months</Label>
              <Input type="number" min={1} max={24} value={months} onChange={(e) => setMonths(e.target.value)} />
            </div>
            <div className="sm:col-span-2">
              <Label className="ck-field-label">Recipient note (optional)</Label>
              <Input value={recipientHint} onChange={(e) => setRecipientHint(e.target.value)} placeholder="Holiday gift" />
            </div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {MODULES.map((m) => (
              <label key={m.key} className="flex items-center gap-2 text-xs" style={{ color: "rgba(224,216,200,0.85)" }}>
                <Checkbox
                  checked={issueModules.includes(m.key)}
                  onCheckedChange={() => setIssueModules((current) =>
                    current.includes(m.key) ? current.filter((k) => k !== m.key) : [...current, m.key]
                  )}
                />
                <span>{m.label}</span>
              </label>
            ))}
          </div>
          <Button variant="outline" onClick={issue} disabled={busy}>Issue code</Button>
          {issued?.code && (
            <p className="text-sm font-mono" style={{ color: "#D4A574" }}>
              {issued.code} · expires {new Date(issued.expires_at).toLocaleDateString()}
            </p>
          )}

          <div className="space-y-2">
            {codes.map((gift) => (
              <div key={gift.id} className="flex flex-wrap items-center justify-between gap-2 text-sm border-t pt-2" style={{ borderColor: "rgba(180,140,75,0.15)", color: "rgba(224,216,200,0.85)" }}>
                <span className="font-mono">{gift.code}</span>
                <span>{gift.months} mo</span>
                <Badge variant="outline">{gift.status}</Badge>
                <span className="text-xs">{gift.redeemed_by_email || gift.recipient_hint || "—"}</span>
                {gift.status === "issued" && (
                  <Button size="sm" variant="ghost" onClick={() => revoke(gift.code)}>Revoke</Button>
                )}
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}