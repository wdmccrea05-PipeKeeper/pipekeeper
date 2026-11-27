import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

/** Persistent marketing preferences: who must never receive promotional email. */
export default function SuppressionManager({ suppressions, busy, onAdd, onRemove }) {
  const [email, setEmail] = useState("");
  const [reason, setReason] = useState("manual");

  const submit = () => {
    if (!email.trim()) return;
    onAdd({ email: email.trim(), reason });
    setEmail("");
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-2 sm:items-end">
        <label className="text-xs space-y-1 block flex-1">
          <span style={{ color: "rgba(224,216,200,0.7)" }}>Suppress an address</span>
          <Input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="collector@example.com" />
        </label>
        <label className="text-xs space-y-1 block">
          <span style={{ color: "rgba(224,216,200,0.7)" }}>Reason</span>
          <select
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="h-[2.65rem] px-3 rounded-md text-sm"
            style={{ background: "rgba(28,21,16,0.9)", color: "#F5F1E7", border: "1px solid rgba(180,140,75,0.3)" }}
          >
            <option value="manual">Manual</option>
            <option value="unsubscribed">Unsubscribed</option>
            <option value="bounced">Bounced</option>
            <option value="complaint">Complaint</option>
            <option value="invalid">Invalid</option>
          </select>
        </label>
        <Button onClick={submit} disabled={busy || !email.trim()} style={{ background: "#D4A574", color: "#241811" }}>
          Suppress
        </Button>
      </div>

      {suppressions.length === 0 ? (
        <p className="text-xs" style={{ color: "rgba(224,216,200,0.5)" }}>No suppressed addresses.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-[11px]">
            <thead>
              <tr style={{ color: "rgba(224,216,200,0.55)" }}>
                <th className="text-left py-1.5 pr-3">Email</th>
                <th className="text-left py-1.5 pr-3">Reason</th>
                <th className="text-left py-1.5 pr-3">Source</th>
                <th className="text-left py-1.5 pr-3">Since</th>
                <th className="text-left py-1.5" />
              </tr>
            </thead>
            <tbody>
              {suppressions.map((row) => (
                <tr key={row.id} style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
                  <td className="py-1.5 pr-3" style={{ color: "rgba(224,216,200,0.9)" }}>{row.email}</td>
                  <td className="py-1.5 pr-3">{row.reason}</td>
                  <td className="py-1.5 pr-3" style={{ color: "rgba(224,216,200,0.6)" }}>{row.source || "—"}</td>
                  <td className="py-1.5 pr-3" style={{ color: "rgba(224,216,200,0.6)" }}>
                    {row.suppressed_at ? new Date(row.suppressed_at).toLocaleDateString() : "—"}
                  </td>
                  <td className="py-1.5">
                    <button
                      type="button"
                      onClick={() => onRemove(row.id)}
                      disabled={busy}
                      className="text-[11px] underline"
                      style={{ color: "#D4A574" }}
                    >
                      Allow again
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <p className="text-[10px]" style={{ color: "rgba(224,216,200,0.4)" }}>
        Unsubscribes, bounces and spam complaints reported by the email provider are added here automatically and are
        never mailed again.
      </p>
    </div>
  );
}